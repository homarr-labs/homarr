import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { ReleasesResponse } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const releasesRequestHandler = createCachedIntegrationRequestHandler<
  ReleasesResponse,
  IntegrationKindByCategory<"releasesProvider">,
  {
    id: string;
    identifier: string;
    versionRegex?: string;
  }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getReleaseAsync({
      id: input.id,
      identifier: input.identifier,
      versionRegex: input.versionRegex,
    });
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "repositoriesReleases",
});
