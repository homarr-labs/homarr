import { jobGroup } from "@homarr/cron-jobs";
import { logger } from "@homarr/log";

import { onStartAsync } from "../tasks/src/on-start";

void (async function initializeCronJobs() {
  try {
    await onStartAsync();
    await jobGroup.initializeAsync();
    await jobGroup.startAllAsync();
    logger.info("✅ Cron jobs initialized successfully");
  } catch (error) {
    logger.error(new Error("Failed to initialize cron jobs", { cause: error }));
    throw error;
  }
})();
