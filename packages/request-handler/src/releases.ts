import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { LatestReleaseResponse } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const releasesRequestHandler = createCachedIntegrationRequestHandler<
  LatestReleaseResponse,
  IntegrationKindByCategory<"releasesProvider">,
  {
    id: string;
    identifier: string;
    versionRegex?: string;
  }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getLatestMatchingReleaseAsync(input.identifier, input.versionRegex);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "repositoriesReleases",
});
