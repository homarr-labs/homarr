import winston from "winston";

const logMessageFormat = winston.format.printf(
  ({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  },
);

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    logMessageFormat,
  ),
  transports: [new winston.transports.Console()],
});
