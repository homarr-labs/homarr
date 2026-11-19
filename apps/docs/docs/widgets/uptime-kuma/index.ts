import { WidgetDefinition } from "@site/src/types";
import { IconHeartbeat } from "@tabler/icons-react";

export const uptimeKumaWidget: WidgetDefinition = {
  icon: IconHeartbeat,
  name: "Uptime Kuma",
  description: "Displays the live status, heartbeats and uptime of the monitors on an Uptime Kuma status page.",
  path: "../../widgets/uptime-kuma",
  configuration: {
    items: [
      {
        name: "Show summary",
        description: "Displays the overall status, monitor counts and averages above the monitor list",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show incidents",
        description: "Displays pinned incidents and active maintenance from the status page",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Group monitors",
        description: "Groups monitors like the status page does",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Only show issues",
        description: "Hides monitors that are up. The advanced view still lists every monitor",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Sort monitors by",
        description: "Order of the monitors in the list",
        values: {
          type: "select",
          options: ["Status, issues first", "Status page order", "Name", "Uptime, lowest first"],
        },
        defaultValue: "Status, issues first",
      },
      {
        name: "Show heartbeat bar",
        description: "Displays recent checks as colored bars, newest on the right",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show 24-hour uptime",
        description: "Displays the uptime of each monitor and the average over all monitors",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show response time",
        description: "Displays the latest response time of each monitor",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Certificate warnings",
        description: "Flags certificates that expire within 14 days",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
