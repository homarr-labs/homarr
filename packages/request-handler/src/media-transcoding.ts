import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";

import type { TdarrQueue } from "../../integrations/src/interfaces/media-transcoding/queue";
import type { TdarrStatistics } from "../../integrations/src/interfaces/media-transcoding/statistics";
import type { TdarrWorker } from "../../integrations/src/interfaces/media-transcoding/workers";
import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const mediaTranscodingRequestHandler = createCachedIntegrationRequestHandler<
  { queue: TdarrQueue; workers: TdarrWorker[]; statistics: TdarrStatistics },
  IntegrationKindByCategory<"mediaTranscoding">,
  { pageOffset: number; pageSize: number }
>({
  queryKey: "mediaTranscoding",
  cacheDuration: dayjs.duration(5, "minutes"),
  async requestAsync(integration, input) {
    const integrationInstance = integrationCreator(integration);
    return {
      queue: await integrationInstance.getQueueAsync(input.pageOffset, input.pageSize),
      workers: await integrationInstance.getWorkersAsync(),
      statistics: await integrationInstance.getStatisticsAsync(),
    };
  },
});
