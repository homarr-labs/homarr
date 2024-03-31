import { appRouter as innerAppRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { integrationRouter } from "./router/integration";
import { userRouter } from "./router/user";
import { widgetRouter } from "./router/widgets";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  integration: integrationRouter,
  board: boardRouter,
  app: innerAppRouter,
  widget: widgetRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
