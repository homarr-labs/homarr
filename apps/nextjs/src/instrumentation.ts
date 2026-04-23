import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "instrumentation" });

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setGlobalDispatcher } = await import("undici");
    const { UndiciHttpAgent } = await import("@homarr/core/infrastructure/http");
    setGlobalDispatcher(new UndiciHttpAgent());

    const { cleanupSessionsAsync } = await import("./on-start/session-cleanup");
    const { invalidateUpdateCheckerCacheAsync } = await import("./on-start/invalidate-update-checker-cache");
    await cleanupSessionsAsync();
    await invalidateUpdateCheckerCacheAsync();

    const { jobGroup } = await import("@homarr/cron-jobs");
    await jobGroup.initializeAsync();
    await jobGroup.startAllAsync();

    // Start WebSocket server in the same process (eliminates separate wssServer process)
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

    wss.on("connection", (websocket, incomingMessage) => {
      logger.info(`Connection (${wss.clients.size}) ${incomingMessage.method} ${incomingMessage.url}`);
      websocket.once("close", (code, reason) => {
        logger.info(`Disconnected (${wss.clients.size}) ${code} ${reason.toString()}`);
      });
    });

    logger.info("WebSocket server listening on ws://localhost:3001");

    process.on("SIGTERM", () => {
      wss.clients.forEach((ws) => ws.close());
      wss.close();
    });
  }
}
