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

import type { OwnedRequestFactories } from "./factories";
import type { WidgetProviderResources } from "./resources";

const WAZUH_CACHE_TTL_MS = 60 * 1000;
const WAZUH_SLOW_CACHE_TTL_MS = 5 * 60 * 1000;

export const createWazuhRequests = (factories: OwnedRequestFactories, providers: WidgetProviderResources) => {
  const { createIntegrationRequestHandler } = factories;
  const { createIntegrationAsync } = providers;
  const wazuhAgents = createIntegrationRequestHandler<WazuhAgentsOverview, "wazuh", Record<string, never>>({
    cacheNamespace: "wazuh:agents:v2",
    cacheTtlMs: WAZUH_CACHE_TTL_MS,
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getAgentsOverviewAsync();
    },
  });
  const wazuhAlerts = createIntegrationRequestHandler<
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
  const wazuhSummary = createIntegrationRequestHandler<WazuhSecuritySummary, "wazuh", { range: WazuhTimeRange }>({
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
  const timeline = createTimelineRequestHandler("wazuh:timeline", WAZUH_CACHE_TTL_MS);
  const longTimeline = createTimelineRequestHandler("wazuh:timeline:long", WAZUH_SLOW_CACHE_TTL_MS);
  const getWazuhTimelineRequestHandler = (range: WazuhTimeRange) =>
    range === "7d" || range === "30d" ? longTimeline : timeline;
  const wazuhTopList = createIntegrationRequestHandler<
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
  const wazuhVulnerabilities = createIntegrationRequestHandler<
    WazuhVulnerabilityOverview,
    "wazuh",
    {
      cveLimit: number;
      agentLimit: number;
      cveOrder: WazuhCveOrder;
      minSeverity: "all" | "medium" | "high" | "critical";
    }
  >({
    cacheNamespace: "wazuh:vulnerabilities",
    cacheTtlMs: WAZUH_SLOW_CACHE_TTL_MS,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getVulnerabilitiesAsync(input);
    },
  });
  const wazuhFim = createIntegrationRequestHandler<
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
  const wazuhAuthFailures = createIntegrationRequestHandler<
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
  return {
    wazuhAgents,
    wazuhAlerts,
    wazuhSummary,
    wazuhTopList,
    wazuhVulnerabilities,
    wazuhFim,
    wazuhAuthFailures,
    getWazuhTimelineRequestHandler,
  };
};
