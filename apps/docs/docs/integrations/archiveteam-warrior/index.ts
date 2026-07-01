import { IntegrationDefinition } from "@site/src/types";

export const archiveTeamWarriorIntegration: IntegrationDefinition = {
  name: "ArchiveTeam Warrior",
  description:
    "ArchiveTeam Warrior is an easy-to-run virtual machine that helps preserve websites by using some of your bandwidth and disk space to download and upload content to ArchiveTeam’s archive.",
  iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/png/archiveteam-warrior.png",
  path: "../../integrations/archiveteam-warrior",
  data: "Fetches Archive Team Warrior status including project, bandwidth stats, and item progress via WebSocket.",
};
