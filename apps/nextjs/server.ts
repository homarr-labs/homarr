// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "../tasks/src/overrides";

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { PageNotFoundError } from "next/dist/shared/lib/utils";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";
import { logger } from "@homarr/log";

import { onStartAsync } from "../tasks/src/on-start";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize cron jobs and tasks
let cronJobsInitialized = false;

async function initializeCronJobs() {
  if (cronJobsInitialized) return;

  try {
    await onStartAsync();
    await jobGroup.initializeAsync();
    await jobGroup.startAllAsync();
    cronJobsInitialized = true;
    logger.info("✅ Cron jobs initialized successfully");
  } catch (error) {
    logger.error(new Error("Failed to initialize cron jobs", { cause: error }));
    throw error;
  }
}

app.prepare().then(async () => {
  // Initialize cron jobs before starting server
  await initializeCronJobs();

  // Create HTTP server
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({
    server,
    path: "/websockets",
  });

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
    logger.info(`➕ WebSocket Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
    websocket.once("close", (code, reason) => {
      logger.info(`➖ WebSocket Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
    });
  });

  // Start server
  server.listen(port, () => {
    logger.info(`✅ Next.js server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket server ready on ws://${hostname}:${port}/websockets`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    handler.broadcastReconnectNotification();
    wss.close(() => {
      server.close(() => {
        logger.info("Shutdown complete.");
        process.exit(0);
      });
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
