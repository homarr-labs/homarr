import { WidgetDefinition } from "@site/src/types";
import { IconTable } from "@tabler/icons-react";

export const beszelSystemTableWidget: WidgetDefinition = {
  icon: IconTable,
  name: "Beszel Systems (Table)",
  description: "Table view of all Beszel-monitored systems with sortable columns and status indicators.",
  path: "../../widgets/beszel-system-table",
  configuration: {
    items: [
      {
        name: "Status filter",
        description: "Filter systems by their current status",
        values: {
          type: "select",
          options: ["All Systems", "Up", "Down", "Paused"],
        },
        defaultValue: "All Systems",
      },
      {
        name: "Sort by",
        description: "Default column to sort the table by",
        values: {
          type: "select",
          options: ["System", "CPU", "Memory", "Disk", "GPU", "Load Avg", "Net", "Temp", "Services", "Uptime", "Agent"],
        },
        defaultValue: "System",
      },
      {
        name: "Sort direction",
        description: "Default sort direction",
        values: {
          type: "select",
          options: ["Ascending", "Descending"],
        },
        defaultValue: "Ascending",
      },
      {
        name: "Show CPU",
        description: "Displays the CPU column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show memory",
        description: "Displays the memory column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show disk",
        description: "Displays the disk column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show GPU",
        description: "Displays the GPU column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show load average",
        description: "Displays the load average column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show network",
        description: "Displays the network column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show temperature",
        description: "Displays the temperature column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show battery",
        description: "Displays the battery column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show services",
        description: "Displays the services column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show uptime",
        description: "Displays the uptime column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show agent version",
        description: "Displays the agent version column",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
