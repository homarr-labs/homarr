import { z } from "@homarr/validation";

import { createQueue } from "~/lib/queue/creator";

export const testQueue = createQueue(
  z.object({
    id: z.string(),
  }),
).withCallback(({ id }) => {
  console.log(`Test queue with id ${id}`);
});
