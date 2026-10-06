import { WidgetDefinition } from "@site/src/types";
import { IconChartAreaLine } from "@tabler/icons-react";

export const wazuhTimelineWidget: WidgetDefinition = {
  icon: IconChartAreaLine,
  name: "Wazuh Alerts Timeline",
  description: "Stacked chart of Wazuh alerts over time by severity.",
  path: "../../widgets/wazuh-timeline",
  configuration: {
    items: [
      {
        name: "Time range",
        description: "Period shown on the chart.",
        values: { type: "select", options: ["Last hour", "Last 24 hours", "Last 7 days", "Last 30 days"] },
        defaultValue: "Last 24 hours",
      },
      {
        name: "Interval",
        description: "Bucket size. Automatic picks a size that fits the range; the chart is capped at 400 buckets.",
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
        description: "Draw the severities as a stacked area or stacked bar chart.",
        values: { type: "select", options: ["Stacked area", "Stacked bars"] },
        defaultValue: "Stacked area",
      },
      {
        name: "Y axis scale",
        description: "Square root keeps high and critical alerts visible next to thousands of low ones.",
        values: { type: "select", options: ["Linear", "Square root"] },
        defaultValue: "Linear",
      },
      {
        name: "Minimum rule level",
        description: "Ignore alerts below this Wazuh rule level (0-16).",
        values: "Number (0-16)",
        defaultValue: "0",
      },
      {
        name: "Show legend with totals",
        description: "Show each severity with its total above the chart.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
