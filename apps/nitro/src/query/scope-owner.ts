import type { AnyNestedClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterUtilsPlugin } from "@orpc/tanstack-query";
import { CancelledError } from "@tanstack/react-query";
import type { QueryClient, QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import type {
  ExpansionQueryCacheIdentity,
  ExpansionQueryRuntime,
  ExpansionQueryScopeState,
  QueryScope,
  QueryScopeOwner,
} from "./types";

const runtimes = new WeakMap<QueryClient, ExpansionQueryRuntime>();

function assertGeneratedKey(key: QueryKey | undefined) {
  if (key !== undefined) {
    throw new Error("Query scopes do not accept custom operation keys");
  }
}

async function assertFiniteSnapshot(output: unknown) {
  if (typeof output !== "object" || output === null || !(Symbol.asyncIterator in output)) {
    return;
  }
  if ("return" in output && typeof output.return === "function") {
    await output.return();
  }
  throw new Error("Async iterators require browser liveOptions or streamedOptions");
}

export function createQueryScopeFamily<TClient extends AnyNestedClient>(
  family: "expansion" | "authenticated-read",
): (queryClient: QueryClient, runtime: ExpansionQueryRuntime) => QueryScopeOwner<TClient> {
  const owners = new WeakMap<QueryClient, QueryScopeOwner<TClient>>();

  return function createQueryScopeOwner(
    ownerQueryClient: QueryClient,
    runtime: ExpansionQueryRuntime,
  ): QueryScopeOwner<TClient> {
    const existingRuntime = runtimes.get(ownerQueryClient);
    if (existingRuntime !== undefined && existingRuntime !== runtime) {
      throw new Error("A QueryClient cannot belong to both server and browser scopes");
    }

    const existingOwner = owners.get(ownerQueryClient);
    if (existingOwner) {
      return existingOwner;
    }

    const scopes = new Map<string, { client: TClient; scope: QueryScope<TClient> }>();
    const retiredPrefixes = new Set<string>();

    const owner: QueryScopeOwner<TClient> = Object.freeze({
      queryClient: ownerQueryClient,
      runtime,
      acquire(client: TClient, inputIdentity: ExpansionQueryCacheIdentity) {
        const identity = Object.freeze({
          cacheLifetimeId: inputIdentity.cacheLifetimeId,
          clientCacheId: inputIdentity.clientCacheId,
          principalCacheId: inputIdentity.principalCacheId,
          permissionRevision: inputIdentity.permissionRevision,
          boardCacheId: inputIdentity.boardCacheId,
          boardRevision: inputIdentity.boardRevision,
        });
        if (Object.values(identity).some((value) => value.length === 0)) {
          throw new Error("Query cache partition identifiers must be nonempty");
        }

        const prefix = `homarr:${family}:${JSON.stringify(identity)}`;
        if (retiredPrefixes.has(prefix)) {
          throw new Error("A retired query scope requires a new cache identity");
        }

        const existing = scopes.get(prefix);
        if (existing) {
          if (existing.client !== client) {
            throw new Error("A query cache identity cannot be rebound to another client");
          }
          return existing.scope;
        }

        let state: ExpansionQueryScopeState = "active";
        let retirement: Promise<void> | undefined;
        const pendingQueries = new Set<Promise<unknown>>();

        function assertCurrent() {
          if (state !== "active") {
            throw new CancelledError({ revert: true });
          }
        }

        function assertOwner(queryClient: QueryClient, key: QueryKey | undefined) {
          if (queryClient !== ownerQueryClient || key?.[0] !== prefix) {
            throw new Error("Query operations must use their owning QueryClient and generated keys");
          }
        }

        function runQuery<T>(
          next: () => Promise<T>,
          fnContext: Pick<QueryFunctionContext, "client" | "queryKey" | "signal">,
        ): Promise<T> {
          assertOwner(fnContext.client, fnContext.queryKey);
          assertCurrent();
          fnContext.signal.throwIfAborted();

          const pending: Promise<T> = Promise.resolve().then(async () => {
            try {
              assertCurrent();
              fnContext.signal.throwIfAborted();
              const output = await next();
              await assertFiniteSnapshot(output);
              fnContext.signal.throwIfAborted();
              assertCurrent();
              return output;
            } finally {
              pendingQueries.delete(pending);
            }
          });
          pendingQueries.add(pending);
          return pending;
        }

        function assertBrowserStream() {
          if (runtime !== "browser") {
            throw new Error("Server query scopes require finite snapshot queries, not live streams");
          }
        }

        const scopePolicy: RouterUtilsPlugin<TClient> = {
          name: `homarr-${family}-query-scope`,
          initProcedureOptions: (_path, options) => ({
            ...options,
            queryKey: (optionsIn) => {
              assertGeneratedKey("queryKey" in optionsIn ? optionsIn.queryKey : undefined);
              return optionsIn;
            },
            streamedKey: (optionsIn) => {
              assertGeneratedKey("queryKey" in optionsIn ? optionsIn.queryKey : undefined);
              return optionsIn;
            },
            liveKey: (optionsIn) => {
              assertGeneratedKey("queryKey" in optionsIn ? optionsIn.queryKey : undefined);
              return optionsIn;
            },
            infiniteKey: (optionsIn) => {
              assertGeneratedKey("queryKey" in optionsIn ? optionsIn.queryKey : undefined);
              return optionsIn;
            },
            mutationKey: (optionsIn) => {
              assertGeneratedKey(optionsIn.mutationKey);
              return optionsIn;
            },
            mutationOptions: (optionsIn) => ({ ...optionsIn, retry: false }),
          }),
        };

        const orpc = createTanstackQueryUtils(client, {
          prefix,
          plugins: [scopePolicy],
          queryInterceptors: [({ next, fnContext }) => runQuery(next, fnContext)],
          infiniteInterceptors: [({ next, fnContext }) => runQuery(next, fnContext)],
          streamedInterceptors: [
            ({ next, fnContext }) => {
              assertBrowserStream();
              return runQuery(next, fnContext);
            },
          ],
          liveInterceptors: [
            ({ next, fnContext }) => {
              assertBrowserStream();
              return runQuery(next, fnContext);
            },
          ],
          mutationInterceptors: [
            async ({ next, fnContext }) => {
              assertOwner(fnContext.client, fnContext.mutationKey);
              assertCurrent();
              const output = await next();
              assertCurrent();
              return output;
            },
          ],
        });

        const scope: QueryScope<TClient> = Object.freeze({
          identity,
          runtime,
          queryClient: ownerQueryClient,
          orpc,
          get state() {
            return state;
          },
          isCurrent: () => state === "active",
          assertCurrent,
          async invalidate() {
            assertCurrent();
            await ownerQueryClient.invalidateQueries({ queryKey: orpc.key() });
            assertCurrent();
          },
          retire() {
            if (retirement) return retirement;

            state = "retiring";
            retiredPrefixes.add(prefix);
            scopes.delete(prefix);
            retirement = Promise.resolve().then(async () => {
              await ownerQueryClient.cancelQueries({ queryKey: orpc.key() }, { revert: true });
              await Promise.allSettled(pendingQueries);
              ownerQueryClient.removeQueries({ queryKey: orpc.key() });

              const mutationCache = ownerQueryClient.getMutationCache();
              for (const mutation of mutationCache.findAll({
                mutationKey: orpc.key(),
                exact: false,
              })) {
                if (mutation.state.status !== "pending") mutationCache.remove(mutation);
              }
              state = "retired";
            });
            return retirement;
          },
        });

        scopes.set(prefix, { client, scope });
        return scope;
      },
    });

    runtimes.set(ownerQueryClient, runtime);
    owners.set(ownerQueryClient, owner);
    return owner;
  };
}
