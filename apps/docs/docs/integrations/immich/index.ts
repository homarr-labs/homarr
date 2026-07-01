import { IntegrationDefinition } from "@site/src/types";

export const immichIntegration: IntegrationDefinition = {
  name: "Immich",
  description: "Self-hosted photo and video management solution",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/immich.svg",
  path: "../../integrations/immich",
  data: "Fetches server statistics, albums, and users from an Immich photo management server.",
};
