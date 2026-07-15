import { createRequestHandler } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => ({
  handler: (widgetOptions: TInput) =>
    createRequestHandler<TData, TInput>({
      requestAsync: options.requestAsync,
      cacheTtlMs: options.cacheTtlMs,
    }).handler(widgetOptions),
});
