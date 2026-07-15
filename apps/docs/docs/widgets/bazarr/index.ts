import { WidgetDefinition } from "@site/src/types";
import { IconBadgeCc } from "@tabler/icons-react";

export const bazarrWidget: WidgetDefinition = {
  icon: IconBadgeCc,
  name: "Bazarr",
  description: "Displays missing subtitle counts and health indicators from your Bazarr instance.",
  path: "../../widgets/bazarr",
  configuration: {
    items: [
      {
        name: "Show missing episodes",
        description: "Displays the number of episodes with missing subtitles",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show missing movies",
        description: "Displays the number of movies with missing subtitles",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show provider issues",
        description: "Displays the number of subtitle providers with issues",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show health issues",
        description: "Displays the number of Bazarr health issues",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
