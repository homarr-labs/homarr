import { AsyncIteratorClass } from "@orpc/server";

import type { JobStatusRecord, RuntimeTaskStatus } from "@homarr/cron-job-status/runtime";
import type { HomarrJobName } from "@homarr/cron-jobs/runtime";

import type { BackendContext } from "../../context";
import { toBackendError } from "../../errors";
import type { CronJobsProcedureResources } from "./resources";

type StatusStreamState = { kind: "open" } | { kind: "closed" } | { kind: "failed"; error: unknown };

export async function createCronJobsStatusIterator(
  resources: CronJobsProcedureResources,
  context: BackendContext,
  names: readonly HomarrJobName[],
) {
  context.signal.throwIfAborted();
  await resources.assertCurrentAdminAsync(context);
  context.signal.throwIfAborted();
  let state: StatusStreamState = { kind: "open" };
  const failures = new Set<unknown>();
  let pending: { record: JobStatusRecord; consumed: PromiseWithResolvers<void> } | undefined;
  let changed = Promise.withResolvers<void>();
  const registration = Promise.withResolvers<(() => Promise<void>) | undefined>();
  let registrationStarted = false;
  let disposal: Promise<void> | undefined;

  const currentState = (): StatusStreamState => state;

  const wake = () => {
    const previous = changed;
    changed = Promise.withResolvers<void>();
    previous.resolve();
  };

  const release = () => {
    const previous = pending;
    pending = undefined;
    previous?.consumed.resolve();
    wake();
  };

  const fail = (error: unknown) => {
    if (state.kind !== "failed" || state.error !== error) {
      failures.add(error);
      if (failures.size === 1) state = { kind: "failed", error };
      else state = { kind: "failed", error: new AggregateError([...failures], "Cron job status stream failed") };
    }
    release();
  };

  const reportFailure = (error: unknown) => {
    try {
      context.reportError?.(error);
    } catch (reportingError) {
      fail(reportingError);
    }
  };

  const disposeAsync = (): Promise<void> => {
    if (disposal) return disposal;
    if (state.kind === "open") state = { kind: "closed" };
    context.signal.removeEventListener("abort", onAbort);
    release();
    disposal = registration.promise
      .then(async (unsubscribeAsync) => {
        await unsubscribeAsync?.();
      })
      .catch((error: unknown) => {
        fail(error);
        reportFailure(error);
        const current = currentState();
        if (current.kind === "failed") throw current.error;
        throw error;
      });
    return disposal;
  };

  const startDisposal = () => {
    void disposeAsync().catch(fail);
  };

  const onAbort = () => {
    startDisposal();
  };

  const retireAfterFailureAsync = async (error: unknown): Promise<unknown> => {
    fail(error);
    try {
      await disposeAsync();
    } catch (cleanupError) {
      fail(cleanupError);
    }
    const current = currentState();
    if (current.kind === "failed") return current.error;
    return error;
  };

  const iterator = new AsyncIteratorClass<RuntimeTaskStatus, void>(
    async () => {
      try {
        while (true) {
          const current = currentState();
          if (current.kind === "failed") throw current.error;
          if (current.kind === "closed") return { done: true, value: undefined };
          context.signal.throwIfAborted();
          const next = pending;
          if (next) {
            await resources.assertCurrentAdminAsync(context);
            if (currentState().kind !== "open") continue;
            context.signal.throwIfAborted();
            if (pending !== next) continue;
            const { record } = next;
            release();
            return {
              done: false,
              value: {
                name: record.value.name,
                status: record.value.status,
                lastExecutionTimestamp: record.value.lastExecutionTimestamp,
                lastExecutionStatus: record.value.lastExecutionStatus,
              },
            };
          }
          await changed.promise;
          if (currentState().kind !== "open") continue;
          context.signal.throwIfAborted();
          await resources.assertCurrentAdminAsync(context);
          if (currentState().kind !== "open") continue;
          context.signal.throwIfAborted();
        }
      } catch (error) {
        throw toBackendError(await retireAfterFailureAsync(error), context);
      }
    },
    async () => {
      await disposeAsync();
    },
  );

  try {
    context.onDispose(disposeAsync);
    context.signal.addEventListener("abort", onAbort, { once: true });
    void registration.promise.catch(fail);
    if (context.signal.aborted) onAbort();
    if (currentState().kind === "open") {
      context.signal.throwIfAborted();
      registrationStarted = true;
      void Promise.resolve()
        .then(() => {
          if (currentState().kind !== "open") return undefined;
          context.signal.throwIfAborted();
          return resources.status.subscribeAsync(
            names,
            async (record) => {
              try {
                if (currentState().kind !== "open") return;
                context.signal.throwIfAborted();
                await resources.assertCurrentAdminAsync(context);
                if (currentState().kind !== "open") return;
                context.signal.throwIfAborted();
                const consumed = Promise.withResolvers<void>();
                pending = { record, consumed };
                wake();
                await consumed.promise;
                if (currentState().kind !== "open") return;
                context.signal.throwIfAborted();
              } catch (error) {
                fail(error);
                startDisposal();
              }
            },
            (error) => {
              fail(error);
              reportFailure(error);
              startDisposal();
            },
          );
        })
        .then(registration.resolve, (error: unknown) => {
          fail(error);
          registration.reject(error);
        });
    } else {
      registration.resolve(undefined);
    }
    await registration.promise;
    context.signal.throwIfAborted();
    await resources.assertCurrentAdminAsync(context);
    context.signal.throwIfAborted();
    const current = currentState();
    if (current.kind === "failed") throw current.error;
    if (current.kind === "closed") {
      await disposeAsync();
      return iterator;
    }
    resources.logger.info("A tRPC client has connected to the cron job status updates procedure");
  } catch (error) {
    if (!registrationStarted) registration.resolve(undefined);
    throw await retireAfterFailureAsync(error);
  }

  return iterator;
}
