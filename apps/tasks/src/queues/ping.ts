import { pingChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createQueue } from "~/lib/queue/creator";

export const pingQueue = createQueue(
  z.object({
    url: z.string(),
  }),
).withCallback(async ({ url }) => {
  await pingChannel.publishAsync({
    url,
    statusCode: 200,
  });
});
