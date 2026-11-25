import type { IntegrationDefinition } from "@site/src/types";

export const dockhandIntegration = {
  name: "Dockhand",
  description: "Dockhand is a self-hosted web UI for managing Docker containers, stacks and hosts.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dockhand.png",
  path: "../../integrations/dockhand",
} satisfies IntegrationDefinition;
