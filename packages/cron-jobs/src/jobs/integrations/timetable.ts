import SuperJSON from "superjson";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { timetableGetTimetableRequestHandler } from "@homarr/request-handler/timetable";

import type { WidgetComponentProps } from "../../../../widgets";
import { createCronJob } from "../../lib";

const logger = createLogger({ module: "timetableJobs" });

export const timetableJob = createCronJob("timetable", EVERY_5_MINUTES).withCallback(async () => {
  const timetableItems = await db.query.items.findMany({
    where: eq(items.kind, "timetable"),
  });

  const parsedItems = timetableItems.map((item) => ({
    id: item.id,
    options: SuperJSON.parse<WidgetComponentProps<"timetable">["options"]>(item.options),
  }));

  for (const item of parsedItems) {
    if (!item.options.station) continue;

    try {
      const innerHandler = timetableGetTimetableRequestHandler.handler({
        baseUrl: item.options.baseUrl,
        stationId: item.options.station.value,
        limit: 10,
      });
      await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
    } catch (error) {
      logger.error(new ErrorWithMetadata("Failed to update timetable", { id: item.id }, { cause: error }));
    }
  }
});
