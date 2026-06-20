import dayjs from "dayjs";
import z from "zod";

import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { TrueNasCredentials } from "./truenas-client";
import { TrueNasClient } from "./truenas-client";

const logger = createLogger({ module: "trueNasIntegration" });

const NETWORK_MULTIPLIER = 100;

export class TrueNasIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private client?: TrueNasClient;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.getClient().testAsync(input.options);
    return { success: true };
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

    // The "memory" reporting graph reports available (free) memory, its legend is ["time", "available"].
    // Used memory is therefore the physical total minus what is still available (clamped against timing skew).
    const memAvailableInBytes = memoryData[1] ?? 0; // Index 0 is the UNIX timestamp, Index 1 is available bytes
    const memUsedInBytes = Math.max(systemInformation.physmem - memAvailableInBytes, 0);

    return {
      cpuUtilization: cpuData.reduce((acc, item) => acc + (item > 100 ? 0 : item), 0) / cpuData.length,
      cpuTemp: Math.max(...cpuTempData.filter((_item, index) => index > 0)),
      memAvailableInBytes,
      memUsedInBytes,
      fileSystem: datasets.map((dataset) => ({
        deviceName: dataset.name,
        available: `${dataset.free}`, // free space left on the pool
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

  private getClient(): TrueNasClient {
    return (this.client ??= this.createClient());
  }

  private createClient(): TrueNasClient {
    const credentials: TrueNasCredentials = this.hasSecretValue("apiKey")
      ? { apiKey: this.getSecretValue("apiKey") }
      : { username: this.getSecretValue("username"), password: this.getSecretValue("password") };

    return new TrueNasClient(this.integration.id, (path) => this.webSocketUrl(path), credentials);
  }

  private async requestAsync(method: string, params: unknown[] = []): Promise<unknown> {
    return this.getClient().requestAsync(method, params);
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

  private extractNetworkTrafficData = (data: z.infer<typeof reportingNetDataSchema>, index: 1 | 2) => {
    return data.reduce((acc, current) => acc + (current.data.at(-1)?.at(index) ?? 0), 0);
  };

  private extractLatestReportingData(data: ReportingItem[], identifier: ReportingItem["identifier"]) {
    const item = data.find((reportingItem) => reportingItem.identifier === identifier);
    // Reporting rows are [timestamp, ...values] in ascending time order, so the last row is the most recent reading.
    const latest = item?.data.at(-1);
    if (!latest) throw new Error(`TrueNAS returned no "${identifier}" reporting data`);
    return latest;
  }
}

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
