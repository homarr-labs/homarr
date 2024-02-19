import winston, { format, transports } from "winston";

const logMessageFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    logMessageFormat,
  ),
  transports: [new transports.Console()],
});

export { logger };
