import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { BazarrBadges } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const bazarrBadgesRequestHandler = createCachedIntegrationRequestHandler<
  BazarrBadges,
  "bazarr",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getBadgesAsync();
  },
  cacheDuration: dayjs.duration(5, "minute"),
  queryKey: "bazarr-badges",
});
