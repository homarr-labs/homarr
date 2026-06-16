export { createTRPCContext } from "./trpc";

import { createTRPCRouter } from "./trpc";
import { appRouter as appRouterForApps } from "./router/app";
import { apiKeysRouter } from "./router/apiKeys";
import { boardRouter } from "./router/board";
import { dockerRouter } from "./router/docker/docker-router";
import { iconsRouter } from "./router/icons";
import { infoRouter } from "./router/info";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { beszelRouter } from "./router/widgets/beszel";
import { calendarRouter } from "./router/widgets/calendar";
import { dnsHoleRouter } from "./router/widgets/dns-hole";
import { downloadsRouter } from "./router/widgets/downloads";
import { healthMonitoringRouter } from "./router/widgets/health-monitoring";
import { mediaRequestsRouter } from "./router/widgets/media-requests";
import { mediaServerRouter } from "./router/widgets/media-server";
import { smartHomeRouter } from "./router/widgets/smart-home";

export const mcpRouter = createTRPCRouter({
  app: appRouterForApps,
  apiKeys: apiKeysRouter,
  board: boardRouter,
  docker: dockerRouter,
  icon: iconsRouter,
  info: infoRouter,
  integration: integrationRouter,
  invite: inviteRouter,
  beszel: beszelRouter,
  calendar: calendarRouter,
  dnsHole: dnsHoleRouter,
  downloads: downloadsRouter,
  healthMonitoring: healthMonitoringRouter,
  mediaRequests: mediaRequestsRouter,
  mediaServer: mediaServerRouter,
  smartHome: smartHomeRouter,
});
