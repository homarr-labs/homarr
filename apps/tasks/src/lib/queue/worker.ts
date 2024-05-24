import { queueChannel } from "@homarr/redis";

import { queueRegistry } from "~/queues";

/**
 * This function reads all the queue executions that are due and processes them.
 * Those executions are stored in the redis queue channel.
 */
export const queueWorkerAsync = async () => {
  const now = new Date();
  const executions = await queueChannel.filterAsync((item) => {
    return item.executionDate < now;
  });
  for (const execution of executions) {
    const queue = queueRegistry.get(execution.name);
    if (!queue) continue;
    await queue.callback(execution.data);
    await queueChannel.markAsDoneAsync(execution._id);
  }
};
