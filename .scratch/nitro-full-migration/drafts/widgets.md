# Widget vertical-slice draft

Planning only; not published, approved, ready-for-agent, or permission to implement. Primary evidence: [completed widget inventory](../../../research_notes/Homarr%20full%20Nitro%20migration/widgets.md), especially its §§2–5 and 7–8. Read with [drafting contract](../TICKET-DRAFTING.md) and [open design interview](../DESIGN.md). Source procedure identities below identify capabilities, not required future oRPC names.

## Scope and dependency rules

**28 proposed tickets, 69 primary widget kinds, 372 direct option declarations, 25 editor input types.** More than 25 tickets is deliberate: downloads, Docker, Stats, Umami, PatchMon and Beszel live each warrant an isolated context; eight Wazuh consumers need two contexts. The research's interactive/media megabatches are not single implementation tasks. No separate catch-all widget ticket is needed.

Nitro is the sole application build gate. External APIs, URLs and serialization formats may change; old Next/tRPC compatibility is not an acceptance requirement. Stable content identity, capability meaning and explicit durable-content conversion remain required. Never modify real data, credentials or installations to demonstrate these slices. Focused new regressions for security, conversion and critical flows are authorized **at implementation time**, scoped and deferred to agreed runnable milestones; no broad suites, intermediate checks or full-repository typecheck. This draft runs none.

### Start prerequisites versus completion gates

- `FOUNDATION` means an agreed runnable Nitro host, request principal/policy/secret ports and feature registration, not every login provider.
- `BOARD-RUNTIME` means the agreed item props/refs/geometry/edit/focus/removal/option-save port. The board owner implements board repositories, grid, route/editor opening and app resource forms. Widgets do not duplicate those domains.
- `WIDGET-RUNTIME` owns common definitions/loader manifest, query ownership/policy, error/session adapter and widget exports. Its expansion is **an actual app widget with persisted options**, not a scaffolding-only ticket.
- `LOCALIZATION` owns frontend provider composition: QueryClient, locale/Intl/catalogs, settings/units/timezones, session facade, integration permissions, theme, modals, notifications, Spotlight, demo state and injected renderers. Widget tickets consume this facade; none writes a competing root provider.
- `INTEGRATION-RUNTIME` supplies permission-before-secret execution, capability/selection validation and reusable request-handler ports. Each ticket names only the integration families it consumes. A stable DTO fixture is enough to begin UI/options work; completion of unrelated providers is never a prerequisite.
- `PERSISTENCE` owns durable repositories/conversion/transactions; `COORDINATION` owns bounded caches, revisions/generations/coalescing/fanout and specific jobs. Browser intervals are not backend cache TTLs or evidence of cron jobs.
- `TRANSPORTS` owns Fetch/oRPC registration, request-local callers, DTO/error/serialization and iterator contracts. Feature owners own the named widget read/action semantics and consumers, handing registrations to this single writer. Integration owners alone own external protocol/client implementations.
- `IDENTITY` production session/auth implementation gates production acceptance, not fixture-first migration against the agreed principal/policy interface. Distinguish anonymous board view, authenticated session, integration use/interact/full, board modify and admin configuration.
- `ASSETS` owns safe icon/image/media contracts; extended-feature owners own Assistant, Custom JSX interpreter/authoring/workbench/Workshop, source/secret resolution and operational tools. Widget tickets own only specified placement/render/editor bridges and their widget-local interaction wiring.

**Common start rule:** except where stated, a family ticket can start immediately after agreement on its DTO/error/option/host contracts, with an isolated host and typed fixtures. No completed peer ticket, full identity rollout, full integration rollout or universal job migration is a start blocker. Shared host/registry/editor integration and named real server adapters are **completion/release gates**, not excuses to serialize fixture work. Fixtures demonstrate UI/domain behavior only; they cannot close authorization, upstream, durability, streaming or hydration acceptance. Gate names below are reserved seams to reconcile with other drafts, not invented published issue IDs.

### One writer per shared surface

`WIDGET-RUNTIME` writes kind/default-size/integration metadata, loader/manifest/shared exports and common query/error/policy adapters; families submit declarative registration contributions. `WIDGET-EDITOR` writes the input dispatch map, shared editor shell/validation/preview composition and picker contributions. Family tickets own their option definitions, family inputs/adapters, local renderers and widget feature service/endpoint semantics. The board owner writes item host/picker opening/grid/resource UI; the localization owner writes root providers; transport owner writes route/API/MCP/stream registrations. Manifests, dependency versions and lockfile belong to the coordinator's one designated dependency writer. No family races on these files. Shared health data, table-layout primitives and Beszel detail/live helpers have owners specified below.

## Common completion obligations, inherited by every ticket

Each ticket's 3–6 checkboxes specialize these obligations rather than replacing them:

1. For every assigned kind and every ledger option, demonstrate default/new and converted stored values, literal defaults/enums/units/refinements/visibility and settings-dependent defaults; preserve false, zero and empty-string values via nullish fallback. Render compact sizing, edit preview and advanced focus only when supported. Zero-option definitions still need discovery/data/authorization.
2. Follow a complete saved-placement path: authorized service/repository or local/browser data engine → endpoint where needed → options/editor → renderer → interaction/refresh → scoped invalidation and persistence. Validate board/item membership, integration compatibility/required/min/max/cardinality and per-action policies server-side; preview with undefined IDs must have its own policy. Client inertness is not authorization.
3. Exercise initial pending, empty, partial, stale, ordinary failure, forbidden and retry states relevant to that feature. Retain useful stale data only on nonterminal errors; forbidden/revocation/account switch clears sensitive data and registrations. No browser import of server DB/cache/crypto/integration factories/request handlers or decrypted secrets.
4. Bind query identity to actual procedure plus exact inputs and actual query key, not tRPC array shape or a kind prefix. Manual refresh/recovery/status, cancellation, demo mode, effective polling overrides and mutation invalidation must isolate same-kind instances with different inputs. Preserve no-poll/manual-refresh distinctions. Shared successful mutations may intentionally invalidate authorized dependent consumers, never unrelated inputs.
5. Under the **still-pending rendering decision**, implement request-local authorized prefetch/hydration or explicit deterministic client pending states. Exact consumer keys, request identity and serializable DTOs must agree; no double fetch/dehydration, secret payload or infinite live-stream prefetch. Browser-only/chart/editor/media dependencies remain on approved client boundaries. Preserve state/refs across focus, resize, navigation or explicitly defined disposal; cleanup polls/listeners/players/streams on hide/unmount/session changes.
6. Demonstrate durable conversion and save/reload for the ticket's content/options; integrate through shared owners and record per-kind evidence at the agreed new-app milestone. Regression additions are focused security/data/critical-flow checks only. No claim of parity from import resolution, fixture screenshots or compilation alone.

## Primary kind and option ownership ledger

Each row assigns a kind and **all** its direct option declarations to exactly one ticket. Keys are the source vocabulary to preserve/convert, not a requirement to retain obsolete external formats. Counts include hidden/internal and generic declarations. The source modules remain authoritative for literal validation/defaults. Shared advanced title/classes/border and editor integration selection are common capabilities, not additional direct declarations counted in 372.

| Kind | Primary ticket | Options | Exhaustive direct keys |
| --- | --- | ---: | --- |
| app | WIDGET-RUNTIME | 6 | appId, openInNewTab, showTitle, descriptionDisplayMode, layout, pingEnabled |
| bookmarks | WIDGET-EDITOR | 15 | title, showTitle, titleSize, layout, variant, spacing, hideTitle, hideIcon, hideHostname, openNewTab, withBorder, grow, customUrls, groups, items |
| clock | WIDGET-TIME | 16 | customTitleToggle, customTitle, is24HourFormat, useCustomTimezone, timezone, showDate, dateFormat, customTimeFormat, showWeather, weatherLocation, isWeatherFormatFahrenheit, animateWeatherIcon, colorWeatherByDayNight, dayWeatherColor, nightWeatherColor, worldClockCities |
| countdown | WIDGET-TIME | 3 | events, showProgress, showSeconds |
| timer | WIDGET-TIME | 8 | mode, timerMinutes, focusMinutes, shortBreakMinutes, longBreakMinutes, sessionsBeforeLongBreak, autoStartBreaks, autoStartFocus |
| iframe | WIDGET-EMBEDS | 9 | embedUrl, allowFullScreen, allowScrolling, allowPayment, allowAutoPlay, allowMicrophone, allowCamera, allowGeolocation, allowModals |
| video | WIDGET-EMBEDS | 4 | feedUrl, hasAutoPlay, isMuted, hasControls |
| notebook | WIDGET-NOTES | 3 | showToolbar, allowReadOnlyCheck, content |
| anchorNote | WIDGET-NOTES | 3 | noteId, showTitle, showUpdatedAt |
| weather | WIDGET-ENVIRONMENT | 11 | isFormatFahrenheit, disableTemperatureDecimals, animateIcons, showHumidity, showCurrentWindSpeed, useImperialSpeed, location, dateFormat, showCity, hasForecast, forecastDayCount |
| airQuality | WIDGET-ENVIRONMENT | 5 | location, aqiStandard, showUv, showPollutants, showPollen |
| stockPrice | WIDGET-ENVIRONMENT | 4 | stock, timeRange, timeInterval, showDetails |
| rssFeed | WIDGET-FEEDS-RELEASES | 7 | feedUrls, enableRtl, textLinesClamp, descriptionMaxLength, maximumAmountPosts, hideDescription, showPosterImage |
| releases | WIDGET-FEEDS-RELEASES | 7 | newReleaseWithin, staleReleaseWithin, showOnlyHighlighted, showDetails, showOnlyIcon, topReleases, repositories |
| minecraftServerStatus | WIDGET-STANDALONE-LOOKUPS | 3 | title, domain, isBedrockServer |
| timetable | WIDGET-STANDALONE-LOOKUPS | 2 | baseUrl, station |
| dnsHoleSummary | WIDGET-HOME-CONTROLS | 2 | usePiHoleColors, layout |
| dnsHoleControls | WIDGET-HOME-CONTROLS | 1 | showToggleAllButtons |
| smartHome-entityState | WIDGET-HOME-CONTROLS | 4 | entityId, displayName, entityUnit, clickable |
| smartHome-executeAutomation | WIDGET-HOME-CONTROLS | 2 | displayName, automationId |
| downloads | WIDGET-DOWNLOADS | 15 | columns, defaultSort, descendingDefaultSort, showCompletedUsenet, showCompletedTorrent, showCompletedHttp, includeArchivedHistory, historyWindowDays, activeTorrentThreshold, categoryFilter, filterIsWhitelist, applyFilterToRatio, limitPerIntegration, columnOrder, columnWidths |
| mediaRequests-requestList | WIDGET-REQUESTS-NOTIFICATIONS | 3 | linksTargetNewTab, statusFilter, recentDays |
| mediaRequests-requestStats | WIDGET-REQUESTS-NOTIFICATIONS | 0 | none |
| indexerManager | WIDGET-REQUESTS-NOTIFICATIONS | 1 | openIndexerSiteInNewTab |
| notifications | WIDGET-REQUESTS-NOTIFICATIONS | 2 | hideLogos, messageFormat |
| dockerContainers | WIDGET-DOCKER | 11 | endpointIds, columns, enableRowSorting, defaultSort, descendingDefaultSort, containerFilter, filterIsWhitelist, filterCaseSensitive, filterAllowWildcards, columnOrder, columnWidths |
| mediaServer | WIDGET-PLAYBACK-AUDIO | 3 | showOnlyPlaying, showBitrate, showLocation |
| audioStats | WIDGET-PLAYBACK-AUDIO | 9 | showArtists, showAlbums, showSongs, showLibraryCount, showAudiobooks, showPodcasts, showListeningTime, showActiveSessions, compactMode |
| tracearr | WIDGET-PLAYBACK-AUDIO | 4 | showStreams, showStats, showRecentActivity, showViolations |
| calendar | WIDGET-MEDIA-DISCOVERY | 4 | releaseType, filterPastMonths, filterFutureMonths, showUnmonitored |
| mediaMissing | WIDGET-MEDIA-DISCOVERY | 3 | showMissing, showQueued, pageSize |
| mediaReleases | WIDGET-MEDIA-DISCOVERY | 4 | layout, showDescriptionTooltip, showType, showSource |
| bazarr | WIDGET-MEDIA-JOBS | 4 | showMissingEpisodes, showMissingMovies, showProviderIssues, showHealthIssues |
| mediaTranscoding | WIDGET-MEDIA-JOBS | 2 | defaultView, queuePageSize |
| archiveTeamWarrior | WIDGET-MEDIA-JOBS | 1 | showBroadcastMessage |
| immich-serverStats | WIDGET-IMMICH | 4 | showUsers, showPhotos, showVideos, showStorage |
| immich-albumCarousel | WIDGET-IMMICH | 4 | albumId, rotationIntervalSeconds, showPhotoInfo, randomizePhotos |
| healthMonitoring | WIDGET-HEALTH | 10 | fahrenheit, cpu, memory, gpu, showUptime, fileSystem, visibleStorageVolumes, visibleClusterSections, defaultTab, sectionIndicatorRequirement |
| systemResources | WIDGET-HEALTH | 3 | hasShadow, visibleCharts, labelDisplayMode |
| systemDisks | WIDGET-HEALTH | 4 | showTemperatureIfAvailable, displayMode, showBackgroundBar, visibleStorageVolumes |
| networkControllerSummary | WIDGET-NETWORK | 0 | none |
| networkControllerStatus | WIDGET-NETWORK | 1 | content |
| firewall | WIDGET-NETWORK | 0 | none |
| vpn | WIDGET-NETWORK | 0 | none |
| ups | WIDGET-NETWORK | 3 | showBattery, showLoad, showVoltage |
| traefik | WIDGET-NETWORK | 3 | showTcp, showUdp, showEntryPoints |
| coolify | WIDGET-SERVICE-CARDS | 3 | showServers, showApplications, showServices |
| paperlessNgx | WIDGET-SERVICE-CARDS | 7 | showInboxRatio, showInboxRing, showDocumentsTotal, showDocumentsInbox, showCorrespondents, showTags, showDocumentTypes |
| uptimeKuma | WIDGET-SERVICE-CARDS | 6 | showAverageUptime, showUptimeRing, showTotalMonitors, showUpCount, showDownCount, showPausedCount |
| wud | WIDGET-SERVICE-CARDS | 4 | showTitle, showRing, layout, showUpdateList |
| patchmon | WIDGET-PATCHMON | 30 | showComplianceHero, showTotalHosts, showHostsNeedingUpdates, showSecurityUpdates, showUpToDateHosts, showHostsWithSecurityUpdates, showRecentUpdates24h, showTotalOutdatedPackages, showTotalRepos, enableThresholdColors, useCustomThresholds, hostsNeedingUpdatesThresholdMode, hostsNeedingUpdatesWarningAt, hostsNeedingUpdatesCriticalAt, securityUpdatesThresholdMode, securityUpdatesWarningAt, securityUpdatesCriticalAt, hostsWithSecurityUpdatesThresholdMode, hostsWithSecurityUpdatesWarningAt, hostsWithSecurityUpdatesCriticalAt, upToDateHostsThresholdMode, upToDateHostsWarningAt, upToDateHostsCriticalAt, totalOutdatedPackagesThresholdMode, totalOutdatedPackagesWarningAt, totalOutdatedPackagesCriticalAt, showOsDistribution, osDisplayMode, osDistributionLimit, showOsVersion |
| speedtestTracker | WIDGET-PERFORMANCE | 4 | showLatestResult, showStats, showRecentResults, showPingGraph |
| llamacpp | WIDGET-PERFORMANCE | 7 | showModelInfo, showContextUsage, showCacheHitRate, showSpeedStats, showRequests, showTokenStats, showSpeculative |
| stats | WIDGET-STATS | 6 | entries, table, rows, plain, showIcon, spacing |
| umami | WIDGET-UMAMI | 8 | websiteId, timeFrame, viewMode, chartType, chartStyle, eventName, eventNames, topCount |
| beszelSystemTable | WIDGET-BESZEL-INVENTORY | 16 | statusFilter, sortBy, sortDirection, showCpu, showMemory, showDisk, showGpu, showLoadAvg, showNet, showTemp, showBattery, showServices, showUptime, showAgent, columnOrder, columnWidths |
| beszelSystemGrid | WIDGET-BESZEL-INVENTORY | 12 | statusFilter, showCpu, showMemory, showDisk, showGpu, showLoadAvg, showNet, showTemp, showBattery, showServices, showUptime, showAgent |
| beszelAlerts | WIDGET-BESZEL-INVENTORY | 2 | showHistory, maxHistoryItems |
| beszelSystemStats | WIDGET-BESZEL-LIVE | 13 | systemId, timePeriod, showCpu, showMemory, showDisk, showDiskIO, showNetwork, showGpuUsage, showGpuMemory, showGpuPower, showDockerCpu, showDockerMemory, showDockerNetwork |
| wazuhAgents | WIDGET-WAZUH-RECORDS | 4 | statusFilter, sortBy, showVersion, showGroups |
| wazuhAlerts | WIDGET-WAZUH-RECORDS | 7 | minLevel, hours, limit, showMitre, showAgent, showSourceIp, showRuleId |
| wazuhSummary | WIDGET-WAZUH-RECORDS | 3 | range, showTrend, showFooter |
| wazuhFim | WIDGET-WAZUH-RECORDS | 4 | range, event, limit, includeRegistry |
| wazuhAuthFailures | WIDGET-WAZUH-RECORDS | 3 | hours, limit, showSourceIps |
| wazuhTimeline | WIDGET-WAZUH-ANALYTICS | 6 | range, interval, chartType, yScale, minLevel, showLegend |
| wazuhTopList | WIDGET-WAZUH-ANALYTICS | 5 | kind, range, limit, minLevel, showBars |
| wazuhVulnerabilities | WIDGET-WAZUH-ANALYTICS | 5 | cveOrder, minSeverity, cveLimit, agentLimit, showAgents |
| assistant | WIDGET-EXTENDED-BRIDGES | 0 | none |
| customApi | WIDGET-EXTENDED-BRIDGES | 4 | definitionId, configuration, configurationVersion, refreshInterval |
| **Total** | **28 primary tickets** | **372** | **69 distinct kinds; no unassigned or multiply assigned kind** |

## Input-type primary delivery ledger

All 25 dispatch kinds have one primary behavioral ticket. `WIDGET-EDITOR` remains the single dispatch-map/editor composition writer; that wiring is a consumer edge, not a second implementation owner. A family's reuse of another ticket's input does not create a second primary owner or gate fixture rendering on the whole editor.

| Input type | Primary ticket | End-to-end demonstration |
| --- | --- | --- |
| app | WIDGET-RUNTIME | Authorized app selector → appId save → app card; embedded app form handoff |
| switch | WIDGET-RUNTIME | False-valued showTitle/openInNewTab/ping options survive save/reload |
| select | WIDGET-RUNTIME | Validated layout/description mode → saved app presentation |
| text | WIDGET-EDITOR | Bookmark title including empty string → persisted display |
| slider | WIDGET-EDITOR | Validated titleSize → resizable bookmark preview and saved view |
| internal | WIDGET-EDITOR | Hidden customUrls/groups retained and converted without exposing a generic editor |
| sortableItemList | WIDGET-EDITOR | App/direct-URL items resolve, reorder, group, save and reload |
| dateTimeEventList | WIDGET-TIME | Zoned/yearly event list with identifiers/refinement → countdown |
| timezoneList | WIDGET-TIME | Unique validated world-clock cities/presets → clock |
| number | WIDGET-TIME | Bounded duration input → saved timer/Pomodoro behavior; family consumers retain their units |
| anchorNote | WIDGET-NOTES | Permission-aware note lookup/selection → editable saved placement |
| location | WIDGET-ENVIRONMENT | City lookup/coordinates → saved weather/AQI query and display; Clock consumes |
| multiText | WIDGET-FEEDS-RELEASES | Feed array edit/validation → authorized aggregated feed |
| multiReleasesRepositories | WIDGET-FEEDS-RELEASES | Repository/secret references → authorized per-repository results, no token disclosure |
| dynamicSelect | WIDGET-STANDALONE-LOOKUPS | SearchStations with query/base URL/preview policy → saved timetable |
| multiSelect | WIDGET-DOWNLOADS | Columns and filters → persisted live queue; other family consumers reuse primitive |
| dynamicMultiSelect | WIDGET-DOCKER | Authorized endpoint inventory → endpointIds save → filtered container table |
| integrationMultiSelect | WIDGET-HEALTH | Capability-aware storage-volume list → saved disk/health selection |
| statsEntries | WIDGET-STATS | Catalog + typed metric/source entries → durable cards/table and grouped snapshots |
| umamiWebsite | WIDGET-UMAMI | Integration-authorized websites → dependent query selection |
| umamiEventName | WIDGET-UMAMI | Website-dependent single event → exact event query |
| umamiEventNames | WIDGET-UMAMI | Website-dependent multi-event selection → series/legend save |
| integrationSelect | WIDGET-BESZEL-LIVE | Qualified system choice → saved historical/live stats; Immich consumes for albums |
| customWidgetSelect | WIDGET-EXTENDED-BRIDGES | Enabled/selected definition discovery → authorized placement, retained missing/legacy states |
| customWidgetConfiguration | WIDGET-EXTENDED-BRIDGES | Admin versioned configuration → saved browser renderer; extended engine owns schema semantics |

Integration attachment picker (min/max/required/optional/use/full) is a shared editor/runtime capability, not another input type. Hidden fields, `OPTIONS_SUPER_REFINE`, multi-text arrays and dirty embedded resource forms are explicit editor obligations.

## Ticket drafts

### WIDGET-RUNTIME — A real saved app card on the expanded widget runtime

**Delivers:** select an authorized app, configure and save its six options, render its link/icon/description and status in the Nitro board, then reload or refresh it safely. This concrete card proves the common expansion.

**Coverage:** `app` (6 options); app/switch/select inputs; lazy registries, semantic query scope/actions/status, common error/session/refresh interfaces and definition reduction.

**Exclusive owner:** widget common runtime/metadata/exports and app renderer/service adapters. Root provider composition, app CRUD/forms, board repositories and ping job stay with their named owners.

**Start blockers:** agreed `FOUNDATION`, `BOARD-RUNTIME`, query/error/session and provider interfaces; no full-auth/all-provider completion. **Completion gates:** runnable foundation/board placement and option repository, authorized `app.byId` + `widget.app.ping`, `LOCALIZATION`, `ASSETS` icon contract, app resource owner and `COORDINATION` minute ping/fanout. Decision gates: rendering/hydration and effective query policy.

- [ ] Select/default/edit/save/reload all six options, including settings-derived pingEnabled and force-disable visibility; server rejects cross-board/item save and unauthorized app reads; links are inert in edit preview.
- [ ] Render link targets, icon, title, description modes and all layouts using real app data; background ping/status reaches this card through the named ping contract, without making ping a prerequisite for unrelated kinds.
- [ ] Load definition/component chunks independently and in parallel, deduplicate in-flight loads, evict rejected loads for retry and keep server services/secrets out of the client graph. Expand beside existing behavior only as useful for the new app; no old-Next build gate.
- [ ] Use actual query keys plus procedure/input identity for this card's app and ping queries; refresh/status/recovery and permission/session clearing are scoped and clean up their own registrations. Never assume tRPC key shape.
- [ ] Supply provider/SSR adapters through the central owners and prove request-local app hydration or the approved alternative, with no duplicate fetch or stale data from another account. The app option flow is runnable before claiming runtime expansion complete.

### WIDGET-EDITOR — Saved bookmark collections through the complete widget editor

**Delivers:** add, configure, reorder, group and reload app-backed/direct bookmarks using a definition-driven editor and correctly authorized live preview; exposes native/custom widget choices as families register.

**Coverage:** `bookmarks` (15 options); text/slider/internal/sortableItemList inputs; shared schema/refinement/advanced fields, integration picker, embedded resource forms and preview. Dispatch integration covers all 25 input types via the primary owners above.

**Exclusive owner:** bookmark renderer/collection adapters and common input dispatch/editor shell/preview composition. Board owner owns board mutations, picker opening and app forms; integration owner owns integration forms/services; family owners contribute definitions/input implementations.

**Start blockers:** agreed editor/board/resource/provider contracts, not all family implementations. **Completion gates:** WIDGET-RUNTIME common loader/data/option contracts; `BOARD-RUNTIME` save/geometry, `app.byIds/selectable`, `LOCALIZATION` providers and app/integration resource forms. Full 68-native-plus-dynamic-choice/25-input reconciliation is a release gate consuming all family contributions, not a start blocker for them.

- [ ] Persist every bookmark option, direct URL/app references, generic sortable items, groups/customUrls conversion and collapsed-group behavior; authorized app batch lookup supports saved and preview instances and the selected initial HTML/hydration policy.
- [ ] Assemble declared validations, visibility, defaults, integration cardinality and `OPTIONS_SUPER_REFINE`; preserve false/zero/empty strings, hidden internal fields and advanced title/classes/border. Server option validation policy must be decided explicitly rather than assuming the old editor proves server validation.
- [ ] Save dirty embedded app/integration forms before placement options, keep the failed resource tab/draft open and enforce app modify/integration full permissions. Custom configuration and timetable previews retain their special policy hooks.
- [ ] Show measured/resizable/scaled, optionally wrapped, inert previews with real or undefined IDs; provider/Spotlight/integration context, live option changes and error reset work without granting mounted preview queries saved-item access.
- [ ] Reconcile exactly 68 native choices plus dynamic Custom JSX definitions and all 25 input dispatch kinds; disabled/missing/legacy definitions are explicit states, not dropped kinds. Register family inputs through the one writer and demonstrate bookmark focus/refresh and list persistence without duplicate queries.

### WIDGET-TIME — Clocks, recurring countdowns and durable timer sessions

**Delivers:** configure world clocks, event countdowns and Timer/Pomodoro sessions that survive focus, browser reload and navigation with correct time/unit preferences.

**Coverage:** `clock`, `countdown`, `timer` (27 options); dateTimeEventList/timezoneList/number input behavior. **Exclusive owner:** these three widgets' local state/storage/formatting adapters and inputs; no background cron or notification provider implementation.

**Start blockers:** common contract agreement only. **Completion gates:** WIDGET-RUNTIME/editor registration, `BOARD-RUNTIME` stable item identity/focus, `LOCALIZATION` time/settings/browser notification facade, and WIDGET-ENVIRONMENT weather/location contract for Clock weather (not all integrations). Rendering decision gates deterministic clock hydration.

- [ ] Configure/save/reload all 27 options, validating event IDs, UTC/zones/yearly recurrence, city uniqueness/presets, timer durations and auto-start preferences; default and converted versioned values remain meaningful.
- [ ] Clock placeholder/timezone fallback, date/custom formats, second ticks, world-city advanced view and optional weather units/icons/day-night colors follow the approved hydration strategy and location-scoped weather refresh.
- [ ] Countdown progress/seconds and yearly/timezone occurrence behavior deduplicate browser alerts using preserved/converted version-2 preferences; do not invent a server cron requirement.
- [ ] Timer version-3 runtime/history, board/item storage keys, Pomodoro transitions, sound/notification choice, auto-start and storage failure/cross-tab handling work through resize/focus and unmount without duplicate timers or alerts.

### WIDGET-EMBEDS — Policy-safe iframe and single-lifecycle video cards

**Delivers:** saved external embeds and feed playback work in the browser with explicit permissions, safe preview and correct teardown.

**Coverage:** `iframe`, `video` (13 options). **Exclusive owner:** embed/player boundary and local lifecycle; media delivery services remain `ASSETS` where applicable.

**Start blockers:** common host/provider contract agreement. **Completion gates:** WIDGET-RUNTIME/editor, `BOARD-RUNTIME` option save/focus lifecycle; browser-only import and embed-policy decision. No integration or widget RPC dependency.

- [ ] Save/reload URL and all nine iframe/four video options; malformed/converted values receive explicit repair states and authorized board writes, not silent loss.
- [ ] Enforce iframe sandbox and Permissions Policy for fullscreen/scroll/payment/autoplay/microphone/camera/geolocation/modals; client/SSR and edit-mode inertness never weaken the policy.
- [ ] Initialize/dispose Video.js once per active lifecycle; feed replacement, mute/autoplay/controls, resizing/focus and hide/unmount avoid duplicate playback/observers and retain the intended state.
- [ ] Deterministic pending/browser-only loading, rejected load retry and player/network failures are visible; preserve independent preview/query absence and no invented polling or remote mutation.

### WIDGET-NOTES — Browser-only Notebook and authorized Anchor editing

**Delivers:** edit/reload HTML notes and selected upstream Anchor documents, retaining drafts when ordinary saves fail and respecting distinct read-only/interact permissions.

**Coverage:** `notebook`, `anchorNote` (6 options); anchorNote input. **Exclusive owner:** note widget editors, drafts and read/save service adapters. **Integration family gate:** `anchor` (+ mock), single integration; upstream document ownership/editor permission is separate from Homarr interact.

**Start blockers:** agreed browser editor/data/save contracts. **Completion gates:** WIDGET-RUNTIME/editor, board option/content repositories and principal policy, `LOCALIZATION`, Anchor client capability and `widget.anchorNotes.getNote/updateNote` plus selector, `widget.notebook.updateContent`. No complete auth rollout required to port the fixture.

- [ ] All six options and stored Notebook HTML/Tiptap extension content round-trip; toolbar/title/update-time visibility and selected note survive reload; browser-only editors never execute/import server-side.
- [ ] Notebook board-modify/content ownership guards and policy-gated read-only checkbox writes apply server-side to the saved item; inert preview cannot authorize writes.
- [ ] Anchor selector/read/update enforce Homarr use/interact and upstream owner/editor checks; retain ordinary-error drafts, reject forbidden writes and clear/recheck revoked document access.
- [ ] Save pending/error/retry/invalidation update only the affected note/options; focus/navigation does not discard unsaved drafts unexpectedly, and editor listeners/resources dispose cleanly.

### WIDGET-ENVIRONMENT — Location-aware weather/AQI and stock charts

**Delivers:** configure a city or stock, reload saved settings and see correct forecasts, air observations or price history, with exact-input refresh and unavailable-data states.

**Coverage:** `weather`, `airQuality`, `stockPrice` (20 options); location input and shared Clock weather service handoff. **Exclusive owner:** standalone request-handler adapters, location UI and these renderers/charts; no ordinary integration selection.

**Start blockers:** agreed standalone DTO/location/provider interfaces. **Completion gates:** WIDGET-RUNTIME/editor, `LOCALIZATION` formatting, `COORDINATION` bounded standalone cache/timeout port and approved chart/browser/SSR boundary. Weather/AQI/stock services do not wait for all integration clients.

- [ ] Save/reload all 20 options and city lookup/coordinates; weather unit/speed/decimals/date/city/humidity/wind/forecast/icon controls and advanced views work, including Clock's consumer.
- [ ] AQI standard/locale, UV/pollutants/pollen and compact/advanced charts distinguish null/missing observations from real zeros; stock symbol/range/interval/details use exact consumer keys and supported chart presentation.
- [ ] Weather client polling 600s/stale 300s and server cache 300s/deadline 10s; AQI 900s cache/polling with 24h stale allowance/deadline 10s; stocks no root polling. Keep fresh observations versus stale forecasts clear, with demo override and manual refresh isolation.
- [ ] Authorized saved/preview service reads, errors/retained stale data, location/symbol changes and request-local hydration have no duplicate calls, cross-instance invalidation or server modules in chart bundles.

### WIDGET-FEEDS-RELEASES — Authorized feed aggregation and secret-backed release cards

**Delivers:** saved feed URLs and repository choices produce sanitized posts and release lists without exposing tokens or letting previews bypass saved-resource policy.

**Coverage:** `rssFeed`, `releases` (14 options); multiText/multiReleasesRepositories inputs; widget-secret repository selection/save. **Exclusive owner:** these widgets plus widget-specific authorized release-secret service/editor flow; `PERSISTENCE`/`IDENTITY` own encryption/ACL primitives. No registered GitHub integration is inferred.

**Start blockers:** URL/repository/secret-reference DTO and policy agreement. **Completion gates:** WIDGET-RUNTIME/editor, authorized `widget.rssFeed.getFeeds`, per-repository `widget.releases.getLatest`, widget-secret repository operations, `ASSETS`, `LOCALIZATION`, `COORDINATION` and durable encrypted secret-reference repository.

- [ ] Save/convert/reload all 14 keys, feed arrays, repository identities and secret bindings; token create/update/clear/reference UI exposes only authorized metadata and never plaintext in client caches/DTOs/logs.
- [ ] RSS saved/supplied URL authorization remains server-side; aggregate limits, sanitization, RTL, images, description hiding/clamp and redacted upstream errors survive empty/partial/failure cases.
- [ ] Repository dynamic query arrays bind exact repository identities; age thresholds/highlight/detail/icon/top sorting and advanced presentation work. Tokens apply only to saved authorized repositories, including modified/preview attempts.
- [ ] Root no-poll semantics retain scoped manual refresh/recovery; additions/removals cancel/unregister only their queries, and hydration/secret or permission changes cannot reuse another item's authorized response.

### WIDGET-STANDALONE-LOOKUPS — Minecraft status and DNS-pinned departure lookup

**Delivers:** show a saved Java/Bedrock server or configured station's departures with dynamic station selection and safe custom-base-URL reads.

**Coverage:** `minecraftServerStatus`, `timetable` (5 options); dynamicSelect input. **Exclusive owner:** standalone connection/departure widget adapters and selector policy; no ordinary selected integration.

**Start blockers:** agreed standalone service and preview/save/URL trust contracts. **Completion gates:** WIDGET-RUNTIME/editor, `LOCALIZATION`, authorized `widget.minecraft.getServerStatus`, `widget.timetable.getTimetable/searchStations`, `COORDINATION` and public-address/DNS-pinning service port. Topology/network policy is a decision gate.

- [ ] All five options round-trip; server title/domain and Java/Bedrock semantics remain meaningful, with backend-only connection logic, failure and no-poll/manual-refresh states.
- [ ] Station search is genuinely query/base-URL/permission dependent, supports pending/error/empty results and preserves selected station identities through save/reload and dynamic input changes.
- [ ] Departures/search enforce saved-widget view or authorized-modifier preview and fresh public-address DNS pinning; option saves enforce the same custom-URL policy. Never move arbitrary URL fetching into the browser.
- [ ] Station search 24h/departures 60s backend caches and exact-input client refresh/hydration do not confuse different URLs/stations; advanced departure formatting and teardown are demonstrated.

### WIDGET-HOME-CONTROLS — DNS and Home Assistant reads with guarded actions

**Delivers:** view DNS summaries or home entities, then perform permitted DNS toggles/entity switches/automation runs with confirmed pending/result and fresh dependent data.

**Coverage:** `dnsHoleSummary`, `dnsHoleControls`, `smartHome-entityState`, `smartHome-executeAutomation` (9 options). **Exclusive owner:** these reads/actions/renderers; reusable clients remain integration-owned. **Families:** DNS `piHole`, `adGuardHome`, `technitiumDns`, mock; smart home `homeAssistant`, mock, single integration.

**Start blockers:** agreed family DTO/action/policy ports. **Completion gates:** WIDGET-RUNTIME/editor, `INTEGRATION-RUNTIME` named capabilities, request guards/coordination, `LOCALIZATION`; `widget.dnsHole.summary/enable/disable`, `widget.smartHome.entityDetails/switchEntity/executeAutomation`.

- [ ] Save/reload all nine options and eligible selections; DNS colors/layout and smart-home entity/automation selection, units/labels/clickability/advanced controls remain distinct, including single-integration failures.
- [ ] DNS multi-provider partial results and per/all toggles with duration show pending/errors; use is checked before decrypt/construction and interact checked for every target action.
- [ ] Entity state reads retain zero backend TTL, clickable action gating and exact entity keys; automation run has feedback/auth without an invented periodic read.
- [ ] Mutations invalidate actual matching summary/entity consumers; DNS effective 10s polling, demo suppression and manual refresh never refresh unrelated instances or permit real actions in a read-only fixture.

### WIDGET-DOWNLOADS — Multi-client queue/history, saved table and safe controls

**Delivers:** configure queue/history and table filters, select downloads, pause/resume/delete authorized items and reload the saved view.

**Coverage:** `downloads` (15 options); multiSelect input; shared protected debounced table-layout primitive primary owner. **Exclusive owner:** download widget/table/action orchestration plus shared layout persistence hook; Docker/Beszel consume this hook, not its service semantics. **Families:** `sabNzbd`, `nzbGet`, `deluge`, `transmission`, `qBittorrent`, `aria2`, `slskd`, mock; provider no-op/unsupported behavior must remain explicit.

**Start blockers:** agreed queue/history/action/layout DTOs and policy. **Completion gates:** WIDGET-RUNTIME/editor; named integration capabilities; protected option-save repository, `LOCALIZATION`; `widget.downloads.getJobsAndStatuses`, bulk/item pause/resume/deleteItem and `COORDINATION` history/cache ports. Downloads archived-prefetch gap is a decision gate.

- [ ] Persist all 15 options, including hidden layout values, filters/ratio/completion/category/limit/sort and **KiB/s** stored active threshold; converted column state reloads without unit reinterpretation.
- [ ] SAB archived history/window, queue/status distinctions, partial-provider/no-op/unsupported cases and selection/clipboard/context menus work with correct limits and no fabricated successful upstream action.
- [ ] Bulk/item pause/resume and deletion enforce per-integration interact before secrets, pending/error feedback, scoped invalidation and explicit disk-delete confirmation; denied/demo actions never reach a client.
- [ ] Shared layout saves require board modify/item ownership; 350ms debounce flushes on unmount/key switch, hidden/order/width state persists, and read-only users never write. Docker/Beszel consume the agreed primitive.
- [ ] Demonstrate 10s client polling/stale and request-identity/key-exact hydration including **includeArchivedHistory/historyWindowDays**; repair or explicitly resolve the old prefetch omission, and exercise same-kind queues with different inputs.

### WIDGET-REQUESTS-NOTIFICATIONS — Request decisions, indexer tests and message deletion

**Delivers:** view recent requests/statistics, indexer health or aggregated messages, and perform only authorized decisions/test-all/deletions with correct feedback and refreshed data.

**Coverage:** `mediaRequests-requestList`, `mediaRequests-requestStats`, `indexerManager`, `notifications` (6 options). **Exclusive owner:** these widget-local read/action services and UI; no duplication of Assistant media-request tools or operational pages. **Families:** `jellyseerr`, `seerr`, `overseerr`; `jackett`, `prowlarr`; `nextcloud`, `ntfy`, `gotify`; all also mock.

**Start blockers:** agreed request/message/indexer DTO/action contracts. **Completion gates:** WIDGET-RUNTIME/editor, named integration capabilities, `LOCALIZATION`, `ASSETS` message icons, `COORDINATION`; request getLatestRequests/answerRequest/getStats, indexer getIndexersStatus/testAllIndexers and notification getNotifications/deleteNotification capabilities.

- [ ] All six options, integration choices and zero-option request statistics persist; filters/recent-days/link targets, counts/partial failures, message format/logos/details and applicable advanced presentations work.
- [ ] Approve/deny and message deletion enforce interact per target, show pending/error, and invalidate matching data after success; unsupported provider deletion remains explicit.
- [ ] Indexer links/new-tab and runtime test-all action register/clean up with permission/edit-mode predicates and test feedback; no automatic indexer polling is introduced.
- [ ] Preserve request 60s backend stale fallback, effective family refresh and exact-filter keys; manual recovery and revoked access clear only the relevant authorized results, and initial pending/hydration does not widen preview permissions.

### WIDGET-DOCKER — Endpoint-scoped containers, persisted layout and operational modals

**Delivers:** select permitted Docker endpoints, save a filtered/sorted container view, inspect/log/control containers and add an app through the shared app flow.

**Coverage:** `dockerContainers` (11 options); dynamicMultiSelect input. **Exclusive owner:** container widget/selector/table plus invoking shared operational modals and add-app handoffs; integration/extended owners own Docker endpoint/client/operational engines and board owner owns app resource creation forms.

**Start blockers:** agreed endpoint inventory/action/log/app contracts. **Completion gates:** WIDGET-RUNTIME/editor, protected option-save and WIDGET-DOWNLOADS shared layout primitive; Docker endpoint permissions/`docker.getContainers/getEndpoints/refreshInventory` plus action/log modal ports; `LOCALIZATION`, `COORDINATION`, app creation contract. Not gated on ordinary integration-kind rollout.

- [ ] All 11 options save/reload; endpoint lookup is permission-aware, with row sorting/default sort/filter whitelist/case/wildcards and hidden/order/width columns correct across endpoint selection changes.
- [ ] Inspect/log/start/stop-style controls preserve endpoint-specific permission and confirmations, pending/errors and bounded stream cleanup; app creation uses the real authorized shared resource flow rather than a mock success button.
- [ ] Supporting inventory/container queries remain live at effective 30s policy and refreshed after mutations; exact endpoint sets and filters scope refresh/invalidation, and stale forbidden data is cleared.
- [ ] Shared layout debounce flush and read-only suppression, advanced focus, host geometry, error states and initial hydration/pending behavior work without duplicate operational subscriptions or conflating Docker endpoints with integration IDs.

### WIDGET-PLAYBACK-AUDIO — Playback, audio libraries and Tracearr activity

**Delivers:** configure currently playing media, audio-library metrics and Tracearr activity, then inspect advanced detail with provider-specific availability and authorized artwork.

**Coverage:** `mediaServer`, `audioStats`, `tracearr` (16 options). **Exclusive owner:** these renderers/composed widget reads and advanced consumers. **Families:** media `jellyfin`, `emby`, `plex`, `navidrome`; audio `navidrome`, `audiobookshelf` (single); `tracearr`; all mock supported.

**Start blockers:** agreed playback/audio/activity DTOs and media port. **Completion gates:** WIDGET-RUNTIME/editor, named integration capabilities, `ASSETS`, `LOCALIZATION`, coordination; media getCurrentStreams, audio getStats and Tracearr getDashboard.

- [ ] Persist all 16 options; playing filter/bitrate/location/artwork/progress, audio count/library/listening/compact controls, Tracearr streams/stats/activity/violations and supported advanced details are meaningful for each provider.
- [ ] Audio advanced stream reads occur only for supporting providers; Navidrome versus Audiobookshelf shapes/units/absent metrics and partial failures never become invented zeros or unsupported calls.
- [ ] Authorized proxy/media delivery and credential redaction apply before client DTO construction; view/use and single-integration limits remain server checks.
- [ ] Media/Tracearr 10s refresh plus audio's effective policy, precise consumer keys, shared stream reuse, request-local pending/hydration and focus cleanup avoid duplicate polling and retain ordinary stale data without forbidden leakage.

### WIDGET-MEDIA-DISCOVERY — Calendar, missing media and recent releases

**Delivers:** navigate release calendars, page missing/queued media and display recent releases using saved filters and authorized media links.

**Coverage:** `calendar`, `mediaMissing`, `mediaReleases` (11 options). **Exclusive owner:** these widgets, pagination/month state and read adapters. **Families:** calendar `sonarr`, `radarr`, `lidarr`, `readarr`, `homeAssistant`, `nextcloud`, `ical`, mock, **optional**; missing `sonarr`, `radarr`, `bindery`, mock; releases `emby`, `jellyfin`, `plex`, mock.

**Start blockers:** agreed calendar/organizer/release DTO and identity/media ports. **Completion gates:** WIDGET-RUNTIME/editor, named integration capabilities, `LOCALIZATION`, `ASSETS`, `COORDINATION`; calendar findAllEvents, mediaOrganizer getData and mediaRelease getMediaReleases.

- [ ] All 11 options persist; exact month/year/type/unmonitored and missing page/filter keys, past/future month restrictions and optional-integration empty states render and navigate correctly.
- [ ] Timezone-safe initial month/hydration follows approved rendering; ICAL/Nextcloud/Home Assistant event semantics and organizer provider differences use integration-owned DTOs without adding unsupported missing-media methods to Lidarr/Readarr.
- [ ] Missing/queued totals, page size/detail links, posters/layout/type/source/description tooltip and advanced views work with authorized assets and partial failures.
- [ ] Missing backend cache 60s, media releases 300s/stale fallback and no-poll behavior preserve manual refresh/recovery; pagination/month changes cancel and invalidate only the appropriate identities.

### WIDGET-MEDIA-JOBS — Subtitle badges, transcoding queue and Warrior progress

**Delivers:** monitor subtitle health, choose Tdarr queue/statistics views or display ArchiveTeam work progress with saved presentation options.

**Coverage:** `bazarr`, `mediaTranscoding`, `archiveTeamWarrior` (7 options). **Exclusive owner:** these status/job read adapters and UI. **Families:** `bazarr`, `tdarr`, `archiveTeamWarrior`, each single integration, each also mock.

**Start blockers:** agreed badge/transcoding/progress DTOs. **Completion gates:** WIDGET-RUNTIME/editor, named integration capabilities, `LOCALIZATION`, coordination; Bazarr getBadges, mediaTranscoding getDataAsync, Warrior getStatus. Decision gate: ignored queuePageSize behavior.

- [ ] Save/reload all seven options; Bazarr missing movie/episode/provider/health toggles, Tdarr default view and Warrior broadcast/work/project/task/progress are visible in compact/advanced views as supported.
- [ ] Preserve declared queuePageSize data and explicitly decide layout-derived versus option-driven page sizing; implement only the approved behavior with focused critical-flow evidence, not accidental loss or a false claim about current behavior.
- [ ] Single-provider/use-before-secret guards and provider failure/suspense/retry states work; ArchiveTeam upstream snapshot lifecycle stays integration-owned rather than being mistaken for a browser-owned permanent socket.
- [ ] Transcoding root no-poll, effective other policies, scoped runtime refresh and exact queue/view inputs survive focus/resize/hydration without duplicate upstream work.

### WIDGET-IMMICH — Saved photo statistics and a focus-stable album carousel

**Delivers:** select an authorized album/all-photos view, configure slideshow behavior, reload and navigate photos alongside server totals.

**Coverage:** `immich-serverStats`, `immich-albumCarousel` (8 options). **Exclusive owner:** Immich widgets/album selector consumer/carousel runtime; WIDGET-BESZEL-LIVE owns the reusable integrationSelect input primitive. **Family:** `immich`, mock; one integration each.

**Start blockers:** agreed album/stats/asset DTO and selection contracts. **Completion gates:** WIDGET-RUNTIME/editor, integrationSelect contribution, Immich capabilities, `ASSETS`, `LOCALIZATION`; getServerStats/getAlbums/getAlbum/getAlbumPreview and media delivery.

- [ ] All eight options, selected album/all-photos, units/counts and rotation/randomization/metadata save/reload; selectors handle missing albums and single-integration errors, not static dropdown fixtures alone.
- [ ] Stats users/photos/videos/storage and carousel preview/full data remain separate; exact album/integration keys and random order are consistent without oversized duplicate hydration.
- [ ] Previous/next/slideshow actions, status, configured interval and advanced focus retain selected photo/player/timer state; cleanup leaves no duplicate slideshow timers after hide/focus/reopen.
- [ ] Authorized full/preview assets, partial/errors/no-poll/manual refresh and revoked-access clearing work with server-only credentials and the approved initial-pending/hydration strategy.

### WIDGET-HEALTH — Capability-aware system, cluster and disk dashboards

**Delivers:** choose supported health/chart/volume sections and reload meaningful resource and disk views without querying unsupported cluster capabilities.

**Coverage:** `healthMonitoring`, `systemResources`, `systemDisks` (17 options); integrationMultiSelect input; shared health-query/volume selector adapter primary owner. **Exclusive owner:** these widgets and shared health consumer adapters, not provider histories/connections.

**Families:** health `openmediavault`, `dashDot`, `truenas`, `unraid`, `glances`, `synology`, `proxmox`, mock; resources same **except proxmox**; disks `dashDot`, `openmediavault`, `truenas`, `unraid`, `synology`, mock. System versus cluster capabilities are distinct.

**Start blockers:** agreed health/cluster/volume/history DTO/capability contracts. **Completion gates:** WIDGET-RUNTIME/editor, named clients, `LOCALIZATION`, coordination/history port, integration byIds and health getSystemHealthStatus/getClusterHealthStatus. TrueNAS connection and DashDot history remain integration/coordination production gates only where consumed.

- [ ] All 17 options persist, including unit/temp settings, storage/cluster section selectors/default tabs, chart/shadow/labels and disk temperature/display/background/volume controls.
- [ ] Capability and cardinality validation selects system or cluster reads correctly; Proxmox does not accidentally enter system-only widgets, and unavailable sensors/volumes are distinct from empty/zero data.
- [ ] Real permission-aware volume selection IDs survive save/reload, unit/history chart and advanced layouts handle partial results, and common health data shares authorized upstream calls.
- [ ] Effective 10s refresh, actual integration-set/volume query identity, SSR/chart boundaries, exact-key hydration and focus/error cleanup preserve histories without duplicate calls or client server imports.

### WIDGET-NETWORK — Network, firewall, VPN, UPS and routing status

**Delivers:** configure network/UPS/routing summaries and inspect live resource/status details across the supported network providers.

**Coverage:** `networkControllerSummary`, `networkControllerStatus`, `firewall`, `vpn`, `ups`, `traefik` (7 options; three zero-option kinds). **Exclusive owner:** these status widgets/read adapters. **Families:** `unifiController`, `opnsense`, `gluetun`, `peaNut`, `traefik`, respectively; mock for each.

**Start blockers:** agreed read-only status/resource DTOs. **Completion gates:** WIDGET-RUNTIME/editor, named integration capabilities and session/history ports where applicable, `LOCALIZATION`, `COORDINATION`; networkController summary, firewall CPU/interfaces/memory/version reads, VPN/UPS getSummaries and Traefik getDashboard. No invented VPN/UPS administrative controls.

- [ ] All seven options and zero-option placements persist; selected status content, network/client/device health, UPS battery/load/voltage and Traefik TCP/UDP/entry-point switches display supported compact/advanced details.
- [ ] Firewall four independent consumers and interface histories preserve failure isolation/units; shared controller summary is reused and missing fields/provider partial errors never become false health success.
- [ ] All selected clients enforce use before secret/session construction, with credential-free DTOs/links; multi-provider identities and unavailable capability errors remain precise.
- [ ] Firewall 10s and network/VPN root no-poll/manual refresh plus effective UPS/Traefik policy are reconciled; exact inputs, status/recovery and hydration/cleanup isolate instances and do not duplicate histories.

### WIDGET-SERVICE-CARDS — Coolify, Paperless, Uptime Kuma and WUD cards

**Delivers:** save display choices for service resources, document totals, uptime and available container updates with correct counts, grouping and failures.

**Coverage:** `coolify`, `paperlessNgx`, `uptimeKuma`, `wud` (20 options). **Exclusive owner:** these read-only card renderers/adapters. **Families:** `coolify`, `paperlessNgx`, `uptimeKuma`, `wud`, all mock; Paperless/WUD single integration.

**Start blockers:** agreed card DTO/read policy. **Completion gates:** WIDGET-RUNTIME/editor, named integration clients, `LOCALIZATION`, coordination; Coolify getInstancesInfo, Paperless getStats, Uptime Kuma getDashboard and WUD getStats.

- [ ] All 20 options persist; Coolify server/app/service grouping/links, Paperless inbox ratio/ring/totals/counts, Uptime counts/ring/average and WUD title/ring/layout/update-list work with supported advanced views.
- [ ] Nullable/missing data, partial service groups, paused monitors and suspense/retry remain distinct from zeros; Paperless/WUD one-instance limits are enforced.
- [ ] Use-before-secret guards and DTO redaction preserve reads without accidentally exposing Coolify env/log data or claiming Kuma's public status-page data is private dashboard support.
- [ ] Paperless/WUD root no-poll versus effective Coolify/Kuma refresh, scoped manual recovery/status, hydration and session/focus cleanup are demonstrated for the four actual widgets, not only a generic card template.

### WIDGET-PATCHMON — Protected compliance metrics and validated thresholds

**Delivers:** authenticated users configure compliance/OS/updates presentation and custom warning/critical thresholds, save them and see accurate colored health.

**Coverage:** `patchmon` (30 options). **Exclusive owner:** PatchMon definition/refinement/editor predicates and protected widget read/render adapter. **Family:** `patchmon`, mock; one integration.

**Start blockers:** agreed PatchMon DTO and protected-session interface; no production identity rollout required for fixture port. **Completion gates:** WIDGET-RUNTIME/editor, protected request principal and PatchMon getStats capability, named client, `LOCALIZATION`, coordination.

- [ ] All 30 keys persist with validated defaults/visibility, threshold modes/ordering `OPTIONS_SUPER_REFINE`, custom-threshold enablement and OS limit/version/display behavior; converted values are not silently normalized into different risk semantics.
- [ ] Compliance hero, host/update/security/repository/24h/package metrics and OS distribution render correctly in compact/advanced modes, including absent observations and threshold boundary cases.
- [ ] `getStats` remains protected-session rather than a universal anonymous widget read; use-before-secret checks, single-integration policy, denied public-board reads and forbidden cache clearing are explicit server acceptance.
- [ ] Actual query keys, effective refresh/demo behavior, request-local hydration/pending and focus/save invalidation retain ordinary failure data without exposing a previous authenticated session's results.

### WIDGET-PERFORMANCE — Speedtest history and llama.cpp telemetry

**Delivers:** configure network performance history or model-server telemetry and reload charts/metric cards with correct units and endpoint availability.

**Coverage:** `speedtestTracker`, `llamacpp` (11 options). **Exclusive owner:** these dashboard read adapters/charts. **Families:** `speedtestTracker`, `llamacpp`, mock; llama.cpp single integration.

**Start blockers:** agreed performance/telemetry DTO and chart boundary. **Completion gates:** WIDGET-RUNTIME/editor, named integration clients, `LOCALIZATION`, coordination; speedtest getDashboard and llama.cpp getStats. No completion/model-control capability is added.

- [ ] All 11 options persist; latest/stats/recent/ping graph and model/context/cache/speed/request/token/speculative controls match supported compact/advanced views.
- [ ] Times/latencies/rates retain source units, null latest/history/optional slots and not-ready model state are visible; do not confuse native speedtest rates with Stats projection conversions.
- [ ] Use-before-secret authorization, llama single-instance policy and empty/partial/source errors work with client-only/SSR-safe chart boundaries and serializable data.
- [ ] Speedtest no root polling and llama.cpp 5s refresh are respected with exact query keys/manual recovery/demo gating; reload/hydration/focus cleanup does not duplicate histories or polling.

### WIDGET-STATS — Catalog-driven metric cards and grouped snapshots

**Delivers:** select source/metric entries from real capability catalogs, save card/table layouts and refresh grouped integration snapshots with clear per-source errors.

**Coverage:** `stats` (6 options); statsEntries input, composite query/actions/status lifecycle. **Exclusive owner:** Stats widget/catalog-entry/editor/runtime adapters. Integration owners retain native/provider Stats implementations and metric definitions.

**Start blockers:** agreed catalog/snapshot/entry schema, failure and semantic-query contract. **Completion gates:** WIDGET-RUNTIME/editor, `INTEGRATION-RUNTIME` Stats catalog/snapshot ports, authorized widget.stats.catalog/snapshot, `LOCALIZATION`, coordination and durable entry conversion. Not gated on every provider finishing before fixture work.

- [ ] Persist all six options/entry identities and catalog-based metric/source selections; cards/table/plain/rows/icons/spacing and conversions reload with original metric units, not a hard-coded subset.
- [ ] Offer all declared integration kinds except `ical`, while explicitly resolving the existing `bindery`/`wazuh` selection-versus-metric mismatch: currently 88 eligible kinds but only 86 implemented Stats providers. No invented metrics, removed providers or guessed zero values; product/capability decision gates final wording.
- [ ] Group snapshot queries per integration, preserve composite/per-source errors, catalog stale 60s/snapshot stale 30s/60s component polling and failure cooldown; registered runtime refresh/status reflect last data/error rather than mount time.
- [ ] Query ownership binds dynamic entries/source sets; edits/removals cancel and unregister their own snapshots, use/secret guards precede construction, demo/session clearing and request-local hydration cannot expose unrelated sources.

### WIDGET-UMAMI — Website/event selectors through analytics charts

**Delivers:** select a website and event(s), save an analytics view and inspect time-series/top pages/referrers with mode-specific queries and correct advanced charts.

**Coverage:** `umami` (8 options); umamiWebsite/umamiEventName/umamiEventNames inputs. **Exclusive owner:** website/event widget selectors, conditional query graph and chart presentation. **Family:** `umami`, mock, single integration; cloud/self-hosted client modes stay integration-owned.

**Start blockers:** agreed website/event/timeframe/series DTOs. **Completion gates:** WIDGET-RUNTIME/editor, Umami selectors and getVisitorStats/getActiveVisitors/getMultiEventTimeSeries/getTopPages/getTopReferrers, `LOCALIZATION`, chart boundary, coordination.

- [ ] All eight options and dependent website/single-/multi-event choices save/reload; unavailable/deleted website/event choices have repair states and one-integration/use permissions, not static dropdown assumptions.
- [ ] Mode-specific query sets and exact website/timeframe/event/topCount inputs match chart type/style, series/legend and advanced display; no extra hidden-view query or accidental active-visitor/chart key sharing.
- [ ] Explicit consumer 60s polling overrides root no-poll metadata, honors agreed demo policy and supports scoped refresh/cancellation/invalidation; backend/provider time boundaries remain as defined, not an invented local-time conversion.
- [ ] Partial/missing data, cloud/self-hosted errors, forbidden clearing and request-local hydration/SSR-safe chart loading have no duplicate fetch/secret/client-server graph leakage.

### WIDGET-BESZEL-INVENTORY — System tables/grids and alert history with detail handoff

**Delivers:** save system table/grid metrics and alert history choices, reload column layouts and open the same qualified system's detail charts.

**Coverage:** `beszelSystemTable`, `beszelSystemGrid`, `beszelAlerts` (30 options). **Exclusive owner:** inventory/alert widgets and detail-entry wiring; WIDGET-BESZEL-LIVE exclusively owns shared detail/chart/live implementation; WIDGET-DOWNLOADS owns shared layout primitive. **Family:** `beszel`, mock.

**Start blockers:** agreed system/alert/qualified-identity/detail-renderer contracts; fixture inventory and stubbed detail surface can start independently of live implementation. **Completion gates:** WIDGET-RUNTIME/editor, Beszel getSystems/getAlerts, protected layout repository/primitive, `LOCALIZATION`; WIDGET-BESZEL-LIVE shared detail acceptance only for real drill-down, not inventory start.

- [ ] All 30 options persist with filters/sort/metric visibility, alert active/history/bounded count and integration-qualified identities; table hidden/order/width values reload and flush without read-only writes.
- [ ] Table and grid metrics/units/agent/service/battery/temperature absent states and per-integration failures render; no advanced-focus flag is invented for table/grid despite their detail modals.
- [ ] Row/tile detail opens the exact authorized system through the shared live owner's renderer and closes/aborts correctly; it does not implement a competing stats hook, buffer or subscription.
- [ ] Inventory/alerts effective refresh/manual recovery, request-local selected prefetch/hydration and shared-query reuse preserve distinct integration/system keys and forbidden cleanup, without duplicate per-row streams.

### WIDGET-BESZEL-LIVE — Historical stats and bounded live streams on a saved system

**Delivers:** select and save a Beszel system/time period, view historical charts, switch to a visible-only live feed, then hide/reopen safely; provides shared drill-down charts to inventory widgets.

**Coverage:** `beszelSystemStats` (13 options); integrationSelect input primitive; shared stats/detail/chart/live hooks primary owner. **Exclusive owner:** this widget, selection rollback and shared detail/live consumer logic. Integration owner owns PocketBase SSE protocol; transport owner owns authorized iterator host.

**Start blockers:** agreed system discovery/qualified identity/history/event/error/cancellation contracts; historical chart fixtures start before live transport/provider implementation. **Completion gates:** WIDGET-RUNTIME/editor, Beszel getSystems/getSystemStats/subscribeSystemStats, option repository, `TRANSPORTS` iterator/abort contract, named provider, coordination and `LOCALIZATION`; topology/proxy lifetime decision gates live production completion.

- [ ] All 13 options and legacy/qualified system identities convert/save/reload; system selector resolves per integration, optimistic changes roll back on rejected save, period/GPU/Docker metric controls retain meaning.
- [ ] Historical requests use exact integration/system/period keys, zero backend TTL and explicit 5s consumer polling; compact/detail charts distinguish missing/historical failure and deterministic hydration from live mode.
- [ ] Live `1m` uses visibility-gated subscription with **60 records per client buffer**, identity/enabling reset, bounded server queue, AbortController and generator-finally cleanup; streamed append versus live replacement is chosen deliberately, not assumed from helper names.
- [ ] Hide/reopen/unmount/focus/session change aborts listeners/requests and clears sensitive data; reconnect/error handling cannot leak prior system samples or leave background streams running. No immortal stream prefetch/dehydration.
- [ ] Shared detail renderer serves WIDGET-BESZEL-INVENTORY through the same authorization/lifecycle/formatting port; integrationSelect primitive also serves Immich without making album behavior depend on Beszel live completion.

### WIDGET-WAZUH-RECORDS — Security record cards with actual query ownership

**Delivers:** configure agents, alerts, summary, FIM and authentication-failure views, then refresh each actual filter safely with explicit unsupported-indexer states.

**Coverage:** `wazuhAgents`, `wazuhAlerts`, `wazuhSummary`, `wazuhFim`, `wazuhAuthFailures` (21 options). **Exclusive owner:** these five record/summary widgets and their semantic-query contributions; common query adapter remains WIDGET-RUNTIME-owned. **Family:** `wazuh`, mock; one integration each.

**Start blockers:** agreed Wazuh result/error/filter DTOs and query ownership gap decision; fixture port does not wait for Wazuh production credentials. **Completion gates:** WIDGET-RUNTIME/editor, Wazuh getAgents/getAlerts/getSummary/getFim/getAuthFailures, `LOCALIZATION`, coordination/cache and API/indexer capability modes.

- [ ] All 21 options persist; status/sort/version/groups, alert level/hours/limit/MITRE/agent/IP/rule, summary range/trend/footer, FIM range/event/limit/registry and auth hours/limit/IP visibility affect the actual supported result/view.
- [ ] Resolve missing definition queryKey registrations with actual `widget.wazuh.*` procedure/input references, not fallback `widget.wazuhAgents`-style paths; scoped refresh/recovery for two same-kind filtered widgets proves ownership.
- [ ] Preserve single-integration/use-before-secret guards, API-only/API+indexer/indexer-only availability, missing-indexer errors and per-result/null/empty/source failure differences; forbidden clears rather than leaving stale security data.
- [ ] Explicit 60s polling/cache families, demo policy, time/localization, request-local hydration/pending and query lifecycle cleanup apply across all five views, without making WIDGET-WAZUH-ANALYTICS a start blocker.

### WIDGET-WAZUH-ANALYTICS — Timeline, ranked threats and vulnerabilities

**Delivers:** save a timeline/top-list/vulnerability analysis and see exact range/bucket/severity/limit results with distinct cache and polling cadence.

**Coverage:** `wazuhTimeline`, `wazuhTopList`, `wazuhVulnerabilities` (16 options). **Exclusive owner:** these three analytics/chart widgets and semantic-query contributions; same integration/query interfaces as record slice, no shared-file race. **Family:** `wazuh`, mock; one integration each.

**Start blockers:** agreed analytics DTOs/query-ownership decision; not WIDGET-WAZUH-RECORDS completion. **Completion gates:** WIDGET-RUNTIME/editor, Wazuh getTimeline/getTopList/getVulnerabilities, `LOCALIZATION`, chart boundary and coordination/indexer capability ports.

- [ ] Persist all 16 options; range/interval/chart/log-linear scale/level/legend, top kind/range/limit/bars and CVE order/severity/limits/agent visibility control exact results and meaningful rendering.
- [ ] Repair/resolve the same absent queryKey gap using actual procedure plus exact range/filter/bucket inputs; no kind-prefix ownership or stale data from another severity/time range.
- [ ] Timeline polls 60s for 1h/24h and 300s for 7d/30d, top list 120s, vulnerabilities 300s; backend 60/120/300s cache identities remain separate from client refresh. Demo overrides are explicitly reconciled.
- [ ] Use/one-instance/API-indexer guards, unavailable-versus-zero/null results, forbidden clearing, request-local hydration/chart loading and cancellation/focus cleanup work without duplicate series or unsupported indexer claims.

### WIDGET-EXTENDED-BRIDGES — Real Assistant and versioned Custom JSX placements

**Delivers:** render the actual Assistant in its registered widget slot and select/configure/render an authorized Custom JSX placement, including repair/unavailable states rather than a fallback-only success.

**Coverage:** `assistant`, `customApi` (4 options); customWidgetSelect/customWidgetConfiguration inputs. **Exclusive owner:** registered widget slots, placement/editor bridge, per-item Custom JSX refresh/query/action/status linkage and browser-only entry. Extended owner exclusively owns chat engine/protocol/history/tools/uploads, Custom JSX interpreter/security/authoring/workbench/source/secrets/named request engine, configuration requests and Workshop. No duplicate authoring/runtime ticket here.

**Start blockers:** agreed Assistant renderer/provider and Custom JSX definition/placement/config-version/request interfaces; isolated unavailable/fixture bridge work starts before extended runtimes finish. **Completion gates:** WIDGET-RUNTIME/editor, `BOARD-RUNTIME`, `LOCALIZATION`, authorized Custom JSX placement read/getData/named query/action ports and real extended Assistant renderer/browser interpreter. Full extended-engine acceptance is a release gate, not a blocker for native widgets.

- [ ] Assistant zero-option placement resolves the injected real renderer/shared session/run state and the existing panel/Spotlight handoff; copying the tiny fallback does not close the kind. Chat/tools/uploads/auth/stream/history acceptance remains with the named extended owner.
- [ ] All four Custom JSX keys, definition IDs/configuration/version/refreshInterval save/convert/reload; exactly the durable `customApi` kind bridges dynamic enabled-definition choices rather than treating each definition as a native kind.
- [ ] Saved item kind/board-view/definition enabled-exists/config repair checks and admin-only configuration boundaries hold in saved and preview flows; missing/deleted/disabled/legacy-only definitions retain repair/removal/admin-migration links and IDs, including legacy migration-required states without silently enabling or discarding them.
- [ ] Browser-only interpreter linkage uses extended-owned ports for named requests/actions/source/secret/confirmation/invalidation; edit/demo predicates do not replace server checks. No secret values or unapproved source execution enters the editor/client graph.
- [ ] Option-driven polling defaults to 30s/minimum 1s, terminal definition errors stop polling/retry and demo read-only suppresses it; exact placement/config inputs, error clearing, refresh/status and cleanup agree with the extended engine, with no duplicate authoring/Workshop scope.

## Reconciliation and largest-batch risks

### Ticket totals

| Stable key | Kinds | Options |
| --- | ---: | ---: |
| WIDGET-RUNTIME | 1 | 6 |
| WIDGET-EDITOR | 1 | 15 |
| WIDGET-TIME | 3 | 27 |
| WIDGET-EMBEDS | 2 | 13 |
| WIDGET-NOTES | 2 | 6 |
| WIDGET-ENVIRONMENT | 3 | 20 |
| WIDGET-FEEDS-RELEASES | 2 | 14 |
| WIDGET-STANDALONE-LOOKUPS | 2 | 5 |
| WIDGET-HOME-CONTROLS | 4 | 9 |
| WIDGET-DOWNLOADS | 1 | 15 |
| WIDGET-REQUESTS-NOTIFICATIONS | 4 | 6 |
| WIDGET-DOCKER | 1 | 11 |
| WIDGET-PLAYBACK-AUDIO | 3 | 16 |
| WIDGET-MEDIA-DISCOVERY | 3 | 11 |
| WIDGET-MEDIA-JOBS | 3 | 7 |
| WIDGET-IMMICH | 2 | 8 |
| WIDGET-HEALTH | 3 | 17 |
| WIDGET-NETWORK | 6 | 7 |
| WIDGET-SERVICE-CARDS | 4 | 20 |
| WIDGET-PATCHMON | 1 | 30 |
| WIDGET-PERFORMANCE | 2 | 11 |
| WIDGET-STATS | 1 | 6 |
| WIDGET-UMAMI | 1 | 8 |
| WIDGET-BESZEL-INVENTORY | 3 | 30 |
| WIDGET-BESZEL-LIVE | 1 | 13 |
| WIDGET-WAZUH-RECORDS | 5 | 21 |
| WIDGET-WAZUH-ANALYTICS | 3 | 16 |
| WIDGET-EXTENDED-BRIDGES | 2 | 4 |
| **28 tickets** | **69** | **372** |

- Definitions/modules/components: all 69 durable declared kinds have a primary ticket; no extra disabled/legacy kind and no absent loader were found in completed research. All 372 direct option declarations are enumerated above and inherit schema/UI/data/service/auth/refresh/error/hydration/interaction/invalidation/save obligations as applicable. All 25 dispatched input types have one primary behavioral delivery and one shared composition owner.
- Discovery: 68 ordinary native choices plus dynamic definitions under `customApi`; definitions do not multiply the kind count. Advanced-focus support is the source's 42 enabled definitions; preserve those flags unless explicitly redesigned, without granting flags to Beszel inventory simply because it opens detail charts.
- Data surfaces: research's 46 widget subrouters include options and secrets, not 46 kinds. Feature reads/actions are assigned by capability above; transport inventories remain transport-owned. Common options save is WIDGET-RUNTIME contract plus board/persistence service, editor consumer; widget-specific secret selector/service semantics are WIDGET-FEEDS-RELEASES; table save consumers remain with their family tickets.
- Cross-owner content: app CRUD and board/picker/grid/resource form owners are not duplicated by app/bookmark renderer ownership; Anchor client belongs to integrations, Notebook widget content behavior here; Docker engine/tools belong to integration/extended owners but widget modal/confirmation/invalidation wiring here. Browser notification provider is localization-owned, timer/countdown occurrence logic here. Health shared data adapter belongs WIDGET-HEALTH, layout primitive WIDGET-DOWNLOADS, Beszel shared detail/live renderer WIDGET-BESZEL-LIVE. Root providers, API registrations, manifests and lockfile each have one writer.
- Extended completeness: Assistant and `customApi` kinds are primary here only for widget integration; actual chat and Custom JSX authoring/runtime/Workshop/security remain extended owner and must appear on that owner's graph. Their engines are named completion dependencies, not claimed implemented by these bridges.
- No widget capability gap remains from the assigned inventory. Cross-area service/API ownership edges require coordinator confirmation; source discrepancies below remain explicit decisions, not silently approved repairs.

### Largest risks and recommended sizing guardrails

1. **WIDGET-EDITOR:** many shared services and inputs can exceed a context if it also rewrites all 25 family implementations. It owns shell/validation/dispatch/preview and a real bookmark flow only; specialized input behavior is apportioned above. Full input/discovery reconciliation is milestone acceptance, not a 25-input horizontal rewrite or a universal feature start gate.
2. **WIDGET-DOWNLOADS / WIDGET-DOCKER:** destructive actions, provider differences and stateful tables/modals are the highest interactive scopes. Keep existing domain clients and shared operational engines behind their owning ports; do not absorb seven download-client rewrites or Docker tools pages. Further split only if those adapters prove genuinely large, retaining each read+options+authorized action+UI demonstration rather than API/UI splits.
3. **WIDGET-BESZEL-LIVE:** selected-system conversion, optimistic persistence, historical charts and bounded live cancellation form one coherent vertical slice but are topology-sensitive. It is already separated from inventory/alerts; do not add provider SSE parsing, operational Beszel management or unbounded stream scaffolding to its context.
4. **WIDGET-NETWORK:** six kinds are acceptable only as read-only consumers of reusable clients with seven total options; four firewall queries/history and UniFi session quirks are named upstream edges. If client DTO adaptation is not reusable, split firewall into its own complete card slice and keep the provider fix in its own integration family, not hidden here.
5. **WIDGET-WAZUH-RECORDS / WIDGET-STATS:** five Wazuh record views share one existing family/60s cadence but require actual per-input registration; the three analytics views are deliberately separate. Stats is only one kind but has dynamic catalogs and 88 eligible sources; integration owner provides the 86 implementations. Do not convert this into one widget ticket that rewrites every provider.
6. **WIDGET-TIME / WIDGET-PATCHMON:** 27 local options/storage semantics and 30 threshold/OS options justify dedicated contexts. Most behavior is reusable; avoid unrelated browser notification/root-provider or upstream PatchMon client rewrites.

## Pending decisions to carry into coordinator interview

- Rendering/SSR/selective prefetch/hydration strategy, including app/bookmark populated HTML minimum, browser-only chart/editor boundaries and request-local identity/query state. Existing selective prefetch is evidence, not permission to hydrate all 69 kinds or live streams.
- Production topology, durable storage/conversion format and cache/generation/revision/fanout scope; library replacements/provider composition; iterator/proxy lifetime and actual item focus/navigation preservation contract. No storage/runtime/provider architecture is selected by this draft.
- Agreed semantic query/error/session contract and effective polling/demo policy, explicitly reconciling component-local overrides versus root defaults and secure server demo enforcement.
- Known gaps: Wazuh missing query ownership; Downloads archived-history prefetch input omission; declared-but-ignored mediaTranscoding queuePageSize; Stats `bindery`/`wazuh` selectable-but-unimplemented metric capability. Recommended fixes are ownership/security/input-key correctness; product-visible behavior changes/exclusions still need explicit approval. Never claim current source already meets those obligations.
- Server option-schema validation policy: source editor Zod validation alone is not proof of universal server validation. Decide preserved units/refinements/durable repair behavior and per-family sensitive URL/custom-placement policies before production acceptance.
- Coordinator confirms widget-versus-board/editor/provider/API/secret/extended exclusive seams and maps these reserved names to its real ticket graph. Final graph granularity/blocking-edge approval precedes one-file-per-ticket publication; this combined file is a draft only.
