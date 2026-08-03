export const assistantExecutionPolicy = {
  maxSteps: 32,
  maxOutputTokens: 8_192,
  totalTimeoutMs: 240_000,
  stepTimeoutMs: 60_000,
  toolTimeoutMs: 60_000,
} as const;
