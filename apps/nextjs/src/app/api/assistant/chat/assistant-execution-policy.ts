export const assistantExecutionPolicy = {
  maxSteps: 32,
  maxOutputTokens: 65_536,
  totalTimeoutMs: 240_000,
  stepTimeoutMs: 60_000,
  toolTimeoutMs: 60_000,
} as const;
