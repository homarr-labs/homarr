import { lazy } from "@trpc/server";

import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: lazy(() => import("./router/user").then((mod) => mod.userRouter)),
  group: lazy(() => import("./router/group").then((mod) => mod.groupRouter)),
  invite: lazy(() => import("./router/invite").then((mod) => mod.inviteRouter)),
  integration: lazy(() => import("./router/integration/integration-router").then((mod) => mod.integrationRouter)),
  board: lazy(() => import("./router/board").then((mod) => mod.boardRouter)),
  section: lazy(() => import("./router/section/section-router").then((mod) => mod.sectionRouter)),
  app: lazy(() => import("./router/app").then((mod) => mod.appRouter)),
  searchEngine: lazy(() => import("./router/search-engine/search-engine-router").then((mod) => mod.searchEngineRouter)),
  widget: lazy(() => import("./router/widgets").then((mod) => mod.widgetRouter)),
  location: lazy(() => import("./router/location").then((mod) => mod.locationRouter)),
  log: lazy(() => import("./router/log").then((mod) => mod.logRouter)),
  icon: lazy(() => import("./router/icons").then((mod) => mod.iconsRouter)),
  import: lazy(() => import("./router/import/import-router").then((mod) => mod.importRouter)),
  onboard: lazy(() => import("./router/onboard/onboard-router").then((mod) => mod.onboardRouter)),
  home: lazy(() => import("./router/home").then((mod) => mod.homeRouter)),
  docker: lazy(() => import("./router/docker/docker-router").then((mod) => mod.dockerRouter)),
  kubernetes: lazy(() => import("./router/kubernetes/router/kubernetes-router").then((mod) => mod.kubernetesRouter)),
  serverSettings: lazy(() => import("./router/serverSettings").then((mod) => mod.serverSettingsRouter)),
  cronJobs: lazy(() => import("./router/cron-jobs").then((mod) => mod.cronJobsRouter)),
  apiKeys: lazy(() => import("./router/apiKeys").then((mod) => mod.apiKeysRouter)),
  media: lazy(() => import("./router/medias/media-router").then((mod) => mod.mediaRouter)),
  updateChecker: lazy(() => import("./router/update-checker").then((mod) => mod.updateCheckerRouter)),
  certificates: lazy(() => import("./router/certificates/certificate-router").then((mod) => mod.certificateRouter)),
});

// export type definition of API
export type AppRouter = typeof appRouter;
