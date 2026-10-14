# Homarr cached dashboard rendering under Vite + Nitro

Research for [AJN-486](https://linear.app/ajnart/issue/AJN-486/investigate-cached-dashboard-rendering). Read-only investigation; no implementation, installation, benchmark, or Linear mutation. Checkout inspected at `66e2199f9cd1e4026249c3763413988bab8664c4`; official documentation retrieved October 10, 2026. Source paths below refer to this checkout, not an assumed upstream release. Proposed architecture is explicitly separated from documented features.

## 1. Which rendering model fits editable user-defined boards, and what do Vite/Nitro supply?

### Takeaway

Runtime render caching is the closest fit to already-rendered, editable dashboards without application rebuilds. Vite/Nitro supply build, server, asset, and cache infrastructure; Homarr must still choose and implement its React renderer, data bootstrap, authorization, and invalidation contracts. [Nitro cache][N1]; [Nitro React example][N3]; [Vite SSR guide][V1]

### Cited Findings

| Model | Documented behavior | Implication for this requirement |
| --- | --- | --- |
| Build-time board prerender | Nitro generates static route files once during the build; they are not runtime-revalidated. Combining `prerender` with `isr` does not fix this: prerender wins. [Nitro routing][N2] | Unsuitable as the canonical render of changing user boards: adding/editing them after deployment cannot update those build artifacts through this feature. It can serve a generic application scaffold, but that is not already-rendered board content. |
| Runtime SSR plus render cache | Cached functions store expensive operation results; cached handlers store complete responses. Explicit TTL, optional SWR, deduplicated concurrent resolution, storage selection, and custom keys are supported. [Nitro cache][N1] | Render a board revision at runtime, store the resulting shell, reuse it for subsequent authorized requests. A database edit changes the render input/key; no application compilation is implied. This is an application architecture, not a built-in Homarr mode. |
| CSR | Nitro can serve a static `index.html` for unmatched routes, and this SPA fallback is the Vite integration default. [Nitro renderer][N4] | Editing can remain API-driven, but the browser must construct the board. It does not fulfill board-specific already-rendered HTML merely by serving an empty app root. |
| SSR without HTML caching | Nitro's React example calls React server rendering for requests and then hydrates with a client entry. [Nitro React example][N3] | Useful fallback on cache misses or personalized views, but avoids neither per-request React rendering nor browser hydration by itself. |

- Vite's SSR guide is a low-level setup: separate universal code, server entry invoking the framework SSR API, client entry, server request handling, production builds, and optional SSR manifest mapping modules to chunks/assets. Vite is not a dashboard renderer or authorization system. [Vite SSR guide][V1]
- Nitro detects an SSR entry with its Vite plugin and builds client/server output together; the official React example still supplies `renderToReadableStream`, the HTML document, CSS/script asset imports, and `hydrateRoot`. Adding `nitro()` alone is not equivalent to enabling React board SSR. [Nitro Vite][N5]; [Nitro React example][N3]
- Nitro's renderer is a catch-all after specific routes. Static HTML templates are served as-is; a custom handler takes control of rendering. Its dynamic HTML preprocessor is documented as experimental, not an automatic React/Mantine renderer. [Nitro renderer][N4]
- Current Nitro documentation distinguishes function caching from response caching: cached functions expose `.invalidate()` and `.expire()`; cached handlers currently do not expose these methods. The docs recommend putting invalidatable expensive work in a cached function called from a plain handler. [Nitro cache][N1]
- Nitro memory caching is process-local and not persistent across restart or workers. Its KV cache driver can use Redis via the storage layer. Persisted multi-process behavior therefore requires an explicit storage/key choice; it is not delivered by a default in-memory cache. [Nitro cache][N1]
- The current docs describe platform ISR under Vercel separately from runtime caching. It is not evidence of a universal self-hosted board-regeneration mechanism. [Nitro routing][N2]

### Inferences

- **Proposed baseline:** immutable application assets plus mutable board configuration in the database; a plain authorized request handler calls a revision-keyed cached render function. Cache misses render on demand, with optional post-save warmup. Board creation/editing is a data mutation, not creation of a source file, filesystem route, or Vite build. This follows Nitro's dynamic routes/cache capabilities and Homarr's existing API-driven persistence. [Nitro routing][N2]; [Nitro cache][N1]; [board persistence][S8]
- Keep three caches conceptually separate: compiled assets by build, rendered shell by board/render inputs, widget results by integration/query inputs and generation. Fresh widget results need not invalidate a geometry-only shell; board structure changes must. Homarr already distinguishes widget snapshot fingerprints and integration generations. [widget snapshot][S2]; [Nitro cache][N1]
- Do not claim a speed, bundle-size, or memory improvement from choosing Vite/Nitro. These docs establish functionality, not measured performance of Homarr. [Vite SSR guide][V1]; [Nitro React example][N3]

### Gaps

- Pin the actual Nitro version before implementation. The retrieved current docs use `nitro/vite`, `defineCachedHandler`, `ocache`, and `cache.driver`; older Nitro examples/API generations must not be silently mixed with these. Homarr's root manifest currently lists React 19.2.7, Mantine 9.6.0, Next 16.3.6, and Vite 8.1.4, but no root Nitro dependency. This is research evidence, not an installed compatibility validation. [manifest][S15]; [Nitro Vite][N5]; [Nitro cache][N1]
- Decide whether the deliverable is an already-rendered layout with loading slots, or already-populated widget content on the first response. They have different rendering/data costs; neither implies zero JavaScript. [React hydration][R1]; [Nitro React example][N3]

## 2. How can a cached shell receive widget-cache data while preserving hydration and capabilities?

### Takeaway

Cache and hydrate the exact same initial tree/data snapshot, then refresh it; or cache a stable placeholder shell and populate widgets after hydration. Arbitrarily inserting newer widget HTML/data into cached React output breaks the matching-state contract unless the server also produces the corresponding bootstrap state and component boundaries. [React hydration][R1]

### Cited Findings

- React requires the first client render passed to `hydrateRoot` to match server output. Different server/client data, browser-only rendering decisions, and `window.matchMedia` branches are documented mismatch causes; recovery can slow rendering or attach handlers incorrectly. `createRoot` is not the correct way to preserve a server-rendered tree. [React hydration][R1]
- Homarr already restores cached widget data before rendering: `_creator.tsx` gets a request query client, fetches/authenticates the board, restores a Redis query snapshot, starts current widget prefetches, dehydrates the query client, and emits extra Suspense hydration boundaries for completed refreshes. It still returns the React board tree on each request; this is **query-data reuse, not stored board HTML reuse**. [board page creator, lines 94–194][S1]
- `_query-snapshot.ts` allows selected shared widget queries, requires success/prefetch metadata and board-matching integration/RSS inputs, checks integration generations, and excludes oversized/base64 data. It has a three-day maximum age, a 50 ms restore budget, and a 512 KiB total snapshot cap. Restored queries' `dataUpdatedAt` is reset to now, so that timestamp is not proof the underlying integration observation is fresh. [widget snapshot, lines 19–24, 34–107, 145–215][S2]
- The snapshot key hashes widget item ID/kind/integration IDs/options, not board layouts, theme, locale, custom CSS, or the complete document. That fingerprint is appropriate evidence for its query-cache role, not a complete HTML-cache key. [widget snapshot, lines 109–130][S2]
- Initial prefetch selects visible widget kinds, uses exact API query inputs, explicitly refreshes restored values with `staleTime: 0`, and avoids ambiguous calendar months across browser time zones. This is an existing capability to preserve rather than replace with an assumed universal widget-cache DTO. [widget server prefetch, lines 16–62, 114–139][S3]
- Mantine `ColorSchemeScript` sets the HTML color-scheme attribute before hydration; Mantine warns that conditionally rendering different elements from a browser-derived color scheme is incompatible with SSR. CSS-based dark/light visibility is the documented alternative. [Mantine color schemes][M1]; [Mantine hydration explanation][M2]; [Mantine color-scheme rendering caveats][M3]
- Homarr's board Mantine provider derives theme values from both board settings and instance branding. Its root layout passes locale/RTL direction, authenticated session, user settings, branding, client providers, and color scheme. A cached full document is consequently not just board geometry. [board theme][S4]; [root layout][S5]
- The Custom API widget explicitly loads its JSX display with `next/dynamic({ ssr: false })`, polls `getData`, and renders admin/edit-dependent error/action states. The JSX display uses runtime templates, localized messages, stateful published queries, and request capabilities. This behavior is not currently fully server-rendered. [custom widget component][S6]; [custom JSX display][S7]
- Backend Custom Widget execution checks each request's board permission before resolving sources/decrypting credentials. Query keys include item, definition version, request/parameter values, and source cache version. Query/action distinction and request limits are present. Serving shell HTML must not bypass these contracts. [custom widget API, lines 127–178][S9]
- Chart widgets use `@mantine/charts`; the Beszel chart also uses locale formatting and current-time-derived grid preparation. Most Mantine charts are Recharts-based, require chart styles, and current docs describe interactive keyboard navigation/tooltips. A static image is not a capability-equivalent substitute. The fetched Mantine site shows 9.7.1, newer than this checkout's 9.6.0, so its exact accessibility details are not verified installed-version behavior. [Beszel chart][S10]; [locale helper][S11]; [Mantine charts][M4]; [manifest][S15]
- Homarr already defers the drag-and-drop editor runtime until edit mode through an asynchronous loader. Its widget manifest also provides per-kind component/resource loaders. These are concrete existing browser-payload seams, independent of switching server frameworks. [grid editor boundary][S12]; [widget manifest][S13]

### Inferences

1. **Proposed option A — cached stable shell + client data fill:** render board identity/layout and deterministic widget placeholders; cache that HTML plus matching board bootstrap props. Hydrate the same placeholders, then issue authorized queries that read backend caches and populate components. This most cleanly decouples shell lifetime from widget freshness, but widget values are not present on first HTML paint. Reuse existing TanStack/tRPC consumers, not direct browser access to Redis or integrations. [React hydration][R1]; [current client API][S14]; [widget snapshot][S2]
2. **Proposed option B — cached populated HTML + matching snapshot:** store the rendered result and the exact data/locale/time basis used to generate it as a single coherent artifact. Hydrate with that snapshot, then update from currently authorized backend cache reads. This paints cached values immediately but returns values as old as the artifact and adds serialized bootstrap data; do not substitute a newer snapshot while retaining old HTML. [React hydration][R1]; [current dehydration][S1]
3. **Proposed option C — shell cache + request-time widget fragments:** reuse board framing, authorize and read widget-cache values, then server-render widget fragments and supply their exact bootstrap props. Independent React roots/islands or streaming boundaries require an intentional ownership/provider design. Nitro provides a renderer/template integration, not automatic segmentation of an existing monolithic React tree. This saves shell rendering, not all rendering. Untrusted widget data must be serialized/escaped, not raw string replacement into cached markup. [Nitro renderer][N4]; [Nitro React example][N3]; [React hydration][R1]
4. **Lightweight frontend is a separate optimization:** full hydration still needs the React/Mantine and widget logic rendered by that client entry. Preserve dynamic editing, charts, custom JSX, refreshes, links, focus, and menus through selective loading; server-only static pieces can omit client logic only with a real separation of ownership. An islands/RSC design must be separately chosen, not inferred from plain Vite SSR. [Nitro React example][N3]; [custom JSX display][S7]; [grid editor boundary][S12]
5. **Accessibility preservation:** keep semantic headings/landmarks and localized labels in shell HTML; preserve keyboard navigation/focus and loading/error feedback when widget data changes. A noninteractive screenshot, hidden-but-focusable placeholder, or prehydration control that silently drops clicks would not preserve current interaction capabilities. Existing board code supplies labeled canvas/rail landmarks and editor/focus providers. [client board][S16]; [Mantine charts][M4]; [React hydration][R1]

### Gaps

- No SSR/hydration compatibility audit was executed for all current widget kinds, especially responsive chart sizing, custom JSX, notebooks/editors, browser storage, clocks, and time-zone formatting. No performance measurements were made.
- Which widgets require fresh-on-arrival data versus bounded stale display? Existing three-day snapshot storage lifetime must not be treated as a product-wide freshness guarantee. [widget snapshot][S2]
- Should dynamic content appear only after hydration (simpler), in SSR fragments (more server work), or in a cached coherent snapshot (more stale content/bootstrap bytes)? Must preserve the same capability surface whichever is chosen.
- Full-root hydration versus independent islands remains a human decision. Context sharing, Mantine portals/providers, IDs, and moving from view to edit mode need validation before promising either approach.

## 3. What keys, invalidation, security boundaries, and source couplings matter?

### Takeaway

Perform current authorization before every shell/cache-data delivery, not only on cache misses. Cache a sanitized shared board projection rather than the present user-personalized document, or deliberately partition personalized variants; permission changes must stop delivery immediately, independently of shell TTL/SWR. [board authorization][S17]; [full board projection][S18]; [Nitro cache][N1]

### Cited Findings

- Board access reads current creator/public visibility, direct user grants, and group membership/grants from the database. Denied access returns `NOT_FOUND` to avoid revealing board existence. `getHomeBoard` resolves the user/device-specific home selection; `getBoardByName` authorizes before returning data. [board access][S17]; [board router, lines 1185–1222][S18]
- The full board query includes creator identity fields including email, the current user's section-collapse state, and user/group permissions filtered for that viewer. Therefore two viewers of one board need not receive identical bootstrap props or layout state. A shared cache cannot safely reuse this DTO merely because `board.id` matches. [full board query, lines 2961–3055][S18]
- Board layout reads authenticated session/tour status, color scheme, and viewport from cookies/client hints/user agent, calculates change access, and chooses a layout. Client providers also recognize `?edit=true&layout=...`, restricted by `canModify`. Exact available width is used by the board canvas, so a layout ID alone does not currently describe every server-generated sizing value. [board layout creator, lines 54–107, 136–153][S19]; [board providers][S20]; [client board, lines 49–81][S16]
- Board client state starts from route-fetched data, refreshes through tRPC, selects responsive layout via a server snapshot plus browser viewport, and updates optimistically through `usePersistBoard`/`saveBoard`. The save mutation performs permission/configuration validation and database transactions, not an application build. [board context][S21]; [board updater][S8]; [saveBoard, lines 1699–1739][S18]
- Visibility changes and board user/group permission changes have their own database mutations; layout/content writes are not the only security-relevant changes. [visibility, lines 1078–1115; permission mutations, lines 2215–2294][S18]
- Widget integration middleware authorizes query/interact access before constructing server context containing decrypted integration secrets. It deliberately strips secrets from the public portions but keeps them server-side for integration work. Frontend/backend separation must preserve that order. [integration middleware, lines 47–105, 125–200, 247 onward][S22]
- Current Nitro cached-handler docs say request headers, query parameters, cookies, and authorization are stripped unless explicitly allowed/keyed; cookies/authorization are not a session-safe implicit key. `getKey` does not disable request narrowing. `set-cookie` is stripped from cached responses. Docs recommend bypassing nonshareable responses rather than admitting per-user secret cookies. [Nitro cache][N1]
- The default cached-handler key covers origin/path/method and allowed variants, not Homarr ACL state. SWR is opt-in and the docs advise against stale responses for authorization checks. `sendCacheControl: false` suppresses generated downstream cache headers but does **not** itself emit `no-store`. [Nitro cache][N1]

### Inferences

**Proposed cache identity, not an existing Homarr schema:**

| Dimension | Why it belongs in the key, or outside the cached artifact |
| --- | --- |
| Instance namespace + immutable board ID | Avoid name/rename ambiguity and collisions when cache storage is shared. Resolve home/name routes to an authorized board before looking up its render. [home/name routes][S18]; [Nitro keys][N1] |
| Board render revision | Include sections, layouts, items/options/advanced options, integration placement, metadata/background/logo, and relevant custom CSS; every rendering-affecting write must change it. The current widget-only fingerprint is insufficient for HTML. [snapshot fingerprint][S2]; [saveBoard][S18]; [board theme][S4] |
| Authorization/sanitized projection variant + ACL epoch | Anonymous public, authenticated shared-view, and personalized/private render variants must not collide. Render edit/action controls from capabilities, not a cached session. Revalidate access outside the cache even when the variant key matches. [board access][S17]; [root layout][S5]; [full board projection][S18] |
| Locale, direction, formatting basis | Translated labels and RTL markup vary; time zone/current-time-derived output must be deterministic or deferred to hydration. Date-only and timestamp handling differ in current helpers. [root layout][S5]; [locale helper][S11]; [Beszel chart][S10] |
| Theme/branding/custom CSS revision | Both board and instance branding affect output. CSS-driven light/dark can sometimes share a DOM tree, but actual conditional markup and document metadata require distinction. [board theme][S4]; [root layout][S5]; [Mantine caveats][M3] |
| Layout/viewport and viewer preferences | Current shell uses viewport-dependent initial geometry and per-user collapse state. Either include these inputs, or refactor them into a nonshared layer; do not assume responsive CSS alone reproduces current behavior. [layout creator][S19]; [client board][S16]; [full board query][S18] |
| Build/render-schema + custom definition versions | Cache HTML must reference matching assets and bootstrap schemas; Custom Widget template/definition/source versions can change without a board edit. Nitro function integrity hashes code/options, but Homarr's dependent assets/templates need an explicit version policy. [Nitro integrity][N1]; [custom widget versions][S9]; [widget resources][S13] |
| Widget snapshot/generation, only when HTML contains values | Geometry-only shells do not depend on live result values. Populated artifacts do and must retain a coherent HTML/data snapshot and freshness basis. [widget snapshot][S2]; [React hydration][R1] |

- **Revision invalidation proposal:** commit board data and render revision together; return the new revision to editing clients. Read requests use the new revision immediately, optionally warming its render. Old generations can expire; this avoids enumerating every locale/theme/layout key just to make current content discoverable. This needs a mutation inventory, including add/remove/move, settings/layout saves, rename/delete, custom-definition changes and branding. Existing database mutations do not themselves establish a complete HTML revision mechanism. [board router][S18]; [Nitro invalidation][N1]
- **Permission/visibility changes:** revoke delivery at the authorization gate on the next request, bump the relevant permission epoch, and invalidate public/personalized render/bootstrap/data variants. Never serve a denied request from SWR. Already-delivered HTML/data cannot be recalled, so private documents and bootstrap/data endpoints should carry explicit downstream `private, no-store` policy where required; keep internal render caching separate from HTTP response caching. Nitro rejects `private`/`no-store` responses from its full-response cache, supporting the plain-handler/cached-function split. [Nitro cache][N1]; [board access][S17]; [visibility/permission writes][S18]
- **Private/public isolation:** public visibility does not make every user session, permission row, creator field, or custom request capability safe for public caching. Use a deliberately minimal public projection. A private board can share internal static framing among authorized viewers only if the cached artifact is identical and authorization happens first; personalized state/capabilities must remain outside or separately partitioned. [full board query][S18]; [custom widget API][S9]
- **Cache race handling:** generation keys make an old in-flight render unreachable after a revision change. Permission gates must read current state, rather than relying solely on a delayed asynchronous purge. Current Nitro function `.invalidate()` also cancels in-flight resolution for that key; that does not replace the application's mutation/authorization ordering. [Nitro cache][N1]

**Concrete current coupling and proposed boundary:**

| Source path | Current dependency to address |
| --- | --- |
| `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx` | Next metadata/navigation + RSC request query client, auth, prefetch, dehydration, and page composition are interleaved. Keep board/data logic reusable, replace the transport/render entry. [source][S1] |
| `apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx` | Next cookies/headers/navigation, session-derived controls, viewport inference, tour state, and Mantine shell composition. Separate normalized render inputs from request adapter. [source][S19] |
| `apps/nextjs/src/app/[locale]/layout.tsx` | Next font/metadata, locale/RTL and next-intl provider, session/user settings, branding, and global UI provider composition. Do not blindly cache or copy as a public document. [source][S5] |
| `packages/api/src/{server,rsc-context,board-server}.ts` | React request memoization and Next headers/auth adapter feed tRPC's in-process caller. Renderer needs explicit request-scoped session/headers/query client instead. [server][S23]; [RSC context][S24]; [board caller][S25] |
| `packages/api/src/shared.ts` | Server client-call headers import `next/headers`; SSR base URL assumes `127.0.0.1:3000`, browser URL uses current origin. Separate service routing/session forwarding from shared client code. [source][S26] |
| `packages/boards/src/context.tsx` and board `_providers.tsx` | `next/navigation` hooks for pathname/search parameters; tRPC state and optimistic API persistence are otherwise visible seams. [context][S21]; [providers][S20]; [updater][S8] |
| `packages/widgets/src/server-prefetch.ts` | Imports `@homarr/api/server` RSC adapter; reusable selection/query-input behavior should survive with a supplied request executor/query client. [source][S3] |
| `packages/widgets/src/custom-api/component.tsx` | Next-specific dynamic import explicitly disables SSR; replacing it with normal SSR is a behavior change, not a mechanical import rename. [source][S6] |
| `packages/translation/src/server.ts` | Server translation entry aliases `next-intl/server`, rather than a transport-independent translator. Preserve locale catalogs/formatting without assuming this adapter runs under generic Vite SSR. [source][S27] |
| `apps/nextjs/src/instrumentation-node.ts` | Main app starts task and WebSocket runtimes; moving HTTP/rendering must preserve startup/subscription ownership. Frontend/backend separation does not require deployment into separate machines. [source][S28] |

- **Proposed frontend/backend separation:** browser receives sanitized board props, approved widget results and capability indicators; backend retains database, session/ACL decisions, Redis/integration caches, credentials, Custom Widget execution/action limits, and tasks/subscriptions. A server renderer may call backend procedures in-process or over an authenticated internal API; neither transport is mandated by Nitro. Same-origin proxying can preserve browser API URLs without exposing credentials. [integration middleware][S22]; [custom widget API][S9]; [current client URL][S26]; [Nitro proxy routing][N2]

### Gaps

- Need an explicit contract for shared/public render DTO versus personalized user state. Section collapse, user preferences, session UI, home-board selection, and action capability filtering make board ID + public/private + locale/theme alone insufficient today. [full board projection][S18]; [root layout][S5]
- No complete revision/ACL-generation mutation inventory was validated. Decide whether to add transactional monotonic revisions or hash the complete sanitized render projection; decide old-variant retention, cache size/TTL, and failure fallback policy.
- Decide immediate edit visibility semantics across tabs/clients: existing local optimistic updates do not by themselves push a new board revision to all viewers. [board context][S21]; [board updater][S8]
- Decide authenticated in-process rendering versus separate SSR/backend service, and ownership of task/WebSocket startup, session propagation, CSRF/CORS, build compatibility, and health checks. No deployment experiment was performed.
- Open decision summary: shell-only versus populated first paint; full hydration versus islands; sanitized shareable DTO; render/ACL revisions; acceptable widget staleness; version-pinned Nitro/React/Mantine compatibility. Research establishes mechanisms and risks, not a chosen migration architecture.

[N1]: https://nitro.build/docs/cache
[N2]: https://nitro.build/docs/routing
[N3]: https://nitro.build/examples/vite-ssr-react
[N4]: https://nitro.build/docs/renderer
[N5]: https://nitro.build/docs/vite
[V1]: https://vite.dev/guide/ssr
[R1]: https://react.dev/reference/react-dom/client/hydrateRoot
[M1]: https://mantine.dev/theming/color-schemes/
[M2]: https://help.mantine.dev/q/color-scheme-hydration-warning
[M3]: https://help.mantine.dev/q/how-to-get-color-scheme-value-in-js
[M4]: https://mantine.dev/charts/getting-started/
[S1]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/%28content%29/_creator.tsx
[S2]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/%28content%29/_query-snapshot.ts
[S3]: ../../packages/widgets/src/server-prefetch.ts
[S4]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/%28content%29/_theme.tsx
[S5]: ../../apps/nextjs/src/app/%5Blocale%5D/layout.tsx
[S6]: ../../packages/widgets/src/custom-api/component.tsx
[S7]: ../../packages/widgets/src/custom-api/custom-jsx-display.tsx
[S8]: ../../packages/boards/src/updater.ts
[S9]: ../../packages/api/src/router/widgets/custom-api.ts
[S10]: ../../packages/widgets/src/beszel/_shared/chart.tsx
[S11]: ../../packages/widgets/src/common/locale.ts
[S12]: ../../apps/nextjs/src/components/board/sections/grid/board-grid-editor-boundary.tsx
[S13]: ../../packages/widgets/src/manifest.ts
[S14]: ../../packages/api/src/client.ts
[S15]: ../../package.json
[S16]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/%28content%29/_client.tsx
[S17]: ../../packages/api/src/router/board/board-access.ts
[S18]: ../../packages/api/src/router/board.ts
[S19]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/_layout-creator.tsx
[S20]: ../../apps/nextjs/src/app/%5Blocale%5D/boards/_providers.tsx
[S21]: ../../packages/boards/src/context.tsx
[S22]: ../../packages/api/src/middlewares/integration.ts
[S23]: ../../packages/api/src/server.ts
[S24]: ../../packages/api/src/rsc-context.ts
[S25]: ../../packages/api/src/board-server.ts
[S26]: ../../packages/api/src/shared.ts
[S27]: ../../packages/translation/src/server.ts
[S28]: ../../apps/nextjs/src/instrumentation-node.ts
