import { api, trpc } from "@homarr/api/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { Prefetch } from "../definition";

const logger = createLogger({ module: "rssFeedWidgetPrefetch" });

const prefetchRssFeedsAsync: Prefetch<"rssFeed"> = async (queryClient, items) => {
  for (const item of items) {
    const input = {
      urls: item.options.feedUrls,
      maximumAmountPosts: item.options.maximumAmountPosts,
    };

    const data = await api.widget.rssFeed.getFeeds(input);
    queryClient.setQueryData(trpc.widget.rssFeed.getFeeds.queryKey(input), data);
  }

  logger.info("Successfully prefetched RSS feeds", { count: items.length });
};

export default prefetchRssFeedsAsync;
