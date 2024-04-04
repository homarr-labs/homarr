import { createQueueClient } from "./lib/queue/client";
import { testQueue } from "./queues/test";

export const { client, queueRegistry } = createQueueClient({
  // Add your queues here
  test: testQueue,
});
