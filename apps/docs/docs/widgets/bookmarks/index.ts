import { WidgetDefinition } from "@site/src/types";
import { IconBookmark } from "@tabler/icons-react";

export const bookmarksWidget: WidgetDefinition = {
  icon: IconBookmark,
  name: "Bookmarks",
  description: "Keeps useful links together",
  path: "../../widgets/bookmarks",
  configuration: {
    items: [
      {
        name: "Title",
        description: "Title shown on top of the widget.",
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Show widget title",
        description: "Hide the widget heading without clearing its saved text. Does not affect bookmark names.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Widget title size (px)",
        description: "Heading font size before preview or dashboard scaling. Does not resize bookmark names.",
        values: "8–32",
        defaultValue: "11",
      },
      {
        name: "Layout",
        description:
          "How bookmarks use the available widget space. Vertical keeps compact rows and stable title visibility.",
        values: { type: "select", options: ["Adaptive", "Vertical", "Horizontal", "Grid", "Compact grid", "Icons"] },
        defaultValue: "Adaptive",
      },
      {
        name: "Appearance",
        description: "Card surface style.",
        values: { type: "select", options: ["Soft", "Filled", "Outline", "Plain"] },
        defaultValue: "Soft",
      },
      {
        name: "Card spacing",
        description: "Space between bookmark cards. Horizontal, compact-grid, and icon-only layouts cap larger gaps.",
        values: { type: "select", options: ["Extra small", "Small", "Medium", "Large", "Extra large"] },
        defaultValue: "Extra small",
      },
      {
        name: "Hide bookmark names",
        description: "Whether to hide the title of the bookmark items.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Hide icons",
        description: "Whether to hide the icon of the bookmark items.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Hide hostnames",
        description: "Whether to hide the hostname of the bookmark items.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Open in new tab",
        description: "Whether to open the bookmark items in a new tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Expand cards to fill row",
        description: "Whether cards in an incomplete final row expand to use the remaining width.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Bookmarks",
        description: "URLs and existing Apps shown by the widget.",
        values: "Paste one or many URLs, or find an existing App. Drag to reorder.",
        defaultValue: "No bookmarks selected",
      },
    ],
  },
};
