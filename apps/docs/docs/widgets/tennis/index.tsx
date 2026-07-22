import { WidgetDefinition } from "@site/src/types";
import { IconBallTennis } from "@tabler/icons-react";

export const tennisWidget: WidgetDefinition = {
  icon: IconBallTennis,
  name: "Live Tennis",
  description:
    "Displays live, upcoming or completed tennis matches from the ATP, WTA, Challenger, ITF and junior tours.",
  path: "../../widgets/tennis",
  configuration: {
    items: [
      {
        name: "Tour",
        description: "Restrict the shown matches to a single tour",
        values: {
          type: "select",
          options: ["All tours", "ATP", "WTA", "Challenger", "ITF", "Juniors"],
        },
        defaultValue: "All tours",
      },
      {
        name: "Match status",
        description: "Whether to show live, upcoming or completed matches",
        values: {
          type: "select",
          options: ["Live", "Upcoming", "Completed"],
        },
        defaultValue: "Live",
      },
      {
        name: "Number of matches",
        description: "The maximum number of matches shown in the widget (1-20)",
        values: { type: "string" },
        defaultValue: "5",
      },
      {
        name: "Show tournament name",
        description: "Shows the tournament each match belongs to",
        values: { type: "boolean" },
        defaultValue: "true",
      },
      {
        name: "Show player ranking",
        description: "Shows the current world ranking next to each player",
        values: { type: "boolean" },
        defaultValue: "false",
      },
    ],
  },
};
