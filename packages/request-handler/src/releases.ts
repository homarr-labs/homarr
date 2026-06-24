import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { ReleaseResponse, ReleasesRepository } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const releasesRequestHandler = createIntegrationRequestHandler<
  ReleaseResponse,
  IntegrationKindByCategory<"releasesProvider">,
  ReleasesRepository
>({
  requestAsync: async (integration, input) => {
    const instance = await createIntegrationAsync(integration);
    return instance.getLatestMatchingReleaseAsync(input.identifier, input.versionRegex);
  },
  queryKey: "repositoriesReleases",
});
