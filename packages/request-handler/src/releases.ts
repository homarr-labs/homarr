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

    const parsedIdentifier = integrationInstance.parseIdentifier(input.identifier);
    if (!parsedIdentifier) {
      return {
        id: input.id,
        error: { code: "invalidIdentifier" },
      };
    }

    const releaseResponse = await integrationInstance.getLatestMatchingReleaseAsync(
      parsedIdentifier,
      input.versionRegex,
    );

    if (!releaseResponse) {
      return {
        id: input.id,
        error: { code: input.versionRegex ? "noMatchingVersion" : "noReleasesFound" },
      };
    }
    if ("code" in releaseResponse || "message" in releaseResponse) {
      return {
        id: input.id,
        error: releaseResponse,
      };
    }

    return {
      id: input.id,
      ...releaseResponse,
      integration: {
        name: integration.name,
        iconUrl: getIconUrl(integration.kind),
      },
    };
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "repositoriesReleases",
});
