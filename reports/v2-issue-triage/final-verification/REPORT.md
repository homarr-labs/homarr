# V2 final issue verification — 18 September 2026

**72 addressed (including 33 partial implementations), 50 not addressed, 14 still require original-environment verification.**

All **20/20** previously unresolved verification cases received an additional investigation. The complete backlog snapshot remains **136 issues / 448 comments**; this is not a claim that all 136 were runtime tested or that all 20 were reproduced in their original environments. Full conversations and source classifications remain linked through the previous report.

The worktree is based on freshly fetched `origin/release/v2` at `439b208283c2e80dd399fcb2a83e1661bb0c099f`, plus twelve local changed/new source/test files. Final production image: `homarr:v2-triage-verified-bounds`, `sha256:d576f31095aa85ccae02180fd86390c5ab749b7b3fbc76dce56a9bf60fa23c28`. [Source hashes and validation](parent/candidate-sources.json) distinguish this candidate from the unmodified V2 image used by several agents. No dev banner was used as V2 evidence.

Per the requested reporting convention, partial implementations count as **addressed**, with remaining requirements retained below. Partial test coverage or a failed reproduction does not itself establish a partial implementation fix. In particular, short synthetic memory/reconnect checks do not resolve the production OOM or TrueNAS host-memory reports.

[All 20 follow-ups](20-VERIFICATIONS.md) · [Fix review](parent/REVIEW.md) · [PR description draft](PR-DESCRIPTION.md) · [Closing list](CLOSING-ISSUES.md) · [Coverage](COVERAGE.md)

## Fixes and validation

- Nested container settings menus: depth-aware placement, narrow wrapping, collapsed-card positioning. Remaining expand-control overlap is explicitly retained.
- LDAP: preserve escaped/percent DN values, escape filter values, request the configured group lookup attribute.
- GitHub releases: retain fetched pages when the subsequent page hits GitHub's explicit 1000-result cap; ordinary API errors remain errors.
- OIDC logout: suppress the competing session-cache document reload while preserving cache invalidation and old-session subtree removal.
- Startup shutdown: install traps before migrations and terminate the tracked migration child; failed migrations still abort startup.
- **30 focused tests passed** (13 LDAP, 14 release-provider, 3 session-scope); auth, request-handler and Next.js typechecks passed. Focused lint had zero errors and existing warnings. Production build and diff whitespace check passed.
- Pre-logout-fix candidate browser menu checks (before the final minimum-size bounds refinement) passed for wide mobile/desktop, narrow mobile, and collapsed narrow mobile/desktop. Four settings targets were on-card and correctly hit-tested in each. Deepest collapsed Edit opened the correct item. A failed expand-center click is retained as a limitation, not a passing assertion. On the final image, tall narrow mobile/desktop controls remained 4/4 reachable; all four minimum-size menus stayed on-card but the deepest two overlapped. See parent/menu-results.json.
- Migration SIGTERM exited cleanly in 0.205 s; the final ready image exited cleanly in 0.666 s. These Docker checks do not certify every Podman/environment variant.

## Every issue

| Issue | Category | Disposition | Coverage | Confidence |
|---|---|---|---|---|
| [#6853](https://github.com/homarr-labs/homarr/issues/6853) feat: Notification widget - Support Markdown/HTML, Delete Option, and Disable Clickthrough | qol | addressed | full | high |
| [#6850](https://github.com/homarr-labs/homarr/issues/6850) bug: OIDC logout aborts the end-session request before it completes | bug | addressed | full | high |
| [#6849](https://github.com/homarr-labs/homarr/issues/6849) bug: I can't switch between the dark and light themes | bug | needs-verification | none-established | medium |
| [#6847](https://github.com/homarr-labs/homarr/issues/6847) feat(plex): media releases widget should list newly added episodes, not seasons | integration-request | not-addressed | none-established | high |
| [#6830](https://github.com/homarr-labs/homarr/issues/6830) bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't) | bug | addressed | full | high |
| [#6823](https://github.com/homarr-labs/homarr/issues/6823) bug: | bug | needs-verification | none-established | medium |
| [#6811](https://github.com/homarr-labs/homarr/issues/6811) bug: Annoying scroll bar | annoyance | needs-verification | none-established | medium |
| [#6807](https://github.com/homarr-labs/homarr/issues/6807) bug: MCP tools/list fails on invite_createInvite z.date() schema | bug | addressed | full | high |
| [#6803](https://github.com/homarr-labs/homarr/issues/6803) feat: Add support for Unraid Storage Pools | integration-request | not-addressed | none-established | high |
| [#6764](https://github.com/homarr-labs/homarr/issues/6764) aria2 integration: torrents never report 'seeding' state, always 'leeching' | bug | not-addressed | none-established | high |
| [#6763](https://github.com/homarr-labs/homarr/issues/6763) bug: Unable to add users/group to board access control when using OIDC via Authentik | bug | addressed | full | high |
| [#6761](https://github.com/homarr-labs/homarr/issues/6761) bug: App Management Breaks w/o Modify All Boards Permission | bug | addressed | full | high |
| [#6745](https://github.com/homarr-labs/homarr/issues/6745) bug: Unraid health widget reports RAM in GiB approximately 1024x too small | bug | addressed | full | high |
| [#6728](https://github.com/homarr-labs/homarr/issues/6728) feat: Ping health-check timeout is hardcoded and too short for slower endpoints | bug | not-addressed | none-established | high |
| [#6712](https://github.com/homarr-labs/homarr/issues/6712) bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password | bug | addressed | full | high |
| [#6697](https://github.com/homarr-labs/homarr/issues/6697) feat: Use Tb / Gb for UNRAID Integration | qol | addressed | full | high |
| [#6682](https://github.com/homarr-labs/homarr/issues/6682) bug: Immich integration stops working after the latest update | bug | addressed | full | high |
| [#6681](https://github.com/homarr-labs/homarr/issues/6681) bug: Immich Integration show as working, zero results. | bug | addressed | full | high |
| [#6677](https://github.com/homarr-labs/homarr/issues/6677) feat: save state of accordion in system health monitor | qol | not-addressed | none-established | high |
| [#6671](https://github.com/homarr-labs/homarr/issues/6671) bug: Weather widget not displaying data | bug | addressed | full | high |
| [#6644](https://github.com/homarr-labs/homarr/issues/6644) feat: add GPU charts to Beszel System Stats widget | integration-request | not-addressed | none-established | high |
| [#6643](https://github.com/homarr-labs/homarr/issues/6643) feat: Allow reordering boards in the board switcher | annoyance | not-addressed | none-established | high |
| [#6628](https://github.com/homarr-labs/homarr/issues/6628) bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL | bug | addressed | full | high |
| [#6626](https://github.com/homarr-labs/homarr/issues/6626) feat: allow selecting which disks are shown in health monitoring / disks widgets | qol | addressed | partial | high |
| [#6622](https://github.com/homarr-labs/homarr/issues/6622) bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login | bug | addressed | full | high |
| [#6620](https://github.com/homarr-labs/homarr/issues/6620) bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0 | bug | needs-verification | none-established | medium |
| [#6614](https://github.com/homarr-labs/homarr/issues/6614) feat: Add Quven integration | integration-request | not-addressed | none-established | high |
| [#6608](https://github.com/homarr-labs/homarr/issues/6608) bug: Integration page accessible without board-modify-all permission | bug | addressed | full | high |
| [#6600](https://github.com/homarr-labs/homarr/issues/6600) 🚀 Homarr v2 public beta is here! Join the testing | other | addressed | partial | high |
| [#6593](https://github.com/homarr-labs/homarr/issues/6593) bug: Pi-hole v6 / Plex integrations send unauthenticated periodic health-check requests, causing real 401s | bug | not-addressed | none-established | high |
| [#6589](https://github.com/homarr-labs/homarr/issues/6589) feat: 2 separate widgets for 2 separate docker instances | qol | addressed | full | high |
| [#6559](https://github.com/homarr-labs/homarr/issues/6559) bug: Releases widget showing "Only the first 1000 results are available" error | bug | addressed | full | high |
| [#6543](https://github.com/homarr-labs/homarr/issues/6543) Upgrade to MCP v2 (spec 2026-07-28) | big-feature | addressed | partial | high |
| [#6519](https://github.com/homarr-labs/homarr/issues/6519) bug: RSS widget poster images don't load for reddit feeds | bug | not-addressed | none-established | high |
| [#6516](https://github.com/homarr-labs/homarr/issues/6516) bug: mysql migration error | bug | not-addressed | none-established | high |
| [#6513](https://github.com/homarr-labs/homarr/issues/6513) feat: Windows-style board switcher overlay (Alt-Tab style) when cycling boards | qol | addressed | partial | high |
| [#6438](https://github.com/homarr-labs/homarr/issues/6438) bug: OOM with 1.71.0 | bug | needs-verification | none-established | medium |
| [#6435](https://github.com/homarr-labs/homarr/issues/6435) feat: Expand Homarr API Coverage to Support Full Dashboard Automation | big-feature | addressed | partial | high |
| [#6403](https://github.com/homarr-labs/homarr/issues/6403) feat: Dynamic apps fetched from reverse proxy | big-feature | not-addressed | none-established | high |
| [#6392](https://github.com/homarr-labs/homarr/issues/6392) feat: Switch Board via keyboard shortcut | qol | addressed | partial | high |
| [#6300](https://github.com/homarr-labs/homarr/issues/6300) bug: Memory leak | bug | needs-verification | none-established | low |
| [#6271](https://github.com/homarr-labs/homarr/issues/6271) bug: TrueNAS Integration eating up memory on TrueNAS host | bug | needs-verification | none-established | medium |
| [#6254](https://github.com/homarr-labs/homarr/issues/6254) feat: aMule | integration-request | not-addressed | none-established | high |
| [#6207](https://github.com/homarr-labs/homarr/issues/6207) bug: Unifi integration not working | bug | addressed | full | high |
| [#6177](https://github.com/homarr-labs/homarr/issues/6177) bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion | bug | needs-verification | none-established | medium |
| [#6155](https://github.com/homarr-labs/homarr/issues/6155) feat: re-open: Transfer to the existing Dashdot graphs?  #5964 | qol | not-addressed | none-established | high |
| [#6153](https://github.com/homarr-labs/homarr/issues/6153) feat: re-open: add open webui  #3766 | integration-request | addressed | partial | medium |
| [#6152](https://github.com/homarr-labs/homarr/issues/6152) feat: re-open: add Wazuh  #3765 | integration-request | not-addressed | none-established | high |
| [#6050](https://github.com/homarr-labs/homarr/issues/6050) bug: background image is absent or cut off with white space | bug | addressed | partial | medium |
| [#6024](https://github.com/homarr-labs/homarr/issues/6024) bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901) | bug | needs-verification | none-established | medium |
| [#6008](https://github.com/homarr-labs/homarr/issues/6008) bug: manage/about page fails to load with ECONNREFUSED | bug | addressed | full | high |
| [#6002](https://github.com/homarr-labs/homarr/issues/6002) bug: Uptime-Kuma, paused has no effect | bug | not-addressed | none-established | high |
| [#5867](https://github.com/homarr-labs/homarr/issues/5867) feat: REST Endpoint  to manage boards | big-feature | addressed | full | high |
| [#5769](https://github.com/homarr-labs/homarr/issues/5769) feat: Support Kubernetes integration as dashboard widgets instead of a global tool for multi-tenant access control | big-feature | not-addressed | none-established | high |
| [#5730](https://github.com/homarr-labs/homarr/issues/5730) bug: Administration menu breaks if you click around the options too much | bug | addressed | partial | high |
| [#5716](https://github.com/homarr-labs/homarr/issues/5716) bug: OIDC group assignment is not working if user is only in one group | bug | not-addressed | none-established | high |
| [#5538](https://github.com/homarr-labs/homarr/issues/5538) bug: No integration data available for unraid disks | bug | not-addressed | none-established | high |
| [#5387](https://github.com/homarr-labs/homarr/issues/5387) feat: Pushover Integration | integration-request | not-addressed | none-established | high |
| [#5342](https://github.com/homarr-labs/homarr/issues/5342) bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration | bug | addressed | full | high |
| [#5336](https://github.com/homarr-labs/homarr/issues/5336) feat: widget to display missing / queued movies & episodes | qol | addressed | full | high |
| [#5154](https://github.com/homarr-labs/homarr/issues/5154) feat: SLO (Single Log-out) | big-feature | not-addressed | none-established | high |
| [#5085](https://github.com/homarr-labs/homarr/issues/5085) bug: Unable to connect to LDAP | bug | addressed | partial | high |
| [#4973](https://github.com/homarr-labs/homarr/issues/4973) bug: System Resources Incorrect Total Ram for TrueNAS 25.04 | bug | addressed | full | high |
| [#4965](https://github.com/homarr-labs/homarr/issues/4965) bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name | bug | addressed | full | high |
| [#4906](https://github.com/homarr-labs/homarr/issues/4906) feat: Top right UI Cleanup (concept video inside) | qol | addressed | partial | medium |
| [#4815](https://github.com/homarr-labs/homarr/issues/4815) feature: Seed the database with a showcase default dashboard using the new JSON import endpoint | big-feature | addressed | partial | high |
| [#4797](https://github.com/homarr-labs/homarr/issues/4797) feat(releases): support image tags | bug | addressed | partial | high |
| [#4766](https://github.com/homarr-labs/homarr/issues/4766) bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy | bug | needs-verification | none-established | low |
| [#4738](https://github.com/homarr-labs/homarr/issues/4738) bug: Dashboard Layout - Saving Changes Failure | bug | needs-verification | none-established | medium |
| [#4563](https://github.com/homarr-labs/homarr/issues/4563) feat: Generic Game Server Status Widget | integration-request | not-addressed | none-established | high |
| [#4562](https://github.com/homarr-labs/homarr/issues/4562) feat(integrations): support music media type for seerr | integration-request | not-addressed | none-established | high |
| [#4543](https://github.com/homarr-labs/homarr/issues/4543) feat: Edit apps inside Edit Item | qol | addressed | full | high |
| [#4541](https://github.com/homarr-labs/homarr/issues/4541) feat(boards): support automatic layout for different screen sizes | big-feature | addressed | partial | high |
| [#4538](https://github.com/homarr-labs/homarr/issues/4538) bug: iCal widget intergration not working | bug | not-addressed | none-established | high |
| [#4533](https://github.com/homarr-labs/homarr/issues/4533) feat: show Description next to title for application | qol | addressed | full | high |
| [#4455](https://github.com/homarr-labs/homarr/issues/4455) feat: Ability to disable users without deleting them. | qol | not-addressed | none-established | high |
| [#4406](https://github.com/homarr-labs/homarr/issues/4406) bug: OIDC not working with Cloudflare Zero Trust / SaaS | bug | addressed | partial | medium |
| [#4361](https://github.com/homarr-labs/homarr/issues/4361) feat(media-releases): support selection of user for library fetching | qol | not-addressed | none-established | high |
| [#4330](https://github.com/homarr-labs/homarr/issues/4330) feat(icon-picker): show more than 12 icons per source | qol | addressed | partial | high |
| [#4246](https://github.com/homarr-labs/homarr/issues/4246) bug: download client sorting only on client side | bug | not-addressed | none-established | high |
| [#4190](https://github.com/homarr-labs/homarr/issues/4190) bug: Cannot integrate with OMV, Invalid system information response | bug | needs-verification | none-established | medium |
| [#4159](https://github.com/homarr-labs/homarr/issues/4159) bug: Tasks page does not load | bug | addressed | full | high |
| [#4157](https://github.com/homarr-labs/homarr/issues/4157) feat: Download Client Item - Job Name column should be wider than the rest. | qol | addressed | full | medium |
| [#4143](https://github.com/homarr-labs/homarr/issues/4143) feat: separate region from language | qol | not-addressed | none-established | high |
| [#4026](https://github.com/homarr-labs/homarr/issues/4026) bug: Downloads: number of shown entries per intergration include already hidden entries | bug | not-addressed | none-established | high |
| [#3990](https://github.com/homarr-labs/homarr/issues/3990) feat: Allow one URL and just map ports for each app | qol | addressed | partial | high |
| [#3913](https://github.com/homarr-labs/homarr/issues/3913) feat: Support running as fully non-root containers | big-feature | addressed | partial | high |
| [#3904](https://github.com/homarr-labs/homarr/issues/3904) feat: GPU usage in Dash component | qol | addressed | full | high |
| [#3887](https://github.com/homarr-labs/homarr/issues/3887) feat: allow no network for system resources and allow proxmox to be used | qol | addressed | partial | high |
| [#3853](https://github.com/homarr-labs/homarr/issues/3853) feat: Allow Docker stats widget to be seen without admin privileges | qol | not-addressed | none-established | high |
| [#3843](https://github.com/homarr-labs/homarr/issues/3843) feat: Ability to set the border color or transparency of tables in the Notebook widget | qol | not-addressed | none-established | high |
| [#3805](https://github.com/homarr-labs/homarr/issues/3805) bug: cache invalidation for board settings not working | bug | addressed | full | high |
| [#3786](https://github.com/homarr-labs/homarr/issues/3786) feat: automatic service discovery | integration-request | addressed | partial | high |
| [#3784](https://github.com/homarr-labs/homarr/issues/3784) feat(app-widget): container linking & run toggling | big-feature | not-addressed | none-established | high |
| [#3778](https://github.com/homarr-labs/homarr/issues/3778) feat(boards): configure default behaviour for open in new tab | qol | not-addressed | none-established | high |
| [#3771](https://github.com/homarr-labs/homarr/issues/3771) feat(boards): open all apps | qol | addressed | partial | high |
| [#3758](https://github.com/homarr-labs/homarr/issues/3758) feat(release-widget): synchronize marked as viewed over multiple devices | qol | not-addressed | none-established | high |
| [#3732](https://github.com/homarr-labs/homarr/issues/3732) Release Widget: Icon only | qol | addressed | full | medium |
| [#3731](https://github.com/homarr-labs/homarr/issues/3731) Release Widget: Docker importable programs | bug | addressed | partial | medium |
| [#3704](https://github.com/homarr-labs/homarr/issues/3704) bug: removed integrations keep coming back | bug | not-addressed | none-established | high |
| [#3696](https://github.com/homarr-labs/homarr/issues/3696) feat: Integration for Scrutiny | integration-request | not-addressed | none-established | high |
| [#3675](https://github.com/homarr-labs/homarr/issues/3675) bug: Stopping the container with SIGTERM fails | bug | addressed | partial | medium |
| [#3597](https://github.com/homarr-labs/homarr/issues/3597) bug: nexcloud integration with subpaths do not work | bug | addressed | full | high |
| [#3595](https://github.com/homarr-labs/homarr/issues/3595) feat: Focus search bar like pre 1.0 | qol | addressed | partial | medium |
| [#3515](https://github.com/homarr-labs/homarr/issues/3515) feat: Personalize the upper right menu bar | qol | addressed | full | medium |
| [#3512](https://github.com/homarr-labs/homarr/issues/3512) feat: Add Support for Homey API Integration | integration-request | not-addressed | none-established | high |
| [#3478](https://github.com/homarr-labs/homarr/issues/3478) feat(login): add possibility to specify forgot password link | qol | not-addressed | none-established | high |
| [#3407](https://github.com/homarr-labs/homarr/issues/3407) bug: background jittering when scrolling | bug | needs-verification | none-established | low |
| [#3371](https://github.com/homarr-labs/homarr/issues/3371) feat: upload video backgrounds | qol | not-addressed | none-established | high |
| [#3287](https://github.com/homarr-labs/homarr/issues/3287) feat: sidebars | big-feature | addressed | full | high |
| [#3266](https://github.com/homarr-labs/homarr/issues/3266) feat: Multiple Docker Environments in GUI | big-feature | addressed | partial | high |
| [#3220](https://github.com/homarr-labs/homarr/issues/3220) bug(calendar): Nextcloud integration - not all entries are displayed | bug | addressed | partial | medium |
| [#3140](https://github.com/homarr-labs/homarr/issues/3140) bug: Bookmark and notebook widget not working anymore | bug | needs-verification | none-established | medium |
| [#3064](https://github.com/homarr-labs/homarr/issues/3064) feat(integrations): store sessions for emby / jellyfin | integration-request | not-addressed | none-established | high |
| [#3055](https://github.com/homarr-labs/homarr/issues/3055) feat: Provide SSO user information - groups and other auth info | qol | not-addressed | none-established | high |
| [#2911](https://github.com/homarr-labs/homarr/issues/2911) bug: Cannot drag apps from dynamic zone | bug | addressed | full | medium |
| [#2861](https://github.com/homarr-labs/homarr/issues/2861) bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width | bug | addressed | partial | high |
| [#2657](https://github.com/homarr-labs/homarr/issues/2657) feat(auth): support object path for groups and username claims | qol | addressed | full | high |
| [#2555](https://github.com/homarr-labs/homarr/issues/2555) feat: add settings to configure file upload limit | qol | not-addressed | none-established | high |
| [#2508](https://github.com/homarr-labs/homarr/issues/2508) feat: log source ip for failed login attempts | qol | not-addressed | none-established | high |
| [#2495](https://github.com/homarr-labs/homarr/issues/2495) feat: Redirect to login page if not logged in | qol | addressed | partial | high |
| [#2482](https://github.com/homarr-labs/homarr/issues/2482) feat: add all relevant tRPC queries / mutations as openapi endpoint | big-feature | addressed | partial | high |
| [#2480](https://github.com/homarr-labs/homarr/issues/2480) feat: fetch app icons automatically | qol | not-addressed | none-established | high |
| [#2478](https://github.com/homarr-labs/homarr/issues/2478) feat: import / export apps | qol | not-addressed | none-established | high |
| [#2362](https://github.com/homarr-labs/homarr/issues/2362) feat: wake on lan widget | integration-request | not-addressed | none-established | high |
| [#2294](https://github.com/homarr-labs/homarr/issues/2294) feat: Integration with FileFlows | integration-request | not-addressed | none-established | high |
| [#2160](https://github.com/homarr-labs/homarr/issues/2160) feat: Two proxmox on one TAB | integration-request | addressed | full | high |
| [#2154](https://github.com/homarr-labs/homarr/issues/2154) feat: Re-add ability to use different port number | qol | not-addressed | none-established | high |
| [#2095](https://github.com/homarr-labs/homarr/issues/2095) feat: add css templates | qol | addressed | partial | high |
| [#2078](https://github.com/homarr-labs/homarr/issues/2078) feat: Permission per App / App-Element / Dynamic Group | big-feature | addressed | partial | high |
| [#1921](https://github.com/homarr-labs/homarr/issues/1921) feat: Add titles and folding for Dynamic Sections | qol | addressed | full | high |
| [#1014](https://github.com/homarr-labs/homarr/issues/1014) feat: Import browser bookmarks | qol | not-addressed | none-established | high |
| [#962](https://github.com/homarr-labs/homarr/issues/962) bug: item and dynamic section menus overlap | annoyance | addressed | partial | high |
| [#925](https://github.com/homarr-labs/homarr/issues/925) feat: import items from another board | qol | addressed | partial | high |
| [#437](https://github.com/homarr-labs/homarr/issues/437) feat: add board preview | qol | addressed | full | high |
| [#125](https://github.com/homarr-labs/homarr/issues/125) Dependency Dashboard | other | not-addressed | none-established | high |

## [#6853](https://github.com/homarr-labs/homarr/issues/6853) — feat: Notification widget - Support Markdown/HTML, Delete Option, and Disable Clickthrough

**addressed · full · confidence: high**

V2 adds sanitized Markdown/HTML notification rendering, permission-gated Gotify deletion, and a dedicated open-service button instead of whole-card clickthrough.

Conversation: The request contains three requirements: formatted content, delete/dismiss controls, and configurable or dedicated clickthrough. No comments were present.

Remaining limits: Validate formatting and deletion against a real Gotify deployment.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6853.

## [#6850](https://github.com/homarr-labs/homarr/issues/6850) — bug: OIDC logout aborts the end-session request before it completes

**addressed · full · confidence: high**

The post-fix homarr:v2-triage-logout-fix image (sha256:8da60640d9ae676dd1b2d59a1cb25f68820fb419e23d11d40188345577ad1059) completed the delayed end-session request; the provider recorded logout-complete after 1.5 seconds. The post-fix browser had a session cookie before Logout, no session cookie after Logout, and revisiting localhost:47616 redirected to /auth/login.

Conversation: The issue reports Firefox aborting Authentik's end-session request and leaving the IdP session active after local logout. It has no comments or linked fix. The configured URL is documented as the post-logout redirect target, and the current menu handler performs a full-window assignment as soon as local signOut resolves. This is navigation to the IdP, rather than a return navigation to Homarr; source inspection alone cannot prove whether the provider request is aborted, so runtime tracing is required before calling it an addressed or remaining bug.

Remaining limits: The real Authentik end-session endpoint was unavailable; the controlled delayed provider proves the browser sequencing and local-session contract.

**Requires the local fixes to land in release/v2 before claiming this release resolution.**

Checks:

- On homarr:v2-issue-triage-439b2082, a local OIDC authorization-code login completed in the browser and reached the authenticated dashboard.
- The actual account-menu Logout control was clicked with a delayed local OIDC /end-session response (1.5 seconds); the browser landed at /auth/login.
- The provider recorded /end-session, logout-start, logout-aborted, and logout-connection-closed-before-end about 8 ms after the request; logout-complete was absent.
- The same actual account-menu probe on homarr:v2-triage-final-candidate (sha256:47d853a87ff0e37657f1494477801de9e3adcdb1f06c8409cbc5830d860fb001) reproduced the abort on fresh port 47613.
- The post-fix homarr:v2-triage-logout-fix image (sha256:8da60640d9ae676dd1b2d59a1cb25f68820fb419e23d11d40188345577ad1059) completed the delayed end-session request; the provider recorded logout-complete after 1.5 seconds.
- The post-fix browser had a session cookie before Logout, no session cookie after Logout, and revisiting localhost:47616 redirected to /auth/login.

Evidence: [auth/results.json](auth/results.json).

## [#6849](https://github.com/homarr-labs/homarr/issues/6849) — bug: I can't switch between the dark and light themes

**needs-verification · none-established · confidence: medium**

A pointerdown/mousedown-only dispatch left the light scheme unchanged, matching the reported missing-release failure shape. Keyboard fallback on the visible theme combobox trigger moved the active option to Light and changed the scheme to light.

Conversation: The reporter says the profile theme control is inert across Edge and Firefox on an Ubuntu/Portainer/LDAP deployment. The timeline has no direct comments; #6823 identifies it as the same incident and later isolates the failure to Citrix VDI pointer events. Treat this issue as the duplicate environment report and keep it pending a controlled reproduction.

Remaining limits: The original Edge/Firefox, Ubuntu/Portainer/LDAP, and persisted migrated-user environments were unavailable.
This does not prove behavior in the reporter's Citrix VDI or across separate browser profiles.

Checks:

- Logged in to the pinned image with Chromium and opened the profile theme selector.
- A complete pointer sequence (pointerdown, mousedown, pointerup, mouseup, click) changed the document scheme from dark to light.
- A pointerdown/mousedown-only dispatch left the light scheme unchanged, matching the reported missing-release failure shape.
- Keyboard fallback on the visible theme combobox trigger moved the active option to Light and changed the scheme to light.

Evidence: [browser/results.json](browser/results.json).

## [#6847](https://github.com/homarr-labs/homarr/issues/6847) — feat(plex): media releases widget should list newly added episodes, not seasons

**not-addressed · none-established · confidence: high**

The Plex media-releases integration still fetches /library/recentlyAdded, which returns season records and cannot surface new episodes added to an existing season. The proposed episode endpoint PR is open and not in v2.

Conversation: The requester demonstrates that Plex episode records have newer addedAt timestamps while Homarr's recentlyAdded response contains older season records. They propose querying the show-library episode endpoint, mapping SxxExx details, and using addedAt instead of originallyAvailableAt for recently-added semantics. Related historical issues are listed. PR #6848 proposes this change but is open/unmerged and has no v2 ancestor.

Remaining limits: Query show-library episodes (or a Plex recently-added episode hub), sort by addedAt, map grandparent/season/episode/title, and cover grouping/fallback behavior. Update tests and preserve token/auth handling.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6847.

## [#6830](https://github.com/homarr-labs/homarr/issues/6830) — bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't)

**addressed · full · confidence: high**

The WUD v9 integration now uses authenticated /api/containers requests and the merged v2 PR #6831 explicitly fixes the connection-test/widget data-path mismatch.

Conversation: The reporter showed that WUD v9 Basic Auth connection testing succeeds while the widget data request fails, despite curl returning /api/containers. Another user reproduced it. The maintainer said it was fixed on the v2 beta and would release alongside v2; PR #6831 is merged into release/v2.

Remaining limits: Confirm with a live WUD 9 instance if desired, but the merged v2 implementation addresses the reported mismatch and will be fixed with v2.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6830.

## [#6823](https://github.com/homarr-labs/homarr/issues/6823) — bug:

**needs-verification · none-established · confidence: medium**

Simulated the Citrix-shaped missing pointerup/click sequence and verified that it does not commit a theme change by itself. Exercised the keyboard combobox fallback after the incomplete pointer sequence.

Conversation: The reporter says theme selection has failed across several Homarr versions and browsers for a migrated user. Maintainers could not reproduce it on normal systems. The reporter then isolated it to Citrix virtual desktops and observed pointerdown/mousedown without mouseup/click; the same VDI event issue affects board-user permission changes. #6849 is a duplicate. This points to a browser/event-environment problem rather than proof that the theme state manager is broken.

Remaining limits: No real Citrix VDI session was available; synthetic event dispatch is not Citrix input proof.
The issue also mentions permission controls; only the theme control was exercised.
Firefox and Edge were not installed in the container.

Checks:

- Exercised the same profile theme control with complete Chromium pointer events.
- Simulated the Citrix-shaped missing pointerup/click sequence and verified that it does not commit a theme change by itself.
- Exercised the keyboard combobox fallback after the incomplete pointer sequence.

Evidence: [browser/results.json](browser/results.json).

## [#6811](https://github.com/homarr-labs/homarr/issues/6811) — bug: Annoying scroll bar

**needs-verification · none-established · confidence: medium**

Measured the header at 390x768 and checked document/body horizontal geometry and descendant overflow. Checked the header after normal board hydration with the banner absent.

Conversation: The complete body and both comments were read. The report is a low-impact Chrome-only observation from Homarr 1.77 with a screenshot, and says the bars remain after dismissing the version banner. The maintainer says the announcement banner will be removed in a later release and also notes only Firefox was tested. The saved crop visibly contains a vertical bar at the right and a horizontal bar along the bottom, but image evidence cannot determine whether the page or a header descendant owns either scroller. Current release/v2 CSS hides overflow on the outer header while desktop and mobile zones still set overflow-x:auto. No browser runtime check was performed, so source inspection cannot determine whether the exact bars persist after the banner is gone.

Remaining limits: The historical v1.77 Chrome build and its exact banner state were not available.
No real Chrome version/OS combination from the report was available beyond the bundled Chromium engine.

Checks:

- Measured the current header at 1377x768, matching the historical screenshot width.
- Measured the header at 390x768 and checked document/body horizontal geometry and descendant overflow.
- Checked the header after normal board hydration with the banner absent.

Evidence: [browser/results.json](browser/results.json).

## [#6807](https://github.com/homarr-labs/homarr/issues/6807) — bug: MCP tools/list fails on invite_createInvite z.date() schema

**addressed · full · confidence: high**

V2 exposes the invite expiration as an ISO string schema and converts it to Date only at persistence, making tools/list JSON-compatible.

Conversation: No comments were present. The issue reports MCP tools/list failing while converting invite_createInvite's z.date schema. The merged v2 invitation-schema fix changes the public input to an ISO datetime string and current MCP tests cover timestamp conversion/validation.

Remaining limits: No remaining gap for the reported tools/list failure. Verify a live MCP tools/list and invite call after deployment if protocol/client versions differ.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6807.

## [#6803](https://github.com/homarr-labs/homarr/issues/6803) — feat: Add support for Unraid Storage Pools

**not-addressed · none-established · confidence: high**

V2's Unraid GraphQL query and schema still cover array disks only; they do not request or map array caches/storage pools.

Conversation: No comments were present. The request specifies the Unraid GraphQL caches fields (id, name, device, size, status, temp, fsSize, fsFree, fsUsed, type, isSpinning) and asks for array plus pool/pool-only support while tolerating null filesystem fields. Cross-reference #5538 is a related missing-data bug, not evidence of a v2 implementation.

Remaining limits: Add version-tolerant GraphQL caches/pools query fields and nullable schema/mapping, then render and test array, cache-only, and null filesystem cases. Do not close this from the #5538 reference.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6803.

## [#6764](https://github.com/homarr-labs/homarr/issues/6764) — aria2 integration: torrents never report 'seeding' state, always 'leeching'

**not-addressed · none-established · confidence: high**

V2 still maps every active torrent to leeching. Aria2Download exposes totalLength and completedLength, and the integration already calculates progress from those fields, but getTorrentState receives only the status and returns leeching unconditionally for active. It never checks whether completedLength equals totalLength or uses the seeder flag to report seeding.

Conversation: The issue identifies the exact mapping defect and proposes comparing completedLength and totalLength for active torrents. There are no comments or linked PRs. Current V2 source retains the same active-to-leeching branch even though the needed lengths are available in the fetched record, so the reported state bug remains.

Remaining limits: Pass completion/seeder information into torrent state mapping, return seeding for fully downloaded active torrents, and add focused regression coverage for active, queued, complete, paused, and incomplete cases.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6764.

## [#6763](https://github.com/homarr-labs/homarr/issues/6763) — bug: Unable to add users/group to board access control when using OIDC via Authentik

**addressed · full · confidence: high**

V2 separates board access permissions from the general board-settings form and submits user/group permissions through dedicated mutations. This removes the nested/unified-form reset path reported with Authentik and Pocket ID.

Conversation: The reporter says adding an OIDC user or group to board access control appears to save and then resets without a database change. A second comment reports the same behavior with Pocket ID. The maintainer says it is fixed as part of v2 and points to #6662; the timeline records the fix relationship. The exact PR commit is not the current ancestor, but the current v2 source has the relevant independent access form and mutation structure.

Remaining limits: No source gap remains for the reported form-reset behavior. If the issue was forgotten open, mention it as fixed with v2; a future report should include provider claim shape or a mutation error if access persistence fails after this separation.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6763.

## [#6761](https://github.com/homarr-labs/homarr/issues/6761) — bug: App Management Breaks w/o Modify All Boards Permission

**addressed · full · confidence: high**

Release/v2 derives app-management page access from app permissions, so a user with app-create or app-modify-all no longer needs the unrelated board-modify-all permission to load /manage/apps.

Conversation: The complete body and zero comments were read. The report says users who can create/use/modify apps receive Not Found unless they are also granted Modify All Boards, and the workaround over-scopes access. Current page code calls getAppsSectionAccess and only gates on its returned app access; the helper delegates to app permissions, with app-create or app-modify-all satisfying canAccess. The manage layout uses the same app-specific section access. This source path removes the board permission dependency described by the report. No runtime permission matrix was exercised in this source-only review.

Remaining limits: Verify release/v2 with users holding each supported app permission combination and no board-modify-all permission, including direct navigation and management navigation visibility. Confirm unrelated app API actions still enforce their own permissions.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6761.

## [#6745](https://github.com/homarr-labs/homarr/issues/6745) — bug: Unraid health widget reports RAM in GiB approximately 1024x too small

**addressed · full · confidence: high**

Release/v2 computes Unraid memory usage from the byte-valued metrics total minus available, matching the correction requested for the roughly 1024x-too-small RAM ring.

Conversation: The complete body and zero comments were read. The report compares an Unraid 7.3.2 memory total with Homarr 1.76.1 showing approximately 1024 times less RAM and proposes calculating used memory as total minus available. Current release/v2 uses `systemInfo.metrics.memory.total` and `available`, clamps the subtraction at zero, and returns those byte values to the health widget. The GraphQL query requests the metrics fields directly and the schema validates non-negative numeric values. Merged PR #6781 is recorded as a release/v2 ancestor. This is source evidence for the correction; no live Unraid payload or release image was run during triage.

Remaining limits: Feed an actual Unraid 7.3.2 response through a release/v2 deployment and confirm the rendered GiB value. No runtime image or browser check was performed in this source-only review.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6745.

## [#6728](https://github.com/homarr-labs/homarr/issues/6728) — feat: Ping health-check timeout is hardcoded and too short for slower endpoints

**not-addressed · none-established · confidence: high**

App health checks still use the shared hardcoded 10-second HTTP timeout without a per-app or global setting, so slow but healthy endpoints remain unable to configure a longer wait.

Conversation: The requester reports a Nextcloud AIO endpoint taking 7–8 seconds and being marked down, asks for per-app/global configurability or a longer default, and includes the AbortError. There are no comments or a linked fix. The current call chain confirms the timeout has no exposed override.

Remaining limits: Add a validated per-app or global health-check timeout and document the trade-off, or raise the default after measuring impact. Preserve abort/error reporting and add coverage for endpoints just beyond the default.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6728.

## [#6712](https://github.com/homarr-labs/homarr/issues/6712) — bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password

**addressed · full · confidence: high**

V2 sends HTTP Basic authentication for both WUD connection tests and container data requests.

Conversation: No comments were present. The report says WUD protected by username/password fails despite the service working without auth. Merged v2 PR #6831 adds the auth header to both relevant paths and validates the WUD containers response.

Remaining limits: Verify against WUD 9 and a reverse proxy that requires Basic auth, including invalid-credential error handling. Source evidence confirms the requested auth path is present.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6712.

## [#6697](https://github.com/homarr-labs/homarr/issues/6697) — feat: Use Tb / Gb for UNRAID Integration

**addressed · full · confidence: high**

V2 defaults to decimal KB/MB/GB/TB units and lets each user select binary KiB/MiB/GiB/TiB when desired.

Conversation: No comments were present. The request asks Unraid values to match the UI's decimal TB/GB labels instead of binary TiB/GiB. V2's shared formatter changed the default to decimal and exposes an explicit per-user unit-system setting used by health widgets.

Remaining limits: Users who choose binary units will still see GiB/TiB by design. Verify the default setting in an upgraded installation and confirm the reported Unraid panel uses the shared formatter.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6697.

## [#6682](https://github.com/homarr-labs/homarr/issues/6682) — bug: Immich integration stops working after the latest update

**addressed · full · confidence: high**

The reviewed V2 request layer preserves SDK headers, including x-api-key, rather than object-spreading a Headers instance. The conversation also records the 1.76.0 Immich regression as fixed in 1.76.1; current source supports this as a V2 fix candidate.

Conversation: The reporter saw an unknown integration error after upgrading to 1.76.0 and said regenerating the API key did not help. The single comment says the problem was fixed in 1.76.1. Current V2 forwards fetch options without replacing caller headers. The separately identified dev fix commit 31e218295 is not an ancestor of this V2 checkout and must not be used as ancestry evidence.

Remaining limits: No code gap remains for the reported 1.76.0 API-key regression. If the issue remains open, mention it as fixed in v2; a different current Immich error would need a new request payload/version reproduction.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6682.

## [#6681](https://github.com/homarr-labs/homarr/issues/6681) — bug: Immich Integration show as working, zero results.

**addressed · full · confidence: high**

The Immich integration now builds authenticated SDK request options for album and asset calls; the issue conversation also records the album 401 as fixed in version 1.76.1, which predates release/v2.

Conversation: The reporter gave a reproducible album-list/detail 401 while ping and direct curl with the same API key succeeded, making the album carousel unusable. The only follow-up states that it was fixed with version 1.76.1. Current release/v2 is later and the integration code carries the API key into its SDK request options.

Remaining limits: Run a live Immich album-carousel smoke check against a current Immich server if release confidence is required; no source-level gap remains for the reported unauthenticated album calls.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6681.

## [#6677](https://github.com/homarr-labs/homarr/issues/6677) — feat: save state of accordion in system health monitor

**not-addressed · none-established · confidence: high**

The Proxmox cluster accordion state in V2 is held only in React component state. It is keyed by display mode and visible-section scope, so toggles survive ordinary rerenders within the mounted widget and do not leak between compact/advanced configurations. The state is initialized from defaults on mount and is never written to localStorage, sessionStorage, the board, or an API, so a page refresh/remount resets the expanded sections.

Conversation: The issue asks the system-health monitor to remember expanded Proxmox VM/LXC sections across reloads. It has no comments or linked implementation. The current source has a controlled Accordion and a useful per-scope in-memory map, but no persistence layer. That is a local interaction state improvement, not the requested reload persistence.

Remaining limits: Persist expanded values with a stable per-widget/per-integration key, restore valid values after configuration changes, and verify privacy/storage behavior across board reloads and multiple health widgets.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6677.

## [#6671](https://github.com/homarr-labs/homarr/issues/6671) — bug: Weather widget not displaying data

**addressed · full · confidence: high**

V2 handles the intentional NO_EXTERNAL_CONNECTION case explicitly and includes the merged weather fix for disabled external connections.

Conversation: All three comments were read. The maintainer identified NO_EXTERNAL_CONNECTION=true and proposed #6674. The reporter confirmed they had enabled that flag and, after re-adding the widget, saw the clear outbound-connections-disabled message. Replacement fix #6780 is merged into V2. This resolves the misleading setup/error state, not a promise to fetch weather while outbound requests are disabled.

Remaining limits: If outbound connections are enabled and a real location still returns no data, collect the provider response separately. Under NO_EXTERNAL_CONNECTION=true, no weather data is expected and the explanation is now explicit.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6671.

## [#6644](https://github.com/homarr-labs/homarr/issues/6644) — feat: add GPU charts to Beszel System Stats widget

**not-addressed · none-established · confidence: high**

Beszel data types include GPU metrics and another grid widget shows an aggregate GPU value, but the Beszel System Stats historical chart widget still has no GPU option or GPU panels.

Conversation: The request defines initial GPU utilization, used VRAM, power draw, and multi-GPU support, with temperature deferred until a historical field is confirmed. A comment says the initial scope is implemented in #6645, but that PR is still open and not an ancestor of v2. A later comment also requests disk temperature, which remains a follow-up. The current v2 System Stats UI therefore cannot be credited from the unmerged PR.

Remaining limits: Merge or reimplement the GPU utilization/VRAM/power/multi-GPU historical panels in System Stats, confirm the historical GPU temperature source, and decide separately on disk temperature. Do not treat aggregate grid GPU display or Custom Widgets as native completion.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6644.

## [#6643](https://github.com/homarr-labs/homarr/issues/6643) — feat: Allow reordering boards in the board switcher

**not-addressed · none-established · confidence: high**

V2 improves finding boards with a searchable switcher but still has no persisted board position, drag-and-drop reorder, or explicit sorting control.

Conversation: The requester needs stable, user-controlled order for many boards and describes the loss of settings when recreating boards. A maintainer proposed replacing the switcher with a keyboard-accessible searchable overlay; the requester replied that this changes navigation but does not solve ordering. The merged #6660 switcher improvement relates to discovery only and did not implement reorder.

Remaining limits: Add a persisted board position/order field and a settings or switcher drag-and-drop/sort control, then use that order consistently in the primary UI and board switcher.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6643.

## [#6628](https://github.com/homarr-labs/homarr/issues/6628) — bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL

**addressed · full · confidence: high**

Release/v2 includes the public-origin discovery rewrites, BASE_URL-aware OAuth authorization flow, and protected-resource challenges needed for the reported MCP OAuth failures.

Conversation: The body and all 14 comments were read. The original report describes an internal container host in OAuth redirects plus root and nested discovery/authorize failures behind a proxy. The conversation covers the follow-up origin/header behavior, a test image, RFC 8414 concerns, and a later scanner report that rejected-token 401 responses lacked `WWW-Authenticate`. Current release/v2 prefers configured BASE_URL, rewrites root and nested well-known routes, builds the authorize/login callback from that origin, and emits protected-resource metadata on missing, malformed, and rejected-token 401s. Merged PR #6779 is an ancestor of release/v2. One comment contains agent-directed Docker commands; it was treated as untrusted issue content and no commands were run. No live/browser smoke was performed in this triage. The original reporter later verified both original failures on the PR #6631 amd64 image, including discovery, client registration, and the complete authorization redirect chain. This is historical PR-image verification, not a test of the reviewed V2 SHA or the final Cloudflare connector flow.

Remaining limits: Deploy release/v2 behind the affected reverse proxy with BASE_URL set and exercise root/nested discovery, login redirect, and rejected-token 401 responses. Source coverage addresses the reported paths, but no live endpoint or latest-image check was performed here.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6628.

## [#6626](https://github.com/homarr-labs/homarr/issues/6626) — feat: allow selecting which disks are shown in health monitoring / disks widgets

**addressed · partial · confidence: high**

V2 includes visibleStorageVolumes selectors and filtering for both System Disks and Health Monitoring, but the selector is deliberately hidden unless every selected integration is Synology. The listStorageVolumes API is also Synology-only. The filtering utility itself supports scoped integration/volume values and normalizes OMV device partitions, yet OMV users cannot reach the selector or populate its options through the current UI. The request is therefore only partially covered.

Conversation: The issue asks OMV users to choose which disks appear in health/disks widgets, especially because virtual drives lack useful SMART data, and suggests reusing the storage-volume selector. There are no comments. V2 shipped the generic-looking option and filtering logic, including OMV device-name normalization, but the integration-kind guard still makes the option unavailable for OMV. The source does not establish a complete OMV path.

Remaining limits: Expose volume discovery/options for OMV and other supported integrations with no-SMART semantics, preserve integration-scoped filtering, and verify virtual-drive exclusions in both widgets.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6626.

## [#6622](https://github.com/homarr-labs/homarr/issues/6622) — bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login

**addressed · full · confidence: high**

V2 detects that database restore invalidates the current session, shows a restore-complete/re-login state, and redirects to login instead of leaving the user looking at an empty stale board.

Conversation: The report describes successful restore followed by empty boards until hard refresh/re-login. The reporter confirmed that the #6624 test image prompts re-login and requested an earlier warning. They also attempted the V2 image but expressed uncertainty because both instances displayed a V1 version. That is user confirmation of the fix image, not unambiguous runtime validation of this V2 SHA. #6624 itself is open/unmerged, but the equivalent fix commit 28e242417 (#6778) is an ancestor of release/v2.

Remaining limits: Add the reporter's suggested warning before accepting the backup file if desired. The reported stale/empty-board core is handled by forced re-login in v2.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6622.

## [#6620](https://github.com/homarr-labs/homarr/issues/6620) — bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0

**needs-verification · none-established · confidence: medium**

Repeated a full dashboard reload after the board was populated and sampled visible loaders until the release widget rendered. Distinguished Mantine Loader nodes from skeleton-class nodes.

Conversation: The issue reports a reproducible skeleton flash on every dashboard refresh after v1.75, while v1.74 did not show it. The maintainer says the behavior was an intentional optimization while the browser computes layout and that v2 uses a different system. No comment claims a v2 fix or provides a current reproduction. This makes source comparison useful but insufficient to label the browser-visible timing issue resolved.

Remaining limits: No v1.74/v1.75 image pair or slow upstream network was available for a historical regression comparison.
The current check establishes v2 refresh behavior only; it does not prove the old skeleton flash was impossible in the reported deployment.

Checks:

- Installed a pre-navigation loading observer in a fresh browser session, logged in, and captured initial board hydration.
- Repeated a full dashboard reload after the board was populated and sampled visible loaders until the release widget rendered.
- Distinguished Mantine Loader nodes from skeleton-class nodes.

Evidence: [browser/results.json](browser/results.json).

## [#6614](https://github.com/homarr-labs/homarr/issues/6614) — feat: Add Quven integration

**not-addressed · none-established · confidence: high**

V2 has no Quven integration, definition, native widget, or registered client. The explicit integration exports and widget registry contain no Quven module. A Custom Widget can call an external API for a particular Quven deployment, as the issue discussion suggests, but that is generic extensibility and does not provide native server status, users, media/library data, authentication, or onboarding.

Conversation: The issue requests a Quven self-hosted media-server integration showing server status, users, media, and library information. The sole comment notes that Quven is new and recommends trying V2 Custom Widgets or building an integration. No comment or timeline entry records a native implementation, and no source evidence shows one in the release/v2 tree.

Remaining limits: Add a native Quven API/auth integration and matching widgets for the requested server, user, media, and library data, or document a bounded Custom Widget recipe once Quven's API is stable.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6614.

## [#6608](https://github.com/homarr-labs/homarr/issues/6608) — bug: Integration page accessible without board-modify-all permission

**addressed · full · confidence: high**

V2 gates the integrations management page with a dedicated integration-management permission and filters the server-provided integration list to what the user may manage.

Conversation: The report says users without board-modify-all could open the integration management page. The issue references #6509. Merged PR #6612 introduces getIntegrationManagementAccess, uses it for the page, and explicitly closes #6608; its merge commit is an ancestor of release/v2.

Remaining limits: Test the page with each relevant delegated/global permission in a browser, but the route guard and merged v2 fix directly address the report.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6608.

## [#6600](https://github.com/homarr-labs/homarr/issues/6600) — 🚀 Homarr v2 public beta is here! Join the testing

**addressed · partial · confidence: high**

V2 addresses many beta feedback items, but the umbrella conversation contains several unresolved or unverified subtopics that must remain separate.

Conversation: All 29 comments were read and split into subtopics. Addressed or substantially improved: login branding/background support, Header Studio/personal icon control, Beszel text scaling, bookmark density/compactness, migration guidance, world clocks in advanced Clock mode, and bounded performance work. Still unresolved or needing verification: repeated public demo login failures (the seed code can preserve an already altered account, but the live cause is unverified), compact-mode world-clock expectations, provider-specific Media Releases failures, direct Docker start/stop/pause affordances, final Bookmark title visibility/font-size controls (PR #6852 is open and unmerged), ultrawide max-column/centering behavior, and broad memory/performance endurance.

Remaining limits: Keep this umbrella partial. Track each outstanding item independently: (1) run the real public demo repeatedly and make seed/reset behavior deterministic; (2) verify world clocks in compact versus Advanced Clock modes; (3) reproduce Media Releases with the reporter's provider and inspect logs; (4) decide whether direct Docker controls need prominent buttons and add pause if required; (5) do not count open PR #6852 as present for bookmark title toggle/size; (6) verify ultrawide layout centering/max columns; and (7) run a long performance/memory soak.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6600.

## [#6593](https://github.com/homarr-labs/homarr/issues/6593) — bug: Pi-hole v6 / Plex integrations send unauthenticated periodic health-check requests, causing real 401s

**not-addressed · none-established · confidence: high**

The Pi-hole integration still performs an unauthenticated v6 capability probe against /api/info/version while the widget uses an authenticated flow. That exact periodic 401 pattern remains in v2; Plex's analogous root-probe path also needs investigation.

Conversation: The report observes repeated unauthenticated requests and 401s for Pi-hole v6 and Plex despite working authenticated widgets, asking for the health check to use credentials or stop probing. The issue distinguishes connection tests from widget requests. No comments or linked fix establish that the v2 branch removed these probes.

Remaining limits: Remove unauthenticated capability probes or supply the configured credentials, and use a bounded authenticated health check. Trace the Plex factory/periodic path separately so both reported integrations stop generating expected 401 noise without masking real auth failures.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6593.

## [#6589](https://github.com/homarr-labs/homarr/issues/6589) — feat: 2 separate widgets for 2 separate docker instances

**addressed · full · confidence: high**

V2 supports multiple named Docker/Podman endpoints and lets each Docker Containers widget select endpoint IDs independently. The widget passes its selected IDs to getContainers, and its totals reduce only the returned containers, so two widgets can show separate host totals. Empty selection intentionally means all endpoints. Endpoint creation/configuration remains an environment or setup concern, and a widget option alone does not add a GUI endpoint manager.

Conversation: The issue reports two Docker instances configured through comma-separated legacy host/port variables and asks for separate totals in separate widgets. The discussion initially focuses on whether v2 can connect to multiple services; later testers confirm named endpoint JSON/settings work, while the reporter clarifies that the important requirement is distinct widget totals. V2 source directly covers that distinction: endpointIds are a per-widget option and the totals are calculated from the filtered result. This addresses the issue's widget behavior; the separate historical GUI endpoint-creation request (#3266) is outside this issue.

Remaining limits: If users need endpoint creation entirely through the GUI, that is a separate feature; retain clear setup documentation and verify partial endpoint failures and endpoint-specific actions in deployment.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6589.

## [#6559](https://github.com/homarr-labs/homarr/issues/6559) — bug: Releases widget showing "Only the first 1000 results are available" error

**addressed · full · confidence: high**

The parent pagination patch, mounted read-only over the same source path, retained the first 1000 releases and selected v1001 after the page-11 422. The fixed run preserved the normal 1001-release result and repository-details request contract.

Conversation: The body and sole comment were read. The saved configuration screenshot identifies the GitHub provider, repository `home-assistant/home-assistant`, default `https://api.github.com`, and no filter; the comment says the bug still occurs in 1.76.2. Current release/v2 code obtains releases with Octokit `api.paginate` over `repos.listReleases`, then fetches repository details directly with `repos.get`. The direct details call rules out a current search endpoint in this path, while unbounded release pagination could still encounter a provider-side 1000-result cap. Source inspection therefore shows an improvement but cannot prove the configured repository no longer fails.

Remaining limits: Local pagination fix must land in release/v2. Provider-capped historical releases remain unavailable; ordinary API errors still propagate. Five new regression cases plus nine existing tests passed.

**Requires the local fixes to land in release/v2 before claiming this release resolution.**

Checks:

- Pinned pre-fix source fetched all 1001 synthetic releases and selected v1001.
- Pinned pre-fix source fetched pages 1-10, received the controlled page-11 422, and returned error code unexpected.
- The parent pagination patch, mounted read-only over the same source path, retained the first 1000 releases and selected v1001 after the page-11 422.
- The fixed run preserved the normal 1001-release result and repository-details request contract.

Evidence: [integrations/results.json](integrations/results.json).

## [#6543](https://github.com/homarr-labs/homarr/issues/6543) — Upgrade to MCP v2 (spec 2026-07-28)

**addressed · partial · confidence: high**

The SDK and stateless MCP transport upgrade are present, including tool-list cache hints and compatibility tests. The issue also proposes OAuth metadata/CIMD work and documentation/Assistant validation; those are not all demonstrated by the transport implementation.

Conversation: The issue has no comments. Its proposed scope includes the SDK/stateless handler migration, method/name headers and cache hints, evaluating CIMD/pre-registered clients and metadata, updating protocol documentation, and verifying Assistant compatibility. V2 implements the transport and SDK portion; this does not establish completion of the whole checklist.

Remaining limits: Record the OAuth/CIMD evaluation and any consciously deferred scope, align authorization-server metadata and cache documentation, and verify the built-in Assistant and external-client compatibility before treating the full proposal as complete. DCR retention alone is not a claim of protocol noncompliance.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6543.

## [#6519](https://github.com/homarr-labs/homarr/issues/6519) — bug: RSS widget poster images don't load for reddit feeds

**not-addressed · none-established · confidence: high**

The RSS parser still does not inspect media:thumbnail and its regex fallback truncates image URLs at the file extension, dropping signed query parameters. Reddit poster images can therefore remain absent or return 403 in v2.

Conversation: The reporter identifies Reddit's media:thumbnail image field and explains that Homarr's fallback removes query parameters from the signed URL. There are no comments. The current parser only checks enclosure and media:content, then applies the truncating regex, while both compact and advanced RSS displays consume the resulting enclosure.

Remaining limits: Support media:thumbnail and preserve the complete validated URL, including query parameters and fragments where safe. Add fixtures for Reddit-style signed URLs and verify both compact and advanced poster rendering.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6519.

## [#6516](https://github.com/homarr-labs/homarr/issues/6516) — bug: mysql migration error

**not-addressed · none-established · confidence: high**

The original MySQL/MariaDB migration syntax failure is not fixed in place. V2 retires MySQL, removes its migration path, rejects MySQL/MariaDB startup, and offers a separately documented conversion to SQLite. The converter is a migration workaround and does not make the reported broken MySQL migration succeed.

Conversation: The reporter's MariaDB startup failed on a migration containing a LEFT JOIN LATERAL syntax error and asked to retain MySQL/PostgreSQL for a swarm deployment. Three comments discuss investigating migrations, recommending SQLite, and the final v2 direction of keeping PostgreSQL while dropping MySQL. The v2 timeline contains the retirement/conversion work, not a repair of the failing MariaDB migration.

Remaining limits: For the original issue, either keep it as a known v1 migration defect or document the tested conversion route as the v2 migration path. Do not claim the MySQL error is fixed: MySQL is retired, and conversion succeeds only for supported v1.77.1-shaped databases.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6516.

## [#6513](https://github.com/homarr-labs/homarr/issues/6513) — feat: Windows-style board switcher overlay (Alt-Tab style) when cycling boards

**addressed · partial · confidence: high**

V2 provides a searchable keyboard-opened board switcher with arrow/Enter navigation and previews, but it does not implement the requested hold-modifier/release-to-commit Alt-Tab overlay semantics.

Conversation: The request specifies an overlay while holding a modifier, cycling boards with Tab/arrows, committing on release, and cancelling with Escape. The implemented follow-up #6660 changed the switcher to a searchable gallery opened with Shift+C; #6393 explicitly says the Windows-style Alt-Tab overlay is out of scope for its keybind work. Thus the current experience addresses board discovery/navigation but not the interaction contract requested here.

Remaining limits: Implement the requested modifier-held overlay if that interaction remains desired: cycle on Tab/arrows, select on modifier release, and cancel on Escape. The current Shift+C searchable modal is a usable partial substitute but does not provide those semantics.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6513.

## [#6438](https://github.com/homarr-labs/homarr/issues/6438) — bug: OOM with 1.71.0

**needs-verification · none-established · confidence: medium**

12 fresh credentials sessions x 20 cycles completed 240 WUD/Beszel cycles and 996 Beszel fixture requests without OOM or restart. Source-class process samples measured RSS and V8 heap while 12 repeated Beszel sessions completed.

Conversation: The body and all four comments were read. The report describes Homarr reaching its 1.5 GB limit while a dashboard combines Docker data with Beszel Live data, and later discussion mentions desktop/mobile use and multiple live views. The conversation never isolates a reproducible leak or confirms a post-fix retest. Merged PR #6448 is a release/v2 ancestor and its current source closes the Beszel SSE response/agent on disconnect, bounds pending events, and trims the one-minute client buffer. Those changes address a credible live-subscription growth path, while the broader process OOM and other widgets remain unproven.

Parent reconciliation: Controlled subset passed; no causal fix for the reported memory failure was established. Agent partial describes test coverage, not a resolved requirement.

Remaining limits: The fixture has one small system and one small Docker record; it does not exercise the reporter's real Docker daemon, multiple dashboards/tabs, mobile clients, live SSE views, or the other widgets in the OOM report.
The 51-second bounded run cannot establish behavior over the reported multi-hour or multi-day workload; repeat with the reporter's dashboard and workload if production confirmation is required.

Checks:

- Fresh pinned runtime started healthy with a 1536 MiB memory limit and equal memory-swap limit.
- WUD synthetic Docker endpoint returned two containers and one available update through the real tRPC widget route.
- Beszel synthetic endpoint returned one system plus one system-stat and one Docker-container-stat record through the real tRPC routes.
- 12 fresh credentials sessions x 20 cycles completed 240 WUD/Beszel cycles and 996 Beszel fixture requests without OOM or restart.
- Source-class process samples measured RSS and V8 heap while 12 repeated Beszel sessions completed.

Evidence: [integrations/results.json](integrations/results.json).

## [#6435](https://github.com/homarr-labs/homarr/issues/6435) — feat: Expand Homarr API Coverage to Support Full Dashboard Automation

**addressed · partial · confidence: high**

V2 exposes useful board CRUD/settings and board-item creation plus a broad MCP tool surface, but it does not provide the full declarative REST/OpenAPI coverage required for Terraform-style dashboard automation.

Conversation: The issue requests complete automation: board/section/layout/item CRUD and geometry, integrations, search engines, users/API keys, import/export, and bootstrap-safe authentication. Follow-up discussion specifically notes that board settings are write-only, tiles are create-only, and groups/integrations are missing. The linked REST expansion PR #6546 is still unmerged, so it cannot be credited. MCP #5882 is merged, but the issue's REST/IaC contract remains broader than MCP availability.

Remaining limits: Add round-trip REST/OpenAPI endpoints for settings, sections, layouts, and every item geometry/update/delete operation, then cover integrations, groups/containers, search engines, users/API keys, import/export, and bootstrap/auth semantics. Publish the schemas and permission behavior for Terraform/Ansible clients.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6435.

## [#6403](https://github.com/homarr-labs/homarr/issues/6403) — feat: Dynamic apps fetched from reverse proxy

**not-addressed · none-established · confidence: high**

V2 has no Caddy integration or dynamic reverse-proxy-to-app-tile pipeline. The native reverse-proxy support is Traefik, whose widget aggregates router/service/middleware health and counts from configured integrations; it does not create or update board app items. No package exposes a reverse-proxy discovery result as dashboard apps, and no Caddy client is registered.

Conversation: The issue asks Homarr to fetch services and exposed/internal hosts from a Caddy API, then dynamically create or filter app entries, with custom JavaScript as a possible extension. The discussion considers middleware and mobile/category layout concerns; the reporter later drops implementation interest because of those separate layout problems, but the feature request remains. No linked PR or comment claims that a dynamic app source shipped.

Remaining limits: Add a Caddy/reverse-proxy discovery contract, map stable hosts and metadata to explicit board app items or a safe managed collection, and define refresh, filtering, credentials, and mobile/layout behavior.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6403.

## [#6392](https://github.com/homarr-labs/homarr/issues/6392) — feat: Switch Board via keyboard shortcut

**addressed · partial · confidence: high**

Release/v2 offers a Shift+C board-switcher modal with keyboard navigation, but it does not provide the requested global next/previous shortcuts or numbered per-board shortcuts.

Conversation: The issue body and its zero comments were read. The request asks for Ctrl/Cmd+Shift+1,2,... shortcuts and, at minimum, Ctrl/Cmd+Shift+>/< cycling between boards. Timeline PR #6393 describes those shortcuts but targets dev and is not a release/v2 source fix. Current code provides a related Shift+C gallery and arrow navigation only after that modal is open; it does not cycle boards directly from any board and has no persisted per-board shortcut setting. The existing gallery reduces the request, but does not implement the requested shortcut behavior.

Remaining limits: Implement and document guarded global next/previous and numbered or persisted per-board shortcuts, then verify them on release/v2 across typing contexts and board counts.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6392.

## [#6300](https://github.com/homarr-labs/homarr/issues/6300) — bug: Memory leak

**needs-verification · none-established · confidence: low**

The bounded runtime soak exercised repeated authenticated sessions plus WUD and Beszel system/Docker widget routes. No runtime OOM, restart, or unbounded cgroup growth toward the 1.5 GiB limit occurred during the 51-second, 240-cycle fixture run.

Conversation: All five comments were read. The original reporter lists media, download, calendar, weather, Dashdot iframe and Docker widgets, with retention after repeatedly opening/closing tabs. A later ARM64 report documents a multi-day plateau near 1.9 GB and uses Beszel as the external measurement source; that does not establish use of a Beszel live widget. Neither report isolates a subsystem.

Remaining limits: Exercise the reported media, download, calendar, weather, Dashdot iframe, Docker, repeated tab open/close, and mobile paths.
Run a substantially longer browser and real-service endurance profile with post-GC heap snapshots before classifying the umbrella issue as addressed.

Checks:

- The bounded runtime soak exercised repeated authenticated sessions plus WUD and Beszel system/Docker widget routes.
- No runtime OOM, restart, or unbounded cgroup growth toward the 1.5 GiB limit occurred during the 51-second, 240-cycle fixture run.

Evidence: [integrations/results.json](integrations/results.json).

## [#6271](https://github.com/homarr-labs/homarr/issues/6271) — bug: TrueNAS Integration eating up memory on TrueNAS host

**needs-verification · none-established · confidence: medium**

The legacy /websocket fallback returned system.info successfully after JSON-RPC was unavailable. TrueNasIntegration.getSystemInfoAsync completed its concurrent health contract with synthetic filesystem, pool, reporting, and netdata data.

Conversation: The reporter says reconnecting Homarr's TrueNAS integration eventually consumes all host memory and that removing the integration plus a host restart restores normal usage. There are no comments, linked fixes, or diagnostic logs identifying whether the cause is socket churn, an API response leak, or server-side reporting. V2 contains a redesigned/reused client and newer API handling, which is relevant mitigation but not issue-specific proof.

Parent reconciliation: Controlled subset passed; no causal fix for the reported memory failure was established. Agent partial describes test coverage, not a resolved requirement.

Remaining limits: The issue concerns memory consumed by a real TrueNAS 25.10.4 host after reconnects; the synthetic peer cannot measure server-side allocations or reporting implementation behavior.
Run a longer profile against an authorized TrueNAS host with server-side memory telemetry if the original host leak must be confirmed.

Checks:

- Real TrueNasClient completed 120 system.info requests while the fixture forcibly closed JSON-RPC sockets after 45 messages.
- 118 requests returned the expected system payload and two reset errors triggered reconnect behavior; the fixture counted five JSON-RPC connections and two closes.
- The legacy /websocket fallback returned system.info successfully after JSON-RPC was unavailable.
- TrueNasIntegration.getSystemInfoAsync completed its concurrent health contract with synthetic filesystem, pool, reporting, and netdata data.

Evidence: [integrations/results.json](integrations/results.json).

## [#6254](https://github.com/homarr-labs/homarr/issues/6254) — feat: aMule

**not-addressed · none-established · confidence: high**

V2 has no native aMule integration definition, client, creator, widget mapping, or documentation.

Conversation: The issue body and its zero comments were read. The requester links the aMule project, says its built-in API exposes the data, asks for an integration, and says they will not contribute it. The current v2 registry contains many download clients, but no aMule entry or native implementation. A generic app link or Custom Widget could expose a user-specific endpoint, yet it does not provide the requested selectable native integration and widget behavior.

Remaining limits: Add an aMule integration kind, authenticated API client and response contract, relevant widget options/rendering, integration mapping, permissions, and documentation. A generic link or Custom Widget remains a workaround rather than native support.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6254.

## [#6207](https://github.com/homarr-labs/homarr/issues/6207) — bug: Unifi integration not working

**addressed · full · confidence: high**

The UniFi default-port bug is fixed in merged PR #6787, whose ancestor check is true for v2. The integration now tries HTTPS port 443 for bare controller URLs, falls back to 8443 only for connection/detection failures, preserves explicit ports, and leaves authentication failures visible.

Conversation: The reporter used a Dream Router URL without a port and received an SSL wrong-version error. The single issue comment is formatting-related; the timeline links #6210 and #6787. PR #6787 is explicitly the current-v2 port that fixes #6207, and its focused tests cover bare http URLs, 443/8443 fallback, explicit ports, unusual ports, and authentication failures.

Remaining limits: No v2 code gap remains for the reported default-port error. If the issue was forgotten open, mention it as fixed by v2; users still need a local controller account and supported HTTPS endpoint.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6207.

## [#6177](https://github.com/homarr-labs/homarr/issues/6177) — bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion

**needs-verification · none-established · confidence: medium**

Observed the real button transition from enabled to data-loading=true and disabled, with a Mantine Button-loader, then observed the success settlement and restored the value. Checked installed browser binaries; Firefox, Floorp, Chrome, Chromium, and WebKit command paths were not present.

Conversation: The report says red action buttons in Floorp often spin forever without completing. The maintainer asked whether the same happens in Chrome or Safari, but there is no follow-up answer and no browser/version/network trace establishing whether the issue is Homarr, Floorp, or an environment problem.

Remaining limits: Floorp 12.14.2 on Windows 10 was unavailable and cannot be emulated by Chromium.
Upload-image and custom-CSS action buttons were not separately exercised; the check covered a real red settings save action only.

Checks:

- Changed a disposable custom layout value in the live settings form and invoked Save changes in Chromium.
- Observed the real button transition from enabled to data-loading=true and disabled, with a Mantine Button-loader, then observed the success settlement and restored the value.
- Checked installed browser binaries; Firefox, Floorp, Chrome, Chromium, and WebKit command paths were not present.

Evidence: [browser/results.json](browser/results.json).

## [#6155](https://github.com/homarr-labs/homarr/issues/6155) — feat: re-open: Transfer to the existing Dashdot graphs?  #5964

**not-addressed · none-established · confidence: high**

Beszel has its own compact Mantine chart panels, but its values are not routed through the existing Dashdot CommonChart component requested by the follow-up.

Conversation: All 2 comments were read. The original request says Beszel charts consume too much vertical space and look jagged in a compact dashboard, asking to reuse Dashdot's graph rendering. The maintainer asks for a simpler demand because Beszel changed; the reporter clarifies that the feature is done only when Beszel values can be plugged into or viewed within Dashdot graphs. Current v2 improves Beszel's own chart sizing and responsive panel layout, but the implementation remains separate: BeszelStatsView renders BeszelChartPanel, whose chart wrapper configures AreaChart directly, while Dashdot's System Resources widgets import a distinct CommonChart and transform Dashdot-specific history. No adapter or shared renderer accepts Beszel data in the Dashdot path.

Remaining limits: Introduce a shared chart data contract or an explicit Beszel-to-Dashdot adapter, then expose the requested compact renderer while preserving Beszel-specific metrics and units. Beszel's separate responsive charts partially improve compactness but do not satisfy the stated reuse criterion.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6155.

## [#6153](https://github.com/homarr-labs/homarr/issues/6153) — feat: re-open: add open webui  #3766

**addressed · partial · confidence: medium**

V2 has no dedicated Open WebUI integration, but its native Assistant and Assistant widget can chat through a configured OpenAI-compatible endpoint. This covers part of the stated goal of chatting with a local LLM from the dashboard; compatibility with the user's Open WebUI endpoint has not been verified.

Conversation: The reopened issue points to the earlier Open WebUI request #3766/#2082 and asks for local-LLM chat integration. It has no comments. The timeline contains no merged implementation; an Open WebUI integration commit exists on a feature branch but is not an ancestor of v2.

Remaining limits: Test the intended Open WebUI endpoint, authentication, model discovery, streaming and supported tool behavior with Assistant. Decide whether this satisfies the requester before treating it as fully resolved; a dedicated Open WebUI client remains absent.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6153.

## [#6152](https://github.com/homarr-labs/homarr/issues/6152) — feat: re-open: add Wazuh  #3765

**not-addressed · none-established · confidence: high**

V2 has no Wazuh integration, widget, API client, or Wazuh definition. The native integration registry exports many monitoring and security-adjacent services, but neither definitions nor widgets contain Wazuh data types or procedures. A Custom Widget could call an external endpoint for a particular deployment, but it does not provide the requested native dashboard graphs, authentication, or Wazuh-specific data model.

Conversation: The issue reopens an earlier request for a Wazuh SIEM widget. Comments ask for a breakdown, and the reporter requests Wazuh statistics, alert summaries, and Docker/vulnerability graphs arranged alongside calendar/system stats. No comment records implementation or a narrowed accepted feature, and no linked PR is present. The current tree confirms the request remains an integration gap.

Remaining limits: Define the Wazuh API/auth contract and native integration, then add configurable alert, agent, vulnerability, and container/statistics widgets with permission and error handling.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6152.

## [#6050](https://github.com/homarr-labs/homarr/issues/6050) — bug: background image is absent or cut off with white space

**addressed · partial · confidence: medium**

V2 fixes the white-space/cut-off symptom caused by a background covering only content height by giving the AppShell a 100dvh minimum when a background is configured. The separate Firefox report that the image itself was corrupt or truncated cannot be confirmed without the original image URL and browser/network reproduction.

Conversation: The reporter says a Docker Compose deployment on Firefox/Linux shows a background image absent or cut off, with a white area after collapsing content; the single comment asks for more information and no exact image is provided. V2 includes a root-cause fix for the viewport-height void, but the background component still relies on the browser's CSS image load and has no explicit corrupt/truncated-image recovery path.

Remaining limits: Reproduce in Firefox/Linux using the reporter's image and deployment, capture the image response and decode result, and verify both the viewport-height fix and any remaining CDN/proxy/content-type issue.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6050.

## [#6024](https://github.com/homarr-labs/homarr/issues/6024) — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901)

**needs-verification · none-established · confidence: medium**

The real BeszelIntegration class received a 10902-byte synthetic body containing the malformed Unicode escape shape and entered the JSON parser boundary. The observed normalized chain was IntegrationParseError -> ParseError -> Failed to parse json.

Conversation: The issue body and its zero comments were read. The reporter sees a recurring Unicode-escape SyntaxError with low visible impact and suspects an empty Beszel integration, but provides no reproduction or endpoint payload. A later triage PR considered wrapping only Beszel authentication JSON, then removed that narrow change because the report points to collection responses. The current generic integration boundary can normalize JSON parse failures, and Beszel response.json calls run inside it, but that does not establish that the reported parser exception came from JSON.parse or from Beszel. The linked narrow PR is not a release/v2 ancestor, so disposition remains unproven.

Remaining limits: The issue supplied the stack/message but no response body, endpoint, or capture. Obtain the original Beszel response or a live reproduction before attributing the parser failure to an empty integration or a specific collection route.

Checks:

- The real BeszelIntegration class received a 10902-byte synthetic body containing the malformed Unicode escape shape and entered the JSON parser boundary.
- The observed normalized chain was IntegrationParseError -> ParseError -> Failed to parse json.

Evidence: [integrations/results.json](integrations/results.json).

## [#6008](https://github.com/homarr-labs/homarr/issues/6008) — bug: manage/about page fails to load with ECONNREFUSED

**addressed · full · confidence: high**

V2's /manage/about page no longer self-fetches its own HTTP API. It imports static contributor data and calls getDependenciesAsync directly on the server, eliminating the HOSTNAME/loopback path that caused ECONNREFUSED in restricted container networking. A manage-level error boundary also catches future management-page failures with a retry surface. The linked fix is merged and its merge commit is an ancestor of V2.

Conversation: The issue reports /manage/about failing in v1.66.1 with ECONNREFUSED and digest 3227098399. Comments request full server logs and mention a broader error boundary. Linked PR #6009 explicitly identifies four unnecessary self-fetches, removes them, and adds manage/error.tsx; its metadata records a merge and V2 ancestry. Current source contains the direct calls and boundary, so the reported self-fetch cause is addressed, although deployment-specific failures still need runtime evidence.

Remaining limits: Validate /manage/about in the affected source-built/restricted-network deployment and inspect any new digest if direct dependency reading fails; the original loopback ECONNREFUSED path is removed.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6008.

## [#6002](https://github.com/homarr-labs/homarr/issues/6002) — bug: Uptime-Kuma, paused has no effect

**not-addressed · none-established · confidence: high**

The integration still derives monitor status from the latest public heartbeat and cannot reliably distinguish an intentionally paused monitor from a stale last heartbeat.

Conversation: The one comment was read. The reporter says pausing an Uptime Kuma monitor does not change Homarr's paused counter. The maintainer explains Homarr only consumes public status-page and heartbeat APIs, which omit the dashboard monitor active flag; a later v2 fix was reverted because it was ineffective. The public API limitation remains.

Remaining limits: Use an authenticated Uptime Kuma API or an explicit integration option/endpoint that exposes active state, then verify paused monitors, stale heartbeats, and maintenance states separately. Do not call the reverted status mapping a fix.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #6002.

## [#5867](https://github.com/homarr-labs/homarr/issues/5867) — feat: REST Endpoint  to manage boards

**addressed · full · confidence: high**

The requested board-management REST surface exists in the current release/v2 API: board listing/creation/duplication/rename/visibility/deletion, home-board operations, settings update, and board-item creation are exposed.

Conversation: The request asks for an HTTP/REST endpoint so Ansible can create a board and add an app during provisioning. A comment says the endpoint was added in v1.65 and asks for documentation verification. The broader full-dashboard automation gaps are tracked separately in #6435; this assessment covers the narrower original board-management request.

Remaining limits: The issue's minimal create-board/add-app workflow is covered. Declarative read/update/delete coverage for every board item and related resources remains the separate #6435/#6546 scope.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5867.

## [#5769](https://github.com/homarr-labs/homarr/issues/5769) — feat: Support Kubernetes integration as dashboard widgets instead of a global tool for multi-tenant access control

**not-addressed · none-established · confidence: high**

Kubernetes remains a global, admin-only management tool in V2. The route requires both admin permission and ENABLE_KUBERNETES, uses a shared context selector, and renders cluster/resource pages under /manage/tools/kubernetes. The cluster dashboard queries cluster-wide data for the selected context; there is no Kubernetes integration kind or widget package that can be placed on a board with per-widget cluster/resource scoping.

Conversation: The issue requests dashboard widgets for multiple Kubernetes clusters, with granular metric/resource selection and tenant boundaries instead of a global tool. It has no comments proposing a reduced scope or reporting a fix. V2's current Kubernetes pages improve the global tool's context selection but do not change its access boundary or expose it through the board widget model. Generic Custom Widgets do not provide native Kubernetes authentication or the requested safe multi-tenant policy.

Remaining limits: Expose Kubernetes as a first-class, permission-scoped integration/widget model with per-cluster credentials and resource selectors, while preserving tenant isolation and avoiding global-admin data leakage.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5769.

## [#5730](https://github.com/homarr-labs/homarr/issues/5730) — bug: Administration menu breaks if you click around the options too much

**addressed · partial · confidence: high**

The current logs terminal disposes the CanvasAddon before the terminal, covering the reported xterm cleanup failure, but the reported Scalar API error and WebSocket process crash have no corresponding release/v2 source fix.

Conversation: All 7 comments were read. The report combines three failures after rapid administration-menu navigation: repeated WebSocket failures that eventually stop the server, Scalar's `refract is not a function` with broken API dropdowns, and xterm's onShowLinkUnderline error while leaving logs. The reporter traces the WebSocket problem to tRPC's observableToReadableStream and proves local try/catches prevent crashes; they also identify CanvasAddon disposal as the logs race. A maintainer later says it should be fixed but receives no confirmation. Current v2 cleanup clears the fit timer, disposes CanvasAddon, then disposes and clears the terminal ref. The API page still renders @scalar/api-reference-react without a compatibility guard, and the WebSocket entrypoint still delegates to applyWSSHandler without stream-controller protection.

Remaining limits: Verify logs navigation on release/v2, then independently reproduce the Scalar dependency error and tRPC stream shutdown. Upgrade or isolate incompatible Scalar/tRPC behavior and add a server-safe close path if those two failures remain; the xterm source change alone does not close the compound report.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5730.

## [#5716](https://github.com/homarr-labs/homarr/issues/5716) — bug: OIDC group assignment is not working if user is only in one group

**not-addressed · none-established · confidence: high**

OIDC group synchronization still requires the groups claim to be an array. A provider that returns one group as a scalar string is ignored, so the reported single-group assignment failure remains in v2.

Conversation: The body reports JumpCloud sending groups as a string for users in one group while multi-group users receive an array, causing group assignment to fail only for the single-group case. There are no comments. The timeline cross-references #6510 and records a candidate fix commit, but that commit is not an ancestor of the assessed release/v2 branch.

Remaining limits: Normalize a scalar group claim to a one-element string array after validating its type, preserve array behavior, and test JumpCloud/Auth0/Authentik-like claim shapes including absent, scalar, and mixed-value claims.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5716.

## [#5538](https://github.com/homarr-labs/homarr/issues/5538) — bug: No integration data available for unraid disks

**not-addressed · none-established · confidence: high**

The Unraid integration still reads only primary-array disks. It does not query or normalize array.caches/storage-pool disks, so pool-only Unraid installations remain without disk data. The follow-up #6803 confirms this is an active v2 gap.

Conversation: The original v1.59.2 report says CPU and memory work but disk data is absent on Unraid 7.2.4. The ten comments include requests for logs and setup details, reports on Unraid 7.3, a possible unrelated No home board found log, websocket troubleshooting, and a later diagnosis that pool-only setups are unsupported. The timeline cross-references the open follow-up #6803. That follow-up specifies querying array.caches and ignoring null size fields; no implementation is in v2.

Remaining limits: Extend the GraphQL query/schema and mapping to include caches and other supported pools, ignore null per-disk fields where Unraid reports aggregate-only values, and validate both array-plus-pool and pool-only hosts.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5538.

## [#5387](https://github.com/homarr-labs/homarr/issues/5387) — feat: Pushover Integration

**not-addressed · none-established · confidence: high**

V2 has Gotify and ntfy notification integrations but no native Pushover integration.

Conversation: All 3 comments were read. The reporter asks for a Pushover notification integration; the maintainer requests details and receives no follow-up implementation specification. The issue was reopened by cleanup history, not fixed.

Remaining limits: Implement a native Pushover integration with token/user secrets, request validation, notification action semantics, and documentation.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5387.

## [#5342](https://github.com/homarr-labs/homarr/issues/5342) — bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration

**addressed · full · confidence: high**

The malformed Tracearr hosthttps URL was fixed in merged PR #5654, whose merge commit is an ancestor of v2. Current Tracearr code passes returned absolute avatar/poster URLs directly to the image proxy rather than rebuilding them against the integration base URL.

Conversation: The reporter supplied repeated DNS queries such as tracearr.mydomain.nethttps when Tracearr returned absolute avatar/poster URLs. Five comments discuss DNS caching and reproduction/diagnosis; the linked fix PR explains that proxyImageAsync incorrectly sent absolute URLs through this.url(). Its merge commit is in v2, and the issue can be closed as fixed if it was left open.

Remaining limits: No product work remains for the reported malformed URL. If the issue was not closed on GitHub, mention it as fixed by v2; monitor a real Tracearr deployment for unrelated proxy/image failures.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5342.

## [#5336](https://github.com/homarr-labs/homarr/issues/5336) — feat: widget to display missing / queued movies & episodes

**addressed · full · confidence: high**

V2 includes a native mediaMissing widget that queries configured media-organizer integrations and displays missing movies/episodes plus queued downloads. It offers showMissing/showQueued and page-size settings, counts and partial-failure badges, an advanced two-panel view, and a compact tab view. The shared media-organizer interface and item types provide the missing/queue data required by Radarr and Sonarr.

Conversation: The issue requests a widget showing missing or queued movies and episodes, similar to Heimdall, with counts from Radarr/Sonarr. Comments include a volunteer implementation and a maintainer asking the contributor to inspect the widget package. Linked PR #6078 adds the widget and is marked merged; its merge commit is an ancestor of the V2 branch. The current source confirms the feature is available as a first-class widget, rather than only a generic custom-widget workaround.

Remaining limits: No issue-specific implementation gap remains; verify integration-specific data quality separately if a particular Radarr/Sonarr version reports different queue semantics.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5336.

## [#5154](https://github.com/homarr-labs/homarr/issues/5154) — feat: SLO (Single Log-out)

**not-addressed · none-established · confidence: high**

V2 supports local sign-out followed by an optional redirect, but it does not implement Authentik/OIDC single logout, a front-channel logout endpoint, or a back-channel session-revocation endpoint.

Conversation: The request asks Homarr to participate in SLO so an Authentik logout can clear Homarr sessions, including when users are deleted remotely. Six comments discuss front-channel and back-channel options, the endpoint/auth/user-identifier requirements, and maintainer reluctance because the affected group is small; a volunteer asks for implementation direction but cannot implement it. No timeline event shows a merged SLO feature.

Remaining limits: Choose a provider protocol and session model, then implement and secure front-channel and/or back-channel logout with issuer validation, logout-token handling, and local session revocation. Document provider prerequisites and failure behavior.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #5154.

## [#5085](https://github.com/homarr-labs/homarr/issues/5085) — bug: Unable to connect to LDAP

**addressed · partial · confidence: high**

Baseline documented equivalent with extra filter and group member user attribute dn authenticated admin and retrieved two groups. Final candidate homarr:v2-triage-final-candidate on fresh port 47614 with the documented filter and dn attribute authenticated the duplicate admin and retrieved two groups.

Conversation: All 8 comments were read. The original Docker Compose example uses cn=admin even though the returned LLDAP entry has uid=admin; the reporter confirms changing the bind DN to that returned DN makes LLDAP login work. They then reproduce a different failure against Authentik, using a correct bind DN, sAMAccountName, subtree search, and an objectClass filter; ldapsearch from the Homarr container returns one user, but Homarr still returns CredentialsSignin. The maintainer questions the search scope, the reporter tests it and reports no change, then supplies base and subtree queries showing the expected Authentik user. Current v2 supports the requested username attribute, search scope, and optional extra filter, but there is no Authentik-specific handling or end-to-end evidence that those settings authorize successfully.

Remaining limits: The exact Authentik LDAP Outpost schema, sAMAccountName attribute, and provider response were unavailable; the controlled fixture proves the duplicate-result failure and final-candidate filter/dn success path but does not prove Authentik-specific behavior.
The distinguishedName configuration variant needs a vendor fixture that actually returns a distinguishedName attribute; OpenLDAP's protocol dn equivalent was tested end to end.

Checks:

- OpenLDAP fixture ldapsearch returned two cn=admin entries: uid=admin under ou=users and cn=admin under ou=virtual-groups, modelling the reported Authentik user plus virtual-group collision.
- Baseline homarr:v2-issue-triage-439b2082 on port 47602 with username attribute cn and no extra user filter rejected admin with HTTP 302 to /auth/login?error=CredentialsSignin; runtime log recorded Multiple LDAP users found for admin.
- Baseline with extra filter (objectClass=inetOrgPerson) and group member user attribute distinguishedName authenticated admin but retrieved zero groups because the OpenLDAP fixture exposes the DN as protocol dn and has no distinguishedName attribute.
- Baseline documented equivalent with extra filter and group member user attribute dn authenticated admin and retrieved two groups.
- Final candidate homarr:v2-triage-final-candidate on fresh port 47614 with the documented filter and dn attribute authenticated the duplicate admin and retrieved two groups.

Evidence: [auth/results.json](auth/results.json).

## [#4973](https://github.com/homarr-labs/homarr/issues/4973) — bug: System Resources Incorrect Total Ram for TrueNAS 25.04

**addressed · full · confidence: high**

V2 corrects the TrueNAS memory mapping responsible for inflating displayed capacity. Previously physical memory was returned as available and the reporting value as used, so the widget added both. V2 returns available and max(physical minus available, 0), making their sum physical memory for valid available values.

Conversation: The reporter says a TrueNAS 25.04 host with 64 GB appears as roughly 74 GB in Homarr, with a follow-up describing a similar VM discrepancy. The maintainer asks about versions without confirming a reproduction. Merged fix #6017 changes the exact erroneous mapping; the independent audit agrees this is a concrete source-level fix for the overcount.

Remaining limits: Confirm the original TrueNAS 25.04 payload has available memory between zero and physmem, then compare System Resources and Health Monitoring against the host. The arithmetic fix is present; no live TrueNAS validation was performed.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4973.

## [#4965](https://github.com/homarr-labs/homarr/issues/4965) — bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name

**addressed · full · confidence: high**

Baseline DN cn=100% User failed during user search before User found in LDAP; HTTP 302 ended at /auth/login?error=CredentialsSignin, consistent with decodeURIComponent receiving a literal percent. Final candidate on fresh port 47614 with username attribute uid and extra filter (objectClass=inetOrgPerson) authenticated unicode, comma, and percent users; each returned HTTP 302 to the app root and logged correct credentials, groups=1, and User logged in.

Conversation: The reporter says user lookup and password validation succeed, then group retrieval fails only when the CN/DN contains Cyrillic, Polish, Chinese, or other non-ASCII characters; ASCII-only users work. Comments question why a CN is non-ASCII, answer that other LDAP services handle it, and suggest vendor differences between encoded and UTF-8 strings while expecting LDAPv3 UTF-8 to work. The issue remains open, has no linked fix, and the only workaround is using local credentials accounts.

Remaining limits: Retest against the reported AD/LDAPS vendor and a non-ASCII DN; keep separate coverage for username-schema validation and LDAP filter escaping.

**Requires the local fixes to land in release/v2 before claiming this release resolution.**

Checks:

- Baseline OpenLDAP fixture with cn=Громов Иван authenticated on port 47601, retrieved one group, and created the LDAP user; plain UTF-8 alone did not reproduce the report on this provider.
- Baseline DN cn=Comma\2C User was found, but user bind failed after Homarr normalized the DN to a literal comma; HTTP 302 ended at /auth/login?error=CredentialsSignin.
- Baseline DN cn=100% User failed during user search before User found in LDAP; HTTP 302 ended at /auth/login?error=CredentialsSignin, consistent with decodeURIComponent receiving a literal percent.
- Final candidate on fresh port 47614 with username attribute uid and extra filter (objectClass=inetOrgPerson) authenticated unicode, comma, and percent users; each returned HTTP 302 to the app root and logged correct credentials, groups=1, and User logged in.

Evidence: [auth/results.json](auth/results.json).

## [#4906](https://github.com/homarr-labs/homarr/issues/4906) — feat: Top right UI Cleanup (concept video inside)

**addressed · partial · confidence: medium**

V2 delivers a configurable header and board/command-menu redesign, but the concept issue is broad and hidden-header controls still rely on pointer/focus interaction rather than an explicit acceptance contract.

Conversation: All 3 comments were read. The issue is a concept video for cleaning up top-right controls. A reviewer specifically warns that core actions must not be mouseover-only and must remain usable by keyboard and touch; the maintainer says they are too busy to implement it but accepts contributions. Related #5272 remains unmerged.

Remaining limits: Because the source request is a visual concept without exact acceptance criteria, keep this partial. Validate keyboard, touch, screen-reader, and hidden-header discoverability against the specific video expectations.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4906.

## [#4815](https://github.com/homarr-labs/homarr/issues/4815) — feature: Seed the database with a showcase default dashboard using the new JSON import endpoint

**addressed · partial · confidence: high**

V2 implements the requested in-dashboard integration workflow, while ordinary fresh-install seeding still creates a small generic board rather than the requested static showcase dashboard.

Conversation: The issue body and its zero comments were read. It contains two distinct scopes: a fresh-install showcase board with no-integration examples, documentation links, multiple clocks, Docker/system widgets, Homarr releases, and an NVDA note; and an in-place widget workflow that selects an available integration or opens integration creation without navigating away. The normal seed path creates one dashboard and places only the default clock, weather, and bookmarks configurations, with basic default apps/search engines. A large demo dashboard exists only when DEMO_MODE is enabled; it includes a notebook and many showcase widgets, but many entries intentionally require a mock integration and it is a separate demo user/board. The widget-add flow now selects matching integrations and opens the integration modal inline when none exists; the widget edit modal can also create and select a new integration. The combined request is therefore only partially addressed.

Remaining limits: Add or explicitly ship a standard fresh-install showcase configuration with the requested no-integration widgets, clock locations, stock note, links/search engine, and verified defaults; clarify whether DEMO_MODE is the intended showcase entry point. The in-place selection/creation workflow has no remaining source-level gap, but its integrated behavior was not live-tested.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4815.

## [#4797](https://github.com/homarr-labs/homarr/issues/4797) — feat(releases): support image tags

**addressed · partial · confidence: high**

V2 queries Docker Hub tags and supports prefix/precision/suffix filters, but normalizes away an image tag and cannot express an exact pinned tag or flexible include/exclude regex.

Conversation: All 6 comments were read. The reporter says Docker images such as pihole/pihole work without a tag but :latest does not, and asks for a tag option plus include/exclude regex. Follow-ups discuss Docker Hub's tags endpoint and behavior without a filter; the old rework PR was merged but the exact tag/filter contract remains incomplete.

Remaining limits: The tag endpoint and latest/no-filter path work for repository discovery, but exact image-tag selection and flexible include/exclude filters are still missing. Verify the reporter's :latest and desired tag semantics against a current Docker Hub repository.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4797.

## [#4766](https://github.com/homarr-labs/homarr/issues/4766) — bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy

**needs-verification · none-established · confidence: low**

A Chromium CDP capture recorded the synthetic WebSocket handshake as HTTP/1.1 Upgrade with status 101. Chromium exposed no connectionId for the WebSocket events, and performance connectionId was null; the test therefore did not establish that the two hostnames shared one HTTP/2 connection. The reported pending-WebSocket delay was not reproduced in this controlled topology during the approximately 10 minute 42 second fixture lifetime; this is a bounded non-reproduction, not an issue resolution proof.

Conversation: The reporter supplied a detailed reverse-proxy and HTTP/2 WebSocket reproduction in which opening Homarr affected another site sharing the proxy. The thread considered an AI-generated diagnosis, which the reporter challenged, and a maintainer could not reproduce and suspected the proxy. Another user reported a similar symptom. There is no controlled reproduction or confirmed root-cause fix in the conversation.

Remaining limits: The fixture did not obtain a browser connectionId shared by homarr.test and other.test. The WebSocket handshake was HTTP/1.1 in this Chromium/Caddy run even though page HTTP requests used HTTP/2, so it cannot confirm or refute the reporter's HTTP/2 coalescing mechanism.
The synthetic peer has no TrueNAS workload, the reporter's wildcard certificate/proxy configuration, or the reported multi-minute stream starvation. Re-test with an authorized equivalent Caddy deployment and Chromium profile while collecting Chrome NetLog/connection-pool evidence if the original failure remains actionable.
The image ran the requested 439b2082 candidate. A later menu-only image change was not included in this runtime and is not relevant to the proxy protocol path.

Checks:

- Generated a short-lived self-signed certificate with SANs homarr.test and other.test, and served both names from the same disposable Caddy TLS listener on loopback port 47640.
- Caddy was configured for h1 and h2; openssl negotiated ALPN h2, and Chromium reported nextHopProtocol=h2 for the synthetic peer while Caddy recorded HTTP/2.0/h2 Homarr requests.
- The final candidate Homarr image started on the dedicated network, completed its normal tmpfs-only initialization/onboarding, and loaded the authenticated dashboard through the proxy.
- The synthetic peer opened two baseline WSS connections before Homarr and a third WSS connection while the Homarr dashboard remained open; all received HTTP 101 and heartbeat messages with no pending/error/close event during the bounded run.
- A Chromium CDP capture recorded the synthetic WebSocket handshake as HTTP/1.1 Upgrade with status 101. Chromium exposed no connectionId for the WebSocket events, and performance connectionId was null; the test therefore did not establish that the two hostnames shared one HTTP/2 connection.
- The reported pending-WebSocket delay was not reproduced in this controlled topology during the approximately 10 minute 42 second fixture lifetime; this is a bounded non-reproduction, not an issue resolution proof.

Evidence: [integrations/proxy-4766.json](integrations/proxy-4766.json).

## [#4738](https://github.com/homarr-labs/homarr/issues/4738) — bug: Dashboard Layout - Saving Changes Failure

**needs-verification · none-established · confidence: medium**

Named it Browser Triage Layout, set 10 columns and a 1200 breakpoint, saved it, navigated away, and reopened settings. Queried the live board tRPC response after reload and confirmed the custom layout persisted.

Conversation: All 4 comments were read. The reporter describes v1.46 failing when adding a layout with Board not found in createBoardLayout, provides follow-up logs, removes bad integrations, and says the failure remains. No comment identifies a separate root cause beyond the layout-save path.

Parent reconciliation: The reporter explicitly says a fresh board already worked in the affected old release; only one existing board failed. Fresh-board persistence does not resolve that failure.

Remaining limits: The reporter explicitly said a fresh blank board saved layouts successfully; this fresh-board success does not establish a fix for the one existing failing board.
Mobile rendering of the custom layout was not a separate device-engine check.

Checks:

- Added a second layout through the current board settings UI.
- Named it Browser Triage Layout, set 10 columns and a 1200 breakpoint, saved it, navigated away, and reopened settings.
- Queried the live board tRPC response after reload and confirmed the custom layout persisted.

Evidence: [browser/results.json](browser/results.json).

## [#4563](https://github.com/homarr-labs/homarr/issues/4563) — feat: Generic Game Server Status Widget

**not-addressed · none-established · confidence: high**

V2 still provides only a Minecraft-specific server status widget and has no native Gamedig/generic game-server integration.

Conversation: All 3 comments were read. The reporter requests a generic Gamedig-backed widget supporting hundreds of games and calls out Valheim, Terraria, and Vintage Story, with status, map, players, version, and configurable icon. The comments reinforce a native generic integration rather than a custom endpoint.

Remaining limits: A native generic game-server protocol/client and widget remain unimplemented. Custom API/Custom Widget extensibility would not satisfy this native integration request.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4563.

## [#4562](https://github.com/homarr-labs/homarr/issues/4562) — feat(integrations): support music media type for seerr

**not-addressed · none-established · confidence: high**

The native Overseerr/Seerr integration still models only movie and TV request media. Request methods, search discriminated unions, request parsing, and statistics schemas all omit music/Lidarr types. The issue's proposed upstream support was still draft/unfinished in the conversation, and no linked merged PR supplies a V2 implementation. A generic Custom Widget cannot extend the native request schema or make the music filter work.

Conversation: The report describes Jellyseerr/Seerr with the preview music feature and Lidarr producing a media-request parsing error because Homarr handles only movie and TV. Comments initially suggest the change should be easy, then note the upstream API is unfinished; the maintainer declines accepting an unknown type until the upstream contract is stable. The final discussion points to upstream PR #2132 still being draft and asks the reporter to retag when it lands.

Remaining limits: Wait for a stable Seerr/Jellyseerr music API, then extend integration interfaces, validation, request/search handling, stats, widget labels, and tests without treating unknown upstream types as valid movie/TV data.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4562.

## [#4543](https://github.com/homarr-labs/homarr/issues/4543) — feat: Edit apps inside Edit Item

**addressed · full · confidence: high**

V2 embeds the AppForm as an App tab inside the widget edit modal and submits app changes with the widget form.

Conversation: No comments were present. The request asks for editing the linked app without leaving Edit Item, reducing clicks to change a URL. V2 contains an explicit in-place app-edit implementation.

Remaining limits: No material gap for the stated request. Permission gating is intentional: the App tab appears only for users with app-modify-all.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4543.

## [#4541](https://github.com/homarr-labs/homarr/issues/4541) — feat(boards): support automatic layout for different screen sizes

**addressed · partial · confidence: high**

V2 implements responsive board layouts with protected Mobile and Base roles, breakpoint selection, custom layouts, previews, and reset-from-Base behavior. The runtime selects a layout for the viewport, settings can add custom breakpoint layouts seeded from Base geometry, and the API projects Base content into new or reset layouts. Existing non-Base layouts are not automatically reprojected whenever Base geometry is edited, so the broader automatic recalculation request is only partially covered.

Conversation: The issue proposes deriving layouts for different screen sizes from a base layout while allowing custom overrides, with DB role/layout-mode ideas and an edit strategy. Comments discuss generating five to seven layouts, choosing a base layout, auto-sizing, and using mobile as a secondary layout; the final discussion favors a default/base layout plus an algorithm and explicit editing. V2 ships the Base/Mobile/breakpoint/reset architecture, but save propagation must be checked against the requested all-nonbase recalculation: the API projects new layouts and explicit resets, while existing layouts are processed independently.

Remaining limits: Decide whether editing Base should automatically regenerate every non-Base layout or only offer reset; if automatic, propagate the new Base elements/geometry to existing layouts while preserving intentional overrides, then verify save and migration behavior.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4541.

## [#4538](https://github.com/homarr-labs/homarr/issues/4538) — bug: iCal widget intergration not working

**not-addressed · none-established · confidence: high**

V2's iCal adapter still fetches the remote feed on demand, emits raw VEVENT instances, and has no recurrence expansion or durable stale-data fallback for feeds blocked by providers.

Conversation: The issue body and its 1 comment were read. The reporter says an iCloud public feed works briefly, is then blocked after too many requests, and omits recurring events. The comment proposes synchronizing and storing calendar data locally. V2's iCal integration fetches the configured URL for each request, parses each VEVENT directly, and returns its DTSTART/DTEND without iterating RRULE occurrences. The calendar request handler has only the generic 10-second cache because no iCal-specific TTL or stale-on-error policy is configured; the calendar router returns an integration error when all sources fail. Thus neither the provider-blocking failure mode nor the recurring-event omission is resolved at source level.

Remaining limits: Implement feed synchronization or a longer, bounded cache with stale fallback/backoff, expand RRULE events within the requested range with timezone handling, and add focused iCal tests for blocked feeds and recurrence.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4538.

## [#4533](https://github.com/homarr-labs/homarr/issues/4533) — feat: show Description next to title for application

**addressed · full · confidence: high**

The v2 App widget can render icon, title, and normal description in a horizontal row, with responsive sizing and truncation.

Conversation: Both comments were read. The request asks for an app description next to the title, with the icon on the left and title/description to its right; the old presentation stacked content. V2's app layout options include horizontal row modes and the component renders title and description together in the text stack.

Remaining limits: The default remains column layout, so users must choose a horizontal layout for this arrangement. Verify whether the reporter expected horizontal to become the default rather than an available option.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4533.

## [#4455](https://github.com/homarr-labs/homarr/issues/4455) — feat: Ability to disable users without deleting them.

**not-addressed · none-established · confidence: high**

V2 has no persisted disabled-user state, admin toggle, or authentication/session enforcement for disabling an account.

Conversation: All 3 comments were read. The requester wants an admin-only toggle to block service accounts such as Authentik or LDAP search users while leaving those accounts available to other services. One maintainer suggests using the identity provider instead; a later comment says a Homarr-side implementation is reasonable for credentials users if login, API keys, and sessions are revoked. Current v2 source has no disabled column, user-list status/action, or checks in credentials, LDAP, or session handling. Linked PR #6214 describes this feature but is open/draft metadata and is not evidence of the current release/v2 source.

Remaining limits: Add a migration-backed disabled flag, admin-only enable/disable mutation and UI, and enforcement across every authentication method, API-key issuance/use, and active-session validation. Define behavior for external-provider users before implementing.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4455.

## [#4406](https://github.com/homarr-labs/homarr/issues/4406) — bug: OIDC not working with Cloudflare Zero Trust / SaaS

**addressed · partial · confidence: medium**

Replaying the same authorization request as response_type=id_token made the provider return id_token and state in the URL fragment; the browser callback ended at /auth/login?error=Configuration with the fragment still present, so the server did not receive the fragment values. The final-candidate code path uses the same default authorization-code behavior; no Cloudflare or Entra credentials were used.

Conversation: The report describes Cloudflare Zero Trust OIDC with Entra failing at the callback, initially around the groups scope. Comments clarify that the provider is Cloudflare OIDC, try implicit/hybrid flow, and report persistent failures through several Homarr releases. The later investigation explains that implicit/hybrid responses put state/tokens in a browser fragment unavailable to the server, recommends authorization code, and notes that profile claims may need scope/name/group overrides or userinfo. No linked fix or v2-specific verification is recorded.

Parent reconciliation: Code-flow configuration path verified; original Cloudflare profile/claim failure was not reproduced.

Remaining limits: Validate the authorization-code and claim mapping against a real Cloudflare Zero Trust tenant if that provider is still required; the controlled fixture establishes the fragment failure mechanism and the code-flow contract.

Checks:

- The local OIDC fixture authorization-code flow sent response_type=code with state and PKCE, exchanged the code successfully (token authValid=true), and reached the Homarr dashboard.
- Replaying the same authorization request as response_type=id_token made the provider return id_token and state in the URL fragment; the browser callback ended at /auth/login?error=Configuration with the fragment still present, so the server did not receive the fragment values.
- The final-candidate code path uses the same default authorization-code behavior; no Cloudflare or Entra credentials were used.

Evidence: [auth/results.json](auth/results.json).

## [#4361](https://github.com/homarr-labs/homarr/issues/4361) — feat(media-releases): support selection of user for library fetching

**not-addressed · none-established · confidence: high**

The Emby Media Releases widget still has no user-selection option and still chooses the first public Emby user for latest-media queries.

Conversation: All 3 comments were read. The original report describes a new Emby Media Releases item failing with No users found. A maintainer explains that the implementation fetches public users and takes the first one; the reporter fixes the immediate error by enabling an Emby public user. The final comment changes the issue into a feature request for selecting the library user, referencing the dynamic select work. V2 retains the first-public-user behavior and passes only integration IDs through the widget and request handler. The workaround resolves the reporter's configuration error but does not implement the requested per-widget user choice or provide a graceful no-public-user path.

Remaining limits: Expose a validated Emby user option through the widget settings, request handler, and integration method; list users with appropriate permissions and handle an empty or deleted selection without throwing an opaque integration error.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4361.

## [#4330](https://github.com/homarr-labs/homarr/issues/4330) — feat(icon-picker): show more than 12 icons per source

**addressed · partial · confidence: high**

The v2 icon picker requests 24 icons per repository instead of the old 12, but it still has no Show more control or pagination to reach the rest. The exact feature was proposed in closed, unmerged PR #6248 and is not present at this HEAD.

Conversation: The author explains that repositories such as Nextcloud have more than 12 matching icons and asks for an extended list button. Two comments only correct the issue-template labeling. The timeline cross-references PR #6248, whose body implements 12→48→192→500 pagination and says it closes #4330, but the PR was closed without merging. The current v2 picker has a fixed 24 request and renders that result.

Remaining limits: Add bounded pagination or progressive loading with a visible control and a way to know whether a repository is truncated. Keep search reset and performance behavior explicit; the current 24-result increase only reduces the symptom.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4330.

## [#4246](https://github.com/homarr-labs/homarr/issues/4246) — bug: download client sorting only on client side

**not-addressed · none-established · confidence: high**

Download-client sorting still happens after the integration has fetched/limited data, so newest or oldest ordering cannot reliably select records outside the first page and large qBittorrent lists remain expensive.

Conversation: The report explains that the widget fetches the first 50 torrents and sorts only those, making newest items missing when they are outside that slice. It also describes a qBittorrent instance with thousands of torrents where raising the limit causes memory trouble. The maintainer agreed that server-side sort/filter and the listtorrents endpoint are needed; no later fix was found.

Remaining limits: Add an integration-level sort/filter contract that executes before pagination/limit, or use qBittorrent listtorrents with the requested sort and bounded page. Keep result memory bounded for large installations and cover both qBittorrent and Deluge behavior.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4246.

## [#4190](https://github.com/homarr-labs/homarr/issues/4190) — bug: Cannot integrate with OMV, Invalid system information response

**needs-verification · none-established · confidence: medium**

A null cpuModelName was accepted and mapped to Unknown CPU. Malformed cpuUtilization, memUsed, and loadAverage fields all reached the integration's Invalid system information response validation boundary.

Conversation: The reporter identified OMV 7.7.17-1 on a Raspberry Pi, with a successful connection test but a system-information schema error, and suspected null CPU values. Maintainers requested Discord debugging; another user suggested admin credentials. No failing payload or confirmation of that workaround appears in the seven comments.

Remaining limits: The issue did not include the failing OMV response body. Capture the actual 7.7.17-1 Raspberry Pi response to distinguish a null CPU model, another null/typed field, an auth-shaped payload, or firmware-specific schema.

Checks:

- Real OpenMediaVaultIntegration accepted valid synthetic responses for versions 6.0, 7.7.17-1, and 8.0.
- A null cpuModelName was accepted and mapped to Unknown CPU.
- Malformed cpuUtilization, memUsed, and loadAverage fields all reached the integration's Invalid system information response validation boundary.

Evidence: [integrations/results.json](integrations/results.json).

## [#4159](https://github.com/homarr-labs/homarr/issues/4159) — bug: Tasks page does not load

**addressed · full · confidence: high**

The V2 Tasks page loads its jobs through the server-side tRPC API in the Next process, and production instrumentation starts the embedded tasks service alongside the embedded WebSocket service. This removes the old source-build assumption that a separately reachable task endpoint must answer the page request, which is the reported ECONNREFUSED path. The page remains admin-only and still depends on startup completing successfully.

Conversation: The issue reports v1.39.0 built from source in an LXC, where /manage/Tasks failed with a tRPC fetch ECONNREFUSED. The sole comment says Docker works and the failure is specific to source-only deployment. V2's runtime architecture embeds tasks in production and the page calls api.cronJobs.getJobs directly; this is a direct architectural change addressing that deployment mode. There is no current source-built LXC smoke run in this triage.

Remaining limits: Confirm a source-built or otherwise non-Docker V2 deployment can start the embedded task service and load /manage/tools/tasks; investigate startup failures separately if the embedded service rejects readiness.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4159.

## [#4157](https://github.com/homarr-labs/homarr/issues/4157) — feat: Download Client Item - Job Name column should be wider than the rest.

**addressed · full · confidence: medium**

The download widget now gives the job/name column a wider 240px default and supports resizing/persisting table column widths, directly covering the request.

Conversation: The original request complained that job names were clipped by equal-width columns. A community reply supplied a custom CSS workaround; the requester confirmed it worked but noted the header issue, which was corrected as a CSS comment syntax mistake. The linked v2 PR #6784 explicitly resolves this issue with a stable wider default plus resize persistence and is merged into release/v2.

Remaining limits: Users may still tune widths for unusually long names, but no issue-level implementation gap remains. A browser check can verify the persisted resize interaction.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4157.

## [#4143](https://github.com/homarr-labs/homarr/issues/4143) — feat: separate region from language

**not-addressed · none-established · confidence: high**

V2 still couples display localization to the selected language and has no independent persisted user region or timezone preference.

Conversation: All 2 comments were read. The requester wants English UI text while retaining a Swedish/local region so calendar and release times are easier to read. A maintainer asks whether the change is wanted; another member agrees but notes possible localization-library difficulty. Current v2 user preferences expose locale, first day of week, and byte units, but no region or timezone field. Day.js loads its locale from the route language, while the clock defaults to the browser's resolved timezone unless each widget has a custom timezone. This does not provide the requested user-level separation or guarantee that integrated calendar formatting follows a chosen region.

Remaining limits: Add a persisted independent locale/region or timezone preference and apply it consistently to calendar dates, release times, and default clock behavior. Keep the per-widget timezone override as a more specific setting.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4143.

## [#4026](https://github.com/homarr-labs/homarr/issues/4026) — bug: Downloads: number of shown entries per intergration include already hidden entries

**not-addressed · none-established · confidence: high**

The Downloads widget still applies the per-integration limit before it filters completed/hidden entries. Hidden completed jobs can consume the server/integration limit and prevent active jobs from appearing.

Conversation: The report identifies a reproducible configuration where the number of shown entries includes completed entries hidden by widget settings, causing active downloads to disappear; the workaround is to set an unnecessarily high limit. Two comments discuss filtering server-side or fetching a larger set and filtering in JavaScript. The current request path still forwards the configured limit into every download-client integration, then filters completion in the widget.

Remaining limits: Move filtering before the limit where the integration can support it, or over-fetch with a bounded server-side safety limit and then apply the widget's visibility rules. Preserve a clear performance bound and test each download-client adapter with hidden completed entries.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #4026.

## [#3990](https://github.com/homarr-labs/homarr/issues/3990) — feat: Allow one URL and just map ports for each app

**addressed · partial · confidence: high**

V2 adds one base origin with host-port, subdomain, or reverse-proxy path generation for onboarding and Docker reconciliation, but it does not provide a persistent list of selectable base addresses or dynamic app URL references.

Conversation: All 2 comments were read. The request asks for reusable base addresses such as LAN IPs and domains, selecting one while configuring an app and appending its port, plus easy HTTP/HTTPS switching. A follow-up asks that detected app URLs default to the current Homarr domain/IP and port. V2 covers a substantial workflow slice: URL builders derive service/app addresses from one origin and a detected/default port; onboarding applies them to discovered integrations and apps; and Docker management initializes the origin from request headers and persists one origin and mode in browser local storage. The implementation still stores concrete href/serverUrl values in drafts and app records, and the UI has only one origin field rather than a managed list with per-app selection. Changing an origin therefore does not rewrite existing manually configured apps. The current feature is useful for setup/reconciliation but does not meet the full persistent-address model.

Remaining limits: Add a server- or user-scoped base-address registry, app-level selection/reference semantics, and a deliberate update/migration policy for existing hrefs. Preserve the current one-origin template as a convenient setup default.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3990.

## [#3913](https://github.com/homarr-labs/homarr/issues/3913) — feat: Support running as fully non-root containers

**addressed · partial · confidence: high**

V2 supports dropping privileges to a configured PUID/PGID after startup, including ownership preparation for app data, the Next cache, and nginx directories. It still defaults to root, performs mkdir/chown work in the entrypoint, and uses su-exec only when PUID is nonzero. A runtime/container user supplied directly through Docker or Podman therefore does not get a fully non-root startup path, matching the issue's cache and chown failures.

Conversation: The report supplies a rootless Podman proof of concept, explains that the entrypoint's root chown cannot run under user 1234:1234, and calls out EACCES for the Next cache. Comments discuss making the cache writable or configuring Next and using a Docker group for socket access. Current docs document PUID/PGID as the supported route and explicitly say the default is root. No comment indicates the stronger direct non-root container contract was completed.

Remaining limits: Support a genuinely non-root image/entrypoint path that never requires chown or privileged filesystem setup, define writable cache/runtime directories and Docker socket behavior, and verify Docker/Podman/Kubernetes user configurations.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3913.

## [#3904](https://github.com/homarr-labs/homarr/issues/3904) — feat: GPU usage in Dash component

**addressed · full · confidence: high**

V2 supports an optional GPU chart in System Resources, fetches Dashdot GPU data, and leaves GPU unselected by default so installations without GPU telemetry continue to work.

Conversation: All 3 comments were read. The requester asks for GPU percentage usage from Dashdot's NVIDIA image after losing the capability during the pre-1.0 transition. A maintainer notes that GPU reporting can vary, while the follow-up agrees to expose it through chart selection and keep it disabled by default. V2 implements that contract: the resource options include gpu alongside CPU, memory, and network; toChartItem averages processorUtilization across the returned GPU devices; and the component renders SystemResourceGPUChart when selected. Dashdot requests /load/gpu and maps memory and processor utilization, while request failures degrade to an empty GPU list. The default visible chart set excludes GPU, matching the discussion, but users can opt in where Dashdot supplies data.

Remaining limits: No source-level implementation gap remains. GPU visibility and telemetry still depend on a Dashdot build that exposes /load/gpu; live hardware verification was outside this triage.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3904.

## [#3887](https://github.com/homarr-labs/homarr/issues/3887) — feat: allow no network for system resources and allow proxmox to be used

**addressed · partial · confidence: high**

V2 hides the network chart when no network history exists, but Proxmox remains excluded from the System Resources integration selector and only supplies cluster health data.

Conversation: All 3 comments were read. The reporter can select Proxmox and Dashdot for System Health Monitoring but only Dashdot for System Resources, despite the documentation suggesting broader support. Maintainers explain that Proxmox does not expose the expected host network data, propose hiding unsupported network output, and leave open the possibility of a future partial network view. V2 implements the safe no-network behavior: the widget filters the network chart when no network samples exist. It does not implement Proxmox as a System Resources provider; the widget integration map's system list contains Dashdot and other system-health integrations, while Proxmox is placed in a separate cluster list. ProxmoxIntegration implements only IClusterHealthMonitoringIntegration, so selecting it for the resource widget remains impossible. The reporter's two requested parts therefore have different dispositions.

Remaining limits: Either add a Proxmox-compatible System Resources adapter with clearly defined network semantics or update the widget documentation/selector wording to describe cluster-only Proxmox support. No network-chart handling gap remains for integrations that return no network samples.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3887.

## [#3853](https://github.com/homarr-labs/homarr/issues/3853) — feat: Allow Docker stats widget to be seen without admin privileges

**not-addressed · none-established · confidence: high**

The Docker widget still depends on an admin-only getContainers procedure. Its UI queries that procedure for container state and CPU/memory data, while the API explicitly requires the admin permission; the endpoint filter only changes which endpoints are queried. Actions are also admin-only. Consequently a non-admin cannot see the requested Docker stats through the native widget.

Conversation: The issue requests read-only Docker statistics for ordinary users while keeping interaction restricted and preferably making access configurable. The discussion proposes treating Docker as a normal integration with an access setting rather than granting the widget blanket power. No comment or timeline entry shows that a permission split landed in V2. Generic widget extensibility does not alter the native Docker procedure's authorization.

Remaining limits: Introduce a deliberately scoped read permission or per-board/integration access policy for Docker stats, then retain admin-only mutations and validate that sensitive container data is appropriate for that audience.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3853.

## [#3843](https://github.com/homarr-labs/homarr/issues/3843) — feat: Ability to set the border color or transparency of tables in the Notebook widget

**not-addressed · none-established · confidence: high**

Notebook table cells still use a hardcoded border style and the table toolbar exposes background color but no border color/transparency control.

Conversation: The requester distinguishes configurable cell color/transparency from missing cell-border controls. A maintainer said this was not a use case to support and suggested custom CSS; another commenter offered to investigate CSS and posted a no-border rule. That workaround does not provide a native per-table border color/transparency setting.

Remaining limits: Add a supported table border color/transparency option to notebook table configuration, or explicitly document that global/custom CSS is the intended permanent scope. Current CSS can remove borders but cannot fulfill the requested UI control.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3843.

## [#3805](https://github.com/homarr-labs/homarr/issues/3805) — bug: cache invalidation for board settings not working

**addressed · full · confidence: high**

V2 saves board settings and layouts through a unified form, invalidates board/home queries, and rehydrates canonical layout values after saving.

Conversation: The one comment was read. The report describes adding/changing layouts that appear not to persist on an ultrawide Firefox board; the maintainer attributes it to stale board details/cache invalidation rather than only the form control. V2's unified settings work directly addresses that save/invalidation path.

Remaining limits: The v2 code path is explicit, but no browser reproduction was run here. Verify persistence in the reported Firefox/ultrawide scenario after a reload and across another session.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3805.

## [#3786](https://github.com/homarr-labs/homarr/issues/3786) — feat: automatic service discovery

**addressed · partial · confidence: high**

V2 discovers Docker/Homepage-labeled services and offers assisted reconciliation, but does not automatically maintain a persistent discovered-services section/widget.

Conversation: The one comment was read. The request asks Homepage-style Docker labels for name, icon, href, group, description, integrations, and a discovered-services widget/section with filtering. V2 adds label discovery and onboarding/reconciliation workflows, which cover much of the data ingestion but require review/apply steps.

Remaining limits: The code does not create a continuously populated runtime discovered-services widget/section or the requested automatic filter. Confirm whether onboarding/admin-assisted setup is an accepted replacement; otherwise the persistent discovery presentation remains open.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3786.

## [#3784](https://github.com/homarr-labs/homarr/issues/3784) — feat(app-widget): container linking & run toggling

**not-addressed · none-established · confidence: high**

V2 has Docker container actions and a modal that can create an app from a selected container, but it does not persist an app-to-container link or expose container status/start/stop controls on the native app tile.

Conversation: The body asks for a container-linking option in the app widget alongside Simple Ping and New Tab, with run toggling/status shown from the paired Docker container. It has no comments. The timeline marks a duplicate/follow-up relationship to #4085 but provides no merged implementation. Current Docker actions remain confined to the Docker widget and add-app flow.

Remaining limits: Define a durable endpoint/container reference and permission model, handle deleted or renamed containers, and add native status and lifecycle controls to the app widget. A custom widget or a separate Docker widget action does not satisfy this request.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3784.

## [#3778](https://github.com/homarr-labs/homarr/issues/3778) — feat(boards): configure default behaviour for open in new tab

**not-addressed · none-established · confidence: high**

V2 retains a per-app-widget openInNewTab switch, but has no board-level default for newly added apps.

Conversation: The one comment was read. The reporter asks for a board setting that controls whether clicking apps opens the same tab or a new tab by default, analogous to other board defaults. The current option remains attached to each app widget.

Remaining limits: Implement a board/user default and apply it when creating app widgets, while preserving explicit per-widget overrides for existing items.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3778.

## [#3771](https://github.com/homarr-labs/homarr/issues/3771) — feat(boards): open all apps

**addressed · partial · confidence: high**

V2 supports opening all apps within an individual container, including nested containers, but it has no board-wide action in the board header. The exact original request remains partially addressed; the referenced board-wide PR #6125 is closed and unmerged.

Conversation: The author asks for the top dropdown to open all apps across all categories, referring back to #1928, and one commenter volunteers to implement it. The timeline later cross-references PR #6125. That PR's body describes the exact board-header action and says it closes #3771, but its metadata says it was closed without merging and its merge commit is not an ancestor of v2. The current v2 code implements only per-container actions.

Remaining limits: Promote the shared app-opening helper to the board header, define how nested/duplicated apps and popup blockers behave, and verify it is available in view mode for read-only users as requested by the unmerged PR.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3771.

## [#3758](https://github.com/homarr-labs/homarr/issues/3758) — feat(release-widget): synchronize marked as viewed over multiple devices

**not-addressed · none-established · confidence: high**

Release-widget viewed versions are still stored in browser localStorage under one device's key. There is no per-user persisted state or server mutation, so marking a release viewed does not synchronize across devices.

Conversation: The author likes the viewed-release option but asks for it to follow the user across devices. Two comments discuss that the current implementation is localStorage-only and would need per-user widget or account data; the timeline contains no merged implementation.

Remaining limits: Persist viewed repository/version state per authenticated user, define behavior for multiple boards and repository renames, and migrate or merge existing localStorage values. Cross-device behavior needs an authenticated read/write path.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3758.

## [#3732](https://github.com/homarr-labs/homarr/issues/3732) — Release Widget: Icon only

**addressed · full · confidence: medium**

Used the board's documented keyboard resize path to persist 1x1, 2x1, and 2x2 (2xY) layouts. Captured actual rendered dimensions and text for each saved layout.

Conversation: The body praises icon-only mode and asks whether the release widget can resemble the attached design: retain the icon-only presentation at 2xY but switch to 1xY, where the version number disappears at 1x1. There are no comments. The current code restores compact v1 surfaces but does not contain a width/height-specific rule for hiding the version.

Remaining limits: The original attachment pixels and external GitHub rate-limit behavior were not used; the widget rendered against a controlled release fixture.
This confirms the reported disappearing-version behavior is fixed in the current fixture, with bounded visual confidence rather than exact legacy screenshot parity.

Checks:

- Configured the Releases widget against a local synthetic GitHub-compatible release fixture and saved the board.
- Used the board's documented keyboard resize path to persist 1x1, 2x1, and 2x2 (2xY) layouts.
- Captured actual rendered dimensions and text for each saved layout.

Evidence: [browser/results.json](browser/results.json).

## [#3731](https://github.com/homarr-labs/homarr/issues/3731) — Release Widget: Docker importable programs

**addressed · partial · confidence: medium**

V2 corrects the screenshot's GHCR provider mapping and retains duplicate filtering, but it still treats imagegenius/immich and an existing immich-app/immich repository as different provider/identifier pairs.

Conversation: The issue body and its zero comments were read. The reporter says Immich is offered as importable even though a matching repository is already configured, and that the newly imported entry does not work. The screenshots show an existing GitHub repository immich-app/immich and a Docker candidate imagegenius/immich. V2 maps ghcr.io images to GitHub Container Registry and normalizes the image before comparing it with configured repositories, improving the old provider-path error. However, alreadyImported remains an exact provider plus normalized identifier comparison, so imagegenius/immich is not considered the upstream immich-app/immich repository. That leaves the reported duplicate/identity mismatch only partly addressed; no live fetch or issue-specific regression was run.

Remaining limits: Decide whether cross-provider image identity should be canonicalized or whether the import UI should clearly explain that imagegenius/immich is a different source. Add a regression case for the screenshot's GHCR image and existing immich-app/immich entry, then verify the imported source actually serves releases.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3731.

## [#3704](https://github.com/homarr-labs/homarr/issues/3704) — bug: removed integrations keep coming back

**not-addressed · none-established · confidence: high**

The v2 seeding path still inserts a default integration when no row of that kind exists, so deleting the sole default can be undone by a subsequent migration/seed invocation.

Conversation: The report says integrations removed since v1.28/v1.29 reappeared after Docker upgrades and asks whether this is deliberate. There are no issue comments. The described trigger is consistent with startup migrations invoking default seeding, and the current source still has that behavior.

Remaining limits: Make default seeding idempotent with a stable ownership/identity rule that respects an intentional deletion, or persist an explicit opt-out. Confirm the Docker entrypoint's upgrade sequence and test deleting each affected default followed by an upgrade migration.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3704.

## [#3696](https://github.com/homarr-labs/homarr/issues/3696) — feat: Integration for Scrutiny

**not-addressed · none-established · confidence: high**

There is no native Scrutiny integration or Scrutiny-backed SMART dashboard in the v2 source. Existing Synology SMART fields and generic/custom widget facilities do not implement this requested integration.

Conversation: The requester wanted Scrutiny hard-drive information in a health widget or a native SMART overview because an iframe was not usable. Commenters questioned whether Scrutiny's export API was ready; maintainers applied a decision tag pending API feasibility. A later comment suggested using Beszel when it gained SMART values, but no decision or implementation for Scrutiny followed.

Remaining limits: Decide whether Scrutiny's API is sufficient, then add a native integration and widget/data mapping for the requested SMART values. Beszel or a custom widget can be a separate alternative, but does not close this native integration request.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3696.

## [#3675](https://github.com/homarr-labs/homarr/issues/3675) — bug: Stopping the container with SIGTERM fails

**addressed · partial · confidence: medium**

V2 consolidates tasks and WebSocket services into the Next.js process and changes the shell shutdown sequence. Redis logging and unbounded waits remain source-level concerns, but source inspection has not established whether the original Docker/Podman SIGTERM hang survives the new process lifecycle. Local fix installs signal traps before migrations and tracks the migration child: SIGTERM during migration exits cleanly in 0.205 seconds; failed migration aborts startup; final ready runtime exits cleanly in 0.666 seconds.

Conversation: The report describes Podman/Docker stop hanging after SIGTERM because websocket/Redis-backed logging processes remain alive; disabling Redis logs was a workaround. The three comments report reproduction on v1.30 and Docker, and say modifying PID waits did not resolve it. The timeline has no verified v2 shutdown fix. V2's process consolidation is relevant progress, but not sufficient evidence that the remaining handles close.

Remaining limits: Docker fixtures passed; the original Podman/deployment and pathological child processes that ignore SIGTERM were not exercised.

**Requires the local fixes to land in release/v2 before claiming this release resolution.**

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3675.

## [#3597](https://github.com/homarr-labs/homarr/issues/3597) — bug: nexcloud integration with subpaths do not work

**addressed · full · confidence: high**

V2 preserves a configured Nextcloud base path while constructing the DAV calendar endpoint, including trailing slashes and an already supplied DAV path.

Conversation: The issue body and its zero comments were read. The reporter shows tsdav resolving https://example.com/nextcloud/.well-known/basic at the host root, so a Nextcloud installation behind a subpath cannot be tested or queried through the integration. The report suggests an upstream fix or proxy workaround and was filed against 1.26.0. V2 contains a focused URL builder wired into the Nextcloud DAV client; the associated release/v2 merge (#6786) adds coverage for root, subpath, trailing-slash, and existing-DAV inputs. The direct implementation addresses the reported path loss without relying on the issue's suggested proxy workaround.

Remaining limits: Five direct assertions against the unmodified release/v2 URL helper passed (root, subpath, trailing slash, existing DAV endpoint, query/hash cleanup). A live Nextcloud calendar request, authentication and rendering remain untested; see RUNTIME-VALIDATION.md.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3597.

## [#3595](https://github.com/homarr-labs/homarr/issues/3595) — feat: Focus search bar like pre 1.0

**addressed · partial · confidence: medium**

V2 focuses the actual Spotlight search input when Spotlight opens, including after the header search control is clicked, but the persistent header search control itself is not an editable or automatically focused input. DesktopSearchInput is rendered as an UnstyledButton and MobileSearchButton is a button; opening Spotlight is required before typing into the focused field. This covers fast search entry after activation, not autofocus on page load/refresh.

Conversation: The issue asks for the pre-1.0 behavior of focusing the search bar on a new tab or refresh. The only comment says the current search bar is a button and suggests that implementing this would likely require Spotlight or a query parameter. V2 adopts Spotlight as the search surface and adds hotkeys, so the interaction model changed: users click the header control or invoke a hotkey, then receive focus in the modal. Nothing in the timeline establishes automatic focus immediately on board load.

Remaining limits: Decide whether V2 should autofocus/open Spotlight on board entry or expose a focusable persistent search field; if the original behavior remains desired, add a page-load/new-tab trigger and verify keyboard focus accessibility.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3595.

## [#3515](https://github.com/homarr-labs/homarr/issues/3515) — feat: Personalize the upper right menu bar

**addressed · full · confidence: medium**

V2's Header Studio supports per-user header item visibility, ordering, and placement across left, center, and right zones.

Conversation: Both comments were read. The request asks users to reorder individual upper-right controls and hide controls such as Docker, settings, theme, or board actions. V2 explicitly ships a customizable header and the implementation covers the requested controls and persistence.

Remaining limits: No material gap for the stated request. Verify the specific mobile/desktop arrangement only if the reporter expected separate per-device custom layouts.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3515.

## [#3512](https://github.com/homarr-labs/homarr/issues/3512) — feat: Add Support for Homey API Integration

**not-addressed · none-established · confidence: high**

V2 has no native Homey integration, Homey widget, or Homey integration kind; its existing Home Assistant support and generic Custom Widgets do not fulfill this native request.

Conversation: All 6 comments were read. The requester asks for Homey device/capability status and possibly actions/flows through the bearer-token REST API, and offers to contribute or provide access. Maintainers point to existing Home Assistant support and explain that integrations/widgets rely on entity IDs, while the requester later says Homey's device model is more complex and does not produce a completed PR. The final comment only supplies a sample device payload and asks whether maintainers would develop it. There is no later implementation or maintainer confirmation.

Remaining limits: A native Homey integration would need a registered kind, authenticated API client, device/capability and action schemas, widget configuration/rendering, permissions, and documentation. A generic Custom Widget can be a user workaround but is not evidence that this native integration request is addressed.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3512.

## [#3478](https://github.com/homarr-labs/homarr/issues/3478) — feat(login): add possibility to specify forgot password link

**not-addressed · none-established · confidence: high**

The login page still shows the built-in CLI reset instruction and has no server setting for an external password-reset URL.

Conversation: All 5 comments were read. The reporter clarified that a server setting should replace the command-line reset-password details with a custom external link, for installations that delegate password recovery to another system. No comment indicates implementation or closure.

Remaining limits: Add a validated server-level URL and render it in the login form, while retaining a useful local-reset path when unset.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3478.

## [#3407](https://github.com/homarr-labs/homarr/issues/3407) — bug: background jittering when scrolling

**needs-verification · none-established · confidence: low**

Sampled document height and horizontal width before and after the scroll. Checked browser availability for Safari/WebKit and other alternate engines.

Conversation: The report describes Safari on v1.24.0 showing a blank delay after returning from another tab and a jumpy background while scrolling. Comments ask for a reproducible board/configuration and a safe upload; the reporter says the board has no custom CSS/extensions besides Bitwarden, and another participant reports a macOS half-screen issue that went away at 90% zoom. The timeline does not document a resolution. These reports leave both browser-specific reproduction and the relationship to board settings uncertain.

Remaining limits: Safari/WebKit was unavailable; no Safari tab-background return or real macOS compositing behavior was tested.
The original background-image hardware/OS setup and recording were unavailable, so jitter and blank-tab timing remain unverified.

Checks:

- Ran a bounded Chromium scroll analogue on the populated board and returned to the original scroll position.
- Sampled document height and horizontal width before and after the scroll.
- Checked browser availability for Safari/WebKit and other alternate engines.

Evidence: [browser/results.json](browser/results.json).

## [#3371](https://github.com/homarr-labs/homarr/issues/3371) — feat: upload video backgrounds

**not-addressed · none-established · confidence: high**

V2 can render a background video URL, but the actual board-background upload path remains image-only. The shared upload validator accepts only five image MIME types, the file picker uses that same list, and the background settings page filters library media to images. Thus an MP4/WebM cannot be selected or accepted through the normal UI despite the existing renderer. A related PR was closed without merge and is not an ancestor of V2.

Conversation: The original report describes MP4 upload failing with a 400 invalidFileType response and asks for video types plus a possible 32 MiB limit. Comments reclassify it as a feature, discuss increasing the limit, and include an offer to implement it. Linked PR #6139 specifically claims MP4/WebM validation, picker, extension-aware URLs, and preview changes, but its metadata says closed, unmerged, and not an ancestor of V2. The current source confirms those changes did not land in this release branch.

Remaining limits: Allow an explicit video MIME set for board backgrounds, preserve image-only behavior for other media flows, return extension-aware media URLs, and update media listing/preview behavior and the upload-size contract.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3371.

## [#3287](https://github.com/homarr-labs/homarr/issues/3287) — feat: sidebars

**addressed · full · confidence: high**

V2 restores configurable left and right sidebar gutters, including width/column controls and preview/onboarding support, addressing the missing sidebars that blocked the reported upgrade path.

Conversation: The requester and several later users said sidebars were the main reason they stayed on v1. Maintainers initially said the feature would return without prioritizing it. In August 2026 the maintainer announced sidebars in the v2 demo, enabled through board settings and configurable from one to three columns; the requester replied that the result exceeded expectations.

Remaining limits: Users should still test migrated v1 layouts and responsive widths in their own deployment, but the requested sidebar capability is present in v2.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3287.

## [#3266](https://github.com/homarr-labs/homarr/issues/3266) — feat: Multiple Docker Environments in GUI

**addressed · partial · confidence: high**

V2 supports multiple named Docker/Podman endpoints, endpoint selection in the Docker widget, and management-page inventory across endpoints. The requested GUI endpoint creation/editing experience is still absent; endpoint configuration remains environment-driven.

Conversation: The reporter asks for several Docker instances in the management GUI, like Portainer, and for hostname overrides during imports. The seven comments explain that environment variables already supported multiple hosts, but the reporter found the setup confusing and wanted a GUI to add hosts, see columns, and configure socket and proxy endpoints together. A maintainer agreed a GUI was future work and pointed to #2477; the timeline later marked the issue duplicate without adding endpoint editing.

Remaining limits: Build a management UI to add, edit, validate, test, and remove named Docker endpoints, with secure secret/certificate handling and a clear persistence model. The existing environment configuration is a backend capability and does not complete the GUI request.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3266.

## [#3220](https://github.com/homarr-labs/homarr/issues/3220) — bug(calendar): Nextcloud integration - not all entries are displayed

**addressed · partial · confidence: medium**

V2 contains fixes for Nextcloud DAV subpaths and all-day event date handling, and the current calendar path fetches all configured calendars without a widget-side item cap. The original report's claim that several events/calendars remain missing has no complete fixture or current reproduction, so the disposition is partial pending verification.

Conversation: The reporter supplied missing/wrong-date examples. The eight comments include a maintainer retest request and clarification, confirmation that seven entries were still missing, a report that only one of three calendars appeared, a comparison where eight calendars worked in v1.38, and repeated requests to investigate or retest. The timeline later closed and reopened the issue, cross-referenced #4736, and marked it duplicate, but does not identify a merged fix that proves every reported case.

Remaining limits: Retest with the original Nextcloud version, calendar count, recurrence/all-day data, and exact time zone. Add a fixture covering all calendars and recurrence exceptions, then confirm whether unsupported VEVENT forms or server-side DAV responses still omit entries.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3220.

## [#3140](https://github.com/homarr-labs/homarr/issues/3140) — bug: Bookmark and notebook widget not working anymore

**needs-verification · none-established · confidence: medium**

Verified both markers in the live DOM after navigation and after a full reload; the board API also contained the notebook marker. Confirmed the disposable board remained private (isPublic=false), so the anonymous public-board branch could not be exercised from the available UI fixture.

Conversation: The Helm report began with edits appearing unusable. Follow-ups expanded it to edits disappearing after navigation or logout, anonymous public boards going blank after reload, client exceptions, chunk-load errors, and severe slowness. Maintainers could not reproduce it; another user observed that a refresh showed the database-saved notebook value even when in-app navigation did not. A minor notebook fix (#3401) made things start working, but the reporter still needed repeated reloads and asked to close for now in August 2026 without testing a newer version. The conversation therefore contains both a core save symptom and environment/deployment symptoms.

Remaining limits: The original Helm deployment, migration state, logout path, OIDC/session topology, and anonymous public board were unavailable in this fresh local container.
A prior public-board artifact exists for an older revision, but it is not counted as current-image proof.

Checks:

- Edited a Notebook marker through the widget editor, saved it, navigated to board settings and back, and reloaded.
- Edited a Bookmarks title through the widget editor, saved the board, navigated, and reloaded.
- Verified both markers in the live DOM after navigation and after a full reload; the board API also contained the notebook marker.
- Confirmed the disposable board remained private (isPublic=false), so the anonymous public-board branch could not be exercised from the available UI fixture.

Evidence: [browser/results.json](browser/results.json).

## [#3064](https://github.com/homarr-labs/homarr/issues/3064) — feat(integrations): store sessions for emby / jellyfin

**not-addressed · none-established · confidence: high**

The requested stored authentication session is not implemented for Emby or Jellyfin. Jellyfin's session polling still calls getApiAsync on every request; with username/password that method constructs a client and authenticates it on each call. Emby still sends its API key on each session request. A reusable encrypted Redis SessionStore exists, but neither integration consumes it and the base Integration class does not attach one.

Conversation: The issue asks Homarr to stop querying Emby/Jellyfin authentication repeatedly, reduce user-activity log noise, and invalidate a stored session when credentials change. Comments note that Emby may not support the desired API-key flow and that Jellyfin's SDK behavior could be tricky; the reporter suggests using a Jellyfin API key. That suggestion is a credential workaround, not the requested cached username/password session, and no conversation entry establishes implementation of the store.

Remaining limits: Wire a credential-fingerprinted session into Jellyfin and Emby where their clients support it, clear it when secrets change, and verify polling no longer re-authenticates; document API-key behavior separately.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3064.

## [#3055](https://github.com/homarr-labs/homarr/issues/3055) — feat: Provide SSO user information - groups and other auth info

**not-addressed · none-established · confidence: high**

V2 synchronizes some external group claims into Homarr's local group membership, but it does not expose the requested SSO information to users or administrators. OIDC profile extraction is limited to configured name and groups paths, the session contains database user fields and permissions, and the user API returns database fields only. There is no raw claims, provider metadata, or general SSO information panel in the user-management view.

Conversation: The issue asks Homarr to display all available SSO user information, using Jenkins and Azure AD group data as examples, and references a related issue. There are no comments adding a narrower scope or documenting a fix. The current group synchronization is an internal authorization behavior rather than a display feature: external groups are consumed during sign-in and mapped to Homarr groups, while the request seeks visibility into groups and other authentication claims.

Remaining limits: Add an intentional, permission-scoped SSO details surface and define which claims are retained and safe to display, including external groups and provider metadata.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #3055.

## [#2911](https://github.com/homarr-labs/homarr/issues/2911) — bug: Cannot drag apps from dynamic zone

**addressed · full · confidence: medium**

V2 migrates dynamic sections to containers and replaces the drag editor. This changes the affected code path, but there is no direct causal or runtime evidence that repeated child drags can no longer pick up the parent container.

Conversation: The body reports that after moving one app from a dynamic zone to a category, subsequent drags grab the whole dynamic zone; a second commenter reproduced the same behavior between zones, and the maintainer acknowledged the difficulty. The current timeline has no direct merged fix for the old issue, but v2's board model and editor replace the affected surface.

Remaining limits: On release/v2, drag multiple apps successively out of a migrated container and between containers. Verify the second and subsequent drags move the selected app rather than the parent, including after save/reload. Keep this issue pending that reproduction.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2911.

## [#2861](https://github.com/homarr-labs/homarr/issues/2861) — bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width

**addressed · partial · confidence: high**

V2 replaces the old category/dynamic-section layout with responsive Base, Mobile, and custom layouts plus reset/projection logic, but item membership is still persisted independently per layout and can diverge across breakpoints.

Conversation: All 13 comments were read. The original report says apps and dynamic-section contents disappear or reorder at smaller breakpoints and asks why categorization must be repeated per layout. Maintainers initially described independent layouts as expected and discussed generating other sizes from a Base layout. Multiple users argued that functional categories should survive viewport changes and reported dynamic-section membership reverting. The latest screenshots reproduce the behavior on desktop Firefox; the maintainer says v2's dashboard rewrite likely fixes it as a side effect, but no reporter confirms v2. The later discussion also contains a separate request to constrain icon minimum size.

Remaining limits: Test a migrated v1 board with categories/dynamic sections across every configured breakpoint, including edits followed by resize and refresh. If the requirement is invariant functional membership, v2 needs shared section membership or automatic synchronized updates; Base reset/projection alone does not guarantee it.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2861.

## [#2657](https://github.com/homarr-labs/homarr/issues/2657) — feat(auth): support object path for groups and username claims

**addressed · full · confidence: high**

V2 resolves dot-separated OIDC claim paths for both external group synchronization and the configurable username claim.

Conversation: All 4 comments were read. The original Keycloak report used resource_access.homarr.roles and failed because only a first-level profile key was checked. The maintainer described the recursive-path fix, and the reporter then confirmed a flat-array workaround and invited closure; the issue was renamed to a low-priority feature request. Timeline later cross-references PR #6294, which is still open against dev, but the release/v2 source already contains the path resolver and uses it in both affected flows. Current SSO documentation also advertises dot-separated paths.

Remaining limits: No issue-level implementation gap remains for the reported nested Keycloak claim. The linked PR #6294's open/dev status should not override the directly inspected release/v2 implementation; deployment-specific verification is optional.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2657.

## [#2555](https://github.com/homarr-labs/homarr/issues/2555) — feat: add settings to configure file upload limit

**not-addressed · none-established · confidence: high**

The media upload limit remains a hardcoded 32 MiB validation and single-request upload; there is no server setting or chunked upload path to raise it.

Conversation: The request asks for a server setting controlling the maximum upload size. The sole maintainer response explains that the 32 MiB reverse-proxy client_max_body_size also has to be handled and suggests file.slice-based chunking for larger files. That response makes the infrastructure and protocol requirement part of the scope.

Remaining limits: Provide a documented server/per-file limit and coordinate it with the proxy, or implement resumable/chunked uploads so files above 32 MiB can be accepted safely. The current backup-specific bound does not implement the requested media setting.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2555.

## [#2508](https://github.com/homarr-labs/homarr/issues/2508) — feat: log source ip for failed login attempts

**not-addressed · none-established · confidence: high**

V2 still does not record the source IP for failed credential logins. It emits a generic failed-login warning and username/password outcome logs, while the available IP logging is on the API-key session path and does not cover the requested web login failures.

Conversation: The issue originated in discussion #2308 and asks for failed-login source IPs so operators can build a CrowdSec collection. The three comments explain that the existing logs expose a username-not-found message or Auth.js CredentialsSignin but no source address, warn that forwarded headers need careful handling, and link related #2080. The timeline includes duplicate classification but no implementation.

Remaining limits: Capture a trustworthy client address at the authentication boundary, define proxy trust and forwarded-header precedence, and include it in failed credential login records/logs suitable for CrowdSec. Add retention and privacy decisions before calling the issue fixed.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2508.

## [#2495](https://github.com/homarr-labs/homarr/issues/2495) — feat: Redirect to login page if not logged in

**addressed · partial · confidence: high**

Anonymous users are redirected with a callback for some missing board paths, but existing public boards and management paths do not uniformly preserve the requested destination.

Conversation: The single comment was read. The reporter asked any board URL, including an invalid one, to send anonymous users to login and return them to the original URL after authentication; the comment broadened the usability request to /manage while acknowledging that anonymous endpoints are intentional.

Remaining limits: Existing public boards intentionally render without login, and management routes do not consistently retain the original destination. Decide whether the desired policy is all boards/manage routes or only protected resources, then verify each route.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2495.

## [#2482](https://github.com/homarr-labs/homarr/issues/2482) — feat: add all relevant tRPC queries / mutations as openapi endpoint

**addressed · partial · confidence: high**

V2 exposes a meaningful OpenAPI subset for apps, boards, users, invites, settings, and info, while many routers and relevant procedures remain outside the generated OpenAPI router.

Conversation: The issue's single comment was read. The request is for all relevant tRPC queries and mutations to be usable programmatically with an API key. Timeline events mark it duplicate and link the older API request #1978, but neither the duplicate marker nor that relationship establishes complete endpoint coverage. V2 has explicit OpenAPI metadata on several management procedures and a generated document, yet the canonical app router includes integrations, sections, widgets, Docker, groups, API keys, media, onboarding, and other routers that are not included in the OpenAPI router. Some procedures within included routers also lack metadata.

Remaining limits: Define the supported API surface and add metadata/output schemas for the relevant missing routers and procedures, with deliberate exclusions for sensitive or UI-only operations. The existing OpenAPI subset and API-key handler do not satisfy the stated all-relevant coverage.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2482.

## [#2480](https://github.com/homarr-labs/homarr/issues/2480) — feat: fetch app icons automatically

**not-addressed · none-established · confidence: high**

The v2 app form still relies on icon search/entered URLs and does not fetch a site's HTML icon links with a favicon fallback.

Conversation: No comments were present. The requested behavior is to fetch a URL, parse link rel=icon or apple-touch-icon, then fall back to /favicon.ico, reducing manual icon selection. The related PR #6248 is closed without a merge and is not an ancestor of v2.

Remaining limits: Native URL icon discovery and the requested fallback are absent. Do not count generic Custom Widget/API extensibility as resolving this app-form convenience.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2480.

## [#2478](https://github.com/homarr-labs/homarr/issues/2478) — feat: import / export apps

**not-addressed · none-established · confidence: high**

V2 has a full database backup archive, but not the requested selective standardized CSV/JSON app import/export.

Conversation: No comments were present. The issue asks for bulk app export/import in a portable CSV or JSON format, including app fields and categories, so users can move apps without moving all board data.

Remaining limits: A selective app export/import contract, including category/board mapping and validation, is still needed. Treat full backup restore as a different feature.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2478.

## [#2362](https://github.com/homarr-labs/homarr/issues/2362) — feat: wake on lan widget

**not-addressed · none-established · confidence: high**

There is no native Wake-on-LAN widget or integration in the V2 source. The integration export list contains media, networking, storage, and UPS integrations but no WOL or UpSnap client, and the integration definitions likewise have no WOL kind. A generic Custom Widget can make HTTP requests, but that does not supply the requested native discovery, configuration, or LAN wake behavior.

Conversation: The issue asks for a widget that sends Wake-on-LAN to remote machines. Discussion considers a command or network configuration, an UpSnap integration, and the difficulty of documenting UpSnap's API; the maintainer prefers a self-hosted WOL application when possible. A later comment observes that visiting a reverse-proxied domain can wake a machine, but that is an incidental proxy behavior and not a Homarr feature. No comment or timeline entry establishes a merged native implementation.

Remaining limits: A native integration/widget needs a safe server-side WOL action, target configuration and authorization model, and a reachable network path; an external UpSnap service could be supported separately if its API contract is stable.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2362.

## [#2294](https://github.com/homarr-labs/homarr/issues/2294) — feat: Integration with FileFlows

**not-addressed · none-established · confidence: high**

There is no FileFlows integration in the v2 integration registry or source. The referenced draft/feature branch was not merged into release/v2, and the later OIDC-related testing discussion remains unresolved.

Conversation: The body requests a native FileFlows integration and links FileFlows API material. A maintainer pointed to draft PR #6144 and asked the reporter to test an image with a backup; an automated cleanup then closed the issue for niche scope and lack of maintainer commitment. The reporter reopened it in September, reported that API/token calls worked in Postman but Homarr failed with a tRPC FORBIDDEN error behind Authentik OIDC, and suggested using an Authorization bearer token. The referenced FileFlows implementation commit is on a feature branch and is not an ancestor of v2.

Remaining limits: Add and secure a native FileFlows integration, then resolve the Authentik/OIDC request path and define its widget data and credentials. Until that work lands in v2, the issue remains open even if a Custom Widget can call a FileFlows endpoint.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2294.

## [#2160](https://github.com/homarr-labs/homarr/issues/2160) — feat: Two proxmox on one TAB

**addressed · full · confidence: high**

A single Health Monitoring widget now renders every selected Proxmox integration, addressing the report that choosing two standalone hosts displayed only the first.

Conversation: The reporter clarified in two comments that they wanted two separately configured Proxmox hosts in one widget rather than needing two widgets. They did not explicitly require merged totals or one synthesized Proxmox cluster. V2 maps all selected cluster integrations into panels within the same widget.

Remaining limits: Confirm with the two standalone Proxmox servers. Per-host panels remain separate within the widget; aggregated totals were not an explicit requirement in this conversation.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2160.

## [#2154](https://github.com/homarr-labs/homarr/issues/2154) — feat: Re-add ability to use different port number

**not-addressed · none-established · confidence: high**

The v2 image still exposes the nginx entrypoint on 7575 and does not implement the requested internal PORT environment override.

Conversation: All 7 comments were read. The original report asked to restore PORT=80 or another configurable in-container port and described failures when using PORT=80 or 7575. The discussion distinguishes the Next.js 3000 port, websocket 3001, Redis 6379, and nginx proxy 7575; a PUID/PGID workaround fixed a separate nginx startup problem. No comment closes or changes the request for an internal configurable listener.

Remaining limits: Host port mapping such as -p 80:7575 remains the operational workaround. Supporting PORT=80 inside the container would require coordinated nginx, health-check, documentation, and startup changes.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2154.

## [#2095](https://github.com/homarr-labs/homarr/issues/2095) — feat: add css templates

**addressed · partial · confidence: high**

V2 adds a moderated Workshop catalog for sharing and importing Custom CSS, but it does not implement the requested composable, parameterized CSS-template system.

Conversation: All 6 comments were read. The requester wants centrally hosted CSS fragments that can be selected in advanced item/category/dynamic-section settings or board CSS, with typed variables such as border radius. Follow-ups add colors, font size, icon size, hidden bookmark URLs, and a public repository anyone can contribute to; the requester explicitly distinguishes composable fragments from whole themes. V2's release discussion and source show community Custom CSS sharing, which covers centralized discovery and reuse of complete CSS text. The import path still replaces the current editor value, and the conversation's variable and target-scope requirements remain separate.

Remaining limits: Add a structured template format with typed variables, explicit selector/target scopes, composition semantics, and selectors for item and container settings. Workshop's raw CSS import is useful partial coverage but cannot prove the requested fragment system.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2095.

## [#2078](https://github.com/homarr-labs/homarr/issues/2078) — feat: Permission per App / App-Element / Dynamic Group

**addressed · partial · confidence: high**

V2 has global app, integration, and board permission levels plus per-board and per-integration access, but it does not implement per-app, per-item, or per-dynamic-group visibility. The current app access guard explicitly allows any logged-in user to see apps, so the requested OIDC-group-driven hiding is not addressed.

Conversation: The original request asks to hide or show apps, app elements, and dynamic groups based on OIDC groups, preferably removing hidden items and reclaiming their space. Across all 13 comments, the author first preferred complete hiding, accepted graying as a fallback, and discussed family users, Dashy-like role visibility, category/widget movement, and separate app or integration lists. Maintainers explained that automatic space filling was difficult, suggested separate boards, said the feature was not a security boundary, and later considered simpler group permissions. The latest comment asks for an update; no implementation or merged fix appears in the assigned timeline.

Remaining limits: Implement and define the native semantics for group-based visibility of apps, bookmarks, widgets, and nested containers, including layout reflow and whether hidden items are removed or merely disabled. Treat it as presentation/access control with explicit security boundaries; Custom Widgets or a user-created workaround do not satisfy native app and item filtering.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #2078.

## [#1921](https://github.com/homarr-labs/homarr/issues/1921) — feat: Add titles and folding for Dynamic Sections

**addressed · full · confidence: high**

V2 replaces Dynamic Sections with Containers that provide editable labels, collapse controls, styling, and nested grouping.

Conversation: All 10 comments were read. The reporter asked for an editable section title and a fold button/setting, then follow-ups asked for side-by-side grouping, border color, custom CSS, opacity, and more predictable collapse behavior. The linked title, folding, and border-color subissues (#2233, #2234, and #2235) are closed. The v2 design consolidates this surface as Containers.

Remaining limits: There is no dedicated opacity slider in the Container options, and the legacy transform only changes the section kind. Verify migrated boards if the opacity follow-up is still required.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #1921.

## [#1014](https://github.com/homarr-labs/homarr/issues/1014) — feat: Import browser bookmarks

**not-addressed · none-established · confidence: high**

The requested standard browser HTML bookmark import/export workflow is absent. Manually adding bookmark URLs is a workaround, not partial implementation of importing or exporting a browser bookmark file.

Conversation: The requester asked for import and export buttons using standard browser HTML bookmark files, with icon/title retrieval called out as a possible difficulty. One commenter called seamless import impossible because browsers do not expose bookmarks directly; the maintainer clarified that importing the standardized exported HTML file is feasible. That narrower file-based requirement remains the relevant request.

Remaining limits: Add a standard browser bookmark HTML importer and normalized exporter, including a defined policy for imported titles/icons and duplicate URLs. Custom widgets or manually entered links do not satisfy this native workflow.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #1014.

## [#962](https://github.com/homarr-labs/homarr/issues/962) — bug: item and dynamic section menus overlap

**addressed · partial · confidence: high**

Local V2 fix separates nested settings menus by depth, wraps them in narrow containers, and keeps collapsed menus on their card. Four menu targets passed browser hit testing in mobile/desktop fixtures.

Conversation: The issue has two screenshots and no comments. They show nested dynamic-section menu handles overlapping; one also shows an item count badge near the overlap. The timeline references unmerged PR #1184. Both historical images were downloaded and inspected, but neither is a V2 runtime capture.

Remaining limits: At one column and four nested levels, ancestor collapse controls can cover the center of the deepest expand button. Settings menus work, but the whole collapse-control layout is not fully resolved. One-row, one-column, four-level menus remain overlapping; all four stay inside their cards after the final bounds refinement. Original migrated board was unavailable.

**Requires the local fixes to land in release/v2 before claiming this release resolution.**

Checks:

- Production candidate: wide mobile/desktop and one-column mobile plus collapsed mobile/desktop settings controls all 4/4 within-card and correctly hit-tested.
- Deepest collapsed settings menu opens Edit item with Title Depth 3.

Evidence: [parent/REVIEW.md](parent/REVIEW.md).

## [#925](https://github.com/homarr-labs/homarr/issues/925) — feat: import items from another board

**addressed · partial · confidence: high**

V2 provides a working cross-board item transfer path through the clipboard. The selection toolbar exposes Copy and Paste, selected items are serialized with their kind, options, integrations, advanced options, and current-layout size, and paste creates fresh item IDs in the current board. That covers the basic request to reuse items from another board, even though it is a manual two-step workflow.

Conversation: The issue reports that the old Import item control did nothing and asks for importing items from another board, with a later reference to importing from a board list or file and previewing choices. The comments discuss permissions, distinguishing same-kind items, and a submodal or accordion preview. V2's clipboard flow was not present in that requested design discussion: the user must first open the source board, select items, copy them, then open the destination board and paste. It has no board picker, import preview, or item-selection dialog for a remote board.

Remaining limits: A board-to-board import picker with preview, permission handling, and an option to choose items without manually switching tabs would still be needed for the full proposal.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #925.

## [#437](https://github.com/homarr-labs/homarr/issues/437) — feat: add board preview

**addressed · full · confidence: high**

The manage-boards page now renders a compact visual preview for each board, matching the requested board preview rather than only listing board names.

Conversation: The request proposed either screenshots or miniature rendered boards and explicitly marked the feature low priority before 1.0. The only follow-up assigned a decision tag and asked maintainers to discuss the presentation; there was no contrary requirement in the conversation.

Remaining limits: No issue-level gap was identified. A browser check could confirm the visual fidelity at unusual board layouts, but source evidence covers the requested capability.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #437.

## [#125](https://github.com/homarr-labs/homarr/issues/125) — Dependency Dashboard

**not-addressed · none-established · confidence: high**

This is Renovate's dependency dashboard, not a product defect. It remains an open maintenance queue at the v2 commit: pending package, action, Go, mise, npm, and nvm updates are still listed, including security-related updates. The v2 release changes database support and product surfaces, but does not resolve or close every dependency-dashboard entry.

Conversation: The bot-generated body enumerates detected dependencies and pending approval, blocked, and security update branches. It has no human comments; its timeline records automated maintenance state changes and reopening rather than a product decision. The request therefore represents outstanding repository maintenance, not a feature that v2 implicitly satisfies.

Remaining limits: Keep this as an ongoing Renovate maintenance tracker rather than a V2 closure candidate. Review pending updates individually; completing one snapshot of its queue does not make the recurring dashboard obsolete.

Inherited source/runtime evidence: [previous assessment](../verification/REPORT.md) and structured `assessments.json` entry #125.
