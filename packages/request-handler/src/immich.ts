import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { ImmichAlbum, ImmichServerStats } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const immichStatsRequestHandler = createIntegrationRequestHandler<
  ImmichServerStats,
  IntegrationKindByCategory<"photoService">,
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServerStatsAsync();
  },
  cacheTtlMs: 900_000,
});

export const immichAlbumsRequestHandler = createIntegrationRequestHandler<
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
  cacheTtlMs: 900_000,
});

export const immichAlbumRequestHandler = createIntegrationRequestHandler<
  ImmichAlbum,
  IntegrationKindByCategory<"photoService">,
  { albumId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getAlbumAsync(input.albumId);
  },
  cacheTtlMs: 900_000,
});
