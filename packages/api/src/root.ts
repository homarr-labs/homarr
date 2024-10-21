import { apiKeysRouter } from "./router/apiKeys";
import { appRouter as innerAppRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { cronJobsRouter } from "./router/cron-jobs";
import { dockerRouter } from "./router/docker/docker-router";
import { groupRouter } from "./router/group";
import { homeRouter } from "./router/home";
import { iconsRouter } from "./router/icons";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { locationRouter } from "./router/location";
import { logRouter } from "./router/log";
import { mediaRouter } from "./router/medias/media-router";
import { searchEngineRouter } from "./router/search-engine/search-engine-router";
import { serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";
import { widgetRouter } from "./router/widgets";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  group: groupRouter,
  invite: inviteRouter,
  integration: integrationRouter,
  board: boardRouter,
  app: innerAppRouter,
  searchEngine: searchEngineRouter,
  widget: widgetRouter,
  location: locationRouter,
  log: logRouter,
  icon: iconsRouter,
  home: homeRouter,
  docker: dockerRouter,
  serverSettings: serverSettingsRouter,
  cronJobs: cronJobsRouter,
  apiKeys: apiKeysRouter,
  media: mediaRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
