import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import type {
  BeszelAlert,
  BeszelAlertHistory,
  BeszelContainerStatsRecord,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemRow,
  BeszelSystemStatsRecord,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const logger = createLogger({ module: "beszelRequestHandler" });

export type { BeszelSystemRow } from "@homarr/integrations/types";

/**
 * Maps raw Beszel API responses (BeszelSystem + BeszelSystemDetails) into a
 * normalized BeszelSystemRow for widget consumption.
 *
 * BeszelSystemInfo uses short field names (see beszel-types.ts for full docs):
 * cpu=CPU%, mp=memory%, dp=disk%, g=GPU%, la=loadAvg, u=uptime(s), v=version,
 * bb=bandwidth(bytes/s), b=bandwidth(Mbps legacy), dt=disk temp, bat=battery,
 * sv=[running,total] services, h=hostname, m=CPU model, c=cores, ct=threads
 */
function mapToSystemRow(system: BeszelSystem, details: BeszelSystemDetails | null): BeszelSystemRow {
  const info = system.info;
  return {
    id: system.id,
    name: system.name,
    status: system.status,
    cpu: info.cpu,
    memory: info.mp,
    disk: info.dp,
    gpu: info.g ?? 0,
    loadAvg: info.la ?? null,
    // bb = bytes/s (newer), b = Mbps (legacy, multiply to get bytes/s)
    netBytes: info.bb ?? (info.b ?? 0) * 1_000_000,
    temp: info.dt ?? null,
    battery: info.bat ?? null,
    services: info.sv?.[0] ?? 0,
    uptime: info.u,
    agentVersion: info.v,
    hostname: details?.hostname ?? info.h ?? system.name,
    cpuModel: details?.cpu ?? info.m ?? "Unknown",
    cores: details?.cores ?? info.ct ?? info.c ?? 1,
    memoryTotal: details?.memory ?? 0,
    osName: details?.os_name ?? "",
  };
}

export const beszelSystemsRequestHandler = createIntegrationRequestHandler<
  BeszelSystemRow[],
  "beszel" | "mock",
  Record<string, never>
>({
  async requestAsync(integration) {
    const start = performance.now();
    const instance = await createIntegrationAsync(integration);
    const systems = await instance.getSystemsAsync();
    const enriched = await Promise.all(
      systems.map(async (system) => {
        const details = await instance.getSystemDetailsAsync(system.id).catch((error) => {
          logger.warn("Failed to fetch Beszel system details", { systemId: system.id, error: String(error) });
          return null;
        });
        return mapToSystemRow(system, details);
      }),
    );
    logger.debug("beszelSystems fetch completed", {
      integrationId: integration.id,
      durationMs: Math.round(performance.now() - start),
      count: enriched.length,
    });
    return enriched;
  },
});

export interface BeszelAlertsData {
  alerts: BeszelAlert[];
  history: BeszelAlertHistory[];
}

export const beszelAlertsRequestHandler = createIntegrationRequestHandler<
  BeszelAlertsData,
  "beszel" | "mock",
  { includeHistory: boolean; maxHistoryItems: number }
>({
  async requestAsync(integration, input) {
    const start = performance.now();
    const instance = await createIntegrationAsync(integration);
    const alerts = await instance.getAlertsAsync();
    const history = input.includeHistory ? await instance.getAlertHistoryAsync(undefined, input.maxHistoryItems) : [];
    logger.debug("beszelAlerts fetch completed", {
      integrationId: integration.id,
      durationMs: Math.round(performance.now() - start),
      alertsCount: alerts.length,
      historyCount: history.length,
    });
    return { alerts, history };
  },
});

const timePeriodConfig: Record<string, { type: string; perPage: number }> = {
  "1m": { type: "1m", perPage: 60 },
  "1h": { type: "1m", perPage: 60 },
  "12h": { type: "10m", perPage: 72 },
  "24h": { type: "20m", perPage: 72 },
  "1w": { type: "480m", perPage: 21 },
  "30d": { type: "480m", perPage: 90 },
};

export interface BeszelStatsData {
  systemStats: BeszelSystemStatsRecord[];
  containerStats: BeszelContainerStatsRecord[];
}

export const beszelStatsRequestHandler = createIntegrationRequestHandler<
  BeszelStatsData,
  "beszel" | "mock",
  { systemId: string; timePeriod: string; includeDocker: boolean }
>({
  async requestAsync(integration, input) {
    const start = performance.now();
    const config = timePeriodConfig[input.timePeriod] ?? { type: "1m", perPage: 60 };
    const instance = await createIntegrationAsync(integration);
    const systemStats = await instance.getSystemStatsAsync(input.systemId, config.type, config.perPage);
    const containerStats = input.includeDocker
      ? await instance.getContainerStatsAsync(input.systemId, config.type, config.perPage).catch((error) => {
          logger.warn("Failed to fetch Beszel container stats", { systemId: input.systemId, error: String(error) });
          return [];
        })
      : [];
    logger.debug("beszelStats fetch completed", {
      integrationId: integration.id,
      systemId: input.systemId,
      timePeriod: input.timePeriod,
      durationMs: Math.round(performance.now() - start),
      systemStatsCount: systemStats.length,
      containerStatsCount: containerStats.length,
    });
    return { systemStats, containerStats };
  },
});
