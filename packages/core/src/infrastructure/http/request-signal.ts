import { AsyncLocalStorage } from "node:async_hooks";

// Scope a deadline to one operation without changing unrelated users of shared clients.
const requestSignal = new AsyncLocalStorage<AbortSignal>();

export const withHttpRequestSignalAsync = async <T>(signal: AbortSignal, operation: () => Promise<T>) => {
  signal.throwIfAborted();
  return await requestSignal.run(signal, operation);
};

export const getHttpRequestSignal = (signal?: AbortSignal | null) => {
  const scoped = requestSignal.getStore();
  if (!scoped) return signal ?? undefined;
  if (!signal || signal === scoped) return scoped;
  return AbortSignal.any([scoped, signal]);
};
