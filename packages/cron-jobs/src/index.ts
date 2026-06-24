import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { pingJob } from "./jobs/ping";
import { createCronJobGroup } from "./lib";

const getJobGroup = () => {
  return createCronJobGroup({
    analytics: analyticsJob,
    iconsUpdater: iconsUpdaterJob,
    ping: pingJob,
  });
};

declare global {
  var cronJobs: ReturnType<typeof getJobGroup> | undefined;
}

global.cronJobs ??= getJobGroup();

export const jobGroup = global.cronJobs;

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
