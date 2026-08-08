import { createRequestHandler } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const inner = createRequestHandler<TData, TInput>({ requestAsync: options.requestAsync });
  return inner;
};
