import dayjs from "dayjs";
import z from "zod";

import { ParseError } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import type { TrueNasCredentials } from "./truenas-client";
import { TrueNasClient } from "./truenas-client";

const logger = createLogger({ module: "trueNasIntegration" });

const NETWORK_MULTIPLIER = 1000 / 8;
const MEBIBYTE = 1024 * 1024;
// Allow Netdata to finish its collection interval before requesting the latest sample.
const REPORTING_DELAY_SECONDS = 5;

const ERROR_MESSAGE_LIMIT = 200;

/**
 * The error decorator replaces a rejected request with a generic message and moves the actionable
 * reason to `cause`. TrueNAS puts its middleware traceback in there, several kilobytes of it, so the
 * reason is truncated before it reaches a log line that repeats on every poll.
 */
const describeRequestError = (error: unknown) => {
  const cause = error instanceof Error ? error.cause : undefined;
  let reason = String(error);
  if (error instanceof Error) reason = error.message;
  if (cause instanceof Error) reason = cause.message;
  if (reason.length > ERROR_MESSAGE_LIMIT) return `${reason.slice(0, ERROR_MESSAGE_LIMIT)}…`;
  return reason;
};

export class TrueNasIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    throw new Error("TrueNAS credentials authenticate its WebSocket API and cannot authenticate generic HTTP requests");
  }

  private client?: TrueNasClient;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.getClient().testAsync(input.options);
    return { success: true };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const [systemInformation, reporting, datasets, netdata] = await Promise.all([
      this.getSystemInformationAsync(),
      this.getReportingAsync(),
      this.getPoolsAsync(),
      this.getReportingNetdataAsync(),
    ]);

    const cpuData = this.extractLatestReportingData(reporting, "cpu");
    const cpuTempData = this.extractLatestReportingData(reporting, "cputemp");
    const memoryData = this.extractLatestReportingData(reporting, "memory");
    if (Object.values(memoryData).some((value) => value < 0)) {
      throw new ParseError("TrueNAS returned negative memory reporting values");
    }

    const upload = this.extractNetworkTrafficData(netdata, "sent");
    const download = this.extractNetworkTrafficData(netdata, "received");

    let memoryUsed: number;
    if (memoryData.available !== undefined) {
      memoryUsed = systemInformation.physmem - memoryData.available;
    } else if (
      memoryData.used !== undefined &&
      ["free", "cached", "buffers"].every((column) => memoryData[column] !== undefined)
    ) {
      memoryUsed = memoryData.used * MEBIBYTE;
    } else {
      throw new ParseError("TrueNAS returned an unsupported memory reporting format");
    }
    const memUsedInBytes = Math.min(systemInformation.physmem, Math.max(memoryUsed, 0));
    const memAvailableInBytes = systemInformation.physmem - memUsedInBytes;
    const cpuUtilization =
      cpuData.cpu ??
      Object.entries(cpuData).reduce((total, [column, value]) => {
        if (column === "idle" || column === "iowait") return total;
        return total + value;
      }, 0);

    return {
      cpuUtilization: Math.min(100, Math.max(0, cpuUtilization)),
      cpuTemp: Math.max(...Object.values(cpuTempData)),
      memAvailableInBytes,
      memUsedInBytes,
      fileSystem: datasets.map((dataset) => {
        const total = dataset.used + dataset.available;
        let percentage = 0;
        if (total > 0) percentage = (dataset.used / total) * 100;
        return {
          deviceName: dataset.name,
          available: `${dataset.available}`,
          used: `${dataset.used}`,
          percentage,
        };
      }),
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
            name: pool.name,
            status: pool.status,
            healthy: pool.healthy,
            allocated: pool.allocated,
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

    if (activePools.length === 0) return [];

    const usableSpaceByPool = await this.getUsableSpaceByPoolAsync(activePools.map((pool) => pool.name));

    return activePools.map((pool) => {
      const usableSpace = usableSpaceByPool.get(pool.name);
      if (!usableSpace) {
        logger.warn("Falling back to physical pool space, the root dataset reported no usable space", {
          url: this.integration.url,
          pool: pool.name,
        });
      }

      return {
        name: pool.name,
        status: pool.status,
        healthy: pool.healthy,
        used: usableSpace?.used ?? pool.allocated,
        available: usableSpace?.available ?? pool.free,
      };
    });
  }

  /**
   * Returns the usable space of each pool's root ZFS dataset, keyed by pool name. Unlike the physical
   * `pool.query` values, these account for RAIDZ parity overhead and dataset limits, matching `zfs list`.
   * See https://github.com/homarr-labs/homarr/issues/6566
   *
   * A pool is left out when its usable space is unavailable, so the caller keeps reporting the pool with
   * its physical values instead of dropping it, which would also hide its health status:
   *   - request rejected  → method or `extra.properties` unsupported, or the API key lacks the dataset role
   *   - response rejected → the payload does not match the expected shape
   *   - dataset missing   → the pool's root dataset was not returned by the query
   *   - property absent   → the dataset does not report `used` / `available`, e.g. while locked
   */
  private async getUsableSpaceByPoolAsync(poolNames: string[]) {
    const usableSpaceByPool = new Map<string, { used: number; available: number }>();

    try {
      const datasets = await this.requestAsync("pool.dataset.query", [
        [["id", "in", poolNames]],
        {
          extra: {
            properties: ["used", "available"],
          },
        },
      ]);

      for (const dataset of await poolDatasetSchema.parseAsync(datasets)) {
        const used = dataset.used?.parsed;
        const available = dataset.available?.parsed;
        if (typeof used !== "number" || typeof available !== "number") continue;

        usableSpaceByPool.set(dataset.id, { used, available });
      }
    } catch (error) {
      logger.warn("Could not retrieve root dataset space, continuing with physical pool space", {
        url: this.integration.url,
        error: describeRequestError(error),
      });
    }

    return usableSpaceByPool;
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
        end: dayjs().subtract(REPORTING_DELAY_SECONDS, "seconds").unix(),
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
        end: dayjs().subtract(REPORTING_DELAY_SECONDS, "seconds").unix(),
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

  /**
   * TrueNAS can append a zero-filled row for the second that is still being collected. Ending the
   * query a few seconds early avoids that when the clocks agree, but a Homarr host clock ahead of
   * the NAS still includes it. Prefer a collected row only when it falls inside the collection
   * interval of the latest sample; older zeros are treated as a real idle reading.
   */
  private latestCollectedRow(legend: string[], data: number[][]) {
    const timeIndex = legend.indexOf("time");
    const latest = data.at(-1);
    if (!latest) return latest;

    const hasCollectedValue = (row: number[]) => row.some((value, index) => index !== timeIndex && value !== 0);

    if (hasCollectedValue(latest)) return latest;

    const collected = data.findLast(hasCollectedValue);
    if (!collected || timeIndex < 0) return latest;

    const latestTime = latest[timeIndex];
    const collectedTime = collected[timeIndex];
    if (
      latestTime === undefined ||
      collectedTime === undefined ||
      latestTime - collectedTime > REPORTING_DELAY_SECONDS
    ) {
      return latest;
    }

    return collected;
  }

  private extractNetworkTrafficData = (data: z.infer<typeof reportingNetDataSchema>, column: "sent" | "received") => {
    return data.reduce((total, report) => {
      const row = this.latestCollectedRow(report.legend, report.data);
      const value = row?.[report.legend.indexOf(column)] ?? 0;
      return total + value;
    }, 0);
  };

  private extractLatestReportingData(data: ReportingItem[], identifier: ReportingItem["identifier"]) {
    const item = data.find((reportingItem) => reportingItem.identifier === identifier);
    const latest = item ? this.latestCollectedRow(item.legend, item.data) : undefined;
    if (!item || !latest?.length) throw new ParseError(`TrueNAS returned no "${identifier}" reporting data`);
    if (new Set(item.legend).size !== item.legend.length) {
      throw new ParseError(`TrueNAS returned duplicate "${identifier}" reporting columns`);
    }
    const values: Record<string, number> = {};
    for (const [index, column] of item.legend.entries()) {
      if (column === "time") continue;
      const value = latest[index];
      if (value === undefined) throw new ParseError(`TrueNAS returned no "${identifier}.${column}" reporting value`);
      values[column] = value;
    }
    if (Object.keys(values).length === 0) throw new ParseError(`TrueNAS returned no "${identifier}" reporting values`);
    return values;
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

// Properties are absent or unparsed for datasets that do not report them, e.g. while locked,
// so they are optional here and the pool falls back to its physical values instead of failing
// the whole request, which would also drop cpu, memory and network data
const poolDatasetPropertySchema = z.object({ parsed: z.number().min(0).nullish() }).nullish();

const poolDatasetSchema = z.array(
  z.object({
    id: z.string(),
    used: poolDatasetPropertySchema,
    available: poolDatasetPropertySchema,
  }),
);

const reportingNetDataSchema = z.array(
  z.object({
    name: z.string(),
    identifier: z.string(),
    legend: z.array(z.string()),
    data: z.array(z.array(z.number())),
  }),
);

const systemInfoSchema = z.object({
  version: z.string(),
  hostname: z.string(),
  physmem: z.number().positive(),
  model: z.string(), // cpu model
  uptime_seconds: z.number().min(0),
});

const networkInterfaceSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);
