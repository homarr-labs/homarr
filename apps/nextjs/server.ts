import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db } from "@homarr/db";

const logger = createLogger({ module: "customServer" });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  // Handle WebSocket upgrade requests on /websockets path
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/websockets")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (websocket, incomingMessage) => {
    logger.info(`➕ Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
    websocket.once("close", (code, reason) => {
      logger.info(`➖ Connection (${wss.clients.size}) ${code} ${reason.toString()}`);
    });
  });

  server.listen(port, () => {
    logger.info(`✅ Custom server ready on http://${hostname}:${port}`);
    logger.info(`✅ WebSocket Server integrated on ws://${hostname}:${port}/websockets`);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM");
    wssHandler.broadcastReconnectNotification();
    wss.close();
    server.close();
  });
});
