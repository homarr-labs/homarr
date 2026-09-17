import type { WidgetUiAuditFamily } from "../types";

export const utilityFamily = {
  id: "utility",
  name: "Utility and time",
  description: "Time, weather, focus, and daily planning widgets.",
  kinds: ["clock", "weather", "airQuality", "countdown", "timer"],
} satisfies WidgetUiAuditFamily;
