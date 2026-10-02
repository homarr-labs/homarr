import type { IntegrationDefinition } from "@site/src/types";

export const syncthingRelayIntegration: IntegrationDefinition = {
  name: "Syncthing Relay Server",
  description: "A Syncthing relay server for connecting clients that cannot connect directly.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/syncthing.svg",
  path: "../../integrations/syncthing-relay",
};
