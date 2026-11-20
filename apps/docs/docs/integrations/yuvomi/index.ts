import type { IntegrationDefinition } from "@site/src/types";

export const yuvomiIntegration = {
  name: "Yuvomi",
  description: "A self-hosted family planner for shared tasks, shopping lists, calendars and meals.",
  iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/yuvomi.svg",
  path: "../../integrations/yuvomi",
} satisfies IntegrationDefinition;
