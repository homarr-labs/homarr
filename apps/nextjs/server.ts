import "./server/async-local-storage";

import { createServer } from "http";
import { parse } from "url";
import next from "next";

import "./server/tasks/overrides";

import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { appRouter, createTRPCContext } from "@homarr/api/websocket";
import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth";
import { parseCookies } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

import { onStartAsync } from "./server/tasks/on-start";

const logger = createLogger({ module: "server" });

const port = 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

void app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const parsedUrl = parse(req.url!, true);
      void handle(req, res, parsedUrl);
    });

    const wss = new WebSocketServer({
      noServer: true,
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

    server.on("upgrade", (request, socket, head) => {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const { pathname } = parse(request.url || "");

      if (pathname === "/_next/webpack-hmr") {
        void app.getUpgradeHandler()(request, socket, head);
      }

      if (pathname === "/websockets") {
        wss.handleUpgrade(request, socket, head, (webSocket) => {
          wss.emit("connection", webSocket, request);
        });
      }
    });

    server.listen(port);

    process.on("SIGTERM", () => {
      logger.info("SIGTERM");
      handler.broadcastReconnectNotification();
      wss.close();
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });

    console.log(`> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV}`);
  })
  .then(async () => {
    await onStartAsync();
    await jobGroup.initializeAsync();
    await jobGroup.startAllAsync();
  });
