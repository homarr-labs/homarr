import type { Response as UndiciResponse } from "undici";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationError } from "../base/errors/integration-error";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../interfaces/dns-hole-summary/dns-hole-summary-types";
import { loginResponseSchema, settingsGetResponseSchema, statsGetResponseSchema } from "./technitium-types";

const logger = createLogger({ module: "technitiumDnsIntegration" });

// All tested versions (v11–v15) share the same API paths.
// The version only controls the auth mechanism:
//   v15     → Authorization: Bearer <token>  (introduced in v15)
//   legacy  → ?token= query parameter        (all versions before v15)
export type TechnitiumVersion = "v15" | "legacy";

export const apiPaths = {
  login: "/api/user/login",
  logout: "/api/user/logout",
  stats: "/api/dashboard/stats/get",
  settingsGet: "/api/settings/get",
  settingsSet: "/api/settings/set",
  temporaryDisable: "/api/settings/temporaryDisableBlocking",
} as const satisfies Record<string, `/${string}`>;

// Technitium always returns HTTP 200. Auth/permission state is signalled in the body:
//   status: "ok"            → success
//   status: "invalid-token" → session expired or invalid API key
//   status: "error"         → permission denied or other server-side error
type TechnitiumStatus = "ok" | "invalid-token" | "error";

// Internal signal thrown when Technitium reports the token as expired.
// Extends IntegrationError so the @HandleIntegrationErrors decorator re-throws it as-is
// instead of wrapping it, allowing withTokenRetryAsync to catch it by type.
class TokenExpiredError extends IntegrationError {
  constructor(integration: IntegrationErrorData) {
    super(integration, "Token expired", {});
    this.name = TokenExpiredError.name;
  }
}

type StoredSession = { token: string; version: TechnitiumVersion };

export class TechnitiumDnsIntegration extends Integration implements DnsHoleSummaryIntegration {
  // Mutable: updated when a login response or session cache reveals the server's auth version.
  private version: TechnitiumVersion;
  private readonly sessionStore: SessionStore<StoredSession>;

  constructor(integration: IntegrationInput, version: TechnitiumVersion = "v15") {
    super(integration);
    this.version = version;
    this.sessionStore = createSessionStore(integration);
  }

  // || null rather than ?? null: treats an empty string as absent since "" is not a valid token.
  private get apiKey(): string | null {
    return super.hasSecretValue("apiKey") ? super.getSecretValue("apiKey") || null : null;
  }

  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    return this.withTokenRetryAsync(async () => {
      const token = await this.acquireTokenAsync();
      // Sequential: stats is required; only attempt settings when stats succeeds.
      // Parallel would race two TokenExpiredError throws — both are handled correctly by
      // Promise.all internals, but sequential makes the required/optional split explicit.
      const statsData = await this.fetchStatsAsync(token);
      const settingsData = await this.fetchSettingsAsync(token);

      const { totalQueries, totalBlocked, blockedZones, blockListZones } = statsData.response.stats;

      let status: "enabled" | "disabled" | undefined;
      if (settingsData) {
        if (settingsData.response.enableBlocking) {
          const till = settingsData.response.temporaryDisableBlockingTill;
          status = till && new Date(till).getTime() > Date.now() ? "disabled" : "enabled";
        } else {
          status = "disabled";
        }
      }

      return {
        status,
        dnsQueriesToday: totalQueries,
        adsBlockedToday: totalBlocked,
        adsBlockedTodayPercentage: totalQueries > 0 ? (totalBlocked / totalQueries) * 100 : 0,
        domainsBeingBlocked: blockedZones + blockListZones,
      };
    });
  }

  public async enableAsync(): Promise<void> {
    return this.withTokenRetryAsync(async () => {
      const token = await this.acquireTokenAsync();
      await this.expectOkAsync(await this.requestAsync(apiPaths.settingsSet, { enableBlocking: "true" }, token));
    });
  }

  public async disableAsync(duration = 0): Promise<void> {
    return this.withTokenRetryAsync(async () => {
      const token = await this.acquireTokenAsync();

      if (duration > 0) {
        // Technitium timed-disable takes minutes; round up from seconds (1–59s becomes 1 min).
        await this.expectOkAsync(
          await this.requestAsync(apiPaths.temporaryDisable, { minutes: String(Math.ceil(duration / 60)) }, token),
        );
      } else {
        await this.expectOkAsync(await this.requestAsync(apiPaths.settingsSet, { enableBlocking: "false" }, token));
      }
    });
  }

  protected async testingAsync({ fetchAsync }: IntegrationTestingInput): Promise<TestingResult> {
    const apiKey = this.apiKey;
    let token: string | null;

    if (apiKey) {
      token = apiKey;
      // Ensure version is known; read from cache if warm, probe if cold.
      // Without this, API key users on a legacy server would send Bearer (wrong auth) on first test.
      const cached = await this.sessionStore.getAsync();
      this.version = cached?.version ?? (await this.detectVersionAsync(apiKey));
    } else {
      const session = await this.resolveTokenAsync(fetchAsync).catch(() => null);
      if (!session) return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });
      this.version = session.version;
      token = session.token;
    }
    if (!token) return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });

    const response = await this.requestAsync(apiPaths.stats, { type: "LastHour" }, token, fetchAsync);
    const body = await this.readBodyAsync(response);

    if (body.status !== "ok") return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });

    // For credentials auth, log out server-side to free the session slot, then clear local cache.
    // API keys are permanent and have no server-side session to release.
    if (!apiKey) {
      await this.requestAsync(apiPaths.logout, {}, token, fetchAsync).catch(() => {
        logger.warn("Failed to logout session after connection test", { integrationId: this.integration.id });
      });
    }

    await this.sessionStore.clearAsync();
    return { success: true };
  }

  private async fetchStatsAsync(token: string | null) {
    const response = await this.requestAsync(apiPaths.stats, { type: "LastHour" }, token);
    const body = await this.readAuthenticatedBodyAsync(response);

    if (body.status !== "ok") throw new ResponseError({ status: 500, url: String(response.url) });

    return statsGetResponseSchema.parseAsync(body.data);
  }

  /**
   * Returns null when blocking status is unavailable:
   *   - "error" status body        → permission denied (restricted user)
   *   - non-JSON or schema mismatch → endpoint absent or unexpected shape on some versions
   * Throws TokenExpiredError on "invalid-token" so withTokenRetryAsync can re-authenticate.
   */
  private async fetchSettingsAsync(token: string | null) {
    const response = await this.requestAsync(apiPaths.settingsGet, {}, token);

    let body: Awaited<ReturnType<typeof this.readBodyAsync>>;
    try {
      body = await this.readBodyAsync(response);
    } catch {
      logger.warn("Could not fetch blocking status, continuing without it", {
        integrationId: this.integration.id,
        error: "Settings response could not be parsed",
      });
      return null;
    }

    if (body.status === "invalid-token") throw new TokenExpiredError(this.publicIntegration);

    if (body.status === "error") {
      logger.warn("Could not fetch blocking status, continuing without it", {
        integrationId: this.integration.id,
        error: String(body.data["errorMessage"] ?? "Settings request was denied"),
      });
      return null;
    }

    try {
      return await settingsGetResponseSchema.parseAsync(body.data);
    } catch {
      logger.warn("Could not fetch blocking status, continuing without it", {
        integrationId: this.integration.id,
        error: "Settings response did not match expected schema",
      });
      return null;
    }
  }

  private async expectOkAsync(response: UndiciResponse): Promise<void> {
    const body = await this.readAuthenticatedBodyAsync(response);
    if (body.status !== "ok") throw new ResponseError({ status: 500, url: String(response.url) });
  }

  /**
   * Run an action with a single transparent retry on token expiry.
   * On TokenExpiredError: clears the session store, re-logins, and re-runs the action once.
   * For API key auth the error is re-thrown immediately (API keys don't expire via session).
   */
  private async withTokenRetryAsync<T>(action: () => Promise<T>): Promise<T> {
    return action().catch(async (err: unknown) => {
      if (!(err instanceof TokenExpiredError) || this.apiKey) throw err;

      logger.debug("Token expired, refreshing and retrying", { integrationId: this.integration.id });
      await this.sessionStore.clearAsync();
      const session = await this.resolveTokenAsync();
      this.version = session.version;
      await this.sessionStore.setAsync(session);
      return action();
    });
  }

  /**
   * Resolve a token from the API key or the session store, logging in if the store is cold.
   *
   * For API key users: version is probed once via Bearer auth on the stats endpoint and cached.
   * For credentials users: version is parsed from the login response's info.version field.
   */
  private async acquireTokenAsync(): Promise<string | null> {
    const apiKey = this.apiKey;

    if (apiKey) {
      const cached = await this.sessionStore.getAsync();
      if (cached) {
        this.version = cached.version;
      } else {
        // First call with an API key: probe once to detect the auth version, then cache it.
        this.version = await this.detectVersionAsync(apiKey);
        await this.sessionStore.setAsync({ token: "", version: this.version });
      }
      return apiKey;
    }

    const stored = await this.sessionStore.getAsync();
    if (stored) {
      this.version = stored.version;
      return stored.token;
    }

    const session = await this.resolveTokenAsync();
    this.version = session.version;
    await this.sessionStore.setAsync(session);
    return session.token;
  }

  /**
   * Detect the auth version for API key users by probing the stats endpoint with Bearer auth.
   * Not used for credentials users — they get the version from info.version in the login response.
   *
   * All tested versions (v11–v15) have /api/dashboard/stats/get, but only v15 accepts
   * the Authorization: Bearer header — older versions return status "error" for it.
   *   Bearer returns "ok" or "invalid-token" → v15 (Bearer auth supported)
   *   Bearer returns "error"                  → legacy (?token= auth required)
   *
   * Falls back to "v15" on network errors; subsequent requests will also fail, surfacing the issue.
   */
  private async detectVersionAsync(apiKey: string): Promise<TechnitiumVersion> {
    try {
      const response = await fetchWithTrustedCertificatesAsync(this.url(apiPaths.stats, { type: "LastHour" }), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await response.json()) as Record<string, unknown>;
      return data["status"] !== "error" ? "v15" : "legacy";
    } catch {
      return "v15";
    }
  }

  /**
   * Log in with credentials, detecting the auth version from the server's own version string.
   * Uses /api/user/login (available on all tested versions, v11–v15).
   * Falls back to /api/login on HTTP 404 for very old servers.
   */
  private async resolveTokenAsync(
    fetchFn: typeof fetchWithTrustedCertificatesAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<StoredSession> {
    const creds = {
      user: super.getSecretValue("username"),
      pass: super.getSecretValue("password"),
      // includeInfo causes the server to return its version string — the only reliable
      // way to distinguish v15 (Bearer auth) from legacy (?token= auth).
      includeInfo: "true",
    };

    const parseLogin = async (response: UndiciResponse, url: URL): Promise<StoredSession> => {
      const parsed = loginResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        logger.warn("Login failed", { integrationId: this.integration.id });
        throw new ResponseError({ status: 401, url: String(url) });
      }
      const majorVersion = parseInt(parsed.data.info?.version?.split(".")[0] ?? "0");
      const version: TechnitiumVersion = majorVersion >= 15 ? "v15" : "legacy";
      logger.info(`Login successful (${version}, server ${parsed.data.info?.version ?? "unknown"})`, {
        integrationId: this.integration.id,
      });
      return { token: parsed.data.token, version };
    };

    const loginUrl = this.url(apiPaths.login, creds);
    const loginResponse = await fetchFn(loginUrl);
    if (loginResponse.status !== 404) return parseLogin(loginResponse, loginUrl);

    // /api/user/login returned 404 — try the very old /api/login path
    logger.debug("Primary login path not found, trying legacy /api/login", { integrationId: this.integration.id });
    const fallbackUrl = this.url("/api/login", creds);
    return parseLogin(await fetchFn(fallbackUrl), fallbackUrl);
  }

  /**
   * Build and execute a GET request, attaching the token as a Bearer header (v15)
   * or as a ?token= query parameter (legacy).
   */
  private async requestAsync(
    path: `/${string}`,
    params: Record<string, string>,
    token: string | null,
    fetchFn: typeof fetchWithTrustedCertificatesAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<UndiciResponse> {
    const url = this.url(path, params);
    const headers: Record<string, string> = {};

    if (token) {
      if (this.version === "v15") {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        url.searchParams.set("token", token);
      }
    }

    return fetchFn(url, { headers });
  }

  // Reads body and throws TokenExpiredError on "invalid-token".
  // Use in all authenticated request paths so token expiry propagates to withTokenRetryAsync.
  private async readAuthenticatedBodyAsync(response: UndiciResponse) {
    const body = await this.readBodyAsync(response);
    if (body.status === "invalid-token") throw new TokenExpiredError(this.publicIntegration);
    return body;
  }

  private async readBodyAsync(
    response: UndiciResponse,
  ): Promise<{ status: TechnitiumStatus; data: Record<string, unknown> }> {
    const data = (await response.json()) as Record<string, unknown>;
    const status = (data["status"] as TechnitiumStatus | undefined) ?? "error";
    return { status, data };
  }
}
