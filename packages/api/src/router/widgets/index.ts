import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { calendarRouter } from "./calendar";
import { dnsHoleRouter } from "./dns-hole";
import { downloadsRouter } from "./downloads";
import { healthMonitoringRouter } from "./health-monitoring";
import { indexerManagerRouter } from "./indexer-manager";
import { mediaRequestsRouter } from "./media-requests";
import { mediaServerRouter } from "./media-server";
import { mediaTranscodingRouter } from "./media-transcoding";
import { minecraftRouter } from "./minecraft";
import { notebookRouter } from "./notebook";
import { rssFeedRouter } from "./rssFeed";
import { smartHomeRouter } from "./smart-home";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  app: appRouter,
  dnsHole: dnsHoleRouter,
  smartHome: smartHomeRouter,
  mediaServer: mediaServerRouter,
  calendar: calendarRouter,
  downloads: downloadsRouter,
  mediaRequests: mediaRequestsRouter,
  rssFeed: rssFeedRouter,
  indexerManager: indexerManagerRouter,
  healthMonitoring: healthMonitoringRouter,
  mediaTranscoding: mediaTranscodingRouter,
  minecraft: minecraftRouter,
});
