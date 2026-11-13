import type { WidgetDefinition } from "@site/src/types";
import { IconPhoto } from "@tabler/icons-react";

export const frameleafAlbumWidget: WidgetDefinition = {
  icon: IconPhoto,
  name: "Frameleaf album",
  description: "Show private photos and a scoped count from a selected Frameleaf album.",
  path: "../../widgets/frameleaf-album",
  configuration: {
    items: [
      {
        name: "Album",
        description: "An album authorized through Frameleaf Connect.",
        values: { type: "string" },
        defaultValue: "Not selected",
      },
    ],
  },
};
