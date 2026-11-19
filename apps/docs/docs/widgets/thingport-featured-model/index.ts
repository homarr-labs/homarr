import { WidgetDefinition } from "@site/src/types";
import { IconRotate360 } from "@tabler/icons-react";

export const thingportFeaturedModelWidget: WidgetDefinition = {
  icon: IconRotate360,
  name: "Thingport Featured Model",
  description: "Shows one model from your Thingport library each day, spinning in 3D.",
  path: "../../widgets/thingport-featured-model",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the Thingport logo and a title above the widget",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Spin the model",
        description: "Turns the model slowly on its own",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show model details",
        description: "Displays the model name, author, views and prints under the preview",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Open model in new tab",
        description: "Opens the model in Thingport in a new browser tab",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
