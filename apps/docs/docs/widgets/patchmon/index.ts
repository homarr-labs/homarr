import { WidgetDefinition } from "@site/src/types";
import { IconShieldCheck } from "@tabler/icons-react";

export const patchmonWidget: WidgetDefinition = {
  icon: IconShieldCheck,
  name: "PatchMon",
  description:
    "Displays host patch statistics including total hosts, hosts needing updates, and security update counts.",
  path: "../../widgets/patchmon",
  configuration: {
    items: [
      {
        name: "Show total hosts",
        description: "Displays the total number of monitored hosts",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show hosts needing updates",
        description: "Displays hosts with at least one outdated package",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show security updates",
        description: "Displays the total number of security updates available",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show up-to-date hosts",
        description: "Displays hosts with zero outdated packages",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show hosts with security updates",
        description: "Displays hosts requiring security patches",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show recent updates (24h)",
        description: "Displays the number of updates applied in the last 24 hours",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show outdated packages",
        description: "Displays the total number of outdated packages across all hosts",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show repositories",
        description: "Displays the number of active repositories being monitored",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
