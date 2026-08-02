import { WidgetDefinition } from "@site/src/types";
import { IconBusStop } from "@tabler/icons-react";

export const timetableWidget: WidgetDefinition = {
  icon: IconBusStop,
  name: "Timetable",
  description: "Displays departure times for a station.",
  path: "../../widgets/timetable",
  configuration: {
    items: [
      {
        name: "Search.ch URL",
        description: "Base URL for the Search.ch timetable API.",
        values: "An HTTP(S) URL that resolves to a public IP address.",
        defaultValue: "https://search.ch",
      },
      {
        name: "Station",
        description: "Select the station",
        values: "List of station names",
        defaultValue: "-",
      },
    ],
  },
};
