import type { WidgetUiAuditFamily } from "../types";

export const homeFamily = {
  id: "home",
  name: "Home automation and assistant",
  description: "Smart home state and actions, notes, and assistant surfaces.",
  kinds: ["smartHome-entityState", "smartHome-executeAutomation", "anchorNote", "assistant"],
} satisfies WidgetUiAuditFamily;
