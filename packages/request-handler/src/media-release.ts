import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { MediaRelease } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaReleaseRequestHandler = createIntegrationRequestHandler<
  MediaRelease[],
  IntegrationKindByCategory<"mediaRelease">,
  Record<string, never>
>({
  cacheNamespace: "media-release:list",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getMediaReleasesAsync();
  },
  cacheTtlMs: 5 * 60 * 1000,
  fallbackToStaleOnError: true,
});
