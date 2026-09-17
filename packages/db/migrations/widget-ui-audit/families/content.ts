import type { WidgetUiAuditFamily } from "../types";

export const contentFamily = {
  id: "content",
  name: "Content and embeds",
  description: "Feeds, bookmarks, embedded pages, video, and notes.",
  kinds: ["rssFeed", "bookmarks", "iframe", "video", "notebook"],
} satisfies WidgetUiAuditFamily;
