import { createLazyRouter } from "./procedure";

import { createApiRouter } from "./procedure";

export const appRouter = createApiRouter({
  federation: createLazyRouter(() => import("./router/federation").then((mod) => mod.federationRouter)),
  frontend: createLazyRouter(() => import("./router/frontend").then((mod) => mod.frontendRouter)),
  assistant: createLazyRouter(() => import("./router/assistant").then((mod) => mod.assistantRouter)),
  user: createLazyRouter(() => import("./router/user").then((mod) => mod.userRouter)),
  group: createLazyRouter(() => import("./router/group").then((mod) => mod.groupRouter)),
  invite: createLazyRouter(() => import("./router/invite").then((mod) => mod.inviteRouter)),
  integration: createLazyRouter(() =>
    import("./router/integration/integration-router").then((mod) => mod.integrationRouter),
  ),
  board: createLazyRouter(() => import("./router/board").then((mod) => mod.boardRouter)),
  section: createLazyRouter(() => import("./router/section/section-router").then((mod) => mod.sectionRouter)),
  app: createLazyRouter(() => import("./router/app").then((mod) => mod.appRouter)),
  searchEngine: createLazyRouter(() =>
    import("./router/search-engine/search-engine-router").then((mod) => mod.searchEngineRouter),
  ),
  widget: createLazyRouter(() => import("./router/widgets").then((mod) => mod.widgetRouter)),
  location: createLazyRouter(() => import("./router/location").then((mod) => mod.locationRouter)),
  log: createLazyRouter(() => import("./router/log").then((mod) => mod.logRouter)),
  icon: createLazyRouter(() => import("./router/icons").then((mod) => mod.iconsRouter)),
  onboard: createLazyRouter(() => import("./router/onboard/onboard-router").then((mod) => mod.onboardRouter)),
  home: createLazyRouter(() => import("./router/home").then((mod) => mod.homeRouter)),
  docker: createLazyRouter(() => import("./router/docker/docker-router").then((mod) => mod.dockerRouter)),
  kubernetes: createLazyRouter(() =>
    import("./router/kubernetes/router/kubernetes-router").then((mod) => mod.kubernetesRouter),
  ),
  serverSettings: createLazyRouter(() => import("./router/serverSettings").then((mod) => mod.serverSettingsRouter)),
  cronJobs: createLazyRouter(() => import("./router/cron-jobs").then((mod) => mod.cronJobsRouter)),
  apiKeys: createLazyRouter(() => import("./router/apiKeys").then((mod) => mod.apiKeysRouter)),
  media: createLazyRouter(() => import("./router/medias/media-router").then((mod) => mod.mediaRouter)),
  updateChecker: createLazyRouter(() => import("./router/update-checker").then((mod) => mod.updateCheckerRouter)),
  certificates: createLazyRouter(() =>
    import("./router/certificates/certificate-router").then((mod) => mod.certificateRouter),
  ),
  bangs: createLazyRouter(() => import("./router/bangs/bangs-router").then((mod) => mod.bangsRouter)),
  analytics: createLazyRouter(() => import("./router/analytics").then((mod) => mod.analyticsRouter)),
  info: createLazyRouter(() => import("./router/info").then((mod) => mod.infoRouter)),
  customWidget: createLazyRouter(() =>
    import("./router/custom-widget/custom-widget-router").then((mod) => mod.customWidgetRouter),
  ),
});

// export type definition of API
export type AppRouter = typeof appRouter;
