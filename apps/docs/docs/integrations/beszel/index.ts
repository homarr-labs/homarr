import { IntegrationDefinition } from "@site/src/types";

export const beszelIntegration: IntegrationDefinition = {
  name: "Beszel",
  description:
    "Beszel is a lightweight server monitoring platform with Docker stats, historical data, and alert functions.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/beszel.svg",
  path: "../../integrations/beszel",
  data: "Fetches server monitoring data including system stats, containers, SMART devices, alerts, and real-time metrics.",
};
