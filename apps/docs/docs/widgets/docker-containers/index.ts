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
      {
        name: "Containers to filter",
        description: "You can filter the containers by name. Use a comma to separate multiple values.",
        values: "Comma-separated list of container names",
        defaultValue: "-",
      },
      {
        name: "Filter as a whitelist",
        description:
          "If enabled, only containers that match the filter will be shown. If disabled, containers that match the filter will be hidden.",
        values: { type: "boolean" },
        defaultValue: "No",
      },
    ],
  },
};
