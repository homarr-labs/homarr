import { createRequestHandler } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  queryKey: string;
  requestAsync: (input: TInput) => Promise<TData>;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => ({
  handler: (widgetOptions: TInput) =>
    createRequestHandler<TData, TInput>({
      queryKey: options.queryKey,
      requestAsync: options.requestAsync,
    }).handler(widgetOptions),
});
