import { WidgetDefinition } from "@site/src/types";
import { IconApps } from "@tabler/icons-react";

export const appWidget: WidgetDefinition = {
  icon: IconApps,
  name: "App",
  description: "Embeds an app into the board.",
  path: "../../widgets/app",
  configuration: {
    items: [
      {
        name: "Choose app",
        description: "Select one of your created apps.",
        values: "App from your apps list",
        defaultValue: "-",
      },
      {
        name: "Docker container",
        description:
          "Adds a button to the tile that starts the container when it is stopped and stops it while it runs. Only admins see it.",
        values: "Container from your Docker endpoints",
        defaultValue: "-",
      },
      {
        name: "Open app in",
        description: "Choose where the app opens. Browser settings may override requests for a separate window.",
        values: { type: "select", options: ["Current tab", "New tab", "New window"] },
        defaultValue: "New tab",
      },
      {
        name: "Show app name",
        description: "Whether to show the name of the app on the widget.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Description display mode",
        description: "Choose how to display the app description",
        values: { type: "select", options: ["Within widget", "As tooltip", "Hidden"] },
        defaultValue: "Hidden",
      },
      {
        name: "Layout",
        description: "How to arrange the app widget.",
        values: {
          type: "select",
          options: ["Horizontal", "Horizontal (reversed)", "Vertical", "Vertical (reversed)"],
        },
        defaultValue: "Vertical",
      },
      {
        name: "Enable status check",
        description: "Whether to enable the status check for the app.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
