import { IntegrationDefinition } from "@site/src/types";
export const searchChIntegration: IntegrationDefinition = {
  name: "Search.ch",
  description: "Search.ch supports searching for timetables in Switzerland.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/search-ch.png",
  path: "../../integrations/search-ch",
  data: "Fetches Swiss public transport station information and departure timetables from search.ch.",
};
