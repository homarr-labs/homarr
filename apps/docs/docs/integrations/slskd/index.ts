import { IntegrationDefinition } from "@site/src/types";

export const slskdIntegration: IntegrationDefinition = {
  name: "Slskd",
  description: "A modern client-server application for the Soulseek file sharing network.",
  iconUrl: {
    light: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/slskd.svg",
    dark: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/slskd.svg",
  },
  path: "../../integrations/slskd",
  data: "Monitors Soulseek downloads via slskd including filename, progress, speed, and remaining time.",
};
