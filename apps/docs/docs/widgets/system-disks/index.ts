import { WidgetDefinition } from "@site/src/types";
import { IconServer2 } from "@tabler/icons-react";

export const systemDisksWidget: WidgetDefinition = {
  icon: IconServer2,
  name: "System disks",
  description: "Disk usage of your system",
  path: "../../widgets/system-disks",
  configuration: {
    items: [
      {
        name: "Show temperature if available",
        description: "Display disk temperature when the integration provides it",
        values: { type: "boolean" },
        defaultValue: "Yes",
      },
      {
        name: "Display mode",
        description: "How disk usage values are shown",
        values: {
          type: "select",
          options: ["Percentage (e.g., 76%)", "Absolute values (e.g., 800GB / 1TB)", "Free space percentage (e.g., 24% free)"],
        },
        defaultValue: "Percentage (e.g., 76%)",
      },
      {
        name: "Show background usage bar",
        description: "Fill the area below the usage value with a background bar",
        values: { type: "boolean" },
        defaultValue: "Yes",
      },
      {
        name: "Visible storage volumes",
        description:
          "Only available when all selected integrations are Synology. Leave empty to show all detected storage volumes.",
        values: "List of storage volumes",
        defaultValue: "All volumes",
      },
    ],
  },
};
