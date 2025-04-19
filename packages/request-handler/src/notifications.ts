import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { Notification } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const notificationsRequestHandler = createCachedIntegrationRequestHandler<
  Notification[],
  IntegrationKindByCategory<"notifications">,
  { topics: string[] }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getNotificationsAsync(input.topics);
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "notificationsJobStatus",
});
