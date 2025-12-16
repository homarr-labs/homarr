import winston from "winston";

import { logsEnv } from "./env";
import { logFormat } from "./format";
import { logTransports } from "./transports";

const logger = winston.createLogger({
  format: logFormat,
  transports: logTransports,
  level: logsEnv.LEVEL,
});

interface DefaultMetadata {
  module: string;
}

export const createLogger = (metadata: DefaultMetadata & Record<string, unknown>) => logger.child(metadata);
export type Logger = winston.Logger;
