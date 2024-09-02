import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { calendarRouter } from "./calendar";
import { dnsHoleRouter } from "./dns-hole";
import { indexerManagerRouter } from "./indexer-manager";
import { mediaRequestsRouter } from "./media-requests";
import { mediaServerRouter } from "./media-server";
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
  mediaRequests: mediaRequestsRouter,
  rssFeed: rssFeedRouter,
  indexerManager: indexerManagerRouter,
});
