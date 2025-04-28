import type { Headers, HeadersInit, Response as UndiciResponse } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { ResponseError } from "../base/error";
import type { IntegrationInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { HealthMonitoring } from "../types";
import { cpuTempSchema, fileSystemSchema, smartSchema, systemInformationSchema } from "./openmediavault-types";

const localLogger = logger.child({ module: "OpenMediaVaultIntegration" });

type SessionStoreValue =
  | { type: "header"; sessionId: string }
  | { type: "cookie"; loginToken: string; sessionId: string };

export class OpenMediaVaultIntegration extends Integration {
  private readonly sessionStore: SessionStore<SessionStoreValue>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  public async getSystemInfoAsync(): Promise<HealthMonitoring> {
    const systemResponses = await this.makeAuthenticatedRpcCallAsync("system", "getInformation");
    const fileSystemResponse = await this.makeAuthenticatedRpcCallAsync(
      "filesystemmgmt",
      "enumerateMountedFilesystems",
      { includeroot: true },
    );
    const smartResponse = await this.makeAuthenticatedRpcCallAsync("smart", "enumerateDevices");
    const cpuTempResponse = await this.makeAuthenticatedRpcCallAsync("cputemp", "get");

    const systemResult = systemInformationSchema.safeParse(await systemResponses.json());
    const fileSystemResult = fileSystemSchema.safeParse(await fileSystemResponse.json());
    const smartResult = smartSchema.safeParse(await smartResponse.json());
    const cpuTempResult = cpuTempSchema.safeParse(await cpuTempResponse.json());

    if (!systemResult.success) {
      throw new Error("Invalid system information response");
    }
    if (!fileSystemResult.success) {
      throw new Error("Invalid file system response");
    }
    if (!smartResult.success) {
      throw new Error("Invalid SMART information response");
    }

    const fileSystem = fileSystemResult.data.response.map((fileSystem) => ({
      deviceName: fileSystem.devicename,
      used: fileSystem.used,
      available: fileSystem.available.toString(),
      percentage: fileSystem.percentage,
    }));

    const smart = smartResult.data.response.map((smart) => ({
      deviceName: smart.devicename,
      temperature: smart.temperature,
      overallStatus: smart.overallstatus,
    }));

    return {
      version: systemResult.data.response.version,
      cpuModelName: systemResult.data.response.cpuModelName,
      cpuUtilization: systemResult.data.response.cpuUtilization,
      memUsed: systemResult.data.response.memUsed,
      memAvailable: systemResult.data.response.memAvailable,
      uptime: systemResult.data.response.uptime,
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
    };
  }

  public async testingAsync(): Promise<void> {
    await this.getSessionAsync().catch((error) => {
      if (error instanceof ResponseError) {
        throw new IntegrationTestConnectionError("invalidCredentials");
      }
    });
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

  private async makeRpcCallAsync(
    serviceName: string,
    method: string,
    params: Record<string, unknown> = {},
    headers: HeadersInit = {},
  ): Promise<UndiciResponse> {
    return await fetchWithTrustedCertificatesAsync(this.url("/rpc.php"), {
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

  /**
   * Run the callback with the current session id
   * @param callback
   * @returns
   */
  private async withAuthAsync(callback: (session: SessionStoreValue) => Promise<UndiciResponse>) {
    const storedSession = await this.sessionStore.getAsync();

    if (storedSession) {
      localLogger.debug("Using stored session for request", { integrationId: this.integration.id });
      const response = await callback(storedSession);
      if (response.status !== 401) {
        return response;
      }

      localLogger.info("Session expired, getting new session", { integrationId: this.integration.id });
    }

    const session = await this.getSessionAsync();
    await this.sessionStore.setAsync(session);
    return await callback(session);
  }

  /**
   * Get a session id from the openmediavault server
   * @returns The session details
   */
  private async getSessionAsync(): Promise<SessionStoreValue> {
    const response = await this.makeRpcCallAsync("session", "login", {
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
    });

    const data = (await response.json()) as { response?: { sessionid?: string } };
    if (data.response?.sessionid) {
      return {
        type: "header",
        sessionId: data.response.sessionid,
      };
    } else {
      const sessionId = OpenMediaVaultIntegration.extractSessionIdFromCookies(response.headers);
      const loginToken = OpenMediaVaultIntegration.extractLoginTokenFromCookies(response.headers);

      if (!sessionId || !loginToken) {
        throw new ResponseError(
          response,
          `${JSON.stringify(data)} - sessionId=${"*".repeat(sessionId?.length ?? 0)} loginToken=${"*".repeat(loginToken?.length ?? 0)}`,
        );
      }

      return {
        type: "cookie",
        loginToken,
        sessionId,
      };
    }
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
