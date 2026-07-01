import { IntegrationDefinition } from "@site/src/types";

export const speedtestTrackerIntegration: IntegrationDefinition = {
  name: "Speedtest Tracker",
  description: "Speedtest Tracker is a self-hosted internet performance tracking application.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/speedtest-tracker.png",
  path: "../../integrations/speedtest-tracker",
  data: "Fetches speedtest results and aggregate statistics from a Speedtest Tracker instance.",
};
