import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterUtils } from "@orpc/tanstack-query";
import { CancelledError, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { createPublicIntegrationBrowserClient } from "../client/public-integration";
import type { PublicIntegrationCatalogClient } from "../client/public-integration";
import { resolveBrowserRpcEndpoint } from "../client/rpc-link";

export interface PublicIntegrationQueryBindingOptions {
  readonly endpoint: string | URL;
  readonly queryClient: QueryClient;
}

export interface PublicIntegrationQueryBinding {
  readonly client: PublicIntegrationCatalogClient;
  readonly queryClient: QueryClient;
  readonly orpc: RouterUtils<PublicIntegrationCatalogClient>;
  assertCurrent(): void;
  retire(): Promise<void>;
}

const bindings = new WeakMap<QueryClient, Map<string, PublicIntegrationQueryBinding>>();

export function createPublicIntegrationQueryBinding(
  options: PublicIntegrationQueryBindingOptions,
): PublicIntegrationQueryBinding {
  const endpoint = resolveBrowserRpcEndpoint(options.endpoint);
  const queryClient = options.queryClient;
  const ownerBindings = bindings.get(queryClient) ?? new Map<string, PublicIntegrationQueryBinding>();
  bindings.set(queryClient, ownerBindings);
  const existing = ownerBindings.get(endpoint.href);
  if (existing) {
    existing.assertCurrent();
    return existing;
  }
  const client = createPublicIntegrationBrowserClient(endpoint);
  const prefix = `homarr:public-integration-catalog:${endpoint.href}`;
  let active = true;
  let retirement: Promise<void> | undefined;

  function assertCurrent() {
    if (!active) throw new CancelledError({ revert: true });
  }

  const orpc = createTanstackQueryUtils(client, {
    prefix,
    queryInterceptors: [
      async ({ next, fnContext }) => {
        assertCurrent();
        if (fnContext.client !== queryClient || fnContext.queryKey[0] !== prefix) {
          throw new Error("Public integration queries require their owning QueryClient and generated keys");
        }
        fnContext.signal.throwIfAborted();
        const result = await next();
        fnContext.signal.throwIfAborted();
        assertCurrent();
        return result;
      },
    ],
  });

  const binding: PublicIntegrationQueryBinding = Object.freeze({
    client,
    queryClient,
    orpc,
    assertCurrent,
    retire(): Promise<void> {
      active = false;
      retirement ??= queryClient.cancelQueries({ queryKey: orpc.key() }, { revert: true }).then(() => {
        queryClient.removeQueries({ queryKey: orpc.key() });
        ownerBindings.delete(endpoint.href);
      });
      return retirement;
    },
  });
  ownerBindings.set(endpoint.href, binding);
  return binding;
}

export function usePublicIntegrationKinds(binding: PublicIntegrationQueryBinding, enabled = true) {
  binding.assertCurrent();
  return useQuery(
    binding.orpc.integration.getKinds.queryOptions({ input: undefined, enabled, retry: false }),
    binding.queryClient,
  );
}
