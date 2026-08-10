import { IntegrationDefinition } from "@site/src/types";

export const wudIntegration: IntegrationDefinition = {
  name: "What's Up Docker",
  description:
    "What's Up Docker (WUD) watches your Docker containers and reports which ones have newer image versions available.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/whats-up-docker.svg",
  path: "../../integrations/whats-up-docker",
};
