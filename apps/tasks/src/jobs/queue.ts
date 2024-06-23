import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";

import { createCronJob } from "~/lib/jobs";
import { queueWorkerAsync } from "../lib/queue/worker";

// This job processes queues, it runs every minute.
export const queuesJob = createCronJob("queues", EVERY_MINUTE).withCallback(async () => {
  await queueWorkerAsync();
});
