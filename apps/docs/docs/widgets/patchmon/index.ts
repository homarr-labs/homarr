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
        name: "Show compliance hero",
        description: "Display a compliance ring showing the percentage of up-to-date hosts",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
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
      {
        name: "Enable threshold colors",
        description: "Colors stat values green, yellow, or red based on built-in severity presets",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Advanced thresholds",
        description: "Customize warning and critical thresholds per stat (absolute count or % of total hosts)",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Needs updates threshold mode",
        description:
          "Compare the needs-updates count as an absolute value or percentage of total hosts. Shown when threshold colors and advanced thresholds are enabled.",
        values: { type: "select", options: ["Absolute count", "Percent of total hosts"] },
        defaultValue: "Absolute count",
      },
      {
        name: "Needs updates warning threshold",
        description: "Enter yellow when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "1",
      },
      {
        name: "Needs updates critical threshold",
        description: "Enter red when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "5",
      },
      {
        name: "Security updates threshold mode",
        description:
          "Compare the security-updates count as an absolute value or percentage of total hosts. Shown when threshold colors and advanced thresholds are enabled.",
        values: { type: "select", options: ["Absolute count", "Percent of total hosts"] },
        defaultValue: "Absolute count",
      },
      {
        name: "Security updates warning threshold",
        description: "Enter yellow when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "1",
      },
      {
        name: "Security updates critical threshold",
        description: "Enter red when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "10",
      },
      {
        name: "Hosts with security updates threshold mode",
        description:
          "Compare the host count as an absolute value or percentage of total hosts. Shown when threshold colors and advanced thresholds are enabled.",
        values: { type: "select", options: ["Absolute count", "Percent of total hosts"] },
        defaultValue: "Absolute count",
      },
      {
        name: "Hosts with security updates warning threshold",
        description: "Enter yellow when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "1",
      },
      {
        name: "Hosts with security updates critical threshold",
        description: "Enter red when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "1",
      },
      {
        name: "Up-to-date hosts threshold mode",
        description:
          "Compare the up-to-date host count as an absolute value or percentage of total hosts. Shown when threshold colors and advanced thresholds are enabled.",
        values: { type: "select", options: ["Absolute count", "Percent of total hosts"] },
        defaultValue: "Percent of total hosts",
      },
      {
        name: "Up-to-date hosts warning threshold",
        description: "Enter yellow when the value is at or above this threshold but below full coverage",
        values: "Integer ≥ 0",
        defaultValue: "90",
      },
      {
        name: "Up-to-date hosts critical threshold",
        description: "Enter red when the value falls below this threshold",
        values: "Integer ≥ 0",
        defaultValue: "90",
      },
      {
        name: "Outdated packages threshold mode",
        description:
          "Compare the outdated-packages count as an absolute value or percentage of total hosts. Shown when threshold colors, advanced thresholds, and Show outdated packages are enabled.",
        values: { type: "select", options: ["Absolute count", "Percent of total hosts"] },
        defaultValue: "Absolute count",
      },
      {
        name: "Outdated packages warning threshold",
        description: "Enter yellow when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "1",
      },
      {
        name: "Outdated packages critical threshold",
        description: "Enter red when the value reaches this threshold",
        values: "Integer ≥ 0",
        defaultValue: "50",
      },
      {
        name: "Show OS distribution",
        description: "Displays a horizontal bar breakdown of monitored hosts by operating system",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "OS display mode",
        description:
          "Choose how to display the operating system distribution. Shown when Show OS distribution is enabled.",
        values: { type: "select", options: ["Horizontal bars", "Donut chart"] },
        defaultValue: "Horizontal bars",
      },
      {
        name: "OS distribution limit",
        description: "Maximum number of operating systems to display in the distribution section",
        values: { type: "select", options: ["Top 3", "Top 5", "Top 10", "All"] },
        defaultValue: "All",
      },
      {
        name: "Show OS version",
        description: "Append the OS version to each distribution label when available",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
