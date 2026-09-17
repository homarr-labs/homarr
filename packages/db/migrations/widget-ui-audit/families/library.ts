import type { WidgetUiAuditFamily } from "../types";

export const libraryFamily = {
  id: "library",
  name: "Library and maintenance",
  description: "Immich, Paperless, PatchMon, and subtitle maintenance widgets.",
  kinds: ["immich-serverStats", "immich-albumCarousel", "paperlessNgx", "patchmon", "bazarr"],
} satisfies WidgetUiAuditFamily;
