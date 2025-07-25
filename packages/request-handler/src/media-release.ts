import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRelease } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const mediaReleaseRequestHandler = createCachedIntegrationRequestHandler<
  MediaRelease[],
  IntegrationKindByCategory<"mediaRelease">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getMediaReleasesAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "mediaReleases",
});
