import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { TdarrQueue, TdarrStatistics, TdarrWorker } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaTranscodingRequestHandler = createIntegrationRequestHandler<
  MediaTranscoding,
  IntegrationKindByCategory<"mediaTranscoding">,
  { pageOffset: number; pageSize: number }
>({
  cacheNamespace: "media-transcoding:summary",
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const [queue, workers, statistics] = await Promise.all([
      integrationInstance.getQueueAsync(input.pageOffset, input.pageSize),
      integrationInstance.getWorkersAsync(),
      integrationInstance.getStatisticsAsync(),
    ]);
    return {
      queue,
      workers,
      statistics,
    };
  },
});

export interface MediaTranscoding {
  queue: TdarrQueue;
  workers: TdarrWorker[];
  statistics: TdarrStatistics;
}
