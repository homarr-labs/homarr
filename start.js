import childProcess from "child_process";
import { logger } from './packages/log/src/logger-config.js';

const turboProcess = childProcess.exec("turbo dev --parallel");

turboProcess.stdout.on("data", (data) => {
  if (["warn", "warning"].some((prefix) => data.includes(prefix))) {
    logger.warn(data);
  } else {
    logger.info(data);
  }
});

turboProcess.stderr.on("data", (error) => {
  logger.error(error);
});