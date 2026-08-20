import z from "zod/v4";

export const logLevels = ["error", "warn", "info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

export const loggerMessageSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  message: z.string(),
  level: z.enum(logLevels),
});
export type LoggerMessage = z.infer<typeof loggerMessageSchema>;

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
