import type { WidgetUiAuditFamily } from "../types";

export const observabilityFamily = {
  id: "observability",
  name: "Observability and activity",
  description: "Notifications, streaming activity, speed tests, uptime, and analytics.",
  kinds: ["notifications", "tracearr", "speedtestTracker", "uptimeKuma", "umami"],
} satisfies WidgetUiAuditFamily;
