import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/create";
import type { ImmichAlbum, ImmichServerStats } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const immichStatsRequestHandler = createCachedIntegrationRequestHandler<
  ImmichServerStats,
  IntegrationKindByCategory<"photoService">,
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServerStatsAsync();
  },
  cacheDuration: dayjs.duration(15, "minute"),
  queryKey: "immich-server-stats",
});

export const immichAlbumsRequestHandler = createCachedIntegrationRequestHandler<
  {
    id: string;
    albumName: string;
    assetCount: number;
  }[],
  IntegrationKindByCategory<"photoService">,
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getAlbumsAsync();
  },
  cacheDuration: dayjs.duration(15, "minute"),
  queryKey: "immich-albums",
});

export const immichAlbumRequestHandler = createCachedIntegrationRequestHandler<
  ImmichAlbum,
  IntegrationKindByCategory<"photoService">,
  { albumId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getAlbumAsync(input.albumId);
  },
  cacheDuration: dayjs.duration(15, "minute"),
  queryKey: "immich-album",
});
