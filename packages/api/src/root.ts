import { integrationRouter } from "./router/integration";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  integration: integrationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
