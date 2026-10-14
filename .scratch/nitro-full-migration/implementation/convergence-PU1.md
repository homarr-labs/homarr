# PU1 — frozen native11 client and query scopes

Implemented only the five allocated source paths from `convergence-PU.md` lines 20–103. Authenticated-read modules remain dormant: no consumers, routes, mounts, bootstrap, identity producers or writers were added. No commands, lint/typecheck, tests, builds, runtime/native/SQL execution, dependency changes or nested agents were run. Compiler/runtime/procedure acceptance is not claimed; coordinator validation remains required.

## Exact source changes

- NEW `apps/nitro/src/client/authenticated-read.ts`: `createAuthenticatedReadBrowserClient(endpoint: string | URL): AuthenticatedReadAssemblyClient`, using the published `@homarr/api/nitro/assembly/authenticated-read-client` type and existing `createBrowserRpcLink`. No DTO, full-client cast, headers or credentials were added. Existing browser transport supplies same-origin POST, same-origin cookies and redirect rejection.
- NEW `apps/nitro/src/query/scope-owner.ts`: mechanically extracted the existing algorithm into `createQueryScopeFamily<TClient extends AnyNestedClient>(family: "expansion" | "authenticated-read"): (queryClient: QueryClient, runtime: ExpansionQueryRuntime) => QueryScopeOwner<TClient>`. Each family closure has a typed owner WeakMap; each owner retains its typed client/scope map and retired-prefix set.
- MODIFY `apps/nitro/src/query/types.ts`: added `QueryScope<TClient extends AnyNestedClient>` with actual `RouterUtils<TClient>` and `QueryScopeOwner<TClient>`. Retained expansion aliases, runtime/identity/state and router-context exports.
- MODIFY `apps/nitro/src/query/scope.ts`: retained `createExpansionQueryScopeOwner(queryClient, runtime)` as the once-instantiated expansion family factory.
- NEW `apps/nitro/src/query/authenticated-read.ts`: frozen exports `AuthenticatedReadQueryScope`, `AuthenticatedReadQueryScopeOwner` and `createAuthenticatedReadQueryScopeOwner(queryClient: QueryClient, runtime: ExpansionQueryRuntime): AuthenticatedReadQueryScopeOwner` from the once-instantiated native11 family. PU2/PU3 may import these exact paths and names.

## Preserved behavior and P1

Expansion retains the exact `homarr:expansion:${JSON.stringify(identity)}` prefix and `homarr-expansion-query-scope` plugin name. Native11 uses `homarr:authenticated-read:${JSON.stringify(identity)}`. Identity copying/freezing, six-field nonempty validation, exact client/owner checks, generated key restrictions, every query/stream/infinite/mutation interceptor, finite-output rejection, browser-only streams, mutation retry=false, captured currentness, immediate retirement, read draining after cancellation and generated-prefix-only cleanup are unchanged. No root QueryClient clear or heterogeneous owner map was introduced.

P1 is enforced before either family's owner lookup by one module-private `WeakMap<QueryClient, ExpansionQueryRuntime>`. A shared QueryClient cannot acquire server and browser owners, including across families; successful ownership records one runtime. Same-runtime families remain separately typed and separately partitioned. This map stores only runtime strings, not erased client/owner objects.

## Read-only API verification

Read `apps/nitro/package.json`, `packages/api/package.json`, the actual authenticated-read assembly/client and installed package manifests/declarations. Declared and installed `@orpc/client` / `@orpc/tanstack-query` are `2.0.0-beta.43`; TanStack React Query is `5.101.2`. Installed exported `.d.mts` declarations confirm `AnyNestedClient`, `createORPCClient<T>`, `RouterUtils<T>`, `RouterUtilsPlugin<T>`, the `createTanstackQueryUtils` alias and existing interceptor contracts. Existing TanStack cancellation/removal/invalidation and mutation-cache APIs were inspected from installed source. Actual assembly contains eleven selected reads and zero writers; the client is its native `RouterClient`, not a handwritten projection.

## Remaining required joins

AH/host must supply the mounted endpoint, admitted server-native client, one shared router QueryClient/runtime and all six genuine cache identity fields: `cacheLifetimeId`, `clientCacheId`, `principalCacheId`, `permissionRevision`, `boardCacheId`, `boardRevision`. Non-board namespace/revisions remain host-defined; no `none`/`0`, user-ID-as-revision, random fallback identity or identity producer was introduced. Server/browser hydration identities must match, and authority replacement requires fresh identities.

Private admission/bootstrap/session/auth services, safe private SSR publication, shell resource production, consumers and route enrollment remain their owners' work. Source staging does not release any hold or grant permission. Native11 still supplies zero write leaves. Coordinator performs focused lint/typecheck after writers freeze; none was executed here.
