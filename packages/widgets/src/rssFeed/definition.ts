import { IconRss, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { WidgetDefinition } from "../definition";
import { widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "rssFeed",
  supportsAdvancedFocus: true,
  icon: IconRss,
  queryKey: [["widget", "rssFeed", "getFeeds"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      urls: scope.options.feedUrls,
      maximumAmountPosts: scope.options.maximumAmountPosts,
      descriptionMaxLength: scope.options.descriptionMaxLength,
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
      descriptionMaxLength: factory.number({
        defaultValue: 250,
        validate: z.number().int().min(1).max(5000),
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
} satisfies WidgetDefinition & { kind: "rssFeed" };
