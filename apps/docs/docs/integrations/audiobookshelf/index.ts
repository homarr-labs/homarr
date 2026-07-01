import { IntegrationDefinition } from "@site/src/types";

export const audiobookshelfIntegration: IntegrationDefinition = {
  name: "Audiobookshelf",
  description:
    "Audiobookshelf is a self-hosted audiobook and podcast server that lets you manage and stream your audio library.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/audiobookshelf.svg",
  path: "../../integrations/audiobookshelf",
  data: "Fetches library statistics, listening time, and active sessions from Audiobookshelf.",
};
