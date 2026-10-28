import type { Headers, HeadersInit, fetch as undiciFetch, Response as UndiciResponse } from "undici";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../types";
import { OpenMediaVaultTotpError } from "./openmediavault-totp-error";
import { cpuTempSchema, fileSystemSchema, smartSchema, systemInformationSchema } from "./openmediavault-types";
import { generateTotpCode, InvalidTotpSecretError, normalizeTotpSecret } from "./totp";

const logger = createLogger({ module: "openMediaVaultIntegration" });

type SessionStoreValue =
  | { type: "header"; sessionId: string }
  | { type: "cookie"; loginToken: string; sessionId: string };

export class OpenMediaVaultIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private readonly sessionStore: SessionStore<SessionStoreValue>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    const session = await this.getSessionAsync();
    if (session.type === "cookie") {
      const cookie = `${session.loginToken};${session.sessionId}`;
      return { headers: { Cookie: cookie }, redactValues: [cookie, session.loginToken, session.sessionId] };
    }
    return {
      headers: { "X-OPENMEDIAVAULT-SESSIONID": session.sessionId },
      redactValues: [session.sessionId],
    };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const systemResponses = await this.makeAuthenticatedRpcCallAsync("system", "getInformation");
    const fileSystem = await this.getFileSystemsAsync();
    const smartResponse = await this.makeAuthenticatedRpcCallAsync("smart", "enumerateDevices");
    const cpuTempResponse = await this.makeAuthenticatedRpcCallAsync("cputemp", "get");

    const systemResult = systemInformationSchema.safeParse(await systemResponses.json());
    const smartResult = smartSchema.safeParse(await smartResponse.json());
    const cpuTempResult = cpuTempSchema.safeParse(await cpuTempResponse.json());

    if (!systemResult.success) {
      throw new Error("Invalid system information response");
    }
    if (!smartResult.success) {
      throw new Error("Invalid SMART information response");
    }

    const smart = smartResult.data.response.map((smart) => ({
      deviceName: smart.devicename,
      temperature: smart.temperature,
      // https://github.com/openmediavault/openmediavault/blob/2eb871d05cec6ff49603134d3acead561da01e4d/deb/openmediavault/usr/share/php/openmediavault/system/storage/smartinformation.inc#L592-L605
      healthy: smart.overallstatus === "GOOD",
      overallStatus: smart.overallstatus,
    }));

    return {
      version: systemResult.data.response.version,
      cpuModelName: systemResult.data.response.cpuModelName ?? "Unknown CPU",
      cpuUtilization: systemResult.data.response.cpuUtilization,
      memUsedInBytes: Number(systemResult.data.response.memUsed),
      memAvailableInBytes: Number(systemResult.data.response.memAvailable),
      uptime: systemResult.data.response.uptime,
      /* real-time traffic monitoring is not available over the RPC API from OMV */
      network: null,
      loadAverage: {
        "1min": systemResult.data.response.loadAverage["1min"],
        "5min": systemResult.data.response.loadAverage["5min"],
        "15min": systemResult.data.response.loadAverage["15min"],
      },
      rebootRequired: systemResult.data.response.rebootRequired,
      availablePkgUpdates: systemResult.data.response.availablePkgUpdates,
      cpuTemp: cpuTempResult.success ? cpuTempResult.data.response.cputemp : undefined,
      fileSystem,
      smart,
      gpu: [], // OpenMediaVault does not expose GPU monitoring via its RPC API.
    };
  }

  public async listStorageVolumesAsync(): Promise<{ value: string; label: string }[]> {
    const fileSystem = await this.getFileSystemsAsync();
    const { id: integrationId, name: integrationName } = this.integration;

    return fileSystem.map(({ deviceName }) => ({
      value: `${integrationId}:${deviceName}`,
      label: `${deviceName} (${integrationName})`,
    }));
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    try {
      await this.getSessionAsync(input.fetchAsync);
      return { success: true };
    } catch (error) {
      if (error instanceof OpenMediaVaultTotpError) {
        return error.toConnectionResult();
      }
      throw error;
    }
  }

  private async getFileSystemsAsync(): Promise<SystemHealthMonitoring["fileSystem"]> {
    const response = await this.makeAuthenticatedRpcCallAsync("filesystemmgmt", "enumerateMountedFilesystems", {
      includeroot: true,
    });
    const result = fileSystemSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error("Invalid file system response");
    }

    return result.data.response.map((fileSystem) => ({
      deviceName: fileSystem.devicename,
      used: fileSystem.used,
      available: fileSystem.available.toString(),
      percentage: fileSystem.percentage,
    }));
  }

  private async makeAuthenticatedRpcCallAsync(
    serviceName: string,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<UndiciResponse> {
    return await this.withAuthAsync(async (session) => {
      const headers: HeadersInit =
        session.type === "cookie"
          ? {
              Cookie: `${session.loginToken};${session.sessionId}`,
            }
          : {
              "X-OPENMEDIAVAULT-SESSIONID": session.sessionId,
            };

      return await this.makeRpcCallAsync(serviceName, method, params, headers);
    });
  }

  private async makeRpcCallWithCustomFetchAsync(
    serviceName: string,
    method: string,
    params: Record<string, unknown> = {},
    headers: HeadersInit = {},
    fetchAsync: typeof undiciFetch = fetchWithTrustedCertificatesAsync,
  ): Promise<UndiciResponse> {
    return await fetchAsync(this.url("/rpc.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Homarr",
        ...headers,
      },
      body: JSON.stringify({
        service: serviceName,
        method,
        params,
      }),
    });
  }

  private async makeRpcCallAsync(
    serviceName: string,
    method: string,
    params: Record<string, unknown> = {},
    headers: HeadersInit = {},
  ): Promise<UndiciResponse> {
    return await this.makeRpcCallWithCustomFetchAsync(serviceName, method, params, headers);
  }

  /**
   * Run the callback with the current session id
   * @param callback
   * @returns
   */
  private async withAuthAsync(callback: (session: SessionStoreValue) => Promise<UndiciResponse>) {
    const storedSession = await this.sessionStore.getAsync();

    if (storedSession) {
      logger.debug("Using stored session for request", { integrationId: this.integration.id });
      const response = await callback(storedSession);
      if (response.status !== 401) {
        return response;
      }

      logger.debug("Session expired, getting new session", { integrationId: this.integration.id });
    }

    const session = await this.getSessionAsync();
    await this.sessionStore.setAsync(session);
    return await callback(session);
  }

  private readTotpSecret(): string | null {
    if (!this.hasSecretValue("totpSecret")) return null;

    try {
      return normalizeTotpSecret(this.getSecretValue("totpSecret"));
    } catch (error) {
      if (error instanceof InvalidTotpSecretError) {
        throw new OpenMediaVaultTotpError(this.publicIntegration, "totpSecretInvalid");
      }
      throw error;
    }
  }

  /**
   * Get a session id from the openmediavault server.
   * Accounts with TOTP answer `session.login` with `challengeRequired`. The follow-up
   * `session.verify` call must reuse that response's session cookie and send `{ code }`,
   * which is the shape the TOTP plugin reads from the forwarded params.
   */
  private async getSessionAsync(fetchAsync?: typeof undiciFetch): Promise<SessionStoreValue> {
    const totpSecret = this.readTotpSecret();
    const response = await this.makeRpcCallWithCustomFetchAsync(
      "session",
      "login",
      {
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      },
      undefined,
      fetchAsync,
    );

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const login = readAuthResult(await response.json());
    if (login.challengeRequired) {
      return await this.verifyTotpChallengeAsync(login.challengeKind, response.headers, totpSecret, fetchAsync);
    }

    return this.sessionFromAuthenticatedResponse(login.sessionId, response);
  }

  private async verifyTotpChallengeAsync(
    challengeKind: string | undefined,
    loginHeaders: Headers,
    totpSecret: string | null,
    fetchAsync?: typeof undiciFetch,
  ): Promise<SessionStoreValue> {
    if (challengeKind && challengeKind !== "totp") {
      throw new OpenMediaVaultTotpError(this.publicIntegration, "unsupportedChallenge");
    }
    if (!totpSecret) {
      throw new OpenMediaVaultTotpError(this.publicIntegration, "totpSecretRequired");
    }

    const cookie = OpenMediaVaultIntegration.cookieHeaderFromSetCookie(loginHeaders);
    const response = await this.makeRpcCallWithCustomFetchAsync(
      "session",
      "verify",
      { code: generateTotpCode(totpSecret) },
      cookie ? { Cookie: cookie } : undefined,
      fetchAsync,
    );

    if (!response.ok) {
      throw new OpenMediaVaultTotpError(this.publicIntegration, "totpVerificationFailed");
    }

    const verified = readAuthResult(await response.json());
    if (verified.sessionId) {
      return { type: "header", sessionId: verified.sessionId };
    }

    const sessionFromCookies = this.sessionFromCookies(response);
    if (sessionFromCookies) return sessionFromCookies;

    throw new OpenMediaVaultTotpError(this.publicIntegration, "totpVerificationFailed");
  }

  private sessionFromAuthenticatedResponse(sessionId: string | undefined, response: UndiciResponse): SessionStoreValue {
    if (sessionId) {
      return { type: "header", sessionId };
    }

    const sessionFromCookies = this.sessionFromCookies(response);
    if (!sessionFromCookies) {
      throw new ResponseError({
        status: 401,
        url: response.url,
      });
    }

    return sessionFromCookies;
  }

  private sessionFromCookies(response: UndiciResponse): SessionStoreValue | null {
    const sessionId = OpenMediaVaultIntegration.extractSessionIdFromCookies(response.headers);
    const loginToken = OpenMediaVaultIntegration.extractLoginTokenFromCookies(response.headers);
    if (!sessionId || !loginToken) return null;

    return {
      type: "cookie",
      loginToken,
      sessionId,
    };
  }

  private static cookieHeaderFromSetCookie(headers: Headers): string | undefined {
    const pairs = headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0]?.trim() ?? "")
      .filter((pair) => pair.includes("="));

    return pairs.length > 0 ? pairs.join("; ") : undefined;
  }

  private static extractSessionIdFromCookies(headers: Headers): string | null {
    const cookies = headers.getSetCookie();
    const sessionId = cookies.find(
      (cookie) => cookie.includes("X-OPENMEDIAVAULT-SESSIONID") || cookie.includes("OPENMEDIAVAULT-SESSIONID"),
    );

    return sessionId ?? null;
  }

  private static extractLoginTokenFromCookies(headers: Headers): string | null {
    const cookies = headers.getSetCookie();
    const loginToken = cookies.find(
      (cookie) => cookie.includes("X-OPENMEDIAVAULT-LOGIN") || cookie.includes("OPENMEDIAVAULT-LOGIN"),
    );

    return loginToken ?? null;
  }
}

interface OpenMediaVaultAuthResult {
  challengeRequired: boolean;
  challengeKind?: string;
  sessionId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAuthResult = (value: unknown): OpenMediaVaultAuthResult => {
  if (!isRecord(value) || !isRecord(value.response)) {
    return { challengeRequired: false };
  }

  const response = value.response;
  const sessionId =
    typeof response.sessionid === "string" && response.sessionid.length > 0 ? response.sessionid : undefined;
  const challenge = isRecord(response.challenge) ? response.challenge : undefined;
  const status = typeof response.status === "string" ? response.status : undefined;

  return {
    challengeRequired: status === "challengeRequired" || (challenge !== undefined && sessionId === undefined),
    challengeKind: challenge && typeof challenge.kind === "string" ? challenge.kind : undefined,
    sessionId,
  };
};
