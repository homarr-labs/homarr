import type { IntegrationDefinition } from "@site/src/types";

export const jackettIntegration: IntegrationDefinition = {
  name: "Jackett",
  description: "Jackett exposes configured indexers through Torznab.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jackett.svg",
  path: "../../integrations/jackett",
};
