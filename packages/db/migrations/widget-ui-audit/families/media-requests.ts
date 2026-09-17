import type { WidgetUiAuditFamily } from "../types";

export const mediaRequestsFamily = {
  id: "media-requests",
  name: "Media requests",
  description: "Media server, calendar, download, and request widgets.",
  kinds: ["calendar", "downloads", "mediaRequests-requestList", "mediaRequests-requestStats", "mediaServer"],
} satisfies WidgetUiAuditFamily;
