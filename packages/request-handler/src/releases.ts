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
  // Type '{ id: string; error: { code: "invalidIdentifier"; message?: undefined; }; }' is missing the following properties from type 'ReleaseProviderResponse':
  // latestRelease, latestReleaseAt
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);

    const parsedIdentifier = integrationInstance.parseIdentifier(input.identifier);
    if (!parsedIdentifier) {
      return {
        id: input.id,
        error: { code: "invalidIdentifier" },
      };
    }

    const latestRelease = await integrationInstance.getLatestMatchingReleaseAsync(parsedIdentifier, input.versionRegex);

    if (!latestRelease && input.versionRegex) {
      return {
        id: input.id,
        error: { code: "noMatchingVersion" },
      };
    }
    if (!latestRelease) {
      return {
        id: input.id,
        error: { code: "noReleasesFound" },
      };
    }
    if ("code" in latestRelease) {
      return {
        id: input.id,
        error: { code: latestRelease.code },
      };
    }
    if ("message" in latestRelease) {
      return {
        id: input.id,
        error: { message: latestRelease.message },
      };
    }

    return {
      id: input.id,
      ...latestRelease,
      integration: {
        name: integration.name,
        iconUrl: getIconUrl(integration.kind),
      },
    };
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "repositoriesReleases",
});
