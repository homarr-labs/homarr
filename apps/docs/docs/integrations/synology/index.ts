import { IntegrationDefinition } from "@site/src/types";

export const synologyIntegration: IntegrationDefinition = {
  name: "Synology DiskStation",
  description: "Monitor CPU, memory, storage volumes, and system health from Synology DSM.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/synology.svg",
  path: "../../integrations/synology",
};
