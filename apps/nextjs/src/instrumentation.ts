export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { createLogger } = await import("@homarr/core/infrastructure/logs");
  const logger = createLogger({ module: "instrumentation" });

  const startTasksAsync = async () => {
    try {
      const tasks = await import("@homarr/tasks");
      // Cron run-on-start hooks can perform slow external work. Keep dashboard
      // readiness independent, but never leave the process permanently degraded.
      void tasks.startupPromise.catch((cause: unknown) => {
        logger.error(new Error("Failed to start embedded tasks service", { cause }));
        process.exit(1);
      });
    } catch (cause) {
      const error = new Error("Failed to load embedded tasks service", { cause });
      logger.error(error);
      throw error;
    }
  };

  const startWebsocketAsync = async () => {
    try {
      const websocket = await import("@homarr/websocket");
      // Listening is a bounded local readiness condition and prevents Next from
      // becoming healthy with subscriptions unavailable.
      await websocket.startupPromise;
    } catch (cause) {
      const error = new Error("Failed to start embedded websocket service", { cause });
      logger.error(error);
      throw error;
    }
  };

  await Promise.all([startTasksAsync(), startWebsocketAsync()]);
}
