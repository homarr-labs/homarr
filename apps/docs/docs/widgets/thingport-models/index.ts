import { WidgetDefinition } from "@site/src/types";
import { IconCube3dSphere } from "@tabler/icons-react";

export const thingportModelsWidget: WidgetDefinition = {
  icon: IconCube3dSphere,
  name: "Thingport Models",
  description: "Lists recently added, most viewed and most printed models from Thingport.",
  path: "../../widgets/thingport-models",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the Thingport logo and a title above the widget",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Default tab",
        description: "Tab shown when the board loads",
        values: { type: "select", options: ["Recent", "Top viewed", "Top printed"] },
        defaultValue: "Recent",
      },
      {
        name: "Number of models",
        description: "Models listed per tab",
        values: "1-50",
        defaultValue: "10",
      },
      {
        name: "Show thumbnails",
        description: "Displays each model's preview image",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Open models in new tab",
        description: "Opens the model in Thingport in a new browser tab",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
