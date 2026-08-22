import { createRequestHandler } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const inner = createRequestHandler<TData, TInput>(options);
  return inner;
};
