# Homarr V2 — complete open-issue triage

> Preserved original snapshot. See the [current136-issue verification report](verification/REPORT.md) for refreshed release/v2 evidence, runtime results and updated dispositions.


As of 2026-09-17T05:07:38.237738+00:00. Base: [`release/v2` at `60b4e980ed86`](https://github.com/homarr-labs/homarr/tree/60b4e980ed86a3b36d66bd1e25ee277e13836916).

**135 / 135 open issues reviewed; 442 / 442 issue comments read.** Five issue-review batches, five Luna/max agents across review and independent audit, and parent reconciliation. Closed issues and PRs are not the backlog scope. GitHub was read only.

“Will be fixed with V2” means the checked code addresses the request; it does not imply a runtime reproduction passed, a release shipped, or that V2 first introduced the fix. Confidence refers to the disposition. See [methodology and limits](README.md), [runtime validation status](RUNTIME-VALIDATION.md), and the [source manifest](source/manifest.json).

## Disposition totals

| Disposition | Issues |
| --- | ---: |
| Will be fixed with V2 | 33 |
| Partially addressed | 29 |
| Not addressed | 50 |
| Needs verification | 23 |

## Categories

| Category | Issues | Report |
| --- | ---: | --- |
| Integration requests | 17 | [Read](categories/integration-request.md) |
| Bugs | 57 | [Read](categories/bug.md) |
| Annoyances | 3 | [Read](categories/annoyance.md) |
| Quality of life | 42 | [Read](categories/qol.md) |
| Large feature requests | 14 | [Read](categories/big-feature.md) |
| Documentation | 0 | [Read](categories/documentation.md) |
| Other / tracking | 2 | [Read](categories/other.md) |

## Candidates that will be fixed with V2

These are local release follow-up candidates. No issue should be closed solely on the basis of source inspection where the entry still asks for runtime confirmation.

| Issue | Confidence | Assessment |
| --- | --- | --- |
| [#6830](https://github.com/homarr-labs/homarr/issues/6830) bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't) | high | The WUD v9 integration now uses authenticated /api/containers requests and the merged v2 PR #6831 explicitly fixes the connection-test/widget data-path mismatch. |
| [#6807](https://github.com/homarr-labs/homarr/issues/6807) bug: MCP tools/list fails on invite_createInvite z.date() schema | high | V2 exposes the invite expiration as an ISO string schema and converts it to Date only at persistence, making tools/list JSON-compatible. |
| [#6763](https://github.com/homarr-labs/homarr/issues/6763) bug: Unable to add users/group to board access control when using OIDC via Authentik | high | V2 separates board access permissions from the general board-settings form and submits user/group permissions through dedicated mutations. This removes the nested/unified-form reset path reported with Authentik and Pocket ID. |
| [#6761](https://github.com/homarr-labs/homarr/issues/6761) bug: App Management Breaks w/o Modify All Boards Permission | high | Release/v2 derives app-management page access from app permissions, so a user with app-create or app-modify-all no longer needs the unrelated board-modify-all permission to load /manage/apps. |
| [#6745](https://github.com/homarr-labs/homarr/issues/6745) bug: Unraid health widget reports RAM in GiB approximately 1024x too small | high | Release/v2 computes Unraid memory usage from the byte-valued metrics total minus available, matching the correction requested for the roughly 1024x-too-small RAM ring. |
| [#6712](https://github.com/homarr-labs/homarr/issues/6712) bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password | high | V2 sends HTTP Basic authentication for both WUD connection tests and container data requests. |
| [#6697](https://github.com/homarr-labs/homarr/issues/6697) feat: Use Tb / Gb for UNRAID Integration | high | V2 defaults to decimal KB/MB/GB/TB units and lets each user select binary KiB/MiB/GiB/TiB when desired. |
| [#6682](https://github.com/homarr-labs/homarr/issues/6682) bug: Immich integration stops working after the latest update | high | The reviewed V2 request layer preserves SDK headers, including x-api-key, rather than object-spreading a Headers instance. The conversation also records the 1.76.0 Immich regression as fixed in 1.76.1; current source supports this as a V2 fix candidate. |
| [#6681](https://github.com/homarr-labs/homarr/issues/6681) bug: Immich Integration show as working, zero results. | high | The Immich integration now builds authenticated SDK request options for album and asset calls; the issue conversation also records the album 401 as fixed in version 1.76.1, which predates release/v2. |
| [#6671](https://github.com/homarr-labs/homarr/issues/6671) bug: Weather widget not displaying data | high | V2 handles the intentional NO_EXTERNAL_CONNECTION case explicitly and includes the merged weather fix for disabled external connections. |
| [#6628](https://github.com/homarr-labs/homarr/issues/6628) bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL | high | Release/v2 includes the public-origin discovery rewrites, BASE_URL-aware OAuth authorization flow, and protected-resource challenges needed for the reported MCP OAuth failures. |
| [#6622](https://github.com/homarr-labs/homarr/issues/6622) bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login | high | V2 detects that database restore invalidates the current session, shows a restore-complete/re-login state, and redirects to login instead of leaving the user looking at an empty stale board. |
| [#6608](https://github.com/homarr-labs/homarr/issues/6608) bug: Integration page accessible without board-modify-all permission | high | V2 gates the integrations management page with a dedicated integration-management permission and filters the server-provided integration list to what the user may manage. |
| [#6589](https://github.com/homarr-labs/homarr/issues/6589) feat: 2 separate widgets for 2 separate docker instances | high | V2 supports multiple named Docker/Podman endpoints and lets each Docker Containers widget select endpoint IDs independently. The widget passes its selected IDs to getContainers, and its totals reduce only the returned containers, so two widgets can show separate host totals. Empty selection intentionally means all endpoints. Endpoint creation/configuration remains an environment or setup concern, and a widget option alone does not add a GUI endpoint manager. |
| [#6207](https://github.com/homarr-labs/homarr/issues/6207) bug: Unifi integration not working | high | The UniFi default-port bug is fixed in merged PR #6787, whose ancestor check is true for v2. The integration now tries HTTPS port 443 for bare controller URLs, falls back to 8443 only for connection/detection failures, preserves explicit ports, and leaves authentication failures visible. |
| [#6008](https://github.com/homarr-labs/homarr/issues/6008) bug: manage/about page fails to load with ECONNREFUSED | high | V2's /manage/about page no longer self-fetches its own HTTP API. It imports static contributor data and calls getDependenciesAsync directly on the server, eliminating the HOSTNAME/loopback path that caused ECONNREFUSED in restricted container networking. A manage-level error boundary also catches future management-page failures with a retry surface. The linked fix is merged and its merge commit is an ancestor of V2. |
| [#5867](https://github.com/homarr-labs/homarr/issues/5867) feat: REST Endpoint  to manage boards | high | The requested board-management REST surface exists in the current release/v2 API: board listing/creation/duplication/rename/visibility/deletion, home-board operations, settings update, and board-item creation are exposed. |
| [#5342](https://github.com/homarr-labs/homarr/issues/5342) bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration | high | The malformed Tracearr hosthttps URL was fixed in merged PR #5654, whose merge commit is an ancestor of v2. Current Tracearr code passes returned absolute avatar/poster URLs directly to the image proxy rather than rebuilding them against the integration base URL. |
| [#5336](https://github.com/homarr-labs/homarr/issues/5336) feat: widget to display missing / queued movies & episodes | high | V2 includes a native mediaMissing widget that queries configured media-organizer integrations and displays missing movies/episodes plus queued downloads. It offers showMissing/showQueued and page-size settings, counts and partial-failure badges, an advanced two-panel view, and a compact tab view. The shared media-organizer interface and item types provide the missing/queue data required by Radarr and Sonarr. |
| [#4973](https://github.com/homarr-labs/homarr/issues/4973) bug: System Resources Incorrect Total Ram for TrueNAS 25.04 | high | V2 corrects the TrueNAS memory mapping responsible for inflating displayed capacity. Previously physical memory was returned as available and the reporting value as used, so the widget added both. V2 returns available and max(physical minus available, 0), making their sum physical memory for valid available values. |
| [#4543](https://github.com/homarr-labs/homarr/issues/4543) feat: Edit apps inside Edit Item | high | V2 embeds the AppForm as an App tab inside the widget edit modal and submits app changes with the widget form. |
| [#4533](https://github.com/homarr-labs/homarr/issues/4533) feat: show Description next to title for application | high | The v2 App widget can render icon, title, and normal description in a horizontal row, with responsive sizing and truncation. |
| [#4159](https://github.com/homarr-labs/homarr/issues/4159) bug: Tasks page does not load | high | The V2 Tasks page loads its jobs through the server-side tRPC API in the Next process, and production instrumentation starts the embedded tasks service alongside the embedded WebSocket service. This removes the old source-build assumption that a separately reachable task endpoint must answer the page request, which is the reported ECONNREFUSED path. The page remains admin-only and still depends on startup completing successfully. |
| [#4157](https://github.com/homarr-labs/homarr/issues/4157) feat: Download Client Item - Job Name column should be wider than the rest. | high | The download widget now gives the job/name column a wider 240px default and supports resizing/persisting table column widths, directly covering the request. |
| [#3904](https://github.com/homarr-labs/homarr/issues/3904) feat: GPU usage in Dash component | high | V2 supports an optional GPU chart in System Resources, fetches Dashdot GPU data, and leaves GPU unselected by default so installations without GPU telemetry continue to work. |
| [#3805](https://github.com/homarr-labs/homarr/issues/3805) bug: cache invalidation for board settings not working | high | V2 saves board settings and layouts through a unified form, invalidates board/home queries, and rehydrates canonical layout values after saving. |
| [#3597](https://github.com/homarr-labs/homarr/issues/3597) bug: nexcloud integration with subpaths do not work | high | V2 preserves a configured Nextcloud base path while constructing the DAV calendar endpoint, including trailing slashes and an already supplied DAV path. |
| [#3515](https://github.com/homarr-labs/homarr/issues/3515) feat: Personalize the upper right menu bar | high | V2's Header Studio supports per-user header item visibility, ordering, and placement across left, center, and right zones. |
| [#3287](https://github.com/homarr-labs/homarr/issues/3287) feat: sidebars | high | V2 restores configurable left and right sidebar gutters, including width/column controls and preview/onboarding support, addressing the missing sidebars that blocked the reported upgrade path. |
| [#2657](https://github.com/homarr-labs/homarr/issues/2657) feat(auth): support object path for groups and username claims | high | V2 resolves dot-separated OIDC claim paths for both external group synchronization and the configurable username claim. |
| [#2160](https://github.com/homarr-labs/homarr/issues/2160) feat: Two proxmox on one TAB | high | A single Health Monitoring widget now renders every selected Proxmox integration, addressing the report that choosing two standalone hosts displayed only the first. |
| [#1921](https://github.com/homarr-labs/homarr/issues/1921) feat: Add titles and folding for Dynamic Sections | high | V2 replaces Dynamic Sections with Containers that provide editable labels, collapse controls, styling, and nested grouping. |
| [#437](https://github.com/homarr-labs/homarr/issues/437) feat: add board preview | high | The manage-boards page now renders a compact visual preview for each board, matching the requested board preview rather than only listing board names. |

## Every issue

| Issue | Category | V2 disposition | Confidence | Comments |
| --- | --- | --- | --- | ---: |
| [#6850](https://github.com/homarr-labs/homarr/issues/6850) bug: OIDC logout aborts the end-session request before it completes | Bugs | Needs verification | medium | 0 |
| [#6849](https://github.com/homarr-labs/homarr/issues/6849) bug: I can't switch between the dark and light themes | Bugs | Needs verification | medium | 0 |
| [#6847](https://github.com/homarr-labs/homarr/issues/6847) feat(plex): media releases widget should list newly added episodes, not seasons | Integration requests | Not addressed | high | 0 |
| [#6830](https://github.com/homarr-labs/homarr/issues/6830) bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't) | Bugs | Will be fixed with V2 | high | 4 |
| [#6823](https://github.com/homarr-labs/homarr/issues/6823) bug: | Bugs | Needs verification | medium | 6 |
| [#6811](https://github.com/homarr-labs/homarr/issues/6811) bug: Annoying scroll bar | Annoyances | Needs verification | medium | 2 |
| [#6807](https://github.com/homarr-labs/homarr/issues/6807) bug: MCP tools/list fails on invite_createInvite z.date() schema | Bugs | Will be fixed with V2 | high | 0 |
| [#6803](https://github.com/homarr-labs/homarr/issues/6803) feat: Add support for Unraid Storage Pools | Integration requests | Not addressed | high | 0 |
| [#6764](https://github.com/homarr-labs/homarr/issues/6764) aria2 integration: torrents never report 'seeding' state, always 'leeching' | Bugs | Not addressed | high | 0 |
| [#6763](https://github.com/homarr-labs/homarr/issues/6763) bug: Unable to add users/group to board access control when using OIDC via Authentik | Bugs | Will be fixed with V2 | high | 2 |
| [#6761](https://github.com/homarr-labs/homarr/issues/6761) bug: App Management Breaks w/o Modify All Boards Permission | Bugs | Will be fixed with V2 | high | 0 |
| [#6745](https://github.com/homarr-labs/homarr/issues/6745) bug: Unraid health widget reports RAM in GiB approximately 1024x too small | Bugs | Will be fixed with V2 | high | 0 |
| [#6728](https://github.com/homarr-labs/homarr/issues/6728) feat: Ping health-check timeout is hardcoded and too short for slower endpoints | Bugs | Not addressed | high | 0 |
| [#6712](https://github.com/homarr-labs/homarr/issues/6712) bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password | Bugs | Will be fixed with V2 | high | 0 |
| [#6697](https://github.com/homarr-labs/homarr/issues/6697) feat: Use Tb / Gb for UNRAID Integration | Quality of life | Will be fixed with V2 | high | 0 |
| [#6682](https://github.com/homarr-labs/homarr/issues/6682) bug: Immich integration stops working after the latest update | Bugs | Will be fixed with V2 | high | 1 |
| [#6681](https://github.com/homarr-labs/homarr/issues/6681) bug: Immich Integration show as working, zero results. | Bugs | Will be fixed with V2 | high | 1 |
| [#6677](https://github.com/homarr-labs/homarr/issues/6677) feat: save state of accordion in system health monitor | Quality of life | Not addressed | high | 0 |
| [#6671](https://github.com/homarr-labs/homarr/issues/6671) bug: Weather widget not displaying data | Bugs | Will be fixed with V2 | high | 3 |
| [#6644](https://github.com/homarr-labs/homarr/issues/6644) feat: add GPU charts to Beszel System Stats widget | Integration requests | Not addressed | high | 3 |
| [#6643](https://github.com/homarr-labs/homarr/issues/6643) feat: Allow reordering boards in the board switcher | Annoyances | Not addressed | high | 2 |
| [#6628](https://github.com/homarr-labs/homarr/issues/6628) bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL | Bugs | Will be fixed with V2 | high | 14 |
| [#6626](https://github.com/homarr-labs/homarr/issues/6626) feat: allow selecting which disks are shown in health monitoring / disks widgets | Quality of life | Partially addressed | high | 0 |
| [#6622](https://github.com/homarr-labs/homarr/issues/6622) bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login | Bugs | Will be fixed with V2 | high | 11 |
| [#6620](https://github.com/homarr-labs/homarr/issues/6620) bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0 | Bugs | Needs verification | medium | 2 |
| [#6614](https://github.com/homarr-labs/homarr/issues/6614) feat: Add Quven integration | Integration requests | Not addressed | high | 1 |
| [#6608](https://github.com/homarr-labs/homarr/issues/6608) bug: Integration page accessible without board-modify-all permission | Bugs | Will be fixed with V2 | high | 0 |
| [#6600](https://github.com/homarr-labs/homarr/issues/6600) 🚀 Homarr v2 public beta is here! Join the testing | Other / tracking | Partially addressed | high | 29 |
| [#6593](https://github.com/homarr-labs/homarr/issues/6593) bug: Pi-hole v6 / Plex integrations send unauthenticated periodic health-check requests, causing real 401s | Bugs | Not addressed | high | 0 |
| [#6589](https://github.com/homarr-labs/homarr/issues/6589) feat: 2 separate widgets for 2 separate docker instances | Quality of life | Will be fixed with V2 | high | 15 |
| [#6559](https://github.com/homarr-labs/homarr/issues/6559) bug: Releases widget showing "Only the first 1000 results are available" error | Bugs | Needs verification | medium | 1 |
| [#6543](https://github.com/homarr-labs/homarr/issues/6543) Upgrade to MCP v2 (spec 2026-07-28) | Large feature requests | Partially addressed | high | 0 |
| [#6519](https://github.com/homarr-labs/homarr/issues/6519) bug: RSS widget poster images don't load for reddit feeds | Bugs | Not addressed | high | 0 |
| [#6516](https://github.com/homarr-labs/homarr/issues/6516) bug: mysql migration error | Bugs | Not addressed | high | 3 |
| [#6513](https://github.com/homarr-labs/homarr/issues/6513) feat: Windows-style board switcher overlay (Alt-Tab style) when cycling boards | Quality of life | Partially addressed | high | 0 |
| [#6438](https://github.com/homarr-labs/homarr/issues/6438) bug: OOM with 1.71.0 | Bugs | Needs verification | medium | 4 |
| [#6435](https://github.com/homarr-labs/homarr/issues/6435) feat: Expand Homarr API Coverage to Support Full Dashboard Automation | Large feature requests | Partially addressed | high | 3 |
| [#6403](https://github.com/homarr-labs/homarr/issues/6403) feat: Dynamic apps fetched from reverse proxy | Large feature requests | Not addressed | high | 6 |
| [#6392](https://github.com/homarr-labs/homarr/issues/6392) feat: Switch Board via keyboard shortcut | Quality of life | Partially addressed | high | 0 |
| [#6300](https://github.com/homarr-labs/homarr/issues/6300) bug: Memory leak | Bugs | Needs verification | medium | 5 |
| [#6271](https://github.com/homarr-labs/homarr/issues/6271) bug: TrueNAS Integration eating up memory on TrueNAS host | Bugs | Needs verification | medium | 0 |
| [#6254](https://github.com/homarr-labs/homarr/issues/6254) feat: aMule | Integration requests | Not addressed | high | 0 |
| [#6207](https://github.com/homarr-labs/homarr/issues/6207) bug: Unifi integration not working | Bugs | Will be fixed with V2 | high | 1 |
| [#6177](https://github.com/homarr-labs/homarr/issues/6177) bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion | Bugs | Needs verification | low | 1 |
| [#6155](https://github.com/homarr-labs/homarr/issues/6155) feat: re-open: Transfer to the existing Dashdot graphs?  #5964 | Quality of life | Not addressed | high | 2 |
| [#6153](https://github.com/homarr-labs/homarr/issues/6153) feat: re-open: add open webui  #3766 | Integration requests | Partially addressed | medium | 0 |
| [#6152](https://github.com/homarr-labs/homarr/issues/6152) feat: re-open: add Wazuh  #3765 | Integration requests | Not addressed | high | 2 |
| [#6050](https://github.com/homarr-labs/homarr/issues/6050) bug: background image is absent or cut off with white space | Bugs | Partially addressed | medium | 1 |
| [#6024](https://github.com/homarr-labs/homarr/issues/6024) bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901) | Bugs | Needs verification | medium | 0 |
| [#6008](https://github.com/homarr-labs/homarr/issues/6008) bug: manage/about page fails to load with ECONNREFUSED | Bugs | Will be fixed with V2 | high | 3 |
| [#6002](https://github.com/homarr-labs/homarr/issues/6002) bug: Uptime-Kuma, paused has no effect | Bugs | Not addressed | high | 1 |
| [#5867](https://github.com/homarr-labs/homarr/issues/5867) feat: REST Endpoint  to manage boards | Large feature requests | Will be fixed with V2 | high | 2 |
| [#5769](https://github.com/homarr-labs/homarr/issues/5769) feat: Support Kubernetes integration as dashboard widgets instead of a global tool for multi-tenant access control | Large feature requests | Not addressed | high | 0 |
| [#5730](https://github.com/homarr-labs/homarr/issues/5730) bug: Administration menu breaks if you click around the options too much | Bugs | Partially addressed | high | 7 |
| [#5716](https://github.com/homarr-labs/homarr/issues/5716) bug: OIDC group assignment is not working if user is only in one group | Bugs | Not addressed | high | 0 |
| [#5538](https://github.com/homarr-labs/homarr/issues/5538) bug: No integration data available for unraid disks | Bugs | Not addressed | high | 10 |
| [#5387](https://github.com/homarr-labs/homarr/issues/5387) feat: Pushover Integration | Integration requests | Not addressed | high | 3 |
| [#5342](https://github.com/homarr-labs/homarr/issues/5342) bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration | Bugs | Will be fixed with V2 | high | 5 |
| [#5336](https://github.com/homarr-labs/homarr/issues/5336) feat: widget to display missing / queued movies & episodes | Quality of life | Will be fixed with V2 | high | 3 |
| [#5154](https://github.com/homarr-labs/homarr/issues/5154) feat: SLO (Single Log-out) | Large feature requests | Not addressed | high | 6 |
| [#5085](https://github.com/homarr-labs/homarr/issues/5085) bug: Unable to connect to LDAP | Bugs | Needs verification | medium | 8 |
| [#4973](https://github.com/homarr-labs/homarr/issues/4973) bug: System Resources Incorrect Total Ram for TrueNAS 25.04 | Bugs | Will be fixed with V2 | high | 2 |
| [#4965](https://github.com/homarr-labs/homarr/issues/4965) bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name | Bugs | Needs verification | medium | 4 |
| [#4906](https://github.com/homarr-labs/homarr/issues/4906) feat: Top right UI Cleanup (concept video inside) | Quality of life | Partially addressed | medium | 3 |
| [#4815](https://github.com/homarr-labs/homarr/issues/4815) feature: Seed the database with a showcase default dashboard using the new JSON import endpoint | Large feature requests | Partially addressed | high | 0 |
| [#4797](https://github.com/homarr-labs/homarr/issues/4797) feat(releases): support image tags | Bugs | Partially addressed | high | 6 |
| [#4766](https://github.com/homarr-labs/homarr/issues/4766) bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy | Bugs | Needs verification | medium | 5 |
| [#4738](https://github.com/homarr-labs/homarr/issues/4738) bug: Dashboard Layout - Saving Changes Failure | Bugs | Needs verification | medium | 4 |
| [#4563](https://github.com/homarr-labs/homarr/issues/4563) feat: Generic Game Server Status Widget | Integration requests | Not addressed | high | 3 |
| [#4562](https://github.com/homarr-labs/homarr/issues/4562) feat(integrations): support music media type for seerr | Integration requests | Not addressed | high | 10 |
| [#4543](https://github.com/homarr-labs/homarr/issues/4543) feat: Edit apps inside Edit Item | Quality of life | Will be fixed with V2 | high | 0 |
| [#4541](https://github.com/homarr-labs/homarr/issues/4541) feat(boards): support automatic layout for different screen sizes | Large feature requests | Partially addressed | high | 9 |
| [#4538](https://github.com/homarr-labs/homarr/issues/4538) bug: iCal widget intergration not working | Bugs | Not addressed | high | 1 |
| [#4533](https://github.com/homarr-labs/homarr/issues/4533) feat: show Description next to title for application | Quality of life | Will be fixed with V2 | high | 2 |
| [#4455](https://github.com/homarr-labs/homarr/issues/4455) feat: Ability to disable users without deleting them. | Quality of life | Not addressed | high | 3 |
| [#4406](https://github.com/homarr-labs/homarr/issues/4406) bug: OIDC not working with Cloudflare Zero Trust / SaaS | Bugs | Needs verification | medium | 14 |
| [#4361](https://github.com/homarr-labs/homarr/issues/4361) feat(media-releases): support selection of user for library fetching | Quality of life | Not addressed | high | 3 |
| [#4330](https://github.com/homarr-labs/homarr/issues/4330) feat(icon-picker): show more than 12 icons per source | Quality of life | Partially addressed | high | 2 |
| [#4246](https://github.com/homarr-labs/homarr/issues/4246) bug: download client sorting only on client side | Bugs | Not addressed | high | 6 |
| [#4190](https://github.com/homarr-labs/homarr/issues/4190) bug: Cannot integrate with OMV, Invalid system information response | Bugs | Needs verification | medium | 7 |
| [#4159](https://github.com/homarr-labs/homarr/issues/4159) bug: Tasks page does not load | Bugs | Will be fixed with V2 | high | 1 |
| [#4157](https://github.com/homarr-labs/homarr/issues/4157) feat: Download Client Item - Job Name column should be wider than the rest. | Quality of life | Will be fixed with V2 | high | 4 |
| [#4143](https://github.com/homarr-labs/homarr/issues/4143) feat: separate region from language | Quality of life | Not addressed | high | 2 |
| [#4026](https://github.com/homarr-labs/homarr/issues/4026) bug: Downloads: number of shown entries per intergration include already hidden entries | Bugs | Not addressed | high | 2 |
| [#3990](https://github.com/homarr-labs/homarr/issues/3990) feat: Allow one URL and just map ports for each app | Quality of life | Partially addressed | high | 2 |
| [#3913](https://github.com/homarr-labs/homarr/issues/3913) feat: Support running as fully non-root containers | Large feature requests | Partially addressed | high | 2 |
| [#3904](https://github.com/homarr-labs/homarr/issues/3904) feat: GPU usage in Dash component | Quality of life | Will be fixed with V2 | high | 3 |
| [#3887](https://github.com/homarr-labs/homarr/issues/3887) feat: allow no network for system resources and allow proxmox to be used | Quality of life | Partially addressed | high | 3 |
| [#3853](https://github.com/homarr-labs/homarr/issues/3853) feat: Allow Docker stats widget to be seen without admin privileges | Quality of life | Not addressed | high | 2 |
| [#3843](https://github.com/homarr-labs/homarr/issues/3843) feat: Ability to set the border color or transparency of tables in the Notebook widget | Quality of life | Not addressed | high | 2 |
| [#3805](https://github.com/homarr-labs/homarr/issues/3805) bug: cache invalidation for board settings not working | Bugs | Will be fixed with V2 | high | 1 |
| [#3786](https://github.com/homarr-labs/homarr/issues/3786) feat: automatic service discovery | Integration requests | Partially addressed | high | 1 |
| [#3784](https://github.com/homarr-labs/homarr/issues/3784) feat(app-widget): container linking & run toggling | Large feature requests | Not addressed | high | 0 |
| [#3778](https://github.com/homarr-labs/homarr/issues/3778) feat(boards): configure default behaviour for open in new tab | Quality of life | Not addressed | high | 1 |
| [#3771](https://github.com/homarr-labs/homarr/issues/3771) feat(boards): open all apps | Quality of life | Partially addressed | high | 1 |
| [#3758](https://github.com/homarr-labs/homarr/issues/3758) feat(release-widget): synchronize marked as viewed over multiple devices | Quality of life | Not addressed | high | 2 |
| [#3732](https://github.com/homarr-labs/homarr/issues/3732) Release Widget: Icon only | Quality of life | Needs verification | medium | 0 |
| [#3731](https://github.com/homarr-labs/homarr/issues/3731) Release Widget: Docker importable programs | Bugs | Partially addressed | medium | 0 |
| [#3704](https://github.com/homarr-labs/homarr/issues/3704) bug: removed integrations keep coming back | Bugs | Not addressed | high | 0 |
| [#3696](https://github.com/homarr-labs/homarr/issues/3696) feat: Integration for Scrutiny | Integration requests | Not addressed | high | 4 |
| [#3675](https://github.com/homarr-labs/homarr/issues/3675) bug: Stopping the container with SIGTERM fails | Bugs | Needs verification | medium | 3 |
| [#3597](https://github.com/homarr-labs/homarr/issues/3597) bug: nexcloud integration with subpaths do not work | Bugs | Will be fixed with V2 | high | 0 |
| [#3595](https://github.com/homarr-labs/homarr/issues/3595) feat: Focus search bar like pre 1.0 | Quality of life | Partially addressed | medium | 1 |
| [#3515](https://github.com/homarr-labs/homarr/issues/3515) feat: Personalize the upper right menu bar | Quality of life | Will be fixed with V2 | high | 2 |
| [#3512](https://github.com/homarr-labs/homarr/issues/3512) feat: Add Support for Homey API Integration | Integration requests | Not addressed | high | 6 |
| [#3478](https://github.com/homarr-labs/homarr/issues/3478) feat(login): add possibility to specify forgot password link | Quality of life | Not addressed | high | 5 |
| [#3407](https://github.com/homarr-labs/homarr/issues/3407) bug: background jittering when scrolling | Bugs | Needs verification | medium | 7 |
| [#3371](https://github.com/homarr-labs/homarr/issues/3371) feat: upload video backgrounds | Quality of life | Not addressed | high | 2 |
| [#3287](https://github.com/homarr-labs/homarr/issues/3287) feat: sidebars | Large feature requests | Will be fixed with V2 | high | 10 |
| [#3266](https://github.com/homarr-labs/homarr/issues/3266) feat: Multiple Docker Environments in GUI | Large feature requests | Partially addressed | high | 7 |
| [#3220](https://github.com/homarr-labs/homarr/issues/3220) bug(calendar): Nextcloud integration - not all entries are displayed | Bugs | Partially addressed | medium | 8 |
| [#3140](https://github.com/homarr-labs/homarr/issues/3140) bug: Bookmark and notebook widget not working anymore | Bugs | Needs verification | medium | 21 |
| [#3064](https://github.com/homarr-labs/homarr/issues/3064) feat(integrations): store sessions for emby / jellyfin | Integration requests | Not addressed | high | 3 |
| [#3055](https://github.com/homarr-labs/homarr/issues/3055) feat: Provide SSO user information - groups and other auth info | Quality of life | Not addressed | high | 0 |
| [#2911](https://github.com/homarr-labs/homarr/issues/2911) bug: Cannot drag apps from dynamic zone | Bugs | Needs verification | medium | 2 |
| [#2861](https://github.com/homarr-labs/homarr/issues/2861) bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width | Bugs | Partially addressed | high | 13 |
| [#2657](https://github.com/homarr-labs/homarr/issues/2657) feat(auth): support object path for groups and username claims | Quality of life | Will be fixed with V2 | high | 4 |
| [#2555](https://github.com/homarr-labs/homarr/issues/2555) feat: add settings to configure file upload limit | Quality of life | Not addressed | high | 1 |
| [#2508](https://github.com/homarr-labs/homarr/issues/2508) feat: log source ip for failed login attempts | Quality of life | Not addressed | high | 3 |
| [#2495](https://github.com/homarr-labs/homarr/issues/2495) feat: Redirect to login page if not logged in | Quality of life | Partially addressed | high | 1 |
| [#2482](https://github.com/homarr-labs/homarr/issues/2482) feat: add all relevant tRPC queries / mutations as openapi endpoint | Large feature requests | Partially addressed | high | 1 |
| [#2480](https://github.com/homarr-labs/homarr/issues/2480) feat: fetch app icons automatically | Quality of life | Not addressed | high | 0 |
| [#2478](https://github.com/homarr-labs/homarr/issues/2478) feat: import / export apps | Quality of life | Not addressed | high | 0 |
| [#2362](https://github.com/homarr-labs/homarr/issues/2362) feat: wake on lan widget | Integration requests | Not addressed | high | 5 |
| [#2294](https://github.com/homarr-labs/homarr/issues/2294) feat: Integration with FileFlows | Integration requests | Not addressed | high | 4 |
| [#2160](https://github.com/homarr-labs/homarr/issues/2160) feat: Two proxmox on one TAB | Integration requests | Will be fixed with V2 | high | 2 |
| [#2154](https://github.com/homarr-labs/homarr/issues/2154) feat: Re-add ability to use different port number | Quality of life | Not addressed | high | 7 |
| [#2095](https://github.com/homarr-labs/homarr/issues/2095) feat: add css templates | Quality of life | Partially addressed | high | 6 |
| [#2078](https://github.com/homarr-labs/homarr/issues/2078) feat: Permission per App / App-Element / Dynamic Group | Large feature requests | Partially addressed | high | 13 |
| [#1921](https://github.com/homarr-labs/homarr/issues/1921) feat: Add titles and folding for Dynamic Sections | Quality of life | Will be fixed with V2 | high | 10 |
| [#1014](https://github.com/homarr-labs/homarr/issues/1014) feat: Import browser bookmarks | Quality of life | Not addressed | high | 2 |
| [#962](https://github.com/homarr-labs/homarr/issues/962) bug: item and dynamic section menus overlap | Annoyances | Needs verification | medium | 0 |
| [#925](https://github.com/homarr-labs/homarr/issues/925) feat: import items from another board | Quality of life | Partially addressed | high | 2 |
| [#437](https://github.com/homarr-labs/homarr/issues/437) feat: add board preview | Quality of life | Will be fixed with V2 | high | 1 |
| [#125](https://github.com/homarr-labs/homarr/issues/125) Dependency Dashboard | Other / tracking | Not addressed | high | 0 |

## Detailed assessments

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

### #6849 — bug: I can't switch between the dark and light themes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6849) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** This is a duplicate of #6823 with a separate Ubuntu/Portainer/LDAP report and no comments. The current v2 theme setter wiring exists, but it does not prove the Chromium event failure from the related Citrix report is fixed.

**Conversation (0 comments read):** The reporter says the profile theme control is inert across Edge and Firefox on an Ubuntu/Portainer/LDAP deployment. The timeline has no direct comments; #6823 identifies it as the same incident and later isolates the failure to Citrix VDI pointer events. Treat this issue as the duplicate environment report and keep it pending a controlled reproduction.

**V2 evidence:**

- apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx:13-16 + the profile control is wired to setColorScheme. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx#L13)
- apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx:39-50 + 66-79 + theme changes are persisted through cookie and server mutation wiring, but no VDI/event workaround is present. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx#L39)
- apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx:38-46 + the board provider consumes the manager's color-scheme value. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx#L38)
- reports/v2-issue-triage/source/timelines/6849.json:commented events + the timeline cross-references duplicate #6823 and contains no independent fix or validation.

**Remaining / follow-up:** Reproduce this exact deployment and browser, then compare with the Citrix VDI event trace from #6823. Verify mouseup/click delivery and determine whether a browser/Portainer policy or Mantine event workaround is needed before calling it fixed.

### #6847 — feat(plex): media releases widget should list newly added episodes, not seasons

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6847) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The Plex media-releases integration still fetches /library/recentlyAdded, which returns season records and cannot surface new episodes added to an existing season. The proposed episode endpoint PR is open and not in v2.

**Conversation (0 comments read):** The requester demonstrates that Plex episode records have newer addedAt timestamps while Homarr's recentlyAdded response contains older season records. They propose querying the show-library episode endpoint, mapping SxxExx details, and using addedAt instead of originallyAvailableAt for recently-added semantics. Related historical issues are listed. PR #6848 proposes this change but is open/unmerged and has no v2 ancestor.

**V2 evidence:**

- packages/integrations/src/plex/plex-integration.ts:159-170 + getMediaReleasesAsync still requests /library/recentlyAdded. — [source L159](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L159)
- packages/integrations/src/plex/plex-integration.ts:212-229 + the current mapper accepts season/episode records returned by that endpoint but does not enumerate episodes in each show library. — [source L212](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L212)
- packages/integrations/src/plex/plex-integration.ts:306-323 + MediaRelease schema supports generic type/date fields, but no show-episode query or addedAt-specific mapping exists here. — [source L306](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L306)
- reports/v2-issue-triage/source/linked-prs/6848.json:triage_merge_commit_is_ancestor_of_v2 + false; the proposed /library/sections/{id}/all?type=4&sort=addedAt:desc implementation is not present in release/v2.

**Remaining / follow-up:** Query show-library episodes (or a Plex recently-added episode hub), sort by addedAt, map grandparent/season/episode/title, and cover grouping/fallback behavior. Update tests and preserve token/auth handling.

### #6830 — bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6830) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The WUD v9 integration now uses authenticated /api/containers requests and the merged v2 PR #6831 explicitly fixes the connection-test/widget data-path mismatch.

**Conversation (4 comments read):** The reporter showed that WUD v9 Basic Auth connection testing succeeds while the widget data request fails, despite curl returning /api/containers. Another user reproduced it. The maintainer said it was fixed on the v2 beta and would release alongside v2; PR #6831 is merged into release/v2.

**V2 evidence:**

- packages/integrations/src/wud/wud-integration.ts:15-35 + the connection test uses /api/containers, auth headers, and the current response schema. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L15)
- packages/integrations/src/wud/wud-integration.ts:38-50 + widget data fetch uses the same authenticated /api/containers endpoint with bounded timeout. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L38)
- packages/integrations/src/wud/wud-integration.ts:53-63 + Basic Auth is built from the configured WUD credentials. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L53)
- reports/v2-issue-triage/source/linked-prs/6831.json:triage_merge_commit_is_ancestor_of_v2 + true; merged metadata says WUD v9 auth URLs, /api/containers, docs/tests, and #6830 are fixed in v2.

**Remaining / follow-up:** Confirm with a live WUD 9 instance if desired, but the merged v2 implementation addresses the reported mismatch and will be fixed with v2.

### #6823 — bug:

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6823) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The reported dark-mode failure is limited to Citrix VDI in the conversation and is not explained by a confirmed v2 fix. The current combobox calls the theme setter, but Mantine event delivery failure in that environment remains unaddressed.

**Conversation (6 comments read):** The reporter says theme selection has failed across several Homarr versions and browsers for a migrated user. Maintainers could not reproduce it on normal systems. The reporter then isolated it to Citrix virtual desktops and observed pointerdown/mousedown without mouseup/click; the same VDI event issue affects board-user permission changes. #6849 is a duplicate. This points to a browser/event-environment problem rather than proof that the theme state manager is broken.

**V2 evidence:**

- apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx:13-16 + the control receives colorScheme and passes setColorScheme to the current option selection. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx#L13)
- apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx:39-50 + 66-79 + the manager wires the theme setter to cookie persistence and a server mutation, while subscribe/unsubscribe/clear are no-op manager hooks. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx#L39)
- apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx:13-20 + 38-46 + board theme rendering consumes the provider/manager state. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx#L13)
- reports/v2-issue-triage/source/6823.json:full_comments + the final debug comment records POINTERDOWN/MOUSEDOWN but no MOUSEUP/CLICK inside VDI, and no v2 fix is claimed.

**Remaining / follow-up:** Reproduce on the affected Citrix VDI/browser and inspect Mantine Combobox event handling, pointer capture, and virtualization policies. Test the theme control and board permission controls with the same VDI policies before deciding on a Homarr workaround; the setter wiring alone does not prove the no-op is fixed.

### #6811 — bug: Annoying scroll bar

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6811) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** The supplied Chrome crop confirms visible vertical and horizontal scrollbars in the header/banner area, but it does not identify their owning element; release/v2 still permits horizontal scrolling inside header zones, so banner removal alone cannot establish resolution.

**Conversation (2 comments read):** The complete body and both comments were read. The report is a low-impact Chrome-only observation from Homarr 1.77 with a screenshot, and says the bars remain after dismissing the version banner. The maintainer says the announcement banner will be removed in a later release and also notes only Firefox was tested. The saved crop visibly contains a vertical bar at the right and a horizontal bar along the bottom, but image evidence cannot determine whether the page or a header descendant owns either scroller. Current release/v2 CSS hides overflow on the outer header while desktop and mobile zones still set overflow-x:auto. No browser runtime check was performed, so source inspection cannot determine whether the exact bars persist after the banner is gone.

**V2 evidence:**

- reports/v2-issue-triage/source/6811.json:10-88 — complete issue body was read; it describes the Chrome screenshot, banner-dismissed observation, version, and low impact.
- reports/v2-issue-triage/source/6811.json:88-182 — both comments were read; they discuss removing the announcement banner and limited Firefox testing.
- reports/v2-issue-triage/source/attachments/6811-1.png — saved crop visibly shows a vertical scrollbar at the right and a horizontal scrollbar along the bottom of the cropped area, without establishing the DOM owner.
- apps/nextjs/src/components/layout/header/configurable-header.module.css:1-3,24-38 — the outer header hides overflow, while desktop zones allow horizontal overflow with overflow-x:auto. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L1)
- apps/nextjs/src/components/layout/header/configurable-header.module.css:91-99; apps/nextjs/src/components/layout/header/configurable-header.tsx:110-146 — mobile zones also allow horizontal overflow and the component renders the desktop/mobile header zones. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L91), [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L110)

**Remaining / follow-up:** Reproduce on the verified release/v2 revision in Chrome, inspect the owning scroll container and dimensions, and compare with the historical V1 screenshot. The V1 beta banner is not a V2 runtime fixture. If overflow remains, identify its cause before considering a fix.

### #6807 — bug: MCP tools/list fails on invite_createInvite z.date() schema

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6807) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 exposes the invite expiration as an ISO string schema and converts it to Date only at persistence, making tools/list JSON-compatible.

**Conversation (0 comments read):** No comments were present. The issue reports MCP tools/list failing while converting invite_createInvite's z.date schema. The merged v2 invitation-schema fix changes the public input to an ISO datetime string and current MCP tests cover timestamp conversion/validation.

**V2 evidence:**

- packages/api/src/router/invite.ts:55-61,70-84 — createInvite accepts z.iso.datetime({ offset: true }), documents an ISO string to MCP, then constructs a Date for the database. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/invite.ts#L55)
- packages/api/src/mcp-tools.ts:99-139 — MCP extraction converts Zod inputs to JSON Schema, forces an object root, validates the schema, and records safe diagnostics. — [source L99](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/mcp-tools.ts#L99)
- apps/nextjs/src/app/api/mcp/_protocol.ts:43-49 — the protocol registers the JSON-Schema-derived input with the MCP server instead of passing the Zod date schema. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L43)
- apps/nextjs/src/app/api/mcp/_protocol.spec.ts:297-320 — tests accept ISO timestamps (including no seconds/offset forms) and reject invalid dates. — [source L297](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.spec.ts#L297)

**Remaining / follow-up:** No remaining gap for the reported tools/list failure. Verify a live MCP tools/list and invite call after deployment if protocol/client versions differ.

### #6803 — feat: Add support for Unraid Storage Pools

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6803) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2's Unraid GraphQL query and schema still cover array disks only; they do not request or map array caches/storage pools.

**Conversation (0 comments read):** No comments were present. The request specifies the Unraid GraphQL caches fields (id, name, device, size, status, temp, fsSize, fsFree, fsUsed, type, isSpinning) and asks for array plus pool/pool-only support while tolerating null filesystem fields. Cross-reference #5538 is a related missing-data bug, not evidence of a v2 implementation.

**V2 evidence:**

- packages/integrations/src/unraid/unraid-integration.ts:84-121 — the GraphQL query requests array.state, capacity.disks, and array.disks fields, with no array.caches selection. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84)
- packages/integrations/src/unraid/unraid-types.ts:21-40 — the parsed array schema contains capacity.disks and disks only; there is no caches/pools object. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L21)
- packages/integrations/src/unraid/unraid-integration.ts:36-67 — mapped system information is built from the existing array.disks path and cannot expose pool records. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/widgets/src/health-monitoring/system-health.tsx:210-225 — the health UI formats the existing disk data but has no storage-pool data source. — [source L210](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L210)

**Remaining / follow-up:** Add version-tolerant GraphQL caches/pools query fields and nullable schema/mapping, then render and test array, cache-only, and null filesystem cases. Do not close this from the #5538 reference.

### #6764 — aria2 integration: torrents never report 'seeding' state, always 'leeching'

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6764) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2 still maps every active torrent to leeching. Aria2Download exposes totalLength and completedLength, and the integration already calculates progress from those fields, but getTorrentState receives only the status and returns leeching unconditionally for active. It never checks whether completedLength equals totalLength or uses the seeder flag to report seeding.

**Conversation (0 comments read):** The issue identifies the exact mapping defect and proposes comparing completedLength and totalLength for active torrents. There are no comments or linked PRs. Current V2 source retains the same active-to-leeching branch even though the needed lengths are available in the fetched record, so the reported state bug remains.

**V2 evidence:**

- packages/integrations/src/download-client/aria2/aria2-integration.ts:48-68 — totalLength and completedLength are read for progress, but state is delegated to getState with only status and torrent boolean. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L48)
- packages/integrations/src/download-client/aria2/aria2-integration.ts:150-185 — getTorrentState maps active directly to leeching and has no completed-length/seeder comparison. — [source L150](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L150)
- packages/integrations/src/download-client/aria2/aria2-types.ts:37-49 — Aria2Download includes totalLength, completedLength, and optional seeder data needed for the requested distinction. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-types.ts#L37)

**Remaining / follow-up:** Pass completion/seeder information into torrent state mapping, return seeding for fully downloaded active torrents, and add focused regression coverage for active, queued, complete, paused, and incomplete cases.

### #6763 — bug: Unable to add users/group to board access control when using OIDC via Authentik

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6763) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 separates board access permissions from the general board-settings form and submits user/group permissions through dedicated mutations. This removes the nested/unified-form reset path reported with Authentik and Pocket ID.

**Conversation (2 comments read):** The reporter says adding an OIDC user or group to board access control appears to save and then resets without a database change. A second comment reports the same behavior with Pocket ID. The maintainer says it is fixed as part of v2 and points to #6662; the timeline records the fix relationship. The exact PR commit is not the current ancestor, but the current v2 source has the relevant independent access form and mutation structure.

**V2 evidence:**

- reports/v2-issue-triage/source/6763.json:1 — the complete body and both full comments were read, including Authentik/Pocket ID reproduction and the maintainer's v2-fix statement.
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:179-216 — the general settings form closes before BoardAccessSettings is rendered, so board access controls are not nested in the unified save form. — [source L179](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L179)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_board-access.tsx:18-67 — board access uses dedicated saveGroupBoardPermissions and saveUserBoardPermissions mutations. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_board-access.tsx#L18)
- apps/nextjs/src/components/access/access-settings.tsx:89-115 — group and user submissions call their own mutations and invalidate the access query on success. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/access-settings.tsx#L89)
- apps/nextjs/src/components/access/group-access-form.tsx:27-37,61-79 — group access has a standalone form and submission path. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/group-access-form.tsx#L27)
- apps/nextjs/src/components/access/user-access-form.tsx:44-56,83-102 — user access has the corresponding standalone form and save path. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/user-access-form.tsx#L44)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2 retains board permissions as an explicit access boundary, consistent with the separated board-access flow. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** No source gap remains for the reported form-reset behavior. If the issue was forgotten open, mention it as fixed with v2; a future report should include provider claim shape or a mutation error if access persistence fails after this separation.

### #6761 — bug: App Management Breaks w/o Modify All Boards Permission

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6761) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 derives app-management page access from app permissions, so a user with app-create or app-modify-all no longer needs the unrelated board-modify-all permission to load /manage/apps.

**Conversation (0 comments read):** The complete body and zero comments were read. The report says users who can create/use/modify apps receive Not Found unless they are also granted Modify All Boards, and the workaround over-scopes access. Current page code calls getAppsSectionAccess and only gates on its returned app access; the helper delegates to app permissions, with app-create or app-modify-all satisfying canAccess. The manage layout uses the same app-specific section access. This source path removes the board permission dependency described by the report. No runtime permission matrix was exercised in this source-only review.

**V2 evidence:**

- reports/v2-issue-triage/source/6761.json:10-88 — complete bug report was read; it describes the Not Found behavior, the app permissions held, and the over-broad board-permission workaround, with no comments.
- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-55 — the app-management page calls getAppsSectionAccess and returns Not Found only when that app-specific access is absent. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/_access.ts:11-12 — the section-access wrapper delegates to the app-management access calculation rather than a board permission check. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/_access.ts#L11)
- packages/definitions/src/permissions.ts:231-236 — getAppManagementAccess makes canAccess true for app-modify-all or app-create, independently of board permissions. — [source L231](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L231)
- apps/nextjs/src/app/[locale]/manage/layout.tsx:70-95 — management navigation applies the same app-specific access model for the section. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/layout.tsx#L70)

**Remaining / follow-up:** Verify release/v2 with users holding each supported app permission combination and no board-modify-all permission, including direct navigation and management navigation visibility. Confirm unrelated app API actions still enforce their own permissions.

### #6745 — bug: Unraid health widget reports RAM in GiB approximately 1024x too small

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6745) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 computes Unraid memory usage from the byte-valued metrics total minus available, matching the correction requested for the roughly 1024x-too-small RAM ring.

**Conversation (0 comments read):** The complete body and zero comments were read. The report compares an Unraid 7.3.2 memory total with Homarr 1.76.1 showing approximately 1024 times less RAM and proposes calculating used memory as total minus available. Current release/v2 uses `systemInfo.metrics.memory.total` and `available`, clamps the subtraction at zero, and returns those byte values to the health widget. The GraphQL query requests the metrics fields directly and the schema validates non-negative numeric values. Merged PR #6781 is recorded as a release/v2 ancestor. This is source evidence for the correction; no live Unraid payload or release image was run during triage.

**V2 evidence:**

- reports/v2-issue-triage/source/6745.json:10-88 — complete bug report was read; it gives the 1024x discrepancy, Unraid version, and total-minus-available proposal, with no comments.
- reports/v2-issue-triage/source/linked-prs/6781.json:12,34-39,419 — merged PR #6781 addresses the Unraid health memory calculation and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/unraid/unraid-integration.ts:36-55 — the returned memory object now sets total from metrics.memory.total and used to `Math.max(total - available, 0)`, preserving byte units. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/integrations/src/unraid/unraid-integration.ts:84-103; packages/integrations/src/unraid/unraid-types.ts:3-20 — the query and validation schema supply and validate the metrics memory total/available fields used by that calculation. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84), [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L3)
- packages/widgets/src/health-monitoring/system-health.tsx:117-119,196-199 — the health display consumes the integration memory total/used values for the RAM ring. — [source L117](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L117)

**Remaining / follow-up:** Feed an actual Unraid 7.3.2 response through a release/v2 deployment and confirm the rendered GiB value. No runtime image or browser check was performed in this source-only review.

### #6728 — feat: Ping health-check timeout is hardcoded and too short for slower endpoints

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6728) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** App health checks still use the shared hardcoded 10-second HTTP timeout without a per-app or global setting, so slow but healthy endpoints remain unable to configure a longer wait.

**Conversation (0 comments read):** The requester reports a Nextcloud AIO endpoint taking 7–8 seconds and being marked down, asks for per-app/global configurability or a longer default, and includes the AbortError. There are no comments or a linked fix. The current call chain confirms the timeout has no exposed override.

**V2 evidence:**

- packages/core/src/infrastructure/http/timeout.ts:4-15 + withTimeoutAsync defaults to 10000ms and accepts no application setting in this helper path. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/http/timeout.ts#L4)
- packages/ping/src/index.ts:11-33 + sendPingRequestAsync calls withTimeoutAsync without a timeout argument. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/ping/src/index.ts#L11)
- packages/api/src/router/widgets/app.ts:30-43 + app ping uses the shared sendPingRequestAsync path for pingUrl or href. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/app.ts#L30)
- packages/validation/src/app.ts + current app configuration schema contains no ping timeout field exposed to users.

**Remaining / follow-up:** Add a validated per-app or global health-check timeout and document the trade-off, or raise the default after measuring impact. Preserve abort/error reporting and add coverage for endpoints just beyond the default.

### #6712 — bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6712) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 sends HTTP Basic authentication for both WUD connection tests and container data requests.

**Conversation (0 comments read):** No comments were present. The report says WUD protected by username/password fails despite the service working without auth. Merged v2 PR #6831 adds the auth header to both relevant paths and validates the WUD containers response.

**V2 evidence:**

- packages/integrations/src/wud/wud-integration.ts:15-35 — connection testing requests /api/containers with getAuthHeaders and parses the response. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L15)
- packages/integrations/src/wud/wud-integration.ts:38-50 — dashboard data uses the same authenticated /api/containers request with timeout handling. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L38)
- packages/integrations/src/wud/wud-integration.ts:53-63 — username/password secrets are encoded into an Authorization: Basic header. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L53)

**Remaining / follow-up:** Verify against WUD 9 and a reverse proxy that requires Basic auth, including invalid-credential error handling. Source evidence confirms the requested auth path is present.

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

### #6682 — bug: Immich integration stops working after the latest update

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6682) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The reviewed V2 request layer preserves SDK headers, including x-api-key, rather than object-spreading a Headers instance. The conversation also records the 1.76.0 Immich regression as fixed in 1.76.1; current source supports this as a V2 fix candidate.

**Conversation (1 comments read):** The reporter saw an unknown integration error after upgrading to 1.76.0 and said regenerating the API key did not help. The single comment says the problem was fixed in 1.76.1. Current V2 forwards fetch options without replacing caller headers. The separately identified dev fix commit 31e218295 is not an ancestor of this V2 checkout and must not be used as ancestry evidence.

**V2 evidence:**

- reports/v2-issue-triage/source/6682.json:1 — the complete body and one full comment were read, including the 1.76.0 regression and 1.76.1 fix report.
- packages/core/src/infrastructure/http/request.ts:74-101 — current fetchWithTrustedCertificatesAsync forwards caller fetch options and headers without object-spreading a Headers instance into a plain object. — [source L74](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/http/request.ts#L74)
- packages/integrations/src/immich/immich-integration.ts:94-104 — Immich calls the SDK with request options from the shared fetch layer, so the preserved SDK headers reach the API. — [source L94](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L94)
- packages/integrations/src/immich/immich-integration.ts:142-158 — asset proxying supplies the x-api-key explicitly when creating image links. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L142)

**Remaining / follow-up:** No code gap remains for the reported 1.76.0 API-key regression. If the issue remains open, mention it as fixed in v2; a different current Immich error would need a new request payload/version reproduction.

### #6681 — bug: Immich Integration show as working, zero results.

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6681) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The Immich integration now builds authenticated SDK request options for album and asset calls; the issue conversation also records the album 401 as fixed in version 1.76.1, which predates release/v2.

**Conversation (1 comments read):** The reporter gave a reproducible album-list/detail 401 while ping and direct curl with the same API key succeeded, making the album carousel unusable. The only follow-up states that it was fixed with version 1.76.1. Current release/v2 is later and the integration code carries the API key into its SDK request options.

**V2 evidence:**

- packages/integrations/src/immich/immich-integration.ts:69-113 + album listing/detail methods use the integration request path rather than an unauthenticated URL. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L69)
- packages/integrations/src/immich/immich-integration.ts:115-120 + connection testing remains explicit and separate from album methods. — [source L115](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L115)
- packages/integrations/src/immich/immich-integration.ts:122-139 + 167-181 + album assets and the SDK client are initialized with baseUrl /api and the configured apiKey. — [source L122](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L122)
- reports/v2-issue-triage/source/6681.json:full_comments + the issue's sole follow-up records Fixed with version 1.76.1, before the v2 base.

**Remaining / follow-up:** Run a live Immich album-carousel smoke check against a current Immich server if release confidence is required; no source-level gap remains for the reported unauthenticated album calls.

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

### #6671 — bug: Weather widget not displaying data

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6671) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 handles the intentional NO_EXTERNAL_CONNECTION case explicitly and includes the merged weather fix for disabled external connections.

**Conversation (3 comments read):** All three comments were read. The maintainer identified NO_EXTERNAL_CONNECTION=true and proposed #6674. The reporter confirmed they had enabled that flag and, after re-adding the widget, saw the clear outbound-connections-disabled message. Replacement fix #6780 is merged into V2. This resolves the misleading setup/error state, not a promise to fetch weather while outbound requests are disabled.

**V2 evidence:**

- packages/api/src/router/widgets/weather.ts:13-19 — the weather query returns null when outbound connections are intentionally disabled and otherwise uses the request handler. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/weather.ts#L13)
- packages/widgets/src/weather/component.tsx:27-39 — the widget handles null data and displays the translated disabled state. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/weather/component.tsx#L27)
- packages/translation/src/lang/en.json:3146-3148 — the user-facing message states that weather is unavailable because outbound connections are disabled. — [source L3146](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/lang/en.json#L3146)
- packages/request-handler/src/weather.ts:17-77,142-147 — normal external weather requests have validated coordinates, timeout handling, and bounded five-minute widget caching. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/weather.ts#L17)

**Remaining / follow-up:** If outbound connections are enabled and a real location still returns no data, collect the provider response separately. Under NO_EXTERNAL_CONNECTION=true, no weather data is expected and the explanation is now explicit.

### #6644 — feat: add GPU charts to Beszel System Stats widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6644) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** Beszel data types include GPU metrics and another grid widget shows an aggregate GPU value, but the Beszel System Stats historical chart widget still has no GPU option or GPU panels.

**Conversation (3 comments read):** The request defines initial GPU utilization, used VRAM, power draw, and multi-GPU support, with temperature deferred until a historical field is confirmed. A comment says the initial scope is implemented in #6645, but that PR is still open and not an ancestor of v2. A later comment also requests disk temperature, which remains a follow-up. The current v2 System Stats UI therefore cannot be credited from the unmerged PR.

**V2 evidence:**

- packages/integrations/src/beszel/beszel-types.ts:194-209 + the integration type model contains GPU utilization, memory, temperature, power, and related fields. — [source L194](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-types.ts#L194)
- packages/request-handler/src/beszel.ts:25-39 + the current request mapping reduces the data to an aggregate gpu value for the request handler. — [source L25](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/beszel.ts#L25)
- packages/widgets/src/beszel-system-stats/index.ts:45-72 + System Stats options contain CPU/memory/disk/network/docker choices but no GPU chart option. — [source L45](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel-system-stats/index.ts#L45)
- packages/widgets/src/beszel/_shared/stats-view.tsx:44-53 + 118-176 + 277-370 + visibility, series mapping, panel counts, and rendered panels omit GPU historical charts. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/stats-view.tsx#L44)
- packages/widgets/src/beszel-system-grid/component.tsx:245-257 + aggregate GPU percentage in a different widget is not the requested System Stats chart implementation. — [source L245](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel-system-grid/component.tsx#L245)
- reports/v2-issue-triage/source/linked-prs/6645.json:triage_merge_commit_is_ancestor_of_v2 + false; the initial-scope PR is open/unmerged and cannot establish a v2 fix.

**Remaining / follow-up:** Merge or reimplement the GPU utilization/VRAM/power/multi-GPU historical panels in System Stats, confirm the historical GPU temperature source, and decide separately on disk temperature. Do not treat aggregate grid GPU display or Custom Widgets as native completion.

### #6643 — feat: Allow reordering boards in the board switcher

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6643) · **Annoyances** · **Not addressed** · Confidence: **high**

**Request:** V2 improves finding boards with a searchable switcher but still has no persisted board position, drag-and-drop reorder, or explicit sorting control.

**Conversation (2 comments read):** The requester needs stable, user-controlled order for many boards and describes the loss of settings when recreating boards. A maintainer proposed replacing the switcher with a keyboard-accessible searchable overlay; the requester replied that this changes navigation but does not solve ordering. The merged #6660 switcher improvement relates to discovery only and did not implement reorder.

**V2 evidence:**

- apps/nextjs/src/components/board/board-switcher.tsx:69-74 + the switcher deliberately moves the active board to the end of its local display sequence rather than exposing persisted board order. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L69)
- packages/api/src/router/board.ts:385-434 + board overview query has no board orderBy/position field; only nested layout/section ordering is requested. — [source L385](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L385)
- reports/v2-issue-triage/source/linked-prs/6660.json:triage_merge_commit_is_ancestor_of_v2 + true; merged PR metadata describes searchable board previews and does not claim reorder support.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:75-85 + V2's transactional layout moves do not establish a board-level ordering field or switcher reorder interaction. — [source L75](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L75)

**Remaining / follow-up:** Add a persisted board position/order field and a settings or switcher drag-and-drop/sort control, then use that order consistently in the primary UI and board switcher.

### #6628 — bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6628) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 includes the public-origin discovery rewrites, BASE_URL-aware OAuth authorization flow, and protected-resource challenges needed for the reported MCP OAuth failures.

**Conversation (14 comments read):** The body and all 14 comments were read. The original report describes an internal container host in OAuth redirects plus root and nested discovery/authorize failures behind a proxy. The conversation covers the follow-up origin/header behavior, a test image, RFC 8414 concerns, and a later scanner report that rejected-token 401 responses lacked `WWW-Authenticate`. Current release/v2 prefers configured BASE_URL, rewrites root and nested well-known routes, builds the authorize/login callback from that origin, and emits protected-resource metadata on missing, malformed, and rejected-token 401s. Merged PR #6779 is an ancestor of release/v2. One comment contains agent-directed Docker commands; it was treated as untrusted issue content and no commands were run. No live/browser smoke was performed in this triage. The original reporter later verified both original failures on the PR #6631 amd64 image, including discovery, client registration, and the complete authorization redirect chain. This is historical PR-image verification, not a test of the reviewed V2 SHA or the final Cloudflare connector flow.

**V2 evidence:**

- reports/v2-issue-triage/source/6628.json:10-747 — complete body and all 14 comments were read; they document the internal-origin redirect/discovery failures and later rejected-token challenge observation.
- reports/v2-issue-triage/source/linked-prs/6779.json:12,34-39,415 — merged PR #6779 describes public OAuth origin/discovery and challenge handling, and its merge commit is an ancestor of release/v2.
- apps/nextjs/src/app/api/mcp/_base-url.ts:1-8 — MCP URL construction prefers validated BASE_URL and otherwise derives a normalized external origin from request headers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_base-url.ts#L1)
- apps/nextjs/src/app/well-known/[...path]/route.ts:11-46; apps/nextjs/next.config.ts:68-75 — root and nested well-known discovery routes are served and rewritten to the MCP metadata handlers. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/well-known/[...path]/route.ts#L11), [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/next.config.ts#L68)
- apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts:86-158; apps/nextjs/src/app/api/mcp/_handler.ts:250-309 — authorization redirects and all token-rejection challenge paths use the public origin and protected-resource metadata. — [source L86](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts#L86), [source L250](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_handler.ts#L250)

**Remaining / follow-up:** Deploy release/v2 behind the affected reverse proxy with BASE_URL set and exercise root/nested discovery, login redirect, and rejected-token 401 responses. Source coverage addresses the reported paths, but no live endpoint or latest-image check was performed here.

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

### #6622 — bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6622) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 detects that database restore invalidates the current session, shows a restore-complete/re-login state, and redirects to login instead of leaving the user looking at an empty stale board.

**Conversation (11 comments read):** The report describes successful restore followed by empty boards until hard refresh/re-login. The reporter confirmed that the #6624 test image prompts re-login and requested an earlier warning. They also attempted the V2 image but expressed uncertainty because both instances displayed a V1 version. That is user confirmation of the fix image, not unambiguous runtime validation of this V2 SHA. #6624 itself is open/unmerged, but the equivalent fix commit 28e242417 (#6778) is an ancestor of release/v2.

**V2 evidence:**

- apps/nextjs/src/components/backup/database-restore-flow.tsx:149-165 + the restore flow waits for readiness and assigns a destination after completion. — [source L149](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/database-restore-flow.tsx#L149)
- apps/nextjs/src/components/backup/database-restore-flow.tsx:168-216 + 322-331 + restore responses carry reloginRequired and send the user to /auth/login when the database session was replaced. — [source L168](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/database-restore-flow.tsx#L168)
- apps/nextjs/src/components/backup/restore-progress-panel.tsx:32-88 + the UI reports restore status and presents the re-login/refresh state. — [source L32](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/restore-progress-panel.tsx#L32)
- apps/nextjs/src/app/api/backup/import/route.ts:291-324 + 335-346 + import migrates/replaces the database and returns restart/re-login information. — [source L291](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/backup/import/route.ts#L291)
- git commit 28e242417 + ancestor of HEAD + commit message fix(backup): prompt re-login after restore (#6778), providing v2 placement evidence for the behavior.
- reports/v2-issue-triage/source/linked-prs/6624.json:triage_merge_commit_is_ancestor_of_v2 + false; the open PR is not used as the evidence, only the merged equivalent is.

**Remaining / follow-up:** Add the reporter's suggested warning before accepting the backup file if desired. The reported stale/empty-board core is handled by forced re-login in v2.

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

### #6608 — bug: Integration page accessible without board-modify-all permission

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6608) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 gates the integrations management page with a dedicated integration-management permission and filters the server-provided integration list to what the user may manage.

**Conversation (0 comments read):** The report says users without board-modify-all could open the integration management page. The issue references #6509. Merged PR #6612 introduces getIntegrationManagementAccess, uses it for the page, and explicitly closes #6608; its merge commit is an ancestor of release/v2.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:27-38 + the page obtains session and getIntegrationsSectionAccess before rendering. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L27)
- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:42-55 + server data is filtered to integrations the caller may manage. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:124-135 + the page explains the scoped access behavior in the UI. — [source L124](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L124)
- apps/nextjs/src/app/[locale]/manage/_access.ts:1-35 + the route uses getIntegrationManagementAccess rather than board-modify-all. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/_access.ts#L1)
- packages/definitions/src/permissions.ts:226-254 + access checks include the global integration-full-all rule and delegated integration permissions. — [source L226](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L226)
- reports/v2-issue-triage/source/linked-prs/6612.json:triage_merge_commit_is_ancestor_of_v2 + true; merged metadata explicitly states that the PR closes #6608.

**Remaining / follow-up:** Test the page with each relevant delegated/global permission in a browser, but the route guard and merged v2 fix directly address the report.

### #6600 — 🚀 Homarr v2 public beta is here! Join the testing

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6600) · **Other / tracking** · **Partially addressed** · Confidence: **high**

**Request:** V2 addresses many beta feedback items, but the umbrella conversation contains several unresolved or unverified subtopics that must remain separate.

**Conversation (29 comments read):** All 29 comments were read and split into subtopics. Addressed or substantially improved: login branding/background support, Header Studio/personal icon control, Beszel text scaling, bookmark density/compactness, migration guidance, world clocks in advanced Clock mode, and bounded performance work. Still unresolved or needing verification: repeated public demo login failures (the seed code can preserve an already altered account, but the live cause is unverified), compact-mode world-clock expectations, provider-specific Media Releases failures, direct Docker start/stop/pause affordances, final Bookmark title visibility/font-size controls (PR #6852 is open and unmerged), ultrawide max-column/centering behavior, and broad memory/performance endurance.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/auth/login/page.tsx:23-52 — v2 login reads branding and passes sign-in background image/overlay, logo, and app identity into the auth shell. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/page.tsx#L23)
- packages/onboarding/src/onboarding-auth-shell.tsx:21-63 — the auth shell renders the configured background and overlay; packages/onboarding/src/onboarding-backdrop.tsx:5-13 still renders generic integration marquee rails rather than personal app icons. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/onboarding-auth-shell.tsx#L21), [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/onboarding-backdrop.tsx#L5)
- packages/api/src/trpc.ts:108-124 and packages/api/src/router/user.ts:466-471,497-503,526-531 — demo mode blocks username, deletion, and password mutations (subject to DEMO_READ_ONLY/global mode). — [source L108](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/trpc.ts#L108), [source L466](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/user.ts#L466)
- packages/db/migrations/seed.ts:918-935 — demo seeding skips an existing demo user, so a previously changed public demo password can persist; this explains why a live demo login still needs verification. — [source L918](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L918)
- packages/widgets/src/clock/index.ts:133-139 and packages/widgets/src/clock/advanced-view.tsx:68-84,156-181 — worldClockCities are configurable and rendered in Advanced Clock mode; packages/widgets/src/clock/component.tsx:16-38 routes only advanced mode to that view. — [source L133](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/index.ts#L133), [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/advanced-view.tsx#L68), [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/component.tsx#L16)
- packages/widgets/src/media-releases/component.tsx:39-78 and packages/definitions/src/widget-integration-map.ts:64-64 — Media Releases exists with loading/error/empty states for mock, Emby, Jellyfin, and Plex, but these lines do not prove a provider-specific runtime failure is fixed. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/component.tsx#L39), [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L64)
- packages/widgets/src/bookmarks/index.tsx:12-53 and packages/widgets/src/bookmarks/bookmarks-widget.tsx:106-167 — v2 has hideTitle/layout/spacing/card-density controls and compact scaling, but the rendered widget title remains fixed at fz=11. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L12), [source L106](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/bookmarks-widget.tsx#L106)
- packages/widgets/src/docker/component.tsx:218-240,285-318,493-602 — Docker actions are wired for start/stop/restart/remove and exposed through a dots menu; no pause action is present. — [source L218](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L218)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:163-182 — custom layout columns are limited to 24 with no separate ultrawide max-column/centering policy. — [source L163](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L163)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:158-167 — release claims performance improvements and documents migration/compatibility notes. — [source L158](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L158)
- packages/request-handler/src/lib/request-handler.ts:28-39,128-145,232-269 and packages/api/src/query-cache.ts:21-65 — v2 bounds caches/inflight work and excludes large Beszel stats from persistence, supporting a mitigation claim rather than a soak proof. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L28), [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/query-cache.ts#L21)

**Remaining / follow-up:** Keep this umbrella partial. Track each outstanding item independently: (1) run the real public demo repeatedly and make seed/reset behavior deterministic; (2) verify world clocks in compact versus Advanced Clock modes; (3) reproduce Media Releases with the reporter's provider and inspect logs; (4) decide whether direct Docker controls need prominent buttons and add pause if required; (5) do not count open PR #6852 as present for bookmark title toggle/size; (6) verify ultrawide layout centering/max columns; and (7) run a long performance/memory soak.

### #6593 — bug: Pi-hole v6 / Plex integrations send unauthenticated periodic health-check requests, causing real 401s

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6593) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Pi-hole integration still performs an unauthenticated v6 capability probe against /api/info/version while the widget uses an authenticated flow. That exact periodic 401 pattern remains in v2; Plex's analogous root-probe path also needs investigation.

**Conversation (0 comments read):** The report observes repeated unauthenticated requests and 401s for Pi-hole v6 and Plex despite working authenticated widgets, asking for the health check to use credentials or stop probing. The issue distinguishes connection tests from widget requests. No comments or linked fix establish that the v2 branch removed these probes.

**V2 evidence:**

- packages/integrations/src/pi-hole/pi-hole-integration-factory.ts:8-23 + the factory calls /api/info/version with fetchWithTrustedCertificatesAsync(url) without credentials and explicitly treats 401 as a Pi-hole v6 signal. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/pi-hole/pi-hole-integration-factory.ts#L8)
- packages/integrations/src/pi-hole/v6/pi-hole-integration-v6.ts:27-34 + 45-52 + 121-142 + 148-176 + the actual v6 integration has a separate authenticated session/request flow, confirming the bare probe is not the widget's authenticated request. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/pi-hole/v6/pi-hole-integration-v6.ts#L27)
- packages/request-handler/src/lib/integration-request-handler.ts:61-94 + request handling invokes integration factories through the cached request-handler path, so a factory probe can recur during periodic widget work. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/integration-request-handler.ts#L61)
- packages/integrations/src/plex/plex-integration.ts:159-167 + 250-259 + media/identity calls use X-Plex-Token, but no evidence in the current source shows a fixed authenticated generic health probe for the issue's Plex symptom. — [source L159](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L159)
- packages/integrations/src/base/creator.ts:14-23 + creator dispatch includes Pi-hole and Plex factories, the entry point for their capability detection. — [source L14](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L14)

**Remaining / follow-up:** Remove unauthenticated capability probes or supply the configured credentials, and use a bounded authenticated health check. Trace the Plex factory/periodic path separately so both reported integrations stop generating expected 401 noise without masking real auth failures.

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

### #6559 — bug: Releases widget showing "Only the first 1000 results are available" error

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6559) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The release/v2 GitHub path no longer uses repository search, but it still paginates every GitHub release page; the reported 1000-result failure cannot be classified without checking the exact endpoint response.

**Conversation (1 comments read):** The body and sole comment were read. The saved configuration screenshot identifies the GitHub provider, repository `home-assistant/home-assistant`, default `https://api.github.com`, and no filter; the comment says the bug still occurs in 1.76.2. Current release/v2 code obtains releases with Octokit `api.paginate` over `repos.listReleases`, then fetches repository details directly with `repos.get`. The direct details call rules out a current search endpoint in this path, while unbounded release pagination could still encounter a provider-side 1000-result cap. Source inspection therefore shows an improvement but cannot prove the configured repository no longer fails.

**V2 evidence:**

- reports/v2-issue-triage/source/6559.json:10-135 — complete body and one comment were read; the report names the 1000-result error and the comment says it persists in 1.76.2.
- reports/v2-issue-triage/source/attachments/6559-config.png — saved configuration screenshot shows GitHub, `home-assistant/home-assistant`, `https://api.github.com`, and no release filter.
- packages/request-handler/src/release-providers.ts:167-213 — the GitHub release provider calls `api.paginate` for `repos.listReleases` with `per_page: 100` and reduces the returned releases. — [source L167](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L167)
- packages/request-handler/src/release-providers.ts:216-233 — repository details use direct `api.rest.repos.get`; no repository-search request appears in the current details path. — [source L216](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L216)
- packages/definitions/src/release-provider.ts:3-8 — GitHub provider defaults to the public GitHub API URL shown in the report configuration. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L3)

**Remaining / follow-up:** Run release/v2 against the exact repository or a mocked GitHub API that exercises the endpoint beyond 1000 results. If `listReleases` is capped, bound or redesign pagination to obtain the latest releases without traversing the capped history; otherwise capture the actual failing request and payload.

### #6543 — Upgrade to MCP v2 (spec 2026-07-28)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6543) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** The SDK and stateless MCP transport upgrade are present, including tool-list cache hints and compatibility tests. The issue also proposes OAuth metadata/CIMD work and documentation/Assistant validation; those are not all demonstrated by the transport implementation.

**Conversation (0 comments read):** The issue has no comments. Its proposed scope includes the SDK/stateless handler migration, method/name headers and cache hints, evaluating CIMD/pre-registered clients and metadata, updating protocol documentation, and verifying Assistant compatibility. V2 implements the transport and SDK portion; this does not establish completion of the whole checklist.

**V2 evidence:**

- pnpm-lock.yaml:6354-6360 + 21087-21094 + @modelcontextprotocol/core and @modelcontextprotocol/server are pinned at 2.0.0 in the v2 dependency graph. — [source L6354](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/pnpm-lock.yaml#L6354)
- apps/nextjs/src/app/api/mcp/_protocol.ts:30-41 + the MCP server advertises tool cache hints with a five-minute private TTL. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L30)
- apps/nextjs/src/app/api/mcp/_protocol.ts:43-50 + 78-81 + the protocol exposes tools and creates a handler with legacy stateless mode. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L43)
- apps/nextjs/src/app/api/mcp/_handler.ts:256-263 + 277-285 + 298-343 + the endpoint removes legacy SSE assumptions, handles OAuth challenges, and processes requests without a protocol session. — [source L256](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_handler.ts#L256)
- apps/nextjs/src/app/api/mcp/_protocol.spec.ts:16-20 + 78-105 + tests target 2026-07-28 metadata, stateless behavior, cache hints, and no protocol session. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.spec.ts#L16)
- packages/api/src/test/mcp.spec.ts:437-460 + integration tests send MCP method/name headers and assert no Mcp-Session-Id. — [source L437](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/test/mcp.spec.ts#L437)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:107-109 + v2 documents the /api/mcp endpoint with API-key/OAuth access. — [source L107](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L107)
- apps/nextjs/src/app/well-known/[...path]/route.ts:15-35 + authorization-server metadata still advertises DCR registration; it does not advertise client_id_metadata_document_supported or authorization_response_iss_parameter_supported. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/well-known/[...path]/route.ts#L15)
- apps/docs/docs/management/mcp.mdx:13-14 + documentation now names protocol 2026-07-28 and stateless requests; this is stronger than citing the general V2 release blog, but does not document the cache hints. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/mcp.mdx#L13)

**Remaining / follow-up:** Record the OAuth/CIMD evaluation and any consciously deferred scope, align authorization-server metadata and cache documentation, and verify the built-in Assistant and external-client compatibility before treating the full proposal as complete. DCR retention alone is not a claim of protocol noncompliance.

### #6519 — bug: RSS widget poster images don't load for reddit feeds

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6519) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The RSS parser still does not inspect media:thumbnail and its regex fallback truncates image URLs at the file extension, dropping signed query parameters. Reddit poster images can therefore remain absent or return 403 in v2.

**Conversation (0 comments read):** The reporter identifies Reddit's media:thumbnail image field and explains that Homarr's fallback removes query parameters from the signed URL. There are no comments. The current parser only checks enclosure and media:content, then applies the truncating regex, while both compact and advanced RSS displays consume the resulting enclosure.

**V2 evidence:**

- reports/v2-issue-triage/source/6519.json:1 — the complete body and empty full_comments array were read, including the Reddit thumbnail and signed-query explanation.
- packages/request-handler/src/rss-feeds.ts:15-34 — feed extraction stores only the image returned by the custom enclosure helper. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L15)
- packages/request-handler/src/rss-feeds.ts:38-58 — the fallback regex stops at the image extension, so query strings and signed tokens after the extension are lost. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L38)
- packages/request-handler/src/rss-feeds.ts:60-67,77-105 — recognized media paths are only enclosure/@_url and media:content/@_url; media:thumbnail is absent. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L60)
- packages/widgets/src/rssFeed/component.tsx:140-150,192-207 — the native RSS widget uses enclosure for advanced images, compact backgrounds, and poster images, so parser omission directly produces the reported missing poster. — [source L140](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/rssFeed/component.tsx#L140)

**Remaining / follow-up:** Support media:thumbnail and preserve the complete validated URL, including query parameters and fragments where safe. Add fixtures for Reddit-style signed URLs and verify both compact and advanced poster rendering.

### #6516 — bug: mysql migration error

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6516) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The original MySQL/MariaDB migration syntax failure is not fixed in place. V2 retires MySQL, removes its migration path, rejects MySQL/MariaDB startup, and offers a separately documented conversion to SQLite. The converter is a migration workaround and does not make the reported broken MySQL migration succeed.

**Conversation (3 comments read):** The reporter's MariaDB startup failed on a migration containing a LEFT JOIN LATERAL syntax error and asked to retain MySQL/PostgreSQL for a swarm deployment. Three comments discuss investigating migrations, recommending SQLite, and the final v2 direction of keeping PostgreSQL while dropping MySQL. The v2 timeline contains the retirement/conversion work, not a repair of the failing MariaDB migration.

**V2 evidence:**

- reports/v2-issue-triage/source/6516.json:1 — the complete body and all three full comments were read, including the exact MariaDB syntax failure and database-support discussion.
- scripts/run.sh:3-13 — v2 rejects MySQL and MariaDB dialect/driver/URL combinations before startup and instructs users to use the converter. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L3)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:24-37 — the release notes say MySQL is dropped and existing users must convert before upgrading. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L24)
- apps/docs/docs/advanced/mysql-to-sqlite.mdx:5-17,19-58,62-66 — the converter is tested against the v1.77.1 schema, leaves MySQL unchanged, and requires a stopped Homarr instance, backups, and the same encryption key. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/mysql-to-sqlite.mdx#L5)
- apps/docs/docs/advanced/environment-variables/index.mdx:89-97 — v2 supports SQLite and PostgreSQL and directs existing MySQL installations to the conversion guide. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/environment-variables/index.mdx#L89)
- git history at HEAD — commit eca985fcf removes the MySQL migration/driver path and adds conversion tooling; it does not correct the MariaDB LEFT JOIN LATERAL statement.

**Remaining / follow-up:** For the original issue, either keep it as a known v1 migration defect or document the tested conversion route as the v2 migration path. Do not claim the MySQL error is fixed: MySQL is retired, and conversion succeeds only for supported v1.77.1-shaped databases.

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

### #6438 — bug: OOM with 1.71.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6438) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** Release/v2 contains the relevant Beszel live-stream cleanup, bounded subscription queue, and client buffer trimming, but the reported dashboard-wide OOM under a 1.5 GB cap remains unverified.

**Conversation (4 comments read):** The body and all four comments were read. The report describes Homarr reaching its 1.5 GB limit while a dashboard combines Docker data with Beszel Live data, and later discussion mentions desktop/mobile use and multiple live views. The conversation never isolates a reproducible leak or confirms a post-fix retest. Merged PR #6448 is a release/v2 ancestor and its current source closes the Beszel SSE response/agent on disconnect, bounds pending events, and trims the one-minute client buffer. Those changes address a credible live-subscription growth path, while the broader process OOM and other widgets remain unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6438.json:70-334 — complete issue body and four comments were read; it reports the memory cap/OOM scenario and does not provide a confirmed leak trace or post-fix result.
- reports/v2-issue-triage/source/linked-prs/6448.json:12,34-39,415 — PR #6448 describes the Beszel live memory-growth fix and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/beszel/beszel-integration.ts:407-590 — the live SSE reader uses abort handling, closes response bodies and the undici agent, and bounds retry behavior on disconnect. — [source L407](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L407)
- packages/api/src/router/widgets/beszel.ts:198-293; packages/api/src/router/widgets/bounded-async-queue.ts:8-88 — live subscriptions use abort cleanup and a queue that caps pending events and discards the oldest item when full. — [source L198](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L198), [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-76 — the client keeps a maximum one-minute buffer and trims older live samples, pausing updates when the page is hidden. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)

**Remaining / follow-up:** Reproduce the exact Docker-plus-Beszel dashboard with multiple tabs/views and the 1.5 GB limit on release/v2 while recording process memory. If OOM persists, isolate Docker, app prefetch, or another subscription path separately from the fixed Beszel stream.

### #6435 — feat: Expand Homarr API Coverage to Support Full Dashboard Automation

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6435) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 exposes useful board CRUD/settings and board-item creation plus a broad MCP tool surface, but it does not provide the full declarative REST/OpenAPI coverage required for Terraform-style dashboard automation.

**Conversation (3 comments read):** The issue requests complete automation: board/section/layout/item CRUD and geometry, integrations, search engines, users/API keys, import/export, and bootstrap-safe authentication. Follow-up discussion specifically notes that board settings are write-only, tiles are create-only, and groups/integrations are missing. The linked REST expansion PR #6546 is still unmerged, so it cannot be credited. MCP #5882 is merged, but the issue's REST/IaC contract remains broader than MCP availability.

**V2 evidence:**

- packages/api/src/router/board.ts:326-372 + board listing is available, while the returned overview is a summary rather than a complete declarative resource graph. — [source L326](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L326)
- packages/api/src/router/board.ts:1526 + settings PATCH exists, but no corresponding board settings GET appears in the router for round-trip automation. — [source L1526](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1526)
- packages/api/src/router/board.ts:2147-2151 + the current board-item REST surface includes creation; no item GET/PATCH/DELETE/list/move/resize procedure is present in this router search. — [source L2147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2147)
- packages/api/src/router/integration/integration-router.ts:70-80 + 223-233 + integration list/create procedures carry MCP metadata but do not establish the requested OpenAPI/IaC surface. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/integration/integration-router.ts#L70)
- reports/v2-issue-triage/source/linked-prs/6546.json:triage_merge_commit_is_ancestor_of_v2 + false; the proposed REST expansion is unmerged and cannot count as v2 implementation evidence.
- reports/v2-issue-triage/source/linked-prs/5882.json:triage_merge_commit_is_ancestor_of_v2 + true; merged MCP tools improve automation but do not replace the issue's requested REST resource CRUD.

**Remaining / follow-up:** Add round-trip REST/OpenAPI endpoints for settings, sections, layouts, and every item geometry/update/delete operation, then cover integrations, groups/containers, search engines, users/API keys, import/export, and bootstrap/auth semantics. Publish the schemas and permission behavior for Terraform/Ansible clients.

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

### #6300 — bug: Memory leak

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6300) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 bounds several caches and fixes Beszel live-stream retention, but no causal link establishes that those changes resolve this broader retained Next.js memory report.

**Conversation (5 comments read):** All five comments were read. The original reporter lists media, download, calendar, weather, Dashdot iframe and Docker widgets, with retention after repeatedly opening/closing tabs. A later ARM64 report documents a multi-day plateau near 1.9 GB and uses Beszel as the external measurement source; that does not establish use of a Beszel live widget. Neither report isolates a subsystem.

**V2 evidence:**

- packages/api/src/router/widgets/bounded-async-queue.ts:8-15,28-40 — live snapshots use a bounded queue that discards old values when a slow client falls behind. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/api/src/router/widgets/beszel.ts:205-220,254-270 — each Beszel subscription installs an abort-linked bounded queue and closes it on cancellation/error. — [source L205](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L205)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-21,30-72 — the browser keeps only a 60-record sliding buffer, stops hidden-page subscriptions, and clears buffers on key changes. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)
- packages/integrations/src/beszel/beszel-integration.ts:427-438,549-587 — SSE response bodies/readers/agents are cancelled and closed on normal completion, abort, and retry. — [source L427](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L427)
- packages/request-handler/src/lib/request-handler.ts:28-39,113-145,232-269,317-337 — in-memory cache, inflight requests, and upstream work have explicit size/expiry/concurrency bounds. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L28)
- packages/api/src/query-cache.ts:21-35,36-65 — large Beszel system stats are excluded from persisted cache and supporting dashboard query policies are bounded. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/query-cache.ts#L21)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:158-160 — release-level performance claims cover parallel startup, lazy heavy screens, and deduplicated integration work. — [source L158](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L158)

**Remaining / follow-up:** Run a long RSS/heap retention reproduction using the reported widgets and repeated tab open/close lifecycle on the affected architectures. The cited bounded queues/caches are relevant improvements, not proof of even a partial fix for this particular cause.

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

### #6254 — feat: aMule

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6254) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native aMule integration definition, client, creator, widget mapping, or documentation.

**Conversation (0 comments read):** The issue body and its zero comments were read. The requester links the aMule project, says its built-in API exposes the data, asks for an integration, and says they will not contribute it. The current v2 registry contains many download clients, but no aMule entry or native implementation. A generic app link or Custom Widget could expose a user-specific endpoint, yet it does not provide the requested selectable native integration and widget behavior.

**V2 evidence:**

- reports/v2-issue-triage/source/6254.json:10-88 — the complete request was read; it identifies aMule, its project URL, API availability, and no comments or contributor implementation.
- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry includes supported download clients but no amule/aMule integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the creator map is exhaustive over IntegrationKind and has no aMule factory or client import. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/integrations/src/index.ts:1-49 — exported native integrations list no aMule implementation for widgets or API consumers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/widgets/src/registry.ts:1-40 — widget registration is tied to concrete widget kinds and integration support, with no aMule widget entry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)

**Remaining / follow-up:** Add an aMule integration kind, authenticated API client and response contract, relevant widget options/rendering, integration mapping, permissions, and documentation. A generic link or Custom Widget remains a workaround rather than native support.

### #6207 — bug: Unifi integration not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6207) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The UniFi default-port bug is fixed in merged PR #6787, whose ancestor check is true for v2. The integration now tries HTTPS port 443 for bare controller URLs, falls back to 8443 only for connection/detection failures, preserves explicit ports, and leaves authentication failures visible.

**Conversation (1 comments read):** The reporter used a Dream Router URL without a port and received an SSL wrong-version error. The single issue comment is formatting-related; the timeline links #6210 and #6787. PR #6787 is explicitly the current-v2 port that fixes #6207, and its focused tests cover bare http URLs, 443/8443 fallback, explicit ports, unusual ports, and authentication failures.

**V2 evidence:**

- reports/v2-issue-triage/source/6207.json:1 — the complete body and one full comment were read, including the Dream Router URL and TLS error.
- reports/v2-issue-triage/source/linked-prs/6787.json:10-12,34-39 — merged PR #6787 states it fixes #6207 and records merge commit ca7be8f3.
- packages/integrations/src/unifi-controller/unifi-controller-integration.ts:59-105 — v2 resolves absent ports to [443,8443], honors explicit ports, and retries only port-fallback errors. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unifi-controller/unifi-controller-integration.ts#L59)
- packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts:80-140 — focused tests cover the reported bare http address, fallback, explicit ports, unusual ports, and non-retried authentication failure. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts#L80)
- apps/docs/docs/integrations/unifi-controller/index.mdx:31-37 — docs now require local HTTPS semantics, document Dream Router port 443/self-hosted 8443, and explain fallback/local-account requirements. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/unifi-controller/index.mdx#L31)
- git ancestry at HEAD — PR #6787's merge commit is an ancestor of release/v2.

**Remaining / follow-up:** No v2 code gap remains for the reported default-port error. If the issue was forgotten open, mention it as fixed by v2; users still need a local controller account and supported HTTPS endpoint.

### #6177 — bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6177) · **Bugs** · **Needs verification** · Confidence: **low**

**Request:** No Floorp-specific v2 change or reproducible source cause was found. The generic upload action uses normal Mantine loading state, so the reported endless spinner needs a current Floorp reproduction.

**Conversation (1 comments read):** The report says red action buttons in Floorp often spin forever without completing. The maintainer asked whether the same happens in Chrome or Safari, but there is no follow-up answer and no browser/version/network trace establishing whether the issue is Homarr, Floorp, or an environment problem.

**V2 evidence:**

- packages/forms-collection/src/upload-media/upload-media.tsx:17-55 + the upload control is a generic Mantine button/FileButton with a loading prop supplied by the action state. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/upload-media/upload-media.tsx#L17)
- apps/nextjs/src/app/[locale]/manage/medias/_actions/upload-media.tsx:18-19 + the server action boundary is small and has no Floorp-specific branch or retry loop. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/medias/_actions/upload-media.tsx#L18)
- reports/v2-issue-triage/source/timelines/6177.json:commented events + the only maintainer follow-up requests Chrome/Safari comparison, with no confirmed resolution.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:144-160 + V2 preview/performance/permission notes contain no claim about Floorp action-button completion. — [source L144](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L144)

**Remaining / follow-up:** Retest the reported actions on release/v2 with Floorp and a control browser, record the network request and promise completion/error state, and isolate whether the spinner is an action failure or browser rendering/event issue.

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

### #6153 — feat: re-open: add open webui  #3766

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6153) · **Integration requests** · **Partially addressed** · Confidence: **medium**

**Request:** V2 has no dedicated Open WebUI integration, but its native Assistant and Assistant widget can chat through a configured OpenAI-compatible endpoint. This covers part of the stated goal of chatting with a local LLM from the dashboard; compatibility with the user's Open WebUI endpoint has not been verified.

**Conversation (0 comments read):** The reopened issue points to the earlier Open WebUI request #3766/#2082 and asks for local-LLM chat integration. It has no comments. The timeline contains no merged implementation; an Open WebUI integration commit exists on a feature branch but is not an ancestor of v2.

**V2 evidence:**

- reports/v2-issue-triage/source/6153.json:1 — the complete body and empty full_comments array were read.
- packages/integrations/src/base/creator.ts:9-115 — the current exhaustive integration registry has no Open WebUI integration kind or creator. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-53 — Custom Widgets v2 can call APIs and define actions, but the release article does not add Open WebUI as a native integration. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:87-109 — the Assistant/MCP feature is a separate capability and does not provide the requested Open WebUI service integration. — [source L87](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L87)
- git history at HEAD — commit 005c2e4cd is on a non-ancestor Open WebUI feature branch, so it cannot be credited to v2.
- apps/docs/docs/management/assistant.mdx:24-36 — custom OpenAI-compatible endpoints and the dashboard Assistant widget are documented. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/assistant.mdx#L24)
- apps/nextjs/src/app/api/assistant/chat/route.ts:672-701 — the actual chat route constructs the provider using configuration.baseUrl and streams its model response. — [source L672](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/assistant/chat/route.ts#L672)

**Remaining / follow-up:** Test the intended Open WebUI endpoint, authentication, model discovery, streaming and supported tool behavior with Assistant. Decide whether this satisfies the requester before treating it as fully resolved; a dedicated Open WebUI client remains absent.

### #6152 — feat: re-open: add Wazuh  #3765

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6152) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Wazuh integration, widget, API client, or Wazuh definition. The native integration registry exports many monitoring and security-adjacent services, but neither definitions nor widgets contain Wazuh data types or procedures. A Custom Widget could call an external endpoint for a particular deployment, but it does not provide the requested native dashboard graphs, authentication, or Wazuh-specific data model.

**Conversation (2 comments read):** The issue reopens an earlier request for a Wazuh SIEM widget. Comments ask for a breakdown, and the reporter requests Wazuh statistics, alert summaries, and Docker/vulnerability graphs arranged alongside calendar/system stats. No comment records implementation or a narrowed accepted feature, and no linked PR is present. The current tree confirms the request remains an integration gap.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — the native integration exports include monitoring/security-related clients but no Wazuh integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-530,636-641 — the integration definitions include PeaNUT and Traefik around the relevant categories, with no Wazuh kind or onboarding metadata. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/widgets/src/registry.ts:64-100 — the explicit native widget registry contains no Wazuh module or Wazuh widget loader. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)

**Remaining / follow-up:** Define the Wazuh API/auth contract and native integration, then add configurable alert, agent, vulnerability, and container/statistics widgets with permission and error handling.

### #6050 — bug: background image is absent or cut off with white space

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6050) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 fixes the white-space/cut-off symptom caused by a background covering only content height by giving the AppShell a 100dvh minimum when a background is configured. The separate Firefox report that the image itself was corrupt or truncated cannot be confirmed without the original image URL and browser/network reproduction.

**Conversation (1 comments read):** The reporter says a Docker Compose deployment on Firefox/Linux shows a background image absent or cut off, with a white area after collapsing content; the single comment asks for more information and no exact image is provided. V2 includes a root-cause fix for the viewport-height void, but the background component still relies on the browser's CSS image load and has no explicit corrupt/truncated-image recovery path.

**V2 evidence:**

- reports/v2-issue-triage/source/6050.json:1 — the complete body and one full comment were read; the issue has no reproducible image URL or additional technical detail.
- apps/nextjs/src/components/layout/background.tsx:9-28 — backgrounds use CSS backgroundImage, center positioning, cover sizing, no-repeat, and fixed attachment; there is no decode/error fallback for a corrupt image response. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/background.tsx#L9)
- apps/nextjs/src/components/layout/shell.tsx:28-35 — when a background exists, the AppShell receives mih=100dvh so the image covers the viewport below short or collapsed board content. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/shell.tsx#L28)
- git history at HEAD (7855278ed, ancestor of v2) — the viewport-height fix identifies the white void as an AppShell background-sizing issue and documents the root cause.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-85 — v2's rebuilt board/container layout changes the content geometry but does not itself verify external image decoding. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)

**Remaining / follow-up:** Reproduce in Firefox/Linux using the reporter's image and deployment, capture the image response and decode result, and verify both the viewport-height fix and any remaining CDN/proxy/content-type issue.

### #6024 — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6024) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The report's parser exception has no confirmed causal fix in release/v2. V2 normalizes JSON SyntaxErrors from decorated integration methods, but the logged `\uXXXX (1:10901)` shape is consistent with a JavaScript parser and no source identifies that path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter sees a recurring Unicode-escape SyntaxError with low visible impact and suspects an empty Beszel integration, but provides no reproduction or endpoint payload. A later triage PR considered wrapping only Beszel authentication JSON, then removed that narrow change because the report points to collection responses. The current generic integration boundary can normalize JSON parse failures, and Beszel response.json calls run inside it, but that does not establish that the reported parser exception came from JSON.parse or from Beszel. The linked narrow PR is not a release/v2 ancestor, so disposition remains unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6024.json:10-88 — the complete body was read; it reports the recurring malformed Unicode escape, possible empty Beszel data, low impact, and no comments or reproduction steps.
- packages/integrations/src/base/errors/decorator.ts:22-25,90-169 — all Integration methods are wrapped and rejected errors pass through the default JSON parse handler before being rethrown as normalized integration errors. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/decorator.ts#L22)
- packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts:8-21 — SyntaxError values are converted into IntegrationParseError through JsonParseErrorHandler rather than remaining raw exceptions. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts#L8)
- packages/common/src/errors/parse/handlers/json-parse-error-handler.ts:4-17 — the JSON handler recognizes SyntaxError, logs the parse message, and creates a ParseError cause. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/common/src/errors/parse/handlers/json-parse-error-handler.ts#L4)
- packages/integrations/src/beszel/beszel-integration.ts:253-278,598-618 — Beszel collection and auth testing calls still call response.json, but those methods run under the decorated Integration boundary. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L253)
- packages/api/src/router/widgets/beszel.ts:31-63,168-195 — Beszel system and stats routes convert integration failures into public error results instead of propagating a process-level uncaught exception. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L31)
- reports/v2-issue-triage/source/linked-prs/6510.json:34-39,437 — the later PR explicitly removed its narrow Beszel wrapper and records its merge commit as not an ancestor of release/v2; this metadata is context only, while the current source above supplies the disposition evidence.

**Remaining / follow-up:** Capture the complete stack, parser, and malformed payload on release/v2 if the recurring log is still observed. Identify whether the failure is JSON parsing, JavaScript/Acorn parsing, or another upstream path before adding a targeted fix or fixture.

### #6008 — bug: manage/about page fails to load with ECONNREFUSED

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6008) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2's /manage/about page no longer self-fetches its own HTTP API. It imports static contributor data and calls getDependenciesAsync directly on the server, eliminating the HOSTNAME/loopback path that caused ECONNREFUSED in restricted container networking. A manage-level error boundary also catches future management-page failures with a retry surface. The linked fix is merged and its merge commit is an ancestor of V2.

**Conversation (3 comments read):** The issue reports /manage/about failing in v1.66.1 with ECONNREFUSED and digest 3227098399. Comments request full server logs and mention a broader error boundary. Linked PR #6009 explicitly identifies four unnecessary self-fetches, removes them, and adds manage/error.tsx; its metadata records a merge and V2 ancestry. Current source contains the direct calls and boundary, so the reported self-fetch cause is addressed, although deployment-specific failures still need runtime evidence.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/about/page.tsx:42-60 — the page directly imports static data and calls getDependenciesAsync without constructing or fetching a local HTTP URL. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/about/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/error.tsx:9-41 — management pages have a localized retry error boundary that displays a digest when a runtime error occurs. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/error.tsx#L9)
- reports/v2-issue-triage/source/linked-prs/6009.json:34,38-39,365,397 — the linked self-fetch/error-boundary PR is merged, with a merge commit recorded as an ancestor of V2.

**Remaining / follow-up:** Validate /manage/about in the affected source-built/restricted-network deployment and inspect any new digest if direct dependency reading fails; the original loopback ECONNREFUSED path is removed.

### #6002 — bug: Uptime-Kuma, paused has no effect

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6002) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The integration still derives monitor status from the latest public heartbeat and cannot reliably distinguish an intentionally paused monitor from a stale last heartbeat.

**Conversation (1 comments read):** The one comment was read. The reporter says pausing an Uptime Kuma monitor does not change Homarr's paused counter. The maintainer explains Homarr only consumes public status-page and heartbeat APIs, which omit the dashboard monitor active flag; a later v2 fix was reverted because it was ineffective. The public API limitation remains.

**V2 evidence:**

- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:48-61 — v2 fetches only the public status page and heartbeat endpoints. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L48)
- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:64-81 — status is derived from the latest heartbeat, with no active/paused monitor field. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L64)
- packages/integrations/src/uptime-kuma/uptime-kuma-types.ts:3-17,40-43 — the schema maps heartbeat states to up/down/paused and has no monitor active property. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-types.ts#L3)
- packages/widgets/src/uptime-kuma/component.tsx:112-130,218-238 — the widget displays the derived paused count and monitor badges without another source of truth. — [source L112](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/uptime-kuma/component.tsx#L112)

**Remaining / follow-up:** Use an authenticated Uptime Kuma API or an explicit integration option/endpoint that exposes active state, then verify paused monitors, stale heartbeats, and maintenance states separately. Do not call the reverted status mapping a fix.

### #5867 — feat: REST Endpoint  to manage boards

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5867) · **Large feature requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** The requested board-management REST surface exists in the current release/v2 API: board listing/creation/duplication/rename/visibility/deletion, home-board operations, settings update, and board-item creation are exposed.

**Conversation (2 comments read):** The request asks for an HTTP/REST endpoint so Ansible can create a board and add an app during provisioning. A comment says the endpoint was added in v1.65 and asks for documentation verification. The broader full-dashboard automation gaps are tracked separately in #6435; this assessment covers the narrower original board-management request.

**V2 evidence:**

- packages/api/src/router/board.ts:326-372 + GET board management overview/list data is available through the API. — [source L326](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L326)
- packages/api/src/router/board.ts:651 + 721 + 1018 + 1036 + 1066 + board creation, duplication, rename, visibility, and deletion procedures are present. — [source L651](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L651)
- packages/api/src/router/board.ts:1082-1098 + home and mobile-home board operations are exposed. — [source L1082](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1082)
- packages/api/src/router/board.ts:1526 + board settings can be updated through the API. — [source L1526](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1526)
- packages/api/src/router/board.ts:2147-2151 + board items/apps can be created through the API. — [source L2147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2147)
- apps/docs/docs/management/api/index.mdx:62-71 + current API documentation states that boards can be created/configured and content managed, including home boards. — [source L62](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/api/index.mdx#L62)

**Remaining / follow-up:** The issue's minimal create-board/add-app workflow is covered. Declarative read/update/delete coverage for every board item and related resources remains the separate #6435/#6546 scope.

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

### #5730 — bug: Administration menu breaks if you click around the options too much

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5730) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** The current logs terminal disposes the CanvasAddon before the terminal, covering the reported xterm cleanup failure, but the reported Scalar API error and WebSocket process crash have no corresponding release/v2 source fix.

**Conversation (7 comments read):** All 7 comments were read. The report combines three failures after rapid administration-menu navigation: repeated WebSocket failures that eventually stop the server, Scalar's `refract is not a function` with broken API dropdowns, and xterm's onShowLinkUnderline error while leaving logs. The reporter traces the WebSocket problem to tRPC's observableToReadableStream and proves local try/catches prevent crashes; they also identify CanvasAddon disposal as the logs race. A maintainer later says it should be fixed but receives no confirmation. Current v2 cleanup clears the fit timer, disposes CanvasAddon, then disposes and clears the terminal ref. The API page still renders @scalar/api-reference-react without a compatibility guard, and the WebSocket entrypoint still delegates to applyWSSHandler without stream-controller protection.

**V2 evidence:**

- reports/v2-issue-triage/source/5730.json:10-92,110-440 — the full report and all seven comments were read; the conversation explicitly splits the WebSocket, Scalar, and xterm errors and has no reporter confirmation after the maintainer's fix claim.
- apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx:174-205 — the logs component clears its delayed fit callback and disposes CanvasAddon before Terminal, then clears both refs, addressing the specific disposal order implicated by the xterm stack. — [source L174](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx#L174)
- apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx:1-35 — the API page still imports and renders ApiReferenceReact directly, with no refract compatibility handling or fallback. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx#L1)
- apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx:51-80 — administration API documentation still mounts the Scalar component as its documentation panel. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx#L51)
- apps/websocket/src/main.ts:34-71 — the WebSocket server still uses applyWSSHandler with keep-alive settings and has no local handling around the readable-stream controller operations described in the issue. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/websocket/src/main.ts#L34)

**Remaining / follow-up:** Verify logs navigation on release/v2, then independently reproduce the Scalar dependency error and tRPC stream shutdown. Upgrade or isolate incompatible Scalar/tRPC behavior and add a server-safe close path if those two failures remain; the xterm source change alone does not close the compound report.

### #5716 — bug: OIDC group assignment is not working if user is only in one group

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5716) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** OIDC group synchronization still requires the groups claim to be an array. A provider that returns one group as a scalar string is ignored, so the reported single-group assignment failure remains in v2.

**Conversation (0 comments read):** The body reports JumpCloud sending groups as a string for users in one group while multi-group users receive an array, causing group assignment to fail only for the single-group case. There are no comments. The timeline cross-references #6510 and records a candidate fix commit, but that commit is not an ancestor of the assessed release/v2 branch.

**V2 evidence:**

- reports/v2-issue-triage/source/5716.json:1 — the complete issue body and empty full_comments array were read.
- packages/auth/events.ts:33-39 — OIDC profile groups are synchronized only when Array.isArray(profileGroups) is true; a scalar group claim is discarded. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L33)
- packages/auth/events.ts:41-45 — the LDAP/user group path has the same array-only guard, showing no common scalar normalization exists. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L41)
- apps/docs/docs/advanced/single-sign-on/index.mdx:199-217 — docs configure a groups attribute and promise automatic group placement but do not document scalar-to-array normalization or the single-group provider shape. — [source L199](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L199)
- git history at HEAD — candidate commit 7de2fc04e is not an ancestor of release/v2, and the current source still contains the array-only guard.

**Remaining / follow-up:** Normalize a scalar group claim to a one-element string array after validating its type, preserve array behavior, and test JumpCloud/Auth0/Authentik-like claim shapes including absent, scalar, and mixed-value claims.

### #5538 — bug: No integration data available for unraid disks

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5538) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Unraid integration still reads only primary-array disks. It does not query or normalize array.caches/storage-pool disks, so pool-only Unraid installations remain without disk data. The follow-up #6803 confirms this is an active v2 gap.

**Conversation (10 comments read):** The original v1.59.2 report says CPU and memory work but disk data is absent on Unraid 7.2.4. The ten comments include requests for logs and setup details, reports on Unraid 7.3, a possible unrelated No home board found log, websocket troubleshooting, and a later diagnosis that pool-only setups are unsupported. The timeline cross-references the open follow-up #6803. That follow-up specifies querying array.caches and ignoring null size fields; no implementation is in v2.

**V2 evidence:**

- reports/v2-issue-triage/source/5538.json:1 — the complete body and all ten full comments were read, including the pool-only diagnosis and #6803 follow-up.
- packages/integrations/src/unraid/unraid-integration.ts:36-76 — file-system and SMART data are mapped only from systemInfo.array.disks. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/integrations/src/unraid/unraid-integration.ts:84-145 — the GraphQL query requests array.disks and array.capacity.disks but has no array.caches/storage-pool field. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84)
- packages/integrations/src/unraid/unraid-types.ts:21-40 — the response schema requires array.disks and defines no caches or pool collection. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L21)
- apps/docs/docs/integrations/unraid/index.mdx:22-26 — documentation lists the widgets and CPU averaging but does not claim storage-pool support. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/unraid/index.mdx#L22)
- reports/v2-issue-triage/source/6803.json:10-11,46-70 — the open follow-up is explicitly Add support for Unraid Storage Pools, references #5538, and requests array.caches with null disk fields ignored.
- git history at HEAD — the merged Unraid memory fix addresses metrics semantics, not storage-pool querying or mapping.

**Remaining / follow-up:** Extend the GraphQL query/schema and mapping to include caches and other supported pools, ignore null per-disk fields where Unraid reports aggregate-only values, and validate both array-plus-pool and pool-only hosts.

### #5387 — feat: Pushover Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5387) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Gotify and ntfy notification integrations but no native Pushover integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter asks for a Pushover notification integration; the maintainer requests details and receives no follow-up implementation specification. The issue was reopened by cleanup history, not fixed.

**V2 evidence:**

- packages/integrations/src/index.ts:22-25 — notification exports include Gotify and NTFY but no Pushover integration. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L22)
- packages/definitions/src/integration.ts:344-360 — the notification integration definitions contain ntfy and gotify only. — [source L344](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L344)
- packages/integrations/test/volumes/usenet/sabnzbd.ini:275-294 — the only Pushover references are Sabnzbd fixture settings, not Homarr integration code. — [source L275](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/test/volumes/usenet/sabnzbd.ini#L275)

**Remaining / follow-up:** Implement a native Pushover integration with token/user secrets, request validation, notification action semantics, and documentation.

### #5342 — bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5342) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The malformed Tracearr hosthttps URL was fixed in merged PR #5654, whose merge commit is an ancestor of v2. Current Tracearr code passes returned absolute avatar/poster URLs directly to the image proxy rather than rebuilding them against the integration base URL.

**Conversation (5 comments read):** The reporter supplied repeated DNS queries such as tracearr.mydomain.nethttps when Tracearr returned absolute avatar/poster URLs. Five comments discuss DNS caching and reproduction/diagnosis; the linked fix PR explains that proxyImageAsync incorrectly sent absolute URLs through this.url(). Its merge commit is in v2, and the issue can be closed as fixed if it was left open.

**V2 evidence:**

- reports/v2-issue-triage/source/5342.json:1 — the complete body and all five full comments were read, including the malformed DNS symptom, DNS-caching suggestion, and reproduction follow-up.
- reports/v2-issue-triage/source/linked-prs/5654.json:10-12,34-39 — merged PR #5654 identifies the absolute-image-url concatenation and records merge commit 7a1272146.
- packages/integrations/src/tracearr/tracearr-integration.ts:92-109 — returned stream/poster URLs are handed directly to proxyImageAsync instead of being prefixed with the Tracearr integration URL. — [source L92](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/tracearr/tracearr-integration.ts#L92)
- packages/integrations/src/tracearr/tracearr-integration.ts:124-160 — violation and history avatar URLs use the same corrected direct proxy path. — [source L124](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/tracearr/tracearr-integration.ts#L124)
- git ancestry at HEAD — merge commit 7a1272146 is an ancestor of release/v2, so this fix is included in the assessed branch.

**Remaining / follow-up:** No product work remains for the reported malformed URL. If the issue was not closed on GitHub, mention it as fixed by v2; monitor a real Tracearr deployment for unrelated proxy/image failures.

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

### #5154 — feat: SLO (Single Log-out)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5154) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 supports local sign-out followed by an optional redirect, but it does not implement Authentik/OIDC single logout, a front-channel logout endpoint, or a back-channel session-revocation endpoint.

**Conversation (6 comments read):** The request asks Homarr to participate in SLO so an Authentik logout can clear Homarr sessions, including when users are deleted remotely. Six comments discuss front-channel and back-channel options, the endpoint/auth/user-identifier requirements, and maintainer reluctance because the affected group is small; a volunteer asks for implementation direction but cannot implement it. No timeline event shows a merged SLO feature.

**V2 evidence:**

- reports/v2-issue-triage/source/5154.json:1 — the complete body and all six full comments were read, including front-channel/back-channel alternatives and maintainer/volunteer discussion.
- apps/nextjs/src/app/api/auth/[...nextauth]/route.ts:9-17 — the auth route exposes only Auth.js GET and POST handlers; there is no dedicated front-channel logout route. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/auth/[...nextauth]/route.ts#L9)
- apps/nextjs/src/components/user-avatar-menu.tsx:59-65 — sign-out deletes the local Auth.js session, then redirects to AUTH_LOGOUT_REDIRECT_URL if configured; it does not coordinate session logout with the provider. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/user-avatar-menu.tsx#L59)
- packages/auth/env.ts:26-29 — the only logout-related environment variable is an optional redirect URL. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L26)
- apps/docs/docs/advanced/single-sign-on/index.mdx:20-27,270-284 — SSO docs describe a post-logout redirect example for Authentik, not provider-initiated session revocation or back-channel logout. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2's permissions and Assistant/MCP compatibility notes do not add SLO. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Choose a provider protocol and session model, then implement and secure front-channel and/or back-channel logout with issuer validation, logout-token handling, and local session revocation. Document provider prerequisites and failure behavior.

### #5085 — bug: Unable to connect to LDAP

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5085) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The initial LLDAP failure was a bind-DN configuration mistake corrected in the thread, while the separate Authentik LDAP Outpost failure remains unresolved and has no release/v2-specific fix or fixture.

**Conversation (8 comments read):** All 8 comments were read. The original Docker Compose example uses cn=admin even though the returned LLDAP entry has uid=admin; the reporter confirms changing the bind DN to that returned DN makes LLDAP login work. They then reproduce a different failure against Authentik, using a correct bind DN, sAMAccountName, subtree search, and an objectClass filter; ldapsearch from the Homarr container returns one user, but Homarr still returns CredentialsSignin. The maintainer questions the search scope, the reporter tests it and reports no change, then supplies base and subtree queries showing the expected Authentik user. Current v2 supports the requested username attribute, search scope, and optional extra filter, but there is no Authentik-specific handling or end-to-end evidence that those settings authorize successfully.

**V2 evidence:**

- reports/v2-issue-triage/source/5085.json:10-112,130-507 — the full report and all eight comments were read; the thread separates the corrected LLDAP bind DN from the still-failing Authentik case and includes the later base/subtree ldapsearch output.
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:17-54 — login binds with AUTH_LDAP_BIND_DN, searches with configured base, username filter, scope, and attributes, and rejects zero or multiple matches. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L17)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:81-95,141-148 — group lookup uses the configured scope and the username filter extra argument is interpolated as a caller-supplied LDAP filter expression. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L81)
- packages/auth/env.ts:55-69 — release/v2 exposes AUTH_LDAP_SEARCH_SCOPE, AUTH_LDAP_USERNAME_ATTRIBUTE, username/group filter extras, and group mapping settings needed for the reported Authentik schema. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L55)
- packages/auth/providers/credentials/ldap-client.ts:18-56 — the client passes the configured URI and ldapts search options through without provider-specific Authentik normalization. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L18)
- apps/docs/docs/advanced/single-sign-on/index.mdx:103-118 — the documented LDAP contract expects a parenthesized extra filter and supports base/one/sub scopes, so malformed filter syntax remains a configuration variable to verify. — [source L103](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L103)

**Remaining / follow-up:** Reproduce the Authentik setup on the release/v2 image with the documented parenthesized extra filter and capture Homarr's search/bind result, then add provider-compatible handling or documentation if the one-entry ldapsearch case still fails. Do not treat the LLDAP configuration correction as resolution of the Authentik failure.

### #4973 — bug: System Resources Incorrect Total Ram for TrueNAS 25.04

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4973) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 corrects the TrueNAS memory mapping responsible for inflating displayed capacity. Previously physical memory was returned as available and the reporting value as used, so the widget added both. V2 returns available and max(physical minus available, 0), making their sum physical memory for valid available values.

**Conversation (2 comments read):** The reporter says a TrueNAS 25.04 host with 64 GB appears as roughly 74 GB in Homarr, with a follow-up describing a similar VM discrepancy. The maintainer asks about versions without confirming a reproduction. Merged fix #6017 changes the exact erroneous mapping; the independent audit agrees this is a concrete source-level fix for the overcount.

**V2 evidence:**

- packages/integrations/src/truenas/truenas-integration.ts:57-66 — available is reported free memory and used is max(physmem minus available, 0). — [source L57](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L57)
- packages/widgets/src/system-resources/component.tsx:133-149 — capacity is available plus used, now equal to physmem for valid input. — [source L133](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L133)
- git show f69e545d6 — merged #6017 replaces the old available=physmem and used=reporting-value mapping.

**Remaining / follow-up:** Confirm the original TrueNAS 25.04 payload has available memory between zero and physmem, then compare System Resources and Health Monitoring against the host. The arithmetic fix is present; no live TrueNAS validation was performed.

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

### #4815 — feature: Seed the database with a showcase default dashboard using the new JSON import endpoint

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4815) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 implements the requested in-dashboard integration workflow, while ordinary fresh-install seeding still creates a small generic board rather than the requested static showcase dashboard.

**Conversation (0 comments read):** The issue body and its zero comments were read. It contains two distinct scopes: a fresh-install showcase board with no-integration examples, documentation links, multiple clocks, Docker/system widgets, Homarr releases, and an NVDA note; and an in-place widget workflow that selects an available integration or opens integration creation without navigating away. The normal seed path creates one dashboard and places only the default clock, weather, and bookmarks configurations, with basic default apps/search engines. A large demo dashboard exists only when DEMO_MODE is enabled; it includes a notebook and many showcase widgets, but many entries intentionally require a mock integration and it is a separate demo user/board. The widget-add flow now selects matching integrations and opens the integration modal inline when none exists; the widget edit modal can also create and select a new integration. The combined request is therefore only partially addressed.

**V2 evidence:**

- reports/v2-issue-triage/source/4815.json:10-85 - the complete issue body was read; it explicitly contains both the showcase-seed and in-place integration scopes, with no comments.
- packages/db/migrations/seed.ts:50-71 - normal seeding creates default search engines/apps/board/widgets, while the expanded demo user/board runs only when DEMO_MODE is truthy. — [source L50](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L50)
- packages/definitions/src/widget-integration-map.ts:195-199,222-243 - the ordinary default board config contains only clock, weather, and bookmarks, and the seeded bookmark apps are four basic Homarr/support links. — [source L195](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L195)
- packages/db/migrations/seed.ts:314-366 - default search engines are Google, YouTube, and Homarr Docs; no DashboardIcons search engine is seeded. — [source L314](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L314)
- packages/db/queries/widget-placement.ts:88-156 - ordinary placement derives widgets from configured integrations/apps and defaultWidgetConfigs rather than loading a static showcase JSON configuration. — [source L88](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/queries/widget-placement.ts#L88)
- packages/db/migrations/seed.ts:589-649,651-672,772-806,959-965,1067-1095 - DEMO_MODE provides a broad notebook/widget gallery and mock integration, but several demo entries are marked needsIntegration and are inserted into a separate demo board. — [source L589](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L589)
- apps/nextjs/src/components/board/items/item-select-modal.tsx:307-410 - adding a widget selects up to the available matching integrations and, when a required kind is absent, opens IntegrationSelectModal before opening the widget editor. — [source L307](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-select-modal.tsx#L307)
- apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx:131-176; packages/widgets/src/modals/widget-edit-modal.tsx:488-495,564-573 - widget editing can create a supported integration in a modal and immediately add its ID to the widget integration selection. — [source L131](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx#L131), [source L488](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L488)

**Remaining / follow-up:** Add or explicitly ship a standard fresh-install showcase configuration with the requested no-integration widgets, clock locations, stock note, links/search engine, and verified defaults; clarify whether DEMO_MODE is the intended showcase entry point. The in-place selection/creation workflow has no remaining source-level gap, but its integrated behavior was not live-tested.

### #4797 — feat(releases): support image tags

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4797) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 queries Docker Hub tags and supports prefix/precision/suffix filters, but normalizes away an image tag and cannot express an exact pinned tag or flexible include/exclude regex.

**Conversation (6 comments read):** All 6 comments were read. The reporter says Docker images such as pihole/pihole work without a tag but :latest does not, and asks for a tag option plus include/exclude regex. Follow-ups discuss Docker Hub's tags endpoint and behavior without a filter; the old rework PR was merged but the exact tag/filter contract remains incomplete.

**V2 evidence:**

- packages/definitions/src/release-provider.ts:60-77 — Docker registry identifiers explicitly strip a digest or tag during normalization, so pihole/pihole:latest becomes the repository. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L60)
- packages/widgets/src/releases/index.ts:48-75 — repository options expose only versionFilter with prefix, numeric precision, and suffix; no exact tag or include/exclude mode exists. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/index.ts#L48)
- packages/api/src/router/widgets/releases.ts:18-32,88-102 — the server constructs an anchored precision regex and passes it to the provider request. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/releases.ts#L18)
- packages/request-handler/src/release-providers.ts:415-460 — Docker Hub requests paginated /tags and applies the regex to returned tag names. — [source L415](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L415)
- packages/definitions/src/test/release-provider.spec.ts:21-30 — current tests codify stripping postgres:17 and other image tags from identifiers. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/test/release-provider.spec.ts#L21)

**Remaining / follow-up:** The tag endpoint and latest/no-filter path work for repository discovery, but exact image-tag selection and flexible include/exclude filters are still missing. Verify the reporter's :latest and desired tag semantics against a current Docker Hub repository.

### #4766 — bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4766) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The issue is an environment-specific Chromium/reverse-proxy WebSocket interference report. V2 has a lazy, timed websocket client, but source inspection cannot establish that it prevents cross-site HTTP/2 connection interference.

**Conversation (5 comments read):** The reporter supplied a detailed reverse-proxy and HTTP/2 WebSocket reproduction in which opening Homarr affected another site sharing the proxy. The thread considered an AI-generated diagnosis, which the reporter challenged, and a maintainer could not reproduce and suspected the proxy. Another user reported a similar symptom. There is no controlled reproduction or confirmed root-cause fix in the conversation.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx:98-110 + the current client uses a lazy websocket with a 30-second close window and cleanup. — [source L98](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx#L98)
- apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx:112-140 + the websocket is part of the tRPC transport selection, but no reverse-proxy isolation or HTTP/2 connection policy is encoded here. — [source L112](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx#L112)
- reports/v2-issue-triage/source/timelines/4766.json:commented events + the maintainer's inability to reproduce and proxy suspicion remain the latest disposition evidence.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:75-85 + the V2 architecture announcement describes board/layout changes and does not claim a reverse-proxy websocket fix. — [source L75](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L75)

**Remaining / follow-up:** Reproduce on release/v2 with the reported Chromium version and reverse proxy, while tracing HTTP/2 streams and connection ownership for the other site. Test Caddy/Nginx Proxy Manager or the reporter's exact proxy configuration before assigning a source-level fix.

### #4738 — bug: Dashboard Layout - Saving Changes Failure

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4738) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces the layout-save path, but the report affected only one existing board and its cause was not isolated. The new implementation alone does not prove that the specific Board not found failure or migrated board data is repaired.

**Conversation (4 comments read):** All 4 comments were read. The reporter describes v1.46 failing when adding a layout with Board not found in createBoardLayout, provides follow-up logs, removes bad integrations, and says the failure remains. No comment identifies a separate root cause beyond the layout-save path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — layout saves return canonical layouts, reset dirty state, and revalidate the settings page. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:15-22 — layout mutation settlement invalidates the board and home-board queries. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L15)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the board, validates added/removed roles, creates custom layouts, and projects sections/items. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:102-131 — the responsive layout payload has strict Base/Mobile/unique-breakpoint validation. — [source L102](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L102)

**Remaining / follow-up:** No live reproduction or database migration test was run. Verify adding, resizing, and reloading a custom layout on a board upgraded from the affected v1 version.

### #4563 — feat: Generic Game Server Status Widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4563) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 still provides only a Minecraft-specific server status widget and has no native Gamedig/generic game-server integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter requests a generic Gamedig-backed widget supporting hundreds of games and calls out Valheim, Terraria, and Vintage Story, with status, map, players, version, and configurable icon. The comments reinforce a native generic integration rather than a custom endpoint.

**V2 evidence:**

- packages/definitions/src/widget.ts:20-25 — the widget registry includes minecraftServerStatus but no generic game-server status kind. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget.ts#L20)
- packages/widgets/src/minecraft/server-status/index.ts:7-24 — the only server-status definition accepts title, domain, and isBedrockServer for Minecraft. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/index.ts#L7)
- packages/widgets/src/minecraft/server-status/component.tsx:14-44,65-115 — rendering and API query are Minecraft-specific, including Minecraft icon/player semantics. — [source L14](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/component.tsx#L14)
- packages/integrations/src/index.ts:1-50 — integration exports contain no Gamedig or generic game-server integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)

**Remaining / follow-up:** A native generic game-server protocol/client and widget remain unimplemented. Custom API/Custom Widget extensibility would not satisfy this native integration request.

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

### #4538 — bug: iCal widget intergration not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4538) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2's iCal adapter still fetches the remote feed on demand, emits raw VEVENT instances, and has no recurrence expansion or durable stale-data fallback for feeds blocked by providers.

**Conversation (1 comments read):** The issue body and its 1 comment were read. The reporter says an iCloud public feed works briefly, is then blocked after too many requests, and omits recurring events. The comment proposes synchronizing and storing calendar data locally. V2's iCal integration fetches the configured URL for each request, parses each VEVENT directly, and returns its DTSTART/DTEND without iterating RRULE occurrences. The calendar request handler has only the generic 10-second cache because no iCal-specific TTL or stale-on-error policy is configured; the calendar router returns an integration error when all sources fail. Thus neither the provider-blocking failure mode nor the recurring-event omission is resolved at source level.

**V2 evidence:**

- reports/v2-issue-triage/source/4538.json:10-79,97-145 - the full iCloud failure/recurrence report and the synchronization comment were read.
- packages/integrations/src/ical/ical-integration.ts:12-38 - each request fetches the configured URL, loops raw VEVENT subcomponents, and emits only each event's start/end; no recurrence iterator or expansion is present. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/ical/ical-integration.ts#L12)
- packages/request-handler/src/calendar.ts:17-29 - calendarMonthRequestHandler sets only cacheNamespace and its request function, with no cacheTtlMs or fallbackToStaleOnError for iCal. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/calendar.ts#L17)
- packages/request-handler/src/lib/request-handler.ts:31-33,240-269,318-349 - the generic cache defaults to 10 seconds and stale-on-error is opt-in, so this path has no durable feed snapshot when an upstream blocks it. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L31)
- packages/api/src/router/widgets/calendar.ts:29-60 - calendar responses fall back to empty events per integration but throw when all integrations fail, leaving a blocked sole iCal feed unusable. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/calendar.ts#L29)
- packages/integrations/src/interfaces/calendar/calendar-integration.ts:3-4 - the calendar interface carries a date range but no recurrence or synchronization contract. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/calendar/calendar-integration.ts#L3)

**Remaining / follow-up:** Implement feed synchronization or a longer, bounded cache with stale fallback/backoff, expand RRULE events within the requested range with timezone handling, and add focused iCal tests for blocked feeds and recurrence.

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

### #4246 — bug: download client sorting only on client side

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4246) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** Download-client sorting still happens after the integration has fetched/limited data, so newest or oldest ordering cannot reliably select records outside the first page and large qBittorrent lists remain expensive.

**Conversation (6 comments read):** The report explains that the widget fetches the first 50 torrents and sorts only those, making newest items missing when they are outside that slice. It also describes a qBittorrent instance with thousands of torrents where raising the limit causes memory trouble. The maintainer agreed that server-side sort/filter and the listtorrents endpoint are needed; no later fix was found.

**V2 evidence:**

- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:30-34 + qBittorrent listTorrents receives a limit before the widget sorts results. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L30)
- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:41-64 + the integration maps returned records, including added timestamps, without requesting an upstream added-time order. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L41)
- packages/widgets/src/downloads/component.tsx:319-322 + the widget query applies a fetch limit. — [source L319](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L319)
- packages/widgets/src/downloads/component.tsx:421-429 + sorting is performed on the already returned client-side array. — [source L421](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L421)
- packages/integrations/src/download-client/deluge/deluge-integration.ts:33-40 + 54-76 + Deluge has no upstream limit in this path and is sliced after mapping, showing the same absence of a general server-side ordering contract. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/deluge/deluge-integration.ts#L33)

**Remaining / follow-up:** Add an integration-level sort/filter contract that executes before pagination/limit, or use qBittorrent listtorrents with the requested sort and bounded page. Keep result memory bounded for large installations and cover both qBittorrent and Deluge behavior.

### #4190 — bug: Cannot integrate with OMV, Invalid system information response

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4190) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The OMV response-validation failure needs the actual payload to determine whether it persists in V2. Current code accepts a null CPU model name, but other system fields remain strict and the failing field was not identified.

**Conversation (7 comments read):** The reporter identified OMV 7.7.17-1 on a Raspberry Pi, with a successful connection test but a system-information schema error, and suspected null CPU values. Maintainers requested Discord debugging; another user suggested admin credentials. No failing payload or confirmation of that workaround appears in the seven comments.

**V2 evidence:**

- packages/integrations/src/openmediavault/openmediavault-integration.ts:30-53 — the integration safe-parses system information and returns the exact Invalid system information response error on schema mismatch. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L30)
- packages/integrations/src/openmediavault/openmediavault-types.ts:3-20 — the schema requires version, numeric CPU/load fields, string memory fields, uptime, rebootRequired, and availablePkgUpdates. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L3)
- packages/integrations/src/openmediavault/openmediavault-integration.ts:70-90 — the widget-facing mapping depends on the parsed response and does not normalize alternate OMV versions. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L70)
- packages/integrations/src/openmediavault/openmediavault-types.ts:7 + cpuModelName is already nullable; openmediavault-integration.ts:72 maps null to Unknown CPU. This contradicts a blanket claim that no null CPU response is supported, but does not establish which field failed. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L7)

**Remaining / follow-up:** Retrieve the failing System.getInformation payload and permissions on OMV 7.7.17-1, identify the exact schema mismatch, and compare it against V2. Do not label this fixed or definitely still failing solely from the generic error string.

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

### #4026 — bug: Downloads: number of shown entries per intergration include already hidden entries

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4026) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Downloads widget still applies the per-integration limit before it filters completed/hidden entries. Hidden completed jobs can consume the server/integration limit and prevent active jobs from appearing.

**Conversation (2 comments read):** The report identifies a reproducible configuration where the number of shown entries includes completed entries hidden by widget settings, causing active downloads to disappear; the workaround is to set an unnecessarily high limit. Two comments discuss filtering server-side or fetching a larger set and filtering in JavaScript. The current request path still forwards the configured limit into every download-client integration, then filters completion in the widget.

**V2 evidence:**

- reports/v2-issue-triage/source/4026.json:1 — the complete body and both full comments were read, including the hidden-completed-entry example and proposed server/client filtering approaches.
- packages/api/src/router/widgets/downloads.ts:49-65 — limitPerIntegration defaults to 50 and is passed directly to the integration request handler. — [source L49](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/downloads.ts#L49)
- packages/request-handler/src/downloads.ts:7-17 — the handler forwards the limit to getClientJobsAndStatusAsync without accounting for hidden status filters. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/downloads.ts#L7)
- packages/widgets/src/downloads/component.tsx:319-325 — the widget sends the configured limit unchanged to the query. — [source L319](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L319)
- packages/widgets/src/downloads/component.tsx:379-407 — completion/category/client visibility filters run only after the limited response is received. — [source L379](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L379)
- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:30-42 — qBittorrent applies the requested limit while fetching, exemplifying why later filtering cannot recover hidden rows. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L30)
- packages/integrations/src/download-client/deluge/deluge-integration.ts:33-76 — Deluge also limits the integration result before the widget's visibility predicate. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/deluge/deluge-integration.ts#L33)
- packages/integrations/src/download-client/transmission/transmission-integration.ts:27-63 — Transmission applies the bounded request before UI-level hidden-entry filtering. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/transmission/transmission-integration.ts#L27)

**Remaining / follow-up:** Move filtering before the limit where the integration can support it, or over-fetch with a bounded server-side safety limit and then apply the widget's visibility rules. Preserve a clear performance bound and test each download-client adapter with hidden completed entries.

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

### #3805 — bug: cache invalidation for board settings not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3805) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 saves board settings and layouts through a unified form, invalidates board/home queries, and rehydrates canonical layout values after saving.

**Conversation (1 comments read):** The one comment was read. The report describes adding/changing layouts that appear not to persist on an ultrawide Firefox board; the maintainer attributes it to stale board details/cache invalidation rather than only the form control. V2's unified settings work directly addresses that save/invalidation path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — settings and layouts save together, canonical returned layouts reset the form, and the settings path is revalidated. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:5-22 — settled partial-settings and layout mutations invalidate getBoardByName and getHomeBoard. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L5)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the full board, detects additions/removals, and inserts projected layouts/placements. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:80-131 — layout validation enforces responsive roles, breakpoints, IDs, gutters, and the save payload. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L80)

**Remaining / follow-up:** The v2 code path is explicit, but no browser reproduction was run here. Verify persistence in the reported Firefox/ultrawide scenario after a reload and across another session.

### #3786 — feat: automatic service discovery

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3786) · **Integration requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 discovers Docker/Homepage-labeled services and offers assisted reconciliation, but does not automatically maintain a persistent discovered-services section/widget.

**Conversation (1 comments read):** The one comment was read. The request asks Homepage-style Docker labels for name, icon, href, group, description, integrations, and a discovered-services widget/section with filtering. V2 adds label discovery and onboarding/reconciliation workflows, which cover much of the data ingestion but require review/apply steps.

**V2 evidence:**

- packages/docker/src/labels.ts:1-21 — v2 defines homarr.* labels and Homepage-compatible group/name/href/icon/description labels. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/labels.ts#L1)
- packages/docker/src/discovery/parse-container-labels.ts:37-67 — labeled containers become typed discovered services with app, integration, widget, board, grouping, icon, description, and health metadata. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/parse-container-labels.ts#L37)
- packages/docker/src/discovery/list-discovered-containers.ts:17-40,50-67 — discovery enumerates running containers per Docker host and returns services. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/list-discovered-containers.ts#L17)
- packages/api/src/router/docker/docker-reconciliation.ts:18-33,40-127 — reconciliation compares discovered containers with persisted apps/integrations and produces candidates/next actions rather than silently creating dashboard entries. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-reconciliation.ts#L18)
- apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx:69-85,115-228 — the v2 UI exposes an admin review inbox and explicit create/setup/review actions. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx#L69)

**Remaining / follow-up:** The code does not create a continuously populated runtime discovered-services widget/section or the requested automatic filter. Confirm whether onboarding/admin-assisted setup is an accepted replacement; otherwise the persistent discovery presentation remains open.

### #3784 — feat(app-widget): container linking & run toggling

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3784) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Docker container actions and a modal that can create an app from a selected container, but it does not persist an app-to-container link or expose container status/start/stop controls on the native app tile.

**Conversation (0 comments read):** The body asks for a container-linking option in the app widget alongside Simple Ping and New Tab, with run toggling/status shown from the paired Docker container. It has no comments. The timeline marks a duplicate/follow-up relationship to #4085 but provides no merged implementation. Current Docker actions remain confined to the Docker widget and add-app flow.

**V2 evidence:**

- reports/v2-issue-triage/source/3784.json:1 — the complete feature request was read; full_comments is empty.
- packages/widgets/src/docker/component.tsx:242-305 — the Docker widget queries endpoint-scoped containers and handles start, stop, restart, and remove actions there. — [source L242](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L242)
- apps/nextjs/src/components/board/items/item-menu.tsx:59-96 — native app edit values contain app options, integrations, and advanced options, with no Docker endpoint/container identifier. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-menu.tsx#L59)
- packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx:22-65 — the Docker import modal derives a URL and creates an app, but its schema stores only container URLs and has no persistent link or run-toggle setting. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx#L22)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-69 — Custom Widgets/Workshop are extensibility mechanisms and do not constitute this native app-widget pairing. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)

**Remaining / follow-up:** Define a durable endpoint/container reference and permission model, handle deleted or renamed containers, and add native status and lifecycle controls to the app widget. A custom widget or a separate Docker widget action does not satisfy this request.

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

### #3731 — Release Widget: Docker importable programs

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3731) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 corrects the screenshot's GHCR provider mapping and retains duplicate filtering, but it still treats imagegenius/immich and an existing immich-app/immich repository as different provider/identifier pairs.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter says Immich is offered as importable even though a matching repository is already configured, and that the newly imported entry does not work. The screenshots show an existing GitHub repository immich-app/immich and a Docker candidate imagegenius/immich. V2 maps ghcr.io images to GitHub Container Registry and normalizes the image before comparing it with configured repositories, improving the old provider-path error. However, alreadyImported remains an exact provider plus normalized identifier comparison, so imagegenius/immich is not considered the upstream immich-app/immich repository. That leaves the reported duplicate/identity mismatch only partly addressed; no live fetch or issue-specific regression was run.

**V2 evidence:**

- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:698-732 - Docker images are parsed into provider/identifier pairs and compared with configured repositories to set alreadyImported. — [source L698](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L698)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:744-750 - allImagesImported and anyImagesImported derive the modal's duplicate state from that pairwise comparison. — [source L744](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L744)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:806-843 - selectable results exclude alreadyImported entries, while the imported list is rendered checked and disabled. — [source L806](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L806)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:870-875 - ghcr.io now maps to gitHubContainerRegistry, while docker.io and other registries retain their own provider kinds. — [source L870](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L870)
- packages/definitions/src/release-provider.ts:53-77 - normalization strips registry prefixes and image tags/digests, but does not map imagegenius/immich to the separate immich-app/immich GitHub repository. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L53)
- reports/v2-issue-triage/source/3731.json:10-58,76 - the full report has four screenshots and no comments; the screenshots identify the existing immich-app/immich and candidate imagegenius/immich values.

**Remaining / follow-up:** Decide whether cross-provider image identity should be canonicalized or whether the import UI should clearly explain that imagegenius/immich is a different source. Add a regression case for the screenshot's GHCR image and existing immich-app/immich entry, then verify the imported source actually serves releases.

### #3704 — bug: removed integrations keep coming back

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3704) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The v2 seeding path still inserts a default integration when no row of that kind exists, so deleting the sole default can be undone by a subsequent migration/seed invocation.

**Conversation (0 comments read):** The report says integrations removed since v1.28/v1.29 reappeared after Docker upgrades and asks whether this is deliberate. There are no issue comments. The described trigger is consistent with startup migrations invoking default seeding, and the current source still has that behavior.

**V2 evidence:**

- packages/db/migrations/seed.ts:50-65 + seedDataAsync invokes default integration seeding as part of the seed routine. — [source L50](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L50)
- packages/db/migrations/seed.ts:394-444 + 421-425 + 428-434 + default integrations are checked only by kind and inserted when the count is zero; a deleted sole default can therefore be recreated. — [source L394](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L394)
- packages/db/migrations/sqlite/migrate.ts:11-18 + the SQLite migration path runs seeding during migration. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/sqlite/migrate.ts#L11)
- packages/db/migrations/postgresql/migrate.ts:12-18 + the PostgreSQL migration path also runs seeding; the behavior is not limited to a legacy driver. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/postgresql/migrate.ts#L12)

**Remaining / follow-up:** Make default seeding idempotent with a stable ownership/identity rule that respects an intentional deletion, or persist an explicit opt-out. Confirm the Docker entrypoint's upgrade sequence and test deleting each affected default followed by an upgrade migration.

### #3696 — feat: Integration for Scrutiny

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3696) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no native Scrutiny integration or Scrutiny-backed SMART dashboard in the v2 source. Existing Synology SMART fields and generic/custom widget facilities do not implement this requested integration.

**Conversation (4 comments read):** The requester wanted Scrutiny hard-drive information in a health widget or a native SMART overview because an iframe was not usable. Commenters questioned whether Scrutiny's export API was ready; maintainers applied a decision tag pending API feasibility. A later comment suggested using Beszel when it gained SMART values, but no decision or implementation for Scrutiny followed.

**V2 evidence:**

- packages/definitions/src/integration.ts:46-56 + integration definitions require a concrete native definition and integration kind; no Scrutiny definition exists in the current registry. — [source L46](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L46)
- packages/definitions/src/integration.ts:686-687 + IntegrationKind is derived from the registered definitions, so the absence of Scrutiny here means it cannot be configured as a native integration. — [source L686](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L686)
- packages/definitions/src/integration.ts:689-725 + the current integration category/definition list contains no Scrutiny entry. — [source L689](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L689)
- apps/docs/docs/integrations/synology/index.mdx:35 + the existing SMART documentation is for Synology and does not expose Scrutiny. — [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/synology/index.mdx#L35)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:47-69 + Custom Widgets and Workshop are extensibility mechanisms, not evidence of a built-in Scrutiny integration. — [source L47](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L47)

**Remaining / follow-up:** Decide whether Scrutiny's API is sufficient, then add a native integration and widget/data mapping for the requested SMART values. Beszel or a custom widget can be a separate alternative, but does not close this native integration request.

### #3675 — bug: Stopping the container with SIGTERM fails

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3675) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 consolidates tasks and WebSocket services into the Next.js process and changes the shell shutdown sequence. Redis logging and unbounded waits remain source-level concerns, but source inspection has not established whether the original Docker/Podman SIGTERM hang survives the new process lifecycle.

**Conversation (3 comments read):** The report describes Podman/Docker stop hanging after SIGTERM because websocket/Redis-backed logging processes remain alive; disabling Redis logs was a workaround. The three comments report reproduction on v1.30 and Docker, and say modifying PID waits did not resolve it. The timeline has no verified v2 shutdown fix. V2's process consolidation is relevant progress, but not sufficient evidence that the remaining handles close.

**V2 evidence:**

- reports/v2-issue-triage/source/3675.json:1 — the complete body and all three full comments were read, including Podman/Docker reproduction and the DISABLE_REDIS_LOGS workaround.
- scripts/run.sh:48-59,63-78 — v2 starts nginx and Redis separately, then on SIGTERM kills and waits for Next.js before it terminates the internal Redis process. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L48)
- apps/nextjs/src/instrumentation-node.ts:5-34 — tasks and the websocket service are embedded in the Next.js process and their startup promises are awaited, so their resources share the process shutdown boundary. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/instrumentation-node.ts#L5)
- apps/websocket/src/main.ts:12-14,73-84 — the websocket server listens on port 3001 and SIGTERM calls wss.close() without awaiting its completion or explicitly closing active clients. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/websocket/src/main.ts#L12)
- packages/core/src/infrastructure/logs/transports/index.ts:6-21 — Redis logging is enabled in normal runtime unless DISABLE_REDIS_LOGS or CI is set. — [source L6](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/logs/transports/index.ts#L6)
- packages/core/src/infrastructure/logs/transports/redis-transport.ts:17-55 — the transport lazily creates an ioredis client, catches command failures, and exposes no close/disconnect lifecycle hook. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/logs/transports/redis-transport.ts#L17)
- packages/core/src/infrastructure/redis/client.ts:10-28 — the Redis client is an ioredis instance, which is a live resource capable of keeping a Node process open. — [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/redis/client.ts#L10)
- scripts/run.sh:80-98 — the main server is restarted when it exits unless the shell has observed the shutdown flag, making graceful termination dependent on the unresolved wait sequence. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L80)

**Remaining / follow-up:** Reproduce SIGTERM on V2 with Docker/Podman and Redis logging enabled, checking the embedded services and actual Next.js exit behavior. The potential open handles and wait ordering justify investigation, not a claim that the exact old hang is proven to remain.

### #3597 — bug: nexcloud integration with subpaths do not work

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3597) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 preserves a configured Nextcloud base path while constructing the DAV calendar endpoint, including trailing slashes and an already supplied DAV path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter shows tsdav resolving https://example.com/nextcloud/.well-known/basic at the host root, so a Nextcloud installation behind a subpath cannot be tested or queried through the integration. The report suggests an upstream fix or proxy workaround and was filed against 1.26.0. V2 contains a focused URL builder wired into the Nextcloud DAV client; the associated release/v2 merge (#6786) adds coverage for root, subpath, trailing-slash, and existing-DAV inputs. The direct implementation addresses the reported path loss without relying on the issue's suggested proxy workaround.

**V2 evidence:**

- packages/integrations/src/nextcloud/nextcloud-url.ts:1-12 - createNextcloudCalendarServerUrl retains the configured pathname, appends /remote.php/dav/, clears query/hash, and avoids duplicating an existing DAV endpoint. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud-url.ts#L1)
- packages/integrations/src/nextcloud/nextcloud.integration.ts:191-205 - the DAVClient receives the path-preserving URL helper result as serverUrl for all calendar operations. — [source L191](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L191)
- packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts:5-28 - focused cases verify root installations, /nextcloud subpaths, trailing slashes, and pre-existing DAV endpoints. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts#L5)
- packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts:34-38 - the integration test asserts the configured subpath is used by the client. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts#L34)
- reports/v2-issue-triage/source/linked-prs/6786.json:12,34-39 - linked PR metadata records the release/v2 merge for the focused Nextcloud subpath fix; disposition is based on the inspected source and tests.

**Remaining / follow-up:** Five direct assertions against the unmodified release/v2 URL helper passed (root, subpath, trailing slash, existing DAV endpoint, query/hash cleanup). A live Nextcloud calendar request, authentication and rendering remain untested; see RUNTIME-VALIDATION.md.

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

### #3512 — feat: Add Support for Homey API Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3512) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native Homey integration, Homey widget, or Homey integration kind; its existing Home Assistant support and generic Custom Widgets do not fulfill this native request.

**Conversation (6 comments read):** All 6 comments were read. The requester asks for Homey device/capability status and possibly actions/flows through the bearer-token REST API, and offers to contribute or provide access. Maintainers point to existing Home Assistant support and explain that integrations/widgets rely on entity IDs, while the requester later says Homey's device model is more complex and does not produce a completed PR. The final comment only supplies a sample device payload and asks whether maintainers would develop it. There is no later implementation or maintainer confirmation.

**V2 evidence:**

- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry contains Home Assistant and other supported services but no Homey definition, so Homey cannot be selected/configured as an integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the exhaustive integration creator map has no Homey factory and is checked with satisfies Record<IntegrationKind, ...>. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/widgets/src/registry.ts:1-40 — widgets are registered against concrete widget kinds and integration mappings; no Homey widget is registered in the v2 registry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)
- packages/definitions/src/integration.ts:266-275 — the existing Home Assistant entry demonstrates the separate native smart-home integration the requester was comparing against. — [source L266](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L266)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:111-119 — the release lists supported Assistant service tooling but does not announce Homey support. — [source L111](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L111)

**Remaining / follow-up:** A native Homey integration would need a registered kind, authenticated API client, device/capability and action schemas, widget configuration/rendering, permissions, and documentation. A generic Custom Widget can be a user workaround but is not evidence that this native integration request is addressed.

### #3478 — feat(login): add possibility to specify forgot password link

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3478) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The login page still shows the built-in CLI reset instruction and has no server setting for an external password-reset URL.

**Conversation (5 comments read):** All 5 comments were read. The reporter clarified that a server setting should replace the command-line reset-password details with a custom external link, for installations that delegate password recovery to another system. No comment indicates implementation or closure.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx:194-220 — the forgot-password area hardcodes the homarr reset-password command and has no configurable href. — [source L194](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx#L194)
- packages/server-settings/src/index.ts:5-16,42-55 — server setting keys and branding schema contain no forgot-password/reset URL field. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L5)
- packages/server-settings/src/index.ts:127-157 — default settings likewise provide no password-recovery link configuration. — [source L127](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L127)

**Remaining / follow-up:** Add a validated server-level URL and render it in the login form, while retaining a useful local-reset path when unset.

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

### #3287 — feat: sidebars

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3287) · **Large feature requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 restores configurable left and right sidebar gutters, including width/column controls and preview/onboarding support, addressing the missing sidebars that blocked the reported upgrade path.

**Conversation (10 comments read):** The requester and several later users said sidebars were the main reason they stayed on v1. Maintainers initially said the feature would return without prioritizing it. In August 2026 the maintainer announced sidebars in the v2 demo, enabled through board settings and configurable from one to three columns; the requester replied that the result exceeded expectations.

**V2 evidence:**

- packages/validation/src/board.ts:80-100 + layout validation includes leftGutterColumnCount and rightGutterColumnCount, bounded to three columns and disabled for mobile layouts. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L80)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:142-220 + 304-386 + board settings read and edit the gutter layout values and expose sidebar controls. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L142)
- packages/onboarding/src/setup-studio.tsx:180-190 + 410-423 + 1495-1587 + 1818-1842 + onboarding stores gutter choices, renders them in the preview, and includes them in review/submit. — [source L180](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/setup-studio.tsx#L180)
- packages/api/src/router/onboard/onboard-router.ts:568-614 + 616-633 + 659-664 + onboarding persists requested gutters and configured layout roots. — [source L568](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/onboard/onboard-router.ts#L568)
- packages/translation/src/lang/en.json:5696-5714 + localized labels explicitly describe left/right sidebar settings. — [source L5696](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/lang/en.json#L5696)

**Remaining / follow-up:** Users should still test migrated v1 layouts and responsive widths in their own deployment, but the requested sidebar capability is present in v2.

### #3266 — feat: Multiple Docker Environments in GUI

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3266) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports multiple named Docker/Podman endpoints, endpoint selection in the Docker widget, and management-page inventory across endpoints. The requested GUI endpoint creation/editing experience is still absent; endpoint configuration remains environment-driven.

**Conversation (7 comments read):** The reporter asks for several Docker instances in the management GUI, like Portainer, and for hostname overrides during imports. The seven comments explain that environment variables already supported multiple hosts, but the reporter found the setup confusing and wanted a GUI to add hosts, see columns, and configure socket and proxy endpoints together. A maintainer agreed a GUI was future work and pointed to #2477; the timeline later marked the issue duplicate without adding endpoint editing.

**V2 evidence:**

- reports/v2-issue-triage/source/3266.json:1 — the complete body and all seven full comments were read, including the environment-variable confusion and GUI request.
- apps/docs/docs/integrations/docker/index.mdx:18,55-63 — Docker endpoints are explicitly configured with environment variables, including multiple host/port pairs. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L18)
- apps/docs/docs/integrations/docker/index.mdx:71-108 — v2 documents named DOCKER_ENDPOINTS descriptors with socket, TCP, TLS, and per-endpoint capabilities. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L71)
- packages/docker/src/endpoint-descriptor.ts:3-25,30-57,60-103 — v2 parses and validates multiple uniquely identified endpoint descriptors and their transports. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/endpoint-descriptor.ts#L3)
- packages/docker/src/singleton.ts:52-99,102-128 — the Docker singleton initializes all configured endpoints, preserves endpoint IDs, and tolerates initialization failures per endpoint. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/singleton.ts#L52)
- packages/widgets/src/docker/index.ts:27-79 — the Docker widget exposes endpoint IDs as a selectable option and uses them to query inventory. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/index.ts#L27)
- apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:15-34 — the management page consumes discovered containers/endpoints; it has no endpoint CRUD form. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx#L15)
- apps/docs/docs/integrations/docker/index.mdx:110-117 — the documented v2 behavior covers multi-endpoint management and widget selection but keeps discovery/configuration outside the GUI. — [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L110)

**Remaining / follow-up:** Build a management UI to add, edit, validate, test, and remove named Docker endpoints, with secure secret/certificate handling and a clear persistence model. The existing environment configuration is a backend capability and does not complete the GUI request.

### #3220 — bug(calendar): Nextcloud integration - not all entries are displayed

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3220) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 contains fixes for Nextcloud DAV subpaths and all-day event date handling, and the current calendar path fetches all configured calendars without a widget-side item cap. The original report's claim that several events/calendars remain missing has no complete fixture or current reproduction, so the disposition is partial pending verification.

**Conversation (8 comments read):** The reporter supplied missing/wrong-date examples. The eight comments include a maintainer retest request and clarification, confirmation that seven entries were still missing, a report that only one of three calendars appeared, a comparison where eight calendars worked in v1.38, and repeated requests to investigate or retest. The timeline later closed and reopened the issue, cross-referenced #4736, and marked it duplicate, but does not identify a merged fix that proves every reported case.

**V2 evidence:**

- reports/v2-issue-triage/source/3220.json:1 — the complete body and all eight full comments were read, including the seven-missing-entry and multi-calendar follow-ups.
- packages/integrations/src/nextcloud/nextcloud.integration.ts:67-83 — the integration fetches all calendars in parallel for the requested time range. — [source L67](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L67)
- packages/integrations/src/nextcloud/nextcloud.integration.ts:85-165 — VEVENT parsing handles recurring events and the all-day date branch, while mapping every returned calendar event rather than truncating to one calendar. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L85)
- packages/integrations/src/nextcloud/nextcloud-url.ts:1-12 — the DAV URL builder preserves an existing integration subpath and appends the remote DAV endpoint correctly. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud-url.ts#L1)
- packages/request-handler/src/calendar.ts:9-28 — the calendar request range includes a six-day buffer around the displayed month, reducing boundary omissions. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/calendar.ts#L9)
- packages/api/src/router/widgets/calendar.ts:29-61 — API results filter Radarr release types but do not impose a generic event-count cap. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/calendar.ts#L29)
- packages/widgets/src/calendar/component.tsx:71-115 — the widget maps the returned event collection into calendar entries; there is no client-side seven-entry or single-calendar truncation. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/calendar/component.tsx#L71)

**Remaining / follow-up:** Retest with the original Nextcloud version, calendar count, recurrence/all-day data, and exact time zone. Add a fixture covering all calendars and recurrence exceptions, then confirm whether unsupported VEVENT forms or server-side DAV responses still omit entries.

### #3140 — bug: Bookmark and notebook widget not working anymore

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3140) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 has notebook save and bookmark render implementations, but their existence does not establish a causal fix for the reported stale edits, public-board failures, and deployment-specific client errors.

**Conversation (21 comments read):** The Helm report began with edits appearing unusable. Follow-ups expanded it to edits disappearing after navigation or logout, anonymous public boards going blank after reload, client exceptions, chunk-load errors, and severe slowness. Maintainers could not reproduce it; another user observed that a refresh showed the database-saved notebook value even when in-app navigation did not. A minor notebook fix (#3401) made things start working, but the reporter still needed repeated reloads and asked to close for now in August 2026 without testing a newer version. The conversation therefore contains both a core save symptom and environment/deployment symptoms.

**V2 evidence:**

- packages/widgets/src/notebook/notebook.tsx:85-116 + 126-147 + the current notebook holds editable content and invokes the update mutation, with success/error state handling. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L85)
- packages/api/src/router/widgets/notebook.ts:11-40 + the protected mutation validates the board/item and persists serialized notebook options. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/notebook.ts#L11)
- packages/widgets/src/notebook/notebook.tsx:337-370 + the editor is mounted as an actual RichTextEditor in the current code path. — [source L337](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L337)
- packages/widgets/src/bookmarks/index.tsx:12-16 + 53-100 + packages/widgets/src/bookmarks/bookmarks-widget.tsx:39-69 + 127-206 + bookmark definitions, loading, and rendering are present. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L12), [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/bookmarks-widget.tsx#L39)
- git history around the notebook implementation + no current v2 change establishes that the Helm/public anonymous reload or stale client cache behavior from the conversation was fixed.

**Remaining / follow-up:** Verify on release/v2 with the reported Helm deployment, authenticated edit followed by navigation/logout, and anonymous public-board reload. If the stale in-app value or blank public board still occurs, trace cache invalidation and deployment chunk/version consistency; the current mutation alone does not prove those symptoms are fixed.

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

### #2911 — bug: Cannot drag apps from dynamic zone

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2911) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 migrates dynamic sections to containers and replaces the drag editor. This changes the affected code path, but there is no direct causal or runtime evidence that repeated child drags can no longer pick up the parent container.

**Conversation (2 comments read):** The body reports that after moving one app from a dynamic zone to a category, subsequent drags grab the whole dynamic zone; a second commenter reproduced the same behavior between zones, and the maintainer acknowledged the difficulty. The current timeline has no direct merged fix for the old issue, but v2's board model and editor replace the affected surface.

**V2 evidence:**

- reports/v2-issue-triage/source/2911.json:1 — the complete issue body and both full comments were read, including the reproduction, cross-zone confirmation, and maintainer response.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-81 — v2 documents the rebuilt dnd-kit board editor and replacement of dynamic sections with Containers. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)
- packages/db/migrations/custom/0004_unify_sections_and_gutters.ts:72-75,97-108 — legacy dynamic sections are converted to durable containers during v2 migration. — [source L72](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/custom/0004_unify_sections_and_gutters.ts#L72)
- packages/validation/src/shared.ts:81-102 — old dynamic-section data is normalized into the container schema. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L81)
- apps/nextjs/src/components/board/sections/grid/grid-editor.tsx:155-179 — current drag editing uses one provider for root and nested container grids, avoiding the old dynamic-zone implementation. — [source L155](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/grid-editor.tsx#L155)

**Remaining / follow-up:** On release/v2, drag multiple apps successively out of a migrated container and between containers. Verify the second and subsequent drags move the selected app rather than the parent, including after save/reload. Keep this issue pending that reproduction.

### #2861 — bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2861) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 replaces the old category/dynamic-section layout with responsive Base, Mobile, and custom layouts plus reset/projection logic, but item membership is still persisted independently per layout and can diverge across breakpoints.

**Conversation (13 comments read):** All 13 comments were read. The original report says apps and dynamic-section contents disappear or reorder at smaller breakpoints and asks why categorization must be repeated per layout. Maintainers initially described independent layouts as expected and discussed generating other sizes from a Base layout. Multiple users argued that functional categories should survive viewport changes and reported dynamic-section membership reverting. The latest screenshots reproduce the behavior on desktop Firefox; the maintainer says v2's dashboard rewrite likely fixes it as a side effect, but no reporter confirms v2. The later discussion also contains a separate request to constrain icon minimum size.

**V2 evidence:**

- packages/api/src/router/board.ts:1458-1506 — v2 provides resetLayout, projecting a non-Base layout from Base and replacing target item/section layout records. — [source L1458](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1458)
- packages/api/src/router/board.ts:2364-2468 — responsive projection remaps lanes and generates new item layouts, including each item's current sectionId, when creating/resizing a layout. — [source L2364](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2364)
- apps/nextjs/src/components/board/sections/use-section-items.ts:7-15,30-54 — rendering selects the current layout and indexes each item by that layout's sectionId, so membership is layout-specific at runtime. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/use-section-items.ts#L7)
- apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts:29-65 — drag/drop commits sectionId only on the layout being edited, leaving other breakpoint memberships untouched. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts#L29)
- packages/boards/src/context.tsx:83-87,138-147 — viewport resize selects a different layout ID, which drives the layout-specific section index. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/boards/src/context.tsx#L83)

**Remaining / follow-up:** Test a migrated v1 board with categories/dynamic sections across every configured breakpoint, including edits followed by resize and refresh. If the requirement is invariant functional membership, v2 needs shared section membership or automatic synchronized updates; Base reset/projection alone does not guarantee it.

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

### #2482 — feat: add all relevant tRPC queries / mutations as openapi endpoint

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2482) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 exposes a meaningful OpenAPI subset for apps, boards, users, invites, settings, and info, while many routers and relevant procedures remain outside the generated OpenAPI router.

**Conversation (1 comments read):** The issue's single comment was read. The request is for all relevant tRPC queries and mutations to be usable programmatically with an API key. Timeline events mark it duplicate and link the older API request #1978, but neither the duplicate marker nor that relationship establishes complete endpoint coverage. V2 has explicit OpenAPI metadata on several management procedures and a generated document, yet the canonical app router includes integrations, sections, widgets, Docker, groups, API keys, media, onboarding, and other routers that are not included in the OpenAPI router. Some procedures within included routers also lack metadata.

**V2 evidence:**

- packages/api/src/open-api.ts:13-20 — the generated OpenAPI router includes only app, board, info, invite, serverSettings, and user routers. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/open-api.ts#L13)
- packages/api/src/root.ts:5-33 — the full tRPC app router also registers integration, group, section, widget, Docker, Kubernetes, media, onboarding, API-key, custom-widget, and other routers absent from openApiRouter. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/root.ts#L5)
- packages/api/src/router/app.ts:21-38,55-67 — included app procedures explicitly carry OpenAPI metadata, showing the implemented subset is intentional and procedure-level. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/app.ts#L21)
- packages/api/src/router/integration/integration-router.ts:52-80,92-104,143-162 — configured-integration procedures are present in tRPC but have no OpenAPI metadata and cannot appear in the generated document. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/integration/integration-router.ts#L52)
- apps/nextjs/src/app/api/[...trpc]/route.ts:15-39 — the OpenAPI handler supports API-key-derived context, so authentication plumbing exists for whatever endpoints are registered. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/[...trpc]/route.ts#L15)

**Remaining / follow-up:** Define the supported API surface and add metadata/output schemas for the relevant missing routers and procedures, with deliberate exclusions for sensitive or UI-only operations. The existing OpenAPI subset and API-key handler do not satisfy the stated all-relevant coverage.

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

### #2362 — feat: wake on lan widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2362) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no native Wake-on-LAN widget or integration in the V2 source. The integration export list contains media, networking, storage, and UPS integrations but no WOL or UpSnap client, and the integration definitions likewise have no WOL kind. A generic Custom Widget can make HTTP requests, but that does not supply the requested native discovery, configuration, or LAN wake behavior.

**Conversation (5 comments read):** The issue asks for a widget that sends Wake-on-LAN to remote machines. Discussion considers a command or network configuration, an UpSnap integration, and the difficulty of documenting UpSnap's API; the maintainer prefers a self-hosted WOL application when possible. A later comment observes that visiting a reverse-proxied domain can wake a machine, but that is an incidental proxy behavior and not a Homarr feature. No comment or timeline entry establishes a merged native implementation.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — all native integration exports are listed here; there is no Wake-on-LAN, WOL, or UpSnap integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-507,524-530 — the relevant categories define PeaNUT and Traefik but no WOL integration kind. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/integrations/src/index.ts:51-67 — exported native data interfaces do not include a WOL action or machine-wake contract. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L51)

**Remaining / follow-up:** A native integration/widget needs a safe server-side WOL action, target configuration and authorization model, and a reachable network path; an external UpSnap service could be supported separately if its API contract is stable.

### #2294 — feat: Integration with FileFlows

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2294) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no FileFlows integration in the v2 integration registry or source. The referenced draft/feature branch was not merged into release/v2, and the later OIDC-related testing discussion remains unresolved.

**Conversation (4 comments read):** The body requests a native FileFlows integration and links FileFlows API material. A maintainer pointed to draft PR #6144 and asked the reporter to test an image with a backup; an automated cleanup then closed the issue for niche scope and lack of maintainer commitment. The reporter reopened it in September, reported that API/token calls worked in Postman but Homarr failed with a tRPC FORBIDDEN error behind Authentik OIDC, and suggested using an Authorization bearer token. The referenced FileFlows implementation commit is on a feature branch and is not an ancestor of v2.

**V2 evidence:**

- reports/v2-issue-triage/source/2294.json:1 — the complete source snapshot and all four full comments were read, including the reopen, Authentik, bearer-token, and draft-PR discussion.
- packages/integrations/src/base/creator.ts:9-115 — the exhaustive current integration-kind registry contains no FileFlows creator or registration. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-69 — v2's Custom Widgets and Workshop are described as extensibility surfaces; neither supplies a native FileFlows integration. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)
- reports/v2-issue-triage/source/timelines/2294.json:1 — the full issue timeline records the draft/follow-up references and reopen history, with no merged v2 fix event.
- git history at HEAD (commit 5089a2ae6) — the available FileFlows implementation exists on a non-ancestor feature branch, so it cannot be credited to release/v2.

**Remaining / follow-up:** Add and secure a native FileFlows integration, then resolve the Authentik/OIDC request path and define its widget data and credentials. Until that work lands in v2, the issue remains open even if a Custom Widget can call a FileFlows endpoint.

### #2160 — feat: Two proxmox on one TAB

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2160) · **Integration requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** A single Health Monitoring widget now renders every selected Proxmox integration, addressing the report that choosing two standalone hosts displayed only the first.

**Conversation (2 comments read):** The reporter clarified in two comments that they wanted two separately configured Proxmox hosts in one widget rather than needing two widgets. They did not explicitly require merged totals or one synthesized Proxmox cluster. V2 maps all selected cluster integrations into panels within the same widget.

**V2 evidence:**

- packages/widgets/src/health-monitoring/component.tsx:18-42 — v2 partitions selected integrations and maps every clusterIntegrationId to a ClusterHealthMonitoring panel, including multiple panels in a scroll area. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L18)
- packages/widgets/src/health-monitoring/component.tsx:44-64 — advanced mode can show system health beside the collection of cluster panels and compact mode exposes system/cluster tabs. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L44)
- packages/api/src/router/widgets/health-monitoring.ts:64-77 — the cluster query is still made per integrationId, with no aggregate Proxmox endpoint. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/health-monitoring.ts#L64)
- packages/integrations/src/proxmox/proxmox-integration.ts:25-50 — each Proxmox integration continues to fetch its own resources. — [source L25](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/proxmox/proxmox-integration.ts#L25)

**Remaining / follow-up:** Confirm with the two standalone Proxmox servers. Per-host panels remain separate within the widget; aggregated totals were not an explicit requirement in this conversation.

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

### #2078 — feat: Permission per App / App-Element / Dynamic Group

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2078) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 has global app, integration, and board permission levels plus per-board and per-integration access, but it does not implement per-app, per-item, or per-dynamic-group visibility. The current app access guard explicitly allows any logged-in user to see apps, so the requested OIDC-group-driven hiding is not addressed.

**Conversation (13 comments read):** The original request asks to hide or show apps, app elements, and dynamic groups based on OIDC groups, preferably removing hidden items and reclaiming their space. Across all 13 comments, the author first preferred complete hiding, accepted graying as a fallback, and discussed family users, Dashy-like role visibility, category/widget movement, and separate app or integration lists. Maintainers explained that automatic space filling was difficult, suggested separate boards, said the feature was not a security boundary, and later considered simpler group permissions. The latest comment asks for an update; no implementation or merged fix appears in the assigned timeline.

**V2 evidence:**

- reports/v2-issue-triage/source/2078.json:1 — the complete issue body and all 13 full comments were read; the conversation covers hidden versus disabled behavior, layout space, OIDC groups, and app/integration list visibility.
- packages/definitions/src/permissions.ts:38-71 — v2 defines global group permissions for app, integration, and board capabilities, with inheritance, but no permission key for visibility of an individual app or item. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L38)
- apps/docs/docs/management/users/index.mdx:37-71 — documentation describes global app/integration levels and resource-specific board/integration access; it does not describe per-app or per-item group visibility. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/users/index.mdx#L37)
- packages/api/src/router/app/app-access-control.ts:20-25 — the current guard says any logged-in user can see all apps, demonstrating that app use/access permissions are not item-level visibility filtering. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/app/app-access-control.ts#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2 preserves ordinary board permissions and says Assistant/MCP do not bypass them, but does not claim the requested per-element visibility. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Implement and define the native semantics for group-based visibility of apps, bookmarks, widgets, and nested containers, including layout reflow and whether hidden items are removed or merely disabled. Treat it as presentation/access control with explicit security boundaries; Custom Widgets or a user-created workaround do not satisfy native app and item filtering.

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

### #962 — bug: item and dynamic section menus overlap

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/962) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces dynamic sections with containers, but that replacement does not establish that nested item/container menu handles no longer overlap. The original screenshots show handle placement, not simply an obsolete dropdown implementation.

**Conversation (0 comments read):** The issue has two screenshots and no comments. They show nested dynamic-section menu handles overlapping; one also shows an item count badge near the overlap. The timeline references unmerged PR #1184. Both historical images were downloaded and inspected, but neither is a V2 runtime capture.

**V2 evidence:**

- reports/v2-issue-triage/source/962.json:1 — the complete issue body and empty full_comments array were read; the request is the screenshot-described old menu overlap.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-81 — v2 documents the rebuilt board editor and says Containers replace Groups and dynamic sections. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)
- packages/db/migrations/custom/0004_unify_sections_and_gutters.ts:72-75,97-108 — the v2 custom migration converts legacy categories and dynamic sections into durable container records. — [source L72](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/custom/0004_unify_sections_and_gutters.ts#L72)
- packages/validation/src/shared.ts:81-102 — legacy dynamic-section input is transformed into the current container schema, keeping old board data on the new model. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L81)
- apps/nextjs/src/components/board/sections/grid/grid-editor.tsx:155-179 — the current editor coordinates root and nested container grids through one drag-and-drop provider. — [source L155](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/grid-editor.tsx#L155)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:15-26,35-71 — current container actions are rendered through the container menu used by the replacement surface. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L15)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:24,42-45 — menu offset distinguishes root from nested containers but does not itself prove spacing at every nesting depth. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L24)

**Remaining / follow-up:** Recreate the deeply nested arrangement from both historical screenshots on a migrated V2 board and inspect each menu handle in edit mode. The same user-visible failure can persist across a rewrite; do not require a new issue solely because the model changed.

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

### #125 — Dependency Dashboard

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/125) · **Other / tracking** · **Not addressed** · Confidence: **high**

**Request:** This is Renovate's dependency dashboard, not a product defect. It remains an open maintenance queue at the v2 commit: pending package, action, Go, mise, npm, and nvm updates are still listed, including security-related updates. The v2 release changes database support and product surfaces, but does not resolve or close every dependency-dashboard entry.

**Conversation (0 comments read):** The bot-generated body enumerates detected dependencies and pending approval, blocked, and security update branches. It has no human comments; its timeline records automated maintenance state changes and reopening rather than a product decision. The request therefore represents outstanding repository maintenance, not a feature that v2 implicitly satisfies.

**V2 evidence:**

- reports/v2-issue-triage/source/125.json:1 — the complete source snapshot was read; the body is the Renovate dashboard with pending dependency and security update entries and full_comments is empty.
- .github/renovate.json5:2-3 — Renovate's dashboard configuration is still present, so the dashboard remains an active queue rather than a completed migration artifact. — [source L2](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/.github/renovate.json5#L2)
- .github/renovate.json5:21-23 — automerge rules cover only selected minor and patch updates; pending major or approval-gated entries still require maintenance work. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/.github/renovate.json5#L21)
- packages/ui/package.json:38,47 — crypto-js and its type package remain declared dependencies at the assessed v2 HEAD, corroborating that at least one dependency-related dashboard concern is still represented in the tree. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/ui/package.json#L38)

**Remaining / follow-up:** Keep this as an ongoing Renovate maintenance tracker rather than a V2 closure candidate. Review pending updates individually; completing one snapshot of its queue does not make the recurring dashboard obsolete.

