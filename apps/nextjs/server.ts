// Import tasks overrides first (must be before other imports)
import "../tasks/src/overrides";

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

import { onStartAsync } from "../tasks/src/on-start";

const logger = createLogger({
  module: "nextjs-server",
});

// TODO: later add support for env variables for port
const port = 3000;
const dev = process.env.NODE_ENV !== "production";
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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

void app.prepare().then(() => {
  // Create HTTP server
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);

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
    logger.info(`➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
    websocket.once("close", (code, reason) => {
      logger.info(`➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
    });
  });

  // Start server
  server.listen(port, () => {
    logger.info(`✅ Next.js server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket server ready on ws://${hostname}:${port}/websockets`);
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
