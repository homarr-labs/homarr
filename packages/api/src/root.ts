import type { AnyProcedure } from "@trpc/server";
import { appRouter as innerAppRouter } from "./router/app";
import { boardRouter } from "./router/board";
import { cronJobsRouter } from "./router/cron-jobs";
import { dockerRouter } from "./router/docker/docker-router";
import { groupRouter } from "./router/group";
import { homeRouter } from "./router/home";
import { iconsRouter } from "./router/icons";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { locationRouter } from "./router/location";
import { logRouter } from "./router/log";
import { serverSettingsRouter } from "./router/serverSettings";
import { userRouter } from "./router/user";
import { widgetRouter } from "./router/widgets";
import { createTRPCRouter } from "./trpc";

const appRouter = createTRPCRouter({
  user: userRouter,
  group: groupRouter,
  invite: inviteRouter,
  integration: integrationRouter,
  board: boardRouter,
  app: innerAppRouter,
  widget: widgetRouter,
  location: locationRouter,
  log: logRouter,
  icon: iconsRouter,
  home: homeRouter,
  docker: dockerRouter,
  serverSettings: serverSettingsRouter,
  cronJobs: cronJobsRouter,
});

// https://github.com/jlalmes/trpc-openapi/issues/442#issuecomment-2121715312
const procedures = appRouter._def.procedures;
Object.keys(procedures).forEach((key) => {
  const def = (procedures[key as keyof typeof procedures] as unknown as AnyProcedure)?._def;
  // @ts-expect-error: internal API
  if (def?.meta?.openapi) {
    switch (def.type) {
      case "query":
        // @ts-expect-error: unstable support for tRPC v11
        def.query = true;
        break;
      case "mutation":
        // @ts-expect-error: unstable support for tRPC v11
        def.mutation = true;
        break;
      case "subscription":
        // @ts-expect-error: unstable support for tRPC v11
        def.subscription = true;
        break;
    }
  }
});

export { appRouter };

// export type definition of API
export type AppRouter = typeof appRouter;
