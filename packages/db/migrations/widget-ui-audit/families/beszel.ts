import type { WidgetUiAuditFamily } from "../types";

export const beszelFamily = {
  id: "beszel",
  name: "Beszel monitoring",
  description: "Beszel systems, metrics, tables, and alert views.",
  kinds: ["beszelSystemTable", "beszelSystemGrid", "beszelAlerts", "beszelSystemStats"],
} satisfies WidgetUiAuditFamily;
