# Every widget in the replacement runtime

Research for [AJN-507](https://linear.app/ajnart/issue/AJN-507/map-every-widget-into-the-replacement-runtime), under [AJN-482](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr), 2026-10-10. Destination: Nitro v3 + Vite/React + TanStack Router + direct oRPC. This is a source inventory and proposed implementation graph, **not implementation authorization, an architecture decision, or observed all-widget compatibility**.

## 1. Provenance and coverage reconciliation

- Checkout: branch `rework-hono`, HEAD `66e2199f9cd1e4026249c3763413988bab8664c4`. The uncommitted experiment and other existing files are not equivalent to this commit's production application. Existing unrelated changes were `.gitignore`, `bun.lock`, `.ignore`, `.scratch/`, `apps/nitro-experiment/`, `reports/`, and `research_notes/`.
- Read the live assigned ticket and parent, [shared research contract](../../.scratch/nitro-full-migration/RESEARCH.md), [prior dashboard-rendering findings](../Homarr%20Nitro%20migration%20experiment/dashboard-rendering.md), [oRPC release findings](../Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md), and [bounded fixture integration handoff](../../.scratch/nitro-feasibility/worker-notes/integration.md). The fixture is evidence only for its selected board and procedures.
- Only this note was written. No application, manifest, Git history, tracker, roster, credential, appdata, or runtime changes; no installs, builds, tests, lint, typecheck, application probes, or browser/container interaction. Validation here means read-only reconciliation against source, not runtime validation.

| Coverage | Result | Primary authority |
| --- | --- | --- |
| Durable declared widget kinds | **69** | [widget.ts](../../packages/definitions/src/widget.ts), `widgetKinds` and default sizes |
| Explicit module loaders | **69** | [registry.ts](../../packages/widgets/src/registry.ts), `widgetModuleLoaders` |
| Explicit component loaders | **69** | Same file, `widgetComponentLoaders`; all referenced component files exist |
| Defined but unregistered kinds / declared kinds without loaders | **0 / 0** | Reconcile `createWidgetDefinition` calls with both registries and declared kinds |
| Direct option declarations | **372** | The 69 modules in §3; includes generic `bookmarks.items`, hidden/internal fields, and zero-option definitions |
| Input kinds mapped by editor | **25** | [inputs mapping](../../packages/widgets/src/_inputs/index.ts), exhaustive `WidgetOptionType` mapping |
| Definitions enabling advanced focus | **42** | Module `supportsAdvancedFocus: true`, marked in §3 |
| Widget API subrouters | **46** | [widgets/index.ts](../../packages/api/src/router/widgets/index.ts); includes `options` and `secrets`, not 46 widget kinds |
| Native picker kinds | **68**, plus dynamic Custom JSX definition choices | [item-select-modal.tsx](../../apps/nextjs/src/components/board/items/item-select-modal.tsx); `customApi` excluded from ordinary native list |

SHA256 snapshots: `packages/definitions/src/widget.ts` = `35c9a498719f78b6988d5b1676beeab4eae33709e8c90795ba45b6f212fcb42f`; `widget-integration-map.ts` = `76da1d98481d88afd1dda081ad7b0007c4b5187141d181f3ea72829b2171ea2d`; `packages/widgets/src/registry.ts` = `0abb9f3c11fc4fd2e82f51881e081b991f44e73813ef5f5f819829dd26317488`; `manifest.ts` = `c73a5ba5dbfbf4e9634a9d86655a3abb1e41174907e62d0680bd032a3cd6c78b`.

**Disabled/legacy reconciliation:** no separate missing native kind was found. Custom JSX placements use durable kind `customApi` plus `definitionId`. Disabled, deleted, invalid, and preserved legacy definitions are runtime/discovery states, not additional registry entries. Management discovery unions current and non-shadowed legacy definitions; available-definition discovery includes enabled definitions and preserves a requested current/legacy selection. Placed reads check board view, definition existence/enabled state, and configuration repair; legacy-only IDs yield `PRECONDITION_FAILED` / `LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED`. Preserve these states and durable IDs; do not silently enable, drop, or reinterpret legacy content. Sources: [management-queries.ts](../../packages/api/src/router/custom-widget/management-queries.ts), [custom-widget-router.ts](../../packages/api/src/router/custom-widget/custom-widget-router.ts), [custom-api.ts](../../packages/api/src/router/widgets/custom-api.ts), [migration-state.ts](../../packages/widgets/src/custom-api/migration-state.ts).

## 2. Shared seams: reuse the product, replace framework glue

Classification: **R** = reuse domain/React behavior; **A** = adapt dependencies and contracts; **X** = replace framework-specific implementation. These can coexist: a reusable renderer can need a new query adapter and browser-only boundary. No row promises that an unchanged component compiles under Vite.

| Capability | Classification / recommended target seam | Acceptance obligation and owning source |
| --- | --- | --- |
| Durable kinds, sizing, integration support, option schemas | R; keep `@homarr/definitions` and widget modules authoritative | Preserve kind strings/default dimensions, selected integration cardinality, stored option keys/units, enums/defaults/refinements/visibility and existing board data. [widget.ts](../../packages/definitions/src/widget.ts), [widget-integration-map.ts](../../packages/definitions/src/widget-integration-map.ts), [options.ts](../../packages/widgets/src/options.ts). |
| Lazy module/component loading | R/A; explicit Vite-discoverable literal imports and retryable resource cache | Keep definitions and components independently loadable, request both in parallel on cold load, deduplicate in-flight loads, evict rejected promises so retry works. Do not eagerly import 69 components into root providers. [registry.ts](../../packages/widgets/src/registry.ts), [manifest.ts](../../packages/widgets/src/manifest.ts). |
| Option reduction and editor validation | R/A; definition-driven editor, unchanged durable encoding | `reduceWidgetOptionsWithDefinition` uses **nullish** fallback, not falsy fallback, and projects declared fields. Preserve false/0/empty-string values and settings-dependent defaults. Editor assembles declared Zod validations and `OPTIONS_SUPER_REFINE`, multi-text arrays, integration min/max, and advanced title/classes/border. These are not proof that `saveItemOptions` validates every option server-side. [manifest.ts](../../packages/widgets/src/manifest.ts), [widget-edit-modal.tsx](../../packages/widgets/src/modals/widget-edit-modal.tsx), [options.ts](../../packages/widgets/src/options.ts), [options router](../../packages/api/src/router/widgets/options.ts). |
| Per-item renderer contract | R/A; stable React item host owned by dashboard | Keep options/integration IDs/item ID/board ID/edit mode, compact-or-advanced mode, measured width/height, display scale, `setOptions`, runtime/state refs, and removal callback. Preview IDs can be undefined. [definition.ts](../../packages/widgets/src/definition.ts), `WidgetComponentProps`. |
| Board host and advanced focus | R/A; port portal/lifecycle behavior, X for Next-only lazy wrappers | Preserve per-item refs across grid/focus movement, dimensions before measurement, card shell/title/opacity/CSS, suspense and load-error recovery. Advanced-focus transitions must not reset timers, drafts, tables or selected pages, or create duplicate polling/players/streams. Sources: [item-content.tsx](../../apps/nextjs/src/components/board/items/item-content.tsx), [grid portal host](../../apps/nextjs/src/components/board/sections/grid/grid-portal-host.tsx), [widget-card-shell.tsx](../../packages/widgets/src/widget-card-shell.tsx). |
| Transport hooks and imperative utilities | X/A; direct oRPC client + TanStack Query options, behind a shared widget data contract | Replace `clientApi.*.useQuery/useSuspenseQuery/useMutation/useSubscription/useQueries`, tRPC `getQueryKey`, `useUtils`, router input/output imports, and tRPC error inspection together. Preserve exact inputs, conditional enabling, cancellation, mutation invalidation and error semantics. [definition.ts](../../packages/widgets/src/definition.ts), [runtime-hooks.ts](../../packages/widgets/src/runtime-hooks.ts), §4 source consumers. |
| Query ownership / context refresh / recovery | X/A; transport-independent semantic query references or a verified oRPC key adapter | `normalizeWidgetQuery` expects `[pathArray, { input }]`. oRPC keys cannot be assumed to normalize this way. Track the actual query key plus procedure identity/input; refresh and clear only this item's data. Include dynamic integration order, coordinates, month/year, filters, page, website/event/timeframe, album/system/history inputs; kind prefixes alone are insufficient. [widget-query-scope.ts](../../apps/nextjs/src/components/board/items/widget-query-scope.ts), [widget-query-recovery.ts](../../apps/nextjs/src/components/board/items/widget-query-recovery.ts), [widget-context-menu.tsx](../../apps/nextjs/src/components/board/items/widget-context-menu.tsx), [definition.ts](../../packages/widgets/src/definition.ts). |
| Runtime actions/status | R/A; keep scoped registration with lifecycle cleanup | Preserve custom refresh/status/polling actions, indexer testing, photo previous/next/slideshow, and context permission/edit-mode predicates. `useWidgetRuntimeQueries/Actions` clear only their own registration on cleanup. Status means last data update/error/refresh state, not just component mount. [definition.ts](../../packages/widgets/src/definition.ts), [runtime-hooks.ts](../../packages/widgets/src/runtime-hooks.ts), [stats](../../packages/widgets/src/stats), [immich carousel](../../packages/widgets/src/immich/album-carousel), [indexer manager](../../packages/widgets/src/indexer-manager). |
| Provider tree | A/X; one frontend-services contract, not ad hoc widget-local substitutes | Supply QueryClient, session/integration permissions, board/edit mode, settings (units/time), translations/Intl, Mantine theme/modals/notifications, Spotlight, demo read-only, and Assistant renderer. Cross-route navigation must retain or explicitly dispose state. [client provider](../../apps/nextjs/src/app/%5Blocale%5D/_client-providers/trpc.tsx), [widget edit modal](../../packages/widgets/src/modals/widget-edit-modal.tsx), [package dependencies/exports](../../packages/widgets/package.json). |
| Server prefetch and hydration | X/A; request-local authorized oRPC caller + chosen Router/SSR hydration | Replace RSC server imports, deferred Node scheduling and experimental Next Query streamed hydration; preserve exact consumer inputs and request identity without double-dehydration or duplicate fetch. Current HTML is populated for **app/bookmarks only**; other widgets have deterministic pending cards until hydration even when data was prefetched. [server-prefetch.ts](../../packages/widgets/src/server-prefetch.ts), [prefetch.ts](../../packages/widgets/src/prefetch.ts), [initial-widget-resources.ts](../../packages/widgets/src/initial-widget-resources.ts), [item-content.tsx](../../apps/nextjs/src/components/board/items/item-content.tsx). |
| Browser-only imports and lifecycle | R for browser behavior, X for `next/dynamic({ssr:false})` | Replace Next boundary for Notebook, Anchor editor and Custom JSX; do not import them into server execution merely because Vite supports SSR. Video.js player creation/disposal, browser storage, audio/notifications, clipboard, DOM observers and iframe behavior require client lifecycle. [notebook](../../packages/widgets/src/notebook), [anchor-note](../../packages/widgets/src/anchor-note), [custom-api/component.tsx](../../packages/widgets/src/custom-api/component.tsx), [video/component.tsx](../../packages/widgets/src/video/component.tsx). |
| Persisted table state | R/A; reuse shared debounced layout logic and protected option-save contract | Hidden columns/order/widths survive reload/key switch; 350ms debounce flushes on unmount/key switch; never write for board read-only users. Save checks board modify and item ownership, plus timetable/custom placement policies. [use-persisted-table-layout.ts](../../packages/widgets/src/common/use-persisted-table-layout.ts), [options.ts](../../packages/api/src/router/widgets/options.ts). |
| Errors, empty states, retained stale data | R UI, X/A transport error adapter | `getUsableWidgetQueryData` keeps data on nonterminal failures but throws FORBIDDEN; root provider clears forbidden widget data. Preserve structured errors, retryability, integration partial-result indicators, and unavailable vs empty vs initial-loading distinction. Logout/account change must not expose prior session data. [query-state.ts](../../packages/widgets/src/common/query-state.ts), [query-state-indicator.tsx](../../packages/widgets/src/common/query-state-indicator.tsx), [errors/component.tsx](../../packages/widgets/src/errors/component.tsx), [query-cache.ts](../../packages/api/src/query-cache.ts), [session-query-scope.ts](../../apps/nextjs/src/app/%5Blocale%5D/_client-providers/session-query-scope.ts). |

### Effective refresh policy, not just definition metadata

The actual root provider applies global stale/GC defaults, the `widget` polling prefix, the lightweight interval registry, then dashboard supporting-query policies; consumer options can override those again. `definition.refetchInterval` alone is not a complete runtime policy. Sources: [trpc.tsx](../../apps/nextjs/src/app/%5Blocale%5D/_client-providers/trpc.tsx), [refetch-intervals.ts](../../packages/widgets/src/refetch-intervals.ts), [query-cache.ts](../../packages/api/src/query-cache.ts).

- Base widget polling **30s**, stale **30s**, GC **5min**; widget focus/reconnect refetch disabled. Metadata `app.byId`, `app.byIds`, `integration.byIds`: no polling, stale **5min**, focus/reconnect allowed. Supporting Docker policy reapplies **30s** polling and stale **30s**.
- DNS, downloads, firewall, health/system resources/disks, media streams and Tracearr: **10s**; downloads stale **10s**. llama.cpp **5s**. Weather **600s**, stale **300s** (also Clock weather). Air quality **900s**.
- Root no-poll families: Immich server/albums/album, indexers, media releases, transcoding, Minecraft, network controller, Paperless, repository releases, RSS, Speedtest, Stats, stocks, Umami, VPN, WUD. Null means no scheduled polling, not immutable data or no manual refresh. Definition and root tables must be reconciled rather than rebuilt from one alone.
- Stats component groups entries by integration and polls snapshots **60s**, catalog stale **60s**, snapshot stale **30s**, with runtime refresh/status and failure cooldown. Umami consumers explicitly poll **60s** despite null root defaults. Wazuh mostly **60s**, top list **120s**, vulnerabilities **300s**, timeline **60s** for 1h/24h and **300s** for 7d/30d. Sources: [stats](../../packages/widgets/src/stats), [umami](../../packages/widgets/src/umami), eight Wazuh component directories in §3.
- Beszel historical stats explicitly poll **5s**. Live `1m` switches to SSE subscription, with document-visibility gating and **60 records per client buffer**, reset on identity/enabling changes. Server uses bounded queue, AbortController and generator `finally` cleanup. Table/grid drill-down modals also use shared stats/live views. Sources: [stats-view.tsx](../../packages/widgets/src/beszel/_shared/stats-view.tsx), [use-live-stats.ts](../../packages/widgets/src/beszel/_shared/use-live-stats.ts), [beszel.ts](../../packages/api/src/router/widgets/beszel.ts), [bounded-async-queue.ts](../../packages/api/src/router/widgets/bounded-async-queue.ts).
- Custom JSX polling is option-driven, default fallback **30s**, minimum **1s**; terminal definition errors stop polling/retry, and demo read-only suppresses both. [custom-api/component.tsx](../../packages/widgets/src/custom-api/component.tsx).
- Demo suppression in provider defaults does **not** prove all component-local intervals are suppressed. Beszel and Custom JSX have explicit guards; all independently overridden consumers need reconciliation. Centralized policy is a recommendation; mutating calls still require server-side demo enforcement.

### Current prefetch coverage and discrepancies

`prefetchForKind` handles app/bookmarks. `prefetchInitialWidgetData` additionally covers DNS pair, Beszel systems table/grid/stats and dependent historical discovery, downloads, indexers, media releases/server/request list, both Immich kinds, Docker, RSS, weather and calendar; integration catalog is authenticated-only. It filters initial layout visibility and collapsed ancestors. Calendar avoids ambiguous timezone month boundaries; Beszel does not prefetch an infinite live stream. This is selective coverage, not prefetch for all 69 kinds. Source: [server-prefetch.ts](../../packages/widgets/src/server-prefetch.ts).

Existing source gaps to make explicit in the parity ledger, not silently preserve as desired behavior:

1. All eight Wazuh definitions omit `queryKey`. Fallback paths such as `widget.wazuhAgents` do not match actual `widget.wazuh.getAgents`; context refresh/recovery ownership is therefore not established by registration alone. [getWidgetQueryKeys](../../packages/widgets/src/definition.ts), [scope](../../apps/nextjs/src/components/board/items/widget-query-scope.ts), Wazuh modules/components in §3.
2. Downloads server prefetch supplies `integrationIds` and `limitPerIntegration` but omits consumer `includeArchivedHistory` and `historyWindowDays`; existing prefetch is not proof of exact-key hydration for archived-history configurations. [server-prefetch.ts](../../packages/widgets/src/server-prefetch.ts), [downloads/component.tsx](../../packages/widgets/src/downloads/component.tsx), [downloads/index.ts](../../packages/widgets/src/downloads/index.ts).
3. `mediaTranscoding.queuePageSize` is declared but the renderer derives queue page size from height/advanced mode. Preserve the durable option and decide whether to repair behavior; do not claim the option currently controls the view. [media-transcoding/index.ts](../../packages/widgets/src/media-transcoding/index.ts), [component.tsx](../../packages/widgets/src/media-transcoding/component.tsx).

## 3. Exhaustive definition/option ledger

Each linked directory is under `packages/widgets/src/` and owns its `index.ts` (Bookmarks: `index.tsx`), `component.tsx`, and local helpers/subcomponents. Thus each row cites both definition and rendering evidence; the explicit file mapping is independently established by [registry.ts](../../packages/widgets/src/registry.ts). **A** means adapt the shared data/services contract while reusing domain/React behavior; **R/A** marks primarily local/browser rendering; **A/X** highlights a framework-specific boundary to replace. Focus is definition-enabled, not a count of distinct modal implementations. Option keys below are exhaustive direct declarations; source modules, not this note, remain authoritative for literal defaults, validation, enums, hidden-field predicates and settings-dependent values.

| Durable kind / source | Class | Focus | Option keys |
| --- | --- | --- | --- |
| [clock](../../packages/widgets/src/clock) | R/A | yes | customTitleToggle, customTitle, is24HourFormat, useCustomTimezone, timezone, showDate, dateFormat, customTimeFormat, showWeather, weatherLocation, isWeatherFormatFahrenheit, animateWeatherIcon, colorWeatherByDayNight, dayWeatherColor, nightWeatherColor, worldClockCities |
| [airQuality](../../packages/widgets/src/air-quality) | A | yes | location, aqiStandard, showUv, showPollutants, showPollen |
| [countdown](../../packages/widgets/src/countdown) | R/A | yes | events, showProgress, showSeconds |
| [timer](../../packages/widgets/src/timer) | R/A | yes | mode, timerMinutes, focusMinutes, shortBreakMinutes, longBreakMinutes, sessionsBeforeLongBreak, autoStartBreaks, autoStartFocus |
| [app](../../packages/widgets/src/app) | A | no | appId, openInNewTab, showTitle, descriptionDisplayMode, layout, pingEnabled |
| [assistant](../../packages/widgets/src/assistant) | A/X | no | none |
| [archiveTeamWarrior](../../packages/widgets/src/archive-team-warrior) | A | yes | showBroadcastMessage |
| [anchorNote](../../packages/widgets/src/anchor-note) | A/X | yes | noteId, showTitle, showUpdatedAt |
| [notebook](../../packages/widgets/src/notebook) | A/X | no | showToolbar, allowReadOnlyCheck, content |
| [iframe](../../packages/widgets/src/iframe) | R/A | no | embedUrl, allowFullScreen, allowScrolling, allowPayment, allowAutoPlay, allowMicrophone, allowCamera, allowGeolocation, allowModals |
| [video](../../packages/widgets/src/video) | R/A | no | feedUrl, hasAutoPlay, isMuted, hasControls |
| [dnsHoleSummary](../../packages/widgets/src/dns-hole/summary) | A | no | usePiHoleColors, layout |
| [dnsHoleControls](../../packages/widgets/src/dns-hole/controls) | A | no | showToggleAllButtons |
| [smartHome-entityState](../../packages/widgets/src/smart-home/entity-state) | A | yes | entityId, displayName, entityUnit, clickable |
| [smartHome-executeAutomation](../../packages/widgets/src/smart-home/execute-automation) | A | yes | displayName, automationId |
| [stockPrice](../../packages/widgets/src/stocks) | A | yes | stock, timeRange, timeInterval, showDetails |
| [mediaServer](../../packages/widgets/src/media-server) | A | yes | showOnlyPlaying, showBitrate, showLocation |
| [calendar](../../packages/widgets/src/calendar) | A | yes | releaseType, filterPastMonths, filterFutureMonths, showUnmonitored |
| [downloads](../../packages/widgets/src/downloads) | A | yes | columns, defaultSort, descendingDefaultSort, showCompletedUsenet, showCompletedTorrent, showCompletedHttp, includeArchivedHistory, historyWindowDays, activeTorrentThreshold, categoryFilter, filterIsWhitelist, applyFilterToRatio, limitPerIntegration, columnOrder, columnWidths |
| [mediaRequests-requestList](../../packages/widgets/src/media-requests/list) | A | no | linksTargetNewTab, statusFilter, recentDays |
| [mediaRequests-requestStats](../../packages/widgets/src/media-requests/stats) | A | no | none |
| [mediaMissing](../../packages/widgets/src/media-missing) | A | yes | showMissing, showQueued, pageSize |
| [networkControllerSummary](../../packages/widgets/src/network-controller/summary) | A | yes | none |
| [networkControllerStatus](../../packages/widgets/src/network-controller/network-status) | A | yes | content |
| [rssFeed](../../packages/widgets/src/rssFeed) | A | yes | feedUrls, enableRtl, textLinesClamp, descriptionMaxLength, maximumAmountPosts, hideDescription, showPosterImage |
| [bookmarks](../../packages/widgets/src/bookmarks) | A | yes | title, showTitle, titleSize, layout, variant, spacing, hideTitle, hideIcon, hideHostname, openNewTab, withBorder, grow, customUrls, groups, items |
| [bazarr](../../packages/widgets/src/bazarr) | A | yes | showMissingEpisodes, showMissingMovies, showProviderIssues, showHealthIssues |
| [indexerManager](../../packages/widgets/src/indexer-manager) | A | no | openIndexerSiteInNewTab |
| [healthMonitoring](../../packages/widgets/src/health-monitoring) | A | yes | fahrenheit, cpu, memory, gpu, showUptime, fileSystem, visibleStorageVolumes, visibleClusterSections, defaultTab, sectionIndicatorRequirement |
| [mediaTranscoding](../../packages/widgets/src/media-transcoding) | A | yes | defaultView, queuePageSize |
| [minecraftServerStatus](../../packages/widgets/src/minecraft/server-status) | A | no | title, domain, isBedrockServer |
| [dockerContainers](../../packages/widgets/src/docker) | A | yes | endpointIds, columns, enableRowSorting, defaultSort, descendingDefaultSort, containerFilter, filterIsWhitelist, filterCaseSensitive, filterAllowWildcards, columnOrder, columnWidths |
| [releases](../../packages/widgets/src/releases) | A | yes | newReleaseWithin, staleReleaseWithin, showOnlyHighlighted, showDetails, showOnlyIcon, topReleases, repositories |
| [firewall](../../packages/widgets/src/firewall) | A | yes | none |
| [notifications](../../packages/widgets/src/notifications) | A | yes | hideLogos, messageFormat |
| [mediaReleases](../../packages/widgets/src/media-releases) | A | yes | layout, showDescriptionTooltip, showType, showSource |
| [systemResources](../../packages/widgets/src/system-resources) | A | yes | hasShadow, visibleCharts, labelDisplayMode |
| [coolify](../../packages/widgets/src/coolify) | A | yes | showServers, showApplications, showServices |
| [systemDisks](../../packages/widgets/src/system-disks) | A | yes | showTemperatureIfAvailable, displayMode, showBackgroundBar, visibleStorageVolumes |
| [timetable](../../packages/widgets/src/timetable) | A | yes | baseUrl, station |
| [immich-serverStats](../../packages/widgets/src/immich/server-stats) | A | yes | showUsers, showPhotos, showVideos, showStorage |
| [immich-albumCarousel](../../packages/widgets/src/immich/album-carousel) | A | yes | albumId, rotationIntervalSeconds, showPhotoInfo, randomizePhotos |
| [stats](../../packages/widgets/src/stats) | A | yes | entries, table, rows, plain, showIcon, spacing |
| [paperlessNgx](../../packages/widgets/src/paperless-ngx) | A | no | showInboxRatio, showInboxRing, showDocumentsTotal, showDocumentsInbox, showCorrespondents, showTags, showDocumentTypes |
| [patchmon](../../packages/widgets/src/patchmon) | A | yes | showComplianceHero, showTotalHosts, showHostsNeedingUpdates, showSecurityUpdates, showUpToDateHosts, showHostsWithSecurityUpdates, showRecentUpdates24h, showTotalOutdatedPackages, showTotalRepos, enableThresholdColors, useCustomThresholds, hostsNeedingUpdatesThresholdMode, hostsNeedingUpdatesWarningAt, hostsNeedingUpdatesCriticalAt, securityUpdatesThresholdMode, securityUpdatesWarningAt, securityUpdatesCriticalAt, hostsWithSecurityUpdatesThresholdMode, hostsWithSecurityUpdatesWarningAt, hostsWithSecurityUpdatesCriticalAt, upToDateHostsThresholdMode, upToDateHostsWarningAt, upToDateHostsCriticalAt, totalOutdatedPackagesThresholdMode, totalOutdatedPackagesWarningAt, totalOutdatedPackagesCriticalAt, showOsDistribution, osDisplayMode, osDistributionLimit, showOsVersion |
| [tracearr](../../packages/widgets/src/tracearr) | A | yes | showStreams, showStats, showRecentActivity, showViolations |
| [speedtestTracker](../../packages/widgets/src/speedtest-tracker) | A | no | showLatestResult, showStats, showRecentResults, showPingGraph |
| [uptimeKuma](../../packages/widgets/src/uptime-kuma) | A | yes | showAverageUptime, showUptimeRing, showTotalMonitors, showUpCount, showDownCount, showPausedCount |
| [audioStats](../../packages/widgets/src/audio-stats) | A | yes | showArtists, showAlbums, showSongs, showLibraryCount, showAudiobooks, showPodcasts, showListeningTime, showActiveSessions, compactMode |
| [umami](../../packages/widgets/src/umami) | A | yes | websiteId, timeFrame, viewMode, chartType, chartStyle, eventName, eventNames, topCount |
| [vpn](../../packages/widgets/src/vpn) | A | no | none |
| [ups](../../packages/widgets/src/ups) | A | yes | showBattery, showLoad, showVoltage |
| [beszelSystemTable](../../packages/widgets/src/beszel-system-table) | A | no | statusFilter, sortBy, sortDirection, showCpu, showMemory, showDisk, showGpu, showLoadAvg, showNet, showTemp, showBattery, showServices, showUptime, showAgent, columnOrder, columnWidths |
| [beszelSystemGrid](../../packages/widgets/src/beszel-system-grid) | A | no | statusFilter, showCpu, showMemory, showDisk, showGpu, showLoadAvg, showNet, showTemp, showBattery, showServices, showUptime, showAgent |
| [beszelAlerts](../../packages/widgets/src/beszel-alerts) | A | no | showHistory, maxHistoryItems |
| [beszelSystemStats](../../packages/widgets/src/beszel-system-stats) | A | no | systemId, timePeriod, showCpu, showMemory, showDisk, showDiskIO, showNetwork, showGpuUsage, showGpuMemory, showGpuPower, showDockerCpu, showDockerMemory, showDockerNetwork |
| [traefik](../../packages/widgets/src/traefik) | A | yes | showTcp, showUdp, showEntryPoints |
| [customApi](../../packages/widgets/src/custom-api) | A/X | no | definitionId, configuration, configurationVersion, refreshInterval |
| [weather](../../packages/widgets/src/weather) | A | yes | isFormatFahrenheit, disableTemperatureDecimals, animateIcons, showHumidity, showCurrentWindSpeed, useImperialSpeed, location, dateFormat, showCity, hasForecast, forecastDayCount |
| [wud](../../packages/widgets/src/wud) | A | yes | showTitle, showRing, layout, showUpdateList |
| [llamacpp](../../packages/widgets/src/llama-cpp) | A | yes | showModelInfo, showContextUsage, showCacheHitRate, showSpeedStats, showRequests, showTokenStats, showSpeculative |
| [wazuhAgents](../../packages/widgets/src/wazuh-agents) | A | no | statusFilter, sortBy, showVersion, showGroups |
| [wazuhAlerts](../../packages/widgets/src/wazuh-alerts) | A | no | minLevel, hours, limit, showMitre, showAgent, showSourceIp, showRuleId |
| [wazuhSummary](../../packages/widgets/src/wazuh-summary) | A | no | range, showTrend, showFooter |
| [wazuhTimeline](../../packages/widgets/src/wazuh-timeline) | A | no | range, interval, chartType, yScale, minLevel, showLegend |
| [wazuhTopList](../../packages/widgets/src/wazuh-top-list) | A | no | kind, range, limit, minLevel, showBars |
| [wazuhVulnerabilities](../../packages/widgets/src/wazuh-vulnerabilities) | A | no | cveOrder, minSeverity, cveLimit, agentLimit, showAgents |
| [wazuhFim](../../packages/widgets/src/wazuh-fim) | A | no | range, event, limit, includeRegistry |
| [wazuhAuthFailures](../../packages/widgets/src/wazuh-auth-failures) | A | no | hours, limit, showSourceIps |

### Option input and configuration seams

All 25 mapped input types: `statsEntries`, `internal`, `anchorNote`, `text`, `dateTimeEventList`, `timezoneList`, `location`, `multiSelect`, `multiText`, `number`, `select`, `slider`, `switch`, `app`, `sortableItemList`, `multiReleasesRepositories`, `dynamicSelect`, `dynamicMultiSelect`, `umamiEventName`, `umamiEventNames`, `umamiWebsite`, `customWidgetSelect`, `customWidgetConfiguration`, `integrationSelect`, `integrationMultiSelect`. Source: [mapping](../../packages/widgets/src/_inputs/index.ts), [factories](../../packages/widgets/src/options.ts).

Do not port these as merely static dropdowns. City lookup, app selection, Anchor notes, Docker endpoints, storage volumes, Beszel systems, Immich albums, Umami websites/event names, Stats catalog/entries, release repository secrets and Custom JSX definition/configuration have real data/permission/version dependencies. Source consumers live in [inputs](../../packages/widgets/src/_inputs), [widget-integration-select.tsx](../../packages/widgets/src/widget-integration-select.tsx), and the definition directories above.

The editor supports embedded app and integration forms, saving dirty resource forms before committing the widget; failed resource saves keep the appropriate tab open. App editing uses app-modify permission; integration forms require full access; Custom JSX configuration is admin-only. Preview has Integration/Spotlight and optional wrapper providers, measured/resizable/scaled card geometry, inert interaction, error reset, live options, and real or undefined item/board IDs. Keep preview authorization separate from saved placement authorization; inert DOM does not prevent mounted queries. Source: [widget-edit-modal.tsx](../../packages/widgets/src/modals/widget-edit-modal.tsx), [lazy-widget-edit-modal.tsx](../../apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx).

## 4. Per-kind data, actions, rendering and acceptance

Procedure names below are current production tRPC identities, **not chosen oRPC method names**. `w.` abbreviates `widget.`. Each row inherits the classification and linked source directory in §3, shared acceptance in §2, refresh policy above and integration policy in §5. Queries listed include local subcomponents; selector-only/support reads are identified where significant. Server authorities are [widget router](../../packages/api/src/router/widgets/index.ts) and its named files, [app router](../../packages/api/src/router/app.ts), Docker router and [request handlers](../../packages/request-handler/src). A data action is not assumed available simply because a widget renders a button.

| Kind | Actual reads / writes / local behavior | Target acceptance beyond shared contract |
| --- | --- | --- |
| clock | Local current-time/world-clock state; optional `w.weather.atLocation` | Hydration-safe placeholder, timezone fallback, format/date and second tick behavior, advanced city list, weather location/unit/day-night colors. |
| airQuality | `w.airQuality.atLocation` | Standard/locale-dependent AQI, UV/pollutants/pollen and compact/advanced charts, null/missing observations, location-scoped refresh. |
| countdown | Local events/time, browser alert preferences and dedup | Yearly recurrence, timezones, seconds/progress, occurrence dedup, version-2 preferences; no server cron inferred. |
| timer | Local version-3 runtime/storage, browser sound/notification/history | Timer/Pomodoro transitions, auto-start preferences, per-board/item storage keys, cross-tab/storage-failure behavior and focus continuity; no remote query needed. |
| app | `app.byId`, `w.app.ping`; app/bookmark server prefetch | Authorized link/icon/description/layout and edit inertness, settings-dependent ping defaults, background ping status; populated initial HTML if retained rendering policy requires it. |
| assistant | Renderer injected by Assistant context; fallback component is not the feature | Port provider/renderer linkage to real chat runtime; chat/tools/uploads/auth/stream acceptance belongs to extended-features, not the 32-line fallback. Source: [assistant context](../../packages/widgets/src/assistant/context.tsx), [app Assistant implementation](../../apps/nextjs/src/components/assistant). |
| archiveTeamWarrior | `w.archiveTeamWarrior.getStatus` suspense read | Broadcast toggle, worker/project/task/progress presentation, advanced view, suspense/error parity and upstream partial failure. |
| anchorNote | `w.anchorNotes.getNote`, `updateNote`; note selector | Read/display title/update time and browser editor, Homarr interact plus upstream owner/editor permission, draft retained on ordinary failure and forbidden access rechecked. |
| notebook | Saved HTML content option; `w.notebook.updateContent` | Tiptap extensions/content round-trip, toolbar and local draft/error state, board modify checks; permission-gated read-only checkbox writes remain scoped to saved item. |
| iframe | Browser iframe, no widget RPC | Preserve URL, sandbox/Permissions Policy and every opt-in capability, scrolling/fullscreen, edit-mode inertness; SSR must not weaken embed policy. |
| video | Browser Video.js feed player, no widget RPC | Initialize/dispose exactly once per active lifecycle; autoplay/mute/controls/feed change, resize and edit-mode behavior without duplicate media playback. |
| dnsHoleSummary | `w.dnsHole.summary` | Multi-provider partial results, layout and Pi-hole colors, 10s shared query and per-item refresh isolation. |
| dnsHoleControls | Summary; `w.dnsHole.enable/disable` with invalidation | Per-integration/all toggles and disable duration, interact permission, pending/errors, refresh shared summary after mutation. |
| smartHome-entityState | `w.smartHome.entityDetails`, `switchEntity` | Dynamic entity selector/unit/label/state, clickable interaction permission, invalidation and advanced display; live state backend TTL is zero. |
| smartHome-executeAutomation | `w.smartHome.executeAutomation` | Automation selector, one-integration constraint, label/advanced controls, interact authorization and success/error feedback; no invented periodic read. |
| stockPrice | `w.stockPrice.getPriceHistory` | Symbol/range/interval exact keys, chart/details/advanced rendering and source errors; root no polling preserved. |
| mediaServer | `w.mediaServer.getCurrentStreams` | Playing filter, artwork/progress/bitrate/location/advanced data, provider-specific stream differences and 10s refresh. |
| calendar | `w.calendar.findAllEvents`, dynamic month navigation | Exact month/year/release types/unmonitored keys, event sources and past/future filtering, optional-integration empty state and timezone-safe initial month. |
| downloads | `w.downloads.getJobsAndStatuses`; bulk/item pause/resume, `deleteItem`; option-layout save | Queue/history/status, SAB archived history/window, categories/ratio/completion filters, **KiB/s** stored threshold, persistent columns/sort, selection/clipboard/context menus, interact checks and disk-delete confirmation. |
| mediaRequests-requestList | `w.mediaRequests.getLatestRequests`, `answerRequest` | Status/recent-days filters, request details/media links/new-tab preference and approval/denial permission/pending/invalidation. |
| mediaRequests-requestStats | `w.mediaRequests.getStats` | Preserve counts/partial-provider errors; zero options still requires a data and integration contract. |
| mediaMissing | `w.mediaOrganizer.getData`, pagination | Missing/queued filtering, page-size and runtime page keys, advanced list/detail links and upstream results. |
| networkControllerSummary | `w.networkController.summary` | Network/client/device health/statistics and advanced view; root no polling does not erase manual refresh. |
| networkControllerStatus | Same summary, selected `content` | Correct selected status field, compact/advanced display, partial failures and shared query reuse. |
| rssFeed | `w.rssFeed.getFeeds` | Feed aggregation/limit, sanitization/RTL/image/description clamp, empty and redacted failure behavior; saved-URL/permission policy cannot move to browser. |
| bookmarks | `app.byIds`, editor `app.selectable`, local groups | App-backed and direct URL migration, sortable generic `items`, custom URLs/groups/reordering, layouts/link target, local collapsed groups and initial HTML/hydration. |
| bazarr | `w.bazarr.getBadges` | Missing movie/episode and health/provider badges, option visibility and advanced presentation, one integration. |
| indexerManager | `w.indexerManager.getIndexersStatus`, `testAllIndexers` | Health table/links and runtime test-all action, interact permission, pending test feedback and no automatic polling. |
| healthMonitoring | `integration.byIds`, `w.healthMonitoring.getSystemHealthStatus/getClusterHealthStatus` | General-system vs cluster capability selection, temperature/unit formatting, volumes/cluster sections, tabs and advanced layout; do not call unsupported capability on every integration. |
| mediaTranscoding | `w.mediaTranscoding.getDataAsync` | Tdarr stats/queue/workers/default view, layout-derived pagination and advanced view; declared queuePageSize discrepancy requires explicit decision. |
| minecraftServerStatus | `w.minecraft.getServerStatus` | Java/Bedrock domain/title/status semantics, errors and manual refresh; backend connection logic remains server-side. |
| dockerContainers | `docker.getContainers/getEndpoints/refreshInventory`, Docker action/log/add-app modals, option save | Endpoint selection, row sorting/filter modes/wildcards, column persistence, inspect/log/start/stop-style actions and add-to-Homarr flow keep original endpoint permissions and confirmations. Shared supporting queries stay live. |
| releases | Dynamic query array of `w.releases.getLatest`; repository/secrets selector | Per-repository keys, age/highlight/detail/icon/top sorting and advanced presentation; tokens only for saved authorized repositories, no token in client graph. |
| firewall | `w.firewall.getFirewallCpuStatus/getFirewallInterfacesStatus/getFirewallMemoryStatus/getFirewallVersionStatus` | Four independent data consumers, interfaces/resource/version presentation and advanced view, 10s shared policy and failure isolation. |
| notifications | `w.notifications.getNotifications/deleteNotification` | Message format/logos, provider aggregation/detail/advanced presentation, deletion interact permission and invalidation. |
| mediaReleases | `w.mediaRelease.getMediaReleases` | Poster/layout/type/source/description tooltip and advanced list; backend stale fallback and no-poll policy. |
| systemResources | `w.healthMonitoring.getSystemHealthStatus` | Visible charts/shadows/labels, unit histories and advanced view, shared health data without duplicate upstream calls. |
| coolify | `w.coolify.getInstancesInfo` | Servers/apps/services toggles and advanced resource status, correct grouping/links and integration partial failure. |
| systemDisks | `w.healthMonitoring.getSystemHealthStatus`; dynamic volume selection | Temperature availability, display/background/volume filters and advanced detail; provider volume IDs remain meaningful. |
| timetable | `w.timetable.getTimetable/searchStations` | Custom base URL/station selector, departures and advanced view, saved-item/preview authorization and fresh public-address DNS pinning. |
| immich-serverStats | `w.immich.getServerStats`; shared/editor `getAlbums` | Users/photo/video/storage options, advanced stats, one integration and no-poll policy. Shared parent-directory helpers do not imply albums render in this stats card. |
| immich-albumCarousel | `w.immich.getAlbum/getAlbumPreview`, selector `getAlbums` | All-photos vs selected album, preview/full result keys, randomized order, interval/photo metadata, runtime previous/next/slideshow, media delivery authorization and advanced view. |
| stats | Dynamic `w.stats.catalog/snapshot` queries grouped per integration | Durable entries/metric selectors, cards/table/plain/rows/icon/spacing, composite and per-source failures, 60s snapshot policy, registered refresh/status actions and retry cooldown. |
| paperlessNgx | `w.paperlessNgx.getStats` | Inbox ratio/ring and totals/count toggles, compact missing-data/error behavior, one integration, no scheduled polling. |
| patchmon | `w.patchmon.getStats` | Protected-session read, compliance/updates/security/repo/OS displays, custom threshold modes/ordering validated by super-refine, advanced view; do not accidentally expose as anonymous public data. |
| tracearr | `w.tracearr.getDashboard` | Streams/stats/recent activity/violations, advanced details and 10s refresh with partial errors. |
| speedtestTracker | `w.speedtestTracker.getDashboard` | Latest/statistics/history/ping graph, times and units, no scheduled polling. |
| uptimeKuma | `w.uptimeKuma.getDashboard` | Average/ring/total/up/down/paused monitor displays, advanced view and provider errors. |
| audioStats | `w.audioStats.getStats`, advanced `w.mediaServer.getCurrentStreams` where supported | Navidrome/Audiobookshelf differences, listening/library/media metrics and compact mode, additional advanced streams and provider-specific availability. |
| umami | `w.umami.getVisitorStats/getActiveVisitors/getMultiEventTimeSeries/getTopPages/getTopReferrers`; website/events selectors | View-mode-dependent query set, exact website/timeframe/event keys, chart style/type/multi-event/top count, advanced view and explicit 60s polling. |
| vpn | `w.vpn.getSummaries` | VPN public status summary/provider errors, zero-option configuration, no scheduled polling and no credential leakage. |
| ups | `w.ups.getSummaries` | Battery/load/voltage choices, advanced health detail, unit formatting and partial provider results. |
| beszelSystemTable | `w.beszel.getSystems`, option-layout save, shared drill-down stats | Filters/sort/metric columns, hidden/order/width persistence, row-detail historical/live views, integration-scoped system identity and cleanup. |
| beszelSystemGrid | `w.beszel.getSystems`, shared drill-down stats | Filters/metric tiles/detail views, no advanced-focus flag despite drill-down feature, shared live lifecycle cleanup. |
| beszelAlerts | `w.beszel.getAlerts` | Active/history choice, bounded history count and integration-specific partial failure. |
| beszelSystemStats | `w.beszel.getSystems/getSystemStats`, `subscribeSystemStats`, option selection save | Legacy/qualified system resolution, period and Docker metrics, optimistic selection rollback, historical 5s vs live SSE, bounded buffers, hide/reopen/abort/error cleanup. |
| traefik | `w.traefik.getDashboard` | HTTP/TCP/UDP and entry-point switches, advanced routing metrics, links/formatting and provider failures. |
| customApi | `w.customApi.getData`; Custom JSX display also named queries/actions | Saved-item authorization/configuration version/terminal states, option polling, browser interpreter linkage, removal/admin migration links. Full request manifest/confirmation/source/secret/runtime security stays with extended-features owner. |
| weather | `w.weather.atLocation` | Coordinates, temperature/speed units, decimals/icons/date/city/humidity/wind/forecast count, compact/advanced views and 600s polling. |
| wud | `w.wud.getStats` suspense read | Title/ring/layout/update-list and advanced details, one integration, suspense/retry and root no-poll semantics. |
| llamacpp | `w.llamacpp.getStats` | Model/context/cache/speed/requests/tokens/speculative metrics, advanced view and 5s refresh. |
| wazuhAgents | `w.wazuh.getAgents` | Status/sort/version/groups, table results and 60s polling; repair/decide query ownership gap. |
| wazuhAlerts | `w.wazuh.getAlerts` | Level/hours/limit/MITRE/agent/source-IP/rule options, time formatting and 60s polling; same ownership gap. |
| wazuhSummary | `w.wazuh.getSummary` | Range/trend/footer and 60s polling; same ownership gap. |
| wazuhTimeline | `w.wazuh.getTimeline` | Range/bucket interval/chart/log-or-linear scale/level/legend, dynamic 60s or 300s polling and exact key; same ownership gap. |
| wazuhTopList | `w.wazuh.getTopList` | Kind/range/limit/level/bar choices and 120s polling; same ownership gap. |
| wazuhVulnerabilities | `w.wazuh.getVulnerabilities` | CVE ordering/severity/CVE and agent limits/agent visibility, 300s polling; same ownership gap. |
| wazuhFim | `w.wazuh.getFim` | Range/event/limit/registry inclusion and 60s polling; same ownership gap. |
| wazuhAuthFailures | `w.wazuh.getAuthFailures` | Hours/limit/source-IP visibility and 60s polling; same ownership gap. |

## 5. Integration, server cache, background and security dependencies

### Integration selection is also a server trust boundary

Authoritative mapping: [widget-integration-map.ts](../../packages/definitions/src/widget-integration-map.ts), `widgetIntegrationConfigs`, `getWidgetIntegrationIssue`; categories resolve from [integration.ts](../../packages/definitions/src/integration.ts). Preserve use/interact/full-access distinctions and unsupported/required/incompatible/limit failures, not just selector presentation. All mapped widgets require integrations **except calendar**. Unmapped kinds cannot accept arbitrary integrations. One-instance limits apply to smart-home pair, mediaTranscoding, both Immich kinds, Paperless, PatchMon, Bazarr, AudioStats, Umami, Warrior, Anchor, WUD, llama.cpp and all eight Wazuh kinds. Others have no finite limit in this mapping.

| Widget family | Actual supported integration kinds |
| --- | --- |
| Stats | All `integrationKinds` except `ical`; do not replace its metric catalog with a hard-coded subset |
| DNS summary/controls | piHole, adGuardHome, technitiumDns, mock |
| Smart-home pair | homeAssistant, mock |
| Media server | jellyfin, emby, plex, navidrome, mock |
| Calendar | sonarr, radarr, lidarr, readarr, homeAssistant, nextcloud, ical, mock; optional |
| Downloads | sabNzbd, nzbGet, deluge, transmission, qBittorrent, aria2, slskd, mock |
| Request list/stats | jellyseerr, seerr, overseerr, mock |
| Transcoding | tdarr, mock |
| Missing media | sonarr, radarr, bindery, mock |
| Network controller pair | unifiController, mock |
| Indexers | jackett, prowlarr, mock |
| HealthMonitoring | openmediavault, dashDot, truenas, unraid, glances, synology, proxmox, mock; system vs cluster split |
| SystemResources | openmediavault, dashDot, truenas, unraid, glances, synology, mock |
| SystemDisks | dashDot, openmediavault, truenas, unraid, synology, mock |
| Firewall | opnsense, mock |
| Notifications | nextcloud, ntfy, gotify, mock |
| Media releases | emby, jellyfin, plex, mock |
| Four Beszel kinds | beszel, mock |
| AudioStats | navidrome, audiobookshelf, mock |
| VPN / UPS | gluetun, mock / peaNut, mock |
| Coolify, Immich pair, Paperless, PatchMon, Bazarr, Tracearr, Speedtest, Uptime Kuma, Umami, Warrior, Anchor, Traefik, WUD, llama.cpp, Wazuh eight | Respectively coolify, immich, paperlessNgx, patchmon, bazarr, tracearr, speedtestTracker, uptimeKuma, umami, archiveTeamWarrior, anchor, traefik, wud, llamacpp, wazuh; each also supports mock |

Stats does not establish that every supported integration exposes every metric; preserve catalog/capability selection. Docker uses its endpoint system, not `widgetIntegrationConfigs`. Custom JSX binds sources through its own authorized definitions/placement contracts, not arbitrary widget integration IDs. General local widgets, weather/air/stocks/RSS/Minecraft/releases/timetable use local data, URLs or provider request handlers instead of ordinary selected-integration mapping.

### Backend/cache graph: mostly on-demand, not a cron rewrite

Most integration widget routers call reusable server request handlers, which call integration capability methods via the existing factory; transport replacement need not rewrite those clients. Default request-handler TTL is **10s**, deadline **60s**, bounded **1000 cache entries / 100 in-flight requests**, with shared coordination, settlement handling and optional stale fallback. Integration cache namespaces use Redis generations/locks and credential-revision fingerprints. Browser polling and backend TTL are different clocks. Sources: [request-handler.ts](../../packages/request-handler/src/lib/request-handler.ts), [integration-request-handler.ts](../../packages/request-handler/src/lib/integration-request-handler.ts), [shared-cache.ts](../../packages/request-handler/src/lib/shared-cache.ts), [widget-request-handler.ts](../../packages/request-handler/src/lib/widget-request-handler.ts), [integration factory](../../packages/integrations/src/base/creator.ts).

| Specialized dependency | Source / preservation obligation |
| --- | --- |
| Beszel historical stats, smart-home entity state | [beszel.ts](../../packages/request-handler/src/beszel.ts), [smart-home-entity-state.ts](../../packages/request-handler/src/smart-home-entity-state.ts): TTL zero; preserve uncached live-sensitive requests and actual upstream lifecycle. |
| Missing media | [media-organizer.ts](../../packages/request-handler/src/media-organizer.ts): 60s cache; consumer pagination must not accidentally share unrelated input data. |
| Requests / media releases | [media-request-list.ts](../../packages/request-handler/src/media-request-list.ts), [media-request-stats.ts](../../packages/request-handler/src/media-request-stats.ts): 60s with stale fallback; [media-release.ts](../../packages/request-handler/src/media-release.ts): 300s with stale fallback. |
| Weather / air quality | [weather.ts](../../packages/request-handler/src/weather.ts): 300s/deadline 10s; [air-quality.ts](../../packages/request-handler/src/air-quality.ts): 900s/stale 24h/deadline 10s. Preserve distinction between stale forecast data and fresh measurements. |
| Timetable | [timetable.ts](../../packages/request-handler/src/timetable.ts): station search 24h, departures 60s; URL policy/DNS pinning in [timetable-url.ts](../../packages/request-handler/src/timetable-url.ts). |
| Wazuh | [wazuh.ts](../../packages/request-handler/src/wazuh.ts): 60/120/300s families; query parameters and client refresh are not interchangeable cache scopes. |
| App ping | [app widget router](../../packages/api/src/router/widgets/app.ts), [ping job](../../packages/cron-jobs/src/jobs/ping.ts), [ping channels](../../packages/redis/src): explicit minute-based background job/Redis status; transport must preserve fanout/cache contract. |

No evidence establishes per-kind scheduled integration polling jobs for all widgets. Do not make cron migration a universal blocking dependency; the actual common blockers are API identity/ACLs, request-handler cache coordination, runtime initialization and specific live/background consumers. Persistence/background owner must reconcile jobs and process lifecycle; this note does not certify those runtimes under Nitro.

### Security boundaries that must survive porting

1. **Authorization before credential decryption and integration construction:** preserve middleware use/interact checks for both anonymous/public-board reads and authenticated actions; widget selection validation is not a substitute. Sources: [API middleware](../../packages/api/src/middlewares), [integration mapping](../../packages/definitions/src/widget-integration-map.ts), each [widget router](../../packages/api/src/router/widgets).
2. **Transport error mapping is security-relevant:** oRPC FORBIDDEN must clear cached widget data just as the tRPC provider does; session scope changes currently reload. Do not render stale authorized data after revocation or account switch. [query-cache.ts](../../packages/api/src/query-cache.ts), [query-state.ts](../../packages/widgets/src/common/query-state.ts), [provider](../../apps/nextjs/src/app/%5Blocale%5D/_client-providers/trpc.tsx).
3. **Mutation guards and durable ownership:** integration interact permission, board modify permission and item/board membership remain server checks, including downloads delete/disk delete, DNS controls, requests answering, notification deletion, smart-home controls, Docker actions and Notebook writes. `saveItemOptions` merges stored SuperJSON options only after ownership checks; custom placement changes require admin policy and timetable changes require URL policy. [options.ts](../../packages/api/src/router/widgets/options.ts), [notebook.ts](../../packages/api/src/router/widgets/notebook.ts), [widget routers](../../packages/api/src/router/widgets), [Docker router directory](../../packages/api/src/router/docker).
4. **Sensitive external URL/token reads:** timetable custom URL requires saved-widget view or authorized modifier preview plus fresh DNS/public-address pinning; RSS checks access to supplied/saved feeds and redacts failures; release provider tokens are applied only to saved authorized repositories. [timetable.ts](../../packages/api/src/router/widgets/timetable.ts), [RSS router](../../packages/api/src/router/widgets/rssFeed.ts), [releases.ts](../../packages/api/src/router/widgets/releases.ts), [widget-secrets.ts](../../packages/api/src/router/widgets/widget-secrets.ts).
5. **PatchMon is not universally anonymous:** `getStats` is protected; adopting a common public widget template must not widen it. [patchmon.ts](../../packages/api/src/router/widgets/patchmon.ts).
6. **Custom JSX linkage:** `resolvePlacedDefinitionAsync` validates item kind, board view, definition enabled/existence and configuration version/repair; named requests validate manifest kind, board permission, source binding, params, limits and confirmations, decrypting secrets only through authorized resolution. Placement and editor must keep admin boundaries. Runtime/authoring/Workshop/transfer/SSRF details are extended-features responsibilities, not delegated to browser code by this inventory. [custom-api.ts](../../packages/api/src/router/widgets/custom-api.ts), [custom-widget router](../../packages/api/src/router/custom-widget/custom-widget-router.ts), [custom placement access](../../packages/api/src/router/board/custom-widget-placement-access.ts).
7. **Browser/server module isolation:** Vite client graph must not include DB/Redis/integration factories/encryption/request handlers or `@homarr/api/server`. `@homarr/widgets` already separates server-prefetch export from browser manifest, but dependencies in its manifest do not themselves enforce graph isolation. Keep type-only contract imports and approved serializable DTOs. [package.json](../../packages/widgets/package.json), [server-prefetch.ts](../../packages/widgets/src/server-prefetch.ts), [registry.ts](../../packages/widgets/src/registry.ts).

## 6. Primary-source replacement evidence and limits

- Installed [@orpc/tanstack-query manifest](../../node_modules/@orpc/tanstack-query/package.json) is **2.0.0-beta.43**, with peer `@tanstack/query-core >=5.89.0`. Its [declarations](../../node_modules/@orpc/tanstack-query/dist/index.d.mts) expose query/mutation keys/options and streamed/live utilities. Public release copies: [exact declarations](https://unpkg.com/@orpc/tanstack-query@2.0.0-beta.43/dist/index.d.mts), [exact implementation](https://unpkg.com/@orpc/tanstack-query@2.0.0-beta.43/dist/index.mjs). These provide a plausible typed data seam, not tRPC key-shape or widget API compatibility.
- [Official TanStack Query integration](https://orpc.dev/docs/integrations/tanstack-query), [streaming](https://orpc.dev/docs/async-iterator-object), [client iterators](https://orpc.dev/docs/client/async-iterator-object), [error handling](https://orpc.dev/docs/error-handling) and [serializer](https://orpc.dev/docs/rpc/serializer), as release-checked in the [prior oRPC note](../Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md): query cancellation signals are forwarded, streamed accumulation differs from live replacement, v2 error shape and RPC serialization differ from tRPC/SuperJSON. Explicit adapters are needed for Homarr errors, state clearing, rich hydration and bounded subscriptions.
- [Nitro server entry](https://nitro.build/docs/server-entry) and [Fetch adapter](https://orpc.dev/docs/adapters/fetch-api) support the direct Fetch-handler seam, as established by the prior stack note. API access checks remain procedure/request-context responsibilities; not everything belongs in the catch-all renderer. SSR/prefetch must use request-scoped identity.
- A Beszel async iterator can be consumed through a new oRPC streaming client, but simply choosing `liveOptions` would discard previous records unless buffering is implemented; a streaming accumulator also needs bounded records and event-type separation. Source reality is the 60-record buffers and visibility reset in [use-live-stats.ts](../../packages/widgets/src/beszel/_shared/use-live-stats.ts), not a generic stream tutorial.
- React renderer/domain helpers, Mantine UI, chart/formatting code, Tiptap and Video.js are already dependencies in [widgets/package.json](../../packages/widgets/package.json). No new library adoption is required by this research; exact SSR/browser compatibility remains to be demonstrated by the implementation owner.
- Prior Context7 quota failures are already recorded; no repeated quota calls were used as evidence. No compiler or runtime checks were run. Installed prerelease presence and a bounded fixture do **not** prove all widgets, providers, editor inputs, streams, permissions or deployment targets work.

## 7. Independently demonstrable batches and exclusive ownership

Recommendation only: establish shared interfaces first, then migrate vertical slices without rewriting all integration clients. A worker can port renderers/options with typed DTO fixtures before endpoint implementations are finished; fixtures prove UI behavior only, not authorization/upstream parity. Central registration and provider changes remain single-writer.

| Batch / exclusive code owner | Scope and independent demonstration | Genuine dependencies; work possible before they finish |
| --- | --- | --- |
| W0 shared widget foundation, one owner | Registry/manifest/options exports, semantic query ownership, refresh/status/error policy, shared data hook surface | Agree oRPC query/error/session interface with AJN-510/AJN-511 and frontend services with AJN-509. Definitions/pure matchers/editor schema work can start read-only-contract-first; real cache/recovery acceptance cannot. |
| W1 local/browser widgets | Clock, countdown, timer, iframe, video; local state/lifecycle/compact+advanced demo | Dashboard item host and localization/settings. Port pure state/formatting/rendering first; Clock weather is an additional endpoint dependency. No universal integrations/cron blocker. |
| W2 populated links + notes | App, bookmarks, Notebook, Anchor | Dashboard owner owns board persistence/resource edits; endpoint/identity owners supply app/option/note contracts; ping background owner; Anchor integration owner. Can port lists/grouping/drafts/browser editor before server adapters. |
| W3 public-provider/URL widgets | Weather, air quality, stocks, RSS, releases, Minecraft, timetable | Endpoint/identity owners for saved URL/token policy; localization and media delivery. Pure charts/formatting first; real external URL/secret acceptance waits for policies, not all integration rewrites. |
| W4 interactive integration controls | DNS pair, smart-home pair, downloads, request list/stats, indexers, notifications, Docker | Integration capability/DTO contracts, endpoint mutations/invalidation, identity interact/endpoint permissions; Docker shared modals also dashboard/app owner. Port UI/query adapters individually; destructive-action acceptance waits for server guards. |
| W5 media/application metrics | Media server/missing/releases/transcoding, calendar, Bazarr, Immich pair, Warrior, Coolify, Paperless, PatchMon, Tracearr, Speedtest, Uptime Kuma, AudioStats, WUD | Respective endpoint/integration slices, option selectors and image/media delivery; protected PatchMon identity; calendar/timezone and media units. No need to wait for all other metrics families. |
| W6 health/network/status | HealthMonitoring, system resources/disks, network controller pair, firewall, VPN, UPS, Traefik, llama.cpp | Integration capabilities/system-vs-cluster DTOs, frontend unit formatters and selector endpoints. Charts/layout/filtering can proceed with agreed DTOs; endpoint authorization/cache acceptance later. |
| W7 dynamic query families | Stats, Umami, eight Wazuh kinds | Shared runtime semantic-query references and catalog selectors; respective endpoint contracts. Wazuh key mismatch decision and component override/demo policy are explicit gates, not optional cleanup. |
| W8 Beszel live boundary | Four Beszel kinds plus shared detail modal/chart/live hooks | AJN-510 async iterator/error/cancellation contract, identity authorization and persistence/runtime cleanup; system identity/discovery DTOs. Historical charts/selection port independently; production live acceptance waits for transport/proxy lifecycle checks. |
| W9 extended bridges | Assistant provider and `customApi` placement/editor/render bridge | Extended-features owner owns actual Assistant/Custom JSX runtime and security; widget owner integrates typed renderer/placement contracts. Neither copying fallback nor preview-only success closes this batch. |
| W10 shared picker/editor integration, one owner | 68 native choices + dynamic custom choices, 25 inputs, embedded resource forms, permissions, preview geometry | W0 definitions/loader/services; dashboard save/resize/resource forms; selectors per family; identity and extended configuration contracts. Individual static inputs can port first; resource forms/config-version acceptance waits for owning endpoints. |

Single-writer surfaces: `widgetKinds`/default sizes/integration map in definitions; widget module/component registries and shared exports; query policy/query-key-error adapter; root frontend provider tree; API root and any curated HTTP/MCP registrations; board item host and picker/editor wiring. Family workers own their directories and agreed contract/endpoint slice, submitting registration changes to those owners rather than racing on central files. W0/W10 can share one owner; API registrations belong to endpoint owner, dashboard registrations to dashboard owner.

### Exact cross-owner blocking edges

| Consumer → owner | Required handoff / blocking edge | Not a blocker for |
| --- | --- | --- |
| Widgets → dashboard-navigation local question | Stable per-item host/refs, grid dimensions/scale/focus lifecycle, board/edit-mode context, save/duplicate/remove/resize flows, app/bookmark resource edit forms and query updates | Pure widget renderer/definition/options work with an agreed prop contract |
| Widgets → AJN-510 endpoints-transports | Typed query/mutation identities/DTOs/inputs/errors, keys/options/invalidation, authenticated request caller, Beszel iterator cancellation; Docker/modal and Custom JSX named request consumers included | Local timers/embeds, mock DTO-based rendering, existing server request-handler reuse |
| Widgets → AJN-511 identity-administration | Session/integration/board permissions DTOs, anonymous/public-board rules, demo guards, forbidden clearing/session cache reset, protected PatchMon and action authorization | Pure formatting/layout; it **does** block claims of production-safe reads/actions |
| Widgets → AJN-509 localization-ui | Translation namespaces/catalogs and option labels/error maps, Intl locale/dates/numbers/units/timezones, settings/theme/modals/notifications/links/Spotlight APIs | Structural inventories and domain helpers; it blocks visual/locale/preview acceptance |
| Widgets → integrations local question | Existing integration factory/capability DTOs retained or adapted; selector and upstream quirks, cardinality/capability validation, media payload contracts | Component migration against stable DTOs; no requirement to rewrite every integration first |
| Widgets → AJN-508 persistence-background | Durable options/SuperJSON encoding/IDs retained, cache generations/locks/revision semantics, ping job/fanout, lifecycle cleanup and option-save ownership | Most renderer work and on-demand endpoint adapters; full job migration is **not** prerequisite for every kind |
| Widgets → extended-features local question | Real Assistant renderer/chat runtime; Custom JSX definition/configuration schema, browser interpreter, named requests/actions/confirmations, source and secret policy; shared authorized media delivery | Widget slot/loading/unavailable states and ordinary native kinds |
| All owners → coordinator/human | Rendering/SSR/hydration strategy, durable caching scope, error/permission contract and known-gap treatment reconciled into full parity spec | Research and isolated authorized contract work; not permission to choose production behavior unilaterally |

No research blocker remains. Runtime acceptance is unverified by design; shared interface/human decisions above are implementation blockers, not reasons to start experiments during this read-only assignment.

## 8. Acceptance ledger and open human decisions

Later authorized implementation should demonstrate each of the **69 kinds** against its §4 obligations, not merely show that all loader imports resolve. For each: new/default and existing stored options; eligible/ineligible/missing integrations; initial loading/empty/partial/stale/error/forbidden states; compact sizing/edit preview and advanced focus where enabled; manual refresh/recovery scoped to exact inputs; polling override/demo behavior; persistence across reload/navigation/focus; locale/unit/timezone formatting; action permission/pending/error/invalidation; cleanup on hide/unmount/account change. Record observed evidence per capability and the currently unsupported/unverified cases.

Cross-cutting acceptance requires:

1. Declared/loaded/rendered/option counts and dynamic Custom JSX discovery reconcile without losing durable kinds or saved placements.
2. Cold-load parallel chunks, failed-load retry and lazy editor keep widget/browser/server graphs separate; no secrets/server services in browser bundles.
3. App/bookmark initial HTML and selective prefetch match the chosen rendering strategy; no duplicate large album/chart hydration or request with a different consumer key. Infinite live streams are not hydrated as unresolved immortal prefetches.
4. Same-kind widgets with different inputs do not invalidate/clear each other; Wazuh ownership gap and Downloads archived-history prefetch gap have explicit decisions and regression evidence.
5. Permission revocation/session change clears sensitive data; anonymous view, authenticated interact, board modify, integration full and admin configuration remain distinct. Invalid URL/source/secret/placement attempts fail server-side.
6. Timer/countdown storage failure/cross-tab alerts, Notebook/Anchor draft saves, Video.js disposal, iframe policies, table flushes, Immich carousel focus continuity and Beszel bounded cancellation are exercised, not inferred from compilation.
7. Integration caches/locks/credential revisions and specific background ping/live dependencies retain semantics under the selected process/deployment layout.

Human/coordinator decisions still open:

- Full-product SSR vs client-shell/selective SSR, how request-local prefetch/hydration is expressed in TanStack Router, and whether current app/bookmark HTML behavior remains the minimum. Earlier rendering research is evidence, not a settled decision.
- Whether to retain current query-cache policy or deliberately change persistent/dashboard caching; no per-user browser data persistence should be inferred from prototype snapshots.
- Whether known behavior gaps (Wazuh ownership, Downloads prefetch inputs, ignored transcoding page-size option, local polling/demo overrides) are repaired during migration or recorded as explicit exclusions. Recommended: repair security/ownership gaps and require concrete parity evidence.
- Exact shared error/session/query-key contract, and the split between preserved domain services, oRPC transport and stream/media protocols. Framework names alone do not decide it.
- Final editor/provider ownership and the agreed Assistant/Custom JSX/media bridge boundaries. Detailed extended-feature runtime security remains with that research owner; no uncovered kind was found, but those app-owned feature implementations must be on the coordinator's feature ledger.

**Bottom line:** all 69 kinds are accounted for, with 372 direct options and 25 input types. Most feature code is reusable with adapters; the highest-leverage replacements are the tRPC-shaped query/refresh/error contract, request-local prefetch/hydration and provider/browser boundaries. The bounded fixture does not close any all-widget acceptance gate.
