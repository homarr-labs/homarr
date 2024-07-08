import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { calendarRouter } from "./calendar";
import { dnsHoleRouter } from "./dns-hole";
import { mediaServerRouter } from "./media-server";
import { notebookRouter } from "./notebook";
import { smartHomeRouter } from "./smart-home";
import { weatherRouter } from "./weather";
import { rssFeedRouter } from "./rssFeed";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  app: appRouter,
  dnsHole: dnsHoleRouter,
  smartHome: smartHomeRouter,
  mediaServer: mediaServerRouter,
  calendar: calendarRouter,
  rssFeed: rssFeedRouter
});
