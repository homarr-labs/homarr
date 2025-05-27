import { lazy } from "@trpc/server";

import { createTRPCRouter } from "../../trpc";

export const widgetRouter = createTRPCRouter({
  notebook: lazy(() => import("./notebook").then((mod) => mod.notebookRouter)),
  weather: lazy(() => import("./weather").then((mod) => mod.weatherRouter)),
  app: lazy(() => import("./app").then((mod) => mod.appRouter)),
  dnsHole: lazy(() => import("./dns-hole").then((mod) => mod.dnsHoleRouter)),
  smartHome: lazy(() => import("./smart-home").then((mod) => mod.smartHomeRouter)),
  stockPrice: lazy(() => import("./stocks").then((mod) => mod.stockPriceRouter)),
  mediaServer: lazy(() => import("./media-server").then((mod) => mod.mediaServerRouter)),
  calendar: lazy(() => import("./calendar").then((mod) => mod.calendarRouter)),
  downloads: lazy(() => import("./downloads").then((mod) => mod.downloadsRouter)),
  mediaRequests: lazy(() => import("./media-requests").then((mod) => mod.mediaRequestsRouter)),
  rssFeed: lazy(() => import("./rssFeed").then((mod) => mod.rssFeedRouter)),
  indexerManager: lazy(() => import("./indexer-manager").then((mod) => mod.indexerManagerRouter)),
  healthMonitoring: lazy(() => import("./health-monitoring").then((mod) => mod.healthMonitoringRouter)),
  mediaTranscoding: lazy(() => import("./media-transcoding").then((mod) => mod.mediaTranscodingRouter)),
  minecraft: lazy(() => import("./minecraft").then((mod) => mod.minecraftRouter)),
  options: lazy(() => import("./options").then((mod) => mod.optionsRouter)),
  releases: lazy(() => import("./releases").then((mod) => mod.releasesRouter)),
  networkController: lazy(() => import("./network-controller").then((mod) => mod.networkControllerRouter)),
});
