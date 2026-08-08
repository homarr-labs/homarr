import type { createPinnedAgent } from "./network-policy";

export const DISPATCHER_CLOSE_GRACE_MS = 1_000;

type CustomWidgetDispatcher = ReturnType<typeof createPinnedAgent>;

export async function closeDispatcher(
  dispatcher: CustomWidgetDispatcher,
  deadlineSignal: AbortSignal,
): Promise<boolean> {
  const cleanupController = new AbortController();
  const timeout = setTimeout(() => cleanupController.abort(), DISPATCHER_CLOSE_GRACE_MS);
  try {
    await abortable(dispatcher.close(), AbortSignal.any([deadlineSignal, cleanupController.signal]));
    return true;
  } catch (error) {
    detachDispatcherDestroy(dispatcher);
    if (cleanupController.signal.aborted && !deadlineSignal.aborted) return false;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function detachDispatcherDestroy(dispatcher: CustomWidgetDispatcher): void {
  try {
    void dispatcher.destroy().catch(() => undefined);
  } catch {
    // Cleanup is best effort after its bounded grace period.
  }
}

function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void operation.catch(() => undefined);
    return Promise.reject(signal.reason ?? createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason ?? createAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function createAbortError(): Error {
  const error = new Error("Operation aborted");
  error.name = "AbortError";
  return error;
}
