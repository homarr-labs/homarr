import type { WidgetUiAuditFamily } from "../types";

export const mediaPlaybackFamily = {
  id: "media-playback",
  name: "Media and travel",
  description: "Audio, Minecraft status, public transit, and market data widgets.",
  kinds: ["audioStats", "minecraftServerStatus", "timetable", "stockPrice"],
} satisfies WidgetUiAuditFamily;
