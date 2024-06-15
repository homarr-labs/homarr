import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { calendarRouter } from "./calendar";
import { dnsHoleRouter } from "./dns-hole";
import { notebookRouter } from "./notebook";
import { smartHomeRouter } from "./smart-home";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  app: appRouter,
  dnsHole: dnsHoleRouter,
  smartHome: smartHomeRouter,
  calendar: calendarRouter
});
