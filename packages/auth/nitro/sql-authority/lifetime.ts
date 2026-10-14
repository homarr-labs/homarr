import type { SqlAuthorityOperation } from "./contracts";
import { SqlAuthorityError } from "./contracts";

export function createAuthorityLifetime(parent: AbortSignal, closedCode: "AUTHORITY_CLOSED" | "AUTHORITY_RELEASED") {
  const controller = new AbortController();
  const lifetime = AbortSignal.any([parent, controller.signal]);
  const pending = new Set<Promise<unknown>>();
  let closing: Promise<void> | undefined;

  function check(operation: SqlAuthorityOperation) {
    if (lifetime.aborted) throw new SqlAuthorityError(closedCode);
    if (!Number.isFinite(operation.deadlineAt)) throw new SqlAuthorityError("INVALID_OPERATION");
    if (operation.signal.aborted || Date.now() >= operation.deadlineAt) {
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    }
  }

  return {
    lifetime,
    check,
    runAsync<T>(operation: SqlAuthorityOperation, work: () => Promise<T>): Promise<T> {
      check(operation);
      const promise = Promise.resolve().then(async () => {
        check(operation);
        return work();
      });
      pending.add(promise);
      const settled = promise.finally(() => pending.delete(promise));
      return settled;
    },
    closeAsync(): Promise<void> {
      if (closing) return closing;
      controller.abort();
      closing = Promise.allSettled([...pending]).then(() => undefined);
      return closing;
    },
  };
}
