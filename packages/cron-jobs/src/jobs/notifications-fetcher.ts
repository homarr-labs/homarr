import {createCronJob} from "../lib";
import {EVERY_HOUR} from "@homarr/cron-jobs-core/expressions";

export const notificationsFetcherJob = createCronJob("notifications-fetcher", EVERY_HOUR, {
  runOnStart: true
}).withCallback(async () => {

});