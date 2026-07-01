import { WidgetDefinition } from "@site/src/types";
import { IconBusStop } from "@tabler/icons-react";

export const timetableWidget: WidgetDefinition = {
  icon: IconBusStop,
  name: "Timetable",
  description: "Displays departure times for a station.",
  data: "Displays Swiss public transport departure timetables with line, destination, delay, and platform info.",
  path: "../../widgets/timetable",
  configuration: {
    items: [
      {
        name: "Station",
        description: "Select the station",
        values: "List of station names",
        defaultValue: "-",
      },
    ],
  },
};
