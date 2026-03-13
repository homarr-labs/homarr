// Must be imported first to set up globalThis.AsyncLocalStorage for Next.js
import "next/dist/server/node-environment-baseline";

// Set up undici HTTP agent override (from tasks app)
import { setGlobalDispatcher } from "undici";
import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";
setGlobalDispatcher(new UndiciHttpAgent());

import { createServer } from "http";
import path from "path";
import next from "next";
import { parse } from "url";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import type { FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { env as authEnv } from "@homarr/auth/env";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { JobRouter } from "@homarr/cron-job-api";
import { jobRouter } from "@homarr/cron-job-api";
import { CRON_JOB_API_KEY_HEADER, CRON_JOB_API_PATH, CRON_JOB_API_PORT } from "@homarr/cron-job-api/constants";
import { jobGroup } from "@homarr/cron-jobs";
import { db, eq, inArray } from "@homarr/db";
import { cronJobConfigurations, sessions, users } from "@homarr/db/schema";
import { supportedAuthProviders } from "@homarr/definitions";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";
import { schedule, validate as validateCron } from "node-cron";

const logger = createLogger({ module: "customServer" });

// --- JobManager (from apps/tasks/src/job-manager.ts) ---
import type { IJobManager } from "@homarr/cron-job-api";
import type { JobGroupKeys } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";

class JobManager implements IJobManager {
  constructor(
    private db: Database,
    private jobGroup: typeof jobGroup,
  ) {}

  public async startAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.startAsync(name);
  }
  public async triggerAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.runManuallyAsync(name);
  }
  public async stopAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.stopAsync(name);
  }
  public async updateIntervalAsync(name: JobGroupKeys, cron: string): Promise<void> {
    logger.info("Updating cron job interval", { name, expression: cron });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (!validateCron(cron)) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }
    if (job.preventCustomInterval && cron !== job.cronExpression) {
      throw new Error(`Custom cron expressions are not allowed for job ${name}`);
    }

    await this.updateConfigurationAsync(name, { cronExpression: cron });
    await this.jobGroup.getTask(name)?.destroy();

    this.jobGroup.setTask(
      name,
      schedule(cron, () => void job.executeAsync(), {
        name,
      }),
    );
    logger.info("Cron job interval updated", { name, expression: cron });
  }
  public async disableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Disabling cron job", { name });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.updateConfigurationAsync(name, { isEnabled: false });
    await this.jobGroup.stopAsync(name);
    logger.info("Cron job disabled", { name });
  }
  public async enableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Enabling cron job", { name });
    await this.updateConfigurationAsync(name, { isEnabled: true });
    await this.jobGroup.startAsync(name);
    logger.info("Cron job enabled", { name });
  }

  private async updateConfigurationAsync(
    name: JobGroupKeys,
    configuration: Omit<Partial<InferInsertModel<typeof cronJobConfigurations>>, "name">,
  ) {
    const existingConfig = await this.db.query.cronJobConfigurations.findFirst({
      where: (table, { eq }) => eq(table.name, name),
    });

    if (existingConfig) {
      await this.db
        .update(cronJobConfigurations)
        .set({ ...configuration, name: undefined })
        .where(eq(cronJobConfigurations.name, name));
      return;
    }

    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.db.insert(cronJobConfigurations).values({
      name,
      cronExpression: configuration.cronExpression ?? job.cronExpression,
      isEnabled: configuration.isEnabled ?? true,
    });
  }

  public async getAllAsync(): Promise<
    {
      name: JobGroupKeys;
      cron: string;
      preventManualExecution: boolean;
      preventCustomInterval: boolean;
      isEnabled: boolean;
    }[]
  > {
    const configurations = await this.db.query.cronJobConfigurations.findMany();

    return [...this.jobGroup.getJobRegistry().entries()].map(([name, job]) => {
      const config = configurations.find((config) => config.name === name);
      return {
        name,
        cron: config?.cronExpression ?? job.cronExpression,
        preventManualExecution: job.preventManualExecution,
        preventCustomInterval: job.preventCustomInterval,
        isEnabled: config?.isEnabled ?? true,
      };
    });
  }
}

// --- On-start functions (from apps/tasks/src/on-start/) ---
async function cleanupSessionsAsync() {
  try {
    const currentAuthProviders = authEnv.AUTH_PROVIDERS;
    const inactiveAuthProviders = supportedAuthProviders.filter((provider) => !currentAuthProviders.includes(provider));
    const subQuery = db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.provider, inactiveAuthProviders))
      .as("sq");
    const sessionsWithInactiveProviders = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .rightJoin(subQuery, eq(sessions.userId, subQuery.id));

    const userIds = sessionsWithInactiveProviders.map(({ userId }) => userId).filter((value) => value !== null);
    await db.delete(sessions).where(inArray(sessions.userId, userIds));

    if (sessionsWithInactiveProviders.length > 0) {
      logger.info("Deleted sessions for inactive providers", { count: userIds.length });
    }
  } catch (error) {
    logger.error(new Error("Failed to clean up sessions", { cause: error }));
  }
}

async function invalidateUpdateCheckerCacheAsync() {
  try {
    const handler = updateCheckerRequestHandler.handler({});
    await handler.invalidateAsync();
    logger.debug("Update checker cache invalidated");
  } catch (error) {
    logger.error(new Error("Failed to invalidate update checker cache", { cause: error }));
  }
}

// --- Tasks/Cron Fastify server setup ---
async function startTasksServer() {
  const tasksLogger = createLogger({ module: "tasksMain" });

  const tasksServer = fastify({ maxParamLength: 5000 });
  tasksServer.register(fastifyTRPCPlugin, {
    prefix: CRON_JOB_API_PATH,
    trpcOptions: {
      router: jobRouter,
      createContext: ({ req }) => ({
        manager: new JobManager(db, jobGroup),
        apiKey: req.headers[CRON_JOB_API_KEY_HEADER] as string | undefined,
      }),
      onError({ path, error }) {
        tasksLogger.error(new ErrorWithMetadata("Error in tasks tRPC handler", { path }, { cause: error }));
      },
    } satisfies FastifyTRPCPluginOptions<JobRouter>["trpcOptions"],
  });

  // Run on-start tasks
  await cleanupSessionsAsync();
  await invalidateUpdateCheckerCacheAsync();

  // Initialize and start cron jobs
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();

  try {
    await tasksServer.listen({ port: CRON_JOB_API_PORT });
    tasksLogger.info("Tasks web server started successfully", { port: CRON_JOB_API_PORT });
  } catch (err) {
    tasksLogger.error(
      new ErrorWithMetadata("Failed to start tasks web server", { port: CRON_JOB_API_PORT }, { cause: err }),
    );
  }

  return tasksServer;
}

// --- Main server setup ---
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
// Resolve the directory of this file so Next.js can find the app/pages dirs
const dir = path.resolve(__dirname);

const app = next({ dev, hostname, port, dir });
const handle = app.getRequestHandler();
const upgradeHandler = app.getUpgradeHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Create WebSocket server in noServer mode so we handle upgrade manually
  const wss = new WebSocketServer({ noServer: true });

  const wssHandler = applyWSSHandler({
    wss,
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
        logger.error(error);
        return createTRPCContext({
          headers: new Headers(),
          session: null,
        });
      }
    },
    keepAlive: {
      enabled: true,
      pingMs: 30000,
      pongWaitMs: 5000,
    },
  });

  // Handle upgrade requests: route /websockets to our WS server,
  // delegate everything else (e.g. HMR _next/webpack-hmr) to Next.js
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/websockets")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      upgradeHandler(req, socket, head);
    }
  });

  wss.on("connection", (websocket, incomingMessage) => {
    logger.info(`➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
    websocket.once("close", (code, reason) => {
      logger.info(`➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
    });
  });

  // Start the integrated tasks/cron server
  const tasksServer = await startTasksServer();

  server.once("error", (err) => {
    logger.error(new ErrorWithMetadata("Server error", {}, { cause: err }));
    wssHandler.broadcastReconnectNotification();
    wss.close();
    tasksServer.close().catch((closeError) => logger.error("Failed to close tasks server", closeError));
    server.close(() => process.exit(1));
  });

  server.listen(port, () => {
    logger.info(`✅ Custom server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket Server integrated on ws://${hostname}:${port}/websockets`);
    logger.info(`✅ Tasks/Cron server integrated on port ${CRON_JOB_API_PORT}`);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM");
    wssHandler.broadcastReconnectNotification();
    wss.close();
    tasksServer.close().catch((closeError) => logger.error("Failed to close tasks server", closeError));
    server.close();
  });
});
