import childProcess from "child_process";
import { logger } from './packages/log/src/logger-config.mjs';

console.error = (err) => {
  logger.error(err);
}

const turboProcess = childProcess.exec("turbo dev --parallel");

turboProcess.stdout.on("data", (data) => {
  console.log('this is some data: ', data)
  if (["warn", "warning"].some((prefix) => data.includes(prefix))) {
    logger.warn(data);
  } else {
    logger.info(data);
  }
});
turboProcess.stderr.on('error', (error) => {
  logger.error(error);
  console.log('here are the errors 0')
});

turboProcess.stdout.on('error', (error) => {
  logger.error(error);
  console.log('here are the errors 1')
});

turboProcess.on('error', (err) => {
  logger.error(err);
  console.log('here are the errors 2')
});

turboProcess.stderr.on("data", (error) => {
  logger.error(error);
  console.log('here are the errors 3')
});