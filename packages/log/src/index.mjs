import winston, { format, transports } from "winston";
import { RedisTransport } from "./redis-transport.mjs";

const logMessageFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    logMessageFormat,
  ),
  transports: [new transports.Console(), new RedisTransport()],
});

export { logger };
