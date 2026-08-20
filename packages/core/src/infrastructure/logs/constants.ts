export const logLevels = ["error", "warn", "info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

export interface LoggerMessage {
  id: string;
  timestamp: Date;
  message: string;
  level: LogLevel;
}

export const LOG_HISTORY_MAX_ENTRIES = 5_000;
export const LOG_HISTORY_KEY = "list:logging:history";
export const LOG_PUBLISH_CHANNEL = "pubSub:logging";

export const logLevelConfiguration = {
  error: {
    prefix: "🔴",
  },
  warn: {
    prefix: "🟡",
  },
  info: {
    prefix: "🟢",
  },
  debug: {
    prefix: "🔵",
  },
} satisfies Record<LogLevel, { prefix: string }>;
