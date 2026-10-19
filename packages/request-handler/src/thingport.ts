import { createIntegrationAsync } from "@homarr/integrations/factory";
import type {
  ThingportActivity,
  ThingportFeaturedModel,
  ThingportLibraryStats,
  ThingportModel,
  ThingportModelList,
} from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const thingportLibraryStatsRequestHandler = createIntegrationRequestHandler<
  ThingportLibraryStats,
  "thingport",
  Record<string, never>
>({
  cacheNamespace: "thingport:library-stats",
  async requestAsync(integration, _input, signal) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getLibraryStatsAsync(signal);
  },
});

export const thingportModelsRequestHandler = createIntegrationRequestHandler<
  ThingportModel[],
  "thingport",
  { list: ThingportModelList; limit: number }
>({
  cacheNamespace: "thingport:models",
  async requestAsync(integration, input, signal) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getModelsAsync(input.list, input.limit, signal);
  },
});

export const thingportFeaturedModelRequestHandler = createIntegrationRequestHandler<
  ThingportFeaturedModel | null,
  "thingport",
  { date: string }
>({
  cacheNamespace: "thingport:featured-model",
  // The pick only changes with the date, which is part of the cache key.
  cacheTtlMs: 60 * 60 * 1000,
  async requestAsync(integration, input, signal) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFeaturedModelAsync(input.date, signal);
  },
});

export const thingportActivityRequestHandler = createIntegrationRequestHandler<
  ThingportActivity,
  "thingport",
  { from: string; to: string; timeZone: string }
>({
  cacheNamespace: "thingport:activity",
  cacheTtlMs: 5 * 60 * 1000,
  async requestAsync(integration, input, signal) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getActivityAsync(input.from, input.to, input.timeZone, signal);
  },
});
