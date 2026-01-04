// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./overrides";

import fastifyWebsockets from "@fastify/websocket";
import type { FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";

import type { AppRouter } from "@homarr/api";
import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { JobRouter } from "@homarr/cron-job-api";
import { jobRouter } from "@homarr/cron-job-api";
import { CRON_JOB_API_KEY_HEADER, CRON_JOB_API_PATH, CRON_JOB_API_PORT } from "@homarr/cron-job-api/constants";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

import { JobManager } from "./job-manager";
import { onStartAsync } from "./on-start";

const logger = createLogger({ module: "tasksMain" });
const wsLogger = createLogger({ module: "websocketMain" });

const server = fastify({
  maxParamLength: 5000,
});
server.register(fastifyWebsockets);
server.register(fastifyTRPCPlugin, {
  prefix: CRON_JOB_API_PATH,
  trpcOptions: {
    router: jobRouter,
    createContext: ({ req }) => ({
      manager: new JobManager(db, jobGroup),
      apiKey: req.headers[CRON_JOB_API_KEY_HEADER] as string | undefined,
    }),
    onError({ path, error }) {
      logger.error(new ErrorWithMetadata("Error in tasks tRPC handler", { path }, { cause: error }));
    },
  } satisfies FastifyTRPCPluginOptions<JobRouter>["trpcOptions"],
});
server.register(fastifyTRPCPlugin, {
  prefix: "/websockets",
  useWSS: true,

  // Enable heartbeat messages to keep connection open (disabled by default)
  trpcOptions: {
    router: appRouter,
    // eslint-disable-next-line no-restricted-syntax
    createContext: async ({ req }) => {
      try {
        const headers = Object.entries(req.headers).map(
          ([key, value]) => [key, typeof value === "string" ? value : value?.[0]] as [string, string],
        );
        const nextHeaders = new Headers(headers);

        const store = parseCookies(nextHeaders.get("cookie") ?? "");
        const sessionToken = store[sessionTokenCookieName];

        const session = await getSessionFromToken(db, sessionToken);

        return createTRPCContext({
          headers: nextHeaders,
          session,
        });
      } catch (error) {
        wsLogger.error(error);
        return createTRPCContext({
          headers: new Headers(),
          session: null,
        });
      }
    },
  },
} satisfies FastifyTRPCPluginOptions<AppRouter>);

void (async () => {
  await onStartAsync();
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();

  try {
    await server.listen({ port: CRON_JOB_API_PORT });
    logger.info("Tasks/websocket web server started successfully", { port: CRON_JOB_API_PORT });
  } catch (err) {
    logger.error(
      new ErrorWithMetadata("Failed to start tasks/websocket web server", { port: CRON_JOB_API_PORT }, { cause: err }),
    );
    process.exit(1);
  }
})();
