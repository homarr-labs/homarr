import type { transport as Transport } from "winston";
import winston, { format, transports } from "winston";

import { env } from "./env";
import { RedisTransport } from "./redis-transport";

/**
 * Formats the cause of an error in the format
 * @example caused by Error: {message}
 * {stack-trace}
 * @param cause next cause in the chain
 * @param iteration current iteration of the function
 * @returns formatted and stacked causes
 */
const formatCause = (cause: unknown, iteration = 0): string => {
  // Prevent infinite recursion
  if (iteration > 5) {
    return "";
  }

  if (cause instanceof Error) {
    if (!cause.cause) {
      return `\ncaused by ${cause.stack}`;
    }

    return `\ncaused by ${cause.stack}${formatCause(cause.cause, iteration + 1)}`;
  }

  return `\ncaused by ${cause as string}`;
};

const logMessageFormat = format.printf(({ level, message, timestamp, cause, stack }) => {
  if (!cause && !stack) {
    return `${timestamp as string} ${level}: ${message as string}`;
  }

  if (!cause) {
    return `${timestamp as string} ${level}: ${message as string}\n${stack as string}`;
  }

  return `${timestamp as string} ${level}: ${message as string}\n${stack as string}${formatCause(cause)}`;
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
