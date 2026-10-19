// Install the opt-in process-wide DNS cache before importing request handlers.
// eslint-disable-next-line import/no-unassigned-import
import "@homarr/core/infrastructure/dns/init";
// eslint-disable-next-line import/no-unassigned-import
import "./overrides";

import type { startWebSocketServer } from "@homarr/api/websocket-runtime";
import { cleanupSessionsAsync } from "@homarr/auth/session-cleanup";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createCronJobRuntime } from "@homarr/cron-jobs/runtime";

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

const jobs = createCronJobRuntime();
let websocket: ReturnType<typeof startWebSocketServer> | undefined;
try {
  await cleanupSessionsAsync();
  await jobs.startAsync();
  const { startWebSocketServer } = await import("@homarr/api/websocket-runtime");
  websocket = startWebSocketServer();
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
  jobs.stop();
  websocket?.stop();
  server.stop();
  // Bound the drain of active jobs and long-running streams.
  const timeout = setTimeout(() => process.exit(0), 5000);
  timeout.unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", () => {
  process.kill(process.pid, "SIGTERM");
});
