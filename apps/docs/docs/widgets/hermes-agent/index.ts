import type { WidgetDefinition } from "@site/src/types";
import { IconRobot } from "@tabler/icons-react";

export const hermesAgentWidget: WidgetDefinition = {
  icon: IconRobot,
  name: "Hermes Agent",
  description: "Responsive Hermes Agent gateway, activity, automation, and update overview.",
  path: "/docs/widgets/hermes-agent",
  configuration: {
    items: [
      {
        name: "Hermes theme colors",
        description: "Use a Hermes dashboard color theme instead of following the Homarr board theme.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Hermes theme",
        description: "Choose one of the built-in Hermes dashboard themes.",
        values: {
          type: "select",
          options: [
            "Hermes Teal",
            "Hermes Teal (Large)",
            "Nous Blue",
            "Midnight",
            "Ember",
            "Mono",
            "Cyberpunk",
            "Rosé",
          ],
        },
        defaultValue: "Hermes Teal",
      },
      {
        name: "Font",
        description: "Use the theme default or override it with a font from the Hermes dashboard catalog.",
        values: {
          type: "select",
          options: [
            "Theme default",
            "System Sans",
            "System Serif",
            "System Mono",
            "Inter",
            "IBM Plex Sans",
            "Work Sans",
            "Atkinson Hyperlegible",
            "DM Sans",
            "Spectral",
            "Fraunces",
            "Source Serif 4",
            "JetBrains Mono",
            "IBM Plex Mono",
            "Space Mono",
          ],
        },
        defaultValue: "Theme default",
      },
      {
        name: "Show platforms",
        description: "Show connected messaging platforms when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show recent sessions",
        description: "Show recent agent sessions when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show scheduled jobs",
        description: "Show scheduled and paused jobs when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show skills",
        description: "Show enabled skills ordered by Hermes usage when detail access is allowed.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
