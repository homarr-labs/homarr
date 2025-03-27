import type { transport as Transport } from "winston";
import winston, { format, transports } from "winston";

import { env } from "./env";
import { formatErrorCause, formatErrorStack } from "./error";
import { formatMetadata } from "./metadata";
import { RedisTransport } from "./redis-transport";

const logMessageFormat = format.printf(({ level, message, timestamp, cause, stack, ...metadata }) => {
  if (!cause && !stack) {
    return `${timestamp as string} ${level}: ${message as string}`;
  }

  const formatedStack = formatErrorStack(stack as string | undefined);

  if (!cause) {
    return `${timestamp as string} ${level}: ${message as string} ${formatMetadata(metadata)}\n${formatedStack}`;
  }

  return `${timestamp as string} ${level}: ${message as string} ${formatMetadata(metadata)}\n${formatedStack}${formatErrorCause(cause)}`;
});

const logTransports: Transport[] = [new transports.Console()];

// Only add the Redis transport if we are not in CI
if (!(Boolean(process.env.CI) || Boolean(process.env.DISABLE_REDIS_LOGS))) {
  logTransports.push(new RedisTransport());
}

const logger = winston.createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.errors({ stack: true, cause: true }),
    logMessageFormat,
  ),
  transports: logTransports,
  level: env.LOG_LEVEL,
});

export { logger };
