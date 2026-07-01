import { IntegrationDefinition } from "@site/src/types";

export const embyIntegration: IntegrationDefinition = {
  name: "Emby",
  description:
    "Emby is a media server platform that allows you to organize, manage, and stream your personal media collection.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/emby.svg",
  path: "../../integrations/emby",
  data: "Fetches active streams and recently added media from an Emby media server.",
};
