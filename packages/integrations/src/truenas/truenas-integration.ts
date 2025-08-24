import "@homarr/redis";

import dayjs from "dayjs";
import z from "zod";

import { logger } from "@homarr/log";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";

const localLogger = logger.child({ module: "TrueNasIntegration" });

const NETWORK_MULTIPLIER = 100;

interface Session {
  sessionId: string;
  interfaces: string[];
}

export class TrueNasIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private readonly sessionStore: SessionStore<Session>;
  private webSocket: WebSocket | null = null;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    await this.connectWebSocketAsync();
    const session = await this.registerSessionAsync();
    await this.authenticateWebSocketAsync(session.sessionId);

    const networkInterfaces = await this.getNetworkInterfacesAsync(session.sessionId);
    await this.sessionStore.setAsync({
      sessionId: session.sessionId,
      interfaces: networkInterfaces.result.map((result) => result.id),
    });
    return { success: true };
  }

  /**
   * TrueNAS API uses WebSocket. This function connects to the socket
   * and resolves the promise if the connection was successful.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html
   * @private
   */
  private async connectWebSocketAsync(): Promise<void> {
    const wsUrl = this.integration.url.replace("http", "ws");
    this.webSocket = new WebSocket(`${wsUrl}/websocket`);

    return new Promise((resolve, reject) => {
      if (!this.webSocket) return reject(new Error("WebSocket not initialized"));

      this.webSocket.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as { msg: string };
        localLogger.debug(`Received WebSocket message from TrueNAS: '${data.msg}'`);
      };

      this.webSocket.onopen = () => {
        localLogger.debug(`Connected to TrueNAS WebSocket at ${wsUrl}`);
        resolve();
      };

      this.webSocket.onerror = () => {
        reject(new Error("Failed to connect"));
      };
    });
  }

  /**
   * Before authentication, a session must be obtained from the server using the "connect" event.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   * @private
   */
  private async registerSessionAsync(): Promise<{ sessionId: string }> {
    return new Promise((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as { msg: string; session: string };
        if (data.msg === "connected") {
          this.webSocket?.removeEventListener("message", subscribe);
          resolve({ sessionId: data.session });
        } else if (data.msg === "failed") {
          this.webSocket?.removeEventListener("message", subscribe);
          reject(new Error("Unable to establish connection"));
        }
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          msg: "connect",
          version: "1", // this must be number, not string
          support: ["1"], // this must be number, not string
        }),
      );
    });
  }

  /**
   * After a session was obtained, the session can be authenticated.
   * @param sessionId session to authenticate, identified by ID
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   * @private
   */
  private async authenticateWebSocketAsync(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as { msg: string; result: boolean };
        if (data.msg === "result") {
          this.webSocket?.removeEventListener("message", subscribe);

          if (data.result) {
            resolve();
          } else {
            reject(new Error("TrueNAS WebSocket API authentication returned an unsuccessful result"));
          }
        }
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          id: sessionId,
          msg: "method",
          method: "auth.login",
          params: [this.getSecretValue("username"), this.getSecretValue("password")],
        }),
      );
    });
  }

  /**
   * Retrieves data using the reporting method
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#reporting
   * @private
   */
  private async getReportingAsync(): Promise<z.infer<typeof reportingSchema>> {
    const session = await this.sessionStore.getAsync();
    localLogger.debug("Fetching report data from TrueNAS");

    return new Promise<z.infer<typeof reportingSchema>>((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        this.webSocket?.removeEventListener("message", subscribe);
        const parseResult = reportingSchema.safeParse(JSON.parse(event.data));
        if (!parseResult.success) {
          reject(new Error("Unable to parse reporting"));
        }

        localLogger.debug(`Received report data from TrueNAS of @${parseResult.data?.result.length}`);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve(parseResult.data!);
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          id: session?.sessionId, // TODO: check whether ID is equal to the return result ID -> can this be used to trace requests?
          msg: "method",
          method: "reporting.get_data",
          params: [
            [
              {
                name: "cpu",
              },
              {
                name: "memory",
              },
              {
                name: "cputemp",
              },
            ],
            {
              aggregate: true,
              start: dayjs().add(-5, "minutes").unix(),
              end: dayjs().unix(),
            },
          ],
        }),
      );
    });
  }

  /**
   * Returns a list of all available network interfaces
   * @see https://www.truenas.com/docs/core/13.0/api/core_websocket_api.html#interface
   * @private
   */
  private async getNetworkInterfacesAsync(sessionId: string): Promise<z.infer<typeof networkInterfaceSchema>> {
    localLogger.debug("Fetching available network interfaces from TrueNAS");

    return new Promise((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        const safeParseResult = networkInterfaceSchema.safeParse(JSON.parse(event.data));
        if (!safeParseResult.success) {
          reject(new Error("Unable to parse network interfaces response from TrueNAS"));
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve(safeParseResult.data!);
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          id: sessionId,
          msg: "method",
          method: "interface.query",
          params: [
            [], // no filters
            {},
          ],
        }),
      );
    });
  }

  private async getReportingNetdataAsync(): Promise<z.infer<typeof reportingNetDataSchema>> {
    const session = await this.sessionStore.getAsync();
    localLogger.debug("Fetching network data from TrueNAS");

    if (!session) {
      throw new Error("Unable to fetch reporting network data when session is null");
    }

    return new Promise<z.infer<typeof reportingNetDataSchema>>((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        this.webSocket?.removeEventListener("message", subscribe);
        const parseResult = reportingNetDataSchema.safeParse(JSON.parse(event.data));
        if (!parseResult.success) {
          reject(new Error("Unable to parse reporting netdata"));
        }

        localLogger.debug(`Received network data from TrueNAS of @${parseResult.data?.result.length}`);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve(parseResult.data!);
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          id: session.sessionId,
          msg: "method",
          method: "reporting.netdata_get_data",
          params: [
            session.interfaces.map((interfaceId) => ({
              name: "interface",
              identifier: interfaceId,
            })),
            {
              start: dayjs().add(-5, "minutes").unix(),
              end: dayjs().unix(),
            },
          ],
        }),
      );
    });
  }

  /**
   * Retrieves information about the system
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#system
   * @private
   */
  private async getSystemInformationAsync(): Promise<z.infer<typeof systemInfoSchema>> {
    const session = await this.sessionStore.getAsync();
    localLogger.debug("Fetching system information from TrueNAS");

    return new Promise<z.infer<typeof systemInfoSchema>>((resolve, reject) => {
      const subscribe = (event: MessageEvent<string>) => {
        this.webSocket?.removeEventListener("message", subscribe);
        const parseResult = systemInfoSchema.safeParse(JSON.parse(event.data));
        if (!parseResult.success) {
          reject(new Error("Unable to parse system info data"));
        }

        localLogger.debug(
          `Received system information from TrueNAS '${parseResult.data?.result.hostname}' (${parseResult.data?.result.version})`,
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve(parseResult.data!);
      };

      this.webSocket?.addEventListener("message", subscribe);
      this.webSocket?.send(
        JSON.stringify({
          id: session?.sessionId,
          msg: "method",
          method: "system.info",
        }),
      );
    });
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const session = await this.sessionStore.getAsync();
    const socketOpen = this.webSocket?.readyState === WebSocket.OPEN;

    if (session == null || !socketOpen) {
      await this.reauthenticateAsync();
    }

    let systemInformation: z.infer<typeof systemInfoSchema>;
    try {
      systemInformation = await this.getSystemInformationAsync();
    } catch (error) {
      localLogger.info("Reauthenticating with TrueNAS because session has expired", error);
      await this.reauthenticateAsync();
      systemInformation = await this.getSystemInformationAsync();
    }

    const data = await this.getReportingAsync();

    const cpuData = this.getLatestReportingData(data, "cpu");
    const cpuTempData = this.getLatestReportingData(data, "cputemp");
    const memoryData = this.getLatestReportingData(data, "memory");

    const netdata = await this.getReportingNetdataAsync();

    localLogger.debug(`NETDATA CONTENT: ${JSON.stringify(netdata.result)}`);

    const upload = this.extractNetworkTrafficData(netdata, 2); // Index 2 is "sent"
    const download = this.extractNetworkTrafficData(netdata, 1); // Index 1 is "received"

    return {
      cpuUtilization: cpuData.reduce((acc, item) => acc + (item > 100 ? 0 : item), 0) / cpuData.length,
      cpuTemp: Math.max(...cpuTempData.filter((_item, i) => i > 0)),
      memAvailableInBytes: systemInformation.result.physmem,
      memUsedInBytes: memoryData[1] ?? 0, // Index 0 is UNIX timestamp, Index 1 is free space in bytes
      fileSystem: [],
      availablePkgUpdates: 0,
      network: {
        up: upload * NETWORK_MULTIPLIER,
        down: download * NETWORK_MULTIPLIER,
      },
      loadAverage: null,
      smart: [],
      uptime: systemInformation.result.uptime_seconds,
      version: systemInformation.result.version,
      cpuModelName: systemInformation.result.model,
      rebootRequired: false,
    };
  }

  private extractNetworkTrafficData = (data: z.infer<typeof reportingNetDataSchema>, index = 1 | 2) => {
    if (data.result.length === 0) {
      return 0;
    }

    let acc = 0;

    for (const interfaceData of data.result) {
      if (interfaceData.data.length === 0) {
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc += interfaceData.data[interfaceData.data.length - 1]![index] ?? 0;
    }

    return acc;
  };

  private async reauthenticateAsync() {
    await this.connectWebSocketAsync();
    const session = await this.registerSessionAsync();
    await this.authenticateWebSocketAsync(session.sessionId);
    const networkInterfaces = await this.getNetworkInterfacesAsync(session.sessionId);
    await this.sessionStore.setAsync({
      sessionId: session.sessionId,
      interfaces: networkInterfaces.result.map((result) => result.id),
    });
  }

  private getLatestReportingData(
    data: z.infer<typeof reportingSchema>,
    key: z.infer<typeof reportingSchema>["result"][number]["identifier"],
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dataObject = data.result.find((result) => result.identifier === key)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataObject.data.sort((item1, item2) => (item1 > item2 ? -1 : 1))[0]!;
  }
}

const reportingSchema = z.object({
  id: z.string(),
  msg: z.string(),
  result: z.array(
    z.object({
      name: z.enum(["cpu", "memory", "cputemp"]),
      identifier: z.enum(["cpu", "memory", "cputemp"]),
      aggregations: z.object({
        min: z.record(z.string(), z.unknown()),
        mean: z.record(z.string(), z.unknown()),
        max: z.record(z.string(), z.unknown()),
      }),
      start: z.number().min(0),
      end: z.number().min(0),
      legend: z.array(z.string()),
      data: z.array(z.array(z.number())),
    }),
  ),
});

const reportingNetDataSchema = z.object({
  id: z.string(),
  result: z.array(
    z.object({
      name: z.string(),
      identifier: z.string(),
      data: z.array(z.array(z.number())),
    }),
  ),
});

const systemInfoSchema = z.object({
  id: z.string(),
  msg: z.string(),
  result: z.object({
    version: z.string(),
    hostname: z.string(),
    physmem: z.number().min(0), // pysical memory
    model: z.string(), // cpu model
    uptime_seconds: z.number().min(0),
  }),
});

const networkInterfaceSchema = z.object({
  msg: z.literal("result"),
  result: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});
