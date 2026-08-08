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
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
}

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  const inner = createRequestHandler<TData, { integration: IntegrationOfKind<TKind>; options: TInput }>({
    requestAsync: async ({ integration, options: itemOptions }) => options.requestAsync(integration, itemOptions),
    getCacheKey: ({ integration, options: itemOptions }) =>
      JSON.stringify({ integrationId: integration.id, itemOptions }),
    cacheTtlMs: options.cacheTtlMs,
    fallbackToStaleOnError: options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.staleIfErrorTtlMs,
  });

  return {
    invalidateCache: inner.invalidateCache,
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) =>
      inner.handler({ integration, options: itemOptions }),
  };
};
