import { appRouter as innerAppRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { integrationRouter } from "./router/integration";
import { inviteRouter } from "./router/invite";
import { locationRouter } from "./router/location";
import { logRouter } from "./router/log";
import { userRouter } from "./router/user";
import { widgetRouter } from "./router/widgets";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  invite: inviteRouter,
  integration: integrationRouter,
  board: boardRouter,
  app: innerAppRouter,
  widget: widgetRouter,
  location: locationRouter,
  log: logRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
