import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";
import type { ReleasesResponse } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

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
    const response = await integrationInstance.getLatestMatchingReleaseAsync({
      id: input.id,
      identifier: input.identifier,
      versionRegex: input.versionRegex,
    });

    return {
      ...response,
      integration: {
        name: integration.name,
        iconUrl: getIconUrl(integration.kind),
      },
    };
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "repositoriesReleases",
});
