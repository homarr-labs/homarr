import type { IntegrationDefinition } from "@site/src/types";

export const youtarrIntegration = {
  name: "Youtarr",
  description: "A self-hosted YouTube downloader that archives channels and playlists for Plex, Jellyfin and Emby.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/youtarr.png",
  path: "../../integrations/youtarr",
} satisfies IntegrationDefinition;
