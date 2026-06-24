import type { WidgetKind } from "@homarr/definitions";

import { createRequestHandler } from "./request-handler";

interface Options<TData, TKind extends WidgetKind, TInput extends Record<string, unknown>> {
  queryKey: string;
  requestAsync: (input: TInput) => Promise<TData>;
  retry?: { attempts?: number; delayMs?: number };
  isValid?: (data: TData) => boolean;
  widgetKind: TKind;
}

export const createWidgetRequestHandler = <TData, TKind extends WidgetKind, TInput extends Record<string, unknown>>(
  options: Options<TData, TKind, TInput>,
) => {
  return {
    handler: (widgetOptions: TInput) =>
      createRequestHandler<TData, TInput>({
        queryKey: options.queryKey,
        requestAsync: options.requestAsync,
        retry: options.retry,
        isValid: options.isValid,
      }).handler(widgetOptions),
  };
};
