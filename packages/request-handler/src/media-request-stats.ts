import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { MediaRequestStats } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaRequestStatsRequestHandler = createIntegrationRequestHandler<
  MediaRequestStats,
  IntegrationKindByCategory<"mediaRequest">,
  Record<string, never>
>({
  cacheNamespace: "media-requests:stats",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const [stats, users] = await Promise.all([
      integrationInstance.getStatsAsync(),
      integrationInstance.getUsersAsync(),
    ]);
    return {
      stats,
      users,
    };
  },
  cacheTtlMs: 60_000,
  fallbackToStaleOnError: true,
});
