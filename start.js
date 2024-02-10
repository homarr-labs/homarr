import childProcess from "child_process";

import winston from "winston";

const logMessageFormat = winston.format.printf(
  ({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  },
);

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    logMessageFormat,
  ),
  transports: [new winston.transports.Console()],
});

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