# Nitro v3 + Vite + TanStack Router React rendering for Homarr

Research for AJN-496, retrieved October 10, 2026; research only, no Linear mutation, installs, implementation, benchmarks, or verification commands. Nitro v3 is mandatory; GitHub Pages is excluded. Existing Homarr evidence is reused, not re-audited. [Prior investigation][H]

## 1. Does the cited example actually implement SSR, and which version is authoritative?

### Takeaway
**No: the cited `vite-ssr-tsr-react` example is a client-rendered Router application despite its SSR title.** Nitro v3 supports building the missing SSR integration, but the example is neither a cached-dashboard implementation nor evidence of low-browser-JavaScript rendering. [Example][E]; [versioned entry][E1]

### Cited Findings
- The published page itself says “Client-side routing”; its template has an empty `#root` and loads `/src/main.tsx`. The entry constructs a module-level router and calls `ReactDOM.createRoot`, not `hydrateRoot`. If nonempty HTML were inserted into that root, its conditional would skip mounting rather than hydrate it. [E]; [E1]
- The repository example contains no `entry-server`, server renderer, SSR request handler, query provider, dehydration, or render cache; the complete versioned directory tree confirms the omission. [E2]
- Its only page loader performs browser-relative `fetch('/api/hello')`, returns JSON, and displays it with `Route.useLoaderData()`. The example directory does not define `/api/hello`; a standalone valid JSON endpoint is therefore a missing fixture, not a demonstrated backend/cache integration. [E3]; [E2]
- Vite config orders `tanstackRouter({ target: 'react', autoCodeSplitting: true })`, `react()`, then `nitro()`. The generated `routeTree.gen.ts` links `__root` and `/`; the plugin generates source-route metadata, not routes for every runtime database board. [E]; [E4]
- The manifest requests Router `^1.168.8`, router-plugin `^1.167.9`, React/React DOM `^19.2.4`, React plugin `^6.0.1`, and `nitro`/`vite` as `latest`. These are ranges/tags, **not an exact reproducible resolved stack**. [E5]
- Main source observed was `cef5305050325a36601ff118b9651d43a0f9ba58` (October 8); released Nitro `3.0.260903-beta` records gitHead `0509fb904ec87a0962187af13893b20cfdf2d34f`, matching the peeled Git tag. [N0]; [Ntag]
- Direct comparison found the cited example's manifest, main entry, index loader, and Vite config byte-identical between that main commit and `v3.0.260903-beta`. The missing SSR is **not merely a recent main-versus-beta regression**. [E1]; [E3]; [E4]; [E5]; [Emain]
- Meaningful drift exists elsewhere: beta cache storage wraps `useStorage()` and configures Redis through `storage.cache`; current docs/source use `cache.driver` (`memory`/`fs`/`kv`), a new cache storage factory, and `kv` mounts. Do not copy current cache configuration into this beta blindly. [Ncache]; [NcacheMain]; [NcacheImpl]; [NcacheImplMain]
- Beta Vite docs say Rolldown ships with Nitro, while current docs describe an installed/on-demand builder; the beta manifest indeed depends on Rolldown `^1.2.7`. Beta's simple React example also incorrectly used `type="modulepreload"`, corrected to `rel="modulepreload"` on main. [Nvite]; [NviteMain]; [N0]; [Nreact]; [NreactMain]
- Nitro's separate `vite-ssr-react` example really does have a Web `Request`/`Response` server entry, React `renderToReadableStream`, `?assets=client`/`?assets=ssr` imports, CSS links, and a `hydrateRoot` client entry. It does **not** add TanStack Router's loader serialization automatically. [Nreact]; [Nclient]
- TanStack **Router** is a routing/data-coordination library; **Start** adds framework-owned full-document SSR, streaming, server functions, middleware, and full-stack builds. Nitro has a different `vite-ssr-tss-react` example using `tanstackStart()` and a Start server entry. These are not interchangeable examples. [Tstart]; [Nstart]
- Nitro's experimental OpenAPI support extracts `defineRouteMeta` into OpenAPI 3.1 and exposes Scalar/Swagger/spec endpoints, development-only by default. Its docs do not generate a React frontend, Query hooks, client authentication, or replace existing tRPC contracts. [Nopenapi]

### Inferences
- **Recommendation:** use Nitro v3 + Vite + **manual TanStack Router SSR** for the narrow proof; use the cited example only for route/plugin conventions, plus the genuine React SSR example and Router's SSR adapter. Choose Start only as an explicit alternative framework decision. [E4]; [Nreact]; [Tssr]; [Tstart]
- OpenAPI is useful API documentation/schema infrastructure, not a rendering choice. Migrating browser access from tRPC to generated REST clients would be a separate contract/tooling project. [Nopenapi]; [H]

### Gaps
- Context7 library resolution succeeded, but every documentation query failed with “Monthly quota reached”; official web docs and versioned/published source supplied the evidence instead. No compatibility/build claim is inferred from library resolution.
- Pin Nitro **exactly** to `3.0.260903-beta` for that baseline, pin the chosen Router/plugin/React/Vite versions and lockfile, and record runtime/preset. Nitro's beta requires Node `^20.19.0 || >=22.12.0`; compatibility with Homarr's current versions is untested. [N0]; [H]
- Current TanStack SSR docs explicitly warn their APIs share Start internals and are experimental. Start's overview currently says release candidate, not stable v1; do not call either a proven production replacement based on the example. [Tssr]; [Tstart]

## 2. What SSR, loader, hydration, and cache lifecycle must Homarr add?

### Takeaway
Use a **fresh request router and QueryClient** to produce matching HTML/bootstrap state, then hydrate and refresh widget data through authorized backend-cache reads. Store reusable HTML separately from backend widget values and browser Query/Router caches; none of those caches is created by the example. [Tssr]; [Texternal]; [Ncache]; [H]

### Cited Findings
- Nitro's Vite plugin detects `entry-server.(ts|js|tsx|jsx|mjs)` in documented locations and builds client/server into `.output/`; its React SSR example explicitly configures the client input. It supplies the server host/build plumbing, not Router request setup. [Nvite]; [NreactConfig]
- Router's documented React server imports are from `@tanstack/react-router/ssr/server`: `createRequestHandler`, `defaultRenderHandler` or `renderRouterToString`, and `RouterServer`; the client imports `RouterClient` from `/ssr/client` and calls `hydrateRoot`. Overview prose sometimes abbreviates the import path: follow actual code/package exports. [Tssr]; [TserverExports]; [TclientExports]
- Published Router `1.168.8` depends on router-core `1.168.7`. Its published request handler accepts a Web `Request`, router factory, and optional `getRouterManifest`, then creates the router, attaches SSR utilities, installs request-URL `createMemoryHistory`, awaits `router.load()` and SSR dehydration, and invokes the render callback with headers. [Trequest]
- **Version distinction:** current SSR docs describe automatically created lightweight server history; the inspected `1.168.7` core literally uses `createMemoryHistory`. For this pinned pair, let the handler establish history; do not mix assumptions about newer history internals into the proof. [Trequest]; [Tssr]
- Router's lifecycle runs matching first, serial parent-to-child `beforeLoad`, then parallel loaders/component preloads. Loaders run on server initial SSR and browser navigation/preload according to freshness; they are not inherently server-only functions. [Tloading]; [Tssr]
- The request adapter must provide an environment-specific data executor: server uses the current request's authorized backend caller or an explicit URL/session-forwarded API; browser uses same-origin APIs. The example's raw relative browser fetch is not a server authorization adapter. [E3]; [Tloading]; [H]
- Standard SSR serializes resolved loader data automatically; non-streaming SSR includes HTML plus hydration data. Streaming additionally requires Router's stream transform/helpers and `<Scripts />` in the root body; simply streaming `<RouterProvider>` with React is not the documented protocol. [Tssr]
- Router documents a router factory that creates `new QueryClient()` **inside** it, adds it to route context, wraps with `QueryClientProvider`, and uses Router `dehydrate`/`hydrate` callbacks to transport Query state. Automatic loader dehydration does not by itself transfer an external Query cache. [Texternal]
- React requires identical initial server/client output. Returning newer widget data in bootstrap beside old cached widget HTML violates that requirement; request-specific dates, IDs, locale, theme, and user state must likewise be deterministic or isolated. [R]; [H]
- Route-loader SWR caching is in-memory, has no persistence adapter or shared cache across routes, and is separate from persistent server render storage. `router.invalidate()` invalidates Router data; it is not a Nitro HTML-cache purge. [Tloading]; [Ncache]
- Route auto-splitting ordinarily defers components/errors/pending/not-found UI; loaders and `beforeLoad` remain critical code. It does not split every widget kind/editor within a single `/boards/$boardId` route automatically. [Tsplit]
- `defineCachedFunction` exposes `.invalidate()`, `.expire()`, and key resolution; Nitro cached handlers return ordinary handlers without those methods. Explicit `maxAge` is needed (default one second); SWR is opt-in and inappropriate for stale authorization decisions. [Ncache]; [NcacheImpl]
- Cached handlers strip unallowed cookies/authorization/query/headers; custom keys do not disable that narrowing. `sendCacheControl: false` does not emit `no-store`, and private/no-store responses opt out of full-response caching. Authorization outside an internally cached function is therefore the safer private-board boundary. [Ncache]
- Existing Homarr evidence already distinguishes Redis query snapshots from HTML reuse and shows full board props include per-user permission/collapse/session-dependent inputs. Sharing the existing page DTO by board ID would be unsafe. [H]

### Inferences
1. **SSR integration seam:** a Nitro fetch-capable `entry-server` delegates each uncached request to Router's SSR request/render handler, using a shared router factory and a root document with required script/assets/provider wiring. Returning the handler's Web `Response` fits Nitro's demonstrated fetch contract; exact composition must be validated. [Nreact]; [Trequest]; [Tssr]
2. **Initial SSR miss:** authorize → normalize sanitized board projection/render key → allocate request router/QueryClient → loaders read cached widget values → serialize matching state → render → store coherent artifact. Never store a live router, QueryClient, request, session, or credentials in the cross-request cache. [Texternal]; [Ncache]; [H]
3. **HTML hit:** authorize again before serving the artifact; return matching HTML and loader/Query bootstrap without rerunning React rendering. Request-specific capability/session UI and CSP nonces cannot be accidentally frozen into a public artifact. This is application-owned orchestration, not Router/Nitro automatic behavior. [Ncache]; [Tssr]; [H]
4. **Browser:** hydrate that exact artifact first, then refresh the approved widget query against backend cache; retain returned observation time/generation. Browser polling/subscriptions may update Query without rerendering the shell server-side or contacting integrations directly. [R]; [Texternal]; [H]
5. **Shell-only alternative:** cache layout plus deterministic placeholders and matching props; load values after hydration. This cleanly separates shell lifetime from widget freshness, but is **not populated widget first paint**. [R]; [H]
6. **Populated alternative:** cache HTML plus the exact widget snapshot used for it; paint bounded-stale data immediately, then refresh. Fresh-on-every-arrival values instead require request-time widget rendering/fragments and coherent state—not arbitrary HTML/data replacement. [R]; [H]
7. **Cache identity:** instance + immutable board ID + render revision + build/schema version + locale/theme/layout + sanitized visibility/personalization variant; include widget generation if HTML contains values. Transactional revisions make old in-flight generations unreachable after edits; authorization remains a separate live gate. [Ncache]; [H]
8. **Low-JS distinction:** cached SSR saves server render work and displays HTML before JS, but RouterClient/full-root React hydration still downloads/executes the current view's React/providers/widget code. A genuinely smaller viewer needs explicit widget/editor boundaries or a separately designed islands/server-only view. No bundle-size claim is established. [R]; [Tsplit]; [H]

### Gaps
- Full-document/root-container choice, Router script serialization, route-aware asset/manifest generation, CSP handling, and cached payload replay need a pinned-version experiment; Nitro's simple React asset list is not proof of optimal split-route preloading. Vite says manifests map rendered module IDs to client assets. [Trequest]; [Tssr]; [V]
- Query API snippets on current Router docs include evolving APIs: validate against Homarr's installed Query version before implementing. Freshness/refetch timing, mutation reconciliation, and pending-query streaming are not tested here. [Texternal]; [H]
- Homarr parity still needs Mantine SSR/providers, custom JSX's current client-only boundary, charts/responsive sizing, translations/time zones, session controls, and integration authorization; prior notes enumerate those seams. [H]

## 3. What is the minimum representative proof, and what would it not prove?

### Takeaway
Prove **one dynamic runtime board route** with public/private access, one cached widget, coherent SSR hydration, lazy edit UI, and revision invalidation. This establishes the architectural seam, not full Homarr migration parity or a measured performance win. [Tloading]; [Ncache]; [H]

### Cited Findings
- File routing supports path parameters (`$id`), while Router context injects request/environment services into loaders; one `/boards/$boardId` source route can resolve boards created after deployment. No per-board route file/build is necessary for that model. [Tloading]; [E]
- Existing Homarr persistence is API/database-driven and already defers its grid editor and loads widgets by kind; those boundaries can be preserved instead of treating Nitro as the optimization itself. [H]
- Public visibility, board content/layout changes, ACL changes, custom-widget definitions, and branding all affect safe render reuse independently of widget-result caches. [H]

### Inferences
**Proposed experiment only; no implementation performed:** [Nreact]; [Tssr]; [Ncache]; [H]

| Slice | Minimal representative behavior / acceptance evidence |
| --- | --- |
| Fixture | Two runtime records, one public and one private; sanitized name/layout/options, render revision, and one widget value with observation timestamp/generation. |
| Viewer | `/boards/$boardId` resolves either record; HTML source contains the actual board heading/layout and cached widget value before JS. No source-file generation per board. |
| Backend | Authorized board read; authorized widget-cache read; authorized board save; all keep integration credentials/backend Redis out of browser props. |
| Cache proof | A second allowed request reuses rendered artifact; record render invocation/miss/hit separately from widget-cache reads, not just elapsed request time. |
| Request isolation | Concurrent different users/boards never share QueryClient/router/session data; denied private requests receive no cached HTML or bootstrap. |
| Hydration | Same cached widget value/bootstrap at first hydration, no recoverable mismatches; subsequent backend-cache generation changes the visible value without shell rebuild. |
| Edit | Owner-only lazy editor changes a label/layout via backend mutation; commit advances revision; client Query and Router refresh separately from server render-key invalidation. |
| Revocation | Warm public/private artifacts first, then revoke ACL/change visibility; next unauthorized request cannot use a cache hit. Already-delivered data cannot be recalled. |
| Races | Delay old render during save; subsequent reads use new revision. Ensure no old-generation render becomes the current board after completion. |
| Assets | Cold direct link, reload, browser navigation, production split chunks/CSS, and a new app build all work; old artifacts never reference deleted/incompatible assets. |

- Start with non-streaming, coherent populated HTML/bootstrap to make cache replay inspectable; refresh one widget after hydration. Add streaming only if latency/large data justifies its extra lifecycle. [Tssr]; [R]
- Treat placeholder-shell mode as a separately labeled comparison, not evidence that populated dashboard requirements were satisfied. If low JS is mandatory, compare a deliberately reduced viewer—not full hydration renamed “static.” [R]; [H]

### Gaps
- Not proven: production multi-worker/restart cache sharing, eviction/size policy, all widgets, editor parity, subscription/task startup, accessibility parity, CSP/XSS hardening, CSRF/session propagation, observability, deployment presets, or speed/JS-memory improvements. [H]; [Ncache]
- Release beta Redis configuration must use its `storage` layer; current `cache.driver`/`kv` advice belongs to newer source. Neither default in-process cache proves shared durable render reuse. [Ncache]; [NcacheMain]
- Final decision still needs shell-only versus populated-first-paint freshness policy, shared versus personalized DTO, full hydration versus reduced viewer, and how existing viewers learn render-revision changes. [H]; [R]

[H]: ../Homarr%20Nitro%20migration%20experiment/dashboard-rendering.md
[E]: https://nitro.build/examples/vite-ssr-tsr-react
[E1]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-tsr-react/src/main.tsx
[E2]: https://github.com/nitrojs/nitro/tree/v3.0.260903-beta/examples/vite-ssr-tsr-react
[E3]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-tsr-react/src/routes/index.tsx
[E4]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-tsr-react/vite.config.mjs
[E5]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-tsr-react/package.json
[Emain]: https://github.com/nitrojs/nitro/tree/cef5305050325a36601ff118b9651d43a0f9ba58/examples/vite-ssr-tsr-react
[N0]: https://registry.npmjs.org/nitro/3.0.260903-beta
[Ntag]: https://api.github.com/repos/nitrojs/nitro/git/tags/4d5f5fcf1723f51b9aa7f0e3377b058ca4f696e8
[Ncache]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/docs/1.docs/7.cache.md
[NcacheMain]: https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/docs/1.docs/7.cache.md
[NcacheImpl]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/runtime/internal/cache.ts
[NcacheImplMain]: https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/src/runtime/internal/cache.ts
[Nvite]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/docs/1.docs/61.vite.md
[NviteMain]: https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/docs/1.docs/61.vite.md
[Nreact]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-react/src/entry-server.tsx
[NreactMain]: https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/examples/vite-ssr-react/src/entry-server.tsx
[Nclient]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-react/src/entry-client.tsx
[NreactConfig]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-react/vite.config.mjs
[Nstart]: https://github.com/nitrojs/nitro/tree/v3.0.260903-beta/examples/vite-ssr-tss-react
[Nopenapi]: https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/docs/1.docs/50.openapi.md
[Tstart]: https://tanstack.com/start/latest/docs/framework/react/overview
[Tssr]: https://tanstack.com/router/latest/docs/framework/react/guide/ssr
[Texternal]: https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading
[Tloading]: https://tanstack.com/router/latest/docs/framework/react/guide/data-loading
[Tsplit]: https://tanstack.com/router/latest/docs/framework/react/guide/code-splitting
[TserverExports]: https://cdn.jsdelivr.net/npm/@tanstack/react-router@1.168.8/dist/esm/ssr/server.d.ts
[TclientExports]: https://cdn.jsdelivr.net/npm/@tanstack/react-router@1.168.8/dist/esm/ssr/client.d.ts
[Trequest]: https://cdn.jsdelivr.net/npm/@tanstack/router-core@1.168.7/dist/esm/ssr/createRequestHandler.js
[R]: https://react.dev/reference/react-dom/client/hydrateRoot
[V]: https://vite.dev/guide/ssr
