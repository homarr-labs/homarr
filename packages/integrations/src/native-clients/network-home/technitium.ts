import type { Response } from "undici";

import { isRecord } from "@homarr/common/object";
import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import {
  apiPaths,
  loginResponseSchema,
  parseTechnitiumVersion,
  settingsGetResponseSchema,
  statsGetResponseSchema,
  TokenExpiredError,
} from "../../technitium/technitium-types";
import type { StoredSession, TechnitiumStatus, TechnitiumVersion } from "../../technitium/technitium-types";
import { NetworkHomeCapabilityHeldError, NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class TechnitiumDnsProtocol extends NetworkHomeProtocol {
  override async testConnectionAsync(): Promise<TestingResult> {
    this.resources.context.signal.throwIfAborted();
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.requireFencedSession();
    const session = this.apiKey
      ? await this.acquireSessionAsync()
      : await this.runAsync((http) => this.loginCandidateAsync(http));
    const token = this.apiKey ?? session.token;
    if (!token) return { headers: {} };
    return session.version === "v15"
      ? { headers: { Authorization: `Bearer ${token}` } }
      : { headers: {}, query: { token } };
  }

  async getSummaryAsync(): Promise<DnsHoleSummary> {
    this.requireFencedSession();
    const session = await this.acquireSessionAsync();
    return this.runAsync(async (http) => {
      const token = this.apiKey ?? session.token;
      const stats = await this.statsCandidateAsync(http, token, session.version);
      const settings = await this.settingsCandidateAsync(http, token, session.version);
      const { totalQueries, totalBlocked, blockedZones, blockListZones } = stats.response.stats;
      let status: "enabled" | "disabled" | undefined;
      if (settings) {
        const { enableBlocking, temporaryDisableBlockingTill: till } = settings.response;
        status = enableBlocking && !(till && new Date(till).getTime() > Date.now()) ? "enabled" : "disabled";
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

  async enableAsync(): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync(true);
  }

  async disableAsync(duration = 0): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync(false, duration);
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    this.requireFencedSession();
    const apiKey = this.apiKey;
    let session: StoredSession;
    if (apiKey) {
      session = { token: apiKey, version: await this.detectVersionCandidateAsync(http, apiKey) };
    } else {
      try {
        session = await this.loginCandidateAsync(http);
      } catch (error) {
        this.rethrowProtectedFailure(error);
        return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });
      }
    }
    if (!session.token) return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });
    const body = await this.requestCandidateAsync(
      http,
      apiPaths.stats,
      { type: "LastHour" },
      session.token,
      session.version,
      (response) => this.readBodyAsync(response),
    );
    if (body.status !== "ok") return TestConnectionError.StatusResult({ status: 401, url: this.integration.url });
    if (!apiKey) {
      try {
        await this.requestCandidateAsync(
          http,
          apiPaths.logout,
          {},
          session.token,
          session.version,
          async () => undefined,
        );
      } catch (error) {
        this.rethrowProtectedFailure(error);
        this.resources.log?.write("warn", "Failed to logout session after connection test", {
          integrationId: this.integration.id,
        });
      }
    }
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private get apiKey(): string | null {
    return this.hasSecret("apiKey") ? this.secret("apiKey") || null : null;
  }

  private requireFencedSession(): void {
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private async acquireSessionAsync(): Promise<StoredSession> {
    throw new NetworkHomeCapabilityHeldError("fenced-session");
  }

  private statsCandidateAsync(http: NetworkHomeHttpOperation, token: string | null, version: TechnitiumVersion) {
    return this.requestCandidateAsync(http, apiPaths.stats, { type: "LastHour" }, token, version, async (response) => {
      const body = await this.readAuthenticatedBodyAsync(response);
      if (body.status !== "ok") throw new ResponseError({ status: 500, url: response.url });
      return statsGetResponseSchema.parseAsync(body.data);
    });
  }

  private settingsCandidateAsync(http: NetworkHomeHttpOperation, token: string | null, version: TechnitiumVersion) {
    return this.requestCandidateAsync(http, apiPaths.settingsGet, {}, token, version, async (response) => {
      let body: { status: TechnitiumStatus; data: Record<string, unknown> };
      try {
        body = await this.readBodyAsync(response);
      } catch (error) {
        this.rethrowProtectedFailure(error);
        this.reportSettingsUnavailable("Settings response could not be parsed");
        return null;
      }
      if (body.status === "invalid-token") throw new TokenExpiredError(this.publicIntegration);
      if (body.status === "error") {
        this.reportSettingsUnavailable(String(body.data["errorMessage"] ?? "Settings request was denied"));
        return null;
      }
      const parsed = await settingsGetResponseSchema.safeParseAsync(body.data);
      if (!parsed.success) {
        this.reportSettingsUnavailable("Settings response did not match expected schema");
        return null;
      }
      return parsed.data;
    });
  }

  private async setBlockingCandidateAsync(enabled: boolean, duration = 0): Promise<void> {
    const session = await this.acquireSessionAsync();
    const path = !enabled && duration > 0 ? apiPaths.temporaryDisable : apiPaths.settingsSet;
    const params: Record<string, string> =
      !enabled && duration > 0 ? { minutes: String(Math.ceil(duration / 60)) } : { enableBlocking: String(enabled) };
    await this.runAsync((http) =>
      this.requestCandidateAsync(
        http,
        path,
        params,
        this.apiKey ?? session.token,
        session.version,
        async (response) => {
          const body = await this.readAuthenticatedBodyAsync(response);
          if (body.status !== "ok") throw new ResponseError({ status: 500, url: response.url });
        },
      ),
    );
  }

  private async detectVersionCandidateAsync(
    http: NetworkHomeHttpOperation,
    apiKey: string,
  ): Promise<TechnitiumVersion> {
    try {
      return await http.responseAsync(
        this.url(apiPaths.stats, { type: "LastHour" }),
        { headers: { Authorization: `Bearer ${apiKey}` } },
        async (response) => ((await this.readBodyAsync(response)).status === "error" ? "legacy" : "v15"),
      );
    } catch (error) {
      this.rethrowProtectedFailure(error);
      return "v15";
    }
  }

  private async loginCandidateAsync(http: NetworkHomeHttpOperation): Promise<StoredSession> {
    const creds = { user: this.secret("username"), pass: this.secret("password"), includeInfo: "true" };
    const parseLoginAsync = async (response: Response, url: URL): Promise<StoredSession> => {
      const parsed = loginResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        this.resources.log?.write("warn", "Login failed", { integrationId: this.integration.id });
        throw new ResponseError({ status: 401, url: String(url) });
      }
      const version = parseTechnitiumVersion(parsed.data.info?.version);
      this.resources.log?.write("debug", "Login successful", {
        integrationId: this.integration.id,
        version,
        serverVersion: parsed.data.info?.version ?? "unknown",
      });
      return { token: parsed.data.token, version };
    };
    const url = this.url(apiPaths.login, creds);
    const session = await http.responseAsync(url, {}, async (response) =>
      response.status === 404 ? null : parseLoginAsync(response, url),
    );
    if (session) return session;
    this.resources.context.signal.throwIfAborted();
    this.resources.log?.write("debug", "Primary login path not found, trying legacy /api/login", {
      integrationId: this.integration.id,
    });
    const fallback = this.url("/api/login", creds);
    return http.responseAsync(fallback, {}, (response) => parseLoginAsync(response, fallback));
  }

  private requestCandidateAsync<T>(
    http: NetworkHomeHttpOperation,
    path: `/${string}`,
    params: Record<string, string>,
    token: string | null,
    version: TechnitiumVersion,
    consumeAsync: (response: Response) => Promise<T>,
  ): Promise<T> {
    const url = this.url(path, params);
    const headers: Record<string, string> = {};
    if (token) {
      if (version === "v15") headers["Authorization"] = `Bearer ${token}`;
      else url.searchParams.set("token", token);
    }
    return http.responseAsync(url, { headers }, consumeAsync);
  }

  private async readBodyAsync(
    response: Response,
  ): Promise<{ status: TechnitiumStatus; data: Record<string, unknown> }> {
    const data = await response.json();
    if (!isRecord(data)) throw new Error("Expected Technitium object data");
    const status = data["status"] ?? "error";
    if (status !== "ok" && status !== "invalid-token" && status !== "error")
      throw new Error("Unexpected Technitium response status");
    return { status, data };
  }

  private async readAuthenticatedBodyAsync(response: Response) {
    const body = await this.readBodyAsync(response);
    if (body.status === "invalid-token") throw new TokenExpiredError(this.publicIntegration);
    return body;
  }

  private reportSettingsUnavailable(error: string): void {
    this.resources.log?.write("warn", "Could not fetch blocking status, continuing without it", {
      integrationId: this.integration.id,
      error,
    });
  }
}
