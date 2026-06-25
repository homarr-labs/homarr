import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { ArchiveTeamWarriorStatus } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const archiveTeamWarriorRequestHandler = createIntegrationRequestHandler<
  ArchiveTeamWarriorStatus,
  IntegrationKindByCategory<"archiving">,
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatusAsync();
  },
});
