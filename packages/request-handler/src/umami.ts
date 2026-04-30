import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { UmamiEventSeries, UmamiMetricItem, UmamiVisitorStats } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const umamiRequestHandler = createCachedIntegrationRequestHandler<
  UmamiVisitorStats,
  "umami",
  { websiteId: string; timeFrame: string; eventName?: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getVisitorStatsAsync(input.websiteId, input.timeFrame, input.eventName);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "umamiVisitorStats",
});

export const umamiEventNamesRequestHandler = createCachedIntegrationRequestHandler<
  string[],
  "umami",
  { websiteId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getEventNamesAsync(input.websiteId);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "umamiEventNames",
});

export const umamiTopPagesRequestHandler = createCachedIntegrationRequestHandler<
  UmamiMetricItem[],
  "umami",
  { websiteId: string; timeFrame: string; limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getTopPagesAsync(input.websiteId, input.timeFrame, input.limit);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "umamiTopPages",
});

export const umamiTopReferrersRequestHandler = createCachedIntegrationRequestHandler<
  UmamiMetricItem[],
  "umami",
  { websiteId: string; timeFrame: string; limit: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getTopReferrersAsync(input.websiteId, input.timeFrame, input.limit);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "umamiTopReferrers",
});

export const umamiMultiEventRequestHandler = createCachedIntegrationRequestHandler<
  UmamiEventSeries[],
  "umami",
  { websiteId: string; timeFrame: string; eventNames: string[] }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getMultiEventTimeSeriesAsync(input.websiteId, input.timeFrame, input.eventNames);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "umamiMultiEvent",
});

export const umamiActiveVisitorsRequestHandler = createCachedIntegrationRequestHandler<
  number,
  "umami",
  { websiteId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getActiveVisitorsAsync(input.websiteId);
  },
  cacheDuration: dayjs.duration(30, "seconds"),
  queryKey: "umamiActiveVisitors",
});
