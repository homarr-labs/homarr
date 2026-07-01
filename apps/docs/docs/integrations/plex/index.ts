import { IntegrationDefinition } from "@site/src/types";
export const plexIntegration: IntegrationDefinition = {
  name: "Plex",
  description:
    "Plex is a media server platform that allows you to organize, manage, and stream your personal media collection.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg",
  path: "../../integrations/plex",
  data: "Fetches active streams and recently added media from a Plex Media Server.",
};
