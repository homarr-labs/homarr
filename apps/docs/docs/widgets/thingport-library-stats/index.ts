import { WidgetDefinition } from "@site/src/types";
import { IconCube } from "@tabler/icons-react";

export const thingportLibraryStatsWidget: WidgetDefinition = {
  icon: IconCube,
  name: "Thingport Library Stats",
  description: "Displays model, collection, category and author totals from Thingport.",
  path: "../../widgets/thingport-library-stats",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the Thingport logo and a title above the widget",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show models",
        description: "Displays the number of models",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show collections",
        description: "Displays the number of collections",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show categories",
        description: "Displays the number of categories",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show authors",
        description: "Displays the number of authors",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Open links in new tab",
        description: "Opens Thingport in a new browser tab when a total is selected",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
