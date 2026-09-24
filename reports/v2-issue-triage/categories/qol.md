# Quality of life

42 issues. See [complete report](../REPORT.md) and [methodology](../README.md).

### #6697 — feat: Use Tb / Gb for UNRAID Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6697) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 defaults to decimal KB/MB/GB/TB units and lets each user select binary KiB/MiB/GiB/TiB when desired.

**Conversation (0 comments read):** No comments were present. The request asks Unraid values to match the UI's decimal TB/GB labels instead of binary TiB/GiB. V2's shared formatter changed the default to decimal and exposes an explicit per-user unit-system setting used by health widgets.

**V2 evidence:**

- packages/common/src/number.ts:19-31,54-60 — decimal and binary unit tables are defined, with decimal as the default and 1000 versus 1024 bases. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/common/src/number.ts#L19)
- packages/settings/src/byte-format.ts:9-18 — all byte/byte-pair/rate formatting reads the user's byteUnitSystem setting. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/settings/src/byte-format.ts#L9)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx:354-370 — user settings offer decimal KB/MB/GB and binary KiB/MiB/GiB choices. — [source L354](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx#L354)
- packages/widgets/src/health-monitoring/system-health.tsx:218-220 — system disk values use the shared formatter rather than an Unraid-specific suffix. — [source L218](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L218)
- packages/integrations/src/unraid/unraid-integration.ts:36-67 — Unraid values are passed as byte quantities for shared formatting. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)

**Remaining / follow-up:** Users who choose binary units will still see GiB/TiB by design. Verify the default setting in an upgraded installation and confirm the reported Unraid panel uses the shared formatter.

### #6677 — feat: save state of accordion in system health monitor

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6677) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The Proxmox cluster accordion state in V2 is held only in React component state. It is keyed by display mode and visible-section scope, so toggles survive ordinary rerenders within the mounted widget and do not leak between compact/advanced configurations. The state is initialized from defaults on mount and is never written to localStorage, sessionStorage, the board, or an API, so a page refresh/remount resets the expanded sections.

**Conversation (0 comments read):** The issue asks the system-health monitor to remember expanded Proxmox VM/LXC sections across reloads. It has no comments or linked implementation. The current source has a controlled Accordion and a useful per-scope in-memory map, but no persistence layer. That is a local interaction state improvement, not the requested reload persistence.

**V2 evidence:**

- packages/widgets/src/health-monitoring/cluster/cluster-health.tsx:37-50 — accordion values are initialized in useState<Record<string, string[]>> and selected by a display/visible-section scope. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/cluster/cluster-health.tsx#L37)
- packages/widgets/src/health-monitoring/cluster/cluster-health.tsx:92-99 — the controlled Accordion updates that in-memory map on change. — [source L92](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/cluster/cluster-health.tsx#L92)
- packages/widgets/src/health-monitoring/cluster/accordion-state.ts:1-13 — helper functions provide only static defaults for visible sections; they do not load or save persisted state. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/cluster/accordion-state.ts#L1)
- packages/widgets/src/health-monitoring/cluster/cluster-health.tsx:1-16 — the component imports useState but no storage or persistence helper. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/cluster/cluster-health.tsx#L1)

**Remaining / follow-up:** Persist expanded values with a stable per-widget/per-integration key, restore valid values after configuration changes, and verify privacy/storage behavior across board reloads and multiple health widgets.

### #6626 — feat: allow selecting which disks are shown in health monitoring / disks widgets

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6626) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 includes visibleStorageVolumes selectors and filtering for both System Disks and Health Monitoring, but the selector is deliberately hidden unless every selected integration is Synology. The listStorageVolumes API is also Synology-only. The filtering utility itself supports scoped integration/volume values and normalizes OMV device partitions, yet OMV users cannot reach the selector or populate its options through the current UI. The request is therefore only partially covered.

**Conversation (0 comments read):** The issue asks OMV users to choose which disks appear in health/disks widgets, especially because virtual drives lack useful SMART data, and suggests reusing the storage-volume selector. There are no comments. V2 shipped the generic-looking option and filtering logic, including OMV device-name normalization, but the integration-kind guard still makes the option unavailable for OMV. The source does not establish a complete OMV path.

**V2 evidence:**

- packages/widgets/src/system-disks/index.ts:9-35 — System Disks declares visibleStorageVolumes but hides it unless all selected integrations are Synology. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-disks/index.ts#L9)
- packages/widgets/src/health-monitoring/index.ts:35-36,85-89 — Health Monitoring has the same Synology-only visibility guard. — [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/index.ts#L35)
- packages/widgets/src/filter-storage-volumes.ts:5-28,44-68 — filtering and device-name normalization support scoped volumes, including unprefixed OMV partition forms. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/filter-storage-volumes.ts#L5)
- packages/api/src/router/widgets/health-monitoring.ts:51-63 — listStorageVolumes is explicitly described and implemented for Synology only. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/health-monitoring.ts#L51)

**Remaining / follow-up:** Expose volume discovery/options for OMV and other supported integrations with no-SMART semantics, preserve integration-scoped filtering, and verify virtual-drive exclusions in both widgets.

### #6589 — feat: 2 separate widgets for 2 separate docker instances

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6589) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 supports multiple named Docker/Podman endpoints and lets each Docker Containers widget select endpoint IDs independently. The widget passes its selected IDs to getContainers, and its totals reduce only the returned containers, so two widgets can show separate host totals. Empty selection intentionally means all endpoints. Endpoint creation/configuration remains an environment or setup concern, and a widget option alone does not add a GUI endpoint manager.

**Conversation (15 comments read):** The issue reports two Docker instances configured through comma-separated legacy host/port variables and asks for separate totals in separate widgets. The discussion initially focuses on whether v2 can connect to multiple services; later testers confirm named endpoint JSON/settings work, while the reporter clarifies that the important requirement is distinct widget totals. V2 source directly covers that distinction: endpointIds are a per-widget option and the totals are calculated from the filtered result. This addresses the issue's widget behavior; the separate historical GUI endpoint-creation request (#3266) is outside this issue.

**V2 evidence:**

- packages/widgets/src/docker/index.ts:27-47 — Docker Containers exposes a dynamic multi-select of named endpoint IDs for widget configuration. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/index.ts#L27)
- packages/widgets/src/docker/component.tsx:93-95,260-264,345-363 — selected endpoint IDs become the query input and CPU/memory totals reduce only the filtered containers. — [source L93](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L93)
- packages/api/src/router/docker/docker-router.ts:68-90 — getContainers accepts optional endpointIds and returns endpoint metadata with the filtered container data. — [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-router.ts#L68)
- packages/docker/src/endpoint-descriptor.ts:18-26,30-58; packages/docker/src/singleton.ts:52-70 — V2 defines named endpoint descriptors and reads DOCKER_ENDPOINTS with legacy host/port fallback. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/endpoint-descriptor.ts#L18), [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/singleton.ts#L52)
- apps/docs/docs/advanced/environment-variables/index.mdx:80-87 — endpoint configuration is documented as server-side environment configuration, with DOCKER_ENDPOINTS taking precedence. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/environment-variables/index.mdx#L80)

**Remaining / follow-up:** If users need endpoint creation entirely through the GUI, that is a separate feature; retain clear setup documentation and verify partial endpoint failures and endpoint-specific actions in deployment.

### #6513 — feat: Windows-style board switcher overlay (Alt-Tab style) when cycling boards

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6513) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 provides a searchable keyboard-opened board switcher with arrow/Enter navigation and previews, but it does not implement the requested hold-modifier/release-to-commit Alt-Tab overlay semantics.

**Conversation (0 comments read):** The request specifies an overlay while holding a modifier, cycling boards with Tab/arrows, committing on release, and cancelling with Escape. The implemented follow-up #6660 changed the switcher to a searchable gallery opened with Shift+C; #6393 explicitly says the Windows-style Alt-Tab overlay is out of scope for its keybind work. Thus the current experience addresses board discovery/navigation but not the interaction contract requested here.

**V2 evidence:**

- apps/nextjs/src/components/board/board-switcher.tsx:50-81 + switcher state tracks query and active board index. — [source L50](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L50)
- apps/nextjs/src/components/board/board-switcher.tsx:83-173 + 194-210 + the modal opens via Shift+C and supports arrow/Enter selection, with ordinary modal close behavior. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L83)
- apps/nextjs/src/components/board/board-switcher.tsx:316-340 + the switcher renders searchable board cards with thumbnails. — [source L316](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L316)
- reports/v2-issue-triage/source/linked-prs/6660.json:triage_merge_commit_is_ancestor_of_v2 + true; merged PR metadata describes searchable previews and keyboard navigation.
- reports/v2-issue-triage/source/linked-prs/6393.json:triage_merge_commit_is_ancestor_of_v2 + false + PR body explicitly keeps the Alt-Tab overlay out of scope.

**Remaining / follow-up:** Implement the requested modifier-held overlay if that interaction remains desired: cycle on Tab/arrows, select on modifier release, and cancel on Escape. The current Shift+C searchable modal is a usable partial substitute but does not provide those semantics.

### #6392 — feat: Switch Board via keyboard shortcut

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6392) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** Release/v2 offers a Shift+C board-switcher modal with keyboard navigation, but it does not provide the requested global next/previous shortcuts or numbered per-board shortcuts.

**Conversation (0 comments read):** The issue body and its zero comments were read. The request asks for Ctrl/Cmd+Shift+1,2,... shortcuts and, at minimum, Ctrl/Cmd+Shift+>/< cycling between boards. Timeline PR #6393 describes those shortcuts but targets dev and is not a release/v2 source fix. Current code provides a related Shift+C gallery and arrow navigation only after that modal is open; it does not cycle boards directly from any board and has no persisted per-board shortcut setting. The existing gallery reduces the request, but does not implement the requested shortcut behavior.

**V2 evidence:**

- reports/v2-issue-triage/source/6392.json:10-88 — complete feature request was read; it asks for numbered board shortcuts and next/previous cycling, with no comments.
- apps/nextjs/src/components/board/board-switcher.tsx:37-44,50-107 — the only registered global board shortcut is Shift+C, which opens the switcher and loads boards. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L37)
- apps/nextjs/src/components/board/board-switcher.tsx:119-173,316-335 — arrows navigate the open modal and links select a board; no global next/previous or numbered shortcut handler is present. — [source L119](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L119)
- packages/definitions/src/hotkeys.ts:1-10 — the global hotkey definitions contain no board-switching entries. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/hotkeys.ts#L1)
- reports/v2-issue-triage/source/linked-prs/6393.json:10-39,415 — the referenced PR proposes the requested shortcuts but its metadata marks the merge commit as not an ancestor of release/v2.

**Remaining / follow-up:** Implement and document guarded global next/previous and numbered or persisted per-board shortcuts, then verify them on release/v2 across typing contexts and board counts.

### #6155 — feat: re-open: Transfer to the existing Dashdot graphs?  #5964

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6155) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** Beszel has its own compact Mantine chart panels, but its values are not routed through the existing Dashdot CommonChart component requested by the follow-up.

**Conversation (2 comments read):** All 2 comments were read. The original request says Beszel charts consume too much vertical space and look jagged in a compact dashboard, asking to reuse Dashdot's graph rendering. The maintainer asks for a simpler demand because Beszel changed; the reporter clarifies that the feature is done only when Beszel values can be plugged into or viewed within Dashdot graphs. Current v2 improves Beszel's own chart sizing and responsive panel layout, but the implementation remains separate: BeszelStatsView renders BeszelChartPanel, whose chart wrapper configures AreaChart directly, while Dashdot's System Resources widgets import a distinct CommonChart and transform Dashdot-specific history. No adapter or shared renderer accepts Beszel data in the Dashdot path.

**V2 evidence:**

- reports/v2-issue-triage/source/6155.json:10-70,88-182 — the full request and both comments were read; the final comment defines success as Beszel values displayed within Dashdot's graphs.
- packages/widgets/src/beszel/_shared/chart.tsx:96-164 — BeszelChartPanel owns a BeszelAreaChart built directly from Mantine AreaChart with its own axes, styles, and chart props. — [source L96](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/chart.tsx#L96)
- packages/widgets/src/beszel/_shared/stats-view.tsx:292-407 — all CPU, memory, disk, I/O, network, and Docker panels render BeszelChartPanel rather than the system-resources chart component. — [source L292](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/stats-view.tsx#L292)
- packages/widgets/src/system-resources/chart/common-chart.tsx:29-55,207-223 — Dashdot/System Resources uses a separate CommonChart abstraction that chooses LineChart or AreaChart and expects its own data/series contract. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/chart/common-chart.tsx#L29)
- packages/widgets/src/system-resources/chart/network-traffic.tsx:7-43 — the Dashdot chart adapter receives numeric usageOverTime values and calls CommonChart; no Beszel integration or data adapter is imported. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/chart/network-traffic.tsx#L7)

**Remaining / follow-up:** Introduce a shared chart data contract or an explicit Beszel-to-Dashdot adapter, then expose the requested compact renderer while preserving Beszel-specific metrics and units. Beszel's separate responsive charts partially improve compactness but do not satisfy the stated reuse criterion.

### #5336 — feat: widget to display missing / queued movies & episodes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5336) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 includes a native mediaMissing widget that queries configured media-organizer integrations and displays missing movies/episodes plus queued downloads. It offers showMissing/showQueued and page-size settings, counts and partial-failure badges, an advanced two-panel view, and a compact tab view. The shared media-organizer interface and item types provide the missing/queue data required by Radarr and Sonarr.

**Conversation (3 comments read):** The issue requests a widget showing missing or queued movies and episodes, similar to Heimdall, with counts from Radarr/Sonarr. Comments include a volunteer implementation and a maintainer asking the contributor to inspect the widget package. Linked PR #6078 adds the widget and is marked merged; its merge commit is an ancestor of the V2 branch. The current source confirms the feature is available as a first-class widget, rather than only a generic custom-widget workaround.

**V2 evidence:**

- packages/widgets/src/media-missing/index.ts:10-29 — mediaMissing is a native widget with showMissing, showQueued, pageSize, and media-organizer integration configuration. — [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-missing/index.ts#L10)
- packages/widgets/src/media-missing/component.tsx:66-118,166-240 — the component queries media-organizer data, computes missing/queued totals, renders advanced panels, and provides compact tabs. — [source L66](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-missing/component.tsx#L66)
- packages/integrations/src/interfaces/media-organizer/media-organizer-integration.ts:1-6 — the native integration contract exposes missing and queue retrieval. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/media-organizer/media-organizer-integration.ts#L1)
- packages/integrations/src/interfaces/media-organizer/media-organizer-types.ts:1-26 — missing and queued entries support movie/episode metadata and progress. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/media-organizer/media-organizer-types.ts#L1)
- reports/v2-issue-triage/source/linked-prs/6078.json:9-12,34,38-39 — the linked widget PR is merged with a recorded merge commit.

**Remaining / follow-up:** No issue-specific implementation gap remains; verify integration-specific data quality separately if a particular Radarr/Sonarr version reports different queue semantics.

### #4906 — feat: Top right UI Cleanup (concept video inside)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4906) · **Quality of life** · **Partially addressed** · Confidence: **medium**

**Request:** V2 delivers a configurable header and board/command-menu redesign, but the concept issue is broad and hidden-header controls still rely on pointer/focus interaction rather than an explicit acceptance contract.

**Conversation (3 comments read):** All 3 comments were read. The issue is a concept video for cleaning up top-right controls. A reviewer specifically warns that core actions must not be mouseover-only and must remain usable by keyboard and touch; the maintainer says they are too busy to implement it but accepts contributions. Related #5272 remains unmerged.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:130-146 — v2 advertises customizable header zones plus a board switcher and command menu. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L130)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:120-157 — header items render in zones and can be hidden, with mobile layout support. — [source L120](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L120)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:166-243 — hidden-header controls use pointer enter/leave plus focus capture/blur to reveal the floating controls. — [source L166](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L166)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx:145-185,206-214 — Header Studio supports add/remove/reorder and an explicit visible toggle. — [source L145](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx#L145)

**Remaining / follow-up:** Because the source request is a visual concept without exact acceptance criteria, keep this partial. Validate keyboard, touch, screen-reader, and hidden-header discoverability against the specific video expectations.

### #4543 — feat: Edit apps inside Edit Item

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4543) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 embeds the AppForm as an App tab inside the widget edit modal and submits app changes with the widget form.

**Conversation (0 comments read):** No comments were present. The request asks for editing the linked app without leaving Edit Item, reducing clicks to change a URL. V2 contains an explicit in-place app-edit implementation.

**V2 evidence:**

- packages/widgets/src/modals/widget-edit-modal.tsx:393-417 — the modal detects an editable linked app and exposes a resource tab. — [source L393](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L393)
- packages/widgets/src/modals/widget-edit-modal.tsx:452-466 — modal submission calls the embedded app form's submitIfDirty before saving the widget. — [source L452](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L452)
- packages/widgets/src/modals/widget-edit-modal.tsx:681-697 — the App tab renders EmbeddedAppEditForm inside Edit Item. — [source L681](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L681)
- packages/widgets/src/modals/embedded-app-edit-form.tsx:22-58,80-95 — the embedded form loads, updates, invalidates, and submits the selected app without separate navigation. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/embedded-app-edit-form.tsx#L22)

**Remaining / follow-up:** No material gap for the stated request. Permission gating is intentional: the App tab appears only for users with app-modify-all.

### #4533 — feat: show Description next to title for application

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4533) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** The v2 App widget can render icon, title, and normal description in a horizontal row, with responsive sizing and truncation.

**Conversation (2 comments read):** Both comments were read. The request asks for an app description next to the title, with the icon on the left and title/description to its right; the old presentation stacked content. V2's app layout options include horizontal row modes and the component renders title and description together in the text stack.

**V2 evidence:**

- packages/widgets/src/app/index.ts:54-87 — App widget layout options include row and row-reverse in addition to column modes. — [source L54](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/index.ts#L54)
- packages/widgets/src/app/component.tsx:36-83 — row mode uses a horizontal Flex and renders title plus normal description in one Stack beside the icon. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L36)
- packages/widgets/src/app/component.tsx:85-97 — the icon is a separate image element and the text supports line clamping. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L85)

**Remaining / follow-up:** The default remains column layout, so users must choose a horizontal layout for this arrangement. Verify whether the reporter expected horizontal to become the default rather than an available option.

### #4455 — feat: Ability to disable users without deleting them.

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4455) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 has no persisted disabled-user state, admin toggle, or authentication/session enforcement for disabling an account.

**Conversation (3 comments read):** All 3 comments were read. The requester wants an admin-only toggle to block service accounts such as Authentik or LDAP search users while leaving those accounts available to other services. One maintainer suggests using the identity provider instead; a later comment says a Homarr-side implementation is reasonable for credentials users if login, API keys, and sessions are revoked. Current v2 source has no disabled column, user-list status/action, or checks in credentials, LDAP, or session handling. Linked PR #6214 describes this feature but is open/draft metadata and is not evidence of the current release/v2 source.

**V2 evidence:**

- reports/v2-issue-triage/source/4455.json:10-81,99-241 - the full request and all three comments were read, including the identity-provider discussion and proposed session behavior.
- packages/db/schema/sqlite.ts:48-75 - the v2 user table has provider, preferences, and board fields but no disabled/status column. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/schema/sqlite.ts#L48)
- packages/auth/providers/credentials/authorization/basic-authorization.ts:13-39 - credentials authorization finds the user and checks the password without a disabled predicate. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/basic-authorization.ts#L13)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:101-139 - LDAP users are queried or created and returned without a disabled check. — [source L101](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L101)
- packages/auth/callbacks.ts:38-60 - the session callback reloads colorScheme and permissions only, with no disabled-session invalidation. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/callbacks.ts#L38)
- apps/nextjs/src/app/[locale]/manage/users/_components/user-list.tsx:19-75 - the admin table shows name/email and has row actions disabled, with no status or disable control. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/_components/user-list.tsx#L19)
- reports/v2-issue-triage/source/linked-prs/6214.json:10-39 - the linked change remains open/draft metadata; its description is not treated as implementation evidence.

**Remaining / follow-up:** Add a migration-backed disabled flag, admin-only enable/disable mutation and UI, and enforcement across every authentication method, API-key issuance/use, and active-session validation. Define behavior for external-provider users before implementing.

### #4361 — feat(media-releases): support selection of user for library fetching

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4361) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The Emby Media Releases widget still has no user-selection option and still chooses the first public Emby user for latest-media queries.

**Conversation (3 comments read):** All 3 comments were read. The original report describes a new Emby Media Releases item failing with No users found. A maintainer explains that the implementation fetches public users and takes the first one; the reporter fixes the immediate error by enabling an Emby public user. The final comment changes the issue into a feature request for selecting the library user, referencing the dynamic select work. V2 retains the first-public-user behavior and passes only integration IDs through the widget and request handler. The workaround resolves the reporter's configuration error but does not implement the requested per-widget user choice or provide a graceful no-public-user path.

**V2 evidence:**

- reports/v2-issue-triage/source/4361.json:10-79,97-239 - the full bug report and all three comments were read, including the public-user workaround and feature-request change.
- packages/integrations/src/emby/emby-integration.ts:224-245 - getMediaReleasesAsync fetches public users, selects users.at(0)?.id, and throws No users found when the list is empty. — [source L224](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L224)
- packages/integrations/src/emby/emby-integration.ts:290-308 - the user list is fetched from /Users/Public and mapped to IDs/names, with no selected-user input. — [source L290](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L290)
- packages/widgets/src/media-releases/index.ts:8-39, packages/widgets/src/media-releases/component.tsx:39-53 - the widget options and query contain layout/display settings and integrationIds only, with no user field. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/index.ts#L8), [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/component.tsx#L39)
- packages/request-handler/src/media-release.ts:7-17, packages/api/src/router/widgets/media-release.ts:10-17 - the request input is an empty record and always invokes the integration without a user selection. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/media-release.ts#L7), [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/media-release.ts#L10)

**Remaining / follow-up:** Expose a validated Emby user option through the widget settings, request handler, and integration method; list users with appropriate permissions and handle an empty or deleted selection without throwing an opaque integration error.

### #4330 — feat(icon-picker): show more than 12 icons per source

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4330) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** The v2 icon picker requests 24 icons per repository instead of the old 12, but it still has no Show more control or pagination to reach the rest. The exact feature was proposed in closed, unmerged PR #6248 and is not present at this HEAD.

**Conversation (2 comments read):** The author explains that repositories such as Nextcloud have more than 12 matching icons and asks for an extended list button. Two comments only correct the issue-template labeling. The timeline cross-references PR #6248, whose body implements 12→48→192→500 pagination and says it closes #4330, but the PR was closed without merging. The current v2 picker has a fixed 24 request and renders that result.

**V2 evidence:**

- reports/v2-issue-triage/source/4330.json:1 — the complete body and both full comments were read, including the more-than-12 and issue-template discussion.
- packages/forms-collection/src/icon-picker/icon-picker.tsx:85-88 — the current picker sends a fixed limitPerGroup of 24 on every search. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L85)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:180-195 — results are rendered directly with no truncation metadata or Show more action. — [source L180](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L180)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:213-219 — the loading state is fixed at 12 skeletons, with no pagination state. — [source L213](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L213)
- packages/api/src/router/icons.ts:17-30,36-50 — the API accepts a 1-500 limit and slices results, so the missing behavior is in the picker UI rather than an inability of the backend to return more. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/icons.ts#L17)
- packages/validation/src/icons.ts:3-6 — the schema permits up to 500 icons per repository while defaulting to 12. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/icons.ts#L3)
- reports/v2-issue-triage/source/linked-prs/6248.json:10-12,34-39 — the unmerged PR explicitly describes the requested Show more steps and has merged_at null.

**Remaining / follow-up:** Add bounded pagination or progressive loading with a visible control and a way to know whether a repository is truncated. Keep search reset and performance behavior explicit; the current 24-result increase only reduces the symptom.

### #4157 — feat: Download Client Item - Job Name column should be wider than the rest.

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4157) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** The download widget now gives the job/name column a wider 240px default and supports resizing/persisting table column widths, directly covering the request.

**Conversation (4 comments read):** The original request complained that job names were clipped by equal-width columns. A community reply supplied a custom CSS workaround; the requester confirmed it worked but noted the header issue, which was corrected as a CSS comment syntax mistake. The linked v2 PR #6784 explicitly resolves this issue with a stable wider default plus resize persistence and is merged into release/v2.

**V2 evidence:**

- packages/widgets/src/downloads/component.tsx:507-513 + the current name column has a 240px width rather than the former equal narrow width. — [source L507](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L507)
- packages/widgets/src/downloads/component.tsx:356-362 + table layout/column width state is persisted for the widget. — [source L356](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L356)
- packages/widgets/src/downloads/component.tsx:419-429 + current table data and sorting use the resized table model. — [source L419](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L419)
- reports/v2-issue-triage/source/linked-prs/6784.json:triage_merge_commit_is_ancestor_of_v2 + true; PR metadata says the 240px default, resizable/persisted columns, and #4157 resolution are merged into release/v2.

**Remaining / follow-up:** Users may still tune widths for unusually long names, but no issue-level implementation gap remains. A browser check can verify the persisted resize interaction.

### #4143 — feat: separate region from language

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4143) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 still couples display localization to the selected language and has no independent persisted user region or timezone preference.

**Conversation (2 comments read):** All 2 comments were read. The requester wants English UI text while retaining a Swedish/local region so calendar and release times are easier to read. A maintainer asks whether the change is wanted; another member agrees but notes possible localization-library difficulty. Current v2 user preferences expose locale, first day of week, and byte units, but no region or timezone field. Day.js loads its locale from the route language, while the clock defaults to the browser's resolved timezone unless each widget has a custom timezone. This does not provide the requested user-level separation or guarantee that integrated calendar formatting follows a chosen region.

**V2 evidence:**

- reports/v2-issue-triage/source/4143.json:10-81,99-194 - the full request and both comments were read; the request explicitly separates English language from local region/time display.
- packages/settings/src/preferences/definitions.ts:1-10,31-44 - user preferences define locale, firstDayOfWeek, and byteUnitSystem but no region/timezone preference. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/settings/src/preferences/definitions.ts#L1)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx:53-65,334-370 - the profile form offers language and calendar week-start controls, with no region or timezone setting. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx#L53)
- packages/translation/src/dayjs.ts:16-27 - Day.js localization is selected from the current route locale, so language and date locale remain coupled. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/dayjs.ts#L16)
- packages/widgets/src/clock/component.tsx:16-23, packages/widgets/src/clock/world-clock.ts:64-67 - a clock can use an individual custom timezone, otherwise it resolves the browser timezone; neither is a persisted region preference. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/component.tsx#L16), [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/world-clock.ts#L64)

**Remaining / follow-up:** Add a persisted independent locale/region or timezone preference and apply it consistently to calendar dates, release times, and default clock behavior. Keep the per-widget timezone override as a more specific setting.

### #3990 — feat: Allow one URL and just map ports for each app

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3990) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 adds one base origin with host-port, subdomain, or reverse-proxy path generation for onboarding and Docker reconciliation, but it does not provide a persistent list of selectable base addresses or dynamic app URL references.

**Conversation (2 comments read):** All 2 comments were read. The request asks for reusable base addresses such as LAN IPs and domains, selecting one while configuring an app and appending its port, plus easy HTTP/HTTPS switching. A follow-up asks that detected app URLs default to the current Homarr domain/IP and port. V2 covers a substantial workflow slice: URL builders derive service/app addresses from one origin and a detected/default port; onboarding applies them to discovered integrations and apps; and Docker management initializes the origin from request headers and persists one origin and mode in browser local storage. The implementation still stores concrete href/serverUrl values in drafts and app records, and the UI has only one origin field rather than a managed list with per-app selection. Changing an origin therefore does not rewrite existing manually configured apps. The current feature is useful for setup/reconciliation but does not meet the full persistent-address model.

**V2 evidence:**

- packages/definitions/src/integration-url-template.ts:7-65 - hostPort, subdomain, and path modes build service/app URLs from one base host and an optional Docker port. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration-url-template.ts#L7)
- packages/onboarding/src/setup-studio.tsx:171-178,219-238,263-316 - onboarding keeps one serverOrigin/mode state and regenerates discovered app/integration draft URLs with detected published ports. — [source L171](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/setup-studio.tsx#L171)
- apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:21-33 - Docker reconciliation receives the current request's base origin as the default template host. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx#L21)
- apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx:91-98,161-166 - Docker management persists one origin and one URL mode in localStorage and applies them to candidates. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx#L91)
- packages/validation/src/app.ts:3-20 - app records validate/store a concrete href string; there is no base-address reference or port-only field. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/app.ts#L3)
- reports/v2-issue-triage/source/3990.json:1-203 - both the original request and translated follow-up were read; the follow-up's current-origin behavior is covered only for discovered setup candidates.

**Remaining / follow-up:** Add a server- or user-scoped base-address registry, app-level selection/reference semantics, and a deliberate update/migration policy for existing hrefs. Preserve the current one-origin template as a convenient setup default.

### #3904 — feat: GPU usage in Dash component

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3904) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 supports an optional GPU chart in System Resources, fetches Dashdot GPU data, and leaves GPU unselected by default so installations without GPU telemetry continue to work.

**Conversation (3 comments read):** All 3 comments were read. The requester asks for GPU percentage usage from Dashdot's NVIDIA image after losing the capability during the pre-1.0 transition. A maintainer notes that GPU reporting can vary, while the follow-up agrees to expose it through chart selection and keep it disabled by default. V2 implements that contract: the resource options include gpu alongside CPU, memory, and network; toChartItem averages processorUtilization across the returned GPU devices; and the component renders SystemResourceGPUChart when selected. Dashdot requests /load/gpu and maps memory and processor utilization, while request failures degrade to an empty GPU list. The default visible chart set excludes GPU, matching the discussion, but users can opt in where Dashdot supplies data.

**V2 evidence:**

- packages/widgets/src/system-resources/index.ts:16-38 - visibleCharts includes gpu and defaults to cpu, memory, and network, leaving GPU opt-in. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/index.ts#L16)
- packages/widgets/src/system-resources/component.tsx:40-53,287-295 - GPU processor utilization is averaged into ChartItem.gpu and rendered through SystemResourceGPUChart when visible. — [source L40](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L40)
- packages/integrations/src/dashdot/dashdot-integration.ts:28-36,61-68 - Dashdot requests GPU data with the other metrics and maps memory/processor utilization fields. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/dashdot/dashdot-integration.ts#L28)
- packages/integrations/src/dashdot/dashdot-integration.ts:164-173 - GPU endpoint failures are caught and converted to an empty result, so unsupported installations do not make the widget fail. — [source L164](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/dashdot/dashdot-integration.ts#L164)
- reports/v2-issue-triage/source/3904.json:1-203 - all three comments were read, including the request to make GPU selectable but unselected by default.

**Remaining / follow-up:** No source-level implementation gap remains. GPU visibility and telemetry still depend on a Dashdot build that exposes /load/gpu; live hardware verification was outside this triage.

### #3887 — feat: allow no network for system resources and allow proxmox to be used

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3887) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 hides the network chart when no network history exists, but Proxmox remains excluded from the System Resources integration selector and only supplies cluster health data.

**Conversation (3 comments read):** All 3 comments were read. The reporter can select Proxmox and Dashdot for System Health Monitoring but only Dashdot for System Resources, despite the documentation suggesting broader support. Maintainers explain that Proxmox does not expose the expected host network data, propose hiding unsupported network output, and leave open the possibility of a future partial network view. V2 implements the safe no-network behavior: the widget filters the network chart when no network samples exist. It does not implement Proxmox as a System Resources provider; the widget integration map's system list contains Dashdot and other system-health integrations, while Proxmox is placed in a separate cluster list. ProxmoxIntegration implements only IClusterHealthMonitoringIntegration, so selecting it for the resource widget remains impossible. The reporter's two requested parts therefore have different dispositions.

**V2 evidence:**

- packages/definitions/src/widget-integration-map.ts:16-33,59-68 - healthMonitoring accepts a separate Proxmox cluster list, while systemResources uses only healthMonitoringSystemIntegrationKinds and excludes Proxmox. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L16)
- packages/integrations/src/proxmox/proxmox-integration.ts:24-50 - ProxmoxIntegration implements IClusterHealthMonitoringIntegration and exposes cluster resources, with no system-health/network interface for System Resources. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/proxmox/proxmox-integration.ts#L24)
- packages/widgets/src/system-resources/component.tsx:67-85,227-235 - configured charts are filtered by available GPU/network data and network is omitted when getNetworkHistory has no samples. — [source L67](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L67)
- packages/widgets/src/system-resources/index.ts:22-38 - the resource widget offers CPU, memory, GPU, and network chart choices but its integration config comes from the restricted system list. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/index.ts#L22)
- reports/v2-issue-triage/source/3887.json:1-203 - all three comments were read; maintainers explicitly separate unsupported Proxmox network data from the requested selector behavior.

**Remaining / follow-up:** Either add a Proxmox-compatible System Resources adapter with clearly defined network semantics or update the widget documentation/selector wording to describe cluster-only Proxmox support. No network-chart handling gap remains for integrations that return no network samples.

### #3853 — feat: Allow Docker stats widget to be seen without admin privileges

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3853) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The Docker widget still depends on an admin-only getContainers procedure. Its UI queries that procedure for container state and CPU/memory data, while the API explicitly requires the admin permission; the endpoint filter only changes which endpoints are queried. Actions are also admin-only. Consequently a non-admin cannot see the requested Docker stats through the native widget.

**Conversation (2 comments read):** The issue requests read-only Docker statistics for ordinary users while keeping interaction restricted and preferably making access configurable. The discussion proposes treating Docker as a normal integration with an access setting rather than granting the widget blanket power. No comment or timeline entry shows that a permission split landed in V2. Generic widget extensibility does not alter the native Docker procedure's authorization.

**V2 evidence:**

- packages/widgets/src/docker/component.tsx:242-265 — the native widget obtains all container rows and statistics through docker.getContainers. — [source L242](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L242)
- packages/api/src/router/docker/docker-router.ts:68-90 — getContainers is declared with requiresPermission("admin"), even when endpointIds is supplied. — [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-router.ts#L68)
- packages/api/src/router/docker/docker-router.ts:101-108 — container actions retain explicit admin protection, so a future read-only split would need separate procedure authorization. — [source L101](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-router.ts#L101)
- packages/widgets/src/docker/index.ts:27-47 — endpoint selection is a filtering option and does not change the required permission. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/index.ts#L27)

**Remaining / follow-up:** Introduce a deliberately scoped read permission or per-board/integration access policy for Docker stats, then retain admin-only mutations and validate that sensitive container data is appropriate for that audience.

### #3843 — feat: Ability to set the border color or transparency of tables in the Notebook widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3843) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** Notebook table cells still use a hardcoded border style and the table toolbar exposes background color but no border color/transparency control.

**Conversation (2 comments read):** The requester distinguishes configurable cell color/transparency from missing cell-border controls. A maintainer said this was not a use case to support and suggested custom CSS; another commenter offered to investigate CSS and posted a no-border rule. That workaround does not provide a native per-table border color/transparency setting.

**V2 evidence:**

- packages/widgets/src/notebook/notebook.css:24-45 + table and cell borders are hardcoded with !important styles. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.css#L24)
- packages/widgets/src/notebook/notebook.tsx:188-204 + the Table/TableCell model exposes backgroundColor but no border color, width, or transparency option. — [source L188](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L188)
- packages/widgets/src/notebook/notebook.tsx:347-362 + the toolbar contains table structure controls but no border styling control. — [source L347](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L347)
- apps/docs/docs/management/settings/index.mdx:59-64 + docs describe global custom CSS, which is only a workaround for the requested native control. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/settings/index.mdx#L59)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:138 + V2 custom CSS support does not establish a table-specific editor option. — [source L138](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L138)

**Remaining / follow-up:** Add a supported table border color/transparency option to notebook table configuration, or explicitly document that global/custom CSS is the intended permanent scope. Current CSS can remove borders but cannot fulfill the requested UI control.

### #3778 — feat(boards): configure default behaviour for open in new tab

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3778) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 retains a per-app-widget openInNewTab switch, but has no board-level default for newly added apps.

**Conversation (1 comments read):** The one comment was read. The reporter asks for a board setting that controls whether clicking apps opens the same tab or a new tab by default, analogous to other board defaults. The current option remains attached to each app widget.

**V2 evidence:**

- packages/widgets/src/app/index.ts:20-25 — openInNewTab is an app widget option with defaultValue true, not a board setting. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/index.ts#L20)
- packages/widgets/src/app/component.tsx:141-148 — the anchor target is selected from the individual widget option. — [source L141](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L141)
- packages/validation/src/user.ts:147-151 — the only nearby openInNewTab setting is a user search preference, not a board/app-click default. — [source L147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/user.ts#L147)
- packages/widgets/src/bookmarks/index.tsx:47-52 — bookmarks also own a separate per-widget new-tab switch, reinforcing that no shared board default exists. — [source L47](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L47)

**Remaining / follow-up:** Implement a board/user default and apply it when creating app widgets, while preserving explicit per-widget overrides for existing items.

### #3771 — feat(boards): open all apps

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3771) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports opening all apps within an individual container, including nested containers, but it has no board-wide action in the board header. The exact original request remains partially addressed; the referenced board-wide PR #6125 is closed and unmerged.

**Conversation (1 comments read):** The author asks for the top dropdown to open all apps across all categories, referring back to #1928, and one commenter volunteers to implement it. The timeline later cross-references PR #6125. That PR's body describes the exact board-header action and says it closes #3771, but its metadata says it was closed without merging and its merge commit is not an ancestor of v2. The current v2 code implements only per-container actions.

**V2 evidence:**

- reports/v2-issue-triage/source/3771.json:1 — the complete body and one full comment were read, including the board-wide/top-dropdown request.
- apps/nextjs/src/components/board/sections/container-section.tsx:34-37,131-147 — the current UI places an Open all action on each container section, not in the board header. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L34)
- apps/nextjs/src/components/board/sections/use-open-section-apps.ts:39-75,78-128 — the helper recursively collects app items inside the requested container and opens those URLs. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/use-open-section-apps.ts#L39)
- reports/v2-issue-triage/source/linked-prs/6125.json:10-12,34-39 — PR #6125 explicitly adds the board-wide header action and references #3771, but is closed with merged_at null and is not in the v2 ancestry.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-85 — v2's board editor/container redesign does not claim a board-wide open-all action. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)

**Remaining / follow-up:** Promote the shared app-opening helper to the board header, define how nested/duplicated apps and popup blockers behave, and verify it is available in view mode for read-only users as requested by the unmerged PR.

### #3758 — feat(release-widget): synchronize marked as viewed over multiple devices

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3758) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** Release-widget viewed versions are still stored in browser localStorage under one device's key. There is no per-user persisted state or server mutation, so marking a release viewed does not synchronize across devices.

**Conversation (2 comments read):** The author likes the viewed-release option but asks for it to follow the user across devices. Two comments discuss that the current implementation is localStorage-only and would need per-user widget or account data; the timeline contains no merged implementation.

**V2 evidence:**

- reports/v2-issue-triage/source/3758.json:1 — the complete body and both full comments were read; the request is cross-device synchronization of viewed release state.
- packages/widgets/src/releases/component.tsx:63-66 — viewed releases are initialized from localStorage with key releases-viewed-versions. — [source L63](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L63)
- packages/widgets/src/releases/component.tsx:185-190 — marking a release viewed updates only the local state/localStorage setter and does not call an API mutation. — [source L185](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L185)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-53 — v2's typed Custom Widget settings and encrypted fixed-origin credentials do not describe server-side persistence for native release-widget viewed state. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)

**Remaining / follow-up:** Persist viewed repository/version state per authenticated user, define behavior for multiple boards and repository renames, and migrate or merge existing localStorage values. Cross-device behavior needs an authenticated read/write path.

### #3732 — Release Widget: Icon only

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3732) · **Quality of life** · **Needs verification** · Confidence: **medium**

**Request:** V2 has compact and advanced release layouts and allows the release version text to shrink, while compact icon-only mode hides the repository name. The requested visual behavior for 1x1 versus 2xY dimensions is not explicitly encoded, so source inspection cannot establish that the screenshot request is satisfied.

**Conversation (0 comments read):** The body praises icon-only mode and asks whether the release widget can resemble the attached design: retain the icon-only presentation at 2xY but switch to 1xY, where the version number disappears at 1x1. There are no comments. The current code restores compact v1 surfaces but does not contain a width/height-specific rule for hiding the version.

**V2 evidence:**

- reports/v2-issue-triage/source/3732.json:1 — the complete screenshot-based request was read; full_comments is empty.
- packages/widgets/src/releases/component.tsx:63-68 — viewed releases are localStorage-backed and the column count depends only on advanced display mode and width; there is no 1x1 version-visibility branch. — [source L63](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L63)
- packages/widgets/src/releases/component.tsx:251-275 — compact icon-only mode can hide the repository name, but the latest version text remains rendered with flexShrink and end truncation. — [source L251](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L251)
- packages/widgets/src/releases/component.tsx:278-328 — release-date/status content is kept as a non-shrinking group, which can compete with the version text at narrow widths. — [source L278](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L278)
- packages/widgets/src/releases/component.module.scss:9-29 — the header has general width/focus rules but no responsive selector that hides the version for a one-cell widget. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.module.scss#L9)

**Remaining / follow-up:** Render the widget at the actual 1x1, 2x1, and 2xY v2 dimensions in compact icon-only mode and compare with the requested design. If the version should disappear at a threshold, encode and document that responsive rule; otherwise record the exact supported behavior.

### #3595 — feat: Focus search bar like pre 1.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3595) · **Quality of life** · **Partially addressed** · Confidence: **medium**

**Request:** V2 focuses the actual Spotlight search input when Spotlight opens, including after the header search control is clicked, but the persistent header search control itself is not an editable or automatically focused input. DesktopSearchInput is rendered as an UnstyledButton and MobileSearchButton is a button; opening Spotlight is required before typing into the focused field. This covers fast search entry after activation, not autofocus on page load/refresh.

**Conversation (1 comments read):** The issue asks for the pre-1.0 behavior of focusing the search bar on a new tab or refresh. The only comment says the current search bar is a button and suggests that implementing this would likely require Spotlight or a query parameter. V2 adopts Spotlight as the search surface and adds hotkeys, so the interaction model changed: users click the header control or invoke a hotkey, then receive focus in the modal. Nothing in the timeline establishes automatic focus immediately on board load.

**V2 evidence:**

- apps/nextjs/src/components/layout/header/search.tsx:12-27,31-41 — desktop and mobile header search controls are buttons that call openSpotlight rather than inputs that can receive page-load focus. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/search.tsx#L12)
- packages/spotlight/src/components/spotlight.tsx:111-133,165-205 — Spotlight holds an input ref and focuses it after mount and on open. — [source L111](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/spotlight/src/components/spotlight.tsx#L111)
- apps/nextjs/src/components/layout/header/lazy-spotlight.tsx:24-65 — Spotlight is mounted lazily on an open event or after preload, so it is not necessarily present/focused on a fresh page render. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/lazy-spotlight.tsx#L24)

**Remaining / follow-up:** Decide whether V2 should autofocus/open Spotlight on board entry or expose a focusable persistent search field; if the original behavior remains desired, add a page-load/new-tab trigger and verify keyboard focus accessibility.

### #3515 — feat: Personalize the upper right menu bar

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3515) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2's Header Studio supports per-user header item visibility, ordering, and placement across left, center, and right zones.

**Conversation (2 comments read):** Both comments were read. The request asks users to reorder individual upper-right controls and hide controls such as Docker, settings, theme, or board actions. V2 explicitly ships a customizable header and the implementation covers the requested controls and persistence.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:130-134 — the release describes choosing header buttons, changing their order, and placing them in left/center/right zones. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L130)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:60-71,120-145 — the renderer consumes saved header zones and renders each zone separately on desktop/mobile. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L60)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx:121-165,167-185 — Header Studio lists inactive controls, adds/removes them, and supports drag reorder/moving between zones. — [source L121](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx#L121)
- packages/validation/src/header-preferences.ts:83-110,207-223 — preferences validate unique zones, retain account access, and define persisted defaults. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/header-preferences.ts#L83)

**Remaining / follow-up:** No material gap for the stated request. Verify the specific mobile/desktop arrangement only if the reporter expected separate per-device custom layouts.

### #3478 — feat(login): add possibility to specify forgot password link

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3478) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The login page still shows the built-in CLI reset instruction and has no server setting for an external password-reset URL.

**Conversation (5 comments read):** All 5 comments were read. The reporter clarified that a server setting should replace the command-line reset-password details with a custom external link, for installations that delegate password recovery to another system. No comment indicates implementation or closure.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx:194-220 — the forgot-password area hardcodes the homarr reset-password command and has no configurable href. — [source L194](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx#L194)
- packages/server-settings/src/index.ts:5-16,42-55 — server setting keys and branding schema contain no forgot-password/reset URL field. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L5)
- packages/server-settings/src/index.ts:127-157 — default settings likewise provide no password-recovery link configuration. — [source L127](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L127)

**Remaining / follow-up:** Add a validated server-level URL and render it in the login form, while retaining a useful local-reset path when unset.

### #3371 — feat: upload video backgrounds

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3371) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 can render a background video URL, but the actual board-background upload path remains image-only. The shared upload validator accepts only five image MIME types, the file picker uses that same list, and the background settings page filters library media to images. Thus an MP4/WebM cannot be selected or accepted through the normal UI despite the existing renderer. A related PR was closed without merge and is not an ancestor of V2.

**Conversation (2 comments read):** The original report describes MP4 upload failing with a 400 invalidFileType response and asks for video types plus a possible 32 MiB limit. Comments reclassify it as a feature, discuss increasing the limit, and include an offer to implement it. Linked PR #6139 specifically claims MP4/WebM validation, picker, extension-aware URLs, and preview changes, but its metadata says closed, unmerged, and not an ancestor of V2. The current source confirms those changes did not land in this release branch.

**V2 evidence:**

- packages/validation/src/media.ts:6-34 — supportedMediaUploadFormats contains only image MIME types and the schema rejects all video types before the 32 MiB check. — [source L6](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/media.ts#L6)
- packages/forms-collection/src/upload-media/upload-media.tsx:17-55 — the upload control accepts the shared image-only list. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/upload-media/upload-media.tsx#L17)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_background.tsx:30-37,104-120 — background media is filtered to image/* and the upload control has no video override. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_background.tsx#L30)
- apps/nextjs/src/components/layout/background.tsx:6-7,31-58 — a video renderer exists for URL extensions, so rendering support does not make uploads work. — [source L6](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/background.tsx#L6)
- reports/v2-issue-triage/source/linked-prs/6139.json:9-12,34,38-39,370 — the proposed fix is closed with no merge commit and is not an ancestor of V2.

**Remaining / follow-up:** Allow an explicit video MIME set for board backgrounds, preserve image-only behavior for other media flows, return extension-aware media URLs, and update media listing/preview behavior and the upload-size contract.

### #3055 — feat: Provide SSO user information - groups and other auth info

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3055) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 synchronizes some external group claims into Homarr's local group membership, but it does not expose the requested SSO information to users or administrators. OIDC profile extraction is limited to configured name and groups paths, the session contains database user fields and permissions, and the user API returns database fields only. There is no raw claims, provider metadata, or general SSO information panel in the user-management view.

**Conversation (0 comments read):** The issue asks Homarr to display all available SSO user information, using Jenkins and Azure AD group data as examples, and references a related issue. There are no comments adding a narrower scope or documenting a fix. The current group synchronization is an internal authorization behavior rather than a display feature: external groups are consumed during sign-in and mapped to Homarr groups, while the request seeks visibility into groups and other authentication claims.

**V2 evidence:**

- packages/auth/events.ts:33-45,57-81 — OIDC groups are read from a configured path and synchronized, while only name and picture are persisted from the profile. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L33)
- packages/auth/session.ts:21-54; packages/auth/callbacks.ts:38-60 — sessions expose stored user fields, color scheme, and permissions; raw SSO claims are not added. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/session.ts#L21), [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/callbacks.ts#L38)
- packages/api/src/router/user.ts:353-425 — getById returns database/profile settings fields and provider, with no external groups or claims. — [source L353](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/user.ts#L353)
- packages/auth/providers/oidc/profile.ts:5-22 — configurable profile-path access is used for extraction, not for retaining or rendering a complete profile. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/profile.ts#L5)

**Remaining / follow-up:** Add an intentional, permission-scoped SSO details surface and define which claims are retained and safe to display, including external groups and provider metadata.

### #2657 — feat(auth): support object path for groups and username claims

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2657) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 resolves dot-separated OIDC claim paths for both external group synchronization and the configurable username claim.

**Conversation (4 comments read):** All 4 comments were read. The original Keycloak report used resource_access.homarr.roles and failed because only a first-level profile key was checked. The maintainer described the recursive-path fix, and the reporter then confirmed a flat-array workaround and invited closure; the issue was renamed to a low-priority feature request. Timeline later cross-references PR #6294, which is still open against dev, but the release/v2 source already contains the path resolver and uses it in both affected flows. Current SSO documentation also advertises dot-separated paths.

**V2 evidence:**

- packages/auth/providers/oidc/profile.ts:5-12 — getProfileValueByPath walks each dot-separated segment through nested profile objects and returns undefined for missing/non-object segments. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/profile.ts#L5)
- packages/auth/events.ts:33-38 — OIDC group synchronization reads AUTH_OIDC_GROUPS_ATTRIBUTE through getProfileValueByPath and accepts the nested array. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L33)
- packages/auth/providers/oidc/profile.ts:15-22 — AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE is resolved through the same helper and type-checked as a string. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/profile.ts#L15)
- apps/docs/docs/advanced/single-sign-on/index.mdx:205-207 — the v2 SSO reference documents nested paths for both groups and name attributes. — [source L205](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L205)
- packages/auth/test/events.spec.ts:161-171, packages/auth/providers/oidc/test/profile.spec.ts:30-38 — focused fixtures cover nested group and profile claim paths. — [source L161](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/test/events.spec.ts#L161), [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/test/profile.spec.ts#L30)

**Remaining / follow-up:** No issue-level implementation gap remains for the reported nested Keycloak claim. The linked PR #6294's open/dev status should not override the directly inspected release/v2 implementation; deployment-specific verification is optional.

### #2555 — feat: add settings to configure file upload limit

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2555) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The media upload limit remains a hardcoded 32 MiB validation and single-request upload; there is no server setting or chunked upload path to raise it.

**Conversation (1 comments read):** The request asks for a server setting controlling the maximum upload size. The sole maintainer response explains that the 32 MiB reverse-proxy client_max_body_size also has to be handled and suggests file.slice-based chunking for larger files. That response makes the infrastructure and protocol requirement part of the scope.

**V2 evidence:**

- packages/validation/src/media.ts:6-12 + 24-35 + supported media validation still uses a literal 1024 * 1024 * 32 maximum and documents the nginx limit. — [source L6](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/media.ts#L6)
- packages/api/src/router/medias/media-router.ts:55-76 + upload handling accepts the complete file buffer in one request and exposes no configurable limit or chunk protocol. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/medias/media-router.ts#L55)
- packages/forms-collection/src/upload-media/upload-media.tsx:17-38 + 52-55 + the client places selected files in one FormData submission. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/upload-media/upload-media.tsx#L17)
- apps/nextjs/src/app/api/backup/import/route.ts:253-258 + the backup import path also has a separate fixed 256 MiB bound, rather than a general upload-size setting. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/backup/import/route.ts#L253)

**Remaining / follow-up:** Provide a documented server/per-file limit and coordinate it with the proxy, or implement resumable/chunked uploads so files above 32 MiB can be accepted safely. The current backup-specific bound does not implement the requested media setting.

### #2508 — feat: log source ip for failed login attempts

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2508) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 still does not record the source IP for failed credential logins. It emits a generic failed-login warning and username/password outcome logs, while the available IP logging is on the API-key session path and does not cover the requested web login failures.

**Conversation (3 comments read):** The issue originated in discussion #2308 and asks for failed-login source IPs so operators can build a CrowdSec collection. The three comments explain that the existing logs expose a username-not-found message or Auth.js CredentialsSignin but no source address, warn that forwarded headers need careful handling, and link related #2080. The timeline includes duplicate classification but no implementation.

**V2 evidence:**

- reports/v2-issue-triage/source/2508.json:1 — the complete body and all three full comments were read, including the CrowdSec use case and X-Forwarded-For caution.
- packages/auth/configuration.ts:49-59 — CredentialsSignin failures are collapsed into a generic warning with no request metadata. — [source L49](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/configuration.ts#L49)
- packages/auth/providers/credentials/authorization/basic-authorization.ts:17-31 — username lookup and incorrect-password logs include userName only; the authorization function has no source-IP field. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/basic-authorization.ts#L17)
- packages/auth/events.ts:84 — successful sign-in logging includes user id, username, and timestamp but no source address, and this event does not add the missing failed-attempt address. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L84)
- packages/auth/api-key/get-api-key-session.ts:22-36,58-73 — IP handling exists for API-key authentication, which is a different path and does not resolve failed browser credential login logging. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/api-key/get-api-key-session.ts#L22)

**Remaining / follow-up:** Capture a trustworthy client address at the authentication boundary, define proxy trust and forwarded-header precedence, and include it in failed credential login records/logs suitable for CrowdSec. Add retention and privacy decisions before calling the issue fixed.

### #2495 — feat: Redirect to login page if not logged in

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2495) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** Anonymous users are redirected with a callback for some missing board paths, but existing public boards and management paths do not uniformly preserve the requested destination.

**Conversation (1 comments read):** The single comment was read. The reporter asked any board URL, including an invalid one, to send anonymous users to login and return them to the original URL after authentication; the comment broadened the usability request to /manage while acknowledging that anonymous endpoints are intentional.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx:48-64 — a missing board for an anonymous user redirects to /auth/login with a board callbackUrl, while authenticated missing boards return notFound. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx#L48)
- apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx:51-57 — the layout redirects anonymous missing-board cases to login without preserving a callback. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx#L51)
- apps/nextjs/src/app/[locale]/auth/login/page.tsx:23-28,60-65 — login sanitizes and forwards callbackUrl, defaulting to /. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/page.tsx#L23)
- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-46 — management pages use their own authentication redirects; the current route does not establish a universal callback-preserving guard. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)

**Remaining / follow-up:** Existing public boards intentionally render without login, and management routes do not consistently retain the original destination. Decide whether the desired policy is all boards/manage routes or only protected resources, then verify each route.

### #2480 — feat: fetch app icons automatically

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2480) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The v2 app form still relies on icon search/entered URLs and does not fetch a site's HTML icon links with a favicon fallback.

**Conversation (0 comments read):** No comments were present. The requested behavior is to fetch a URL, parse link rel=icon or apple-touch-icon, then fall back to /favicon.ico, reducing manual icon selection. The related PR #6248 is closed without a merge and is not an ancestor of v2.

**V2 evidence:**

- packages/forms-collection/src/new-app/_form.tsx:130-145 — the app form passes an optional suggestedSearch to IconPicker based on the app name/href; it does not request page HTML. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/new-app/_form.tsx#L130)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:80-88,128-133 — icon suggestions use direct image URLs/search terms, with no HTML link parsing or favicon fallback. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L80)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:253-270 — the preview only displays the selected URL and does not discover site icons. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L253)

**Remaining / follow-up:** Native URL icon discovery and the requested fallback are absent. Do not count generic Custom Widget/API extensibility as resolving this app-form convenience.

### #2478 — feat: import / export apps

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2478) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 has a full database backup archive, but not the requested selective standardized CSV/JSON app import/export.

**Conversation (0 comments read):** No comments were present. The issue asks for bulk app export/import in a portable CSV or JSON format, including app fields and categories, so users can move apps without moving all board data.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-export-card.tsx:19-47 — the available export downloads a full homarr-backup.zip through the backup endpoint. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-export-card.tsx#L19)
- apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-import-card.tsx:10-24 — the import UI invokes DatabaseRestoreFlow for a database backup rather than an app-only interchange format. — [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-import-card.tsx#L10)
- apps/nextjs/src/app/api/backup/export/route.ts:27-58 — the endpoint snapshots the complete SQLite database and returns a ZIP containing db.sqlite and metadata, not a selective app interchange file. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/backup/export/route.ts#L27)

**Remaining / follow-up:** A selective app export/import contract, including category/board mapping and validation, is still needed. Treat full backup restore as a different feature.

### #2154 — feat: Re-add ability to use different port number

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2154) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The v2 image still exposes the nginx entrypoint on 7575 and does not implement the requested internal PORT environment override.

**Conversation (7 comments read):** All 7 comments were read. The original report asked to restore PORT=80 or another configurable in-container port and described failures when using PORT=80 or 7575. The discussion distinguishes the Next.js 3000 port, websocket 3001, Redis 6379, and nginx proxy 7575; a PUID/PGID workaround fixed a separate nginx startup problem. No comment closes or changes the request for an internal configurable listener.

**V2 evidence:**

- Dockerfile:91-99 — the production image sets fixed database/runtime environment and EXPOSE 7575; no PORT setting is defined. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/Dockerfile#L91)
- nginx.conf:7-22 — nginx listens on 7575 and proxies normal traffic to 127.0.0.1:3000 and websockets to 3001. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/nginx.conf#L7)
- scripts/run.sh:35-49,80-84 — startup templates the fixed 7575 nginx listener and binds the standalone Next server to 0.0.0.0. — [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L35)

**Remaining / follow-up:** Host port mapping such as -p 80:7575 remains the operational workaround. Supporting PORT=80 inside the container would require coordinated nginx, health-check, documentation, and startup changes.

### #2095 — feat: add css templates

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2095) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 adds a moderated Workshop catalog for sharing and importing Custom CSS, but it does not implement the requested composable, parameterized CSS-template system.

**Conversation (6 comments read):** All 6 comments were read. The requester wants centrally hosted CSS fragments that can be selected in advanced item/category/dynamic-section settings or board CSS, with typed variables such as border radius. Follow-ups add colors, font size, icon size, hidden bookmark URLs, and a public repository anyone can contribute to; the requester explicitly distinguishes composable fragments from whole themes. V2's release discussion and source show community Custom CSS sharing, which covers centralized discovery and reuse of complete CSS text. The import path still replaces the current editor value, and the conversation's variable and target-scope requirements remain separate.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:55-57 — the v2 release documents Workshop sharing for Custom CSS and its import workflow. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L55)
- apps/nextjs/src/components/workshop/workshop-css-import-button.tsx:69-90 — the picker requests a customCss submission, validates it as one string, and passes that string to the editor; there is no template-variable or target-scope model. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/workshop/workshop-css-import-button.tsx#L69)
- packages/workshop/src/schema.ts:7-12,229-247 — Custom CSS is a single schema version with length validation and no structured variables, selectors, or fragment composition. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/workshop/src/schema.ts#L7)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_customCss.tsx:26-37 — board settings expose one Custom CSS editor plus Workshop import, while no per-item/category/template selector is present. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_customCss.tsx#L26)
- apps/nextjs/src/components/board/sections/container/container-edit-modal.tsx:33-69 — Container styling is limited to manually entered CSS classes and a border color field. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-edit-modal.tsx#L33)
- apps/docs/docs/advanced/styling/index.mdx:3-12 — current guidance describes global/board raw CSS and its risks rather than a reusable template contract. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/styling/index.mdx#L3)

**Remaining / follow-up:** Add a structured template format with typed variables, explicit selector/target scopes, composition semantics, and selectors for item and container settings. Workshop's raw CSS import is useful partial coverage but cannot prove the requested fragment system.

### #1921 — feat: Add titles and folding for Dynamic Sections

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/1921) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 replaces Dynamic Sections with Containers that provide editable labels, collapse controls, styling, and nested grouping.

**Conversation (10 comments read):** All 10 comments were read. The reporter asked for an editable section title and a fold button/setting, then follow-ups asked for side-by-side grouping, border color, custom CSS, opacity, and more predictable collapse behavior. The linked title, folding, and border-color subissues (#2233, #2234, and #2235) are closed. The v2 design consolidates this surface as Containers.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:79-85 — the release explains that Containers replace Groups and Dynamic Sections and can contain apps, widgets, and other Containers. — [source L79](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L79)
- apps/nextjs/src/components/board/sections/container-section.tsx:53-83 — v2 renders collapsible Containers and applies custom CSS classes and a custom border color. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L53)
- apps/nextjs/src/components/board/sections/container-section.tsx:87-108 — the collapse control has expanded/collapsed state, accessible labels, and aria-controls. — [source L87](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L87)
- packages/validation/src/shared.ts:57-77,81-102 — Container defaults/schema include title, borderColor, showLabel, collapsible, showOpenAll, and legacy Dynamic Sections transform to Containers. — [source L57](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L57)

**Remaining / follow-up:** There is no dedicated opacity slider in the Container options, and the legacy transform only changes the section kind. Verify migrated boards if the opacity follow-up is still required.

### #1014 — feat: Import browser bookmarks

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/1014) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The requested standard browser HTML bookmark import/export workflow is absent. Manually adding bookmark URLs is a workaround, not partial implementation of importing or exporting a browser bookmark file.

**Conversation (2 comments read):** The requester asked for import and export buttons using standard browser HTML bookmark files, with icon/title retrieval called out as a possible difficulty. One commenter called seamless import impossible because browsers do not expose bookmarks directly; the maintainer clarified that importing the standardized exported HTML file is feasible. That narrower file-based requirement remains the relevant request.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-55 + 89-128 + the apps management UI lists and creates apps but has no bookmark-file import/export control. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)
- packages/widgets/src/bookmarks/index.tsx:12-16 + 53-100 + the bookmark widget models an ordered list of existing apps or direct URLs. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L12)
- packages/widgets/src/bookmarks/add-button.tsx:31-40 + 48-59 + 70-90 + users can select existing apps, migrate legacy URLs, or paste a direct URL manually. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/add-button.tsx#L31)
- packages/widgets/src/bookmarks/bookmark-item.ts:13-31 + 42-65 + entries are normalized and rendered as direct links; no Netscape/browser HTML parser or exporter is present. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/bookmark-item.ts#L13)
- apps/docs/docs/widgets/bookmarks/index.mdx:16-25 + documents direct URLs and app ordering, with no HTML file workflow. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/widgets/bookmarks/index.mdx#L16)

**Remaining / follow-up:** Add a standard browser bookmark HTML importer and normalized exporter, including a defined policy for imported titles/icons and duplicate URLs. Custom widgets or manually entered links do not satisfy this native workflow.

### #925 — feat: import items from another board

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/925) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 provides a working cross-board item transfer path through the clipboard. The selection toolbar exposes Copy and Paste, selected items are serialized with their kind, options, integrations, advanced options, and current-layout size, and paste creates fresh item IDs in the current board. That covers the basic request to reuse items from another board, even though it is a manual two-step workflow.

**Conversation (2 comments read):** The issue reports that the old Import item control did nothing and asks for importing items from another board, with a later reference to importing from a board list or file and previewing choices. The comments discuss permissions, distinguishing same-kind items, and a submodal or accordion preview. V2's clipboard flow was not present in that requested design discussion: the user must first open the source board, select items, copy them, then open the destination board and paste. It has no board picker, import preview, or item-selection dialog for a remote board.

**V2 evidence:**

- apps/nextjs/src/components/board/selection/board-selection-toolbar.tsx:228-249 — edit-mode selection toolbar exposes Copy and Paste actions. — [source L228](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/selection/board-selection-toolbar.tsx#L228)
- apps/nextjs/src/components/board/selection/board-selection-context.tsx:101-118,120-167 — selected items are copied to the browser clipboard and pasted into the currently loaded board with newly generated IDs. — [source L101](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/selection/board-selection-context.tsx#L101)
- apps/nextjs/src/components/board/selection/board-item-clipboard.ts:8-49,52-62 — clipboard payload contains item configuration and size but no source-board selector or preview. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/selection/board-item-clipboard.ts#L8)
- apps/nextjs/src/components/board/selection/board-selection-toolbar.tsx:98-115,252-270 — the Move menu only lists sections in the current board, so it is not cross-board import. — [source L98](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/selection/board-selection-toolbar.tsx#L98)

**Remaining / follow-up:** A board-to-board import picker with preview, permission handling, and an option to choose items without manually switching tabs would still be needed for the full proposal.

### #437 — feat: add board preview

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/437) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** The manage-boards page now renders a compact visual preview for each board, matching the requested board preview rather than only listing board names.

**Conversation (1 comments read):** The request proposed either screenshots or miniature rendered boards and explicitly marked the feature low priority before 1.0. The only follow-up assigned a decision tag and asked maintainers to discuss the presentation; there was no contrary requirement in the conversation.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/boards/page.tsx:15-18 + the manage page loads board overview data including preview information. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/boards/page.tsx#L15)
- apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx:42-52 + each board card passes its preview to BoardLayoutThumbnail. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx#L42)
- apps/nextjs/src/components/board/board-layout-thumbnail.tsx:21-38 + 65-120 + the thumbnail projects board lanes and tile/icon content into a small rendered preview. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-layout-thumbnail.tsx#L21)
- packages/api/src/router/board.ts:373-434 + 436-527 + 550-633 + the API assembles preview settings, layouts, items, lanes, and the final preview model. — [source L373](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L373)

**Remaining / follow-up:** No issue-level gap was identified. A browser check could confirm the visual fidelity at unusual board layouts, but source evidence covers the requested capability.

