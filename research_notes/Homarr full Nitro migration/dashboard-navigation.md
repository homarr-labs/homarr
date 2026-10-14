# Full Homarr dashboard and navigation migration

Research date: October 10, 2026. Assignment: `.scratch/nitro-full-migration/issues/dashboard-navigation.md`; governing scope: `.scratch/nitro-full-migration/RESEARCH.md` and the live [AJN-482 map](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr). Checkout: branch `rework-hono`, HEAD `66e2199f9cd1e4026249c3763413988bab8664c4`. The uncommitted `apps/nitro-experiment/` is inspected separately, not treated as committed product code.

This is a preservation specification proposal, not implementation approval or runtime verification. Only this note was written. No installs, builds, application probes, tests, lint, typechecks, Git/Linear mutations, or changes to the playable container/browser were performed. The pre-existing `.gitignore`/`bun.lock` changes and untracked experiment/research files were left alone. This worker investigated directly; no nested workers were launched.

## 1. Decisive findings

1. **The route inventory is 61 page entries, not two fixture routes.** Ten entries are outside management and 51 are under `/manage`, including its catch-all. There are also 10 layouts, 2 loading boundaries, 3 error boundaries, 5 not-found boundaries, and 26 HTTP route files. All are reconciled below; cross-owner pages are handoffs, not omitted capabilities. Sources: `apps/nextjs/src/app/`, sections 2–3.
2. **Runtime boards need one parameterized source route, not per-board generated code.** Preserve public name URLs, case-insensitive lookup, immutable board IDs, home selection, and fresh authorization. `/` and `/boards` currently independently render the same home-board definition; the fixture's `/` redirect to `/boards/public` is not equivalent. Sources: board `_definition` files, `packages/api/src/router/board.ts`, [Router route trees][T-tree].
3. **Router replaces navigation/data coordination, not Nitro, RSC, or the backend.** The approved experimental direction is manual Router SSR with Nitro v3 and direct oRPC, not TanStack Start. RSC request reads, auth, translation, metadata, server-only imports, provider setup, and explicit HTML/bootstrap reuse remain application-owned seams. Sources: root/board/manage layouts; [prior rendering research][P-stack]; [Router SSR][T-ssr].
4. **Most grid/domain/form UI is reusable; its request, navigation, and tRPC hooks need adapters.** Retain the fixed logical geometry, all layouts and nested sections, lazy editor runtime, selection/clipboard, immediate and deferred editing paths, focus/collapse, modal completion callbacks, apps/bookmarks, and eight Spotlight modes. Do not replace these with a flat fixture board or route-generated modals. Sources: sections 5–8.
5. **Search semantics are a correctness boundary.** The fixture strips every query string; current flows depend on `layout`, `edit`, `returnTo`, `add`, `create`, search/pagination, login callbacks, and other cross-owner query state. Router's JSON-first parser differs from current string schemas. URL normalization must be designed, not mechanically copied. Sources: section 4; [Router search][T-search].
6. **One server-action wrapper is not a business-action migration.** `packages/common/src/revalidate-path-action.ts` is the only `"use server"` file found in the current application/package source; it calls `revalidatePath(path, "page")`. Domain mutations already use API procedures. Replace the refresh/invalidation contract, not every form with an invented Router server action. Sources: that file and its consumers; section 9.
7. **Parallelism should start after interface agreement, not after every backend has been rewritten.** Give shell/router/bootstrap/shared cache registration one writer; run viewer, editor, board management/settings, apps, and search/Spotlight as independent vertical owners using explicit services and fixtures. Widget, integration, identity, localization, and extended-feature owners supply bounded adapters. Section 11 names blocking edges and demonstrable checkpoints.

## 2. Exhaustive page and layout reconciliation

### 2.1 Route interpretation and count

The following are **public URL patterns**, not filesystem locale prefixes. `packages/translation/src/routing.ts` sets `localePrefix.mode: "never"`; Next's proxy rewrites the locale internally. Route groups such as `(home)` and `(content)` do not enter public URLs. Square brackets below denote runtime parameters and must become Router parameters, not fixed fixture IDs.

Source convention: for management routes and ordinary non-management routes, the page is `apps/nextjs/src/app/[locale]<URL>/page.tsx`. The three board viewer exceptions are explicitly listed after the table. This table accounts for every `page.tsx` found; it does not claim all other workers' page internals have been audited here.

| Family | Entries | Complete public route list | Target seam / proposed capability owner |
| --- | ---: | --- | --- |
| Board viewer and settings | 4 | `/`; `/boards`; `/boards/[name]`; `/boards/[name]/settings` | Shared shell + viewer; board settings/management. Home/name resolver and authorized board service. |
| Identity entry | 2 | `/auth/login`; `/auth/invite/[id]` | Identity owner supplies page modules, callback/session transitions and authorization; shell registers. |
| Extended/non-management | 4 | `/init`; `/custom-widget-configuration/[token]`; `/reference/api`; `/widgets/[kind]` | Onboarding/configuration: extended owner. API reference: endpoint owner. Widget embedding: widget owner. Preserve standalone layouts/entry contracts. |
| Management landing/about | 2 | `/manage`; `/manage/about` | Management shell/dashboard and about/dependency/contributor modules; clarify final ownership in synthesis. |
| Apps/bookmarks | 3 | `/manage/apps`; `/manage/apps/new`; `/manage/apps/edit/[id]` | Apps owner: list/load/create/edit/delete, icon/ping fields, permission-specific empty states and modal consumers. |
| Board management | 1 | `/manage/boards` | Board management owner: overview/previews, inline create, duplication, home/mobile home, deletion, settings links. |
| Search engines | 3 | `/manage/search-engines`; `/manage/search-engines/new`; `/manage/search-engines/edit/[id]` | Search owner: list/create/edit/delete and Spotlight/external-search integration. |
| Integrations | 3 | `/manage/integrations`; `/manage/integrations/new`; `/manage/integrations/edit/[id]` | Integration owner: authorized catalog/details/forms/ACL; provide selection/completion adapter to editor/apps. |
| Media, settings, assistant | 3 | `/manage/medias`; `/manage/settings`; `/manage/assistant` | Media/assistant: extended owner. Sensitive instance settings: identity/admin owner, frontend services for presentation. |
| Custom Widgets | 7 | `/manage/custom-widgets`; `/manage/custom-widgets/new`; `/manage/custom-widgets/edit/[id]`; `/manage/custom-widgets/preview/[id]`; `/manage/custom-widgets/publish/[id]`; `/manage/custom-widgets/workshop`; `/manage/custom-widgets/workshop/[id]` | Extended owner: authoring, preview, publish/install/setup/import and Workshop-facing browser contracts. Widget owner supplies board execution/rendering seam. |
| Workshop compatibility entry | 1 | `/manage/workshop` | Preserve current permanent redirect to `/manage/custom-widgets/workshop`; not a second Workshop application. |
| Users/groups/invites | 10 | `/manage/users`; `/manage/users/create`; `/manage/users/[userId]/general`; `/manage/users/[userId]/security`; `/manage/users/invites`; `/manage/users/groups`; `/manage/users/groups/[id]`; `/manage/users/groups/[id]/members`; `/manage/users/groups/[id]/permissions`; `/manage/users/groups/[id]/settings` | Identity/admin owner; shell registers nested user/group page navigation. No `/manage/users/new` page exists. |
| Management tools excluding Kubernetes | 8 | `/manage/tools/docker`; `/manage/tools/docker/logs/[containerId]`; `/manage/tools/logs`; `/manage/tools/tasks`; `/manage/tools/api`; `/manage/tools/backup`; `/manage/tools/certificates`; `/manage/tools/certificates/hostnames` | Docker/certificate/admin/keys/log policy: reconcile identity/admin with integration/endpoint owners. Backup UI: extended owner + persistence. Tasks/log transport: persistence/endpoint owners. |
| Kubernetes | 9 | `/manage/tools/kubernetes`; `/manage/tools/kubernetes/configmaps`; `/manage/tools/kubernetes/ingresses`; `/manage/tools/kubernetes/namespaces`; `/manage/tools/kubernetes/nodes`; `/manage/tools/kubernetes/pods`; `/manage/tools/kubernetes/secrets`; `/manage/tools/kubernetes/services`; `/manage/tools/kubernetes/volumes` | Integration/admin owners provide environment- and permission-gated context selection, resource pages/actions. Shell owns route wiring only. |
| Management catch-all | 1 | `/manage/[...not-found]` | Replace Next `notFound()` catch-all with management-scoped Router not-found behavior and correct direct-request status. |
| **Total** | **61** | **10 non-management + 51 management** | Route registration is central; page feature ownership is distributed. |

Board viewer source exceptions:

- `/`: `apps/nextjs/src/app/[locale]/(home)/(board)/page.tsx`, reusing `boards/(content)/(home)/_definition.ts`.
- `/boards`: `apps/nextjs/src/app/[locale]/boards/(content)/(home)/page.tsx` and its `_definition.ts`.
- `/boards/[name]`: `apps/nextjs/src/app/[locale]/boards/(content)/[name]/(board)/page.tsx` and `_definition.tsx`.

Do not silently convert `/boards` into a catalog route, or expose `[locale]` as a new URL prefix. Both would change existing links and home behavior.

### 2.2 Ten layouts and all fallback boundaries

Layout paths in this table are relative to `apps/nextjs/src/app/[locale]/`.

| Existing layout | Current duty / target obligation |
| --- | --- |
| `layout.tsx` | Root document/providers: auth/session, user settings, branding, assistant availability, translations/RTL, Mantine color scheme, Jotai, tRPC/Query, modals, Spotlight, metadata/font/global CSS/PWA. Split server reads into explicit sanitized shell loader and document adapter; retain browser provider order and capabilities. |
| `(home)/(board)/layout.tsx` | Root home board shell through shared `_layout-creator.tsx`; preserve home resolution and SSR viewport input. |
| `boards/(content)/(home)/layout.tsx` | `/boards` home shell using the same creator; same behavior, separate public path. |
| `boards/(content)/[name]/(board)/layout.tsx` | Named board viewer shell, permission-derived controls, theme/tour/search/edit providers. |
| `boards/[name]/layout.tsx` | Named board settings branch shell/provider composition; do not force viewer-only composition onto settings. |
| `manage/layout.tsx` | Management shell, permission/env-gated navigation, statistics and tour status. Do not promote its navigation filtering into a blanket authorization rule for every child. |
| `manage/users/[userId]/layout.tsx` | User settings navigation/context; identity owner supplies data and visibility. |
| `manage/users/groups/[id]/layout.tsx` | Group detail subnavigation/context; identity owner supplies authorized group data. |
| `manage/tools/kubernetes/layout.tsx` | Kubernetes shell/context controls with backend/env gates. |
| `widgets/[kind]/layout.tsx` | Standalone widget layout; widget owner preserves embedding behavior separately from dashboard shell. |

Fallback inventory and replacement:

- Loading: `[locale]/loading.tsx`; `[locale]/manage/settings/loading.tsx`. Map to scoped pending UI and Suspense/loading states, not one global spinner covering every page.
- Errors: `manage/error.tsx`; `manage/tools/docker/error.tsx`; `manage/tools/kubernetes/cluster-dashboard/error.tsx`. The last directory has **no `page.tsx` in this inventory**: an error file is not evidence of a tenth Kubernetes page. Reconcile whether it is unused or a nested component concern; do not invent a route or delete it in research.
- Not-found: `[locale]/not-found.tsx`; `(home)/not-found.tsx`; `boards/(content)/not-found.tsx`; `boards/(content)/[name]/not-found.tsx`; `manage/not-found.tsx`. Preserve contextual recovery links and authorization nondisclosure; Router not-found boundary selection and HTTP 404 must both be exercised.
- No parallel-route `@...` or intercepted-route directory was found in the current app tree. Existing dialogs are not Next intercepted-route modals.

Sources: those exact files; `apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx`; [Router not-found][T-notfound], [loading][T-loading], [route trees][T-tree].

## 3. HTTP, document, and middleware handoffs

These **26 route files are not React page routes**. Nitro must dispatch them before the SSR fallback. The endpoint worker owns exhaustive procedure/transport compatibility; this table ensures navigation/document work cannot swallow them or omit their browser consumers. Methods include alias/re-export declarations, not just `export function` matches. Source convention is `apps/nextjs/src/app<path>/route.ts`.

| Existing path | Exported methods | Migration handoff |
| --- | --- | --- |
| `/api/[...trpc]` | GET, POST, PUT, PATCH, DELETE, OPTIONS | Existing REST/OpenAPI adapter, not the browser tRPC endpoint. Endpoint owner preserves public contract and explicit API-key/CORS behavior. |
| `/api/trpc/[trpc]` | GET, POST, OPTIONS | Browser/internal tRPC entry today; replace browser clients with agreed direct-oRPC contracts. Session/API-key policy belongs to identity/endpoint owners. External compatibility, if required, is a separate decision. |
| `/api/auth/[...nextauth]` | GET, POST | Identity adapter/callbacks; frontend login links are consumers, not a replacement auth implementation. |
| `/api/assistant/chat` | POST | Extended owner + endpoint owner; streaming chat cannot be handled as a Router page loader. |
| `/api/about/contributors/crowdin` | GET | About-page contributor data. |
| `/api/about/contributors/github` | GET | About-page contributor data. |
| `/api/about/contributors/opencollective` | GET | About-page contributor data. |
| `/api/about/dependencies` | GET | About-page dependency data/build provenance. |
| `/api/backup/export` | GET | Extended/persistence owners: authorized download. |
| `/api/backup/import` | POST | Extended/persistence owners: upload/import. |
| `/api/backup/migrations` | GET | Backup tooling support asset/data. |
| `/api/backup/sql-wasm` | GET | Backup tooling binary response; not an SSR asset guess. |
| `/api/custom-widgets/[resource]` | GET | Extended/custom-widget resources. |
| `/api/custom-widgets/configuration-request/[token]` | GET, POST | Token configuration flow linking public page and backend request state. |
| `/api/health/live` | GET | Runtime liveness, outside React shell. |
| `/api/health/ready` | GET | Runtime readiness, persistence/background owner. |
| `/api/image-proxy/[id]` | GET | Icon/image consumers: proxy and cache/security semantics. |
| `/api/user-medias/[id]` | GET | Media delivery: board backgrounds/logos, avatar/icon pickers and media management. |
| `/api/openapi` | GET | Public API reference schema; no replacement from Router itself. |
| `/api/onboarding/claim` | POST | Onboarding concurrency/claim boundary, extended/identity owners. |
| `/api/mcp` | POST | Streamable MCP entry; endpoint owner. |
| `/api/mcp/[transport]` | DELETE, GET, POST | MCP transport dispatch; endpoint owner. |
| `/api/mcp/oauth/authorize` | GET | MCP authorization, identity + endpoint owners. |
| `/api/mcp/oauth/register` | POST | MCP registration, identity + endpoint owners. |
| `/api/mcp/oauth/token` | POST | MCP token exchange, identity + endpoint owners. |
| `/well-known/[...path]` | GET, OPTIONS | Source path is `well-known`, not an assumed `/.well-known` page. Preserve actual discovery/rewrite behavior with endpoint/identity owner. |

Additional non-page obligations are not counted as these 26 files: `apps/nextjs/src/proxy.ts`, Next metadata generation, static public/PWA assets, and production `/websockets` proxy/startup. `apps/nextjs/src/instrumentation-node.ts` starts task/WebSocket runtimes; router migration cannot drop that lifecycle. Refer to the persistence/background and endpoints assignments rather than expanding this worker into runtime operations.

`proxy.ts` gates unfinished onboarding except `/init` and `/auth/login`; it clears `accept-language` before locale middleware and relies on locale cookie/configured default. Reproduce the intended entry/locale policy through an explicit Nitro request adapter plus frontend locale context; do not rely on browser language detection or a client-only `beforeLoad` for sensitive access checks. The identity/localization owners must reconcile exact policy and redirect semantics.

## 4. URL, loader, and navigation contracts

### 4.1 Board identity, access, and redirects

`packages/api/src/router/board.ts` resolves board names case-insensitively using `UPPER`; persistent identity is board ID. The home resolver's precedence is device-specific user selection → user desktop fallback → ordered non-everyone group selection → everyone group → instance settings, followed by current access checks. Keep name-to-ID resolution and home resolution on the backend; browser routes must not infer permission from publicness or a cached home result. `packages/api/src/router/board/board-access.ts` conceals inaccessible boards with `NOT_FOUND`.

Recommendation: retain `/boards/$name` and settings URLs, resolve to an authorized ID/projection, and use ID for persistence/cache identity. Centralize typed URL construction and parameter encoding. A rename may change the current public path without changing editor/cache identity; old-name redirect/alias policy is a human decision, not an existing guaranteed alias feature.

Existing discrepancy: `_layout-creator.tsx` redirects an anonymous missing-board case to `/auth/login`, while `boards/(content)/_creator.tsx` preserves a named-board `callbackUrl`. Reconcile a single response policy rather than assuming these are equivalent. Preserve authenticated denial nondisclosure, home-missing recovery, board-specific not-found UI, management denial behavior and locale-aware login return paths. Do not standardize every page's current redirect/not-found behavior without identity-owner review.

### 4.2 Search-state ledger

| Flow | Current source / semantics | Target obligation |
| --- | --- | --- |
| Named/home board layout editing | `boards/_providers.tsx`: `edit === "true"` plus valid `layout` and `canModify` opens edit mode and overrides responsive layout. | Typed search validation must accept existing URLs and enforce permission + layout existence; invalid/unauthorized requests cannot activate editor or force arbitrary layout. |
| Return from layout settings | `settings/_layout.tsx` saves canonical layouts before navigating to `?layout=<id>&edit=true&returnTo=settings`; viewer header saves/cancels then returns `settings?tab=layout`. | Preserve pending/error ordering, canonical IDs, explicit save/cancel and return path. `tab=layout` is generated but `_settings-form.tsx` has no tab/search consumer: decide anchored layout section versus obsolete query, rather than claiming tab restoration works. |
| One-shot add item | `boards/(content)/_edit-actions.tsx`: `add=true` opens selection once and replaces URL while preserving other params. | Separate consumed UI trigger from data-loader dependencies; avoid reopening on unrelated search changes, hydration or Back. Preserve unrelated query state. |
| Inline board creation | `manage/boards/_components/create-board-button.tsx`: `create=true` opens/rekeys inline form. Closing currently replaces with `/manage/boards`. | Retain deep-linked create, reset/cancel, permission gate and inline rather than invented intercepted route. Whether close should retain future unrelated params is a reconciliation choice. |
| App list | `manage/apps/page.tsx`: optional `search`; string positive integer `page`/`pageSize`, defaults 1/10, size ≤100. Redirect when a nonempty result's page exceeds total. | Validate old raw URLs and normalize intentionally. Create-only users see no global app records; loading cannot leak names/URLs. |
| Search-engine list | `manage/search-engines/page.tsx`: same search/page/size shape and out-of-range redirect. | Match list semantics, role-gated create/edit/delete and empty/filtered states. |
| Shared search/pagination controls | `packages/ui/src/components/search-input.tsx`: trim/debounce 250 ms, reset existing page to 1, history replace, preserve other params, clear/Escape. `table-pagination.tsx`: one valid safe-integer page only; duplicate `page` values fall back to 1; relative anchor hrefs plus replace handler. | Raw duplicate-param policy and history behavior need one agreed contract; do not let page schema and control disagree. Preserve real anchor/new-tab behavior and accessible labels. |
| Cross-owner query flows | Integrations list `search`, new integration `kind/url/name`; media `search/page/pageSize/includeFromAllUsers`; Workshop `search/sort/page`; group member `search`; Docker logs `endpointId/name`; log viewer `focus` (string or array); Kubernetes context selection; login return/callback query. | Feature owners supply schemas, normalization, loader dependencies and links before shell registration. No global query stripping or JSON assumptions. Sources are the corresponding pages/context files. |

Router parses primitives as JSON, so `?page=2` becomes a number and `?edit=true` a boolean by default. Copying a `.string().transform(Number)` schema or comparing validated `edit` with `"true"` would change behavior. **Proposed shared URL seam:** preserve legacy raw-string/duplicate information at the parsing boundary, then expose normalized typed route state; choose either a compatible custom parser or carefully tested per-route normalization. Preserve meaningful unknown parameters where controls currently copy them. `validateSearch` and narrow `loaderDeps` prevent UI-only `add/create` triggers from unnecessarily refetching boards. Search validation is not backend authorization. [T-search], [T-loading]

### 4.3 Loader ownership and Next replacement

- Route `beforeLoad` can obtain sanitized shell capabilities and reject/redirect a branch; parent `beforeLoad` runs serially before child loaders. Independent loaders then run in parallel. Use this for navigation coordination, not as proof a direct oRPC request is authorized. [T-auth], [T-loading]
- Universal route modules must never import `@homarr/api/server`, `@homarr/auth/next`, `next/headers`, database/env-secret modules, or integration factories. Inject a browser direct-oRPC client and a server authorized executor behind the same typed feature-service interface. The endpoint owner supplies the server context/policy boundary.
- Loaders populate the shared QueryClient using agreed keys; components read the same cache rather than maintaining independent Router DTO and mutable board Query snapshots without a reconciliation policy. Router owns navigation/pending/error routing; Query owns server-state and optimistic updates. Explicit loader dependencies distinguish board identity/locale/device inputs from UI-only triggers.
- Replace Next `redirect`, `notFound`, `useRouter`, `usePathname`, `useSearchParams`, and `router.refresh` with explicit Router navigation/status/search/invalidation. Shared `@homarr/ui` `Link` currently aliases `next/link`; fixing app imports alone leaves packages coupled. Relative/query/hash, external/protocol URLs, modifier clicks/new tabs, history replace, scroll/focus and callback behavior all need preservation.
- Native document concerns remain: board/root title, favicon, brand images, color-scheme script, CSS, fonts, portal targets and PWA/static assets. `next/image`, `next/font/google`, `next/script`, and `next/dynamic` are not Router APIs. Frontend services owns agreed replacements; shell owns document integration.
- Pending/error/not-found components require route-family scope and correct SSR statuses. Retrying must refresh authorized data, not reset an error boundary over stale private content. Session changes must cancel/clear affected Query and Router state and rebuild capability-dependent catalogs.

## 5. Board viewer and reusable grid/state boundary

Classification: **R** = domain/UI can be reused with current feature semantics; **A** = adapter needed; **X** = Next/runtime-specific orchestration must be replaced. Reuse does not mean its current import graph already compiles under Vite.

| Capability and source | Class | Preserve / proposed seam / acceptance obligation |
| --- | --- | --- |
| Board page assembly: `boards/(content)/_creator.tsx`, `_query-snapshot.ts`, `_widget-resource-preload.tsx` | X/A | Replace RSC/metadata/request caller/dehydration entry; retain authorized board resolution, approved widget query restoration/prefetch and visible-kind resource selection. Widget owner supplies prefetch/render adapter. |
| Board shell: `_layout-creator.tsx`, `(content)/_theme.tsx`, `_custom-css.tsx`, `_client.tsx` | A/X | Explicit normalized viewport/layout/theme/branding/tour/capability inputs; keep backgrounds/custom CSS/headers, main/left/right lanes, readiness/loading feedback and mobile behavior. Server secrets stay out of props. |
| Layout choice/preview/scale: `packages/boards/src/layout-selection.ts`, `layout-preview.ts`, `scale.ts`; `packages/common/src/grid-algorithm.ts`, `layout-resize-source.ts` | R | Reuse deterministic geometry and resize-source selection; preserve desktop/mobile role rules, breakpoints, forced valid layout, thumbnail/preview scale and persisted coordinates. |
| Geometry core: `apps/nextjs/src/components/board/layout/{constants,geometry,reflow,semantics,board-lanes}.ts`, `scaled-board-canvas.tsx` | R/A | Extract/move only at implementation time to board-owned public entrypoints. Keep 212×212 logical tracks, scale-compensated 10 px visual inset, single uniform canvas scale, root lanes at least viewport height, nested container inner-width/row-pitch rules and reading order. |
| Section renderer: `sections/content.tsx`, `container-section.tsx`, `sections/grid/section-grid.tsx`, `fixed-grid-item.tsx`, `section-grid-placements.ts` | R/A | Current `xOffset/yOffset/width/height` map to logical placement; preserve nesting, collapsed display reflow, empty sections, landmarks/headings and widget sizing. No flat grid substitute. |
| Board state: `packages/boards/src/context.tsx`, `updater.ts`, `edit-mode.tsx` | A/X | Initial query uses 30 s stale time; pathname cleanup invalidates; viewport external store uses server snapshot then browser sizing/cookie. Replace navigation/tRPC keys and module-global `boardName` with provider-scoped ID/services/cache identity. Preserve preview provider isolation and allowed layout override. |
| Section collapse: `sections/section-collapse.tsx`, `packages/api/src/router/section.ts` | A | Authenticated `section.changeCollapsed` persistence; anonymous localStorage restoration after hydration; rollback only if failed value is still current. Edit-time temporary expansion must not overwrite durable preference. |
| Advanced focus: `advanced-focus/context.tsx`, `manual-surface.tsx` | R/A | Preserve focus/Escape behavior, reduced-motion and preferences; browser measurements/animation state cannot leak into nondeterministic SSR. |
| Board picker/previews: `board-switcher.tsx`, `board-select.tsx`, `board-layout-thumbnail.tsx`, management board cards | A | Reuse authorized overview/previews and query-on-open freshness; home/mobile badges, keyboard search/navigation, encoded name links and current-board handling. Do not give a viewer an unfiltered board catalog. |
| Board app registration: `board-apps-spotlight-registrar.tsx` | A | Read placed app IDs, load allowed app data, register/unregister board-local Spotlight catalog. Cross-route stale registrations must be removed. |
| First-board/setup states: `board-empty-state.tsx`, `board-setup-checklist.tsx`, header tour targets | A | Preserve permission-dependent setup/add controls, tour completion/status and onboarding/navigation handoffs. Viewer route completion is not only rendering populated boards. |

For geometry acceptance, compare persisted placements across viewport changes, nested sections and every stored layout; preserve `getCollapsedDisplayLayout`, `sortGridPlacementsForReadingOrder`, `getLogicalItemStyle`, `getScaledCanvasStyles`, and `toLogicalCanvasPoint`. Current `layout/README.md` documents these, and implementation files are the authority. Keyboard/numeric movement uses deterministic collision placement, not pointer-only DnD.

### Viewer data and rendering safety

Existing Redis `_query-snapshot.ts` is widget **query-data reuse**, not stored board HTML. Existing full-board DTOs contain viewer-dependent collapse/ACL/creator data; they are not safe shared board-ID-only bootstrap payloads. Reuse [the earlier board rendering investigation][P-board] rather than repeating its cache audit.

Proposed board read result separates durable board/layout/item projection, capability indicators, personalization, normalized initial viewport/layout, document presentation and widget snapshots/freshness. The server authorizes every delivery before any internal HTML-cache hit. Decide shared versus personalized render variants with identity/persistence owners; do not cache sessions, emails/ACL rows or edit controls into an anonymous artifact.

A new board or edit remains a data operation without application rebuilds. If HTML caching is adopted, mutation results must identify a render generation/revision (or equivalent complete projection identity); that is a **proposed contract**, not a field already present throughout current production board storage. Widget values and board render identity are distinct lifetimes. Full hydration still loads provider/widget code; no low-JS/performance gain has been measured here.

## 6. Editor, selection, and persistence semantics

| Flow / source | Classification and preserved behavior |
| --- | --- |
| Enter/save/exit editor: `boards/(content)/_header-actions.tsx`, `_edit-actions.tsx` | A/X. Preserve `hasChangeAccess`, demo read-only behavior, hotkeys, idle/pointer/focus prewarm, load-error retry/notification, busy/pressed labels and latest-board ref at save. `next/dynamic({ssr:false})` is a client-only/lazy boundary, not a reason to SSR the editor by default. |
| Lazy grid runtime: `sections/grid/board-grid-editor-boundary.tsx`, `grid-editor-loader.ts`, `grid-editor-runtime.tsx`, `grid-editor-registry.tsx`, `grid-portal-host.tsx` | R/A. Keep editor loader/registry/portal/DnD ownership separate from read-only rendering. Widget selection and edit components require their own lazy boundaries, not just a lazy route file. |
| Grid transactions: `sections/grid/use-grid-layout-actions.ts`, `grid-interaction-store.ts`, `grid-preview-layer.tsx`, editor code | R/A. Preserve atomic multi-section transaction snapshots, scaled pointer coordinates, collision/compaction, drag/resize preview, transfer between sections and all layouts. Shell/viewer owner publishes read-only geometry; editor owner exclusively owns editor transaction mutations. |
| Item operations: `items/item-actions.tsx`, `items/actions/*`, `item-menu.tsx`, `item-move-modal.tsx` | R/A. Add/duplicate/options/advanced options/integration selection/move/resize/remove update local board cache; header explicit save persists that state. Keep first-empty-position and keyboard/numeric move fallback and undo notifications. |
| Section/container operations: `sections/section-actions.tsx`, `container/container-edit-modal.tsx`, `container-menu.tsx` | R/A. Preserve create/edit/remove nesting and associated placements/layouts, local update semantics, confirmations and reading-order/geometry. |
| Multiselect: `selection/board-selection-context.tsx`, `board-selection-toolbar.tsx`, `board-item-clipboard.ts` | R/A. Selection clears on edit exit/Escape; copy/paste uses clipboard serialization/validation and fresh IDs; paste is all-or-none locally; delete/move/undo use `usePersistBoard` and persist immediately. Preserve input/contenteditable paste exclusion, errors, notifications and sounds/preferences. |
| Contextual widget actions: `items/widget-context-menu.tsx`, `lazy-widget-edit-modal.tsx`, widget modal contracts | A. Context menu also uses immediate persistence; retain integration permissions and custom definition availability. Widget owner supplies option/action UI; editor owner supplies host/cache mutation callback. |
| Bulk app open: `sections/use-open-section-apps.ts`, `container-section.tsx` and `@homarr/common` safe-link utilities | R/A. Preserve recursive section membership in the active layout, unique app IDs, authorized app lookup and safe href rules. Current code opens windows and displays a confirmation/information modal after a popup is blocked; it is not a guaranteed proactive bulk-open confirmation. Do not convert external apps into SPA routes or drop browser popup constraints silently. |
| Dirty navigation: viewer header + `components/manage/{use-unsaved-changes-guard,unsaved-changes-guard}.*` | X/A. Current board header intercepts anchors/popstate/beforeunload and marks all edit mode dirty; settings form tracks actual dirtiness. Replace interception with Router blocker + existing confirmation modal, covering links, imperative navigation, Back/Forward, unload and save/cancel bypass. Preserve modifier/new-tab intent. |

**Important mixed-save behavior:** item/grid local edits are deferred to explicit `board.saveBoard`; selection paste/delete/move/undo and widget context actions can persist immediately. A single “discard draft” transaction model would not reproduce current behavior. Decide whether to retain this mixed semantics or deliberately redesign it; until agreed, the preservation contract must enumerate operation-level timing.

`usePersistBoard` serializes mutations using `scope: { id: "board-save:<id>" }` and invalidates on failure only when the cached board still equals the failed optimistic value, avoiding rollback over a newer edit. Header saves currently use another mutation path. The replacement must coordinate all writers, in-flight saves and route/session transitions through the same board-scoped ordering policy; do not blindly invalidate/refetch while a newer optimistic draft exists. Backend remains authoritative for modification/integration permissions and canonical layouts/IDs.

Router `useBlocker({shouldBlockFn, withResolver, enableBeforeUnload})` supports custom confirmation flow. Installed `@tanstack/react-router` source uses `true` to block; resolver `proceed` allows and `reset` keeps the block. The pinned current docs' opening prose contains older/opposite blocker wording, while its `shouldBlockFn` examples agree with installed source: implement against the pinned hook/source, not prose inversion. [T-block], installed `node_modules/@tanstack/react-router/src/useBlocker.tsx`.

## 7. Board management/settings and apps/bookmarks

### 7.1 Board overview and settings

- `manage/boards/page.tsx` uses `board.getManageOverview`, current session and permission-derived menus; preserve previews, counts, visibility/creator/home badges and empty states. The overview service is public but filters capabilities; do not impose a blanket “all management pages require admin” rewrite.
- `BoardCreateForm` (`packages/forms-collection/src/board-create/board-create-form.tsx`) currently serves the inline management create entry. Preserve validation, canonical returned board, encoded destination, cancellation/rekeying, notification and cache refresh; do not require editor/other integrations to finish to demonstrate creation.
- `board-card-menu-dropdown.tsx` and `duplicate-board-form.tsx` preserve duplicate naming/validation, current access, home/mobile-home changes, full-access deletion confirmation and redirects. Duplicate requires `board-create`; settings/change and delete/full access are different permissions.
- Settings `page.tsx` loads authorized board, settings/permissions and instance-home visibility constraints. `_settings-form.tsx` handles general metadata/logo/favicon, layout settings, backgrounds, colors/opacity/radius/icon color, custom CSS, status behavior, dirty save/discard and title preview restoration on exit. Retain all these groups, not just board title/layout.
- Save partial settings and layouts currently runs concurrently through `Promise.all` when changed; returned canonical layouts replace temporary IDs. The form resets dirty state only after success, updates favicon and restores previews on discard/unmount. Partial success/error policy must be recorded: concurrency is **not evidence of an atomic combined server transaction**.
- `_layout.tsx`/`_layout-preview.tsx` preserve add/delete/reset, role/breakpoints/columns/gutters/resize-source behavior, layout preview and save-before-edit handoff. Mobile layout gutters normalize to zero. Backend `saveLayouts` contains projection/coordinate logic; do not reproduce it independently in the browser.
- `_board-access.tsx` and `_danger.tsx` expose ACL/rename/visibility/delete only with full access. Instance home board hides the visibility switch. Permissions/visibility writes need live authorization and render/data/catalog invalidation, not only a refreshed form.

Target: board management owner supplies overview/settings route modules and board management services. Identity owner defines authorization/capability meaning; persistence/endpoint owners own durable transactions and service transport. Viewer/editor consume the canonical layout result without becoming settings page owners.

### 7.2 Apps/bookmarks

App list/create/edit/delete is a separate vertical, not a widget rewrite. `manage/_access.ts` and `manage/apps/page.tsx` distinguish create-only from global management: create-only users must not browse all app names/URLs. Safe external hrefs, multiline descriptions, icons, mobile create affordance, filtered/empty states and pagination all remain.

`packages/forms-collection/src/new-app/_form.tsx` carries name/description/icon/href/ping URL validation, icon suggestions, pending-disabled controls, optional different ping URL, create-another reset, back-to-overview and an imperative `AppFormHandle` with `submit(): Promise<boolean>`/`isDirty()`. Preserve clean-form initialization when navigating between edit records without overwriting a dirty form. Extracting it must retain embedded/no-buttons operation and completion callbacks.

Target: apps owner publishes reusable form plus authorized selectable/by-ID/catalog/paginated service adapters and mutations. Icons/media and ping are explicit dependencies on their existing service owners; a static icon catalog and mocked ping can unblock page development but cannot establish full acceptance. Apps placed on boards, assistant-created apps and linked integration apps must all see mutation results and catalog refreshes.

### 7.3 Form/modal consumer reconciliation

There is no route-interception architecture to port. Preserve local/context modal state, focus/return-focus, close interceptors, nested selection/create and callbacks; URL-triggered opening is only the narrow flows in section 4.

| Shared component | Verified consumers / cross-owner seam |
| --- | --- |
| Shared `AppForm` | `packages/forms-collection/src/new-app/_app-new-form.tsx`; `manage/apps/edit/[id]/_app-edit-form.tsx`; `packages/modals-collection/src/apps/quick-add-app/quick-add-app-modal.tsx`; `packages/modals-collection/src/apps/app-select-modal.tsx` inline creation; `packages/widgets/src/modals/embedded-app-edit-form.tsx`; `components/assistant/assistant-human-tools.tsx`. The integration new form's local `AppForm` is a different component, not this shared form. |
| `AppSelectModal` | Board `_edit-actions.tsx`; integration edit `_integration-edit-form.tsx`; its own inline creation. Provide same canonical app return/select callback and eligibility; apps owner owns shared modal. |
| `QuickAddAppModal` | Widget app-input flow via widget option UI; retain embedded completion rather than management-page redirect. Widget owner supplies the caller; apps owner supplies implementation. |
| `BoardCreateForm` | `manage/boards/_components/create-board-button.tsx`; preserve inline cancel/reset and success navigation. |
| `IntegrationSelectModal` | `components/integration/integration-select-modal.tsx` imports management `NewIntegrationForm`; consumers: board `_edit-actions.tsx`, `items/item-select-modal.tsx`, `items/lazy-widget-edit-modal.tsx`, assistant `assistant-widget-tool.tsx`, Docker `docker-reconciliation.tsx`. Integration owner should expose a route-independent form/selection API rather than continue importing management page internals across features. |
| Integration completion → item selection | `completionBoardId`/creation completion passes to board item selection. Editor owns item host; integration owner owns authorized selection/create result, supported widget kinds and completion contract. |
| Item/widget/container/move dialogs | Board selection/add/edit and context-menu hosts; widget owner owns kind-specific options/renderer, editor owns board placements and draft persistence. Keep definition availability, option validation and lazy error handling. |
| Icon/media picker and Docker/media dialogs | Shared forms/modals and board presentation consumers. Extended/integration owners supply uploads/previews/browser actions; frontend-services owner supplies modal infrastructure. Do not count “apps form renders” as these dialogs being migrated. |

## 8. Search, Spotlight, commands, and navigation catalogs

`packages/spotlight/src` registers **eight modes**: `search` (`/`), `apps` (`#`), `command` (`>`), `preferences` (`?`), `assistant`, `external` (`!`), `media`, and `userGroup` (`@`). “Page” is a group within modes, not a ninth registered mode. Sources: mode registry/open API, `components/spotlight.tsx`, `modes/*`, preferences registry and catalogs.

| Capability | Preservation / target adapter |
| --- | --- |
| Open/hotkey/mode UI | Global open functions, keyboard selection, escape/back/nested children stack, query-prefix handling, focus, loading/error and close-on-trigger policies. Lazy Spotlight provider must remain available in both management and board shells. |
| Catalog/search | Authorized apps/boards/integrations/user-group/page data; query-on-open refresh, remote debouncing and source-specific queries. Board-local app registrar augments results and cleans up after route changes. Search service interfaces may be ported independently of every integration implementation. |
| Interaction algebra | `lib/interaction.ts`: link (including new tab), javaScript (optional close policy), setQuery, mode, children/details, none. Replace only navigation dispatch, preserving safe URL guards and external app behavior. |
| Page/global commands | Management links; new board `?create=true`, new app/integration/user and other commands; permission filtering, current-page breadcrumbs/navigation and authorized route registry. |
| Preferences | Language, theme/settings/action children use settings/preferences APIs and session state. Localization/frontend-services owner supplies mutation + document refresh semantics. |
| External search | Search engines, integration search and DuckDuckGo bangs, safe external links/new-tab actions. Search-engine CRUD and chosen defaults/shortcuts must update this mode. |
| Media | Source-specific search/play/action behavior and backend request/stream contracts; extended/widget/integration owners supply adapters. |
| Assistant | Mode/open/streaming UI contract; extended owner supplies actual assistant feature. Preserve availability/capability indicators rather than unconditional affordance. |
| Users/groups | Permission-filtered catalogs, detail/subpage links and children actions; identity owner supplies data and authorization. |

Concrete source discrepancies to reconcile, not silently enshrine:

1. `modes/command/global-group.tsx` links new users to `/manage/users/new`; actual page is `/manage/users/create`.
2. `modes/page/pages-search-group.tsx` and management shell navigation use different visibility conditions for some entries. Share a capability-aware navigation registry with identity owner; retain server checks and decide intended discoverability.
3. `modes/app-integration-board/boards-search-group.tsx` sets `hidden` for board settings, returns the array unfiltered, while `components/actions/children-actions.tsx` filters `action.hide`. Thus this source path does not suppress that settings action as intended. Backend policy remains mandatory; this is a UI filtering mismatch, not evidence permission can be bypassed.
4. Several header/card/Spotlight links interpolate raw board names; switcher/create encode them. A central route builder must reconcile special characters and case/rename behavior. Do not assume arbitrary names are already safe because one path works.
5. `manage/users/groups/[id]/_rename-group-form.tsx` revalidates `/users/groups/<id>` without `/manage`; user general/security forms revalidate `/manage/users/<id>` despite only general/security child pages being registered. Hand these refresh-target discrepancies to identity/shell owners rather than mechanically turning them into Router route IDs.

## 9. API surface and invalidation obligations

### 9.1 Board procedures: verified 26, not 25

`packages/api/src/router/board.ts` declares **11 reads + 15 mutations**:

- Reads: `exists`, `getPublicBoards`, `getBoardsForGroup`, `getAllBoards`, `getManageOverview`, `catalog`, `search`, `getHomeBoard`, `getBoardByName`, `getBoardSettings`, `getBoardPermissions`.
- Mutations: `createBoard`, `duplicateBoard`, `renameBoard`, `changeBoardVisibility`, `deleteBoard`, `setHomeBoard`, `setMobileHomeBoard`, `saveLayouts`, `resetLayout`, `savePartialBoardSettings`, `saveBoard`, `saveUserBoardPermissions`, `saveGroupBoardPermissions`, `addItem`, `updateItemLayout`.

`section.changeCollapsed`, app/search-engine services and widget/integration catalogs are additional routers, not part of this 26. Procedure names are inventory, not a mandate to expose unchanged tRPC signatures in the new browser API. Endpoint owner can compose direct-oRPC contracts over retained domain functions or new implementations without moving every database/integration module before a page works. Preserve validation, nonleaking access checks, transactional persistence and canonical outputs.

### 9.2 Four different refresh layers

Current `revalidatePathActionAsync` consumers include board header/settings/overview/create/duplicate/home changes, app create/edit/delete, search-engine CRUD and cross-owner integration/custom-widget/auth/onboarding/admin/media flows. It is a Next page revalidation wrapper. A replacement `router.invalidate()` is **not** an HTML-cache purge, a Query cache invalidation, or an authorization refresh by itself. [T-loading], [P-stack]

Proposed mutation result/effect contract distinguishes:

1. **Query server-state:** canonical board/settings/layout/app/search catalog keys; synchronize or invalidate only affected records with optimistic ordering.
2. **Router route data:** invalidate affected active/cached matches/home resolution; `invalidate({filter,sync})` when callers need refresh completion. Avoid whole-app invalidation for every edit.
3. **Server render artifacts:** transactional render-generation change or equivalent complete projection key; old in-flight artifacts must not become current after commit. Persistence owner decides storage/revision mechanism.
4. **Policy/session/capability state:** live authorization on every delivery; cancel/clear private client data/catalogs on session/ACL transitions. A warmed public artifact cannot authorize later private access.

| Mutation family | Required affected data/navigation/render surfaces |
| --- | --- |
| Create/duplicate | Authorized overview/catalog/search/switcher and new board read; canonical IDs/names/layouts; new URL without rebuild. |
| Rename | ID-stable board/settings Query state; name lookup/navigation/breadcrumb/title; overview/Spotlight/switcher; old-name policy; render identity/document as necessary. |
| Delete | Board/settings/overview/catalog/home resolution, related selected/current route recovery; do not retain private content in stale Router matches. Backend owns home/layout/item referential cleanup. |
| Home/mobile home | Home resolver for both `/` and `/boards`, viewer settings/preference UI, board-card badges and picker; device-specific precedence preserved. |
| `saveBoard`, `addItem`, `updateItemLayout` | Structure/options/placements and dependent widget/custom-API query inputs; matching editor/viewer state; render generation. External/API/assistant writers must trigger equivalent effects, not just browser header saves. |
| `saveLayouts`, `resetLayout` | Canonical layout IDs/roles/breakpoints/resize sources/placements, previews and active override; return-to-settings state; render generation. |
| Partial presentation settings | Board title/metadata/favicon/logo/background/theme/custom CSS/status, preview state and render generation; document update and settings refresh. |
| Visibility/user/group ACL | Immediate live delivery gate, current capabilities/catalogs/overview/bootstrap variants; rendered edit controls/policy epoch. Never defer revocation until HTML TTL or route SWR. |
| Collapse | Viewer-personalization Query state and durable/local preference; shared artifact unchanged only if collapse is outside its projection. |
| App changes | App record/list/selectable/catalog/placed-app queries/Spotlight registrations, ping/icon presentation and render inputs that actually contain app details. |
| Search-engine changes | List/record/default/preference/catalog/external-search choices and shortcuts. |
| Identity/branding/custom definition changes | Corresponding shell capability/document/locale/definition variants plus board/query inputs; coordinated with their domain owners. |

Unknown: present source does not establish complete cross-tab/viewer revision fanout or a universal render-revision mechanism. Decide whether existing viewers learn remote changes through refetch/navigation/polling/subscription, with explicit stale-display policy. Session transition and concurrent optimistic-save behavior must be demonstrated, not inferred from the fixture's epoch checks.

## 10. Primary Router evidence versus the fixture

### 10.1 Versions and evidence limits

Earlier approved rendering research is reused: [Nitro/Router rendering][P-stack] and [current board rendering/cache][P-board]. Context7's recorded documentation queries failed with “Monthly quota reached”; this research uses official commit-pinned documentation plus installed package source, not repeated quota calls or guessed API memory.

The fixture manifest pins Nitro `3.0.260903-beta`, Router `1.168.8`, React `19.2.7`, Query `5.101.2`, oRPC `2.0.0-beta.43`, and Vite `8.1.4`. Installed Router is `1.168.8` with core `1.168.7`; router-plugin is not installed in this fixture. Router documents below are pinned to the observed official repository commit `e26735166f9c015a4705088116103d94eefbf07e`, **not asserted to be release-matched docs**. Installed source/declarations win for this pair. Initially guessed release-tag/framework-directory raw URLs returned 404 and are not evidence.

| Official/source finding | Migration implication |
| --- | --- |
| Code/file route trees support dynamic params and pathless layouts. [T-tree] | Preserve runtime-created board names with one route pattern and nested shell/settings modules; source-route generation is unrelated to database board creation. |
| Serial `beforeLoad`, parallel loaders/component loads; `loaderDeps`, pending controls and loader freshness/SWR. [T-loading]; installed core loading source | Explicit feature-loader context; only true data dependencies enter loader identity. Authentication capability refresh and optimistic drafts need a policy beyond default SWR. |
| JSON-first search and inherited validated search. [T-search] | Compatibility normalization needed for current strings/duplicate handling; don't spread arbitrary parsed state into mutation inputs. |
| Parent authenticated route examples use `beforeLoad`/redirect and injected context. [T-auth] | Navigation guard is useful; backend requests independently enforce policy. Avoid bundled server imports. |
| `notFound()` resolves scoped not-found components; error/pending rendering are separately configured. [T-notfound], [T-loading] | Retain board/home/manage recovery hierarchy and SSR statuses. |
| File-route automatic code splitting needs bundler plugin before React; root route is not split; critical matching/search/beforeLoad remains eager. Current automatic grouping defaults component/error/not-found; loader/pending splitting is configurable. Code-based routes can split explicitly. [T-split], [T-auto] | Choose file or code route convention centrally. Plugin absence means no automatic splitting claim for the fixture; route splitting does not automatically split all widgets/editor/modal bodies. |
| External Query cache needs explicit router-factory QueryClient/provider and dehydration/hydration. [T-external] | Request-scoped SSR Router + QueryClient; one browser cache authority and mutation keys; never module-global SSR session/cache state. |
| SSR APIs are experimental/shared with Start internals; documented imports are `/ssr/server` and `/ssr/client`. [T-ssr]; installed exports | Isolate/pin SSR bootstrap replay adapter. Nitro supplies host/assets, not Router serialization protocol or Start server functions. |
| Installed core `ssr/createRequestHandler.ts` creates URL memory history, awaits `router.load()` and dehydration; current docs describe lightweight no-op server history. Installed React `ssr/renderRouterToString.tsx` uses synchronous rendering/injected HTML and status/headers/cleanup. | Record drift; do not mix newer history assumptions with installed implementation. Initial non-streaming cached replay is easier to inspect; streaming needs an explicit lifecycle, not a casual React stream replacement. |
| Installed Router supports filtered/synchronous invalidation and blocker resolver semantics. [T-loading], [T-block]; installed `router.ts`/`useBlocker.tsx` | Use explicit refresh boundaries and blockers; manual global anchor/history hacks need not survive, but their intended user behavior must. |

Nitro beta/main cache configuration drift and the cited `vite-ssr-tsr-react` example being CSR are already established in [P-stack]. No new claim that beta/main APIs or Start examples are interchangeable is made here.

### 10.2 Actual experiment inspection

`apps/nitro-experiment/src/app/router.tsx` defines code-based `/` and `/boards/$boardId`. Its index component is not the product home route. HTTP `src/server/render/handler.ts` redirects `/` to `/boards/public`, matches only `/boards/:id`, and 302-normalizes away **all search strings and trailing slashes** after an authorized read. It reads one fixture widget, fixes English/light, and keys internal artifacts by identity + snapshot + assets. It returns `Cache-Control: no-store` and rechecks board policy before delivery.

`renderDocument` creates a request Router/Query cache but hand-constructs compact `DehydratedRouter` match fields, accesses `router.stores.*`, and prepares fixture-specific serialized state. `src/features/viewer/document-state.tsx` rewrites `window.$_TSR.router`, restores Query/Router state and validates exact fixture route/snapshot assumptions. `reconcileBoard` has route/epoch/revision checks and uses `invalidate({sync:true})`; these checks are bounded to the fixture route shape.

Consequences:

- Useful evidence for an authorized, coherent, populated SSR/cache seam and explicit client reconciliation, **not proof of full grid/editor/navigation parity**.
- Cannot copy its HTTP matcher/query stripping into production: it breaks settings, search, deep-linked editing/create/add and identity entry routes.
- Cannot generalize its dehydrated match schema/private stores without a pinned adapter and acceptance for nested routes, search, redirects, pending/errors and asset manifests.
- Fixture board ID path is not the product board name path. Minimal widget/title editor is not the existing multi-layout/section/select/clipboard/options editor.
- No production locale/RTL/theme/viewport/home/management/Spotlight/modal parity or bundle/performance improvement is established. No fixture browser or container was probed during this research.

## 11. Contract-first parallel implementation graph

These are recommended future batches for the coordinator's approved specification, **not dispatched implementation tasks**. Each batch can demonstrate its own flow using disposable records/service fixtures before every provider is ported. Fixtures prove only the named behavior; actual endpoint/policy/device/library compatibility remains a later acceptance gate.

### 11.1 Interfaces to settle before overlapping edits

| Shared contract | Proposed content / exclusive registration writer |
| --- | --- |
| Shell/request services | Sanitized viewer/session capability snapshot, locale/direction/formatting, presentation/preferences, onboarding/feature availability and viewport inputs; separate server executor from browser oRPC client. Identity/localization owners define meaning; shell owner wires. |
| Route contribution | Route ID/path/parent, validateSearch/normalization, narrow loaderDeps, feature-service keys, scoped pending/error/not-found components and navigation metadata/capability predicate. Feature owners publish modules; shell owner edits root route tree/type registration once. |
| Board read projection | Immutable ID, canonical name, durable layouts/sections/items/presentation, capabilities, separate viewer preferences, selected initial layout/viewport and freshness/render identity. Board/identity/persistence/endpoint owners agree before UI commits freeze schemas. |
| Board commands/results | Operation-level immediate/deferred semantics, authorized inputs, canonical IDs/layouts, ordered board-scoped save, commit/render identity and explicit affected-data effects. Endpoint/persistence owners define service; editor/settings implement clients. |
| Query/cache keys and effects | Stable entity + normalized inputs + relevant viewer/locale/device partition; canonical board cache; filtered Router refresh, render revision and session invalidation distinct. One cache-registration writer; feature owners return effects rather than editing global switches. |
| Widget host | Kind/options/definition availability, approved cached-query prefetch, lazy render/edit component, integration capabilities, loading/error/freshness and mutation completion. Widget owner publishes host contract; viewer/editor integrate without porting each kind. |
| App/integration picker completion | Authorized selectable summaries, route-independent form, on-created/on-selected canonical result, optional board placement completion, close/dirty interceptor/focus behavior. Apps/integration owners own their pickers; editor supplies placement callback. |
| Navigation/modal/document adapters | Typed internal href construction plus safe external links, relative/hash/query navigation, history/scroll intent, blocker confirmation, modal portals/focus and metadata/favicon update. Frontend-services + shell owner integrate once. |
| Cached SSR artifact | Matching HTML/Router/Query/document inputs + schema/build/assets/render identity; current authorization before every serve; stable request lifecycle/cleanup. Single shell/SSR writer with persistence owner. |

Names here are conceptual contracts, not new exported APIs or chosen library signatures. They must not permit `Request`, credentials, database clients or server env in serializable/browser context. Reuse `@homarr/common`/existing board geometry rather than creating parallel general utilities.

### 11.2 Independently demonstrable vertical batches

| Batch | Exclusive feature ownership | Genuine prerequisites | Can port before other workers finish | Human demo checkpoint |
| --- | --- | --- | --- | --- |
| S — shell/router/request/bootstrap | Root document/router/provider factories, SSR/client entries, route/nav registration, shared link/search/cache adapter integration; manifests/lockfile/plugin configuration remain single-writer | Chosen pinned stack and minimal identity/locale/request/service contracts | Use one mock authorized feature route; implement nested route/search/404/redirect/blocker/document/asset lifecycle without all pages/providers | Cold deep link, reload, nested navigation/Back/Forward, correct pending/error/404, coherent hydration and asset replay; no server imports/secret state in browser graph. |
| V — board viewer + read-only geometry | Board viewer/page modules, geometry/lane/section rendering, previews/focus/collapse/setup/switcher; board read projection adapter | Board projection + capability/viewport/host/query contracts; S mounts module for integrated demo | Reuse pure grid and DTO fixtures with app + one widget slot; no need to wait for every widget/integration | `/`, `/boards`, named public/private boards; responsive stored layouts, nested/collapsed rails, focus, picker and fresh authorized delivery. |
| E — editor + selection | Lazy editor runtime, DnD/transactions, item/section/container ops, clipboard/multiselect/undo, edit header/dialog hosts | Stable geometry and board-state/command/picker/host interfaces; S blocker adapter | Numeric movement, local/immediate saves, selection and fixture picker/option panels independently of production provider catalog | Permission-gated deep-linked edit; drag/resize/cross-section across layouts, copy/paste/delete/undo, add modal, save/cancel/leave/error races. |
| B — board overview/settings | Management board module/cards/create/duplicate/home/delete; all settings sections, ACL/danger clients, layout preview/edit handoff | Board management command/result/permission/Query effects + shell adapters | Overview/create/duplicate and settings with authorized disposable services; mock identity selection and preview host | Create → view → duplicate; set device home; save canonical layouts → edit → return; dirty discard; rename/visibility/ACL/delete/revocation. |
| A — apps/bookmarks | Three app route modules, shared app form/select/quick-add/embedded adapters, authorized catalog/pagination/CRUD | App DTO/service + role/capability semantics + icon/media/link/modal contracts | Form/create-another/list/CRUD with service fixture; publish picker contracts early for E/integrations/assistant | Create-only cannot list global apps; CRUD + safe launch/search/pagination; selection/quick-add works in board and embedded modal with no forced management redirect. |
| N — search/Spotlight/search engines | Three search-engine modules, Spotlight registry/modes/catalog/interaction dispatcher/preferences clients | Route/nav/link catalog and source service interfaces + frontend preferences adapter | Port interaction algebra, eight-mode UI and search-engine CRUD with mocked remote catalogs; assistant/media only slots initially | Prefix/hotkey/nested back/close/new-tab, current-board apps, authorized catalog refresh, search-engine mutations, preference document update, no stale mode data after logout. |

**Dependency graph:** interface agreement → S minimal harness and feature service adapters; V/E/B/A/N develop concurrently against those interfaces. V publishes geometry early; E does not wait for every V widget. A/integration owners publish picker/form completion early; E does not wait for their management pages. Identity/localization owners supply shell adapters rather than own every frontend file. Endpoint owner can deliver board/app/search vertical contracts individually; no dependency on completion of all endpoint migration. S integrates route contributions serially; final feature acceptance joins actual identity/persistence/widgets/integrations/transports.

Avoid overlapping file ownership: V owns shared read-only geometry/renderer, E editor runtime/selection, B management/settings, A app form/pickers, N Spotlight/search engines. Existing app imports between these areas are replaced by agreed package contracts, not competing edits. Shared `packages/ui` adapters/provider root/query registration, root route tree, SSR bootstrap, package exports/manifests/lockfile each require one named writer. Feature owners submit small registrations to that writer. Do not let two workers independently rewrite `packages/boards/src/context.tsx`/`updater.ts`; assign their central state/cache adapter to one owner before implementation.

### 11.3 Real blockers versus non-blockers

- **Blocks final security acceptance:** production session/request propagation, live access checks and correct direct-oRPC middleware; real revocation/bootstrap isolation. Mock policy cannot establish this.
- **Blocks editor/settings integration:** canonical layout/ID outputs, save timing/order and shared board state/cache identity. Source geometry alone does not resolve state ownership.
- **Blocks cached SSR graduation:** chosen projection/personalization/freshness/revision and pinned serialization/asset replay; fragment/islands/full-root choice if changed from current full hydration.
- **Blocks actual cross-owner feature acceptance:** picker completion, widget prefetch/options/host contract, media/icon requests, preference localization/document update and deployed task/subscription lifecycle.
- **Does not block isolated development:** migrating every provider, every widget, all external transports, all administration pages, all background jobs or Linear issue publication. Disposable fixtures/contracts can demonstrate a bounded vertical while those ports proceed.
- **Does not establish completion:** an inventory, passing compilation, two fixture routes, a screenshot, or a mock adapter. Require observed user-visible behavior for each capability and direct-request/client-navigation variants.

## 12. Acceptance obligations and remaining decisions

### 12.1 Future parity checkpoints (not run in this research)

1. **Route ledger:** all 61 entries registered or intentionally redirected with an approved replacement; all 26 HTTP entries dispatched outside page fallback; every layout/fallback mapped. Exercise direct load and browser transition for each route family, permissions and feature/env gates. Management layout visibility never substitutes for per-service policy.
2. **URLs:** both home paths, case-insensitive names, encoded characters, rename/delete/missing/denied recovery; legacy query parsing (including duplicates, invalid numbers/booleans), add/create consumption, pagination clamp/history, return-to-settings and safe login callbacks.
3. **Document/SSR:** locale/RTL/theme/branding/title/favicon/background/custom CSS/font/PWA assets, SSR viewport snapshot to client size, provider IDs/portals; coherent HTML+Router+Query data without recoverable hydration errors. Anonymous/authenticated/private/collapse variants and warmed-cache revocation cannot cross-leak.
4. **Viewer/grid:** all stored layouts/roles/resize sources, fixed tracks/insets/uniform scale, nested sections/gutters/mobile rules, collapsed reflow, reading order/landmarks, focus/reduced-motion, previews/switcher, empty/setup states and allowed app launch/status.
5. **Editor:** lazy-load/prewarm/retry, permission/demo restrictions, pointer and keyboard/numeric placement, multi-section transactions, add/duplicate/edit/options/integrations/remove, clipboard/fresh IDs/input exclusion, multiselect/move/delete/undo; exact immediate/deferred timing and failed-save/newer-draft races.
6. **Management/settings/apps:** create/duplicate/home/rename/visibility/ACL/delete; settings concurrent-failure/canonical-ID/dirty/discard/favicon restoration; app create-only isolation, CRUD/create-another/pagination/search, select/quick-add/embedded/assistant consumers and icon/ping dependencies.
7. **Search/navigation:** all eight Spotlight modes and interaction kinds, capability filtering, current-board registration cleanup, catalog refresh/debounce, search engines/defaults/preferences/external bangs, modifier/new-tab behavior, Back/Forward/unload blocker and focus return.
8. **Invalidation/session:** route data, Query data, internal render generation and live policy separately; API/assistant/external writes have equivalent effects; logout/switch identity cancels stale private data; cross-tab/remote edit freshness follows recorded policy.

These are demo/verification requirements for later approved implementation. This note does not create tests or run checks; it does not prescribe broad suites or repository-wide typechecking.

### 12.2 Human choices still open

- Preserve public name/home URLs exactly versus approved redirect/alias redesign; rename alias lifetime and intended reconciliation of anonymous login callbacks.
- Full hydration versus a deliberately smaller viewer/islands; placeholder shell versus bounded-stale populated first paint; acceptable widget/remote-board staleness and publication of freshness. The experiment's populated fixture is not a full-product decision.
- Shared sanitized board artifact versus personalized variants; collapse/viewport/theme/locale/document partition; render/ACL revision mechanism, retention and remote-viewer update transport. Decide with identity/persistence owners.
- Keep mixed immediate/deferred editing or intentionally unify draft semantics; header save ordering, failed partial settings saves, what “discard” promises after immediate writes.
- Central code-based routing versus file routing/plugin; explicit pinned-version SSR adapter ownership/upgrade policy. Both can represent these routes; current fixture/plugin absence is not a final convention decision.
- Resolve known navigation/filter/search drift: new-user path, `hide`/`hidden`, page/nav visibility, raw name links, generated but unconsumed `tab=layout`, refresh targets and query-close preservation. Repairs are recommended, not performed or presumed approved.
- Name owners for management landing/about, Docker/Kubernetes/certificates UI, shared tour/setup state and static/PWA/document assets. Existing broad research categories cover their services but do not yet prove exclusive UI ownership.

### 12.3 Concrete uncovered/unknown capabilities for synthesis

No application page or HTTP route file is left unlisted. **Unassigned implementation ownership**, however, remains for shared central board state/cache adapter, root document/nav/SSR registration, management landing/about, some tool UIs, tour/setup status and PWA/static asset plumbing. Assign these explicitly; do not equate their presence in an identity/integration inventory with a complete frontend port.

Runtime compatibility and hydration of actual charts/custom JSX/standalone widget pages, real auth/cookie/CSRF policies, locale/provider replacements, upload/image-proxy behavior, external API compatibility, production task/WebSocket fanout and deployment prefix/proxy behavior belong to sibling work and final observed acceptance. The separate docs application and Go/PocketBase Workshop service remain outside application-runtime replacement unless their client contract forces work. No production cutover, library compatibility guarantee, performance result or full-parity claim is made.

## Sources

### Checkout evidence

All source paths in this note refer to the recorded checkout; paths are exact locator citations. Highest-value entrypoints:

- `apps/nextjs/src/app/[locale]/layout.tsx`, `manage/layout.tsx`, `manage/_access.ts`, `apps/nextjs/src/proxy.ts`, `packages/translation/src/routing.ts`.
- `apps/nextjs/src/app/[locale]/boards/{_layout-creator.tsx,_providers.tsx,(content)/_creator.tsx,(content)/_client.tsx,(content)/_header-actions.tsx,(content)/_edit-actions.tsx}` and `boards/[name]/settings/*`.
- `packages/api/src/router/board.ts`, `router/board/board-access.ts`, `router/section.ts`; `packages/boards/src/{context.tsx,updater.ts,edit-mode.tsx,layout-selection.ts,layout-preview.ts,scale.ts}`.
- `apps/nextjs/src/components/board/{layout,sections,items,selection,advanced-focus}/*`; `packages/common/src/{grid-algorithm.ts,layout-resize-source.ts,revalidate-path-action.ts}`.
- `apps/nextjs/src/app/[locale]/manage/{boards,apps,search-engines}/*`; `packages/forms-collection/src/{new-app,board-create}/*`; `packages/modals-collection/src/apps/*`; `packages/widgets/src/modals/embedded-app-edit-form.tsx`.
- `packages/spotlight/src/{modes,preferences,lib,components}/*`, `apps/nextjs/src/components/board/board-apps-spotlight-registrar.tsx`, `packages/ui/src/components/{search-input.tsx,table-pagination.tsx}`.
- `apps/nitro-experiment/package.json`, `src/app/router.tsx`, `src/server/render/handler.ts`, `src/features/viewer/document-state.tsx`.
- Installed `node_modules/@tanstack/{react-router,router-core}/package.json`, React `src/useBlocker.tsx`, `src/ssr/server.ts`, `src/ssr/client.ts`, `src/ssr/renderRouterToString.tsx`, core `src/{load-matches,router}.ts` and `src/ssr/createRequestHandler.ts`. Public package source/declarations are also linked in prior rendering research.

### First-party/versioned library references

[P-stack]: ../Homarr%20Nitro%20v3%20stack%20choices/tanstack-rendering.md
[P-board]: ../Homarr%20Nitro%20migration%20experiment/dashboard-rendering.md
[T-tree]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/routing/route-trees.md
[T-loading]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/data-loading.md
[T-search]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/search-params.md
[T-auth]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/authenticated-routes.md
[T-notfound]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/not-found-errors.md
[T-split]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/code-splitting.md
[T-auto]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/automatic-code-splitting.md
[T-external]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/external-data-loading.md
[T-ssr]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/ssr.md
[T-block]: https://github.com/TanStack/router/blob/e26735166f9c015a4705088116103d94eefbf07e/docs/router/guide/navigation-blocking.md
