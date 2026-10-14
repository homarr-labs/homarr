import { BackupError } from "../contracts";

import { BackupJoinError } from "./contracts";

export function createBackupJoinLifetime(maximumActiveOperations: number, parent: AbortSignal) {
  if (!Number.isSafeInteger(maximumActiveOperations) || maximumActiveOperations < 1)
    throw new BackupJoinError("invalid-configuration");

  const controller = new AbortController();
  const signal = AbortSignal.any([parent, controller.signal]);
  const pending = new Set<Promise<unknown>>();
  let closing: Promise<void> | undefined;
  let cleanupFailed = false;

  function assertOpen() {
    if (signal.aborted || closing) throw new BackupJoinError("closed");
  }

  function assertActive(operationSignal: AbortSignal) {
    if (operationSignal.aborted) throw new BackupError("cancelled");
    assertOpen();
  }

  function runAsync<T>(requestSignal: AbortSignal | undefined, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    assertOpen();
    if (pending.size >= maximumActiveOperations) throw new BackupJoinError("busy");
    const operationSignal = requestSignal ? AbortSignal.any([signal, requestSignal]) : signal;
    assertActive(operationSignal);
    const operation = Promise.resolve().then(async () => {
      assertActive(operationSignal);
      return work(operationSignal);
    });
    pending.add(operation);
    void operation.then(
      () => pending.delete(operation),
      (error: unknown) => {
        pending.delete(operation);
        if (error instanceof BackupError && error.code === "cleanup-failed") {
          cleanupFailed = true;
          controller.abort();
        }
      },
    );
    return operation;
  }

  function closeAsync(): Promise<void> {
    if (closing) return closing;
    controller.abort();
    closing = Promise.allSettled([...pending]).then(() => {
      if (cleanupFailed) throw new BackupError("cleanup-failed");
    });
    return closing;
  }

  return {
    assertOpen,
    assertActive,
    runAsync,
    closeAsync,
    get phase(): "open" | "closing" | "closed" | "failed" {
      if (cleanupFailed) return "failed";
      if (!signal.aborted && !closing) return "open";
      return pending.size === 0 ? "closed" : "closing";
    },
  };
}
