import { createQueueClient } from "./lib/queue/client";
import { pingQueue } from "./queues/ping";
import { testQueue } from "./queues/test";

export const { client, queueRegistry } = createQueueClient({
  // Add your queues here
  test: testQueue,
  ping: pingQueue,
});
