import { createTRPCRouter } from "../../trpc";
import { notebookRouter } from "./notebook";

export const widgetRouter = createTRPCRouter({
  notebook: notebookRouter,
});
