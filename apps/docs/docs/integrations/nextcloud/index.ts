import { IntegrationDefinition } from "@site/src/types";

export const nextcloudIntegration: IntegrationDefinition = {
  name: "Nextcloud",
  description:
    "Nextcloud is a self-hosted productivity platform that provides file storage, collaboration tools, and more.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nextcloud.svg",
  path: "../../integrations/nextcloud",
  data: "Fetches calendar events and notifications from a Nextcloud instance.",
};
