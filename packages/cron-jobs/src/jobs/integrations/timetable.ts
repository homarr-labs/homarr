import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { timetableGetTimetableRequestHandler } from "@homarr/request-handler/timetable";

import { createCronJob } from "../../lib";

export const timetableJob = createCronJob("timetable", EVERY_5_MINUTES).withCallback(
  createRequestIntegrationJobHandler(timetableGetTimetableRequestHandler.handler, {
    widgetKinds: ["timetable"],
    getInput: {
      timetable: (options) =>
        options.station
          ? {
              stationId: options.station.value,
              limit: 10,
            }
          : [],
    },
  }),
);
