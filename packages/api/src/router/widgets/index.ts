import { createTRPCRouter } from "../../trpc";
import { dnsHoleRouter } from "./dns-hole";
import { notebookRouter } from "./notebook";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  dnsHole: dnsHoleRouter,
});
