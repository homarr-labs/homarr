export const assistantExecutionPolicy = {
  maxSteps: 40,
  maxRetries: 2,
  maxOutputTokens: 32_768,
  totalTimeoutMs: 240_000,
  stepTimeoutMs: 60_000,
  toolTimeoutMs: 60_000,
} as const;
