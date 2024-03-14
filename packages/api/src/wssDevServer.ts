import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { logger } from "@homarr/log";

import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";

const wss = new WebSocketServer({
  port: 3001,
});
const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: ({ req }) => {
    return createTRPCContext({
      headers: {
        ...req.headers,
        get(key: string) {
          const item = req.headers[key];
          return typeof item === "string" ? item ?? null : item?.at(0) ?? null;
        },
      } as Headers,
      session: {
        // TODO: replace with actual session
        user: {
          id: "1",
          name: "Test User",
          email: "",
        },
        expires: new Date().toISOString(),
      },
    });
  },
});

wss.on("connection", (ws, incomingMessage) => {
  logger.info(
    `➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`,
  );
  ws.once("close", (code, reason) => {
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
