// logging.js
import winston from 'winston';

// Define your custom log format
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] - ${message}`;
});

// Create a logger instance with your custom format
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  ),
  transports: [new winston.transports.Console()],
});

logger.info('Initialized logger');

console.log = function (...args) {
  logger.info(args.join(' '));
}

console.warn = function (...args) {
  logger.warn(args.join(' '));
}

console.error = function (...args) {
  logger.error(args.join(' '));
}

console.info = function (...args) {
  logger.info(args.join(' '));
}

console.trace = function (...args) {
  logger.info(args.join(' '));
}

console.debug = function (...args) {
  logger.info(args.join(' '));
}

console.log('this is a test');

export default logger;