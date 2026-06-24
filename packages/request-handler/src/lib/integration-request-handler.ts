import type { Modify } from "@homarr/common/types";
import type { Integration, IntegrationSecret } from "@homarr/db/schema";
import type { IntegrationKind } from "@homarr/definitions";

import { createRequestHandler } from "./request-handler";

type IntegrationOfKind<TKind extends IntegrationKind> = Omit<Integration, "kind"> & {
  kind: TKind;
  decryptedSecrets: Modify<Pick<IntegrationSecret, "kind" | "value">, { value: string }>[];
  externalUrl: string | null;
};

interface Options<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> {
  queryKey: string;
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput) => Promise<TData>;
  retry?: { attempts?: number; delayMs?: number };
  isValid?: (data: TData) => boolean;
}

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  return {
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) =>
      createRequestHandler<TData, { options: TInput; integration: IntegrationOfKind<TKind> }>({
        queryKey: options.queryKey,
        requestAsync: async (input) => options.requestAsync(input.integration, input.options),
        retry: options.retry,
        isValid: options.isValid,
      }).handler({ options: itemOptions, integration }),
  };
};
