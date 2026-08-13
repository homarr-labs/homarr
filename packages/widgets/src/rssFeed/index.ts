import { IconRss, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

/**
 * Feed must conform to one of the following standards:
 * - https://www.rssboard.org/rss-specification (https://web.resource.org/rss/1.0/spec)
 * - https://datatracker.ietf.org/doc/html/rfc5023
 * - https://www.jsonfeed.org/version/1.1/
 */
export const { definition, componentLoader } = createWidgetDefinition("rssFeed", {
  supportsAdvancedFocus: true,
  icon: IconRss,
  queryKey: [["widget", "rssFeed", "getFeeds"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      urls: scope.options.feedUrls,
      maximumAmountPosts: scope.options.maximumAmountPosts,
    }),
  refetchInterval: null,
  errors: {
    BAD_GATEWAY: {
      icon: IconServerOff,
      message: (t) => t("widget.rssFeed.error.allFeedsFailed"),
    },
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      feedUrls: factory.multiText({
        defaultValue: [],
        validate: z.string().url(),
      }),
      enableRtl: factory.switch({
        defaultValue: false,
      }),
      textLinesClamp: factory.number({
        defaultValue: 5,
        validate: z.number().min(1).max(50),
      }),
      maximumAmountPosts: factory.number({
        defaultValue: 100,
        validate: z.number().min(1).max(9999),
      }),
      hideDescription: factory.switch({
        defaultValue: false,
      }),
      showPosterImage: factory.switch({
        defaultValue: false,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
