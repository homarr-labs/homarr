import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { calendarRouter } from "./calendar";
import { dnsHoleRouter } from "./dns-hole";
import { downloadsRouter } from "./downloads";
import { mediaServerRouter } from "./media-server";
import { notebookRouter } from "./notebook";
import { rssFeedRouter } from "./rssFeed";
import { smartHomeRouter } from "./smart-home";
import { weatherRouter } from "./weather";
import {usenetDownloadsRouter} from "./usenet-downloads";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  app: appRouter,
  dnsHole: dnsHoleRouter,
  smartHome: smartHomeRouter,
  mediaServer: mediaServerRouter,
  calendar: calendarRouter,
  downloads: downloadsRouter,
  rssFeed: rssFeedRouter,
});
