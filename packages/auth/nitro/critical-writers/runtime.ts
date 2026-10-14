import type { BoundedTransactionOperation, PersistenceRuntime } from "@homarr/db/runtime";

import {
  criticalWriterRemainingJoins,
  requireCriticalWriterExecutionJoin,
  snapshotCriticalWriterCandidate,
} from "./contracts";
import type { CriticalWriterCandidate, CriticalWriterRemainingJoin } from "./contracts";
import { runCriticalWriterCandidateAsync } from "./postgresql";
import { runCriticalWriterCandidateSync } from "./sqlite";

export type CriticalWriterCandidatePhase = "admitted" | "executing" | "settled" | "released";

export interface CriticalWriterCandidateAdmission {
  readonly state: {
    readonly phase: CriticalWriterCandidatePhase;
    readonly revocation: "live" | "revoked";
  };
  executeAsync(): Promise<void>;
  revoke(reason: unknown): void;
  releaseAsync(): Promise<void>;
}

export interface CriticalWriterCandidateRuntime {
  readonly phase: "open" | "closing" | "closed";
  readonly execution: {
    readonly kind: "hold";
    readonly remainingJoins: readonly CriticalWriterRemainingJoin[];
  };
  admitCandidate(
    candidate: CriticalWriterCandidate,
    operation: BoundedTransactionOperation,
  ): CriticalWriterCandidateAdmission;
  closeAsync(): Promise<void>;
}

export function createCriticalWriterCandidateRuntime(runtime: PersistenceRuntime): CriticalWriterCandidateRuntime {
  let phase: "open" | "closing" | "closed" = "open";
  let closing: Promise<void> | undefined;
  const lifetime = new AbortController();
  const admissions = new Set<CriticalWriterCandidateAdmission>();

  return {
    get phase() {
      return phase;
    },
    execution: Object.freeze({ kind: "hold", remainingJoins: criticalWriterRemainingJoins }),
    admitCandidate(candidate, operation) {
      requireCriticalWriterExecutionJoin();
      if (phase !== "open") throw new Error("Critical writer candidate runtime is closed to admissions");
      if (!Number.isFinite(operation.deadlineAt)) throw new TypeError("Critical writer deadline must be finite");
      operation.signal.throwIfAborted();
      operation.lifetime.throwIfAborted();
      const prepared = snapshotCriticalWriterCandidate(candidate);
      const revocation = new AbortController();
      const bounded: BoundedTransactionOperation = {
        signal: operation.signal,
        lifetime: AbortSignal.any([operation.lifetime, lifetime.signal, revocation.signal]),
        deadlineAt: operation.deadlineAt,
      };
      let admissionPhase: CriticalWriterCandidatePhase = "admitted";
      let completion: Promise<void> | undefined;
      let release: Promise<void> | undefined;

      const admission: CriticalWriterCandidateAdmission = {
        get state(): CriticalWriterCandidateAdmission["state"] {
          return {
            phase: admissionPhase,
            revocation: bounded.lifetime.aborted || bounded.signal.aborted ? "revoked" : "live",
          };
        },
        executeAsync() {
          if (admissionPhase !== "admitted")
            return Promise.reject(new Error("Critical writer candidate admission is single-use"));
          admissionPhase = "executing";
          completion = (async () => {
            try {
              bounded.signal.throwIfAborted();
              bounded.lifetime.throwIfAborted();
              if (runtime.engine === "sqlite") runCriticalWriterCandidateSync(runtime, bounded, prepared);
              else await runCriticalWriterCandidateAsync(runtime, bounded, prepared);
            } finally {
              admissionPhase = "settled";
            }
          })();
          return completion;
        },
        revoke(reason) {
          revocation.abort(reason);
        },
        releaseAsync() {
          if (release) return release;
          revocation.abort(new Error("Critical writer candidate admission released"));
          const settled =
            completion?.then(
              () => undefined,
              () => undefined,
            ) ?? Promise.resolve();
          admissionPhase = completion ? admissionPhase : "released";
          release = settled.then(() => {
            admissionPhase = "released";
            admissions.delete(admission);
          });
          return release;
        },
      };
      admissions.add(admission);
      return admission;
    },
    closeAsync() {
      if (closing) return closing;
      phase = "closing";
      lifetime.abort(new Error("Critical writer candidate runtime closing"));
      closing = Promise.all([...admissions].map((admission) => admission.releaseAsync())).then(() => {
        phase = "closed";
      });
      return closing;
    },
  };
}
