import { createIntegrationAsync } from "@homarr/integrations/factory";
import type {
  WazuhAgentsOverview,
  WazuhAlert,
  WazuhAlertTimeline,
  WazuhAuthFailures,
  WazuhCveOrder,
  WazuhFimEventFilter,
  WazuhFimOverview,
  WazuhSecuritySummary,
  WazuhTimelineInterval,
  WazuhTimeRange,
  WazuhTopList,
  WazuhTopListKind,
  WazuhVulnerabilityOverview,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

/** Alert data changes constantly but the widgets only need minute resolution. */
const WAZUH_CACHE_TTL_MS = 60 * 1000;
/** Aggregations over long windows and the vulnerability state change slowly; cache them longer. */
const WAZUH_SLOW_CACHE_TTL_MS = 5 * 60 * 1000;

export const wazuhAgentsRequestHandler = createIntegrationRequestHandler<
  WazuhAgentsOverview,
  "wazuh",
  Record<string, never>
>({
  cacheNamespace: "wazuh:agents:v2",
  cacheTtlMs: WAZUH_CACHE_TTL_MS,
  async requestAsync(integration) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getAgentsOverviewAsync();
  },
});

export const wazuhAlertsRequestHandler = createIntegrationRequestHandler<
  WazuhAlert[],
  "wazuh",
  { minLevel: number; limit: number; hours: number }
>({
  cacheNamespace: "wazuh:alerts:v2",
  cacheTtlMs: WAZUH_CACHE_TTL_MS,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getRecentAlertsAsync(input);
  },
});

export const wazuhSummaryRequestHandler = createIntegrationRequestHandler<
  WazuhSecuritySummary,
  "wazuh",
  { range: WazuhTimeRange }
>({
  cacheNamespace: "wazuh:summary:v2",
  cacheTtlMs: WAZUH_CACHE_TTL_MS,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getSecuritySummaryAsync(input);
  },
});

const createTimelineRequestHandler = (cacheNamespace: string, cacheTtlMs: number) =>
  createIntegrationRequestHandler<
    WazuhAlertTimeline,
    "wazuh",
    { range: WazuhTimeRange; interval: WazuhTimelineInterval; minLevel: number }
  >({
    cacheNamespace,
    cacheTtlMs,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getAlertTimelineAsync(input);
    },
  });

const wazuhTimelineRequestHandler = createTimelineRequestHandler("wazuh:timeline", WAZUH_CACHE_TTL_MS);
const wazuhLongTimelineRequestHandler = createTimelineRequestHandler("wazuh:timeline:long", WAZUH_SLOW_CACHE_TTL_MS);

/** Long windows barely change between refreshes, so they are cached for longer. */
export const getWazuhTimelineRequestHandler = (range: WazuhTimeRange) =>
  range === "7d" || range === "30d" ? wazuhLongTimelineRequestHandler : wazuhTimelineRequestHandler;

export const wazuhTopListRequestHandler = createIntegrationRequestHandler<
  WazuhTopList,
  "wazuh",
  { kind: WazuhTopListKind; range: WazuhTimeRange; limit: number; minLevel: number }
>({
  cacheNamespace: "wazuh:top-list",
  cacheTtlMs: WAZUH_CACHE_TTL_MS * 2,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getTopListAsync(input);
  },
});

export const wazuhVulnerabilitiesRequestHandler = createIntegrationRequestHandler<
  WazuhVulnerabilityOverview,
  "wazuh",
  { cveLimit: number; agentLimit: number; cveOrder: WazuhCveOrder; minSeverity: "all" | "medium" | "high" | "critical" }
>({
  cacheNamespace: "wazuh:vulnerabilities",
  cacheTtlMs: WAZUH_SLOW_CACHE_TTL_MS,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getVulnerabilitiesAsync(input);
  },
});

export const wazuhFimRequestHandler = createIntegrationRequestHandler<
  WazuhFimOverview,
  "wazuh",
  { range: WazuhTimeRange; event: WazuhFimEventFilter; limit: number; includeRegistry: boolean }
>({
  cacheNamespace: "wazuh:fim",
  cacheTtlMs: WAZUH_CACHE_TTL_MS,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getFimEventsAsync(input);
  },
});

export const wazuhAuthFailuresRequestHandler = createIntegrationRequestHandler<
  WazuhAuthFailures,
  "wazuh",
  { hours: number; limit: number }
>({
  cacheNamespace: "wazuh:auth-failures",
  cacheTtlMs: WAZUH_CACHE_TTL_MS,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getAuthFailuresAsync(input);
  },
});
