import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { getSessionFromToken } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { db } from "@homarr/db";
import { logger } from "@homarr/log";

import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";

const wss = new WebSocketServer({
  port: 3001,
});
const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: async ({ req }) => {
    try {
      const headers = Object.entries(req.headers).map(
        ([key, value]) =>
          [key, typeof value === "string" ? value : value?.[0]] as [
            string,
            string,
          ],
      );
      const nextHeaders = new Headers(headers);

      const store = parseCookies(nextHeaders.get("cookie") ?? "");
      const sessionToken = store["authjs.session-token"];

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
});

wss.on("connection", (websocket, incomingMessage) => {
  logger.info(
    `➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`,
  );
  websocket.once("close", (code, reason) => {
    logger.info(
      `➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`,
    );
  });
});
logger.info("✅ WebSocket Server listening on ws://localhost:3001");

process.on("SIGTERM", () => {
  logger.info("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
