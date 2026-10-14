import type { PersistenceRuntime } from "./runtime";
import type {
  AuthSessionMutation,
  AuthSessionSqlConfiguration,
  AuthSessionSqlResult,
} from "./runtime-auth-session/contracts";
import type { BoundedTransactionOperation } from "./transaction-gate";

export { AuthSessionSqlPreconditionError } from "./runtime-auth-session/contracts";
export type {
  AuthAccountWitness,
  AuthIdentitySelection,
  AuthLoginEffects,
  AuthLoginIdentity,
  AuthSessionMutation,
  AuthSessionSqlConfiguration,
  AuthSessionSqlResult,
  AuthSessionWitness,
  AuthUserWitness,
} from "./runtime-auth-session/contracts";

export const createAuthSessionSqlRuntime = (runtime: PersistenceRuntime, input: AuthSessionSqlConfiguration) => {
  const lifetime = new AbortController();
  const configuration: AuthSessionSqlConfiguration = Object.freeze({
    lifetime: AbortSignal.any([input.lifetime, lifetime.signal]),
    maximumSnapshotRows: input.maximumSnapshotRows,
    sessionMaxAgeMs: input.sessionMaxAgeMs,
    maximumAbsoluteClockSkewMs: input.maximumAbsoluteClockSkewMs,
    now: input.now,
  });
  const pending = new Set<Promise<AuthSessionSqlResult>>();
  let closing: Promise<void> | undefined;
  const mutateAsync = (
    operation: BoundedTransactionOperation,
    mutation: AuthSessionMutation,
  ): Promise<AuthSessionSqlResult> => {
    configuration.lifetime.throwIfAborted();
    const capturedOperation = Object.freeze({
      signal: operation.signal,
      lifetime: operation.lifetime,
      deadlineAt: operation.deadlineAt,
    });
    const capturedMutation = structuredClone(mutation);
    const task = Promise.resolve().then(() => {
      configuration.lifetime.throwIfAborted();
      return runtime.authSessionMutationAsync(capturedOperation, capturedMutation, configuration);
    });
    pending.add(task);
    void task.then(
      () => pending.delete(task),
      () => pending.delete(task),
    );
    return task;
  };
  return {
    establishAsync(
      operation: BoundedTransactionOperation,
      mutation: Extract<AuthSessionMutation, { kind: "establish" }>,
    ) {
      return mutateAsync(operation, mutation);
    },
    renewAsync(operation: BoundedTransactionOperation, mutation: Extract<AuthSessionMutation, { kind: "renew" }>) {
      return mutateAsync(operation, mutation);
    },
    revokeAsync(operation: BoundedTransactionOperation, mutation: Extract<AuthSessionMutation, { kind: "revoke" }>) {
      return mutateAsync(operation, mutation);
    },
    expireAsync(operation: BoundedTransactionOperation, mutation: Extract<AuthSessionMutation, { kind: "expire" }>) {
      return mutateAsync(operation, mutation);
    },
    closeAsync(): Promise<void> {
      if (closing !== undefined) return closing;
      closing = Promise.allSettled(pending).then(() => undefined);
      lifetime.abort(new Error("Auth session SQL producer closed"));
      return closing;
    },
  };
};

export type AuthSessionSqlRuntime = ReturnType<typeof createAuthSessionSqlRuntime>;
