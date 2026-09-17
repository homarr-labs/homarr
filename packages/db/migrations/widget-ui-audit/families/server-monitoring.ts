import type { WidgetUiAuditFamily } from "../types";

export const serverMonitoringFamily = {
  id: "server-monitoring",
  name: "Server monitoring",
  description: "Host health, resources, disks, containers, and deployment status.",
  kinds: ["dockerContainers", "coolify", "systemResources", "systemDisks", "healthMonitoring"],
} satisfies WidgetUiAuditFamily;
