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
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput) => Promise<TData>;
}

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => ({
  handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) => {
    const inner = createRequestHandler<TData, { integrationId: string; options: TInput }>({
      requestAsync: async (input) => options.requestAsync(integration, input.options),
    });
    return inner.handler({ integrationId: integration.id, options: itemOptions });
  },
});
