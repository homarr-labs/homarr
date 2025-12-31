import { WidgetDefinition } from "@site/src/types";
import { IconRss } from "@tabler/icons-react";

export const rssFeedWidget: WidgetDefinition = {
  icon: IconRss,
  name: "RSS Feed",
  description: "Monitor and display one or more generic RSS, ATOM or JSON feeds.",
  path: "../../widgets/rss-feed",
  configuration: {
    items: [
      {
        name: "Feed URLs",
        description: (
          <span>
            A list of RSS feed URLs. They must conform to one of the following standards{" "}
            <a href="https://www.rssboard.org/rss-specification" target="_blank" referrerPolicy="no-referrer">
              RSS
            </a>
            ,{" "}
            <a href="https://datatracker.ietf.org/doc/html/rfc5023" target="_blank" referrerPolicy="no-referrer">
              ATOM
            </a>{" "}
            or{" "}
            <a href="https://www.jsonfeed.org/version/1.1/" target="_blank" referrerPolicy="no-referrer">
              JSON Feed
            </a>
            .
          </span>
        ),
        defaultValue: "Empty list",
        values: "List of URLs",
      },
      {
        name: "Enable RTL",
        description: "Enable right-to-left layout for feeds in such languages",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Description line clamp",
        description: "Maximum number of lines to show for the feed description",
        values: "1-50",
        defaultValue: "5",
      },
      {
        name: "Amount posts limit",
        description: "Maximum number of posts to show",
        values: "1-9999",
        defaultValue: "100",
      },
      {
        name: "Hide description",
        description: "Hide the description of individual feeds",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
