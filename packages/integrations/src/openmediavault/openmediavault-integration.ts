import type { Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { HealthMonitoring } from "../types";
import { cpuTempSchema, fileSystemSchema, smartSchema, systemInformationSchema } from "./openmediavault-types";

export class OpenMediaVaultIntegration extends Integration {
  static extractSessionIdFromCookies(headers: Headers): string {
    const cookies = headers.get("set-cookie") ?? "";
    const sessionId = cookies
      .split(";")
      .find((cookie) => cookie.includes("X-OPENMEDIAVAULT-SESSIONID") || cookie.includes("OPENMEDIAVAULT-SESSIONID"));

    if (sessionId) {
      return sessionId;
    } else {
      throw new Error("Session ID not found in cookies");
    }
  }

  static extractLoginTokenFromCookies(headers: Headers): string {
    const cookies = headers.get("set-cookie") ?? "";
    const loginToken = cookies
      .split(";")
      .find((cookie) => cookie.includes("X-OPENMEDIAVAULT-LOGIN") || cookie.includes("OPENMEDIAVAULT-LOGIN"));

    if (loginToken) {
      return loginToken;
    } else {
      throw new Error("Login token not found in cookies");
    }
  }

  public async getSystemInfoAsync(): Promise<HealthMonitoring> {
    if (!this.headers) {
      await this.authenticateAndConstructSessionInHeaderAsync();
    }

    const systemResponses = await this.makeOpenMediaVaultRPCCallAsync("system", "getInformation", {}, this.headers);
    const fileSystemResponse = await this.makeOpenMediaVaultRPCCallAsync(
      "filesystemmgmt",
      "enumerateMountedFilesystems",
      { includeroot: true },
      this.headers,
    );
    const smartResponse = await this.makeOpenMediaVaultRPCCallAsync("smart", "enumerateDevices", {}, this.headers);
    const cpuTempResponse = await this.makeOpenMediaVaultRPCCallAsync("cputemp", "get", {}, this.headers);

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

  public async testConnectionAsync(): Promise<void> {
    const response = await this.makeOpenMediaVaultRPCCallAsync("session", "login", {
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
    });

    if (!response.ok) {
      throw new IntegrationTestConnectionError("invalidCredentials");
    }
    const result = await response.json();
    if (typeof result !== "object" || result === null || !("response" in result)) {
      throw new IntegrationTestConnectionError("invalidJson");
    }
  }

  private async makeOpenMediaVaultRPCCallAsync(
    serviceName: string,
    method: string,
    params: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    return await fetchWithTrustedCertificatesAsync(this.url("/rpc.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        service: serviceName,
        method,
        params,
      }),
    });
  }

  private headers: Record<string, string> | undefined = undefined;

  private async authenticateAndConstructSessionInHeaderAsync() {
    const authResponse = await this.makeOpenMediaVaultRPCCallAsync("session", "login", {
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
    });
    const authResult = (await authResponse.json()) as Response;
    const response = (authResult as { response?: { sessionid?: string } }).response;
    let sessionId;
    const headers: Record<string, string> = {};
    if (response?.sessionid) {
      sessionId = response.sessionid;
      headers["X-OPENMEDIAVAULT-SESSIONID"] = sessionId;
    } else {
      sessionId = OpenMediaVaultIntegration.extractSessionIdFromCookies(authResponse.headers);
      const loginToken = OpenMediaVaultIntegration.extractLoginTokenFromCookies(authResponse.headers);
      headers.Cookie = `${loginToken};${sessionId}`;
    }
    this.headers = headers;
  }
}
