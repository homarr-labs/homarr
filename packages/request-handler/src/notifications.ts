import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { Notification } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations/factory";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const notificationsRequestHandler = createIntegrationRequestHandler<
  Notification[],
  IntegrationKindByCategory<"notifications">,
  Record<string, never>
>({
  cacheNamespace: "notifications:list",
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getNotificationsAsync();
  },
});
