import { IntegrationDefinition } from "@site/src/types";
export const truenasIntegration: IntegrationDefinition = {
  name: "TrueNAS",
  description: "Enterprise network-attached storage for your home, office, and cloud.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/truenas.svg",
  path: "../../integrations/truenas",
  data: "Fetches system health data including CPU, memory, pools, disks, and network from TrueNAS via WebSocket API.",
};
