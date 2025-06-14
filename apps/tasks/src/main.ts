// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./undici-log-agent-override";

import type { FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";

import type { JobRouter } from "@homarr/cron-job-api";
import { jobRouter } from "@homarr/cron-job-api";
import { registerCronJobRunner } from "@homarr/cron-job-runner/register";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

import { JobManager } from "./job-manager";

const server = fastify({
  maxParamLength: 5000,
});
server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: jobRouter,
    createContext: () => ({
      manager: new JobManager(db, jobGroup),
    }),
    onError({ path, error }) {
      // report to error monitoring
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<JobRouter>["trpcOptions"],
});

void (async () => {
  registerCronJobRunner();
  await jobGroup.startAllAsync();

  try {
    await server.listen({ port: 3002 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
