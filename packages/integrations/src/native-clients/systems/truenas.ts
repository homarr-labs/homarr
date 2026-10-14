import { z } from "zod";

import { isRecord } from "@homarr/common/object";
import { ResponseError } from "@homarr/common/response-error";

import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import { trueNasApis } from "../../truenas/truenas-api";
import type { TrueNasApiKind } from "../../truenas/truenas-api";
import { SystemsHttpClient, SystemsResourceHold } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

export { trueNasApis } from "../../truenas/truenas-api";
export type { TrueNasApiKind, TrueNasResponse, TrueNasApi } from "../../truenas/truenas-api";

const reportingSchema = z.array(
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
);
const poolsSchema = z.array(
  z.object({
    name: z.string(),
    status: z.string(),
    healthy: z.boolean(),
    free: z.number().min(0).nullable(),
    size: z.number().nullable(),
    allocated: z.number().nullable(),
  }),
);
const propertySchema = z.object({ parsed: z.number().min(0).nullish() }).nullish();
const datasetsSchema = z.array(z.object({ id: z.string(), used: propertySchema, available: propertySchema }));
const netdataSchema = z.array(
  z.object({ name: z.string(), identifier: z.string(), data: z.array(z.array(z.number())) }),
);
const systemSchema = z.object({
  version: z.string(),
  hostname: z.string(),
  physmem: z.number().min(0),
  model: z.string(),
  uptime_seconds: z.number().min(0),
});
const interfacesSchema = z.array(z.object({ id: z.string(), name: z.string() }));

export class TrueNasHeldClient extends SystemsHttpClient {
  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  override async testConnectionAsync(): Promise<never> {
    throw new SystemsResourceHold("truenas-socket");
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    throw new Error("TrueNAS credentials authenticate its WebSocket API and cannot authenticate generic HTTP requests");
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    throw new SystemsResourceHold("truenas-socket");
  }

  protected async testingAsync(_http: SystemsHttpOperation): Promise<never> {
    throw new SystemsResourceHold("truenas-socket");
  }
}

export function parseTrueNasMessage(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function parseTrueNasReply(
  raw: string,
  api: TrueNasApiKind,
  id: string,
  method: string,
): { result: unknown } | undefined {
  const message = parseTrueNasMessage(raw);
  if (!message) return undefined;
  const response = trueNasApis[api].matchResponse(message, id);
  if (!response) return undefined;
  if ("error" in response) throw new Error(`TrueNAS method "${method}" failed: ${JSON.stringify(response.error)}`);
  return response;
}

export function trueNasAuthenticationRequest(credentials: { apiKey: string } | { username: string; password: string }) {
  return "apiKey" in credentials
    ? { method: "auth.login_with_api_key", params: [credentials.apiKey] }
    : { method: "auth.login", params: [credentials.username, credentials.password] };
}

export function validateTrueNasAuthentication(payload: unknown) {
  if (!z.boolean().parse(payload)) throw new ResponseError({ status: 401 });
}

export function parseTrueNasLegacyHandshake(raw: string): "connected" | "pending" {
  const message = parseTrueNasMessage(raw);
  if (message?.msg === "failed") throw new Error("Unable to establish TrueNAS session");
  return message?.msg === "connected" ? "connected" : "pending";
}

export function trueNasReportingRequest(now = Date.now()) {
  return {
    method: "reporting.get_data",
    params: [
      [{ name: "cpu" }, { name: "memory" }, { name: "cputemp" }],
      { aggregate: true, start: Math.floor((now - 300_000) / 1000), end: Math.floor(now / 1000) },
    ],
  };
}

export function trueNasNetdataRequest(interfaces: unknown, now = Date.now()) {
  return {
    method: "reporting.netdata_get_data",
    params: [
      interfacesSchema.parse(interfaces).map((entry) => ({ name: "interface", identifier: entry.id })),
      { start: Math.floor((now - 300_000) / 1000), end: Math.floor(now / 1000) },
    ],
  };
}

export const trueNasPoolRequest = () => ({ method: "pool.query", params: [[], { extra: { is_upgraded: true } }] });
export const trueNasDatasetRequest = (names: string[]) => ({
  method: "pool.dataset.query",
  params: [[["id", "in", names]], { extra: { properties: ["used", "available"] } }],
});
export const trueNasInterfaceRequest = () => ({ method: "interface.query", params: [[], {}] });
export const trueNasSystemRequest = () => ({ method: "system.info", params: [] });
export const trueNasLegacyConnectRequest = () => ({ msg: "connect", version: "1", support: ["1"] });

export function parseTrueNasUsableSpace(payload: unknown) {
  const space = new Map<string, { used: number; available: number }>();
  for (const dataset of datasetsSchema.parse(payload)) {
    const used = dataset.used?.parsed;
    const available = dataset.available?.parsed;
    if (typeof used === "number" && typeof available === "number") space.set(dataset.id, { used, available });
  }
  return space;
}

export function mapTrueNasSystemInfo(input: {
  system: unknown;
  reporting: unknown;
  pools: unknown;
  netdata: unknown;
  usableSpace: ReadonlyMap<string, { used: number; available: number }>;
}): SystemHealthMonitoring {
  const system = systemSchema.parse(input.system);
  const reporting = reportingSchema.parse(input.reporting);
  const pools = poolsSchema.parse(input.pools).flatMap((pool) =>
    pool.allocated !== null && pool.size !== null && pool.free !== null
      ? [
          {
            ...pool,
            used: input.usableSpace.get(pool.name)?.used ?? pool.allocated,
            available: input.usableSpace.get(pool.name)?.available ?? pool.free,
          },
        ]
      : [],
  );
  const netdata = netdataSchema.parse(input.netdata);
  const latest = (identifier: "cpu" | "memory" | "cputemp") => {
    const row = reporting.find((entry) => entry.identifier === identifier)?.data.at(-1);
    if (!row) throw new Error(`TrueNAS returned no "${identifier}" reporting data`);
    return row;
  };
  const cpu = latest("cpu");
  const temp = latest("cputemp");
  const memory = latest("memory")[1] ?? 0;
  const traffic = (index: 1 | 2) => netdata.reduce((sum, entry) => sum + (entry.data.at(-1)?.at(index) ?? 0), 0) * 100;
  return {
    cpuUtilization: cpu.reduce((sum, value) => sum + (value > 100 ? 0 : value), 0) / cpu.length,
    cpuTemp: Math.max(...temp.filter((_, index) => index > 0)),
    memAvailableInBytes: memory,
    memUsedInBytes: Math.max(system.physmem - memory, 0),
    fileSystem: pools.map((pool) => ({
      deviceName: pool.name,
      available: `${pool.available}`,
      used: `${pool.used}`,
      percentage: pool.used + pool.available > 0 ? (pool.used / (pool.used + pool.available)) * 100 : 0,
    })),
    availablePkgUpdates: 0,
    network: { up: traffic(2), down: traffic(1) },
    loadAverage: null,
    smart: pools.map((pool) => ({
      deviceName: pool.name,
      healthy: pool.healthy,
      overallStatus: pool.status,
      temperature: null,
    })),
    uptime: system.uptime_seconds,
    version: system.version,
    cpuModelName: system.model,
    rebootRequired: false,
    gpu: [],
  };
}
