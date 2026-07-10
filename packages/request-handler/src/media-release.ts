import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRelease } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaReleaseRequestHandler = createIntegrationRequestHandler<
  MediaRelease[],
  IntegrationKindByCategory<"mediaRelease">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getMediaReleasesAsync();
  },
});
