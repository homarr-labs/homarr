import { integrationRouter } from "./router/integration";
import { serviceRouter } from "./router/service";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  integration: integrationRouter,
  service: serviceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
