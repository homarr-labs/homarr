
import { createIntegrationAsync } from "@homarr/integrations";
import type { UmamiEventSeries, UmamiMetricItem, UmamiVisitorStats } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const umamiRequestHandler = createIntegrationRequestHandler<
  UmamiVisitorStats,
  "umami",
  { websiteId: string; timeFrame: string; eventName?: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getVisitorStatsAsync(input.websiteId, input.timeFrame, input.eventName);
  },
  queryKey: "umamiVisitorStats",
});

export const umamiEventNamesRequestHandler = createIntegrationRequestHandler<
  string[],
  "umami",
  { websiteId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getEventNamesAsync(input.websiteId);
  },
  queryKey: "umamiEventNames",
});

export const umamiTopPagesRequestHandler = createIntegrationRequestHandler<
  UmamiMetricItem[],
  "umami",
  { websiteId: string; timeFrame: string; limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getTopPagesAsync(input.websiteId, input.timeFrame, input.limit);
  },
  queryKey: "umamiTopPages",
});

export const umamiTopReferrersRequestHandler = createIntegrationRequestHandler<
  UmamiMetricItem[],
  "umami",
  { websiteId: string; timeFrame: string; limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getTopReferrersAsync(input.websiteId, input.timeFrame, input.limit);
  },
  queryKey: "umamiTopReferrers",
});

export const umamiMultiEventRequestHandler = createIntegrationRequestHandler<
  UmamiEventSeries[],
  "umami",
  { websiteId: string; timeFrame: string; eventNames: string[] }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getMultiEventTimeSeriesAsync(input.websiteId, input.timeFrame, input.eventNames);
  },
  queryKey: "umamiMultiEvent",
});

export const umamiActiveVisitorsRequestHandler = createIntegrationRequestHandler<
  number,
  "umami",
  { websiteId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getActiveVisitorsAsync(input.websiteId);
  },
  queryKey: "umamiActiveVisitors",
});
