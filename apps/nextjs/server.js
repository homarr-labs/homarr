import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { WebSocketServer } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import type { JobRouter } from "@homarr/cron-job-api";
import { jobRouter } from "@homarr/cron-job-api";
import { CRON_JOB_API_KEY_HEADER, CRON_JOB_API_PATH } from "@homarr/cron-job-api/constants";
import type { FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";
import { logger } from "@homarr/log";

// Import tasks overrides first (must be before other imports)
import "../tasks/src/overrides";

import { JobManager } from "../tasks/src/job-manager";
import { onStartAsync } from "../tasks/src/on-start";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize tasks worker (cron jobs) - merged into Next.js
void (async () => {
  await onStartAsync();
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();
  logger.info("✅ Tasks worker initialized and started");
})();

void app.prepare().then(async () => {
  // Create Fastify instance for tasks API (merged into Next.js)
  // Create it once and reuse for all requests
  const tasksFastify = fastify({
    maxParamLength: 5000,
  });
  
  await tasksFastify.register(fastifyTRPCPlugin, {
    prefix: CRON_JOB_API_PATH,
    trpcOptions: {
      router: jobRouter,
      createContext: ({ req }) => ({
        manager: new JobManager(db, jobGroup),
        apiKey: req.headers[CRON_JOB_API_KEY_HEADER] as string | undefined,
      }),
      onError({ path, error }) {
        logger.error(new Error(`Error in tasks tRPC handler path="${path}"`, { cause: error }));
      },
    },
  } satisfies FastifyTRPCPluginOptions<JobRouter>["trpcOptions"]);
  
  await tasksFastify.ready();

  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      
      // Route tasks API requests to Fastify handler
      if (parsedUrl.pathname?.startsWith(CRON_JOB_API_PATH)) {
        // Use Fastify's inject method to handle the request
        const response = await tasksFastify.inject({
          method: req.method ?? "GET",
          url: req.url ?? "",
          headers: req.headers as Record<string, string>,
          payload: req,
        });
        
        // Write response
        res.statusCode = response.statusCode;
        for (const [key, value] of Object.entries(response.headers)) {
          res.setHeader(key, value);
        }
        res.end(response.body);
        return;
      }
      
      // All other requests go to Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Create WebSocket server on the same HTTP server
  const wss = new WebSocketServer({
    server,
    path: "/websockets",
  });

  // Apply tRPC WebSocket handler
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    // ignore error on next line because the createContext must be set with this name
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
    // Enable heartbeat messages to keep connection open (disabled by default)
    keepAlive: {
      enabled: true,
      // server ping message interval in milliseconds
      pingMs: 30000,
      // connection is terminated if pong message is not received in this many milliseconds
      pongWaitMs: 5000,
    },
  });

  wss.on("connection", (websocket, incomingMessage) => {
    // Only log in development to reduce memory overhead
    if (process.env.NODE_ENV === "development") {
      logger.debug(`➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
    }
    websocket.once("close", (code, reason) => {
      if (process.env.NODE_ENV === "development") {
        logger.debug(`➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
      }
    });
  });

  // Start server
  server.listen(port, () => {
    logger.info(`✅ Next.js server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket server ready on ws://${hostname}:${port}/websockets`);
    logger.info(`✅ Tasks API ready on http://${hostname}:${port}${CRON_JOB_API_PATH}`);
  });

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    handler.broadcastReconnectNotification();
    wss.close();
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
});

