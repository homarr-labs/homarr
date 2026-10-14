import { AsyncIteratorClass, ORPCError } from "@orpc/server";

import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { LogHistoryStream } from "@homarr/core/infrastructure/logs/runtime";
import type {
  LogAuthorizer,
  LogHistoryBacking,
  LogStreamClose,
  LogSubscription,
  LogSubscriptionEvent,
} from "@homarr/core/infrastructure/logs/runtime";

import type { AuthenticatedBackendContext } from "../../context";
import { toBackendError } from "../../errors";
import type { LogProcedureLease, LogProcedureResources } from "./resources";

interface PendingLogDelivery {
  readonly event: LogSubscriptionEvent;
  readonly resumed: ReturnType<typeof Promise.withResolvers<void>>;
}

export function createLogSubscriptionIterator(
  resources: LogProcedureResources,
  context: AuthenticatedBackendContext,
  levels: readonly LogLevel[],
  procedureSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const signal = AbortSignal.any(
    procedureSignal ? [context.signal, procedureSignal, controller.signal] : [context.signal, controller.signal],
  );
  const pending = new Set<Promise<unknown>>();
  let changed = Promise.withResolvers<void>();
  let delivery: PendingLogDelivery | undefined;
  let delivered: PendingLogDelivery | undefined;
  let closed: LogStreamClose | undefined;
  let lease: LogProcedureLease | undefined;
  let authorizer: LogAuthorizer | undefined;
  let subscription: LogSubscription | undefined;
  let initialization: Promise<void>;
  let cleanup: Promise<void> | undefined;

  const track = <T>(operation: Promise<T>): Promise<T> => {
    pending.add(operation);
    void operation.then(
      () => pending.delete(operation),
      () => pending.delete(operation),
    );
    return operation;
  };
  const notify = () => {
    changed.resolve();
    changed = Promise.withResolvers<void>();
  };
  const close = (reason: LogStreamClose) => {
    if (closed) return;
    closed = reason;
    delivery?.resumed.resolve();
    delivered?.resumed.resolve();
    delivery = undefined;
    delivered = undefined;
    notify();
    controller.abort(reason);
    subscription?.dispose();
  };
  const cleanupAsync = () => {
    if (cleanup) return cleanup;
    cleanup = Promise.resolve().then(async () => {
      signal.removeEventListener("abort", onAbort);
      close({ type: "disposed" });
      subscription?.dispose();
      await initialization;
      while (pending.size > 0) await Promise.allSettled([...pending]);
      await lease?.releaseAsync();
    });
    return cleanup;
  };
  const startCleanup = () => {
    void cleanupAsync().catch((error: unknown) => context.reportError?.(error));
  };
  const onAbort = () => {
    close({ type: "aborted", reason: signal.reason });
    startCleanup();
  };

  initialization = Promise.resolve()
    .then(async () => {
      signal.throwIfAborted();
      const scope = await resources.acquireAsync(context, signal);
      lease = scope;
      signal.throwIfAborted();
      if (scope.principal.user.id !== context.principal.user.id) throw new ORPCError("UNAUTHORIZED");

      authorizer = {
        revoked: scope.authorizer.revoked,
        requirePermissionAsync: (permission, authoritySignal) =>
          track(scope.authorizer.requirePermissionAsync(permission, authoritySignal)),
      };
      const backing: LogHistoryBacking = {
        appendAndPublishAsync: (message, maxEntries, operation) =>
          track(scope.backing.appendAndPublishAsync(message, maxEntries, operation)),
        readNewestAsync: (maxEntries, operation) => track(scope.backing.readNewestAsync(maxEntries, operation)),
        subscribeAsync: (callback, operation) =>
          track(
            Promise.resolve().then(async () => {
              const release = await scope.backing.subscribeAsync(callback, operation);
              let released = false;
              const unsubscribe = () => {
                if (released) return;
                released = true;
                release();
              };
              try {
                if (operation.signal.aborted) {
                  unsubscribe();
                  return unsubscribe;
                }
                scope.logger.info("A tRPC client has connected to the logging procedure");
                return unsubscribe;
              } catch (error) {
                unsubscribe();
                throw error;
              }
            }),
          ),
      };

      subscription = new LogHistoryStream(backing).subscribe({
        authorizer,
        signal,
        levels,
        observer: {
          nextAsync: (event, deliverySignal) =>
            track(
              Promise.resolve().then(async () => {
                deliverySignal.throwIfAborted();
                if (closed) return;
                const next = { event, resumed: Promise.withResolvers<void>() };
                delivery = next;
                notify();
                await next.resumed.promise;
                deliverySignal.throwIfAborted();
              }),
            ),
          closed: (reason) => {
            close(reason);
            startCleanup();
          },
        },
      });
      await subscription.readyAsync;
    })
    .catch((error: unknown) => {
      close({ type: "error", error });
      startCleanup();
    });

  const iterator = new AsyncIteratorClass<LogSubscriptionEvent, void>(async () => {
    delivered?.resumed.resolve();
    delivered = undefined;
    try {
      for (;;) {
        if (closed) {
          if (closed.type === "error") throw closed.error;
          return { done: true, value: undefined };
        }
        const next = delivery;
        if (next && authorizer) {
          const authoritySignal = AbortSignal.any([signal, authorizer.revoked]);
          authoritySignal.throwIfAborted();
          await authorizer.requirePermissionAsync("other-view-logs", authoritySignal);
          if (closed) continue;
          authoritySignal.throwIfAborted();
          delivery = undefined;
          delivered = next;
          return { done: false, value: next.event };
        }
        await changed.promise;
      }
    } catch (error) {
      throw toBackendError(error, context);
    }
  }, cleanupAsync);

  signal.addEventListener("abort", onAbort, { once: true });
  context.onDispose(cleanupAsync);
  if (signal.aborted) onAbort();
  return iterator;
}
