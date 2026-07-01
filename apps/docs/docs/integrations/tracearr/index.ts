import { IntegrationDefinition } from "@site/src/types";
export const tracearrIntegration: IntegrationDefinition = {
  name: "Tracearr",
  description:
    "Tracearr is a comprehensive media monitoring solution that tracks streams, user activity, and policy violations in your media server.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/tracearr.svg",
  path: "../../integrations/tracearr",
  data: "Fetches media server monitoring data including health, stats, active streams, violations, and history.",
};
