// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./overrides";

import { jobGroup } from "@homarr/cron-jobs";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { getTasksRuntimeDiagnostics } from "./diagnostics";
import { onStartAsync } from "./on-start";

const logger = createLogger({ module: "tasksMain" });
const RUNTIME_DIAGNOSTICS_INTERVAL_MS = 60_000;

const scheduleRuntimeDiagnostics = () => {
  setInterval(() => {
    logger.info("Tasks runtime diagnostics", {
      diagnostics: getTasksRuntimeDiagnostics(),
    });
  }, RUNTIME_DIAGNOSTICS_INTERVAL_MS).unref();
};

void (async () => {
  logger.info("Tasks runtime bootstrap started", {
    diagnostics: getTasksRuntimeDiagnostics(),
  });

  await onStartAsync();
  logger.info("Tasks on-start hooks completed", {
    diagnostics: getTasksRuntimeDiagnostics(),
  });

  await jobGroup.initializeAsync();
  logger.info("Cron job group initialized in tasks runtime", {
    diagnostics: getTasksRuntimeDiagnostics(),
  });

  await jobGroup.startAllAsync();
  logger.info("Cron job group started in tasks runtime", {
    diagnostics: getTasksRuntimeDiagnostics(),
    jobs: jobGroup.getKeys(),
  });
  scheduleRuntimeDiagnostics();
})();
