import { WidgetDefinition } from "@site/src/types";
import { IconPhoto } from "@tabler/icons-react";

export const immichAlbumCarouselWidget: WidgetDefinition = {
  icon: IconPhoto,
  name: "Immich Album",
  description: "Shows a slideshow of your album pictures from Immich",
  path: "../../widgets/immich-album-carousel",
  configuration: {
    items: [
      {
        name: "Album",
        description: "Select the Immich album to show in the slideshow.",
        values: { type: "string" },
        defaultValue: "",
      },
      {
        name: "Interval in seconds",
        description: "Rotate between pictures in the album every X seconds. Must be at least 1. Must be below 3600",
        values: { type: "string" },
        defaultValue: "",
      },
      {
        name: "Show photo info",
        description: "Display date of the picture and the current index at the bottom of the slideshow",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Randomize photos",
        description: "Show photos in a random order instead of always starting with the same album order.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
