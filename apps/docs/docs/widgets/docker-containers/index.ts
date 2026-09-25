import { WidgetDefinition } from "@site/src/types";
import { IconBrandDocker } from "@tabler/icons-react";

export const dockerContainersWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: "Containers",
  description: "Container and server statistics from Docker or Komodo",
  path: "../../widgets/docker-containers",
  configuration: {
    items: [
      {
        name: "View",
        description: "Select the container table or Komodo server overview",
        values: "Containers or Servers",
        defaultValue: "Containers",
      },
      {
        name: "Show Komodo summary",
        description: "Show compact server, stack, deployment, and problem counts above the selected view",
        values: { type: "boolean" },
        defaultValue: "Yes",
      },
      {
        name: "Summary sections",
        description: "Choose which Komodo counts are displayed in the compact summary",
        values: "Servers, stacks, deployments, and problems",
        defaultValue: "All sections",
      },
      {
        name: "Refresh interval",
        description: "How often Komodo data is refreshed, in seconds",
        values: "1 to 300 seconds",
        defaultValue: "30 seconds",
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
      {
        name: "Server columns",
        description: "Choose which metrics are visible in the Komodo server view",
        values: "CPU, memory, disk, load average, network, and version",
        defaultValue: "All columns",
      },
    ],
  },
};
