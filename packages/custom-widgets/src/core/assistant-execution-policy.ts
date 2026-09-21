export const assistantExecutionPolicy = {
  maxSteps: 40,
  maxRetries: 2,
  maxOutputTokens: 32_768,
  totalTimeoutMs: 600_000,
  stepTimeoutMs: 90_000,
  toolTimeoutMs: 90_000,
} as const;
