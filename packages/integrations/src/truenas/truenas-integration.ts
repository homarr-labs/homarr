import dayjs from "dayjs";
import type { RawData } from "ws";
import { WebSocket } from "ws";
import z from "zod";

import { createId } from "@homarr/common";
import { matchErrorCode, RequestError, ResponseError } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { TrueNasApi } from "./truenas-api";
import { trueNasApis } from "./truenas-api";

const logger = createLogger({ module: "trueNasIntegration" });

const NETWORK_MULTIPLIER = 100;
const REQUEST_TIMEOUT_MS = 5000;

type CertificateOptions = IntegrationTestingInput["options"];

export class TrueNasIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  // Keyed by integration id and shared across the per-request integration instances. The value is
  // the in-flight connection promise so concurrent callers reuse a single socket instead of racing.
  private static readonly connectionMap = new Map<string, Promise<TrueNasSocket>>();
  private static readonly apiMap = new Map<string, TrueNasApi>();

  private wsUrl(path: `/${string}`) {
    const url = super.url(path);
    url.protocol = url.protocol.replace("http", "ws");
    return url;
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    // A successful test may use new credentials, so drop any cached connection and detect the API afresh.
    this.evictConnection();
    TrueNasIntegration.apiMap.delete(this.integration.id);

    const socket = await this.openSocketAsync(input.options);
    try {
      await this.authenticateAsync(socket);
    } finally {
      socket.close();
    }

    return { success: true };
  }

  /**
   * Returns an authenticated socket, reusing the cached connection while it is
   * open. TrueNAS closes idle sockets, so the cache is evicted on close and the
   * next caller transparently reconnects.
   */
  private getSocketAsync(): Promise<TrueNasSocket> {
    const id = this.integration.id;

    let connection = TrueNasIntegration.connectionMap.get(id);
    if (!connection) {
      connection = this.connectAndAuthenticateAsync();
      TrueNasIntegration.connectionMap.set(id, connection);

      const evict = () => {
        if (TrueNasIntegration.connectionMap.get(id) === connection) {
          TrueNasIntegration.connectionMap.delete(id);
        }
      };
      // Reconnect on the next request once this attempt fails or the server drops the socket.
      connection.then((socket) => socket.onClose(evict), evict);
    }

    return connection;
  }

  private async connectAndAuthenticateAsync(): Promise<TrueNasSocket> {
    const socket = await this.openSocketAsync(await this.resolveCertificateOptionsAsync());
    try {
      await this.authenticateAsync(socket);
    } catch (error) {
      // Never keep an unauthenticated socket, it would be reused without re-authenticating.
      socket.close();
      throw error;
    }
    return socket;
  }

  private evictConnection() {
    const id = this.integration.id;
    const connection = TrueNasIntegration.connectionMap.get(id);
    if (!connection) return;

    TrueNasIntegration.connectionMap.delete(id);
    connection.then((socket) => socket.close()).catch(() => undefined);
  }

  /**
   * Connects using the JSON-RPC API (TrueNAS 24.10+) when available and falls
   * back to the legacy websocket API otherwise. A missing JSON-RPC endpoint
   * surfaces as a plain protocol error; certificate, connection, DNS and
   * timeout errors are endpoint-independent and are never retried.
   */
  private async openSocketAsync(certificate: CertificateOptions): Promise<TrueNasSocket> {
    const cachedApi = TrueNasIntegration.apiMap.get(this.integration.id);
    if (cachedApi) {
      return openTrueNasSocketAsync(this.wsUrl(cachedApi.path), cachedApi, certificate);
    }

    try {
      const socket = await openTrueNasSocketAsync(
        this.wsUrl(trueNasApis.jsonRpc.path),
        trueNasApis.jsonRpc,
        certificate,
      );
      TrueNasIntegration.apiMap.set(this.integration.id, trueNasApis.jsonRpc);
      return socket;
    } catch (error) {
      if (error instanceof RequestError) throw error;

      logger.debug("JSON-RPC API unavailable, falling back to the legacy websocket API", {
        url: this.integration.url,
        error: error instanceof Error ? error.message : undefined,
      });
      const socket = await openTrueNasSocketAsync(this.wsUrl(trueNasApis.legacy.path), trueNasApis.legacy, certificate);
      TrueNasIntegration.apiMap.set(this.integration.id, trueNasApis.legacy);
      return socket;
    }
  }

  /**
   * Authenticates with an API key when one is configured, otherwise with the
   * username and password. Both methods work on either API.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   */
  private async authenticateAsync(socket: TrueNasSocket): Promise<void> {
    logger.debug("Authenticating", { url: this.integration.url });
    const response = this.hasSecretValue("apiKey")
      ? await socket.requestAsync("auth.login_with_api_key", [this.getSecretValue("apiKey")])
      : await socket.requestAsync("auth.login", [this.getSecretValue("username"), this.getSecretValue("password")]);

    const success = await z.boolean().parseAsync(response);
    if (!success) throw new ResponseError({ status: 401 });
    logger.debug("Authenticated successfully", { url: this.integration.url });
  }

  private async resolveCertificateOptionsAsync(): Promise<CertificateOptions> {
    return {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    };
  }

  private async requestAsync(method: string, params: unknown[] = []): Promise<unknown> {
    const socket = await this.getSocketAsync();
    return socket.requestAsync(method, params);
  }

  private async getPoolsAsync() {
    logger.debug("Retrieving pools", { url: this.integration.url });

    const response = await this.requestAsync("pool.query", [
      [],
      {
        extra: {
          is_upgraded: true,
        },
      },
    ]);
    const result = await poolSchema.parseAsync(response);
    // Offline / exported pools have null values for allocated, size and free, so we filter them out
    // See https://github.com/homarr-labs/homarr/issues/5194
    const activePools = result
      .map((pool) => {
        if (pool.allocated !== null && pool.size !== null && pool.free !== null) {
          return {
            ...pool,
            allocated: pool.allocated,
            size: pool.size,
            free: pool.free,
          };
        }

        return null;
      })
      .filter((pool) => pool !== null);
    logger.debug("Retrieved pools", {
      url: this.integration.url,
      totalCount: result.length,
      activeCount: activePools.length,
    });
    return activePools;
  }

  /**
   * Retrieves data using the reporting method
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#reporting
   */
  private async getReportingAsync(): Promise<ReportingItem[]> {
    logger.debug("Retrieving reporting data", { url: this.integration.url });

    const response = await this.requestAsync("reporting.get_data", [
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
    ]);
    const result = await z.array(reportingItemSchema).parseAsync(response);

    logger.debug("Retrieved reporting data", {
      url: this.integration.url,
      count: result.length,
    });
    return result;
  }

  /**
   * Retrieves a list of all available network interfaces
   * @see https://www.truenas.com/docs/core/13.0/api/core_websocket_api.html#interface
   */
  private async getNetworkInterfacesAsync(): Promise<z.infer<typeof networkInterfaceSchema>> {
    logger.debug("Retrieving available network-interfaces", { url: this.integration.url });

    const response = await this.requestAsync("interface.query", [
      [], // no filters
      {},
    ]);
    const result = await networkInterfaceSchema.parseAsync(response);

    logger.debug("Retrieved available network-interfaces", {
      url: this.integration.url,
      count: result.length,
    });
    return result;
  }

  /**
   * Retrieves reporting network data of the last 5 minutes
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#reporting
   */
  private async getReportingNetdataAsync(): Promise<z.infer<typeof reportingNetDataSchema>> {
    const networkInterfaces = await this.getNetworkInterfacesAsync();

    logger.debug("Retrieving reporting network data", { url: this.integration.url });

    const response = await this.requestAsync("reporting.netdata_get_data", [
      networkInterfaces.map((networkInterface) => ({
        name: "interface",
        identifier: networkInterface.id,
      })),
      {
        start: dayjs().add(-5, "minutes").unix(),
        end: dayjs().unix(),
      },
    ]);
    const result = await reportingNetDataSchema.parseAsync(response);

    logger.debug("Retrieved reporting-network-data", {
      url: this.integration.url,
      count: result.length,
    });
    return result;
  }

  /**
   * Retrieves information about the system
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#system
   */
  private async getSystemInformationAsync(): Promise<z.infer<typeof systemInfoSchema>> {
    logger.debug("Retrieving system-information", { url: this.integration.url });

    const response = await this.requestAsync("system.info");
    const result = await systemInfoSchema.parseAsync(response);

    logger.debug("Retrieved system-information", { url: this.integration.url });
    return result;
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const systemInformation = await this.getSystemInformationAsync();
    const reporting = await this.getReportingAsync();

    const cpuData = this.extractLatestReportingData(reporting, "cpu");
    const cpuTempData = this.extractLatestReportingData(reporting, "cputemp");
    const memoryData = this.extractLatestReportingData(reporting, "memory");
    const datasets = await this.getPoolsAsync();

    const netdata = await this.getReportingNetdataAsync();

    const upload = this.extractNetworkTrafficData(netdata, 2); // Index 2 is "sent"
    const download = this.extractNetworkTrafficData(netdata, 1); // Index 1 is "received"

    return {
      cpuUtilization: cpuData.reduce((acc, item) => acc + (item > 100 ? 0 : item), 0) / cpuData.length,
      cpuTemp: Math.max(...cpuTempData.filter((_item, index) => index > 0)),
      memAvailableInBytes: systemInformation.physmem,
      memUsedInBytes: memoryData[1] ?? 0, // Index 0 is UNIX timestamp, Index 1 is free space in bytes
      fileSystem: datasets.map((dataset) => ({
        deviceName: dataset.name,
        available: `${dataset.size}`, // TODO: can we use number instead of string here?
        used: `${dataset.allocated}`,
        percentage: (dataset.allocated / dataset.size) * 100,
      })),
      availablePkgUpdates: 0,
      network: {
        up: upload * NETWORK_MULTIPLIER,
        down: download * NETWORK_MULTIPLIER,
      },
      loadAverage: null,
      smart: datasets.map((dataset) => ({
        deviceName: dataset.name,
        healthy: dataset.healthy,
        overallStatus: dataset.status,
        temperature: null,
      })),
      uptime: systemInformation.uptime_seconds,
      version: systemInformation.version,
      cpuModelName: systemInformation.model,
      rebootRequired: false,
      gpu: [],
    };
  }

  private extractNetworkTrafficData = (data: z.infer<typeof reportingNetDataSchema>, index: 1 | 2) => {
    return data.reduce((acc, current) => acc + (current.data.at(-1)?.at(index) ?? 0), 0);
  };

  private extractLatestReportingData(data: ReportingItem[], key: ReportingItem["identifier"]) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dataObject = data.find((item) => item.identifier === key)!;
    // TODO: check why the below sorting is done, because right now it compares number[] with number[]?
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataObject.data.sort((item1, item2) => (item1 > item2 ? -1 : 1))[0]!;
  }
}

/**
 * Wraps a single websocket connection and speaks whichever TrueNAS API
 * ({@link trueNasApis}) was negotiated when it was opened.
 */
class TrueNasSocket {
  constructor(
    private readonly webSocket: WebSocket,
    private readonly api: TrueNasApi,
  ) {}

  public get isOpen() {
    return this.webSocket.readyState === WebSocket.OPEN;
  }

  public close() {
    this.webSocket.close();
  }

  public onClose(listener: () => void) {
    this.webSocket.once("close", listener);
  }

  /**
   * The legacy DDP API requires a "connect" handshake to obtain a session
   * before any method can be called.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   */
  public registerSessionAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (raw: RawData) => {
        const message = parseMessage(raw);
        if (message?.msg === "connected") {
          this.webSocket.off("message", handler);
          resolve();
        } else if (message?.msg === "failed") {
          this.webSocket.off("message", handler);
          reject(new Error("Unable to establish TrueNAS session"));
        }
      };

      this.webSocket.on("message", handler);
      this.webSocket.send(JSON.stringify({ msg: "connect", version: "1", support: ["1"] }));
    });
  }

  /**
   * Sends a method request and resolves with its result. Rejects after
   * {@link REQUEST_TIMEOUT_MS} when no matching response was received.
   */
  public requestAsync(method: string, params: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = createId();

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.webSocket.off("message", handler);
        this.webSocket.off("close", onClose);
        this.webSocket.off("error", onError);
      };

      const handler = (raw: RawData) => {
        const message = parseMessage(raw);
        if (!message) return;

        const response = this.api.matchResponse(message, id);
        if (!response) return;

        cleanup();
        if ("error" in response) {
          reject(new Error(`TrueNAS method "${method}" failed: ${JSON.stringify(response.error)}`));
          return;
        }
        logger.debug("Received method response", { id, method, api: this.api.kind });
        resolve(response.result);
      };

      // A dropped connection would otherwise leave the request hanging until the timeout below.
      const onClose = () => {
        cleanup();
        reject(
          new RequestError(
            { type: "connection", reason: "reset", code: "ECONNRESET" },
            { cause: new Error("Connection closed before a response was received") },
          ),
        );
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new RequestError(
            {
              type: "timeout",
              reason: "aborted",
              code: "ECONNABORTED",
            },
            { cause: new Error("Canceled request after 5 seconds") },
          ),
        );
      }, REQUEST_TIMEOUT_MS);

      this.webSocket.on("message", handler);
      this.webSocket.once("close", onClose);
      this.webSocket.once("error", onError);
      logger.debug("Sending method request", { id, method, api: this.api.kind });
      this.webSocket.send(JSON.stringify(this.api.buildRequest(id, method, params)));
    });
  }
}

/**
 * Opens a websocket using Homarr's trusted certificates and performs the
 * session handshake when the API requires it. TLS, connection, DNS and timeout
 * failures are translated into {@link RequestError}s so the connection test can
 * offer to trust a self-signed certificate, exactly like the HTTP integrations.
 */
const openTrueNasSocketAsync = async (
  url: URL,
  api: TrueNasApi,
  certificate: CertificateOptions,
): Promise<TrueNasSocket> => {
  logger.debug("Connecting to TrueNAS websocket", { url: url.toString(), api: api.kind });

  const webSocket = await new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url, {
      ca: certificate.ca,
      // The @types/ws contract types this as returning a boolean, but ws forwards it to
      // tls.connect which uses Node's `Error | undefined` contract that our helper follows.
      checkServerIdentity: certificate.checkServerIdentity as never,
    });

    socket.once("open", () => resolve(socket));
    socket.once("error", (error: Error & { code?: string }) => {
      const matched = error.code ? matchErrorCode(error.code) : undefined;
      reject(matched ? new RequestError(matched, { cause: error }) : error);
    });
  });

  const socket = new TrueNasSocket(webSocket, api);
  if (api.requiresSessionHandshake) await socket.registerSessionAsync();
  return socket;
};

const parseMessage = (raw: RawData): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw.toString());
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const reportingItemSchema = z.object({
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
});

type ReportingItem = z.infer<typeof reportingItemSchema>;

const poolSchema = z.array(
  z.object({
    name: z.string(),
    status: z.string(),
    healthy: z.boolean(),
    // free, size and allocated are null when the pool is offline or exported
    // see https://github.com/homarr-labs/homarr/issues/5194
    free: z.number().min(0).nullable(),
    size: z.number().nullable(),
    allocated: z.number().nullable(),
  }),
);

const reportingNetDataSchema = z.array(
  z.object({
    name: z.string(),
    identifier: z.string(),
    data: z.array(z.array(z.number())),
  }),
);

const systemInfoSchema = z.object({
  version: z.string(),
  hostname: z.string(),
  physmem: z.number().min(0), // pysical memory
  model: z.string(), // cpu model
  uptime_seconds: z.number().min(0),
});

const networkInterfaceSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);
