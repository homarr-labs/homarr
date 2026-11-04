import { WidgetDefinition } from "@site/src/types";
import { IconCalendarStats } from "@tabler/icons-react";

export const thingportActivityHeatmapWidget: WidgetDefinition = {
  icon: IconCalendarStats,
  name: "Thingport Activity Heatmap",
  description: "Shows a year of your Thingport activity as a heatmap, like your Thingport profile.",
  path: "../../widgets/thingport-activity-heatmap",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the Thingport logo and a title above the widget",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "First day of the week",
        description: "The weekday each column starts on",
        values: { type: "select", options: ["Sunday", "Monday"] },
        defaultValue: "Sunday",
      },
      {
        name: "Show total",
        description: "Displays the number of activities in the shown period",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show legend",
        description: "Displays the less-to-more color scale",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
