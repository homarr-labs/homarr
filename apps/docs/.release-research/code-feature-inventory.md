# Homarr `release/v2` code feature inventory

This is an editorial evidence map for the v2 release announcement. It is not release copy by itself.

## Audit provenance

- Audited ref: `origin/release/v2` at `ac62e5bfd6731651b75345b8bb6a07882fad8daa` (`2026-09-01`, `fix(system-resources): divide chart rows evenly via CSS, no board-zoom pixel math (#6756)`).
- The current checkout has documentation-only commits above that ref. There are no committed non-`apps/docs/` changes between `HEAD` and the audited ref, so the cited application/package source is the release source.
- Every history commit cited below was checked with `git merge-base --is-ancestor <commit> origin/release/v2` and is contained in the audited ref.
- Source and git history are authoritative here. Existing docs and old performance audit documents were used only to find seams or to identify claims that require qualification.
- This audit did not exercise a running server, browser, external identity provider, Docker endpoint, Redis cluster, or Workshop deployment. Screenshot suggestions are capture targets, not proof that a current demo contains the needed fixtures.

Status vocabulary:

- **Confirmed**: the behavior and its implementation are directly present in the audited release source.
- **Qualified**: the feature exists, but the proposed wording is broader than the code proves.
- **Unproven**: the repository does not contain a controlled measurement or other evidence adequate for the proposed claim.

## Editorial claim ledger

| Area | Status | Safe release wording | Do not publish without more evidence |
| --- | --- | --- | --- |
| Assistant and MCP | Confirmed, with limits | “The Assistant can use a broad, permission-aware Homarr tool surface, with approval UI for sensitive actions.” | “It can do everything in Homarr,” “unrestricted,” or a tool count other than the audited count below. |
| Board drag and drop | Confirmed | “The board grid was rebuilt around transactional drag, resize, cross-grid movement, keyboard/touch input, and isolated previews.” | “Pixel-perfect in every browser” or an accessibility conformance level not separately audited. |
| Configurable header | Confirmed | “Arrange built-in controls and board shortcuts across left, center, and right header zones.” | “Fully custom HTML header.” |
| Board switcher | Confirmed | “Search and navigate visual board cards from a keyboard-friendly switcher.” | An exact click-count reduction without a before/after task study. |
| Custom JSX v2 | Confirmed | “Custom JSX v2 supports declarative data sources, options, guarded actions, and Workshop sharing.” | “Runs arbitrary React/npm packages,” “zero-code for every API,” or “all HTTP behavior is unrestricted.” |
| Custom Widget options | Confirmed | “Fifteen built-in option control types, including dynamic select choices.” | “16 option types.” The audited schema contains 15. |
| Custom Widget actions | Confirmed | “Explicit actions can use POST/PUT/PATCH/DELETE, confirmations, notifications, rollback, and cache invalidation.” | “Every request may mutate data.” The schema distinguishes queries from actions and applies safety rules. |
| Custom Widget workbench | Confirmed qualitatively | “Editing is locally responsive; analysis is deferred and preview generation is explicit and stale-safe.” | “80% less memory” or any precise memory reduction. No production benchmark proves it. |
| Workshop | Confirmed | “Browse, install, publish, and update community Custom Widgets through first-class pages.” | “A decentralized marketplace,” moderation guarantees, or an install count not observed live. |
| Advanced widget mode | Confirmed | “Forty widget definitions opt into a richer advanced-focus experience.” | “Every widget has an advanced mode.” Ten definitions explicitly opt out. |
| Board sidebars | Confirmed, terminology caveat | “Boards can use left and right rail columns on desktop.” | “Navigation sidebars” or mobile rails. Validation explicitly removes rails from mobile layouts. |
| Automatic mobile boards | Confirmed, wording caveat | “Every board gets an automatic mobile layout alongside its base layout.” | “A separate duplicate mobile board is created.” It is a responsive layout role on the same board. |
| Multi-item moves | Confirmed | “Select multiple apps or widgets and move them atomically between board destinations.” | “Only apps,” or claims of cross-board movement without a separate source/runtime check. |
| Onboarding | Confirmed | “A rebuilt setup studio guides instance, account, Docker discovery, integrations, content, and board setup.” | “Detects every container” or “zero configuration.” Discovery is heuristic and capability-dependent. |
| Login experience | Confirmed | “Login and onboarding share the configured brand, backdrop, radius, and visibility settings.” | “Custom login React/HTML.” |
| Command menu | Confirmed | “Cmd/Ctrl+K searches local Homarr content first across a keyboard-driven set of modes.” | “Searches literally every database field” or remote-source availability without configured providers. |
| Branding and custom CSS | Confirmed | “Configure instance identity, auth visuals, theme colors, radius, and global CSS.” | “Sandboxed CSS.” Global CSS is intentionally injected into the application cascade. |
| External-user provisioning | Qualified | “LDAP explicitly creates matching users on first sign-in; OIDC account persistence is delegated to the configured Auth.js adapter.” | A blanket “all SSO providers perform identical JIT provisioning” statement. |
| Permissions | Confirmed | “A lossless permission matrix, presets, inherited/effective previews, and matching server-side enforcement govern access.” | “Permissions are only cosmetic/UI-side.” |
| Docker labels | Confirmed | “Homarr labels can describe apps, widgets, integrations, grouping, icons, health checks, and target boards.” | “Every third-party label schema is supported.” Only explicit Homarr fields and selected Homepage fallbacks are parsed. |
| Multiple Docker endpoints | Confirmed | “Connect multiple Docker or Podman endpoints with per-host capabilities and failure isolation.” | “Every endpoint has full lifecycle access.” Capabilities can limit inventory, logs, lifecycle, or removal. |
| Request caching | Confirmed qualitatively | “Identical integration requests are deduplicated in-process and, with Redis, across processes, with bounded caches and stale-on-error behavior.” | A universal cache hit rate or latency reduction. |
| Parallel data fetch | Confirmed qualitatively | “Independent board, session, layout, and widget-prefetch work is started in parallel.” | A numeric load-time improvement without a controlled benchmark. |
| Release-wide performance | Qualified / numeric claims unproven | “v2 includes targeted request, rendering, lazy-loading, and preview-isolation improvements.” | “30% less Chrome RAM,” “30% less memory,” or another release-wide percentage based on the current repository evidence. |

## 1. Assistant and MCP automation

### What the release source proves

- `packages/api/src/mcp.ts:5-64` constructs the eager MCP router from application, API-key, board, Custom Widget, Docker, icon, instance-info, integration, invite, Kubernetes, search-engine, settings, user, and widget routers.
- `packages/api/src/mcp-tools.ts:4-118` exports only procedures whose metadata explicitly enables MCP and derives deterministic input/output schemas.
- `packages/api/src/test/mcp.spec.ts:10-140` contains the reviewed inventory: 73 queries, 37 ordinary mutations, and 14 secret-bearing mutations, for **124 reviewed tools** at this ref. `packages/api/src/test/mcp.spec.ts:172-197` locks the exact inventory/descriptions, and the later authorization cases verify that unauthenticated authoring is denied.
- `apps/nextjs/src/app/api/mcp/[transport]/route.ts:1-3` exposes GET, POST, and DELETE transport handlers.
- `apps/nextjs/src/components/assistant/assistant-tool-rendering.tsx:230-330` renders tool progress/results and a human approval surface rather than treating every mutation as silent automation.

### History anchors

- `6baff7be3` — `feat: add MCP server for AI assistant integration (#5882)`
- `10ef87177` — `feat: add Homarr assistant`
- `e4bf2aa13` — `feat: migrate MCP server to v2`
- `45d8bc944` — `feat: add the community-funded Homarr assistant provider (#6563)`
- `5e23659d9` — `feat(assistant): optimize MCP and custom widget authoring (#6743)`

### Editorial boundary and capture target

Prefer “broad, permission-aware automation across Homarr” over “does everything.” Tool availability, server permissions, authentication, secret handling, and confirmation gates remain meaningful constraints.

- Screenshot: Assistant panel with a visible multi-step tool trace and one pending approval card.
- Screenshot: MCP/API configuration instructions, with keys and endpoint-specific secrets hidden.
- GIF: ask the Assistant to perform a safe board-management action, show the tool trace and confirmation, then show the resulting board state.

## 2. Rebuilt board drag, resize, and placement model

### What the release source proves

- `apps/nextjs/src/components/board/sections/grid/dnd/engine.ts:17-41` defines a transaction with rollback; `:43-138` computes same-grid/cross-grid previews and eight-direction resizing; `:186-261` handles cross-grid movement and pinned-item collision behavior.
- `apps/nextjs/src/components/board/sections/grid/dnd/targeting.ts:28-75` resolves nested exit targets and ancestor fallbacks.
- `apps/nextjs/src/components/board/sections/grid/grid-preview-layer.tsx:33-145` isolates preview/placeholder state per grid through an external store and DOM layer.
- `apps/nextjs/src/components/board/sections/grid/fixed-grid-item.tsx:35-68` exposes pointer, touch, and keyboard handles, plus Ctrl/Cmd selection.

### History anchors

- `d6b114e42` — `feat: rebuild board grid experience`
- `cddae6719` — `feat: rebuild board grid with dnd-kit`
- `a2400f841` — `perf: isolate board grid previews`

### Capture target

One continuous GIF should drag an item from the main grid into a rail or nested container, show the placeholder following the pointer, resize the item, then cancel or commit once. Capture desktop and touch separately if touch is advertised.

## 3. Configurable header and visual board switcher

### Configurable header

- `apps/nextjs/src/components/layout/header/configurable-header.tsx:48-164` loads preferences and renders left, center, and right zones for desktop/mobile, including recovery controls when the normal header is hidden.
- `packages/validation/src/header-preferences.ts:3-110` defines version 3 of the preference document, three zones, board shortcuts, and 11 built-in controls: logo, search, home, board switcher, Assistant, Docker, board edit, board settings, general settings, theme toggle, and user.
- The interactive editor lives in `apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx`.
- History: `9303dbd28` — `feat: add configurable headers and instance branding (#6690)`.

Suggested screenshot: the spatial header composer with recognizable items distributed across all three zones and its live preview visible.

### Board switcher

- `apps/nextjs/src/components/board/board-switcher.tsx:37-105` lazy-loads/prefetches board data, registers a `Shift+C` shortcut, and integrates with Spotlight.
- `apps/nextjs/src/components/board/board-switcher.tsx:117-170` implements keyboard navigation; `:192-239` renders the switcher modal; `:314-383` renders board preview cards with home/mobile badges and creator metadata.
- History: `2accdc2fa` — `feat: rework board switcher (#6660)`; `1b843817a` — `feat: polish board switcher (#6670)`.

Suggested screenshot: at least three visually distinct board cards so search, preview imagery, and home/mobile badges can all be seen. Suggested GIF: open by keyboard, filter, arrow to a result, and navigate.

## 4. Custom JSX v2, options, actions, workbench, and Workshop

### v2 schema and runtime

- `packages/custom-widgets/src/core/schema.ts:11-17` identifies Custom JSX v2 as the supported format and keeps secret values separate from the public definition.
- `packages/custom-widgets/src/core/custom-jsx-schema.ts:76-101` composes sources, requests, options, and the JSX template; `:181-203` exposes runtime primitives such as `SubFetch`, `ActionButton`, and `ToggleSwitch`; `:206` fixes the definition type to v2.
- `packages/custom-widgets/src/core/schema-types.ts:4-5` allows GET, POST, PUT, DELETE, and PATCH at the protocol level.
- `packages/custom-widgets/src/core/request-schema.ts:133-183` distinguishes queries/actions and validates bodies, headers, auth, permission requirements, cache settings, confirmations, and invalidation. DELETE is forced into an action/full-permission path.
- `packages/custom-widgets/src/runtime/actions.tsx:29-144` executes actions with notifications, confirmations, and invalidation; the toggle implementation after `:146` includes rollback/refetch behavior.

### Options: correct the proposed count

`packages/custom-widgets/src/core/options-schema.ts:5-21` contains **15** controls:

1. text
2. textarea
3. number
4. switch
5. select
6. multiSelect
7. slider
8. date
9. time
10. color
11. icon
12. url
13. duration
14. timeZone
15. json

The same schema supports descriptions, defaults, static or request-backed dynamic choices, min/max/step, advanced fields, and grouping. It caps a definition at 64 options. Any draft saying “16 types” should be corrected.

### Workbench behavior

- `apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form.tsx:189-251` uses an uncontrolled Mantine form, a 300 ms validation debounce, a document store, and an explicit preview action.
- `_custom-widget-form-state.tsx:39-68` owns the document store; `:89-123` schedules low-priority debounced analysis and supports field-scoped subscriptions.
- `_use-custom-widget-form-analysis.ts:73-145` defers/memoizes candidate construction and diagnostics; `:156-188` exposes selector-based analysis state.
- `_use-custom-widget-form-actions.ts:39-76` cancels/replaces preview generations; `:137-210` only generates previews on explicit action and discards stale results; `:114-118` invalidates relevant caches after save.

This proves a narrower and more stable update architecture. It does **not** prove an 80% memory reduction. The historical `CUSTOM_WIDGET_NORTH_STAR_AUDIT.md` at commit `fcca57ddf` explicitly calls its scores judgment rather than benchmarks and labels its developer profile as non-production evidence.

### Workshop lifecycle

- `apps/nextjs/src/app/[locale]/manage/custom-widgets/page.tsx:17-53` provides the administrative Custom Widget surface with import/create/Workshop affordances.
- `apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/page.tsx:27-40` and `apps/nextjs/src/components/workshop/workshop-submission-grid.tsx:24-84` implement searchable, sortable, paginated browsing.
- Publishing is handled by `apps/nextjs/src/app/[locale]/manage/custom-widgets/publish/[id]/_workshop-publish-form.tsx`; the network contract lives in `packages/workshop/src/backend.ts`.

### History anchors

- `83e3b22f9` — `feat(custom-widgets): Full Mantine v9 + SubFetch support for custom JSX (#6304)`
- `acdfcbb18` — `feat(custom-widgets): complete Custom JSX v2 (#6390)`
- `fcca57ddf` — `feat(custom-widgets): improve authoring workbench (#6689)`
- `5e23659d9` — `feat(assistant): optimize MCP and custom widget authoring (#6743)`
- `7a089ab17` — `feat: community workshop for custom widgets and CSS (#5984)`
- `206905ea2` — `feat(workshop): rebuild install and publish as pages`

### Capture targets

- Wide screenshot: workbench with Sources, Requests, Options, JSX editor, diagnostics, and live preview all legible.
- Screenshot: a generated widget configuration form using at least five visually distinct option controls; do not try to fit all 15 into one unreadable image.
- GIF: an `ActionButton` performs a POST after confirmation, shows success feedback, and refreshes the displayed data.
- Screenshot set: Workshop browse grid, submission detail/install page, and publish/update page.

## 5. Advanced widget experiences

### What the release source proves

- `apps/nextjs/src/components/board/advanced-focus/context.tsx:90-143` opens and previews advanced focus; `:282-353` handles Escape, Shift, Cmd/Ctrl+Shift, pinning, and inert background behavior.
- `apps/nextjs/src/components/board/items/item-content.tsx:370-470` selects compact versus advanced content and portals the focused surface.
- At the audited ref, `rg 'supportsAdvancedFocus: true' packages/widgets/src` finds **40 widget definitions** that opt in, while 10 definitions explicitly set it to false.
- The 40 opt-ins cover air quality, anchor note, archive, audio, Bazarr, bookmarks, calendar, clock, Coolify, countdown, Docker, downloads, firewall, health, Immich album/server, media missing/releases/server/transcoding, network status/summary, notifications, Patchmon, releases, RSS, smart-home entity/automation, stocks, system disks/resources, timer, timetable, Tracearr, Traefik, Umami, UPS, Uptime Kuma, weather, and WUD.
- History: `c099a8eef` and `8775597d5`, both `feat: expand advanced widget experiences`.

### Editorial boundary and capture target

Say “40 widget definitions opt in,” not “all widgets.” A useful GIF starts with a compact Clock, downloads, media, or system-resource tile, holds Shift to preview, then pins the full view with Cmd/Ctrl+Shift or the context-menu Maximize command.

## 6. Board rails, responsive mobile layouts, and batch moves

### Left/right board rails

- `packages/validation/src/board.ts:80-100` defines left/right gutter-column counts and explicitly excludes rails from mobile layouts.
- `apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:104-220` exposes layout and `GutterSettings` configuration with a preview.
- `packages/boards/src/layout-preview.ts:75-142` remaps rail items into the main grid when a target layout lacks the relevant rail.
- History: `d6b114e42` — grid rebuild; `4a4b04d47` — `fix(boards): disable mobile sidebars (#6565)`.

Use “left and right board rails” or “sidebar lanes,” not wording that implies navigation sidebars. Suggested screenshot: layout settings preview next to a board using both rails.

### Automatic mobile layout

- `packages/api/src/router/board.ts:660-717` creates a protected 3-column Mobile layout at breakpoint 0 plus a Base layout at 768.
- `packages/api/src/router/board.ts:773-830` preserves duplicated layouts and generates a mobile role if one is missing.
- `packages/definitions/src/board.ts:27-60` normalizes responsive layout roles.
- `packages/validation/src/board.ts:102-126` requires exactly one Mobile and one Base role and fixes Mobile to breakpoint 0.
- `packages/boards/src/layout-preview.ts:75-142` performs responsive reflow, including rail-to-main projection.
- History: `d63653142` — `feat: add automatic mobile board layout`; `aa179f1ec` — `fix: decouple responsive layout roles from breakpoints`; `4a4b04d47` — mobile rail behavior.

This is an automatic **layout of the same board**, not a separately maintained mobile-board copy. Suggested paired screenshot: Base preview and narrow Mobile preview with the same item identities and rails projected into the main column.

### Multi-item moves

- `apps/nextjs/src/components/board/selection/board-selection-context.tsx:82-99` manages selection; `:101-188` handles clipboard state; `:190-229` delete/undo; and `:231-343` commits batch moves atomically, rolling back the group when placement fails.
- `apps/nextjs/src/components/board/selection/board-selection-toolbar.tsx:33-56` derives selected apps/items; `:93-129` computes destinations; `:131-296` renders the floating action toolbar.
- `apps/nextjs/src/components/board/sections/grid/fixed-grid-item.tsx:61-67` exposes Ctrl/Cmd-click selection.
- History: `f3014fe27` — `refactor(board): modernize item and application select modals with SelectableCard (#6642)`.

Prefer “multiple board items, including apps and widgets.” Suggested GIF: Ctrl/Cmd-select three mixed tiles, choose Move, select a rail/container destination, and show the atomic result.

## 7. Rebuilt onboarding and branded login

### Onboarding studio and Docker-assisted setup

- `packages/onboarding/src/setup-studio.tsx:119-155` defines six setup sections; `:162-211` coordinates setup state and queries; `:202-261` loads Docker discovery/capabilities and preselects discovered content; `:263-316` creates app/integration drafts.
- `packages/docker/src/discovery/list-discovered-containers.ts:17-68` probes all configured endpoints concurrently with `Promise.allSettled`, a five-second host timeout, and per-endpoint failure isolation.
- `packages/definitions/src/docker-service-discovery.ts:40-113` scores image/name matches and produces URL candidates. This is heuristic discovery, not a guarantee that every service can be configured automatically.
- History: `e41605640` — `feat: rebuild onboarding experience`; `775ae0147` — `feat: enhance onboarding`; `7b1a801ab` — `feat: consolidate onboarding`. Supporting Docker discovery changes are also present in the endpoint work cited below.

Suggested screenshots: the Discover step populated from a real or deterministic local fixture, then the Review step showing the proposed apps/integrations/board. Avoid an empty demo state.

### Login and auth branding

- `apps/nextjs/src/app/[locale]/auth/login/page.tsx:23-67` passes configured branding, backdrop, overlay, visibility, and demo credentials into the shared auth shell.
- `packages/onboarding/src/onboarding-auth-shell.tsx:27-103` renders the shared onboarding/login presentation.
- History: `9303dbd28` — configurable header/branding; `c9a48fa23` — `fix: polish login backdrop and wordmark (#6687)`.

Suggested screenshot: a deliberately branded login with custom name, mark, background, overlay, and border radius. Use a second instance-settings screenshot to make the cause/effect relationship obvious.

## 8. Cmd/Ctrl+K global command menu

### What the release source proves

- `packages/definitions/src/hotkeys.ts:1-9` declares mod+K for global search, mod+P for apps, mod+/ for Assistant, and mod+Shift+? for preferences.
- `apps/nextjs/src/components/layout/header/lazy-spotlight.tsx:11-64` dynamically imports Spotlight without SSR, mounts it on user intent, and schedules idle preload.
- `packages/spotlight/src/modes/index.tsx:1-19` registers search, app/integration/board, command, preferences, Assistant, external, media, and user/group modes.
- `packages/spotlight/src/modes/home/index.tsx:16-36` combines contextual items, pages, commands, preferences, app/integration/board catalogs, directory entries, search engines, and capability-gated media/Assistant fallbacks.
- `packages/spotlight/src/lib/catalog.ts:11-96` caches permission-aware catalogs, refreshes them on open, and ranks deterministically.
- `packages/spotlight/src/modes/command/global-group.tsx:56-120` permission-filters create-board/app/integration/user/invite/group commands.
- History: `97d8390b2` — `feat: rebuild command menu (#6692)`; `25d964a19` — `refactor(spotlight): registry-driven CMDK preferences (#5817)`; `3d3e3059a` — `feat: media request search as first-class spotlight mode (#5823)`.

“Everything searchable” should be treated as product aspiration, not a literal database guarantee. Safe wording is “search apps, integrations, boards, people/groups, settings, pages, commands, and configured providers from one keyboard-first surface, with local Homarr results prioritized.”

Suggested screenshot: Cmd/Ctrl+K with the mode rail and a query producing mixed local results. Suggested GIF: switch among global, apps, Assistant, and preferences entirely from the keyboard.

## 9. Instance branding and global Custom CSS

### What the release source proves

- `packages/server-settings/src/index.ts:18-75` defines xs–xl radius, app name/greeting, logo/favicon, theme colors, lock/sign-in imagery and overlays, auth visibility, and `customCss`.
- `apps/nextjs/src/app/[locale]/manage/settings/_components/branding-settings-form.tsx:39-187` exposes grouped controls; `:190-260` renders a summary/preview.
- `apps/nextjs/src/app/[locale]/layout.tsx:57-96` applies branding to metadata/theme, `:127-180` parallel-loads layout dependencies, and `:202` injects global CSS.
- `apps/nextjs/src/components/custom-css/custom-css-editor.tsx` is the shared CodeMirror-based editing surface.
- `apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx:109` renders the board-level `CustomCss` after the locale-layout global style, and `apps/nextjs/src/app/[locale]/boards/(content)/_custom-css.tsx:5-8` injects that board stylesheet. Board-scoped CSS can therefore override the earlier global stylesheet. Neither surface is a CSS security sandbox.
- History: `9303dbd28` — instance branding; `f57a66008` — `feat: add global server custom CSS (#6753)`.

Suggested screenshot pair: branding settings with preview, then the resulting header/login. For CSS, show a short readable rule in CodeMirror beside its visible result; do not expose internal URLs or secrets in CSS.

## 10. External-user provisioning and the permission model

### External-auth provisioning and membership synchronization

- `packages/auth/providers/credentials/authorization/ldap-authorization.ts:101-131` finds a provider-scoped LDAP user and inserts one when none exists; `:133-138` returns LDAP groups.
- `packages/auth/providers/oidc/oidc-provider.ts:12-73` maps OIDC profile fields, while `packages/auth/configuration.ts:47-69` wires the database adapter/provider. Account persistence for this path is therefore delegated to Auth.js adapter behavior rather than explicitly implemented in the local OIDC profile mapper.
- `packages/auth/events.ts:16-51` synchronizes external groups and the Everyone group on sign-in; `:118-195` adds/removes membership for matching existing Homarr groups.
- `packages/auth/env.ts:36-69` declares the OIDC group claim/local-management and LDAP configuration contracts.
- `packages/api/src/router/group.ts:180-227` atomically creates the initial external-auth administrator group during onboarding; `packages/api/src/router/onboard/onboard-queries.ts:24-29` directs external-auth onboarding to that group step.
- History: `fb18b975b` — `feat: add local group support for OIDC users (#5952)`; `e66979bab` — `feat(auth): link credentials users with OIDC (#6445)`.

Safe wording: “LDAP users can be provisioned on first successful sign-in; OIDC uses the configured Auth.js database adapter, and external group claims can synchronize membership into existing Homarr groups.” This avoids promising identical JIT semantics for every provider.

### Permission depth and enforcement

- `packages/definitions/src/permissions.ts:38-72` defines permission categories and inheritance; `:139-215` models the lossless matrix; `:217-255` centralizes management-access decisions.
- `apps/nextjs/src/app/[locale]/manage/users/groups/[id]/permissions/_group-permission-form.tsx:100-135` provides viewer/editor/admin presets; `:194-278` renders levels/capabilities; `:287-389` shows the matrix and effective-permission preview.
- `packages/auth/callbacks.ts:10-20` derives distinct group permissions, including children; `:38-58` resolves session properties/permissions in parallel.
- `packages/api/src/router/integration/integration-access.ts:11-95` enforces use/interact/full access on the server and returns NOT_FOUND where disclosure itself would leak information.
- `apps/nextjs/src/app/[locale]/manage/_access.ts:6-35` keeps management navigation aligned with the same access rules.
- History: `ff14613f9` — `feat: recalculate permission scope & permission matrix UI (#6612)`.

Suggested screenshot: the group matrix with a preset selected and the effective-permission preview expanded. A second onboarding image can show the initial external administrator group, but should use fictional provider/group names.

## 11. Docker labels and multiple endpoint architecture

### Labels and service discovery

- `packages/docker/src/labels.ts:1-20` declares Homarr labels for hide, group, name, href, icon, description, ping, id, board, integration, and widget metadata, plus selected Homepage-compatible fallback fields.
- `packages/docker/src/discovery/parse-container-labels.ts:37-67` honors hide, uses Homepage naming only when a Homarr name is absent, requires name+href for a discovered app, and parses app/widget/integration metadata.

### Multiple Docker/Podman endpoints

- `packages/docker/src/endpoint-descriptor.ts:1-24` models inventory/logs/lifecycle/remove capabilities, socket/TCP/TLS transports, Docker/Podman engines, and admin scope.
- `packages/docker/src/endpoint-descriptor.ts:28-100` validates non-empty JSON descriptor lists, unique IDs, secure TLS, explicit plaintext opt-in, and capability combinations.
- `packages/docker/src/singleton.ts:31-129` creates clients for multiple descriptors or legacy comma-separated sockets/hosts/ports, isolates failures per endpoint, and retains a local fallback.
- `packages/api/src/router/docker/docker-router.ts` carries endpoint IDs through API operations and checks endpoint capabilities before actions.
- History: `56af6bcaf` — `feat(docker): Podman compatibility, multi-socket support, per-host error isolation (#5425)`; `150d38be6` — `feat(docker): add endpoint filtering and streamline setup assistant (#6625)`.

Suggested screenshot pair: a Docker tools table with two safely named endpoints and visibly different capabilities; a compose/label excerpt beside the resulting discovered service card. Redact real hostnames, socket paths where sensitive, certificate material, and credentials.

## 12. Shared request caching and parallel data loading

### Integration request cache

- `packages/request-handler/src/lib/request-handler.ts:1-39` defines bounds/timeouts; `:120-145` owns the bounded L1 cache; `:156-209` applies deadlines, aborts, and in-flight/shared resolution.
- `packages/request-handler/src/lib/request-handler.ts:232-339` handles invalidation, L1 reuse, in-flight deduplication, Redis shared-cache locking, stale-on-error fallback, and response storage.
- `packages/request-handler/src/lib/shared-cache.ts:17-43` bounds Redis operations and hashes canonical input; `:107-183` implements payload/refresh-lock behavior and fails locally when Redis is unavailable; `:192-248` namespaces widget/integration generations.
- `packages/request-handler/src/lib/integration-request-handler.ts:30-59` incorporates a secret fingerprint into cache identity; `:61-110` uses the shared adapter and explicit invalidation.
- `packages/api/src/settle-integrations.ts:23-67` uses `Promise.allSettled` so one integration failure does not discard all successful responses.
- `packages/widgets/src/refetch-intervals.ts:1-45` aligns polling with cached handlers; a number of consumers disable redundant periodic client refetching.
- History: `8d8dec574` — `feat(widgets): consolidate integration metadata + shared response caching (#6691)`.

Safe wording: “Duplicate requests can collapse into one in-flight request in-process and, when Redis is configured, share cached responses/refresh coordination across processes. Failure paths retain bounded local behavior and may serve stale data.” Do not imply Redis is mandatory or that every integration endpoint is cached identically.

### Parallel board loading

- `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx:45-95` starts auth and board work together, then parallelizes permission work and widget-kind prefetches.
- `apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx:51-76` starts session, board, color-scheme, viewport, and tour loading before awaiting them together.
- `packages/api/src/board-server.ts:1-16` uses React `cache()` to memoize repeated board requests within the RSC request lifecycle.
- History: `8f03a38de` — `perf(boards): parallelize board page data fetching (#5736)`.

This proves concurrency and deduplication structure, not an exact load-time improvement.

## 13. Shorter add/configure flows

The code supports a qualitative “fewer detours” story, but not a numeric click-reduction claim.

- `apps/nextjs/src/components/board/items/item-select-modal.tsx:104-137` targets the main grid, rails, or containers; `:149-196` builds the connection-aware catalog; `:307-416` preselects matching integrations and can open integration creation inline; `:418-535` supports search, Enter-to-select, preload state, Custom Widgets, and Workshop entry.
- `packages/modals-collection/src/apps/app-select-modal.tsx:33-183` provides a searchable, multi-select app-card grid and inline Quick Add.
- `packages/modals-collection/src/apps/quick-add-app/quick-add-app-modal.tsx:15-59` creates an app and immediately returns it to the active flow.
- `apps/nextjs/src/components/board/items/board-recipe-recommendations.ts:21-59` recommends missing widgets based on already configured integrations.
- History: `f3014fe27` — modal modernization; `836a4cd46` — `feat: modernize widget experience`; `f10bb3ae2` — `feat: auto-open widget settings on add with all integrations pre-selected (#5767)`.

Safe wording: “Adding content is more contextual: destination, compatible integrations, quick app creation, and Workshop discovery are reachable inside the active flow.” Suggested GIF: Add item → search widget → preselected compatible integration → save, without leaving the board.

## 14. Performance evidence and claims quarantine

### Qualitative improvements that are in `release/v2`

- `a2400f841` isolates board-grid preview updates.
- `8d8dec574` introduces shared response caching and request deduplication.
- `8f03a38de` parallelizes board-page data fetching.
- `8eb673538` reduces widget/runtime overhead.
- `dcef36ffa` optimizes widget integration requests.
- `63dca7d1b` simplifies widget optimizations.
- `b2fbd1096` reduces widget render overhead.
- `af6fb75e6` trims widget loading work.
- `22d577097` removes the global V8 memory cap. This is a configuration change, not evidence of lower consumption.
- `653dadaef` reconciles the performance layer after stack rebase.
- `apps/nextjs/next.config.ts:46-59` configures optimized package imports and build caching.
- `packages/widgets/src/media-releases/component.module.css:20-23` uses `content-visibility` and intrinsic containment for offscreen release content.
- Spotlight, Custom Widget editors, and other heavy surfaces are lazy/deferred in the code cited above.

### Claims that are not proven by the audited ref

| Proposed claim | Verdict | Why it is not publishable yet | Required proof |
| --- | --- | --- | --- |
| “30% less Chrome RAM” | **Unproven** | No controlled browser-memory benchmark comparing this exact release ref with a named baseline is committed on the release ancestry. Historical phase findings on another branch included mixed metrics, including a much smaller browser JS-heap change. | Fixed Chrome build/flags; same host; same seeded board, integrations, viewport, dwell time, and interaction script; baseline and release SHAs; multiple runs; report median and variance for browser process/private memory and JS heap separately. |
| “30% less memory” | **Unproven/ambiguous** | It does not identify server RSS, browser process memory, JS heap, container memory, idle/steady state, or workload. | Define the metric and workload first, then run the controlled A/B above. |
| “80% less Custom Widget memory” | **Unproven** | The workbench audit explicitly says its scores/dev profile are not production benchmarks. Current code proves fewer broad updates and stale-safe explicit preview generation, not an 80% memory result. | A reproducible editor workload with the same widget definition, typing script, preview cadence, browser build, heap snapshots, detached-node checks, repeated runs, and baseline/release SHAs. |
| “X% faster board loads” | **Unproven** | Parallel starts and request memoization are visible, but no representative end-to-end timing distribution is tied to this ref. | Cold/warm runs against a fixed seeded board and backends, capturing server timing, RSC/network waterfall, LCP, and interaction readiness. |
| “X% fewer API calls” | **Unproven globally** | Cache/dedupe behavior depends on request identity, Redis availability, widget mix, invalidation, and poll timing. | Count normalized upstream requests in an identical board session with caches cold/warm and Redis on/off. |
| “Fewer clicks” with a number | **Unproven** | The new flows are visibly more contextual, but no task model or before/after click trace is in the repository. | Define representative tasks and count required user actions on named baseline/release builds. |

Historical performance documents from `origin/feat/phase1-perf-impl` are not ancestors of `origin/release/v2`. Their numbers must not be laundered into release claims. They can inform a new benchmark design only.

### Recommended public performance language

> v2 reduces redundant work throughout the dashboard: independent board data loads in parallel, identical integration requests can share in-flight and cached responses, heavy surfaces load on demand, and grid previews update in isolation. We are keeping numerical memory and speed claims out until they are reproduced against the final release build.

## 15. Screenshot and GIF capture board

Prioritize captures that demonstrate one behavior each. Avoid a single collage that makes every surface illegible.

| Priority | Asset | Surface/fixture | Proof shown | Capture notes |
| --- | --- | --- | --- | --- |
| P0 | Assistant action GIF | Assistant + board | Tool trace, approval, visible result | Use a reversible action and scrub secrets. |
| P0 | DnD GIF | Board with main grid, rail, nested target | Cross-grid placement, placeholder, resize | Keep pointer visible; 8–12 seconds. |
| P0 | Custom Widget workbench hero | Workbench | Sources/requests/options/JSX/preview | Use a polished real API-backed widget and readable editor zoom. |
| P0 | Command menu GIF | Cmd/Ctrl+K | Local-first mixed results and keyboard modes | Seed enough boards/apps/users to avoid an empty mode. |
| P0 | Responsive board pair | Base and Mobile previews | Same-board automatic reflow | Match item identities/colors across frames. |
| P1 | Header composer | User header settings | Three zones and live preview | Include a board shortcut and Assistant/search controls. |
| P1 | Board switcher GIF | 3+ boards | Search, keyboard navigation, visual cards | Include home/mobile badges if available. |
| P1 | Advanced widget GIF | Clock/media/downloads/resources | Compact → preview → pinned advanced | Avoid claiming all widgets support it. |
| P1 | Batch move GIF | Mixed apps/widgets | Multi-select and atomic destination move | Include the selection toolbar. |
| P1 | Branded login pair | Settings + auth/login | Configuration-to-result relationship | Use fictional branding, not production credentials. |
| P1 | Onboarding sequence | Discover + Review | Docker-assisted draft setup | Use deterministic local containers; the public demo may already be onboarded. |
| P1 | Permissions matrix | Group editor | Presets, matrix, effective permissions | Use fictional group names. |
| P1 | Docker endpoints | Docker tools/setup | Multiple named endpoints and capabilities | Redact hosts/certificates/socket details as appropriate. |
| P2 | Workshop triptych | Browse/detail/publish | Full share/install/publish lifecycle | Use a real submission only if licensing/attribution is clear. |
| P2 | Widget POST action GIF | Custom Widget runtime | Confirm → mutate → notify → refresh | Use a disposable test endpoint. |
| P2 | Custom CSS result | CodeMirror + app | Global theme override | Keep CSS short enough to read. |

### Capture environment caveats

- The public preview previously exposed a `demo` login and a populated “Homarr demo” board, but that is historical and must be rechecked before capture.
- Docker discovery, onboarding, external-auth group provisioning, POST actions, and multi-endpoint management are better captured in a controlled local environment with deterministic fixtures.
- Never show API keys, Authorization headers, OIDC/LDAP secrets, real user email addresses, real Docker hostnames, certificate bodies, or private service URLs.
- A screenshot proves presentation, not performance. Do not place unverified percentage badges over UI captures.

## Bottom line for the release story

The strongest source-backed story is not a collection of percentages. It is a connected workflow:

1. onboarding discovers services and builds a starting board;
2. the board adapts to desktop/mobile layouts with configurable rails and transactional editing;
3. Cmd/Ctrl+K, the board switcher, and a configurable header make navigation immediate;
4. permissions and external groups constrain what people and the Assistant can do;
5. Custom JSX v2 and Workshop extend Homarr with options, data requests, and guarded actions;
6. shared request caching, parallel loading, lazy surfaces, and isolated previews reduce redundant work.

That narrative is fully supported by the audited release source. Numeric memory/speed claims are not.
