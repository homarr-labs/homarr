import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRequest } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const mediaRequestListRequestHandler = createCachedIntegrationRequestHandler<
  MediaRequest[],
  IntegrationKindByCategory<"mediaRequest">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getRequestsAsync();
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "mediaRequestList",
});
