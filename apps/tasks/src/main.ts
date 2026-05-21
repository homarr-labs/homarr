// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./overrides";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { jobGroup } from "@homarr/cron-jobs";
import { handshakeAsync } from "@homarr/redis";

import { onStartAsync } from "./on-start";

const logger = createLogger({ module: "tasks" });

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 500;

const waitForRedisAsync = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await handshakeAsync();
      logger.info("Redis connection established");
      return;
    } catch {
      logger.warn(`Redis not ready, retrying (${attempt}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  logger.error("Redis did not become ready after retries, proceeding anyway");
};

void (async () => {
  await waitForRedisAsync();
  await onStartAsync();
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();
})();
