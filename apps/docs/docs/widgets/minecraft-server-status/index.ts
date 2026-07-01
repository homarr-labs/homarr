import { WidgetDefinition } from "@site/src/types";
import { IconBrandMinecraft } from "@tabler/icons-react";

export const minecraftServerStatusWidget: WidgetDefinition = {
  icon: IconBrandMinecraft,
  name: "Minecraft Server Status",
  description: "Displays the status of a Minecraft server.",
  data: "Displays Minecraft server online status, player count, and server icon for Java and Bedrock editions.",
  path: "../../widgets/minecraft-server-status",
  configuration: {
    items: [
      {
        name: "Title",
        description: "Title to show on top. Leave empty to show server address.",
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Server address",
        description: "Public address of the Minecraft server",
        values: { type: "string" },
        defaultValue: "hypixel.net",
      },
      {
        name: "Bedrock server",
        description: "Wheter the server is a Bedrock server",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
