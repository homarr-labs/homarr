import { WidgetDefinition } from "@site/src/types";
import { IconShieldHalfFilled } from "@tabler/icons-react";

const timeRanges = ["Last hour", "Last 24 hours", "Last 7 days", "Last 30 days"];

export const wazuhWidget: WidgetDefinition = {
  icon: IconShieldHalfFilled,
  name: "Wazuh",
  description:
    "Wazuh security overview with tabs for severity, alerts, timeline, top lists, agents, vulnerabilities, file integrity and authentication failures.",
  path: "../../widgets/wazuh",
  configuration: {
    items: [
      {
        name: "Visible tabs",
        description:
          "Tabs offered in the switcher. With a single tab the switcher is hidden, so the widget shows only that view.",
        values: {
          type: "select",
          options: [
            "Severity",
            "Timeline",
            "Top lists",
            "Agents",
            "Vulnerabilities",
            "File integrity",
            "Auth failures",
          ],
        },
        defaultValue: "All",
      },
      {
        name: "Time range",
        description: "Period used by every tab except agents and vulnerabilities.",
        values: { type: "select", options: timeRanges },
        defaultValue: "Last 24 hours",
      },
      {
        name: "Minimum rule level (timeline and top lists)",
        description: "Ignore alerts below this Wazuh rule level.",
        values: "0-16",
        defaultValue: "0",
      },
      {
        name: "Show trend against the previous period",
        description: "Severity tab: show the change against the period right before the selected one.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show footer",
        description: "Severity tab: show the previous total, the highest rule level and the indexer health.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Alerts: minimum rule level",
        description: "Alerts tab: only list alerts at or above this Wazuh rule level.",
        values: "0-16",
        defaultValue: "7",
      },
      {
        name: "Alerts: number of alerts",
        description: "Alerts tab: number of alerts listed.",
        values: "1-100",
        defaultValue: "25",
      },
      {
        name: "Show MITRE ATT&CK techniques",
        description: "Alerts tab: show technique tags on each alert.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show agent",
        description: "Alerts tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show source IP",
        description: "Alerts tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show rule ID",
        description: "Alerts tab.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Interval",
        description: "Timeline tab: bucket size of the chart. Automatic picks one from the time range.",
        values: {
          type: "select",
          options: [
            "Automatic",
            "1 minute",
            "5 minutes",
            "15 minutes",
            "30 minutes",
            "1 hour",
            "3 hours",
            "6 hours",
            "12 hours",
            "1 day",
          ],
        },
        defaultValue: "Automatic",
      },
      {
        name: "Chart type",
        description: "Timeline tab: stacked area or stacked bars.",
        values: { type: "select", options: ["Stacked area", "Stacked bars"] },
        defaultValue: "Stacked area",
      },
      {
        name: "Y axis scale",
        description: "Timeline tab: square root keeps high and critical alerts visible next to thousands of low ones.",
        values: { type: "select", options: ["Linear", "Square root"] },
        defaultValue: "Linear",
      },
      {
        name: "Show legend with totals",
        description: "Timeline tab: show the totals per severity under the chart.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Rank",
        description: "Top lists tab: what to rank by alert count.",
        values: {
          type: "select",
          options: [
            "Top rules",
            "Top agents by alerts",
            "Top source IPs",
            "Top MITRE ATT&CK tactics",
            "Top MITRE ATT&CK techniques",
          ],
        },
        defaultValue: "Top rules",
      },
      {
        name: "Top list entries",
        description: "Top lists tab: number of entries.",
        values: "1-50",
        defaultValue: "8",
      },
      {
        name: "Show bars",
        description: "Top lists tab: show a bar per entry.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show agents",
        description: "Agents tab: the status filter applied when the board loads. The status tiles toggle it.",
        values: { type: "select", options: ["All agents", "Active", "Disconnected", "Not active"] },
        defaultValue: "All agents",
      },
      {
        name: "Sort by",
        description:
          "Agents tab: initial sort column. Click a column header to sort, drag headers to reorder and drag edges to resize; the layout is saved with the widget.",
        values: {
          type: "select",
          options: ["Status", "Name", "IP address", "Operating system", "Wazuh version", "Last keepalive"],
        },
        defaultValue: "Status",
      },
      {
        name: "Agents: show Wazuh version column",
        description: "Agents tab: outdated agents are highlighted.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Agents: show groups column",
        description: "Agents tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Rank CVEs by",
        description: "Vulnerabilities tab.",
        values: { type: "select", options: ["Highest score", "Most affected agents"] },
        defaultValue: "Highest score",
      },
      {
        name: "CVE severity",
        description: "Vulnerabilities tab: lowest severity listed.",
        values: { type: "select", options: ["All severities", "Medium and above", "High and above", "Critical only"] },
        defaultValue: "All severities",
      },
      {
        name: "Number of CVEs",
        description: "Vulnerabilities tab: CVEs listed.",
        values: "1-50",
        defaultValue: "8",
      },
      {
        name: "Number of agents",
        description: "Vulnerabilities tab: most vulnerable agents listed.",
        values: "1-50",
        defaultValue: "5",
      },
      {
        name: "Show most vulnerable agents",
        description: "Vulnerabilities tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Events",
        description: "File integrity tab: which syscheck events to list.",
        values: { type: "select", options: ["All events", "Added", "Modified", "Deleted"] },
        defaultValue: "All events",
      },
      {
        name: "File integrity events",
        description: "File integrity tab: number of events.",
        values: "1-100",
        defaultValue: "20",
      },
      {
        name: "Include Windows registry events",
        description: "File integrity tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Authentication failure agents",
        description: "Auth failures tab: number of agents listed.",
        values: "1-25",
        defaultValue: "6",
      },
      {
        name: "Show top source IPs",
        description: "Auth failures tab.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
