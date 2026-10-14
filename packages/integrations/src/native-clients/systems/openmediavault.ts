import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import type { IntegrationInput } from "../../base/integration";
import { createSessionStore } from "../../base/session-store";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import {
  cpuTempSchema,
  fileSystemSchema,
  smartSchema,
  systemInformationSchema,
} from "../../openmediavault/openmediavault-types";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { SystemsHttpClient } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

type OmvSession = { type: "header"; sessionId: string } | { type: "cookie"; loginToken: string; sessionId: string };
const loginSchema = z.object({ response: z.object({ sessionid: z.string().optional() }).nullish() });

export class OpenMediaVaultHttpClient extends SystemsHttpClient {
  private readonly sessionStore;

  constructor(input: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(input, resources);
    this.sessionStore = createSessionStore<OmvSession>(input, resources.sessions);
  }

  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.runAsync(async (http): Promise<IntegrationHttpAuthentication> => {
      const session = await this.loginAsync(http);
      if (session.type === "cookie") {
        const cookie = `${session.loginToken};${session.sessionId}`;
        return { headers: { Cookie: cookie }, redactValues: [cookie, session.loginToken, session.sessionId] };
      }
      return { headers: { "X-OPENMEDIAVAULT-SESSIONID": session.sessionId }, redactValues: [session.sessionId] };
    });
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    return await this.runAsync(async (http) => {
      const systemData = await this.rpcAsync(http, "system", "getInformation");
      const fileSystem = await this.fileSystemsAsync(http);
      const smartData = await this.rpcAsync(http, "smart", "enumerateDevices");
      const cpuData = await this.rpcAsync(http, "cputemp", "get");
      const system = systemInformationSchema.safeParse(systemData);
      const smart = smartSchema.safeParse(smartData);
      const cpu = cpuTempSchema.safeParse(cpuData);
      if (!system.success) throw new Error("Invalid system information response");
      if (!smart.success) throw new Error("Invalid SMART information response");
      const value = system.data.response;
      return {
        version: value.version,
        cpuModelName: value.cpuModelName ?? "Unknown CPU",
        cpuUtilization: value.cpuUtilization,
        memUsedInBytes: Number(value.memUsed),
        memAvailableInBytes: Number(value.memAvailable),
        uptime: value.uptime,
        network: null,
        loadAverage: value.loadAverage,
        rebootRequired: value.rebootRequired,
        availablePkgUpdates: value.availablePkgUpdates,
        cpuTemp: cpu.success ? cpu.data.response.cputemp : undefined,
        fileSystem,
        smart: smart.data.response.map((disk) => ({
          deviceName: disk.devicename,
          temperature: disk.temperature,
          healthy: disk.overallstatus === "GOOD",
          overallStatus: disk.overallstatus,
        })),
        gpu: [],
      };
    });
  }

  async listStorageVolumesAsync() {
    return await this.runAsync(async (http) =>
      (await this.fileSystemsAsync(http)).map(({ deviceName }) => ({
        value: `${this.integration.id}:${deviceName}`,
        label: `${deviceName} (${this.integration.name})`,
      })),
    );
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    await this.loginAsync(http);
    return { success: true } as const;
  }

  private async fileSystemsAsync(http: SystemsHttpOperation) {
    const result = fileSystemSchema.safeParse(
      await this.rpcAsync(http, "filesystemmgmt", "enumerateMountedFilesystems", { includeroot: true }),
    );
    if (!result.success) throw new Error("Invalid file system response");
    return result.data.response.map((fs) => ({
      deviceName: fs.devicename,
      used: fs.used,
      available: fs.available.toString(),
      percentage: fs.percentage,
    }));
  }

  private async rpcAsync(
    http: SystemsHttpOperation,
    service: string,
    method: string,
    params: Record<string, unknown> = {},
  ) {
    const request = async (session: OmvSession) =>
      this.rawRpcAsync(
        http,
        service,
        method,
        params,
        session.type === "cookie"
          ? { Cookie: `${session.loginToken};${session.sessionId}` }
          : { "X-OPENMEDIAVAULT-SESSIONID": session.sessionId },
      );
    const stored = await this.sessionStore.getAsync();
    http.assertActive();
    if (stored) {
      this.resources.log?.write("debug", "Using stored session for request", { integrationId: this.integration.id });
      const result = await request(stored);
      if (result.status !== 401) return result.data;
      this.resources.log?.write("debug", "Session expired, getting new session", {
        integrationId: this.integration.id,
      });
    }
    const session = await this.loginAsync(http);
    http.assertActive();
    await this.sessionStore.setAsync(session);
    return (await request(session)).data;
  }

  private async rawRpcAsync(
    http: SystemsHttpOperation,
    service: string,
    method: string,
    params: Record<string, unknown>,
    headers: Record<string, string>,
  ) {
    return await http.readAsync(
      this.url("/rpc.php"),
      async (response) => {
        if (response.status === 401) return { status: response.status, data: undefined };
        const data: unknown = await response.json();
        return { status: response.status, data };
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Homarr", ...headers },
        body: JSON.stringify({ service, method, params }),
      },
    );
  }

  private async loginAsync(http: SystemsHttpOperation): Promise<OmvSession> {
    return await http.readAsync<OmvSession>(
      this.url("/rpc.php"),
      async (response) => {
        if (!response.ok) throw new ResponseError({ status: response.status });
        const data = loginSchema.parse(await response.json());
        if (data.response?.sessionid) return { type: "header", sessionId: data.response.sessionid };
        const cookies = response.headers.getSetCookie();
        const sessionId = cookies.find(
          (cookie) => cookie.includes("X-OPENMEDIAVAULT-SESSIONID") || cookie.includes("OPENMEDIAVAULT-SESSIONID"),
        );
        const loginToken = cookies.find(
          (cookie) => cookie.includes("X-OPENMEDIAVAULT-LOGIN") || cookie.includes("OPENMEDIAVAULT-LOGIN"),
        );
        if (!sessionId || !loginToken) throw new ResponseError({ status: 401 });
        return { type: "cookie", sessionId, loginToken };
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Homarr" },
        body: JSON.stringify({
          service: "session",
          method: "login",
          params: { username: this.secret("username"), password: this.secret("password") },
        }),
      },
    );
  }
}
