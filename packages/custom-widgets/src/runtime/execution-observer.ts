import type { CustomWidgetRequestResult, CustomWidgetRuntimePort } from "./types";

type QueryIdentity = { previewSessionId?: string; requestId: string };
export type CustomWidgetQueryExecution = QueryIdentity &
  ({ type: "result"; result: CustomWidgetRequestResult } | { type: "error"; error: string });
export type CustomWidgetQueryObserver = (event: CustomWidgetQueryExecution) => void;

/** Observe completed responses without changing JSX data ownership or exposing request inputs. */
export function observeCustomWidgetQueries(
  port: CustomWidgetRuntimePort,
  observer: CustomWidgetQueryObserver | undefined,
  requestFailed: string,
): CustomWidgetRuntimePort {
  if (!observer) return port;
  const run = async (
    identity: QueryIdentity,
    execute: () => Promise<CustomWidgetRequestResult>,
    signal?: AbortSignal,
  ) => {
    try {
      const result = await execute();
      if (!signal?.aborted) observer({ ...identity, type: "result", result });
      return result;
    } catch (error) {
      if (!signal?.aborted) observer({ ...identity, type: "error", error: requestFailed });
      throw error;
    }
  };
  const observed = {
    ...port,
    query: (input, signal) =>
      run(
        { previewSessionId: input.previewSessionId, requestId: input.requestId },
        () => port.query(input, signal),
        signal,
      ),
  } satisfies CustomWidgetRuntimePort;
  const queryNative = port.queryNative;
  if (queryNative)
    observed.queryNative = (input, signal) =>
      run(
        { previewSessionId: input.previewSessionId, requestId: input.nativeId },
        () => queryNative(input, signal),
        signal,
      );
  const subscribeNative = port.subscribeNative;
  if (subscribeNative)
    observed.subscribeNative = (input, onData, onError) => {
      let active = true;
      const identity = { previewSessionId: input.previewSessionId, requestId: input.nativeId };
      const unsubscribe = subscribeNative(
        input,
        (result) => {
          if (!active) return;
          observer({ ...identity, type: "result", result });
          onData(result);
        },
        (error) => {
          if (!active) return;
          observer({ ...identity, type: "error", error: requestFailed });
          onError(error);
        },
      );
      return () => {
        active = false;
        unsubscribe();
      };
    };
  return observed;
}
