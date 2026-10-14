# Stack adapter API prerequisites

Research snapshot: 2026-10-11. Documentation only; no manifests, lockfile, runtime code, installation, application execution, listeners, checks, or tests changed/run. The parent session's Context7 resolver attempts returned `Monthly quota`; no authentication, quota workaround, or repeated resolver attempt was used here. Evidence is public official documentation/package metadata and read-only installed declarations/source. Current documentation is not necessarily the installed prerelease API.

## 1. Installed and declared dependency facts

The following facts agree between `apps/nitro/package.json`, relevant `bun.lock` workspace/package nodes, and installed `node_modules/<package>/package.json` unless explicitly noted.

| Package                                                                             | Version / declaration                                                                                               | Consequence                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@orpc/client`, `@orpc/server`                                                      | `2.0.0-beta.43`; directly declared in `apps/nitro` and `packages/api`                                               | Keep this family frozen; do not substitute v1 examples.                                                                                                                                         |
| `@orpc/tanstack-query`                                                              | Installed and locked `2.0.0-beta.43`; declared only in `apps/nitro-experiment`                                      | **Missing direct declaration in `apps/nitro`.** Hoisting is not ownership. The frontend adapter owner must declare this exact version later, after the manifest freeze is released.             |
| `@orpc/contract`, `@orpc/openapi`, `@orpc/json-schema`, `@orpc/zod`, `@orpc/shared` | Locked beta.43 family; experiment directly declares the first four; adapter has exact beta.43 internal dependencies | No need to directly declare these just to consume a type-only router-client export and the Query adapter. Declare them in an owner only if it actually imports them.                            |
| `@tanstack/react-query`, `@tanstack/query-core`                                     | Installed/locked `5.101.2`; React Query is directly declared in `apps/nitro`, core is its exact dependency          | oRPC adapter peer `@tanstack/query-core >=5.89.0` is satisfied. Core is not directly declared in `apps/nitro`; declare it there only for an explicit core import/peer-ownership policy.         |
| `@tanstack/react-router`                                                            | Installed/locked/direct `1.168.8`; depends on Router Core `1.168.7`                                                 | Use installed SSR subpath declarations, not newer signatures.                                                                                                                                   |
| `@tanstack/router-plugin`                                                           | Installed/locked/direct dev dependency `1.167.7`                                                                    | Router peer `^1.168.5` accepts `1.168.8`; Vite peer alternatives `>=5.0.0`, `>=6.0.0`, `>=7.0.0` accept `8.1.4`.                                                                                |
| `react`, `react-dom`                                                                | Installed/locked/direct `19.2.7`                                                                                    | Satisfy Router peer alternatives `>=18.0.0`, `>=19.0.0`, and React Query's React peer alternatives `^18`, `^19`.                                                                                |
| `nitro`                                                                             | Installed/locked/direct `3.0.260903-beta`                                                                           | Exports `nitro/storage`, **not `nitro/kv`**. Installed configuration has `storage` and `devStorage`, not the current documented `kv` replacement.                                               |
| `unstorage`                                                                         | Installed/locked `2.0.0-alpha.10`, Nitro dependency `^2.0.0-alpha.10`; no direct app/package declaration found      | `nitro/storage` needs no direct unstorage import. A later owner importing `unstorage` types or drivers must declare this exact installed version; do not rely on Nitro's transitive dependency. |
| `ocache`                                                                            | Installed/locked `0.3.0`, Nitro dependency                                                                          | Consume `nitro/cache`; no direct ocache declaration needed without a direct import.                                                                                                             |
| `vite`                                                                              | Installed/locked/direct dev dependency `8.1.4`                                                                      | Nitro metadata declares Vite `^7` or `^8` compatible. This is metadata compatibility, not a successful build claim.                                                                             |

`apps/backend/package.json` does not exist in this snapshot. It is a proposed workspace, not an existing server or a dependency available to import.

### Optional dedicated Router–Query SSR package

Neither `@tanstack/react-router-ssr-query` nor `@tanstack/router-ssr-query-core` is installed, declared in app/package manifests, or present in `bun.lock`.

- Published metadata for [`@tanstack/react-router-ssr-query@1.166.12`](https://registry.npmjs.org/@tanstack%2freact-router-ssr-query/1.166.12) declares Query/Core peers `>=5.90.0`, Router `>=1.127.0`, React/React DOM `>=18.0.0 || >=19.0.0`. These ranges accept the installed frontend versions. It depends exactly on [`router-ssr-query-core@1.168.0`](https://registry.npmjs.org/@tanstack%2frouter-ssr-query-core/1.168.0), whose Query Core and Router Core peers are `>=5.90.0` and `>=1.127.0`, also satisfied.
- Published [`react-router-ssr-query@1.167.3`](https://registry.npmjs.org/@tanstack%2freact-router-ssr-query/1.167.3) instead requires Query/Core `>=5.102.0` and Router `>=1.170.33`: **incompatible with the frozen family**. Do not install `latest` or assume similarly numbered package versions are interchangeable.
- Official [upstream React integration source](https://raw.githubusercontent.com/TanStack/router/main/packages/react-router-ssr-query/src/index.tsx) exposes `setupRouterSsrQueryIntegration({ router, queryClient, wrapQueryClient? })`, delegates to the core integration, and adds `QueryClientProvider` unless `wrapQueryClient: false`.
- The compatible candidate's installed declarations/source cannot be verified because it is absent. Peer compatibility is not runtime certification. If the dedicated package is chosen, its frontend owner must later explicitly declare/install the compatible exact version and inspect that installed artifact before implementing this helper. No installation was performed here.

The already installed, officially documented Router `dehydrate`/`hydrate` integration below is implementable without that additional dependency. Choose one SSR integration owner, not both simultaneously.

## 2. Actual oRPC TanStack Query adapter seam

Sources: [Query integration](https://orpc.dev/docs/integrations/tanstack-query), [client-side clients](https://orpc.dev/docs/client/client-side), [RPC Link](https://orpc.dev/docs/rpc/link); installed `@orpc/tanstack-query/dist/index.{d.mts,mjs}` and `@orpc/client/dist/adapters/fetch/index.{d.mts,mjs}`.

Use the actual adapter, not handwritten `{ queryKey, queryFn }` wrappers around RPC calls:

1. Browser transport: `RPCLink` from `@orpc/client/fetch`, configured with the existing handler's exact URL prefix. Omit `origin` for same-origin browser calls. `createORPCClient<ClientType>(link)` comes from `@orpc/client`.
2. Typed adapter: `createTanstackQueryUtils(client, { prefix })` from `@orpc/tanstack-query`; beta.43 exports this as an alias of `createRouterUtils`. `prefix` is a string. Build one stable utility tree per appropriate client/cache scope, not a replacement adapter framework.
3. Components and loaders share the same `utils.<procedure>.queryOptions({ input, ...options })`. Mutations use `utils.<procedure>.mutationOptions({ onSuccess, ...options })` with input supplied to `mutate(input)`, not pre-bound as query input.
4. Cache operations use adapter-generated keys: `.key()` for partial matching, `.queryKey({ input })` for the full ordinary-query key, `.mutationKey()` for mutation identity. Invalidation uses `queryClient.invalidateQueries({ queryKey: utils.<scope>.key() })`; exact writes use `setQueryData(utils.<procedure>.queryKey({ input }), updater)`.
5. beta.43 keys consist of optional prefix, procedure path, and operation metadata (`input`, `type`, and streaming/infinite function options where applicable). **Client context is excluded from keys.** Use a non-secret scope identity and cache lifecycle isolation for principal/board/permission changes; never put tokens, credentials, or sensitive context in keys or dehydration. Do not preserve competing handcrafted key namespaces for the same procedures.

### Cancellation and streams

- Installed `.queryOptions` passes TanStack Query's `fnContext.signal` into the procedure call. Installed fetch transport forwards the signal in `RequestInit`. Any custom fetch must preserve that `init`; replacing it loses cancellation and protocol headers/body.
- `queryClient.cancelQueries` can cancel Query-owned requests. Router loader `abortController` is a distinct lifecycle; `ensureQueryData` does **not** automatically connect it to Query's signal. Do not claim route-abort cancellation or broadly cancel a shared query whenever one route exits.
- Installed `.mutationOptions` calls the procedure with client context but does not supply an automatic query-style signal. Do not claim mutations inherit query cancellation or become safe to retry.
- `.streamedOptions` accumulates event arrays; `.liveOptions` keeps the latest event. Both require an `AsyncIteratorObject` output. Streamed `queryFnOptions` has `refetchMode: 'reset' | 'append' | 'replace'` and `maxChunks`; `.streamedKey`, `.liveKey`, `.infiniteKey`, and `.infiniteOptions` are distinct adapter APIs. Infinite input is a page-param function.
- The official oRPC SSR guidance warns that never-ending streams can block prefetch forever. Minimal seam: SSR-load a finite snapshot query and start live/streamed queries in the browser. If streaming SSR is explicitly selected later, cancel server streams after a successful snapshot as documented, dehydrate that snapshot, and reopen the browser stream with scoped `refetchOnMount: 'always'`. Do not introduce global retry or global forced-refetch behavior merely for streams.

The existing `packages/api/src/nitro/assembly/client.ts` exports only `ExpansionApiAssemblyClient` and uses only type imports. It is evidence for a type-only seam, not permission to import router implementations into browser code. Browser adapters must consume an `import type` client contract; all API assembly, providers, authorization, storage and backend imports remain server-only. If a separate browser-contract package is introduced, it must first receive explicit exports and dependency declarations; none is assumed to exist here.

## 3. Router navigation, loaders, and Query SSR

Sources: [external data loading](https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading), [data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading), [SSR](https://tanstack.com/router/latest/docs/framework/react/guide/ssr); installed Router Core `src/router.ts`, React Router `dist/esm/ssr/*.d.ts`, Query Core `src/queryClient.ts`.

- Use Router `Link`, `useNavigate`/`router.navigate`, validated search, typed params, and `loaderDeps` for search fields that actually affect data. `defaultPreload: 'intent'` coordinates link preloading. No parallel raw-anchor/navigation layer for internal routes.
- Inject `{ queryClient, orpc }` into typed Router context. Set **`defaultPreloadStaleTime: 0`** so settled Router preloads delegate freshness to Query rather than retaining an independent preload-freshness window.
- A critical route loader returns/awaits `context.queryClient.ensureQueryData(context.orpc.<procedure>.queryOptions({ input }))`. The route component uses `useQuery`/`useSuspenseQuery` with the same adapter options. Preloads therefore warm the same Query cache used for rendering. Noncritical queries may use `prefetchQuery`, without claiming they block navigation.
- Installed Query `5.101.2` implements `ensureQueryData`: missing data calls `fetchQuery`; existing data is returned, even when stale. `revalidateIfStale: true` starts background prefetch, not blocking freshness. If a route requires a fresh authorization-sensitive result, choose a deliberate freshness/invalidation policy or `fetchQuery`, not an undocumented assumption about `ensureQueryData`. Current website examples using `queryClient.query` are not evidence that the installed version exposes it.
- Every SSR request needs its own Router, QueryClient and request-authorized RPC client/utilities. The browser has its own stable instances. Do not share server Query caches across visitors; clear/recreate browser scope on identity/permission transitions.

### Installed SSR integration path

1. Router's `dehydrate` callback returns `dehydrate(queryClient, policyOptions)` under a typed state field; its `hydrate` callback calls `hydrate(queryClient, stateField)`. Wrap rendered routes with `QueryClientProvider` via the Router `Wrap` seam or one existing equivalent provider. These APIs are present in the installed artifacts and documented for external data loading.
2. Preserve the existing success/public-only dehydration policy and `shouldDehydrateMutation: () => false` in `apps/nitro/src/app/router.tsx`. Do not broaden hydration to private results while introducing the adapter or a dedicated integration helper. Query metadata is not server authorization; only positively approved public payloads may enter HTML.
3. `createRequestHandler({ request, createRouter })` and `RouterServer`/`renderRouterToString` come from `@tanstack/react-router/ssr/server`; the returned handler accepts a render callback and returns `Promise<Response>`. **Installed `renderRouterToString` takes `{ router, responseHeaders, children }`, not the newer documentation's additional `request` argument.**
4. Browser hydration uses `RouterClient` from `@tanstack/react-router/ssr/client` and React `hydrateRoot`. Preserve matching root markup, assets and hydration state. Disposal belongs after response consumption/stream completion, not immediately after obtaining a streaming `Response`.
5. Either constrain shared payloads/keys to JSON-compatible DTOs, or deliberately configure identical serializer/hash/dehydrate/hydrate rules on server and browser. RPC transport's support for Date/BigInt/etc. does not by itself make Query-state JSON serialization safe. No manual double serialization or guessed transforms are required by the adapter.

Current code already has a request-local QueryClient and manual Router hydration callbacks. It does not directly declare the oRPC Query adapter, and its router options do not set `defaultPreloadStaleTime: 0`. Those are concrete adapter prerequisites, not evidence that the migration is complete.

## 4. Nitro 3 KV cache: installed API, not assumed names

Sources: [Nitro storage](https://nitro.build/docs/storage), [unstorage guide](https://unstorage.unjs.io/guide), [memory driver](https://unstorage.unjs.io/drivers/memory), [filesystem driver](https://unstorage.unjs.io/drivers/fs). Version-specific authority: installed Nitro `package.json`, `dist/runtime/internal/storage.{d.mts,mjs}`, `dist/types/index.d.mts`, `dist/_build/common.mjs`; installed unstorage `_chunks/types.d.mts`, `_chunks/_utils.mjs`, `index.mjs`, and `drivers/{memory,fs}.mjs`.

**Current docs call this `useKV` from `nitro/kv`, configured with `kv` and `$development.kv`, and describe the previous names as deprecated aliases. This installed beta predates those exports.** Use its verified public API:

- `import { useStorage } from 'nitro/storage'`.
- Signature: `useStorage<T extends StorageValue = StorageValue>(base?: string): Storage<T>`.
- Reads: `await useStorage('provider-cache').getItem<CacheRecord>(key)` returns `CacheRecord | null`; writes: `await useStorage('provider-cache').setItem(key, record, { ttl: lifetimeSeconds })`. `removeItem`, `getKeys`, root `mount`, and `unmount` are exposed by the returned unstorage storage instance.
- Configuration: `defineConfig({ storage: { 'provider-cache': { driver: 'memory' } } })` from `nitro`. A persistent replacement is `{ driver: 'fs', base: './.data/provider-cache', atomic: true }`; a development replacement belongs in **`devStorage`** for this beta. These are configuration alternatives, not a request to create data directories now.
- Installed builder merges `devStorage` over `storage` in development/prerender and mounts the configured drivers. Runtime storage defaults to `createStorage({})`, with memory as root and server assets mounted separately. Prefixing storage routes keys; it does not create a database table or a separate service.

### Typed reads, JSON, expiry and persistence

- A generic on `getItem` is a compile-time assertion, not validation. Read as `unknown` and validate with the owner's already-declared schema library when contents may be malformed, stale or from another version. Missing keys return `null`; do not turn them into empty authoritative records.
- Installed unstorage serializes plain objects/arrays with JSON, passes primitives through string serialization, supports an object's `toJSON`, and parses reads with `destr`. Store a versioned JSON-compatible cache record, not runtime classes, clients, errors, functions, Date objects expected to revive, or raw streams. Ordinary reads/writes do not need an extra `JSON.stringify`/`JSON.parse` wrapper. The current guide's typed `{ type: 'json' | 'bytes' | ... }` conversion API is not implemented by this installed `getItem`; do not assume it from the latest docs.
- Memory is per-process and lost on restart/dispose. Installed memory driver implements write-option `ttl` in **seconds** and cancels/replaces expiry timers on rewrites. No driver-wide durable or distributed TTL guarantee follows from this.
- Installed filesystem driver persists to its configured directory and accepts `atomic`, but its `setItem` does **not** consume transaction `ttl`. Passing `{ ttl }` does not expire filesystem files. A persistent raw-KV cache needs a validated expiry envelope/read-time miss policy and separately scoped cleanup, or use the verified cache abstraction below. Filesystem persistence depends on a durable mounted directory; deployment storage, multi-writer consistency, backups and power-loss durability are not certified here.
- Filesystem ordinary IO does not require another driver library; optional watch uses `chokidar` (`^4 || ^5`). No watching dependency is required for this minimal cache seam. Do not trigger dependency auto-installation during research.

### Nitro cache abstraction versus raw KV

Installed `nitro/cache` exports **`defineCachedFunction` and `defineCachedHandler`**. It delegates to installed `ocache@0.3.0`, supplying a storage adapter backed by `useStorage()`. The installed cache defaults use base `/cache`; a configured `storage.cache` mount therefore controls its backing driver. Cache options such as `maxAge` belong to this cache abstraction, not TanStack Query freshness or raw filesystem expiry.

Installed ocache checks record modification time, freshness, integrity and validity on reads independently of physical deletion. Therefore a filesystem cache can reject stale entries even though the driver itself ignores TTL; old files may still need cleanup. Current Nitro docs describe a newer independent cache-memory default and `cache.driver: 'kv'`; that is **not** the implementation in this installed beta.

Choose one simple provider-cache owner: raw typed KV with explicit expiry policy, or `defineCachedFunction` for reconstructible server computation. Do not blindly cache permission-sensitive HTTP handlers or streams. Cache keys must include the actual public/non-secret isolation dimensions and revision; fetch/auth/validation remain in the backend before a result is cached or returned.

KV is disposable acceleration only. It must not become SQL authority, a compare-and-swap substitute, a lock/transaction coordinator, session/permission truth, durable business-state persistence, or a manual composite database. No unit conversion scheme is proposed; use each API's documented units at its own boundary.

## 5. Separate backend code, one deployment/listener

Sources: [Nitro Vite integration](https://nitro.build/docs/vite), [renderer](https://nitro.build/docs/renderer), [official React SSR example](https://nitro.build/examples/vite-ssr-react); installed Nitro `dist/types/index.d.mts`, `dist/runtime/vite.d.mts`, `lib/vite.types.d.mts`, and existing `apps/nitro/{vite.config.ts,nitro.config.ts,src/entry-server.tsx}`.

Proposed ownership, not a new deployment:

- `apps/backend`: Nitro server routes/plugins, request authorization, SQL and provider composition, cache owner and lifecycle. Explicitly declare every imported server package when that workspace is approved.
- `apps/nitro`: Vite React client, Router route tree/loaders, oRPC client/Query adapter and SSR renderer. It must not import backend runtime or API-router implementation into browser modules.
- Type-contract entry: only client/input/output/error types; no module-side effects, runtime server barrels, backend initialization or provider imports. Existing type-only client export can be the starting boundary; do not invent a runtime package to fix a missing type seam.

Minimal documented join: retain the Nitro Vite plugin as the single build/listener owner in `apps/nitro`; configure `serverDir` to the backend-owned server directory (resolved from the frontend root). Nitro's installed type describes `serverDir` scanning `api`, `routes`, `plugins`, `utils`, middleware/modules/tasks, with `scanDirs` available for extra server directories. Frontend SSR continues through its `entry-server` fetch entry; specific backend routes win over the renderer fallback. Both build into the same `.output` server/public artifact. A sibling workspace is source separation, not evidence of a second process, proxy, port, or CORS boundary.

The official SSR example and installed asset declarations agree on `entry-client?assets=client`, `entry-server?assets=ssr`, and `merge()` returning CSS/JS lists plus an optional client `entry` URL. These asset objects belong in server HTML generation, not as backend runtime imports in the browser. Installed `nitro/vite/runtime` also declares `fetchViteEnv(name, input, init?): Promise<Response>` for a server-only environment bridge; a second bridge is unnecessary unless an explicit environment split requires it.

One server-only composition boundary must supply request-scoped authorized SSR queries and the frontend render function without looping through a live HTTP listener or moving authorization into browser context. The exact cross-workspace build resolution, lifecycle/disposal join, asset path handling and output packaging remain **unverified**: no imports, build, application launch, provider/API call or listener check was authorized. Do not mark this proposed folder layout production-ready from documentation alone.

## 6. Implementation gates for the parent session

1. Release the declaration freeze only by owner decision; explicitly add beta.43 Query adapter to its real frontend owner. No family upgrade is implied.
2. Choose installed Router callback integration or an explicitly installed compatible dedicated SSR package; retain the existing public-only hydration boundary.
3. Replace duplicate manual RPC query/mutation/key logic with actual adapter utilities; wire route-critical loads through the same options and QueryClient.
4. Use installed Nitro storage/cache names and documented driver behavior; decide memory versus persistent cache without granting KV business authority.
5. Approve the backend workspace/declarations and the single-output join before relocating code. Re-check installed exports and owning dependency declarations before implementation; compilation/runtime verification belongs to a later authorized phase.
