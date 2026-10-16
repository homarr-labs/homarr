// Install the opt-in process-wide DNS cache before importing request handlers.
// eslint-disable-next-line import/no-unassigned-import
import "@homarr/core/infrastructure/dns/init";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { jobGroup } from "@homarr/cron-jobs";

import { createBackendApp } from "./app";
import { env } from "./env";

const logger = createLogger({ module: "backendRuntime" });
let ready = false;
const app = createBackendApp({ isReady: () => ready });

const server = Bun.serve({
  hostname: env.BACKEND_HOST,
  port: env.BACKEND_PORT,
  fetch: app.fetch,
  // Preserve the backup import endpoint's 256 MiB archive + multipart allowance.
  maxRequestBodySize: 257 * 1024 * 1024,
  // MCP and assistant streams can remain idle beyond Bun's default timeout.
  idleTimeout: 0,
});

try {
  const tasks = await import("@homarr/tasks");
  await tasks.startupPromise;
  const websocket = await import("@homarr/websocket");
  await websocket.startupPromise;
  ready = true;
  logger.info(`Headless backend listening on ${server.url}`);
} catch (error) {
  logger.error(new Error("Backend startup failed", { cause: error }));
  server.stop(true);
  process.exit(1);
}

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  ready = false;
  logger.info("Stopping backend");
  jobGroup.stopAll();
  server.stop();
  // The WebSocket handler receives SIGTERM too. Bound the drain of active jobs
  // and long-running streams so the container can terminate reliably.
  const timeout = setTimeout(() => process.exit(0), 5000);
  timeout.unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", () => {
  process.kill(process.pid, "SIGTERM");
});
