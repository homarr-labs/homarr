import { IntegrationDefinition } from "@site/src/types";

export const icalIntegration: IntegrationDefinition = {
  name: "iCal",
  description:
    "iCal is a standard for calendar data exchange, allowing users to share and manage calendar events across different platforms.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/ical.svg",
  path: "../../integrations/ical",
  data: "Fetches and parses an iCal/ICS calendar feed to retrieve calendar events.",
};
