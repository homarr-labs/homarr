import { createTRPCRouter } from "../../trpc";
import { weatherRouter } from "./weather";

export const widgetRouter = createTRPCRouter({
  weather: weatherRouter,
});
