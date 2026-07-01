import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { DawarichPlace, DawarichStatistics } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const dawarichStatisticsRequestHandler = createCachedIntegrationRequestHandler<
  DawarichStatistics,
  "dawarich",
  Record<string, never>
>({
  async requestAsync(integration) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getStatisticsAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "dawarichStatistics",
});

export const dawarichPlacesRequestHandler = createCachedIntegrationRequestHandler<
  DawarichPlace[],
  "dawarich",
  Record<string, never>
>({
  async requestAsync(integration) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getPlacesAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "dawarichPlaces",
});
