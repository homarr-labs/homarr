import { WidgetDefinition } from "@site/src/types";
import { IconMovie } from "@tabler/icons-react";

export const mediaMissingWidget: WidgetDefinition = {
  icon: IconMovie,
  name: "Media Missing & Queue",
  description: "Track missing media and active downloads from Radarr and Sonarr",
  path: "../../widgets/media-missing",
  configuration: {
    items: [
      {
        name: "Show Missing",
        description: "Display the missing media tab, listing movies or episodes not yet downloaded",
        values: { type: "boolean" },
        defaultValue: "true",
      },
      {
        name: "Show Queued",
        description: "Display the download queue tab with progress for each item",
        values: { type: "boolean" },
        defaultValue: "true",
      },
      {
        name: "Page Size",
        description: "Maximum number of items to fetch per integration",
        values: { type: "string" },
        defaultValue: "10",
      },
    ],
  },
};
