import type { WidgetUiAuditFamily } from "../types";

export const networkFamily = {
  id: "network",
  name: "Network controls",
  description: "DNS and network controller summaries and controls.",
  kinds: ["dnsHoleSummary", "dnsHoleControls", "networkControllerSummary", "networkControllerStatus"],
} satisfies WidgetUiAuditFamily;
