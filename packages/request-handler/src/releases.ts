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
    const releaseResponse = await integrationInstance.getLatestMatchingReleaseAsync(
      input.identifier,
      input.versionRegex,
    );
    return {
      id: input.id,
      integration: {
        name: integration.name,
        iconUrl: getIconUrl(integration.kind),
      },
      ...releaseResponse,
    };
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "repositoriesReleases",
});
