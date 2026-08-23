import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { ImmichAlbum, ImmichServerStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const immichStatsRequestHandler = createIntegrationRequestHandler<
  ImmichServerStats,
  IntegrationKindByCategory<"photoService">,
  Record<string, never>
>({
  cacheNamespace: "immich:server-stats",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServerStatsAsync();
  },
});

export const immichAlbumsRequestHandler = createIntegrationRequestHandler<
  {
    id: string;
    albumName: string;
    assetCount: number;
  }[],
  IntegrationKindByCategory<"photoService">,
  { limit?: number }
>({
  cacheNamespace: "immich:albums",
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const albums = await integrationInstance.getAlbumsAsync();

    if (input.limit === undefined) return albums;

    return albums
      .toSorted(
        (left, right) =>
          right.assetCount - left.assetCount ||
          compareText(left.albumName, right.albumName) ||
          compareText(left.id, right.id),
      )
      .slice(0, input.limit);
  },
});

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

export const immichAlbumRequestHandler = createIntegrationRequestHandler<
  ImmichAlbum,
  IntegrationKindByCategory<"photoService">,
  { albumId?: string }
>({
  cacheNamespace: "immich:album",
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getAlbumAsync(input.albumId);
  },
});
