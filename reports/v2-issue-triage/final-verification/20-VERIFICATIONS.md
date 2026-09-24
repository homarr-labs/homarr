# All 20 additional verifications

Every assigned case is included once. A completed verification attempt may still require unavailable provider, device, payload, or endurance evidence.

| Issue | Category | Disposition | Coverage | Confidence |
|---|---|---|---|---|
| [#6850](https://github.com/homarr-labs/homarr/issues/6850) bug: OIDC logout aborts the end-session request before it completes | bug | addressed | full | high |
| [#6849](https://github.com/homarr-labs/homarr/issues/6849) bug: I can't switch between the dark and light themes | bug | needs-verification | none-established | medium |
| [#6823](https://github.com/homarr-labs/homarr/issues/6823) bug: | bug | needs-verification | none-established | medium |
| [#6811](https://github.com/homarr-labs/homarr/issues/6811) bug: Annoying scroll bar | annoyance | needs-verification | none-established | medium |
| [#6620](https://github.com/homarr-labs/homarr/issues/6620) bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0 | bug | needs-verification | none-established | medium |
| [#6559](https://github.com/homarr-labs/homarr/issues/6559) bug: Releases widget showing "Only the first 1000 results are available" error | bug | addressed | full | high |
| [#6438](https://github.com/homarr-labs/homarr/issues/6438) bug: OOM with 1.71.0 | bug | needs-verification | none-established | medium |
| [#6300](https://github.com/homarr-labs/homarr/issues/6300) bug: Memory leak | bug | needs-verification | none-established | low |
| [#6271](https://github.com/homarr-labs/homarr/issues/6271) bug: TrueNAS Integration eating up memory on TrueNAS host | bug | needs-verification | none-established | medium |
| [#6177](https://github.com/homarr-labs/homarr/issues/6177) bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion | bug | needs-verification | none-established | medium |
| [#6024](https://github.com/homarr-labs/homarr/issues/6024) bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901) | bug | needs-verification | none-established | medium |
| [#5085](https://github.com/homarr-labs/homarr/issues/5085) bug: Unable to connect to LDAP | bug | addressed | partial | high |
| [#4965](https://github.com/homarr-labs/homarr/issues/4965) bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name | bug | addressed | full | high |
| [#4766](https://github.com/homarr-labs/homarr/issues/4766) bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy | bug | needs-verification | none-established | low |
| [#4738](https://github.com/homarr-labs/homarr/issues/4738) bug: Dashboard Layout - Saving Changes Failure | bug | needs-verification | none-established | medium |
| [#4406](https://github.com/homarr-labs/homarr/issues/4406) bug: OIDC not working with Cloudflare Zero Trust / SaaS | bug | addressed | partial | medium |
| [#4190](https://github.com/homarr-labs/homarr/issues/4190) bug: Cannot integrate with OMV, Invalid system information response | bug | needs-verification | none-established | medium |
| [#3732](https://github.com/homarr-labs/homarr/issues/3732) Release Widget: Icon only | qol | addressed | full | medium |
| [#3407](https://github.com/homarr-labs/homarr/issues/3407) bug: background jittering when scrolling | bug | needs-verification | none-established | low |
| [#3140](https://github.com/homarr-labs/homarr/issues/3140) bug: Bookmark and notebook widget not working anymore | bug | needs-verification | none-established | medium |

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

## [#6024](https://github.com/homarr-labs/homarr/issues/6024) — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901)

**needs-verification · none-established · confidence: medium**

The real BeszelIntegration class received a 10902-byte synthetic body containing the malformed Unicode escape shape and entered the JSON parser boundary. The observed normalized chain was IntegrationParseError -> ParseError -> Failed to parse json.

Conversation: The issue body and its zero comments were read. The reporter sees a recurring Unicode-escape SyntaxError with low visible impact and suspects an empty Beszel integration, but provides no reproduction or endpoint payload. A later triage PR considered wrapping only Beszel authentication JSON, then removed that narrow change because the report points to collection responses. The current generic integration boundary can normalize JSON parse failures, and Beszel response.json calls run inside it, but that does not establish that the reported parser exception came from JSON.parse or from Beszel. The linked narrow PR is not a release/v2 ancestor, so disposition remains unproven.

Remaining limits: The issue supplied the stack/message but no response body, endpoint, or capture. Obtain the original Beszel response or a live reproduction before attributing the parser failure to an empty integration or a specific collection route.

Checks:

- The real BeszelIntegration class received a 10902-byte synthetic body containing the malformed Unicode escape shape and entered the JSON parser boundary.
- The observed normalized chain was IntegrationParseError -> ParseError -> Failed to parse json.

Evidence: [integrations/results.json](integrations/results.json).

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
