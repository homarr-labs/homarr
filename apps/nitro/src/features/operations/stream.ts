import { useEffect, useState } from "react";
import { consumeAsyncIterator } from "@orpc/client";

export type OperationsStreamState<T> =
  | { readonly kind: "loading"; readonly value: T }
  | { readonly kind: "live"; readonly value: T }
  | { readonly kind: "closed"; readonly value: T }
  | { readonly kind: "error"; readonly value: T; readonly error: unknown };

export function useOperationsStream<TEvent, TValue>(
  open: (signal: AbortSignal) => Promise<AsyncIterator<TEvent, void>>,
  reduce: (value: TValue, event: TEvent) => TValue,
  empty: TValue,
  enabled: boolean,
  onCleanupError?: (error: unknown) => void,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<OperationsStreamState<TValue>>({ kind: "loading", value: empty });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ kind: enabled ? "loading" : "closed", value: empty });
    if (!enabled) return () => controller.abort();

    const opening = Promise.resolve().then(async () => {
      controller.signal.throwIfAborted();
      const iterator = await open(controller.signal);
      if (active && !controller.signal.aborted) setState({ kind: "live", value: empty });
      return iterator;
    });
    let disposal: Promise<void> | undefined;
    const dispose = () => {
      controller.abort();
      if (disposal) return;
      disposal = cancel();
      void disposal.catch((error: unknown) => onCleanupError?.(error));
    };
    const cancel = consumeAsyncIterator(opening, {
      onEvent(event) {
        if (!active || controller.signal.aborted) return;
        setState((previous) => ({ kind: "live", value: reduce(previous.value, event) }));
      },
      onError(error: unknown) {
        if (active) setState({ kind: "error", value: empty, error });
        controller.abort();
      },
      onSuccess() {
        if (active) setState({ kind: "closed", value: empty });
        controller.abort();
      },
      onFinish: dispose,
    });

    return () => {
      active = false;
      controller.abort();
      setState({ kind: "closed", value: empty });
      dispose();
    };
  }, [open, reduce, empty, enabled, attempt, onCleanupError]);

  return { state, reconnect: () => setAttempt((previous) => previous + 1) };
}
