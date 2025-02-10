import winston, { format, transports } from "winston";

import { RedisTransport } from "./redis-transport.mjs";

const logMessageFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logTransports = [new transports.Console()];

// Only add the Redis transport if we are not in CI
if (!(Boolean(process.env.CI) || Boolean(process.env.DISABLE_REDIS_LOGS))) {
  logTransports.push(new RedisTransport());
}

const logger = winston.createLogger({
  format: format.combine(format.colorize(), format.timestamp(), logMessageFormat),
  transports: logTransports,
  level: process.env.LOG_LEVEL || "info",
});

export { logger };
