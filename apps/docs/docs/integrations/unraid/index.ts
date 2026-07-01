import { IntegrationDefinition } from "@site/src/types";
export const unraidIntegration: IntegrationDefinition = {
  name: "Unraid",
  description:
    "Versatile operating system that lets you run applications, virtual machines, and storage devices on your server",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/unraid.svg",
  path: "../../integrations/unraid",
  data: "Fetches system health data including CPU, memory, array disks, and array status from Unraid via GraphQL API.",
};
