export const createLegacyStatsGuard = () => {
  const pending = new Set<string>();
  const maxPending = 128;
  return {
    async runAsync<T>(integrationId: string, signal: AbortSignal, operation: () => Promise<T>) {
      signal.throwIfAborted();
      if (pending.has(integrationId)) throw new Error("Previous statistics request is still running");
      if (pending.size >= maxPending) throw new Error("Legacy statistics request limit reached");
      pending.add(integrationId);
      try {
        return await operation();
      } finally {
        pending.delete(integrationId);
      }
    },
  };
};
