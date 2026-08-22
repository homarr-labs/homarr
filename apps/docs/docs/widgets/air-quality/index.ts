import type { WidgetDefinition } from "@site/src/types";
import { IconWind } from "@tabler/icons-react";

export const airQualityWidget: WidgetDefinition = {
  icon: IconWind,
  name: "Air Quality & UV",
  description: "Displays air quality, ultraviolet index, pollutants and pollen for a location.",
  path: "../../widgets/air-quality",
  configuration: {
    items: [
      {
        name: "Air quality location",
        description: "Location used for air quality, UV and pollen data",
        values: "Select a location through search or longitude/latitude",
        defaultValue: "Paris / 48.85341, 2.3488",
      },
      {
        name: "AQI standard",
        description: "Choose the European or US air quality scale, or select one from the viewer's locale",
        values: { type: "select", options: ["Automatic for locale", "European AQI", "US AQI"] },
        defaultValue: "Automatic for locale",
      },
      {
        name: "Show UV index",
        description: "Display the current UV index and its forecast",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show pollutant concentrations",
        description: "Display particulate matter and gaseous pollutant concentrations",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show pollen concentrations",
        description: "Display available pollen concentrations",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
