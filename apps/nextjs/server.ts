// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
// import "../tasks/src/overrides";

import { createServer } from "http";
import { parse } from "url";
import next from "next";

import { logger } from "@homarr/log";

// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
const hostname = process.env.HOSTNAME || "localhost";

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  // Create HTTP server
  const server = createServer((req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  // Create WebSocket server attached to HTTP server
  /*const wss = new WebSocketServer({
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
  });*/

  // Initialize cron jobs before starting server

  // Start server
  server.listen(port, () => {
    logger.info(`✅ Next.js server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket server ready on ws://${hostname}:${port}/websockets`);

    void import("./run");
  });

  // Handle graceful shutdown
  const shutdown = () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    //handler.broadcastReconnectNotification();
    /*wss.close(() => {
      server.close(() => {
        logger.info("Shutdown complete.");
        process.exit(0);
      });
    });*/
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
