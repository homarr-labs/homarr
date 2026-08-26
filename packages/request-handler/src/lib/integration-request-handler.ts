import { createKeyedFingerprint } from "@homarr/common/server";
import type { Modify } from "@homarr/common/types";
import type { Integration, IntegrationSecret } from "@homarr/db/schema";
import type { IntegrationKind } from "@homarr/definitions";
import { invalidateIntegrationResponseCacheAsync } from "@homarr/redis";

import { createIntegrationSharedCacheAsync, hashSharedCacheInput } from "./shared-cache";
import { createRequestHandler } from "./request-handler";
import type { SharedCacheAdapter } from "./request-handler";

type IntegrationOfKind<TKind extends IntegrationKind> = Omit<Integration, "kind"> & {
  kind: TKind;
  decryptedSecrets: Modify<
    Pick<IntegrationSecret, "kind" | "value"> & Partial<Pick<IntegrationSecret, "updatedAt">>,
    { value: string }
  >[];
  externalUrl: string | null;
};

interface Options<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> {
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput, signal: AbortSignal) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  requestTimeoutMs?: number;
  cacheNamespace?: string;
  cacheVersion?: string;
}

const getIntegrationCacheIdentity = <TKind extends IntegrationKind, TInput extends Record<string, unknown>>({
  integration,
  options,
}: {
  integration: IntegrationOfKind<TKind>;
  options: TInput;
}) => {
  const secretRevisions = (integration.decryptedSecrets ?? [])
    .map((secret) => ({
      kind: secret.kind,
      fingerprint: createKeyedFingerprint(JSON.stringify([secret.kind, secret.value])),
      updatedAt: secret.updatedAt?.toISOString(),
    }))
    .toSorted((left, right) => {
      const kindComparison = left.kind.localeCompare(right.kind);
      if (kindComparison !== 0) return kindComparison;
      return left.fingerprint.localeCompare(right.fingerprint);
    });

  return hashSharedCacheInput({
    integration: {
      id: integration.id,
      kind: integration.kind,
      url: integration.url,
      externalUrl: integration.externalUrl,
      secretRevisions,
    },
    options,
  });
};

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  const cacheNamespace = options.cacheNamespace;
  let getSharedCacheAsync:
    | ((
        input: { integration: IntegrationOfKind<TKind>; options: TInput },
        cacheIdentity: string,
      ) => Promise<SharedCacheAdapter<TData>>)
    | undefined;
  if (cacheNamespace) {
    getSharedCacheAsync = async ({ integration }, cacheIdentity) =>
      await createIntegrationSharedCacheAsync({
        namespace: cacheNamespace,
        integrationId: integration.id,
        cacheIdentity,
        cacheVersion: options.cacheVersion,
      });
  }

  const inner = createRequestHandler<TData, { integration: IntegrationOfKind<TKind>; options: TInput }>({
    requestAsync: async ({ integration, options: itemOptions }, signal) =>
      options.requestAsync(integration, itemOptions, signal),
    getCacheKey: getIntegrationCacheIdentity,
    cacheTtlMs: options.cacheTtlMs,
    fallbackToStaleOnError: options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.staleIfErrorTtlMs,
    requestTimeoutMs: options.requestTimeoutMs,
    getSharedCacheAsync,
  });

  return {
    invalidateCache: inner.invalidateCache,
    /** Clears this handler's L1 and every shared response-cache namespace for these integrations. */
    invalidateCacheAsync: async (integrationIds: readonly string[]) => {
      inner.invalidateCache();
      if (!cacheNamespace) return;
      await Promise.all(
        [...new Set(integrationIds)].map(async (integrationId) => {
          await invalidateIntegrationResponseCacheAsync(integrationId);
        }),
      );
    },
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) =>
      inner.handler({ integration, options: itemOptions }),
  };
};
