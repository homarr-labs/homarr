import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const mediaServerRequestHandler = createCachedIntegrationRequestHandler<
  StreamSession[],
  IntegrationKindByCategory<"mediaService">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getCurrentSessionsAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "mediaServerSessions",
});
