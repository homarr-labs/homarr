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

let integrationHandlerCounter = 0;

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  // Stable per handler definition: the inner request handler is re-created on every
  // call, so without an explicit cacheKey each call would get a fresh namespace
  // (no cache hits) — and without any namespace different handlers hitting the same
  // integration with equal options would share cache entries and cross their data.
  const cacheKey = `integration-handler-${integrationHandlerCounter++}`;

  return {
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) => {
      const inner = createRequestHandler<TData, { integrationId: string; options: TInput }>({
        cacheKey,
        requestAsync: async (input) => options.requestAsync(integration, input.options),
      });
      return inner.handler({ integrationId: integration.id, options: itemOptions });
    },
  };
};
