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
) => {
  const integrationMap = new Map<string, IntegrationOfKind<TKind>>();
  const inner = createRequestHandler<TData, { integrationId: string; options: TInput }>({
    requestAsync: async (input) => {
      const integration = integrationMap.get(input.integrationId);
      if (!integration) {
        throw new Error(`Integration ${input.integrationId} not found in cache`);
      }
      return options.requestAsync(integration, input.options);
    },
  });

  return {
    invalidateCache: inner.invalidateCache,
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) => {
      integrationMap.set(integration.id, integration);
      return inner.handler({ integrationId: integration.id, options: itemOptions });
    },
  };
};
