import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { API_KEY_HEADER_NAME } from "@homarr/auth/api-key";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db } from "@homarr/db";

const logger = createLogger({ module: "websocketMain" });

const wss = new WebSocketServer({
  port: 3001,
  // API keys authenticate per HTTP request. Never ignore an explicit key and
  // silently use an ambient browser session for a persistent connection.
  verifyClient: ({ req }, done) => {
    if (req.headers[API_KEY_HEADER_NAME.toLowerCase()] !== undefined) {
      done(false, 401, "API keys require HTTP");
      return;
    }
    done(true);
  },
});
wss.on("error", (error) => {
  logger.error(new Error("WebSocket server error", { cause: error }));
});

export const startupPromise = new Promise<void>((resolve, reject) => {
  const onListening = () => {
    wss.off("error", onError);
    logger.info("✅ WebSocket Server listening on ws://localhost:3001");
    resolve();
  };
  const onError = (error: Error) => {
    wss.off("listening", onListening);
    reject(error);
  };

  wss.once("listening", onListening);
  wss.once("error", onError);
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
  logger.info(`➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
  websocket.once("close", (code, reason) => {
    logger.info(`➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
  });
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
