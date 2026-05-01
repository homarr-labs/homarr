import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "websocket" });

export async function initWebSocketServerAsync() {
  const { WebSocketServer } = await import("ws");
  const { applyWSSHandler } = await import("@trpc/server/adapters/ws");
  const { appRouter, createTRPCContext } = await import("@homarr/api/websocket");
  const { getSessionFromToken, sessionTokenCookieName } = await import("@homarr/auth");
  const { parseCookies } = await import("@homarr/common");
  const { db } = await import("@homarr/db");

  const wss = new WebSocketServer({ port: 3001 });

  applyWSSHandler({
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
        return createTRPCContext({ headers: nextHeaders, session });
      } catch (error) {
        logger.error(error);
        return createTRPCContext({ headers: new Headers(), session: null });
      }
    },
    keepAlive: {
      enabled: true,
      pingMs: 30000,
      pongWaitMs: 5000,
    },
  });

  logger.info("WebSocket server listening on ws://localhost:3001");

  process.on("SIGTERM", () => {
    wss.clients.forEach((client) => client.close());
    wss.close();
  });
}
