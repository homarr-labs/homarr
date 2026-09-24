# Batch 5 — 27 issue assessments

Reconciled assessment data. See [parent review notes](../PARENT-REVIEW.md) for subsequent corrections.

### #6850 — bug: OIDC logout aborts the end-session request before it completes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6850) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 retains the reported logout sequence: it awaits Auth.js signOut with redirect:false, then navigates the current window to AUTH_LOGOUT_REDIRECT_URL. There is no explicit completion signal for the cross-origin IdP end-session navigation. The source establishes the sequence but cannot establish that Firefox aborts the request or that the sequence causes the provider session to remain active, so this needs a controlled browser/IdP reproduction.

**Conversation (0 comments read):** The issue reports Firefox aborting Authentik's end-session request and leaving the IdP session active after local logout. It has no comments or linked fix. The configured URL is documented as the post-logout redirect target, and the current menu handler performs a full-window assignment as soon as local signOut resolves. This is navigation to the IdP, rather than a return navigation to Homarr; source inspection alone cannot prove whether the provider request is aborted, so runtime tracing is required before calling it an addressed or remaining bug.

**V2 evidence:**

- apps/nextjs/src/components/user-avatar-menu.tsx:59-65 — logout awaits signOut({ redirect: false }) and then immediately calls window.location.assign(redirectUrl). — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/user-avatar-menu.tsx#L59)
- apps/nextjs/src/app/[locale]/layout.tsx:142-145 — AUTH_LOGOUT_REDIRECT_URL is passed into the client auth context as logoutUrl. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/layout.tsx#L142)
- packages/auth/env.ts:26-29 — AUTH_LOGOUT_REDIRECT_URL is an optional configured URL with no completion/timeout contract. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L26)
- apps/docs/docs/advanced/single-sign-on/index.mdx:20-27,275-284 — documentation describes the configured logout redirect but provides no cross-origin end-session completion mechanism. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L20)

**Remaining / follow-up:** Reproduce with Authentik and Firefox while tracing both local signOut and the IdP end-session navigation; if confirmed, use a browser-safe completion strategy (or provider-supported logout flow) before leaving the page and verify the IdP session is invalidated.

### #6764 — aria2 integration: torrents never report 'seeding' state, always 'leeching'

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6764) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2 still maps every active torrent to leeching. Aria2Download exposes totalLength and completedLength, and the integration already calculates progress from those fields, but getTorrentState receives only the status and returns leeching unconditionally for active. It never checks whether completedLength equals totalLength or uses the seeder flag to report seeding.

**Conversation (0 comments read):** The issue identifies the exact mapping defect and proposes comparing completedLength and totalLength for active torrents. There are no comments or linked PRs. Current V2 source retains the same active-to-leeching branch even though the needed lengths are available in the fetched record, so the reported state bug remains.

**V2 evidence:**

- packages/integrations/src/download-client/aria2/aria2-integration.ts:48-68 — totalLength and completedLength are read for progress, but state is delegated to getState with only status and torrent boolean. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L48)
- packages/integrations/src/download-client/aria2/aria2-integration.ts:150-185 — getTorrentState maps active directly to leeching and has no completed-length/seeder comparison. — [source L150](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L150)
- packages/integrations/src/download-client/aria2/aria2-types.ts:37-49 — Aria2Download includes totalLength, completedLength, and optional seeder data needed for the requested distinction. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-types.ts#L37)

**Remaining / follow-up:** Pass completion/seeder information into torrent state mapping, return seeding for fully downloaded active torrents, and add focused regression coverage for active, queued, complete, paused, and incomplete cases.

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

### #6620 — bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6620) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 uses a different board and widget loading architecture, so the v1.75 skeleton path is not directly present. Board item module loading shows a compact Loader, and widget query helpers preserve cached data during refetches and only treat an undefined first result as initially pending. That is evidence against replacing populated widgets with skeletons on ordinary refetch, but a full page refresh still has an initial loading transition and the exact visual flash requires browser observation.

**Conversation (2 comments read):** The issue reports a reproducible skeleton flash on every dashboard refresh after v1.75, while v1.74 did not show it. The maintainer says the behavior was an intentional optimization while the browser computes layout and that v2 uses a different system. No comment claims a v2 fix or provides a current reproduction. This makes source comparison useful but insufficient to label the browser-visible timing issue resolved.

**V2 evidence:**

- apps/nextjs/src/components/board/items/item-content.tsx:89-120 — V2's board item boundary uses a Loader while a lazy widget module is first loading, not a v1 skeleton placeholder implementation. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-content.tsx#L89)
- packages/widgets/src/common/query-state.ts:12-21 — cached/stale data is retained and initial pending is true only when no first result exists, so ordinary refetch should not blank populated widget data. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/common/query-state.ts#L12)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.tsx:45-71 — V2 board hydration is tracked on a scaled canvas with initial dimensions, reflecting the separate board-loading architecture. — [source L45](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.tsx#L45)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css:1-11 — hydration overflow handling is scoped to the new board viewport rather than the former dashboard skeleton system. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css#L1)

**Remaining / follow-up:** Run a controlled V2 browser refresh test on a populated board, distinguishing initial lazy-module Loader behavior from data refetch; compare screenshots/timing against the reported skeleton flash at the affected viewport sizes.

### #6614 — feat: Add Quven integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6614) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Quven integration, definition, native widget, or registered client. The explicit integration exports and widget registry contain no Quven module. A Custom Widget can call an external API for a particular Quven deployment, as the issue discussion suggests, but that is generic extensibility and does not provide native server status, users, media/library data, authentication, or onboarding.

**Conversation (1 comments read):** The issue requests a Quven self-hosted media-server integration showing server status, users, media, and library information. The sole comment notes that Quven is new and recommends trying V2 Custom Widgets or building an integration. No comment or timeline entry records a native implementation, and no source evidence shows one in the release/v2 tree.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — the native integration export list has no Quven client. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/widgets/src/registry.ts:64-100 — the explicit native widget loader registry has no Quven module or Quven widget. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)
- packages/definitions/src/integration.ts:470-530 — media-library/reverse-proxy definitions are present, but no Quven integration definition or onboarding metadata exists. — [source L470](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L470)

**Remaining / follow-up:** Add a native Quven API/auth integration and matching widgets for the requested server, user, media, and library data, or document a bounded Custom Widget recipe once Quven's API is stable.

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

### #6403 — feat: Dynamic apps fetched from reverse proxy

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6403) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Caddy integration or dynamic reverse-proxy-to-app-tile pipeline. The native reverse-proxy support is Traefik, whose widget aggregates router/service/middleware health and counts from configured integrations; it does not create or update board app items. No package exposes a reverse-proxy discovery result as dashboard apps, and no Caddy client is registered.

**Conversation (6 comments read):** The issue asks Homarr to fetch services and exposed/internal hosts from a Caddy API, then dynamically create or filter app entries, with custom JavaScript as a possible extension. The discussion considers middleware and mobile/category layout concerns; the reporter later drops implementation interest because of those separate layout problems, but the feature request remains. No linked PR or comment claims that a dynamic app source shipped.

**V2 evidence:**

- packages/definitions/src/integration.ts:524-530 — the reverse-proxy definition present in V2 is Traefik; there is no Caddy definition. — [source L524](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L524)
- packages/integrations/src/index.ts:46-49 — native exports include Traefik but no Caddy client. — [source L46](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L46)
- packages/widgets/src/traefik/component.tsx:61-78,110-146,218-230 — the Traefik widget combines health/resource summaries and failed endpoints, with no app creation or board mutation. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/traefik/component.tsx#L61)
- packages/widgets/src/registry.ts:64-100 — the explicit widget loader registry has no reverse-proxy discovery or dynamic-app module. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)

**Remaining / follow-up:** Add a Caddy/reverse-proxy discovery contract, map stable hosts and metadata to explicit board app items or a safe managed collection, and define refresh, filtering, credentials, and mobile/layout behavior.

### #6271 — bug: TrueNAS Integration eating up memory on TrueNAS host

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6271) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2's TrueNAS client now reuses one authenticated WebSocket per integration ID, evicts it on close/failure, bounds requests, and negotiates JSON-RPC with a legacy fallback. The integration still launches four concurrent data queries per refresh, including reporting and network data, so the source demonstrates connection reuse but cannot establish that the TrueNAS host memory leak is fixed. The report targets TrueNAS 25.10.4, while no reproduction or memory profile is available here.

**Conversation (0 comments read):** The reporter says reconnecting Homarr's TrueNAS integration eventually consumes all host memory and that removing the integration plus a host restart restores normal usage. There are no comments, linked fixes, or diagnostic logs identifying whether the cause is socket churn, an API response leak, or server-side reporting. V2 contains a redesigned/reused client and newer API handling, which is relevant mitigation but not issue-specific proof.

**V2 evidence:**

- packages/integrations/src/truenas/truenas-client.ts:26-49,68-95 — client connections are cached per integration, shared by concurrent calls, and evicted/reconnected when a socket fails or closes. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-client.ts#L26)
- packages/integrations/src/truenas/truenas-client.ts:106-139 — V2 negotiates JSON-RPC and falls back to the legacy API, retaining the selected API per integration. — [source L106](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-client.ts#L106)
- packages/integrations/src/truenas/truenas-integration.ts:34-60 — each system-info refresh still runs system, reporting, pool, and network requests concurrently. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L34)
- packages/integrations/src/truenas/truenas-integration.ts:219-246,273-295 — reporting calls request five-minute CPU/memory/temperature and interface netdata windows on each refresh. — [source L219](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L219)

**Remaining / follow-up:** Reproduce against TrueNAS 25.10.4 with sustained widget polling, collect Homarr socket/request counts and TrueNAS memory profiles, and confirm cleanup/backpressure; inspect server-side reporting responses if memory still grows.

### #6152 — feat: re-open: add Wazuh  #3765

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6152) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Wazuh integration, widget, API client, or Wazuh definition. The native integration registry exports many monitoring and security-adjacent services, but neither definitions nor widgets contain Wazuh data types or procedures. A Custom Widget could call an external endpoint for a particular deployment, but it does not provide the requested native dashboard graphs, authentication, or Wazuh-specific data model.

**Conversation (2 comments read):** The issue reopens an earlier request for a Wazuh SIEM widget. Comments ask for a breakdown, and the reporter requests Wazuh statistics, alert summaries, and Docker/vulnerability graphs arranged alongside calendar/system stats. No comment records implementation or a narrowed accepted feature, and no linked PR is present. The current tree confirms the request remains an integration gap.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — the native integration exports include monitoring/security-related clients but no Wazuh integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-530,636-641 — the integration definitions include PeaNUT and Traefik around the relevant categories, with no Wazuh kind or onboarding metadata. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/widgets/src/registry.ts:64-100 — the explicit native widget registry contains no Wazuh module or Wazuh widget loader. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)

**Remaining / follow-up:** Define the Wazuh API/auth contract and native integration, then add configurable alert, agent, vulnerability, and container/statistics widgets with permission and error handling.

### #6008 — bug: manage/about page fails to load with ECONNREFUSED

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6008) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2's /manage/about page no longer self-fetches its own HTTP API. It imports static contributor data and calls getDependenciesAsync directly on the server, eliminating the HOSTNAME/loopback path that caused ECONNREFUSED in restricted container networking. A manage-level error boundary also catches future management-page failures with a retry surface. The linked fix is merged and its merge commit is an ancestor of V2.

**Conversation (3 comments read):** The issue reports /manage/about failing in v1.66.1 with ECONNREFUSED and digest 3227098399. Comments request full server logs and mention a broader error boundary. Linked PR #6009 explicitly identifies four unnecessary self-fetches, removes them, and adds manage/error.tsx; its metadata records a merge and V2 ancestry. Current source contains the direct calls and boundary, so the reported self-fetch cause is addressed, although deployment-specific failures still need runtime evidence.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/about/page.tsx:42-60 — the page directly imports static data and calls getDependenciesAsync without constructing or fetching a local HTTP URL. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/about/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/error.tsx:9-41 — management pages have a localized retry error boundary that displays a digest when a runtime error occurs. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/error.tsx#L9)
- reports/v2-issue-triage/source/linked-prs/6009.json:34,38-39,365,397 — the linked self-fetch/error-boundary PR is merged, with a merge commit recorded as an ancestor of V2.

**Remaining / follow-up:** Validate /manage/about in the affected source-built/restricted-network deployment and inspect any new digest if direct dependency reading fails; the original loopback ECONNREFUSED path is removed.

### #5769 — feat: Support Kubernetes integration as dashboard widgets instead of a global tool for multi-tenant access control

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5769) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** Kubernetes remains a global, admin-only management tool in V2. The route requires both admin permission and ENABLE_KUBERNETES, uses a shared context selector, and renders cluster/resource pages under /manage/tools/kubernetes. The cluster dashboard queries cluster-wide data for the selected context; there is no Kubernetes integration kind or widget package that can be placed on a board with per-widget cluster/resource scoping.

**Conversation (0 comments read):** The issue requests dashboard widgets for multiple Kubernetes clusters, with granular metric/resource selection and tenant boundaries instead of a global tool. It has no comments proposing a reduced scope or reporting a fix. V2's current Kubernetes pages improve the global tool's context selection but do not change its access boundary or expose it through the board widget model. Generic Custom Widgets do not provide native Kubernetes authentication or the requested safe multi-tenant policy.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/page.tsx:9-19 — the Kubernetes route is gated by admin permission and ENABLE_KUBERNETES and renders the management dashboard. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/page.tsx#L9)
- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/layout.tsx:1-15 — context selection is placed in the global management layout around child pages. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/layout.tsx#L1)
- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard.tsx:17-34,36-87 — the dashboard queries the selected global context and renders cluster, capacity, and resource tiles, rather than a board widget contract. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard.tsx#L17)
- packages/definitions/src/kubernetes.ts:1-21,86-107 — Kubernetes data types exist, but no integration definition or board-widget type is declared. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/kubernetes.ts#L1)

**Remaining / follow-up:** Expose Kubernetes as a first-class, permission-scoped integration/widget model with per-cluster credentials and resource selectors, while preserving tenant isolation and avoiding global-admin data leakage.

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

### #4965 — bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4965) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 has explicit DN normalization for LDAP values containing escaped hexadecimal bytes and converts non-string attributes as UTF-8, but it has no issue-specific fix or regression evidence for the reported Active Directory group lookup. The group filter still interpolates the configured user DN directly, with no dedicated LDAP filter escaping/encoding helper. That may work for LDAPv3 servers and may fail for vendor-specific encoding, so source inspection cannot settle the report.

**Conversation (4 comments read):** The reporter says user lookup and password validation succeed, then group retrieval fails only when the CN/DN contains Cyrillic, Polish, Chinese, or other non-ASCII characters; ASCII-only users work. Comments question why a CN is non-ASCII, answer that other LDAP services handle it, and suggest vendor differences between encoded and UTF-8 strings while expecting LDAPv3 UTF-8 to work. The issue remains open, has no linked fix, and the only workaround is using local credentials accounts.

**V2 evidence:**

- packages/auth/providers/credentials/authorization/ldap-authorization.ts:34-54,68-99 — user lookup and password bind succeed before the separate group search, whose filter directly inserts ldapUser[configured member attribute]. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L34)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:141-148 — username filters also interpolate input without a filter escaping helper. — [source L141](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L141)
- packages/auth/providers/credentials/ldap-client.ts:43-66 — LDAP values are converted to strings and buffers as UTF-8. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L43)
- packages/auth/providers/credentials/ldap-client.ts:69-82 — returned DNs with escaped hex bytes are normalized through decodeURIComponent; this predates the issue and does not prove the group filter works with every directory vendor. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L69)
- packages/auth/env.ts:61-68 — group member attribute and search scope are configurable, matching the reporter's distinguishedName setup but offering no encoding mode. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L61)

**Remaining / follow-up:** Reproduce with the reported AD/LDAP configurations and capture the exact generated group filter and server response; then add standards-compliant filter escaping/encoding or a vendor-compatible DN path and regression coverage if confirmed.

### #4562 — feat(integrations): support music media type for seerr

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4562) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The native Overseerr/Seerr integration still models only movie and TV request media. Request methods, search discriminated unions, request parsing, and statistics schemas all omit music/Lidarr types. The issue's proposed upstream support was still draft/unfinished in the conversation, and no linked merged PR supplies a V2 implementation. A generic Custom Widget cannot extend the native request schema or make the music filter work.

**Conversation (10 comments read):** The report describes Jellyseerr/Seerr with the preview music feature and Lidarr producing a media-request parsing error because Homarr handles only movie and TV. Comments initially suggest the change should be easy, then note the upstream API is unfinished; the maintainer declines accepting an unknown type until the upstream contract is stable. The final discussion points to upstream PR #2132 still being draft and asks the reporter to retag when it lands.

**V2 evidence:**

- packages/integrations/src/overseerr/overseerr-integration.ts:69-90 — series information and request APIs accept only mediaType movie or tv. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L69)
- packages/integrations/src/overseerr/overseerr-integration.ts:393-423 — search parsing is a discriminated union for tv, movie, and person, with no music result. — [source L393](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L393)
- packages/integrations/src/overseerr/overseerr-integration.ts:425-465 — request and stats schemas enumerate movie/tv and expose movie/tv counts only. — [source L425](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L425)
- packages/integrations/src/interfaces/media-requests/media-request-types.ts:27-39 — the shared MediaRequest type remains restricted to movie and tv. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/media-requests/media-request-types.ts#L27)

**Remaining / follow-up:** Wait for a stable Seerr/Jellyseerr music API, then extend integration interfaces, validation, request/search handling, stats, widget labels, and tests without treating unknown upstream types as valid movie/TV data.

### #4541 — feat(boards): support automatic layout for different screen sizes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4541) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 implements responsive board layouts with protected Mobile and Base roles, breakpoint selection, custom layouts, previews, and reset-from-Base behavior. The runtime selects a layout for the viewport, settings can add custom breakpoint layouts seeded from Base geometry, and the API projects Base content into new or reset layouts. Existing non-Base layouts are not automatically reprojected whenever Base geometry is edited, so the broader automatic recalculation request is only partially covered.

**Conversation (9 comments read):** The issue proposes deriving layouts for different screen sizes from a base layout while allowing custom overrides, with DB role/layout-mode ideas and an edit strategy. Comments discuss generating five to seven layouts, choosing a base layout, auto-sizing, and using mobile as a secondary layout; the final discussion favors a default/base layout plus an algorithm and explicit editing. V2 ships the Base/Mobile/breakpoint/reset architecture, but save propagation must be checked against the requested all-nonbase recalculation: the API projects new layouts and explicit resets, while existing layouts are processed independently.

**V2 evidence:**

- packages/boards/src/layout-selection.ts:1-20 — runtime layout selection sorts breakpoints and chooses the layout for the current viewport width. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/boards/src/layout-selection.ts#L1)
- packages/definitions/src/board.ts:4-16,27-60 — layout roles include mobile/base/custom and are normalized with protected role semantics. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/board.ts#L4)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:104-145,184-205 — settings add custom breakpoint layouts using Base geometry, expose breakpoints, and show a source layout preview. — [source L104](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L104)
- packages/api/src/router/board.ts:1223-1288,1291-1324,1458-1495 — new layouts and explicit resets project from Base, but an existing layout update uses its own prior geometry and only layouts independently detected as changed are processed. — [source L1223](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1223)

**Remaining / follow-up:** Decide whether editing Base should automatically regenerate every non-Base layout or only offer reset; if automatic, propagate the new Base elements/geometry to existing layouts while preserving intentional overrides, then verify save and migration behavior.

### #4406 — bug: OIDC not working with Cloudflare Zero Trust / SaaS

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4406) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2's OIDC implementation has configurable scopes, nested groups/name claim paths, and an option to force userinfo, but the provider definition does not explicitly set an authorization response_type or add a Cloudflare-specific callback flow. Auth.js may use the authorization-code default, which is the relevant configuration direction, yet the reported Cloudflare fragment/state failure cannot be proven resolved from these files. The profile parser still requires sub and a usable name claim.

**Conversation (14 comments read):** The report describes Cloudflare Zero Trust OIDC with Entra failing at the callback, initially around the groups scope. Comments clarify that the provider is Cloudflare OIDC, try implicit/hybrid flow, and report persistent failures through several Homarr releases. The later investigation explains that implicit/hybrid responses put state/tokens in a browser fragment unavailable to the server, recommends authorization code, and notes that profile claims may need scope/name/group overrides or userinfo. No linked fix or v2-specific verification is recorded.

**V2 evidence:**

- packages/auth/providers/oidc/oidc-provider.ts:13-31 — OIDC authorization sends the configured scope and redirect URI but does not explicitly set response_type; the source provides no Cloudflare-specific handling. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/oidc-provider.ts#L13)
- packages/auth/providers/oidc/oidc-provider.ts:53-73 — profile processing requires sub and a resolved name, with optional userinfo, so claim shape still affects callback success. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/oidc-provider.ts#L53)
- packages/auth/env.ts:36-52 — V2 exposes scope, groups/name attribute overrides, force-userinfo, and token endpoint auth configuration. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L36)
- apps/docs/docs/advanced/single-sign-on/index.mdx:197-211 — the supported OIDC knobs and nested claim paths are documented, but there is no Cloudflare response-flow fix documented. — [source L197](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L197)

**Remaining / follow-up:** Verify the Cloudflare Zero Trust authorization-code flow end to end against the reported Entra configuration, including callback query state, groups/name claims, and userinfo; add an explicit response-flow/configuration fix if the current Auth.js default is insufficient.

### #4159 — bug: Tasks page does not load

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4159) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The V2 Tasks page loads its jobs through the server-side tRPC API in the Next process, and production instrumentation starts the embedded tasks service alongside the embedded WebSocket service. This removes the old source-build assumption that a separately reachable task endpoint must answer the page request, which is the reported ECONNREFUSED path. The page remains admin-only and still depends on startup completing successfully.

**Conversation (1 comments read):** The issue reports v1.39.0 built from source in an LXC, where /manage/Tasks failed with a tRPC fetch ECONNREFUSED. The sole comment says Docker works and the failure is specific to source-only deployment. V2's runtime architecture embeds tasks in production and the page calls api.cronJobs.getJobs directly; this is a direct architectural change addressing that deployment mode. There is no current source-built LXC smoke run in this triage.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/tasks/page.tsx:23-39 — TasksPage awaits api.cronJobs.getJobs server-side and renders the result without a separate HTTP task service. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/tasks/page.tsx#L23)
- packages/api/src/router/cron-jobs.ts:17-23,59-61 — the jobs query is a local JobManager call and is protected by the admin permission. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/cron-jobs.ts#L17)
- apps/nextjs/src/instrumentation-node.ts:5-34 — production instrumentation starts embedded tasks and WebSocket services with startup error handling. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/instrumentation-node.ts#L5)
- apps/nextjs/next.config.ts:18-27,53-57 — only development aliases tasks/websocket to no-op modules; production includes the embedded runtime. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/next.config.ts#L18)

**Remaining / follow-up:** Confirm a source-built or otherwise non-Docker V2 deployment can start the embedded task service and load /manage/tools/tasks; investigate startup failures separately if the embedded service rejects readiness.

### #3913 — feat: Support running as fully non-root containers

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3913) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports dropping privileges to a configured PUID/PGID after startup, including ownership preparation for app data, the Next cache, and nginx directories. It still defaults to root, performs mkdir/chown work in the entrypoint, and uses su-exec only when PUID is nonzero. A runtime/container user supplied directly through Docker or Podman therefore does not get a fully non-root startup path, matching the issue's cache and chown failures.

**Conversation (2 comments read):** The report supplies a rootless Podman proof of concept, explains that the entrypoint's root chown cannot run under user 1234:1234, and calls out EACCES for the Next cache. Comments discuss making the cache writable or configuring Next and using a Docker group for socket access. Current docs document PUID/PGID as the supported route and explicitly say the default is root. No comment indicates the stronger direct non-root container contract was completed.

**V2 evidence:**

- Dockerfile:52-70,91-100 — the runner image has an entrypoint but no USER directive; runtime directories are prepared during image build and the default command remains root-dependent. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/Dockerfile#L52)
- scripts/entrypoint.sh:4-35,51-54 — PUID/PGID default to 0, ownership changes require startup privileges, and su-exec is used only after that work when PUID is nonzero. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/entrypoint.sh#L4)
- apps/docs/docs/advanced/running-as-different-user/index.mdx:11-17,20-48 — supported documentation describes root as the default and PUID/PGID as the mechanism for changing runtime ownership. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/running-as-different-user/index.mdx#L11)
- reports/v2-issue-triage/source/3913.json:90 — the reported direct user mode fails at chown/cache permissions, which the current entrypoint contract still requires.

**Remaining / follow-up:** Support a genuinely non-root image/entrypoint path that never requires chown or privileged filesystem setup, define writable cache/runtime directories and Docker socket behavior, and verify Docker/Podman/Kubernetes user configurations.

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

### #3595 — feat: Focus search bar like pre 1.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3595) · **Quality of life** · **Partially addressed** · Confidence: **medium**

**Request:** V2 focuses the actual Spotlight search input when Spotlight opens, including after the header search control is clicked, but the persistent header search control itself is not an editable or automatically focused input. DesktopSearchInput is rendered as an UnstyledButton and MobileSearchButton is a button; opening Spotlight is required before typing into the focused field. This covers fast search entry after activation, not autofocus on page load/refresh.

**Conversation (1 comments read):** The issue asks for the pre-1.0 behavior of focusing the search bar on a new tab or refresh. The only comment says the current search bar is a button and suggests that implementing this would likely require Spotlight or a query parameter. V2 adopts Spotlight as the search surface and adds hotkeys, so the interaction model changed: users click the header control or invoke a hotkey, then receive focus in the modal. Nothing in the timeline establishes automatic focus immediately on board load.

**V2 evidence:**

- apps/nextjs/src/components/layout/header/search.tsx:12-27,31-41 — desktop and mobile header search controls are buttons that call openSpotlight rather than inputs that can receive page-load focus. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/search.tsx#L12)
- packages/spotlight/src/components/spotlight.tsx:111-133,165-205 — Spotlight holds an input ref and focuses it after mount and on open. — [source L111](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/spotlight/src/components/spotlight.tsx#L111)
- apps/nextjs/src/components/layout/header/lazy-spotlight.tsx:24-65 — Spotlight is mounted lazily on an open event or after preload, so it is not necessarily present/focused on a fresh page render. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/lazy-spotlight.tsx#L24)

**Remaining / follow-up:** Decide whether V2 should autofocus/open Spotlight on board entry or expose a focusable persistent search field; if the original behavior remains desired, add a page-load/new-tab trigger and verify keyboard focus accessibility.

### #3407 — bug: background jittering when scrolling

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3407) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 substantially changed the board/background layout, but the source alone cannot establish that the Safari tab-return and scrolling jitter is fixed. Image backgrounds still use AppShell background attachment settings, while the board now renders through a scaled canvas and video backgrounds use a fixed video element. Those changes could alter the reported behavior, yet no source change is explicitly tied to this issue and no Safari reproduction was run.

**Conversation (7 comments read):** The report describes Safari on v1.24.0 showing a blank delay after returning from another tab and a jumpy background while scrolling. Comments ask for a reproducible board/configuration and a safe upload; the reporter says the board has no custom CSS/extensions besides Bitwarden, and another participant reports a macOS half-screen issue that went away at 90% zoom. The timeline does not document a resolution. These reports leave both browser-specific reproduction and the relationship to board settings uncertain.

**V2 evidence:**

- apps/nextjs/src/components/layout/background.tsx:9-28 — image backgrounds are still passed to AppShell with configurable position, size, repeat, and attachment properties. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/background.tsx#L9)
- apps/nextjs/src/components/layout/shell.tsx:27-35 — V2 changed the shell sizing/background minimum-height behavior to a content-sized board canvas. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/shell.tsx#L27)
- apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx:79-110 — the board now mounts a separate background-video layer and ScaledBoardCanvas/grid architecture. — [source L79](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx#L79)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css:1-11,17-24 — the new viewport clips overflow during hydration and positions the scaled canvas, changing scroll/layout behavior without proving a Safari fix. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css#L1)

**Remaining / follow-up:** Reproduce the original Safari tab-switch and scroll sequence against a V2 board with image backgrounds and each attachment mode, checking blank frames, scroll position, and jitter at multiple viewport sizes.

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

### #3064 — feat(integrations): store sessions for emby / jellyfin

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3064) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The requested stored authentication session is not implemented for Emby or Jellyfin. Jellyfin's session polling still calls getApiAsync on every request; with username/password that method constructs a client and authenticates it on each call. Emby still sends its API key on each session request. A reusable encrypted Redis SessionStore exists, but neither integration consumes it and the base Integration class does not attach one.

**Conversation (3 comments read):** The issue asks Homarr to stop querying Emby/Jellyfin authentication repeatedly, reduce user-activity log noise, and invalidate a stored session when credentials change. Comments note that Emby may not support the desired API-key flow and that Jellyfin's SDK behavior could be tricky; the reporter suggests using a Jellyfin API key. That suggestion is a credential workaround, not the requested cached username/password session, and no conversation entry establishes implementation of the store.

**V2 evidence:**

- packages/integrations/src/jellyfin/jellyfin-integration.ts:81-89 — every current-session poll obtains a new API client through getApiAsync. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/jellyfin/jellyfin-integration.ts#L81)
- packages/integrations/src/jellyfin/jellyfin-integration.ts:238-250 — username/password authentication runs inside getApiAsync for every call; only API-key configuration avoids that authenticate call. — [source L238](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/jellyfin/jellyfin-integration.ts#L238)
- packages/integrations/src/emby/emby-integration.ts:115-128 — Emby session polling issues a fresh HTTP request with the API key each time. — [source L115](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L115)
- packages/integrations/src/base/session-store.ts:59-109; packages/integrations/src/base/integration.ts:35-57 — generic encrypted, fingerprinted session storage exists but is not wired into the integrations/base class. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/session-store.ts#L59), [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/integration.ts#L35)

**Remaining / follow-up:** Wire a credential-fingerprinted session into Jellyfin and Emby where their clients support it, clear it when secrets change, and verify polling no longer re-authenticates; document API-key behavior separately.

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

### #2362 — feat: wake on lan widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2362) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no native Wake-on-LAN widget or integration in the V2 source. The integration export list contains media, networking, storage, and UPS integrations but no WOL or UpSnap client, and the integration definitions likewise have no WOL kind. A generic Custom Widget can make HTTP requests, but that does not supply the requested native discovery, configuration, or LAN wake behavior.

**Conversation (5 comments read):** The issue asks for a widget that sends Wake-on-LAN to remote machines. Discussion considers a command or network configuration, an UpSnap integration, and the difficulty of documenting UpSnap's API; the maintainer prefers a self-hosted WOL application when possible. A later comment observes that visiting a reverse-proxied domain can wake a machine, but that is an incidental proxy behavior and not a Homarr feature. No comment or timeline entry establishes a merged native implementation.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — all native integration exports are listed here; there is no Wake-on-LAN, WOL, or UpSnap integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-507,524-530 — the relevant categories define PeaNUT and Traefik but no WOL integration kind. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/integrations/src/index.ts:51-67 — exported native data interfaces do not include a WOL action or machine-wake contract. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L51)

**Remaining / follow-up:** A native integration/widget needs a safe server-side WOL action, target configuration and authorization model, and a reachable network path; an external UpSnap service could be supported separately if its API contract is stable.

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

