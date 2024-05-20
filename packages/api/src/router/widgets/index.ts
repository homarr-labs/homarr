import { createTRPCRouter } from "../../trpc";
import { appRouter } from "./app";
import { notebookRouter } from "./notebook";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
  app: appRouter,
});
