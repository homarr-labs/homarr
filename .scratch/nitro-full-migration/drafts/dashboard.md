# Dashboard, shell, apps and search — provisional ticket graph

**Status:** planning draft; unapproved, unpublished, not ready for implementation. **20 tickets.** Only this draft is authored. No implementation, tracker publication, checks, runtime probes, browser/container changes or new research is authorized here.

## Scope and interpretation

Evidence: `research_notes/Homarr full Nitro migration/dashboard-navigation.md` (completed: 61 page entries, 26 HTTP route files, 26 board procedures), `localization-ui.md`, `identity-administration.md`, and the completed widget/extended-feature inventories for ownership handoffs. Governing policy: `.scratch/nitro-full-migration/TICKET-DRAFTING.md` and `DESIGN.md`.

- Nitro v3 + Vite/React + TanStack Router + direct oRPC is confirmed; deployment topology, storage portability, SSR/first-paint freshness, unified draft semantics and code/file router convention are **not approved**. Inventory recommendations do not settle them.
- Nitro is the sole new-application build gate. External URLs/APIs/formats may break. The source URLs/procedure names below identify capabilities, not mandatory target spellings, aliases or unchanged transport signatures. Preserve durable content through the sibling conversion owner; never delete real data. No blanket old-URL compatibility bridge is required, including locale prefixes, renamed boards or Workshop redirects.
- A feature ticket includes its bounded repository/service behavior, server authorization, authorized endpoint contribution, browser flow and focused verification. PERSISTENCE provides durable primitives, ID conversion and transaction/lifecycle contracts; TRANSPORTS mounts feature contracts and handles shared protocol concerns. Neither is a substitute for the feature's domain implementation or UI. Endpoint inventory research remains sibling-owned and is not repeated here.
- The widget lane owns **all 69 widget kinds**, every kind's provider/data/options implementation and the standalone widget feature module; the integrations lane owns **every integration provider** and integration management. This draft owns dashboard hosts, placements and cross-feature adapters only, including app/bookmark host consumption; it does not rewrite widget internals.
- Focused regressions may cover critical flows, security and durable-data conversion. They are future acceptance obligations, not permission to execute now. No broad suites, full-repository typecheck, intermediate runtime checks or speculative unit-test batches.

## Exclusive ownership and interface frontier

| Domain | One writer / contribution rule |
| --- | --- |
| Application root, root route tree/type registration, route/nav contribution assembly, SSR document serialization/replay, provider order, client entry and global cache/effect registration | **SHELL-01 implementation owner**, continuing as sole integrator throughout the graph. SHELL-01 is a small runnable expansion, not implementation of every page. Later feature contributions are integrated by this same owner; no separate competing root owner. |
| Nitro host/startup, dependency catalog, app/root manifests, lockfile, build configuration and shared package export/barrel mutations | **Core FOUNDATION/build owner**. SHELL-01 requests changes through the agreed interface; feature workers submit export/registration proposals, never edit shared barrels in parallel. Coordinator must bind this seam to the core draft's actual key. |
| Shared routed Link/search/pagination adapters | **SHELL-02**, transferred explicitly from the localization UI inventory's suggested navigation batch. Core retains catalog/locale, table-locale hook, form/validation, base modals and notifications. No second core Link/search/pagination rewrite. |
| Shared board read projection, board provider/cache identity, updater facade and mutation-effect declarations | **BOARD-01**. Editor/settings owners consume it and contribute commands; they do not independently rewrite the board provider/updater. |
| Read-only geometry, section renderer, scale/lane semantics, item host/focus and geometry public contract | **BOARD-02**. Editor consumes the geometry contract without editing its internals. |
| Board command queue, draft/session and save/discard/navigation-blocker implementation | **BOARD-03**. All content writers register operations here; settings and layout owners use the agreed coordination contract, not another save queue. |
| Viewer entry/header controls, editor panels and shared settings page assembly | BOARD-01 owns viewer shell/entry and exposes control slots; BOARD-03 supplies edit controls; BOARD-07 owns settings page/form assembly with BOARD-08 layout and BOARD-09 access/danger contributions. Feature-owned registration is local, not a global barrel. |
| Management chrome and navigation definition contribution | **SHELL-03**; central assembly remains SHELL-01. Identity supplies policy predicates and session actions. |
| App forms/pickers | APP-01 owns fields/forms and management routes; APP-02 owns app select/quick-add modal content and embedding adapters. Base modal machinery remains core. |
| Spotlight host/mode registration | **SEARCH-02**; SEARCH-03/04 contribute source adapters and actions without simultaneous registry edits. |
| Assets/head/PWA and About | SHELL-04 owns feature descriptors/static delivery; SHELL-05 owns About and four feature HTTP handler contributions. SHELL-01 alone integrates document/host dispatch. |

An **agreed interface** is a reviewed, versioned contract with disposable fixtures and explicit errors/effects. It does not mean a permissive production mock. Protected routes stay unavailable or deny by default until real identity/services connect. Feature work can begin against these interfaces without waiting for every production login, widget, integration, admin page or external transport. Acceptance joins the actual sibling implementation later.

### Named decision dependencies

| Decision | Blocks what, and what can start earlier |
| --- | --- |
| D-TOPOLOGY: one/multiple processes/replicas, startup/shutdown and proxy/base-path responsibilities | Blocks live coordination, production lifecycle and final routing/asset/security acceptance. Pure contribution modules and service-interface work need not wait; no implied shared-memory cluster design. |
| D-ROUTER: code versus file routes, pinned SSR public adapter and route splitting convention | Blocks concrete root/route-tree implementation in SHELL-01, not feature behavior/services or route descriptor proposals. Router is confirmed; TanStack Start is not selected. |
| D-SSR: full hydration versus smaller viewer, populated/placeholder first paint, permissible board/widget staleness, personalized variants and remote-update mechanism | Blocks cached-render graduation and final viewer/document acceptance. Request-isolated uncached composition can be a provisional runnable milestone, not approval of freshness or a low-JS claim. |
| D-DRAFT: retain mixed immediate/deferred writes versus deliberately unified draft/save/discard semantics; ordered writers and conflicting remote changes | Blocks BOARD-03 behavioral implementation and integration of BOARD-04/05/08 command timing. Geometry, form/picker interfaces and operation inventory can start; never silently promise undo/discard of already committed writes. |
| D-SETTINGS: partial settings/layout-save failure policy and canonical-layout handoff | Blocks final BOARD-07/08 integration. Current concurrent saves are not evidence of an atomic transaction. |
| D-LOCALE: engine/locale identity, switch versus reload, deterministic time/zone, draft retention and Crowdin DOM ownership | Blocks final localized shell/document, preference switching and unsaved-work acceptance. Consume core LOCALIZATION interfaces first; do not freeze its recommended library as approved. |
| D-UX-POLICY: intended navigation visibility, anonymous login recovery, target-user home authorization and source discrepancies | Blocks affected acceptance, not all feature starts. Resolve independently with identity owner; no universal admin guard or automatic bug preservation. |

## Proposed tickets

### SHELL-01 — Compose one request-isolated application root and routing/SSR host

**Delivery:** cold-load and navigate a minimal real application route with coherent authorized data, document/bootstrap, nested recovery and browser hydration; provide the single registration point for subsequent features.
**Exclusive domain:** root/router/SSR/client/provider/global effect assembly only; no feature business logic, auth engine or duplicate dependency/host writer.
**Start blockers:** FOUNDATION request/response, feature contribution, principal/policy, locale/bootstrap and Query/effect interfaces; D-ROUTER for concrete route-tree work. Interfaces/planning can start before full service implementations.
**Integration/release gates:** real IDENTITY/LOCALIZATION/TRANSPORTS/PERSISTENCE, D-TOPOLOGY and D-SSR before production or cached-render acceptance; each contributor's acceptance before claiming its route migrated.
**Covered:** all route contribution mounting; request-local Router/QueryClient and sanitized provider snapshot; Nitro dispatch before page fallback; SSR statuses/headers/cleanup; client replay and four independent refresh surfaces.

- [ ] A bounded authorized feature deep link works on cold SSR, reload and client transition with nested layouts/search, pending/error/not-found/redirect outcomes and correct HTTP status; no global query stripping or fixture-only board matcher.
- [ ] Browser and server use the same authorized service semantics, not browser imports of repositories/secret config; HTML, Router, Query and document state agree, with no cross-request principal/locale state or ad-hoc private-store replay assumptions.
- [ ] Compose agreed settings/session/locale/theme/direction/Query/Jotai/modal/notification/Spotlight/Assistant slots once; safe bootstrap omits credentials, claim tokens, repository handles and live callbacks.
- [ ] Typed contributions enter a single root registry. APIs, streams, auth, binaries and assets dispatch before SSR fallback; no feature worker edits the root/barrels/build files concurrently.
- [ ] Query refresh, Router refresh, backend render generation and session/policy invalidation remain separate effects; session changes cancel/mask private stale data before new identity content renders. Retry refreshes authorized data.
- [ ] Any cached SSR extension serves only matching build/assets/projection/personalization and reauthorizes every delivery, including warm-cache revocation and in-flight old artifacts. Caching and streaming are not completion prerequisites unless D-SSR selects them.

### SHELL-02 — Make navigation and list search real links with deliberate URL state

**Delivery:** users follow internal/external links, search and paginate through the new router without broken new tabs, lost meaningful state or inconsistent list parsing.
**Exclusive domain:** shared routed Link/search/pagination adapter internals and target-builder/normalization contract; core table-locale/form/overlay internals excluded.
**Start blockers:** reviewed target-builder/search/navigation contract and LOCALIZATION types; concrete Router binding follows D-ROUTER. No dependence on all pages being ported.
**Integration/release gates:** SHELL-01 mounting, real consumer route schemas, approved raw/duplicate normalization and URL replacement policy.
**Covered:** typed internal routes, safe native external/protocol links, relative/query/hash targets, push/replace/scroll/focus, blocker adapter; 250 ms search and pagination controls.

- [ ] Internal links preserve keyboard, modifier-click, anchor href and new-tab semantics; external app links use safe native navigation, never accidental SPA dispatch. Encode dynamic board/entity targets centrally.
- [ ] Search trim/debounce, clear/Escape, loading and page reset preserve meaningful unrelated query state; pagination accepts the agreed positive safe-integer/page-size model and specifies duplicate/invalid/out-of-range behavior consistently with route loaders.
- [ ] Board layout/edit/return/add, create triggers, login callbacks and sibling search models are validated per route; UI-only triggers are not arbitrary loader dependencies or mutation input. Unknown parameters have a deliberate policy, not blanket deletion.
- [ ] Back/Forward, replace, direct links and query/hash navigation produce the same normalized state. URL spellings may change without obligatory aliases; capability-preserving target mapping is recorded.
- [ ] Router blockers support confirm/proceed/stay and unload with feature dirty-state callbacks, preserve new-tab intent and allow explicit successful-save/cancel bypass without global history hacks.

### SHELL-03 — Deliver management landing, chrome, navigation and guided setup

**Delivery:** a user lands on management, moves through authorized board/management navigation and can complete/reset guidance without discovering unavailable/private capabilities.
**Exclusive domain:** management landing/chrome, breadcrumbs/navigation contribution, common board header chrome/slots, shared tour/setup presentation and status clients. Identity owns preference/tour persistence and user/session actions.
**Start blockers:** FOUNDATION shell capability/nav service and IDENTITY preferences/tour interfaces; SHELL-02 navigation interface, LOCALIZATION/overlay contracts.
**Integration/release gates:** SHELL-01 mounting, actual identity/preferences/tour services and sibling route contributions; D-UX-POLICY visibility and home-target decisions.
**Covered:** `/manage`, management-scoped catch-all presentation, header zones/shortcuts, responsive chrome, counts/badges, user-avatar/session controls as identity action consumers, first-board/setup checklist and tours.

- [ ] Management landing has actual capability-appropriate content/counts/recovery, not a placeholder; create-only, delegated integration, logs-only and self-profile users retain intended discoverability without leaking protected records.
- [ ] Board/management chrome, breadcrumbs, shortcuts and help/about links share intended navigation metadata with Spotlight; server policy is still enforced on deep links and endpoints rather than inferred from menu visibility.
- [ ] Responsive header zones/user preferences, branding and keyboard/focus behavior work across both shell families; identity login/logout/preferences contributions update or clear chrome and catalogs coherently.
- [ ] Tour start/complete/reset/status and permission-dependent setup/add affordances work with durable authenticated status and appropriate guest behavior; removed/unavailable targets do not trap navigation.
- [ ] Management not-found/pending/error recovery retains contextual navigation and correct SSR status through SHELL-01. Docker/Kubernetes-specific recovery remains their external UI owner's contribution.

### SHELL-04 — Deliver document presentation, static assets and installable PWA behavior

**Delivery:** direct requests and navigation retain correct localized titles/branding/theme, stable images/fonts and supported PWA installation/reload behavior without mismatched-build assets or private offline artifacts.
**Exclusive domain:** safe head/asset descriptors, application static/PWA resources and document-update client. SHELL-01 remains sole document/CSP emitter; extended owns media/proxy and Crowdin feature behavior, core owns locale/theme semantics.
**Start blockers:** agreed ASSETS/document/CSP/locale snapshot interfaces and FOUNDATION build-asset contract. Native/static work need not wait for all routes.
**Integration/release gates:** SHELL-01, actual media/proxy delivery, localization/Crowdin integration; D-TOPOLOGY deployment prefix and D-SSR/D-LOCALE render policy. Confirm service-worker/private-content policy before enabling caching.
**Covered:** title/description/favicon/OpenGraph/viewport/lang/dir, logo/background/custom CSS/font/theme-script, public assets, manifest/PWA/service-worker lifecycle and safe external-script descriptor integration.

- [ ] Root/board/settings documents use the matching sanitized branding/locale/theme/viewport snapshot; client updates and preview/discard restoration do not leave another page's title/favicon/direction behind.
- [ ] Known logo/about/Kubernetes image consumers receive bounded native-image adapters with dimensions/alt/blank/error behavior; uploads and upstream fetches retain external-owner authorization/security. Vite is not treated as an optimizer.
- [ ] Preserve self-hosted font-variable/fallback intent, stylesheet/portal layering and offline/privacy behavior; any external font or font substitution is an explicit approved choice, not an accidental Next-font removal.
- [ ] Manifest, installability, icons, public resources and service-worker behavior have deliberate target paths and update rules; cached documents reference matching-build assets and cannot retain private board/session content across identity changes.
- [ ] Theme initialization matches hydration, and locale/direction/culture/document changes are coordinated with core; Crowdin configuration/script order and one-time lifecycle use extended's approved contract rather than unsafe arbitrary scripts.

### SHELL-05 — Restore About, versions, dependencies and contributor surfaces

**Delivery:** management About shows real release/build information, dependencies/licenses and contributors/sponsors/translators with usable links and loading/error states.
**Exclusive domain:** About page plus four About HTTP feature handler/service contributions; TRANSPORTS owns dispatch, build owner supplies version/dependency provenance.
**Start blockers:** build/version/dependency metadata and safe contributor-fetch/transport interfaces; LOCALIZATION/ASSETS/navigation contracts.
**Integration/release gates:** SHELL-01/02/04 plus actual metadata/contributor services; no dependency on board/editor completion.
**Covered:** `/manage/about`; source About contributor GitHub/Crowdin/OpenCollective and dependencies endpoints; static aliases/license, language/keyboard information and logo.

- [ ] Release/build/version and dependency/license information comes from the actual build/source contract, not fixture constants or an empty About route.
- [ ] All three contributor sources and static aliases are represented with bounded failure/loading/empty behavior; one failing source cannot erase the others or expose server credentials.
- [ ] Contributor/sponsor/translator links and localized keyboard/language/help information remain accessible and safe; local logo uses SHELL-04's bounded asset contract.
- [ ] Direct request and client entry agree on metadata and authorization/discoverability, and binary/API dispatch cannot be swallowed by SSR. Endpoint spellings may change; all four capabilities remain reachable.

### BOARD-01 — Resolve and deliver authorized home/named boards with one board-state authority

**Delivery:** anonymous/authorized users open home or named boards, select another visible board and recover from missing/denied/deleted choices without stale private content or rebuilds.
**Exclusive domain:** board read/home services and projection; viewer entry/shell; central board provider/cache/updater facade; picker/previews integration and content mutation effect declarations. Geometry belongs to BOARD-02; command queue to BOARD-03.
**Start blockers:** principal/board-policy, repository, board-read/viewport, widget-host and cache-effect interfaces. Real login/all widgets/all integrations are not start blockers.
**Integration/release gates:** SHELL-01/02/03, real identity/persistence, BOARD-02 geometry/host and selected widget adapters; D-SSR freshness/personalization and D-TOPOLOGY remote updates.
**Covered procedures:** `exists`, `getPublicBoards`, `getBoardsForGroup`, `getAllBoards`, `getHomeBoard`, `getBoardByName`; `/`, `/boards`, `/boards/[name]`; previews/switcher and empty/setup consumers.

- [ ] Dynamic boards resolve by canonical name to immutable ID with case-insensitive lookup and encoded targets; create/rename does not require route generation/rebuild. Both home entry capabilities retain device-specific user → desktop fallback → ordered groups → everyone → instance precedence and live access checks, even if target URLs change.
- [ ] Reads, picker/preview catalogs and direct requests mask inaccessible existence and only expose authorized projections. Anonymous recovery/login return and authenticated missing/denied behavior follow the agreed identity policy.
- [ ] One provider-scoped board cache separates durable structure, personalization, capabilities, initial layout/viewport and widget freshness; preview providers and concurrent board routes are isolated, with no module-global board name or shared viewer-specific bootstrap.
- [ ] Board selection is keyboard/search accessible, fresh on opening and carries home/mobile badges; empty/setup states connect to SHELL-03's permitted guidance rather than requiring populated fixture boards.
- [ ] Mutation effects cover read/home/catalog/route/document/render/policy surfaces independently. External/API/assistant writers participate in the same effects; stale delivery/remote-change behavior is explicit under D-SSR, not assumed universal fanout.

### BOARD-02 — Render responsive nested boards with stable widget hosts and viewer interactions

**Delivery:** existing placements render correctly on desktop/mobile and nested/collapsed sections, with focus, app launch and widget state surviving viewer interactions.
**Exclusive domain:** read-only geometry/lane/section renderer, collapse/focus, per-item dashboard host and bulk section app-launch adapter; no widget kind implementation or editor transactions.
**Start blockers:** BOARD-01 projection/board-context interface, WIDGET-RUNTIME renderer/query/status interface, app lookup/safe-launch and collapse-policy interfaces. Can work against stored-layout fixtures before full BOARD-01 integration.
**Integration/release gates:** BOARD-01/SHELL-04 real composition, APP-01 lookup/launch, actual widget host implementations and section persistence; D-SSR/D-LOCALE direction/freshness decisions.
**Covered:** fixed logical geometry, layouts/roles/breakpoints/resize sources, nested sections/root lanes, previews, focus and `section.changeCollapsed`; app/bookmark placements as host consumers, not widget internals.

- [ ] Preserve 212×212 logical tracks, uniform canvas scale, scale-compensated 10 px visual inset, viewport-height root lanes and nested inner-width/row-pitch rules; all durable layouts/coordinates remain usable, with mobile gutters/roles and valid forced-layout behavior.
- [ ] Nested/empty/collapsed sections retain deterministic reflow, reading order, landmarks/headings and widget sizing across viewport changes; no flat-grid replacement. Public geometry supports pointer-coordinate conversion and deterministic keyboard placement.
- [ ] Authenticated collapse persists with live authorization; anonymous preferences restore after hydration. Failed writes roll back only if still current; temporary editor expansion does not overwrite durable collapse preference.
- [ ] Per-item host passes IDs/options/integrations/dimensions/scale/edit/ref/status contracts, provides suspense/retry/unavailable states and preserves widget state across focus/portal movement without duplicate players, polling or streams.
- [ ] Focus/Escape/reduced-motion/preferences and recursive section bulk-app opening preserve active-layout membership, unique authorized app IDs and safe links; blocked popups have deliberate recovery, not a falsely assumed proactive confirmation.
- [ ] Geometry/focus/collapse and board app registration are coherent before/after hydration; SEARCH-03 consumes a scoped placed-app registration descriptor that is removed on route/identity changes.

### BOARD-03 — Establish lazy editing, ordered drafts and reliable save/leave behavior

**Delivery:** an authorized editor enters a board, moves/resizes items and saves or leaves with the agreed draft semantics, including concurrent changes and failed saves.
**Exclusive domain:** lazy grid editor/registry/portal runtime, transaction store and pointer/keyboard grid actions; board command queue/draft state, save header and blocker clients. BOARD-01 provider/updater and BOARD-02 geometry are consumed, not rewritten.
**Start blockers:** D-DRAFT; reviewed BOARD-01 state/effect and BOARD-02 geometry interfaces; authorized content-command, modal and SHELL-02 blocker interfaces. Full peer implementation is not needed to start.
**Integration/release gates:** actual BOARD-01/02, SHELL-01/02 and persistence/policy, widget host; D-SSR remote-conflict behavior and D-TOPOLOGY concurrency.
**Covered procedures:** `saveBoard`, `updateItemLayout`; editor entry/deep links, save/cancel, drag/resize/transfer, operation scheduling and shared race handling.

- [ ] Permission/demo gates hold for URLs, controls and endpoints; valid layout/edit search activates only authorized editing. Prewarm/lazy load/retry/pressed/busy feedback preserve a server-safe read-only first render.
- [ ] Scaled pointer and keyboard/numeric movement, collision/compaction, drag/resize preview and cross-section transactions preserve atomic snapshots and all associated layouts; aborted interactions do not corrupt durable coordinates.
- [ ] Record and implement operation-level timing approved by D-DRAFT, including previously deferred grid/item actions and immediate bulk/context actions. Save/discard/cancel labels state what has actually committed; no silent conversion to a universal discardable draft.
- [ ] One board-scoped queue orders header, contextual, bulk and external command results; canonical output and latest draft are reconciled. Failed optimistic writes cannot invalidate/roll back over a newer draft, and pending work survives or safely blocks route/session transitions.
- [ ] Real-dirty navigation, Back/Forward/unload and imperative navigation use the shared blocker; successful save/cancel bypass and save-before-return work without duplicate persistence or lost newer changes.
- [ ] Focused future regressions exercise save failure/newer-edit and revocation races plus one complete enter → move → save → reload path; no broad editor suite is required.

### BOARD-04 — Add and configure items, sections and containers end to end

**Delivery:** editors add/duplicate/configure/move/remove items and nested sections using actual app/integration/widget dialogs, then persist according to the agreed operation timing.
**Exclusive domain:** board add/item/section/container menu and dialog hosts, placement completion and draft mutations; APP-02/integration/widget owners retain picker/forms/kind-option internals.
**Start blockers:** BOARD-03 command/draft contract after D-DRAFT; BOARD-02 geometry, widget option/definition and app/integration completion interfaces; base-modal contract. Can implement host interfaces before all kind/provider implementations.
**Integration/release gates:** BOARD-03/02 real state, APP-02 and integration picker, WIDGET-RUNTIME actual supported options/definitions and authorized endpoints.
**Covered procedure:** `addItem`; item/context options, advanced options, integration selection, section/container nesting and one-shot add query.

- [ ] Add trigger opens once and consumes only its UI state; add/duplicate uses fresh IDs, first-empty/collision-safe placement and canonical result. Definition unavailable/disabled/legacy and integration eligibility are represented, not silently dropped.
- [ ] Item options/advanced title/classes/border/integration and widget contextual actions use lazy sibling option adapters with server validation/policy and agreed completion callbacks; no widget renderer or provider rewrite occurs here.
- [ ] Create/edit/remove section/container nesting updates affected placements/layouts atomically with confirmations and permitted undo notifications; move/resize supports numeric/keyboard fallback.
- [ ] Nested dialogs retain focus/return-focus, close interceptors, pending/error states and canonical app/integration creation → selection → item placement without forced management redirects or management-page imports.
- [ ] Local deferred and immediate contextual operations follow BOARD-03's approved queue/timing; failed save or revoked permissions retains a recoverable, nonleaking UI rather than falsely reporting success.

### BOARD-05 — Complete multi-selection, bulk clipboard, move/delete and undo

**Delivery:** editors select multiple items, copy/paste or transfer them, delete and undo without partial pastes, reused IDs or a failed older write erasing newer edits.
**Exclusive domain:** selection context/toolbar, clipboard schema and bulk operation clients; persistence goes through BOARD-03, geometry/provider stay their existing owners.
**Start blockers:** D-DRAFT and BOARD-03 queue/undo contract; BOARD-02 geometry and BOARD-04 operation descriptors, clipboard/domain-validation interfaces. Can start clipboard/schema interface work before actual hosts finish.
**Integration/release gates:** actual BOARD-03/04/02, canonical persistence, policy and real widget option payload handling.
**Covered:** edit selection lifecycle, serialized clipboard validation, paste, bulk delete/move, undo and sound/notification preferences.

- [ ] Selection clears on edit exit/Escape; keyboard and toolbar actions remain usable without hijacking input/contenteditable paste or text selection.
- [ ] Clipboard payload preserves supported durable item/options/integration/layout relationships, validates untrusted input, generates fresh IDs and applies all-or-none local paste; malformed/ineligible content fails explicitly without partial mutation.
- [ ] Bulk move/delete/paste/undo across nested sections/layouts retains deterministic placements and approved operation timing, including whether undo compensates an already committed write or restores an unsaved draft.
- [ ] Queue serialization, failed-write/current-value rollback, notifications/sounds and permission/demo gates match BOARD-03; undo after a newer edit cannot erase unrelated work.
- [ ] Focused future regression covers copy → paste → move/delete → undo → save/reload plus malformed clipboard and failed-save/newer-draft ordering, not a broad widget matrix.

### BOARD-06 — Manage board overview, creation, duplication and device home selection

**Delivery:** users discover permitted boards, create/duplicate one and select desktop/mobile home with accurate previews/badges and immediate usable destinations.
**Exclusive domain:** management board overview/cards, inline create and duplicate forms, home clients and bounded commands. BOARD-09 owns delete/danger; BOARD-01 owns home resolution/read catalogs.
**Start blockers:** board management repository/policy/effect and BOARD-01 read/preview interfaces; SHELL-02 search/navigation, LOCALIZATION/form/modal contracts and identity preference/home interfaces.
**Integration/release gates:** SHELL-01 mounting, actual BOARD-01/02 preview, production identity/persistence and home-target policy decision. No editor/all-provider gate.
**Covered procedures:** `getManageOverview`, `createBoard`, `duplicateBoard`, `setHomeBoard`, `setMobileHomeBoard`; `/manage/boards` and `create` deep link.

- [ ] Overview/previews/counts/creator/public/home badges and menus are capability-filtered; a public overview service is not replaced with blanket admin-only access.
- [ ] Inline create validates availability with stale/debouncing checks, columns/public fields, reset/cancel/rekey and pending/error feedback. Canonical board/IDs navigate to a usable encoded destination without rebuild.
- [ ] Duplicate preserves intended board content/layout relationships with new canonical IDs, validates naming and requires create plus source access; notification/refresh occurs only after actual success.
- [ ] Desktop/mobile home changes update both home entry capabilities, picker/Spotlight/catalog/card badges and effective device precedence. Null/default clearing and target-user access follow the agreed identity policy.
- [ ] Failed create/duplicate/home commands preserve recoverable form state and cannot show stale successful badges; effects use BOARD-01/SHELL-01 registrations rather than generic page-purge calls.

### BOARD-07 — Save board presentation/settings with faithful dirty and failure behavior

**Delivery:** authorized users configure board appearance/status and save or discard previews without losing other settings/layout work or leaving a stale document behind.
**Exclusive domain:** settings route/page-form composition, presentation sections and settings command; BOARD-08 supplies layout panel and BOARD-09 access/danger panel through local interfaces, not simultaneous edits to the parent form.
**Start blockers:** settings/form/document and BOARD-01 state/effect interfaces; D-SETTINGS for multi-part commit behavior and D-DRAFT for unsaved-navigation interaction.
**Integration/release gates:** SHELL-01/02/04, actual persistence/policy/media/icon services, BOARD-08/09 contributions for complete settings-route acceptance.
**Covered procedures:** `getBoardSettings`, `savePartialBoardSettings`; `/boards/[name]/settings` appearance/general/status and dirty form.

- [ ] General metadata/logo/favicon, backgrounds, colors/opacity/radius/icon color, custom CSS and status behavior remain configurable with modify/full distinctions and safe media delivery; no title-only settings substitute.
- [ ] Live title/theme/favicon previews restore on discard/unmount and update correctly after successful save; navigating between boards does not replace a dirty form with another record silently.
- [ ] Form dirtiness, save/discard/leave blockers and pending controls reflect actual work; settings/layout saving follows the approved partial-success or atomic design, retaining failed work and never declaring success merely because one concurrent request succeeded.
- [ ] Canonical settings/results and four-layer effects update viewer/document/overview as needed; validation errors stay attached to fields and revoked access masks data before revalidation.
- [ ] Parent settings assembly has one writer; layout/access panels integrate through agreed contribution callbacks. Focused future regression covers failure + retry/discard and preview restoration.

### BOARD-08 — Edit canonical layouts and hand off between settings and editor

**Delivery:** users add/delete/reset layouts, adjust responsive geometry and edit the canonical layout on the board before returning to the intended settings surface.
**Exclusive domain:** layout settings panel/preview UI and layout commands/projection behavior. BOARD-02 owns geometry implementation; BOARD-07 settings assembly; BOARD-03 editor queue.
**Start blockers:** BOARD-02 geometry/resize-source interface, canonical layout repository/command contract; D-SETTINGS and D-DRAFT for save-before-edit timing and failure behavior.
**Integration/release gates:** BOARD-07/03/01 actual services and mounted route, persistence ID conversion, SHELL-02 return-state normalization.
**Covered procedures:** `saveLayouts`, `resetLayout`; layout preview and `layout/edit/returnTo` handoff, generated `tab=layout` reconciliation.

- [ ] Role/breakpoint/columns/gutters/resize-source/add/delete/reset capabilities preserve all durable layout placements, nested sections and preview scale; mobile gutters normalize intentionally and invalid source/cyclic choices fail safely.
- [ ] Backend supplies canonical layout IDs and coordinate projections; browser does not independently reimplement persistence projection or keep temporary IDs after success.
- [ ] Save-before-edit awaits canonical result before entering the selected layout; failed saves stay in settings, preserve draft and do not trigger a misleading successful handoff.
- [ ] Editor save/cancel returns to the agreed layout settings focus/state. Decide an actual anchored panel/tab versus removing unconsumed `tab=layout`; do not claim source tab restoration already worked.
- [ ] Layout deletion/reset reconciles active override/previews/drafts and dependent widget inputs through ordered effects; partial failures and concurrent newer edits follow the approved policy, with a focused future settings → editor → settings regression.

### BOARD-09 — Manage board permissions, rename, visibility and deletion safely

**Delivery:** full-access users change access/name/visibility or delete a board, with immediate correct denial/recovery for affected viewers and no dangling home/editor selection.
**Exclusive domain:** settings ACL/danger contribution, card delete client and bounded lifecycle commands; IDENTITY supplies policy and authorized user/group selection, PERSISTENCE supplies referential/transaction primitives.
**Start blockers:** board full-policy, user/group selectable and lifecycle/effect interfaces; BOARD-01 identity/projection and BOARD-07 panel contract. D-UX-POLICY for visibility/home rules.
**Integration/release gates:** actual identity/persistence/BOARD-01 and mounted BOARD-06/07; D-SSR/D-TOPOLOGY authorization/freshness guarantees and draft handling for active edits.
**Covered procedures:** `getBoardPermissions`, `renameBoard`, `changeBoardVisibility`, `deleteBoard`, `saveUserBoardPermissions`, `saveGroupBoardPermissions`.

- [ ] ACL, rename, visibility and deletion enforce live full access, principal-scoped evidence, demo restrictions and existence masking on endpoints; authorized user/group selection never leaks unrestricted catalogs.
- [ ] Rename retains immutable board/cache identity and durable content, validates/encodes canonical target and updates current route/title/catalogs. Old-name aliases are optional only if deliberately approved.
- [ ] Visibility reflects instance-home constraints and intended public capability; ACL/visibility revocation affects direct delivery, warmed renders, client capability catalogs and current editor state immediately according to the explicit policy, not HTML TTL.
- [ ] Delete has the correct full-access confirmation, removes/cleans dependent items/layouts/ACL/home references transactionally and recovers affected current routes, picker/home selections and in-flight drafts safely.
- [ ] Failed/conflicting access or lifecycle changes retain accurate UI/errors and cannot resurrect deleted/unauthorized data through stale mutation completion. Focused future regression covers unrelated-principal grants and warm-cache revocation/delete recovery.

### APP-01 — Manage and launch apps/bookmarks with reusable validated forms

**Delivery:** users with the right grants list/search, create, edit, delete and safely launch apps, while create-only users never see the global catalog.
**Exclusive domain:** three app management page modules, shared field/form implementation and app CRUD/list/by-ID/authorized-selectable service contracts; widget app/bookmarks renderers/options stay widget-owned.
**Start blockers:** app repository/policy/DTO and icon/ping/media interfaces, core form/LOCALIZATION and SHELL-02 link/list interfaces.
**Integration/release gates:** actual app persistence/policy, icon/media/ping services and SHELL-01/02 mounting. Static icons or mock ping only demonstrate isolated development.
**Covered:** `/manage/apps`, `/manage/apps/new`, `/manage/apps/edit/[id]`; names/descriptions/icons/href/ping, pagination, create-another and form completion/dirty API.

- [ ] Create-only versus global-management access is enforced by the service and UI; authorized by-ID/selectable views retain intended authenticated and public-placement reachability without leaking all names/URLs on list load.
- [ ] Form validates name/description/icon/href/optional separate ping URL, offers actual icon suggestions/media selection and pending/error states; safe href rules apply to launch and are not confused with SPA navigation.
- [ ] Create-another resets appropriately; create/edit/delete results update lists, placed apps, selectable/catalog/Spotlight and dependent render inputs. Errors preserve recoverable input instead of navigating to stale success.
- [ ] Search/page/pageSize defaults, limits, out-of-range recovery and filtered/empty/mobile create states use SHELL-02's agreed model with actual authorized records.
- [ ] Reusable form supports embedded/no-buttons, async submit success/dirty status, canonical completion and clean edit-record reinitialization without overwriting a dirty form; APP-02/widget/assistant adapters consume it without management-page imports.

### APP-02 — Select, quick-add and edit apps inside board/widget/integration/assistant flows

**Delivery:** app creation/selection/editing works inside existing modal and tool flows, returning a canonical app to the caller without unwanted route changes or broken focus.
**Exclusive domain:** AppSelectModal, QuickAddAppModal, shared app form embedding/completion adapters and cross-feature app linking. Widget/integration/assistant owners own their caller logic and kind/provider internals.
**Start blockers:** APP-01 form/authorized selection/completion interface; core overlay contract, IDENTITY capability hints and caller placement/linking interfaces. No dependency on completed management pages.
**Integration/release gates:** actual APP-01 service/form, BOARD-04 host and widget/integration/assistant callers for their respective acceptance; ASSETS/ping where the embedded form uses them.
**Covered:** board add selection, inline create, quick-add widget app input, embedded widget app edit, integration edit app selection/linking and assistant human-tool app form.

- [ ] Selection loads only eligible authorized apps and returns canonical records/IDs; inline create and quick-add select the result with no forced management redirect.
- [ ] Embedded edit and assistant app form expose submit/dirty/pending/error completion correctly; linked integration apps and placed app/bookmark data see the same mutation results and refresh effects.
- [ ] Nested modal retention, close interception, cancel and focus/return-focus behave correctly after failed or successful async submission; callbacks are runtime behavior, never serialized SSR state.
- [ ] Consumers use route-independent form/picker contracts. A completed app modal does not falsely mark widget option, integration-linking or assistant execution internals complete; their real callers are named integration gates.

### SEARCH-01 — Manage search engines and usable defaults/shortcuts

**Delivery:** authorized users create/edit/delete/search engines and immediately use valid default/shortcut choices from external search and preferences.
**Exclusive domain:** three search-engine page modules, bounded engine repository/services and form/mutation effects. IDENTITY owns user/instance preference persistence; SEARCH-04 consumes engines for actual external search.
**Start blockers:** search-engine policy/repository and default preference interfaces; core form/LOCALIZATION, SHELL-02 list/navigation contracts.
**Integration/release gates:** real engine and preference services, SHELL-01 mounting and SEARCH-04 external adapter; user/instance defaults behavior must be explicitly reconciled on delete.
**Covered:** `/manage/search-engines`, `/manage/search-engines/new`, `/manage/search-engines/edit/[id]`; CRUD/search/pagination and defaults/shortcuts.

- [ ] Independent create/modify/full search-engine grants govern endpoints and controls; search/list pagination/empty states use consistent normalized state with no unauthorized records.
- [ ] Validated name/URL/query-template/shortcut and actual current engine fields survive create/edit round trips and safe external target construction, with pending/field/error feedback.
- [ ] Defaults, engine selections and shortcuts update user/instance preference choices and SEARCH-04 catalogs after mutation; deletion of a selected engine has deliberate fallback/recovery, not dangling IDs.
- [ ] Direct load/create/edit/delete and Back/Forward flows retain form/route refresh order; focused future regression covers one engine CRUD → choose default → execute search path.

### SEARCH-02 — Deliver the Spotlight host, interaction dispatcher and preferences mode

**Delivery:** users open Spotlight from boards or management, navigate prefixes/nested actions and change preferences with the correct close/focus/document behavior.
**Exclusive domain:** Spotlight lazy host, open API, eight-mode registry and interaction dispatcher; preferences mode clients. SEARCH-03/04 own catalog/mode adapter contributions, IDENTITY/LOCALIZATION own preference persistence/locale semantics.
**Start blockers:** agreed mode/action/catalog interface, SHELL-02 links/blocker, core overlay/settings/LOCALIZATION and session-change interfaces.
**Integration/release gates:** SHELL-01/03 mounting, actual preference services and SEARCH-03/04 mode adapters; D-LOCALE switch/draft and D-UX-POLICY discoverability decisions.
**Covered:** eight registered modes `search`, `apps`, `command`, `preferences`, `assistant`, `external`, `media`, `userGroup`; interaction kinds link/javaScript/setQuery/mode/children/details/none. Page is a catalog group, not a ninth mode.

- [ ] Global open/hotkey/prefix, keyboard selection, Escape/back/nested stack, focus, loading/error and close-on-trigger behavior work in both shells with a lazy retryable host.
- [ ] All interaction kinds retain close policy and safe link/new-tab dispatch; children/details and query/mode changes do not lose keyboard context or bypass feature dirty guards.
- [ ] Language/theme/settings/action preference children consume real guest/user persistence and approved locale/theme document effects; reload versus SPA switching explicitly handles open forms/modals/editor drafts rather than losing work silently.
- [ ] Exactly eight modes are registered by one writer; unavailable assistant/media/user-group capabilities are deliberately gated, not empty always-on promises. SEARCH-03/04 contribute adapters without editing global registry in parallel.
- [ ] Identity/ACL change cancels/masks private mode data and registrations, with no previous user's cached details or duplicate modal/notification replay after hydration.

### SEARCH-03 — Populate authorized Spotlight catalogs and navigation commands

**Delivery:** users find permitted apps/boards/integrations/pages/users/groups and execute valid navigation/creation actions, including board-local apps that disappear when leaving the board.
**Exclusive domain:** `search`, `apps`, `command`, `userGroup` source adapters/catalog groups; board catalog/search feature services and scoped placed-app registrar client. Identity/integration/app owners own their underlying domain services.
**Start blockers:** SEARCH-02 contribution/action interface, SHELL-03 nav metadata, BOARD-01 read, APP-01 catalog, integration catalog and identity user/group service interfaces.
**Integration/release gates:** real services/capabilities and SEARCH-02/SHELL-01 assembly; D-UX-POLICY navigation/filter discrepancy decisions. Can develop against individual source fixtures, not all providers/admin pages.
**Covered board procedures:** `catalog`, `search`; query-on-open/debounce, current-board app registration, page group/global commands and permission-filtered children actions.

- [ ] Authorized apps/boards/integrations/user-group/page sources have bounded search, query-on-open freshness, source-specific loading/error/empty states and cancellation; direct server queries enforce policy, not just presentation filters.
- [ ] Board-local placed-app registration uses authorized lookup and augments results without duplicate IDs; leaving/changing board/identity unregisters it and cannot preserve stale private apps.
- [ ] Global/page commands link to real contributed routes for create board/app/integration/user and permitted subpages. Fix or explicitly decide `/manage/users/new` versus actual create entry, `hidden`/`hide`, nav/page visibility and refresh-target discrepancies; do not perpetuate broken targets by default.
- [ ] Board settings/children actions and encoded dynamic names obey intended discoverability while actual endpoint policy remains authoritative; rename/delete/home/app changes refresh the appropriate catalogs/actions.
- [ ] Navigation-command completion works with direct loads and Back/Forward; catalog implementation does not own or duplicate identity/admin/integration page internals.

### SEARCH-04 — Integrate external, media and assistant search/action modes

**Delivery:** users run external searches with engines/integration search/bangs, trigger supported media actions and enter the actual available assistant flow without unsafe URLs, stale capability data or lost streaming cleanup.
**Exclusive domain:** `external`, `media`, `assistant` Spotlight adapter/client interaction contributions only; extended owns assistant/media feature engines and stream UI, integrations/widgets own provider/media execution, SEARCH-01 owns engines.
**Start blockers:** SEARCH-02 mode/action contracts; SEARCH-01 engine/default, integration search/media and extended assistant availability/action/stream interfaces. Full provider catalogs are late gates only for their actions.
**Integration/release gates:** actual SEARCH-01/02, user preference services, extended assistant/media and relevant provider adapters/TRANSPORTS; production action policy and cleanup.
**Covered:** external engines/default/new-tab/bangs, integration searches; media query/play/request/confirmation adapters; assistant open/availability and bounded handoff.

- [ ] External search honors selected/default engine, shortcuts, new-tab preference and DuckDuckGo bangs with safe encoded targets; engine/default mutation refreshes current choices immediately.
- [ ] Integration search and media source results/actions preserve actual policy, source query semantics, loading/failure and confirmation behavior. Native upstream actions go through their server owner, not arbitrary browser fetch.
- [ ] Assistant mode reflects real availability/capability and opens the extended feature using the agreed context contract; streaming/tool/persistence behavior remains extended-owned, with correct cancel/unmount/identity cleanup at the seam.
- [ ] Media and assistant unavailable/denied/partial states stay distinct from empty results; a fixture adapter does not count as migration of actual players, requests or assistant execution.
- [ ] Search invocation does not leak private context through external targets/logs, stale modes or background completions after logout; focused future regression covers safe external target and one real action handoff per available mode.

## Coverage ledger

The following primary owners are exclusive. A **mount consumer** is SHELL-01 throughout; naming it is not duplicate feature ownership. Source URLs are accounting labels; target path changes/redirects need an intentional mapping, **not obligatory old aliases**.

External owner bindings for coordinator reconciliation:

- **EXT-IDENTITY/ADMIN:** core draft's identity/admin slices; includes login/invite, user/group layouts/pages, instance settings, certificates/trusted hostname pages and API-key/MCP-help page.
- **EXT-INTEGRATIONS:** integration draft; integration management plus **Docker and Kubernetes tool UI, nested layouts, actions and terminals**, not backend-only ownership. Their logs/subscription/abort adapters consume TRANSPORTS and histories/coordination consume core.
- **EXT-EXTENDED:** extended draft; onboarding, Custom JSX/configuration/Workshop, assistant/media, backup, **application log and task tool UI**, protocol-specific downloads/streams and their pending/error states. Core owns task/history/lifecycle implementation, not these page UIs.
- **EXT-WIDGETS:** widget draft; `/widgets/[kind]` standalone page/layout, renderer/runtime policy/query/options, all 69 kinds. Dashboard and root are host consumers only.
- **EXT-TRANSPORTS:** endpoint/core draft's HTTP/oRPC/MCP/discovery hosts and transport contracts; health/runtime endpoints with core lifecycle, API reference frontend, WebSocket/subscription dispatch. Endpoint note is still sibling research; these are ownership assignments to reconcile, not newly claimed endpoint evidence.
- **EXT-BUILD/CORE:** core FOUNDATION/build and PERSISTENCE/COORDINATION/IDENTITY/LOCALIZATION/base frontend seams. Packaging/startup/live runtime gate remains their owner, not a shell feature's side effect.

### Pages — 61/61 source entries assigned once

| Source page entry | Primary feature owner | Cross-owner consumption |
| --- | --- | --- |
| `/` | BOARD-01 | SHELL-01 entry; BOARD-02 populated viewer |
| `/boards` | BOARD-01 | Same home capability, not an assumed catalog |
| `/boards/[name]` | BOARD-01 | BOARD-02 viewer; BOARD-03/04/05 edit contributions |
| `/boards/[name]/settings` | BOARD-07 | BOARD-08 layouts; BOARD-09 ACL/danger |
| `/auth/login` | EXT-IDENTITY/ADMIN | Root mounts; shell recovery/Spotlight use safe return targets |
| `/auth/invite/[id]` | EXT-IDENTITY/ADMIN | Standalone branding/document consumer |
| `/init` | EXT-EXTENDED | Identity claim + root onboarding policy |
| `/custom-widget-configuration/[token]` | EXT-EXTENDED | Token policy/standalone composition |
| `/reference/api` | EXT-TRANSPORTS | Localized API-reference frame; not SSR API dispatch |
| `/widgets/[kind]` | EXT-WIDGETS | Root mounts direct-widget standalone layout; all kind logic sibling-owned |
| `/manage` | SHELL-03 | Landing counts/actions from authorized sibling services |
| `/manage/about` | SHELL-05 | SHELL-04 logo/head |
| `/manage/apps` | APP-01 | SHELL-02 list state |
| `/manage/apps/new` | APP-01 | APP-02 reuses form |
| `/manage/apps/edit/[id]` | APP-01 | APP-02 embedding adapter |
| `/manage/boards` | BOARD-06 | BOARD-09 delete; BOARD-02 previews |
| `/manage/search-engines` | SEARCH-01 | SEARCH-04 engine consumer |
| `/manage/search-engines/new` | SEARCH-01 | Core form/validation |
| `/manage/search-engines/edit/[id]` | SEARCH-01 | Core form/validation |
| `/manage/integrations` | EXT-INTEGRATIONS | SEARCH-03 catalog; APP-02 linking |
| `/manage/integrations/new` | EXT-INTEGRATIONS | BOARD-04 reusable picker/completion |
| `/manage/integrations/edit/[id]` | EXT-INTEGRATIONS | APP-02 app selection/linking |
| `/manage/medias` | EXT-EXTENDED | SHELL-04/APP-01/BOARD-07 picker/delivery consumers |
| `/manage/settings` | EXT-IDENTITY/ADMIN | Localized loading; document/default effects |
| `/manage/assistant` | EXT-EXTENDED | SEARCH-04 mode adapter |
| `/manage/custom-widgets` | EXT-EXTENDED | EXT-WIDGETS definition/runtime consumer |
| `/manage/custom-widgets/new` | EXT-EXTENDED | Authoring form/workbench |
| `/manage/custom-widgets/edit/[id]` | EXT-EXTENDED | Definition/options host seam |
| `/manage/custom-widgets/preview/[id]` | EXT-EXTENDED | Widget preview/runtime seam |
| `/manage/custom-widgets/publish/[id]` | EXT-EXTENDED | Publish/browser workflow |
| `/manage/custom-widgets/workshop` | EXT-EXTENDED | Search/sort/page contract contribution |
| `/manage/custom-widgets/workshop/[id]` | EXT-EXTENDED | Install/setup/detail flow |
| `/manage/workshop` | EXT-EXTENDED | Existing redirect surface accounted; may intentionally retire/remap, not another Workshop app |
| `/manage/users` | EXT-IDENTITY/ADMIN | SEARCH-03 catalog/navigation consumer |
| `/manage/users/create` | EXT-IDENTITY/ADMIN | Command maps to actual creation capability |
| `/manage/users/[userId]/general` | EXT-IDENTITY/ADMIN | Nested user navigation/context |
| `/manage/users/[userId]/security` | EXT-IDENTITY/ADMIN | Password/provider/demo policy |
| `/manage/users/invites` | EXT-IDENTITY/ADMIN | Invite lifecycle |
| `/manage/users/groups` | EXT-IDENTITY/ADMIN | User-group mode/catalog |
| `/manage/users/groups/[id]` | EXT-IDENTITY/ADMIN | Group context/navigation |
| `/manage/users/groups/[id]/members` | EXT-IDENTITY/ADMIN | Search/local-external membership policy |
| `/manage/users/groups/[id]/permissions` | EXT-IDENTITY/ADMIN | Group permission presets/effective grants |
| `/manage/users/groups/[id]/settings` | EXT-IDENTITY/ADMIN | Group home/default/rename/reorder clients |
| `/manage/tools/docker` | EXT-INTEGRATIONS | Discovery/reconciliation/actions; identity gates |
| `/manage/tools/docker/logs/[containerId]` | EXT-INTEGRATIONS | EndpointId/name search; transport stream/terminal cleanup |
| `/manage/tools/logs` | EXT-EXTENDED | Core log/history service, view-logs policy, transport subscription; focus string/array |
| `/manage/tools/tasks` | EXT-EXTENDED | Core task scheduler/status/trigger/interval/enable lifecycle |
| `/manage/tools/api` | EXT-IDENTITY/ADMIN | Key issuance/revocation/help + transport MCP/reference contribution |
| `/manage/tools/backup` | EXT-EXTENDED | Persistence consistency/restore and authorized downloads |
| `/manage/tools/certificates` | EXT-IDENTITY/ADMIN | Cert upload/trust service |
| `/manage/tools/certificates/hostnames` | EXT-IDENTITY/ADMIN | Trusted hostname exceptions |
| `/manage/tools/kubernetes` | EXT-INTEGRATIONS | Gated cluster/context shell |
| `/manage/tools/kubernetes/configmaps` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/ingresses` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/namespaces` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/nodes` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/pods` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/secrets` | EXT-INTEGRATIONS | Secret-read/action policy remains live |
| `/manage/tools/kubernetes/services` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/tools/kubernetes/volumes` | EXT-INTEGRATIONS | Resource actions/context |
| `/manage/[...not-found]` | SHELL-03 | SHELL-01 status/scoped routing; no literal catch-all feature requirement |

Count reconciliation: 10 non-management + 51 management = 61. **14 local entries:** 4 board + 3 apps + 3 search engines + management boards/landing/about/catch-all. **47 external entries**, including standalone widget/API-reference/identity/extended/tools surfaces.

### Layouts and fallback boundaries — all accounted

| Source responsibility | Primary owner / target contribution |
| --- | --- |
| Root locale document/providers layout | SHELL-01 composition; SHELL-04 presentation; core identity/locale/settings providers |
| Root home-board layout | BOARD-01 |
| `/boards` home layout | BOARD-01 |
| Named board viewer layout | BOARD-01 with BOARD-02 renderer |
| Named board/settings branch layout | BOARD-07; BOARD-01 scoped board state consumed, not viewer-only composition |
| Management layout | SHELL-03 |
| User detail layout | EXT-IDENTITY/ADMIN |
| Group detail layout | EXT-IDENTITY/ADMIN |
| Kubernetes layout | EXT-INTEGRATIONS |
| Standalone widget layout | EXT-WIDGETS |
| Root loading boundary | SHELL-01 scoped pending registration |
| Instance-settings loading boundary | EXT-IDENTITY/ADMIN |
| Management error boundary | SHELL-03 presentation/SHELL-01 routing |
| Docker error boundary | EXT-INTEGRATIONS |
| Kubernetes `cluster-dashboard` error-only directory | EXT-INTEGRATIONS must reconcile nested/unused concern; **no invented tenth Kubernetes page** |
| Root not-found | SHELL-01 |
| Home not-found | BOARD-01 |
| Boards-content not-found | BOARD-01 |
| Named-board not-found | BOARD-01 |
| Management not-found | SHELL-03 |

### HTTP route files — 26/26 primary feature/host handoffs

Methods are inventory evidence, not mandatory unchanged public APIs. TRANSPORTS always owns final dispatch; feature handlers have one feature owner.

| Source HTTP route | Source methods | Primary owner | Browser/document consumer |
| --- | --- | --- | --- |
| `/api/[...trpc]` | GET POST PUT PATCH DELETE OPTIONS | EXT-TRANSPORTS | Public REST/OpenAPI host replacement; no automatic legacy adapter |
| `/api/trpc/[trpc]` | GET POST OPTIONS | EXT-TRANSPORTS | Direct-oRPC browser host for all feature services |
| `/api/auth/[...nextauth]` | GET POST | EXT-IDENTITY/ADMIN | Login/invite/session; SHELL-01 effects consumer |
| `/api/assistant/chat` | POST | EXT-EXTENDED | SEARCH-04 assistant; separate stream, not page loader |
| `/api/about/contributors/crowdin` | GET | SHELL-05 | About contributor data |
| `/api/about/contributors/github` | GET | SHELL-05 | About contributor data |
| `/api/about/contributors/opencollective` | GET | SHELL-05 | About contributor data |
| `/api/about/dependencies` | GET | SHELL-05 | About build/dependency provenance |
| `/api/backup/export` | GET | EXT-EXTENDED | Backup download, persistence coordination |
| `/api/backup/import` | POST | EXT-EXTENDED | Upload/restore, persistence coordination |
| `/api/backup/migrations` | GET | EXT-EXTENDED | Backup migration support asset |
| `/api/backup/sql-wasm` | GET | EXT-EXTENDED | Browser backup SQL binary, not SSR HTML |
| `/api/custom-widgets/[resource]` | GET | EXT-EXTENDED | Workbench/resources/widget definition consumers |
| `/api/custom-widgets/configuration-request/[token]` | GET POST | EXT-EXTENDED | Token configuration page/state |
| `/api/health/live` | GET | EXT-BUILD/CORE | Lifecycle liveness; transport-mounted outside SSR |
| `/api/health/ready` | GET | EXT-BUILD/CORE | Persistence/background readiness |
| `/api/image-proxy/[id]` | GET | EXT-EXTENDED | SHELL-04/APP-01/BOARD-07 safe image/icon consumers |
| `/api/user-medias/[id]` | GET | EXT-EXTENDED | Branding/background/avatar/icon/media delivery |
| `/api/openapi` | GET | EXT-TRANSPORTS | API-reference frame |
| `/api/onboarding/claim` | POST | EXT-EXTENDED | Identity claim policy + onboarding state machine |
| `/api/mcp` | POST | EXT-TRANSPORTS | MCP host; identity policy consumer |
| `/api/mcp/[transport]` | DELETE GET POST | EXT-TRANSPORTS | MCP sessions/streams/transport lifecycle |
| `/api/mcp/oauth/authorize` | GET | EXT-IDENTITY/ADMIN | OAuth authorization/login resume, transport mounting |
| `/api/mcp/oauth/register` | POST | EXT-IDENTITY/ADMIN | OAuth client registration, transport mounting |
| `/api/mcp/oauth/token` | POST | EXT-IDENTITY/ADMIN | PKCE/key issuance/token exchange, transport mounting |
| `/well-known/[...path]` | GET OPTIONS | EXT-TRANSPORTS | Actual discovery/rewrite policy with identity; no assumed `/.well-known` page |

Additional non-route-file surfaces: middleware onboarding/locale/request policy = EXT-IDENTITY/ADMIN + core LOCALIZATION, mounted once by SHELL-01/FOUNDATION; `/websockets`/subscription dispatch and initialized task/WebSocket lifecycle = EXT-TRANSPORTS + EXT-BUILD/CORE; static/PWA/font/document = SHELL-04; deployment/package asset copying = EXT-BUILD/CORE. These are not invented extra HTTP route files.

### Board procedures — 26/26 unique primary owners

| Source board procedure | Primary owner | Main consumers/effects |
| --- | --- | --- |
| `exists` | BOARD-01 | BOARD-06/09 name availability; no existence leak |
| `getPublicBoards` | BOARD-01 | Home/settings/selection/default consumers |
| `getBoardsForGroup` | BOARD-01 | Identity group-home admin; filtered evidence |
| `getAllBoards` | BOARD-01 | Authorized picker/admin selection, not blanket public catalog |
| `getManageOverview` | BOARD-06 | Cards/counts/previews/menus |
| `catalog` | SEARCH-03 | Board catalog/Spotlight contribution; picker uses BOARD-01 read contract |
| `search` | SEARCH-03 | Remote board search and command children |
| `getHomeBoard` | BOARD-01 | Both home entries/device precedence |
| `getBoardByName` | BOARD-01 | Viewer/settings canonical ID, authorization |
| `getBoardSettings` | BOARD-07 | Full settings assembly |
| `getBoardPermissions` | BOARD-09 | ACL/danger contribution |
| `createBoard` | BOARD-06 | Inline create; overview/new read/catalog effects |
| `duplicateBoard` | BOARD-06 | Duplication/canonical IDs |
| `renameBoard` | BOARD-09 | Stable ID/new target/title/catalog |
| `changeBoardVisibility` | BOARD-09 | Publicness/current delivery/capability variants |
| `deleteBoard` | BOARD-09 | Overview/current route/home/reference cleanup |
| `setHomeBoard` | BOARD-06 | Desktop/home badges/identity preference service |
| `setMobileHomeBoard` | BOARD-06 | Mobile/home badges/identity preference service |
| `saveLayouts` | BOARD-08 | Canonical IDs/coordinates; settings/editor/preview |
| `resetLayout` | BOARD-08 | Layout reset/override/render inputs |
| `savePartialBoardSettings` | BOARD-07 | Presentation/status/document |
| `saveBoard` | BOARD-03 | BOARD-04/05 content clients and external/assistant writers |
| `saveUserBoardPermissions` | BOARD-09 | Live user ACL revocation/cache/catalog effects |
| `saveGroupBoardPermissions` | BOARD-09 | Live group ACL revocation/cache/catalog effects |
| `addItem` | BOARD-04 | Board add and assistant/API placement callers |
| `updateItemLayout` | BOARD-03 | Grid/placement commands and external callers |

11 reads + 15 mutations = 26. `section.changeCollapsed` belongs to BOARD-02, app operations to APP-01/02, search-engine operations to SEARCH-01 and identity/tour/preferences to EXT-IDENTITY/ADMIN; these are not counted as additional board procedures. Browser oRPC signatures can be redesigned while these capabilities stay accounted.

### Interaction ledger — primary ownership and explicit consumers

| Assigned capability/flow | Primary owner | Cross-owner edge / required decision |
| --- | --- | --- |
| Cold direct load, nested navigation/SSR/client/bootstrap/status | SHELL-01 | Pinned public replay adapter; D-ROUTER/D-SSR |
| Four refresh surfaces and global registration | SHELL-01 | Feature effect declarations; persistence render identity and live policy separate |
| Internal/external/relative/hash/query links, modifiers and new tabs | SHELL-02 | Feature target schemas; no blanket old-URL alias |
| Search debounce/clear/page reset/raw duplicates/history | SHELL-02 | APP-01/SEARCH-01 plus all external route search contributors |
| Board layout/edit/return/add URL schema contribution | BOARD-03 | BOARD-04 consumes add; BOARD-08 return; SHELL-02 parser mechanism |
| Board create URL trigger | BOARD-06 | Inline lifecycle, not intercepted route architecture |
| Cross-owner integrations/media/Workshop/group/log/Docker/Kubernetes/login queries | Respective external page owner above | Supplies schema/normalization/loader dependencies to SHELL-01/02; never dropped globally |
| Management landing/nav/chrome/breadcrumbs/header zones/help | SHELL-03 | Identity nav semantics; SEARCH-03 consumes metadata |
| Tours, setup checklist, first-board guided affordances | SHELL-03 | Identity tour persistence; onboarding extended handoff |
| About/version/dependencies/contributors/licenses | SHELL-05 | Four HTTP feature handlers and actual build source |
| Document metadata/theme/branding/assets/fonts/PWA/service worker | SHELL-04 | SHELL-01 emitter; core theme/locale; extended media/Crowdin |
| Home/name resolution, nondisclosure, picker and board previews | BOARD-01 | Identity/group/device policies; BOARD-02 geometry |
| Viewer full layout/nesting/scale/reading order/collapse/focus | BOARD-02 | Geometry and personalized hydration; WIDGET-RUNTIME |
| Per-item widget/card/portal/ref/query-status host | BOARD-02 | All 69 kind internals EXT-WIDGETS; BOARD-03 editor portal consumption |
| Standalone/direct widget page/layout | EXT-WIDGETS | SHELL-01 route registration; no dashboard-shell assumption |
| Recursive bulk app open and blocked-popup recovery | BOARD-02 | APP-01 authorized safe lookup/launch; bookmarks widget internals external |
| Lazy/prewarmed editor/grid pointer/keyboard/resize/transactions | BOARD-03 | Geometry interface only; no second renderer writer |
| Save queue/draft/concurrency/failure/dirty leave/unload | BOARD-03 | D-DRAFT and D-SSR; settings actual dirtiness versus source edit-mode dirtiness |
| Add/duplicate/item options/advanced/integration/context/remove | BOARD-04 | APP-02/integration/widget option adapters; operation timing explicit |
| Section/container create/edit/remove/nested placements | BOARD-04 | BOARD-02 geometry and BOARD-03 commands |
| Multiselect/clipboard/fresh IDs/all-or-none paste/delete/move/undo | BOARD-05 | Immediate/deferred/compensating undo decision; input exclusion |
| Board overview/create/duplicate/desktop/mobile home | BOARD-06 | Canonical content/IDs and identity target-home checks |
| General/status/visual settings, previews and dirty discard | BOARD-07 | Icon/media/document; partial-success D-SETTINGS |
| Layout add/delete/reset/roles/breakpoints/gutters/resize sources | BOARD-08 | Server canonical projection and all durable layouts |
| Save-before-edit → save/cancel → layout settings return | BOARD-08 | BOARD-03 blocker/queue; unconsumed source tab query decision |
| ACL/rename/visibility/delete/danger/ref cleanup | BOARD-09 | Full policy/live revocation; optional aliases only |
| App/bookmark management CRUD/list/search/safe launch | APP-01 | Widget app/bookmarks kind implementation external |
| Reusable app fields/submit/dirty/create-another/record reset | APP-01 | APP-02 embedding; actual icons/ping/media |
| App select/inline create/quick-add/embedded edit | APP-02 | BOARD-04/widget app input/integration edit/assistant actual callers |
| Integration select/create/completion → board item | EXT-INTEGRATIONS | BOARD-04 host; route-independent contract, no management-page imports |
| Base modal stacks/focus traps/async close/notification plumbing | EXT-BUILD/CORE frontend | Feature modal content stays local owners; SHELL-01 mounts once |
| Search-engine CRUD/list/defaults/shortcuts | SEARCH-01 | Identity user/instance preferences; SEARCH-04 execution |
| Spotlight open/prefix/back/stack/interaction kinds/registry | SEARCH-02 | All eight mode contributions registered by one writer |
| Preferences mode locale/theme/settings actions | SEARCH-02 | Core identity/locale persistence; D-LOCALE unsaved-work policy |
| Search/apps/command/userGroup modes and page catalog group | SEARCH-03 | Authorized identity/app/board/integration/nav services |
| Board-local app Spotlight registration/unregistration | SEARCH-03 | BOARD-02 placement descriptor, APP-01 data |
| External mode engine/integration search/bangs/new-tab | SEARCH-04 | SEARCH-01/identity/integrations actual adapters |
| Media mode source queries/play/request actions | SEARCH-04 | Extended/widget/integration feature execution; media-request dialog owner extended |
| Assistant mode/open/availability/handoff | SEARCH-04 | Actual stream/tool/thread/provider engine EXT-EXTENDED |
| Session/logout/ACL transition clears private client state | EXT-IDENTITY/ADMIN | SHELL-01 effect coordinator; BOARD-01 and SEARCH-02/03/04 scoped clients |
| Localized catalogs/validation/MRT/Day.js/formatting/provider | EXT-BUILD/CORE frontend | Dashboard owners adapt only their callers; no parallel catalog/barrel edits |
| Custom JSX authoring/configuration/publish/Workshop runtime | EXT-EXTENDED | Widget runtime/kind host and integration source adapters external |
| Logs/tasks/backup UI and operation lifecycle | EXT-EXTENDED | Core history/tasks/persistence and transports; not merely service preservation |
| Docker/Kubernetes tool UI/discovery/actions/log terminals | EXT-INTEGRATIONS | Core policy/history, transport cleanup and SHELL-04 static SVG |
| Certificates/hostname/API keys/settings/user/group/identity UI | EXT-IDENTITY/ADMIN | Shared root mounting/nav and localized adapters |
| Static crawler/document exclusion and locale/onboarding middleware | EXT-BUILD/CORE + identity/locale contracts | SHELL-01 composes exclusions once; no API/asset locale rewrite |
| CLI/packaging/native assets/startup/task-WebSocket initialization | EXT-BUILD/CORE with extended CLI owner | D-TOPOLOGY and deployment, separate from shell routing |

## Blocking edges and reconciliation notes

### Interface frontier versus completion edges

- SHELL-01 can create a minimal runnable composition once core request/provider/feature interfaces and D-ROUTER are agreed; it is **not blocked by all 61 pages or 69 widgets**. Its ongoing single-writer mounting joins contributions as they arrive.
- BOARD-01/02, BOARD-06/07/08/09, APP-01/02 and SEARCH-01/02/03/04 can develop against reviewed service/state/picker interfaces without waiting for all production siblings. BOARD-03's behavior is genuinely blocked by D-DRAFT; BOARD-04/05 integration timing shares that blocker, while dialog/clipboard interface preparation does not.
- Concrete geometry published by BOARD-02 gates the real grid editor and layout preview, but the geometry **interface** can unblock their isolated work. BOARD-03 owns actual transaction/save ordering; BOARD-04/05 cannot independently land another persistence queue.
- APP-02 starts from APP-01 form/picker interfaces, not completed management pages. BOARD-04 starts from app/integration/widget completion interfaces, not every provider port. SEARCH-03/04 start from individually available source contracts, not all administration/extended features.
- Complete settings route joins BOARD-07 parent assembly + BOARD-08 layout + BOARD-09 access/danger. A working appearance panel does not claim complete settings parity. Complete populated viewer joins BOARD-01 + BOARD-02 + actual visible widget/app adapters. Editor integration joins BOARD-03/04/05 and actual caller adapters; fixture options do not close that gate.
- Each feature's live acceptance needs its actual durable repository, authorized direct endpoint and real UI consumers. Mock interfaces, inventories and compilable fixture routes are not acceptance evidence. All mounted routes also join SHELL-01's shared request/SSR/status/identity contract.

### Genuine blocking edges to return to the coordinator

1. **Root/topology/router:** bind core FOUNDATION/build key and SHELL-01 to distinct exclusive surfaces, choose D-ROUTER and pinned SSR adapter. D-TOPOLOGY blocks production lifecycle/fanout/proxy decisions, not all interface-ready feature work.
2. **Board state/drafts:** approve board read/personalization/effects interfaces and D-DRAFT before behavioral editor integration. Current immediate bulk/context versus deferred header/item writes and failed-save/current-value ordering cannot be erased by an assumed unified draft.
3. **Freshness/security:** choose D-SSR projection/first-paint/cache variants/revision/remote-change policy; real IDENTITY/TRANSPORTS and durable revisions gate live revocation, warm-cache safety and concurrent writers. Do not approve a cache design by inheriting fixture private replay internals.
4. **Settings canonicalization:** approve D-SETTINGS partial-failure semantics and canonical layout IDs/projection; settings → editor → return must join the actual save queue and layout service.
5. **Shared localization/unsaved work:** D-LOCALE and core providers must settle snapshot/time/direction/switch/draft/Crowdin behavior before final shell/preferences/document acceptance. No engine recommendation or old-prefix alias is silently made mandatory.
6. **Sibling UI handoffs:** external drafts must explicitly accept tool UIs, standalone widget/API-reference, identity/admin and extended pages named here; bind their actual stable ticket keys. Landing/About/tours/PWA are assigned locally and must not also be rewritten by extended/core. Endpoint research completion may refine host ownership, not remove browser consumers.

### Gaps, disputes and sizing

- **No unassigned source page, HTTP route file or board procedure remains in this ledger.** External handoffs are proposed ownership bindings, not sibling acceptance; unresolved cross-draft conflicts remain genuine until the coordinator reconciles keys.
- SHELL-01 is intentionally the sole small composition exception; if it expands into all feature loaders/providers or all deployment packaging, split those into their existing owners, not a second root/barrel writer.
- BOARD-03 is the highest-risk fresh-context batch. Its scope is one queue/editor transaction spine plus runnable move/save/leave behavior; item-dialog detail and bulk operations are explicitly separated into BOARD-04/05. If approved draft/conflict semantics require an additional large durable model, coordinator should split an expand/contract slice rather than hide it in this ticket.
- BOARD-07 is one appearance settings vertical with composition slots, not the ACL/layout implementation. BOARD-06 excludes delete/ACL/rename. SEARCH-04 owns adapters only, not three feature engines. These boundaries prevent inventory-sized mega-tickets.
- Resolve source defects intentionally: raw board-name hrefs, user-create target, `hide`/`hidden`, page/nav visibility, anonymous callbacks, target-versus-caller home permission, generated-but-unconsumed settings tab, wrong revalidation targets and query-close preservation. Capability preservation is not automatic preservation of bugs.
- Translation-only `board.snapshot.*` keys do not prove a reachable snapshot flow. Keep catalogs under core ownership; coordinator reconciles any actual snapshot capability with the widget/extended inventory rather than inventing or deleting one here.
- Separate docs application and Go/PocketBase Workshop service are not application-runtime rewrite targets unless actual client contract changes require their owner to adapt them. Real installations, playable container, data and credentials stay untouched.

**Return summary:** 20 provisional tickets; 61 pages (14 local/47 external), 26 HTTP files (4 local About handlers/22 external), all 26 board procedures (local primary owner each), 10 layouts, 2 loading/3 error/5 not-found boundaries and the enumerated interactions accounted. Architectural/product decisions and actual sibling handoffs remain unapproved; no execution or publication readiness is claimed.
