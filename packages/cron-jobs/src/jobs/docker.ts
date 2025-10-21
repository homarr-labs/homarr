import SuperJSON from "superjson";

import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import { dockerContainersRequestHandler } from "@homarr/request-handler/docker";

import type { WidgetComponentProps } from "../../../widgets";
import { createCronJob } from "../lib";

export const dockerContainersJob = createCronJob("dockerContainers", EVERY_MINUTE).withCallback(async () => {
  const dockerItems = await db.query.items.findMany({
    where: eq(items.kind, "dockerContainers"),
  });

  await Promise.allSettled(
    dockerItems.map(async (item) => {
      try {
        const options = SuperJSON.parse<WidgetComponentProps<"dockerContainers">["options"]>(item.options);
        const innerHandler = dockerContainersRequestHandler.handler(options);
        await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
      } catch (error) {
        logger.error(new Error(`Failed to update Docker container status id=${item.id}`, { cause: error }));
      }
    }),
  );
});
