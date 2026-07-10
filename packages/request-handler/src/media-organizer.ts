import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { IMediaOrganizerIntegration, MissingMediaItem, QueuedMediaItem } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

interface MediaOrganizerData {
  missing: MissingMediaItem[];
  missingCount: number;
  queued: QueuedMediaItem[];
  queuedCount: number;
}

export const mediaOrganizerRequestHandler = createIntegrationRequestHandler<
  MediaOrganizerData,
  IntegrationKindByCategory<"mediaOrganizer">,
  { pageSize: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = (await createIntegrationAsync(integration)) as unknown as IMediaOrganizerIntegration;
    const [missingResult, queueResult] = await Promise.all([
      integrationInstance.getMissingAsync(input.pageSize),
      integrationInstance.getMediaQueueAsync(input.pageSize),
    ]);
    return {
      missing: missingResult.items,
      missingCount: missingResult.totalCount,
      queued: queueResult.items,
      queuedCount: queueResult.totalCount,
    };
  },
  cacheTtlMs: 60_000,
});
