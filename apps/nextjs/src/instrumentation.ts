import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "instrumentation" });

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const services = [
    { name: "tasks", start: () => import("@homarr/tasks") },
    { name: "websocket", start: () => import("@homarr/websocket") },
  ];
  const results = await Promise.allSettled(services.map(({ start }) => start()));

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      logger.error(
        new Error(`Failed to start embedded ${services[index]?.name ?? "unknown"} service`, { cause: result.reason }),
      );
    }
  }
}
