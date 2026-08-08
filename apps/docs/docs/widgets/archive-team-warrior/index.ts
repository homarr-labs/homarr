import type { WidgetDefinition } from "@site/src/types";
import { IconArchive } from "@tabler/icons-react";

export const archiveTeamWarriorWidget: WidgetDefinition = {
  icon: IconArchive,
  name: "ArchiveTeam Warrior",
  description: "Monitor ArchiveTeam Warrior status, projects, bandwidth, and active archival jobs.",
  path: "../../widgets/archive-team-warrior",
  configuration: {
    items: [
      {
        name: "Show broadcast message",
        description: "Show the message broadcast by the selected Warrior project when space allows.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
