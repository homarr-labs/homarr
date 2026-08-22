import { WidgetDefinition } from "@site/src/types";
import { IconBrandDocker } from "@tabler/icons-react";

export const dockerContainersWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: "Docker stats",
  description: "Stats of your containers",
  path: "../../widgets/docker-containers",
  configuration: {
    items: [
      {
        name: "Docker environments",
        description: "Select one or more automatically discovered Docker environments, or leave empty to show all",
        values: "Any Docker socket or host configured for Homarr",
        defaultValue: "All Docker environments",
      },
      {
        name: "Columns to show",
        description: "Select which columns are visible in the table",
        values: "Name, State, Host, CPU usage, Memory usage, and Actions",
        defaultValue: "All columns",
      },
      {
        name: "Enable items sorting",
        description: "Allows to sort containers by clicking on the column headers",
        values: { type: "boolean" },
        defaultValue: "No",
      },
      {
        name: "Column used for sorting by default",
        description: "Select which column to use for sorting the containers when the widget is loaded",
        values: {
          type: "select",
          options: ["Name", "State", "CPU usage", "Memory usage"],
        },
        defaultValue: "Name",
      },
      {
        name: "Invert sorting",
        description: "Invert the sorting order (ascending / descending) for the default sorting column",
        values: { type: "boolean" },
        defaultValue: "No",
      },
    ],
  },
};
