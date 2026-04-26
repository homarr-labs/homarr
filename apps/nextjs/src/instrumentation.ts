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

    // Idle detection: pause integration cron jobs when no clients are connected
    const IDLE_GRACE_MS = 60_000;
    type JobKey = Parameters<typeof jobGroup.stopAsync>[0];
    const INTEGRATION_JOB_KEYS: JobKey[] = [
      "ping",
      "smartHomeEntityState",
      "mediaServer",
      "mediaOrganizer",
      "downloads",
      "dnsHole",
      "mediaRequestStats",
      "mediaRequestList",
      "rssFeeds",
      "indexerManager",
      "healthMonitoring",
      "mediaTranscoding",
      "minecraftServerStatus",
      "dockerContainers",
      "networkController",
      "firewallCpu",
      "firewallMemory",
      "firewallVersion",
      "firewallInterfaces",
      "refreshNotifications",
      "weather",
      "timetable",
      "tracearr",
    ];

    const { getServerSettingByKeyAsync } = await import("@homarr/db/queries");
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let isIdle = false;

    const pauseIntegrationJobs = async () => {
      if (isIdle) return;
      isIdle = true;
      logger.info("No active clients - pausing integration cron jobs");
      for (const name of INTEGRATION_JOB_KEYS) {
        await jobGroup.stopAsync(name);
      }
    };

    const resumeIntegrationJobs = async () => {
      if (!isIdle) return;
      isIdle = false;
      logger.info("Client connected - resuming integration cron jobs");
      for (const name of INTEGRATION_JOB_KEYS) {
        await jobGroup.startAsync(name);
      }
    };

    const exitProcess = process.exit;
    const scheduleRestart = async () => {
      const { enabled, gracePeriodMinutes } = await getServerSettingByKeyAsync(db, "idleRestart");
      if (!enabled) return;
      restartTimer = setTimeout(() => {
        restartTimer = null;
        logger.info(`No clients for ${gracePeriodMinutes} minutes - restarting process to free memory`);
        exitProcess(0);
      }, gracePeriodMinutes * 60_000);
    };

    // Start idle timer immediately - pause jobs if no client connects within grace period
    idleTimer = setTimeout(() => {
      idleTimer = null;
      void pauseIntegrationJobs();
    }, IDLE_GRACE_MS);
    void scheduleRestart();

    let externalClients = 0;

    const isLocalhost = (address: string | undefined) =>
      address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";

    wss.on("connection", (websocket, incomingMessage) => {
      const remote = incomingMessage.socket.remoteAddress;
      const external = !isLocalhost(remote);
      if (external) externalClients++;
      logger.info(
        `Connection (external=${externalClients}) ${remote} ${incomingMessage.method} ${incomingMessage.url}`,
      );

      if (external) {
        if (idleTimer !== null) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        if (restartTimer !== null) {
          clearTimeout(restartTimer);
          restartTimer = null;
        }
        void resumeIntegrationJobs();
      }

      websocket.once("close", (code, reason) => {
        if (external) externalClients--;
        logger.info(`Disconnected (external=${externalClients}) ${code} ${reason.toString()}`);
        if (external && externalClients === 0) {
          idleTimer = setTimeout(() => {
            idleTimer = null;
            void pauseIntegrationJobs();
          }, IDLE_GRACE_MS);
          void scheduleRestart();
        }
      });
    });

    logger.info("WebSocket server listening on ws://localhost:3001");

    process.on("SIGTERM", () => {
      if (idleTimer !== null) clearTimeout(idleTimer);
      if (restartTimer !== null) clearTimeout(restartTimer);
      wss.clients.forEach((ws) => ws.close());
      wss.close();
    });

    // Periodically hint V8 to collect garbage that accumulates from cron jobs and
    // request handlers. --expose-gc must be set in NODE_OPTIONS for this to work;
    // if not available it is silently skipped.
    if (typeof global.gc === "function") {
      setInterval(
        () => {
          global.gc?.();
        },
        5 * 60 * 1000,
      );
    }
  }
}
