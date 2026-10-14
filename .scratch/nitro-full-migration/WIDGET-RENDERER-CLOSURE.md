# Widget renderer closure — proposed leases

Planning only, 2026-10-11. The frozen query-ownership correction passed source review; it is not reopened here. **95 typed Widget bindings / 23 renderer candidates / 46 held kinds / zero mounted or runtime-verified renderers.** No implementation, acceptance increment or private exposure follows from this plan.

## Boundary and approach

`packages/widgets/src/{registry,manifest}.ts` remains the sole 69-kind catalog. Definitions, option keys/defaults/refinements, integration requirements and advanced-focus flags remain authoritative. The six sets below are the literal component-loader kinds minus `apps/nitro/src/features/widgets-runtime/support.ts`; together they account for the exact missing 46, without assigning any of the existing 23 to a new port.

Prefer **source-package view extraction plus frontend-specific query/action adapters**, not wholesale legacy component imports. Keep data-to-display algorithms, CSS and domain layouts in `@homarr/widgets`; separate their tRPC, board/session and ambient service acquisition from props-driven React/Mantine views. Existing hook-free leaves can be reused immediately after public export review; most top-level components cannot. Extraction means moving existing rendering/helpers and having the original wrapper reuse them, not copying a second implementation. Such producer edits require separate explicit leases; they are not authorized by the adapter directory allocation.

Each future bucket exports named per-kind renderer factories using `WidgetComponentProps<Kind>` and exact inferred native procedure inputs/outputs. It owns only its new directory, imports frozen runtime bindings, and acquires dependencies through reviewed kind-specific interfaces. No competing catalog, generic result controller, global `fetchApi`, fake session/grant provider, permissive option schema, explicit `any` or cast-based private-context bridge. Coordinator integration of those factories into the existing loader/resolver boundary waits for independent reviews; no shared file is bucket-owned.

## Six disjoint implementation buckets

All source paths below are relative to `packages/widgets/src/`. Ownership paths are relative to the repository root. Each listed component also retains its canonical definition module and source styles; no replacement option inventory is proposed.

### A. Content and links — 9 kinds

**Kinds:** `app`, `bookmarks`, `rssFeed`, `releases`, `timetable`, `stockPrice`, `archiveTeamWarrior`, `minecraftServerStatus`, `video`.

**New ownership:** `apps/nitro/src/features/widget-renderers/content/`.

**Sources:** `app/component.tsx`, `bookmarks/bookmarks-widget.tsx`, `rssFeed/component.tsx`, `releases/component.tsx`, `timetable/component.tsx`, `stocks/component.tsx`, `archive-team-warrior/component.tsx`, `minecraft/server-status/component.tsx`, `video/component.tsx`.

**Work:** assemble actual source cards, bookmark groups, feed items, release details, departure boards, stock sparklines and player. Reuse `bookmarks/{bookmark-item,groups-data}.ts`, `common/{application-url,locale}.ts`; extract embedded content views rather than reimplementing calculations. Releases preserve provider grouping/chunks of five, repository errors/order/viewed state and relative-date formatting. Use keyed per-chunk query-observer children instead of recreating tRPC's `useQueries` DSL. Archive's suspense acquisition needs an explicit cancellation/pending decision, not a silent fallback change. Video preserves source playback options, CSS and player disposal; it has no Widget data query.

**Required frozen interfaces:** Widget bindings including app ping; a separately typed Apps client for `app.byId/byIds`; actual board presentation/settings, formatter/clock and bookmark spotlight registration. Media/icon URL serving and feed error/log navigation remain producer joins. App metadata is not supplied by the 95 bindings.

### B. Infrastructure and actions — 11 kinds

**Kinds:** `dnsHoleSummary`, `dnsHoleControls`, `smartHome-entityState`, `smartHome-executeAutomation`, `notifications`, `vpn`, `ups`, `wud`, `llamacpp`, `indexerManager`, `dockerContainers`.

**New ownership:** `apps/nitro/src/features/widget-renderers/infrastructure/`.

**Sources:** `dns-hole/{summary,controls}/component.tsx`, `smart-home/{entity-state,execute-automation}/component.tsx`, `{notifications,vpn,ups,wud,llama-cpp,indexer-manager,docker}/component.tsx`.

**Work:** preserve controls, durations, source failures, selected targets, confirmation/pending/retry UX and context actions. Reuse `notifications/{display.ts,notification-body.tsx}`, `smart-home/layout.ts`, `vpn/helpers.ts`, `docker/{filter,layout}.ts`, `indexer-manager/status.ts`. Preserve notification HTML/Markdown sanitization. Move embedded action views behind typed callbacks; invalidate through each existing native procedure's scoped `utilities`, not a facade rewrite. Keep llama.cpp's task-specific speed state and source thresholds.

**Required frozen interfaces:** current integration interaction admission and retirement, board radius/settings, real spotlight/action registrations, notifications/confirmation and navigation. Docker additionally needs its own typed native client, endpoint capabilities, logs and add-app/removal flows; its procedures are outside Widget. UI capability props cannot authorize dispatch. Q18 remains unresolved; no private read or mutation is enabled with invented grants.

### C. Media and calendar — 12 kinds

**Kinds:** `calendar`, `downloads`, `mediaServer`, `mediaRequests-requestList`, `mediaRequests-requestStats`, `mediaMissing`, `mediaTranscoding`, `mediaReleases`, `immich-serverStats`, `immich-albumCarousel`, `tracearr`, `audioStats`.

**New ownership:** `apps/nitro/src/features/widget-renderers/media/`.

**Sources:** `{calendar,downloads,media-server,media-missing,media-transcoding,media-releases,tracearr,audio-stats}/component.tsx`, `media-requests/{list,stats}/component.tsx`, `immich/{server-stats,album-carousel}/component.tsx`.

**Work:** reuse `calendar/calendar-events.ts`, `downloads/helpers.ts`, `tracearr/{source,bitrate}.ts` and source panels/content leaves after separating their contexts. Preserve half-open calendar intervals/all-day semantics, source provenance, pagination/sorts, download column persistence, media availability/status rules, carousel actions/reduced motion and source-specific audio branches. Native actual-input registrations own dynamic calendar/transcoding/audio queries; do not manufacture tRPC-shaped runtime ownership. Audio's backend-specific payloads require proven native narrowing, not the existing renderer's cast copied into an adapter.

**Required frozen interfaces:** board presentation/date/settings/byte formatters; current interact admission for download/request actions; media-search spotlight and authorized image/proxy URLs; source `widgetRuntimeRef`/state continuity and real option persistence. `common/{homarr-data-table.tsx,use-persisted-table-layout.ts}` already offers a useful prop/callback seam, not permission authority. Image routes and private media serving are held independently of data bindings.

### D. Telemetry and charts — 10 kinds

**Kinds:** `systemResources`, `systemDisks`, `healthMonitoring`, `beszelSystemTable`, `beszelSystemGrid`, `beszelAlerts`, `beszelSystemStats`, `speedtestTracker`, `umami`, `stats`.

**New ownership:** `apps/nitro/src/features/widget-renderers/telemetry/`.

**Sources:** `{system-resources,system-disks,health-monitoring,beszel-system-table,beszel-system-grid,beszel-alerts,beszel-system-stats,speedtest-tracker,umami,stats}/component.tsx`; Beszel shared files live under `beszel/_shared/`.

**Work:** reuse `health-monitoring/integration-selection.ts`, `health-monitoring/cluster/resource-table.tsx`, `beszel-system-stats/selection.ts`, `beszel/_shared/{hooks.ts,chart.tsx}`, `speedtest-tracker/helpers.ts`, `stats/{config.ts,format.ts,table.tsx,details.tsx}`. These are not all context-free: Beszel's `stats-view.tsx` still fetches, system-resource `common-chart.tsx` reads board context, and Umami utilities import their definition/demo hook. Extract their real view boundaries. Preserve chart domains, units, weighted speedtest aggregation, history sizes, Umami conditional queries and 60-second policies, Beszel's visibility-gated 60-record live window without synthesized samples.

Stats uses one catalog observer per integration and one snapshot observer per visible source, never per metric. Keyed observer children can reuse frozen `useQuery` registration; retain catalog/snapshot staleness, retry suppression, force refresh, cooldown and exact scoped cancel/set/invalidate order. Parent source-state aggregation must preserve failure/recovery and cleanup semantics; it is not a second live-query registry.

**Required frozen interfaces:** credential-free Integration metadata (`id/kind`) for health partitioning, actual formatters/presentation, reviewed table persistence/modal ports, real oRPC Beszel iterator lifecycle, retained runtime actions. Stats remains **30 native candidates / 59 legacy physical holds**; catalog visibility or a successful Widget binding cannot clear provider/lease/trust/settlement guards.

### E. Notes and rich text — 2 kinds

**Kinds:** `notebook`, `anchorNote`.

**New ownership:** `apps/nitro/src/features/widget-renderers/notes/`.

**Sources:** `notebook/{component,notebook}.tsx`, `notebook/{display,read-only-task-item,text-direction}.ts`, `anchor-note/{component,editor}.tsx`, `anchor-note/content.ts`.

**Work:** preserve source Tiptap extensions, task read-only behavior, RTL, edit/save/discard state and Quill Delta parsing. Reuse `anchor-note/content.ts`; extract Notebook's session/board permission acquisition from its actual editor, not substitute plain text. Replace `next/dynamic` only through a reviewed browser-only React lazy boundary; preserve editor CSS and initialization/unmount behavior. The existing Quill constructor assertion is a source typing seam to resolve, not permission to add casts.

**Required frozen interfaces:** `notebook.updateContent`, `anchorNotes.listNotes/getNote/updateNote`, genuine board change/integration interaction admission, source note edit permissions, persistence and notification callbacks. Widget option editor and active editor feature modules remain untouched; this bucket owns only the on-tile editors.

### F. Extension runtimes — 2 kinds

**Kinds:** `assistant`, `customApi`.

**New ownership:** `apps/nitro/src/features/widget-renderers/extensions/`.

**Sources:** `assistant/{component,context}.tsx`, `custom-api/{component,custom-jsx-display,widget-definition-context}.tsx`, `custom-api/{jsx-components,migration-state}.ts`.

**Work:** Custom API assembles the existing Custom JSX runtime/bindings, actual diagnostics/migration behavior and published request state. Replace the source `fetchApi` singleton with lifecycle-bound native calls for Widget `customApi` requests/actions/refresh; configuration/preview operations need their separately reviewed Custom Widget client. Preserve request capabilities, confirmation and invalidation, with no preview/action escalation. Existing display/provider is not a pure view. Assistant's package component is only a renderer-context handoff; its unavailable message is not a real assistant port. Consume a separately frozen actual Assistant renderer through the existing context, otherwise keep this kind held.

**Required frozen interfaces:** genuine Custom Widget runtime port, confirmation/invalidation/lifetime, actual Assistant renderer and its authority/availability/stream contracts. Neither factory is deliverable as full rendering until these producers exist and pass review. Workshop/configuration and assistant implementations are not inspected or reopened by this plan.

## Residual closure of the existing 23 — no repeat ports

Every candidate still needs the declared package graph, uninstalled source adapter, real theme/i18n providers and canonical typed options. Preserve thirteen source advanced-capable kinds and ten compact-only kinds; do not promote focus support by counting a procedure.

| Exact candidate set                                                                                                                    | Remaining source/context seam                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clock`, `countdown`, `timer`                                                                                                          | Source Day.js plugin/timezone/locale initialization, deterministic initial clock state, recurrence and persisted/browser-alert lifecycle. `clock/world-clock.ts` initializes UTC/timezone locally; that does not establish global locale/provider closure. Conditional weather corner retains the accepted positive-count ownership fix. |
| `weather`, `airQuality`                                                                                                                | Weather view exports still absent; source details/icons/chart/styles and actual translation/culture graph remain joins. Keep the completed weather assembly, not another adapter generation.                                                                                                                                             |
| `bazarr`, `coolify`, `paperlessNgx`, `patchmon`                                                                                        | Actual native-output/view compatibility, UI zoom/styles and locale behavior; Coolify/PatchMon retain local relative-time plugin use. PatchMon threshold cross-refinement must survive option schema extraction.                                                                                                                          |
| `networkControllerSummary`, `networkControllerStatus`, `firewall`, `traefik`, `uptimeKuma`                                             | Native DTO compatibility, Day.js/plugins where used, CSS/UI/translation closure; Firewall's nested query/menu/version imports and local selection/history, Traefik's embedded aggregation, source pending/partial failures and dates remain real dependencies.                                                                           |
| `iframe`                                                                                                                               | Actual option parsing and CSS/i18n/Common export graph; preserve source sandbox/permissions/edit-mode behavior without redesign or fake network proof.                                                                                                                                                                                   |
| `wazuhAgents`, `wazuhAlerts`, `wazuhSummary`, `wazuhTimeline`, `wazuhTopList`, `wazuhVulnerabilities`, `wazuhFim`, `wazuhAuthFailures` | Shared error/link/helper graph and type-only Integration DTO closure, real query-result compatibility, ranges/sorts/pending states; dashboard links are not evidence of native service availability.                                                                                                                                     |

Common `query-state.ts` still imports the legacy permission-check name; only the frozen importer-restricted adapter redirects it. `errors/base-component.tsx` still reads session and routed Link: reuse the native error boundary for host failures, and extract RSS's actual inline error view with explicit retry/log capability instead of importing a fake Auth context. Literal definition loaders can still pull option-input/API/modal edges even after component replacements; renderer review alone does not close the full manifest graph.

## Exact producer/declaration requests — Oracle before allocation

1. **Existing missing declarations:** `@homarr/api/nitro/routers/widgets` → `packages/api/src/nitro/routers/widgets.ts`; `@homarr/widgets/weather/compact` and `/weather/advanced` → respective existing `.tsx` files. These are not new API bodies or view generation.
2. **Proposed pure-view exports, not existing seams:** six explicit entries `@homarr/widgets/rendering/{content,infrastructure,media,telemetry,notes,extensions}` → six respective new `packages/widgets/src/rendering/<bucket>.ts` barrels. Export only that bucket's named prop-driven views/types and reused helpers; no definitions/loaders/services. Missing embedded views require separately leased source extraction into adjacent view files, with original wrappers consuming them without behavioral changes. Extension exports cannot invent an Assistant view. No wildcard export or application import from the package.
3. **Outside-Widget contracts:** Apps factory export already exists (`@homarr/api/nitro/routers/app`); reuse it, not a new binding on `WidgetRpcClient`. Docker, credential-free Integration metadata, Custom Widget and Assistant need exact type-only public factory/renderer declarations selected by their frozen producers/COMPOSITION. Their usable public shapes were not established in this lease; do not invent signatures or import active/private modules. Their adapters must participate in the existing scope's `record/register`, actual-input identity and cache retirement without broadening Widget's 95-entry map. If the producer cannot furnish that seam, affected kinds remain held.
4. **Canonical options:** `options.ts` supplies validators for some types, not a complete runtime parser for every inferred option. Preserve `OPTIONS_SUPER_REFINE`, `multiText` handling, timezone/countdown uniqueness/limits, `statsEntriesSchema`, defaults and internal values. Ask the schema/editor producer for a typed source-derived parser accepted by the frozen host; do not infer validation from defaults or invent tighter validation. Hook-bearing definitions (e.g. bookmarks, timetable, Beszel selection) also need genuine native option-provider joins under that producer's lease. No schema/editor rewrite by a renderer bucket.
5. **Presentation/services:** board owner supplies source radius/settings and retained item/runtime/state refs, real option persistence/table change access; accepted Navigation and standalone translation/culture interfaces supply routing/locale/formatters. Action buckets require actual current grants and service lifetimes. These contracts must be frozen before consumers; boolean display props are never proof of authority. Shared providers/host are not bucket-owned.

**Dependency additions are declarations, not installs:** `apps/nitro` already declares React 19.2.7, Mantine core/hooks 9.6.0, Query 5.101.2, oRPC beta.43, Zod and Vite. Coordinator must declare its directly imported workspaces `@homarr/{api,widgets,definitions,translation,validation}` plus `common`, `ui`, `custom-widgets` only where new adapter imports require them. Add `@tabler/icons-react` at the existing catalog 3.44.0 pin for direct adapter icons. Keep domain libraries in their existing source package: charts, dates, Day.js, table, Markdown/sanitizers, Quill and video.js are already declared there. If an adapter directly imports one, declare that exact existing catalog pin in Nitro too; no transitive-hoist reliance or new library choice. Widgets' existing direct imports need missing declarations for `@mantine/tiptap` 9.6.0, `@tanstack/react-query` 5.101.2 and `next-intl` 4.13.1 when leasing producer extraction. Nitro's RSS SCSS build needs the existing `sass` 1.101.0 development dependency. No Next/tRPC/Redis dependency addition to Nitro to preserve old contexts.

## Integration order and retained holds

Oracle first resolves the missing view/parser/foreign-client/lifetime seams and any intentional source behavior changes. A and D keyed observer designs must preserve actual cache keys, polling and cleanup; if that cannot be done with frozen hooks, request one bounded owner-controlled batch seam rather than six competing helpers. Calendar currently records a zero-based runtime month but sends a one-based query month: use the actual native query registration; changing the source matcher itself requires Oracle, not a covert parity fix. Suspense cancellation remains unproven.

Then allocate disjoint directories, review each factory and its producer extraction independently, and only afterward let the coordinator integrate approved component replacements at the existing loader/resolver boundary. No edits to the frozen host, bindings, catalog, runtime, schemas/editor, manifests or routes are allocated here. A single named source `displayMode`/dimension/scale/state contract, source refresh defaults including null/no-poll, locale/date/chart/CSS semantics and forbidden-data retirement must survive assembly.

Authoritative grants **Q18**, current provider/lease admission, **Stats physical guards**, Q16/Q17 and all production/mounting holds stay in force. No fallback placeholders count as support; no permission-shaped DTO clears private execution. Later authorized graph/lifecycle/UX evidence must be reported separately from source candidates. This planning lease performed source reads and wrote only this file; no commands, import/evaluation, checks, network/browser/SQL/current-data/provider/environment/listener/Git or nested-agent operations were performed.
