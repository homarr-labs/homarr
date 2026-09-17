import type { WidgetUiAuditFamily } from "../types";

export const securityFamily = {
  id: "security",
  name: "Security and power",
  description: "Firewall, VPN, archive, and UPS status widgets.",
  kinds: ["firewall", "vpn", "archiveTeamWarrior", "ups"],
} satisfies WidgetUiAuditFamily;
