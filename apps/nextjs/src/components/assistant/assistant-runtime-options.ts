export const assistantAiSdkRuntimeOptions = {
  // Automatic frontend-tool continuations are sends too. Letting assistant-ui cancel every
  // pending tool on send incorrectly turns earlier server tools into user cancellations.
  cancelPendingToolCallsOnSend: false,
} as const;
