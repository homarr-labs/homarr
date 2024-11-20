import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const smartHomeEntityStateRequestHandler = createCachedIntegrationRequestHandler<
  string,
  IntegrationKindByCategory<"smartHomeServer">,
  { entityId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = integrationCreator(integration);
    const result = await integrationInstance.getEntityStateAsync(input.entityId);

    if (!result.success) {
      throw new Error("Unable to fetch data from Home Assistant");
    }

    return result.data.state;
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "smartHome-entityState",
});
