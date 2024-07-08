import { z } from "@homarr/validation";
import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { IconRss } from "@tabler/icons-react";

/**
 * Feed must conform to one of the following standards:
 * - https://www.rssboard.org/rss-specification (https://web.resource.org/rss/1.0/spec)
 * - https://datatracker.ietf.org/doc/html/rfc5023
 * - https://www.jsonfeed.org/version/1.1/
 */
export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("rssFeed", {
  icon: IconRss,
  options: optionsBuilder.from(
    (factory) => ({
      feedUrls: factory.multiText({
        defaultValue: []
      }),
      sanitizeContent: factory.switch({
        defaultValue: true
      }),
      textLinesClamp: factory.number({
        defaultValue: 5,
        validate: z.number().min(1).max(50)
      }),
      maximumAmountPosts: factory.number({
        defaultValue: 100,
        validate: z.number().min(1).max(9999)
      })
    }),
  ),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
