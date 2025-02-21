import type { transport as Transport } from "winston";
import winston, { format, transports } from "winston";

import { env } from "./env";
import { RedisTransport } from "./redis-transport";

const logMessageFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp as string} ${level}: ${message as string}`;
});

const logTransports: Transport[] = [new transports.Console()];

// Only add the Redis transport if we are not in CI
if (!(Boolean(process.env.CI) || Boolean(process.env.DISABLE_REDIS_LOGS))) {
  logTransports.push(new RedisTransport());
}

const logger = winston.createLogger({
  format: format.combine(format.colorize(), format.timestamp(), logMessageFormat),
  transports: logTransports,
  level: env.LOG_LEVEL,
});

export { logger };
