import { createTRPCRouter } from "../../trpc";
import { notebookRouter } from "./notebook";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
  weather: weatherRouter,
});
