import { EVERY_MINUTE } from "../lib/cron-job/constants";
import { createCronJob } from "../lib/cron-job/creator";
import { queueWorkerAsync } from "../lib/queue/worker";

// This job processes queues, it runs every minute.
export const queuesJob = createCronJob(EVERY_MINUTE).withCallback(async () => {
  await queueWorkerAsync();
});
