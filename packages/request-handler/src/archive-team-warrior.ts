import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { ArchiveTeamWarriorStatus } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const archiveTeamWarriorRequestHandler = createCachedIntegrationRequestHandler<
  ArchiveTeamWarriorStatus,
  IntegrationKindByCategory<"archiving">,
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getStatusAsync();
  },
  cacheDuration: dayjs.duration(5, "minute"),
  queryKey: "archiveTeamWarriorStatus",
});
