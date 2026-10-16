export interface Unsubscribable {
  unsubscribe(): void;
}
export interface Observer<T> {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
}
export interface Observable<T, TError = unknown> {
  subscribe(observer: { next(value: T): void; error(error: TError): void; complete(): void }): Unsubscribable;
}

/** Callback event sources shared by the native HTTP streaming procedures. */
export function observable<T>(producer: (observer: Observer<T>) => void | (() => void)): Observable<T> {
  return {
    subscribe(observer) {
      let closed = false;
      let cleanup: void | (() => void);
      let cleaned = false;
      const unsubscribe = () => {
        closed = true;
        if (cleaned || !cleanup) return;
        cleaned = true;
        cleanup();
      };
      try {
        cleanup = producer({
          next(value) {
            if (!closed) observer.next(value);
          },
          error(error) {
            if (closed) return;
            observer.error(error);
            unsubscribe();
          },
          complete() {
            if (closed) return;
            observer.complete();
            unsubscribe();
          },
        });
        if (closed) unsubscribe();
      } catch (error) {
        if (!closed) observer.error(error);
        unsubscribe();
      }
      return { unsubscribe };
    },
  };
}

/** Adapt callback subscriptions to the async iterable used by native oRPC. */
export async function* subscriptionEvents<T>(source: Observable<T, unknown>, signal?: AbortSignal) {
  if (signal?.aborted) return;

  let subscription: Unsubscribable | undefined;
  let closed = false;
  let streamController: ReadableStreamDefaultController<T> | undefined;
  const closeStream = () => {
    if (closed) return;
    closed = true;
    streamController?.close();
    subscription?.unsubscribe();
  };
  const stream = new ReadableStream<T>({
    start(controller) {
      streamController = controller;
      subscription = source.subscribe({
        next(value) {
          if (!closed) controller.enqueue(value);
        },
        error(error) {
          if (closed) return;
          closed = true;
          controller.error(error);
          subscription?.unsubscribe();
        },
        complete: closeStream,
      });
      if (closed) subscription.unsubscribe();
    },
  });
  signal?.addEventListener("abort", closeStream, { once: true });
  if (signal?.aborted) closeStream();

  const reader = stream.getReader();
  try {
    while (true) {
      const event = await reader.read();
      if (event.done) return;
      yield event.value;
    }
  } finally {
    signal?.removeEventListener("abort", closeStream);
    subscription?.unsubscribe();
    // A cancelled HTTP response can interrupt the generator after a yield.
    // Cancel the reader too so queued events are released immediately.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
