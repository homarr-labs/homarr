import { IntegrationDefinition } from "@site/src/types";

export const umamiIntegration: IntegrationDefinition = {
  name: "Umami",
  description: "Privacy-focused, open-source web analytics",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/umami.svg",
  path: "../../integrations/umami",
  data: "Fetches comprehensive analytics data including pageviews, visitors, events, top pages, and referrers from Umami.",
};
