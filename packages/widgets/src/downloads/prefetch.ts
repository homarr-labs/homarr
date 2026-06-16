import { api, trpc } from "@homarr/api/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { Prefetch } from "../definition";

const logger = createLogger({ module: "downloadsWidgetPrefetch" });

const prefetchAllAsync: Prefetch<"downloads"> = async (queryClient, items) => {
  await Promise.all(
    items.map(async (item) => {
      if (item.integrationIds.length === 0) return;

      const input = {
        integrationIds: item.integrationIds,
        limitPerIntegration: Number(item.options.limitPerIntegration) || 50,
      };

      try {
        const data = await api.widget.downloads.getJobsAndStatuses(input);
        queryClient.setQueryData(trpc.widget.downloads.getJobsAndStatuses.queryKey(input), data);
        logger.info("Prefetched downloads widget data", { integrations: item.integrationIds.length });
      } catch (error) {
        logger.warn("Failed to prefetch downloads widget data", { error });
      }
    }),
  );
};

export default prefetchAllAsync;
