# Full Homarr migration — numbered proposal

**125-ticket breakdown approved and published locally.** The user subsequently authorized parallel implementation; the reviewed Phase A execution is recorded in `EXECUTION.md` and `ROSTER.md`. Open design/contract holds remain, and neither approval nor dispatch proves runtime parity.

## Policy and scope

Nitro v3, Vite/React, TanStack Router and direct oRPC are selected. Nitro is the sole application build gate; old URLs, APIs, CLI commands and serialized formats may break. Preserve product capabilities and durable content through explicit conversion, not compatibility adapters or silent deletion. Production is a singleton, SQLite is default with optional PostgreSQL, Redis is removed, Mantine is retained, localization uses standalone use-intl, and production auth starts with a bounded Auth.js Core Fetch proof. Route files are descriptively named within folders, with ignored route-local helpers and proper layout/pathless/non-nested/dynamic semantics.

Work stays in this worktree. A single composition owner assembles backend/root SSR/providers, route-generation configuration, central registrations, manifests, exports, lockfile and published container builds. Feature workers own local services, contracts, route files/components and focused regressions. No real appdata, credentials or current installation is touched. The playable fixture stays unchanged until a coordinated publication.

## What the numbers mean

- The six area drafts proposed 140 units. Reconcile 15 duplicate/shared duties, combine Umami's provider and widget, and add an explicit whole-product finishing gate: **125**.
- Keep five other provider/consumer groups separate rather than force them into oversized widget tasks. The graph audit's more aggressive 120-unit variant remains an option, not a target count.
- Numbers below are **local proposal references**, not Linear identifiers. Each row has its own intended complete delivery and genuine completed-ticket blockers. Every feature's acceptance includes its actual authorized service, client/UI where applicable, durability, relevant errors and focused verification; transport-only scaffolding does not establish feature completion.
- **Start contract readiness is separate from ticket completion.** The specific request, policy, repository, option, geometry, locale, event or provider interfaces a consumer needs must be reviewed and recorded before dispatch. Do not turn broad seam labels into fictional completed issues. Contract fixtures enable isolated work, not production authorization or closure of unproven acceptance.
- **Runnable joins are not circular blockers.** A widget/provider or viewer/editor pair needs integrated evidence later; it does not require both tickets to finish before either starts. Only #41 has an additional initial service-ownership handoff blocker. #125 is the true whole-product convergence gate.
- Q11–Q15 and later detailed product/security/state choices remain explicit holds on affected implementation, not implied agreement. Original drafts contain stale decision text; `DESIGN.md` takes precedence.

## 1–21 · Foundation, durable state, identity, administration and localization

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 01 | CORE-01 — Runnable Nitro foundation and request-isolated SSR | None | A public React route renders/hydrates with a typed file route tree, safe bootstrap and recovery; protected slots deny by default. One composer accepts feature contributions without duplicate SSR/API authorities. |
| 02 | CORE-02 — SQLite and PostgreSQL product persistence | 01 | Open the real durable model, safely transact and restart on either supported engine, with explicit old-content conversion and connection/readiness ownership rather than fixture reseeding. Q11/Q12 affect the concrete adapter/conversion. |
| 03 | CORE-03 — Redis-free bounded refresh and last-good state | 01 | A real provider/widget consumer refreshes, retains permitted stale data and invalidates obsolete results. Suitable KV, SQL and singleton memory implementations preserve the selected expiry, fencing, bounds and restart duties. |
| 04 | AUTH-05 — Principal-scoped authorization and secret execution | 01 | Anonymous, user, group, admin, setup and demo cases receive the correct board/integration capability before data or secret resolution; unrelated grants never authorize the caller. |
| 05 | I18N-01 — Standalone translation engine and catalogs | 01 | Render every supported catalog through use-intl with typed namespaces, fallback, interpolation, plurals and safe rich text on server and browser. |
| 06 | I18N-02 — Locale selection, switching and RTL | 01 | Select and persist locale coherently through navigation and reload, with matching first-paint language/direction and intentional draft/error behavior. |
| 07 | I18N-03 — Request-safe culture, dates and relative time | 01 | Dates, numbers, units, calendar/table labels and relative time use an explicit clock/zone/locale without cross-request global-state leakage or hydration drift. |
| 08 | I18N-05 — Localized forms, modals and notifications | 01 | Real forms validate with localized errors, overlays preserve intended drafts/focus and asynchronous failures remain recoverable, with one notification lifecycle. |
| 09 | AUTH-01 — Local login and production sessions | 01 | Prove the bounded Core Fetch credentials bridge, then deliver real local sign-in/sign-out, session reader, browser lifecycle and recovery. Return evidence if the candidate fails; do not substitute fixture auth. |
| 10 | AUTH-02 — LDAP login and directory reconciliation | 01 | Authenticate through disposable directory fixtures and correctly reconcile profile, controlled groups and membership across success/failure/re-login. |
| 11 | AUTH-03 — OIDC login, linking and provider effects | 01 | Complete provider login/callback/logout with safe linking, groups/profile effects, trusted origins and meaningful recovery; verify protocol behavior without real credentials. |
| 12 | AUTH-04 — API-key authority and external-access management | 01 | Create, reveal once, copy and revoke keys; manage the approved token policy and API/MCP setup screen. Embed the single public explorer contribution from #121 rather than create another owner. |
| 13 | ADMIN-01 — User, profile and password administration | 01 | Manage users/profile/avatar/password under self/admin/provider restrictions; enforce approved session consequences. Supply credential services to the offline CLI owner #119. |
| 14 | ADMIN-02 — Invitations and local registration | 01 | Create/revoke invitations and complete bounded single-use local registration with server-side eligibility and ownership checks. |
| 15 | ADMIN-03 — Groups, grants and ordered home defaults | 01 | Manage groups, membership, inherited permissions, ownership and desktop/mobile defaults with transaction-safe commands and intended external-provider rules. |
| 16 | ADMIN-04 — Durable user preferences | 01 | Change appearance, units, search, calendar, header and interaction preferences and observe coherent persistence/UI/cache effects; consume tour reset from #23. |
| 17 | ADMIN-05 — Instance settings and public-safe bootstrap | 01 | Admin settings and effective public/user defaults round-trip with domain validation, safe projections, consent and correct downstream invalidation. |
| 18 | ADMIN-06 — Certificates and fingerprint-bound hostname trust | 01 | Upload/list/remove trusted roots and manage bounded hostname exceptions, securely persist them and retry authorized integration diagnostics. Own all six certificate capabilities. |
| 19 | CORE-05 — Historical and live log viewer | 01 | An authorized user reads bounded history, receives ordered/deduplicated live logs, filters and reconnects the terminal; shared backing primitives remain #03-owned. |
| 20 | CORE-06 — Task controls, status and startup work | 01 | Manage the three actual registered jobs and eight task operations through the UI, preserving enabled/manual/schedule restrictions, status, startup cleanup and safe drain/recovery. |
| 21 | CORE-08 — Production package, lifecycle and developer launch | 01 | Publish one Bun/Nitro container with correct readiness, migrations/assets/native resources, volumes, CLI/harness/developer-tool launch and bounded stop/restart. Remove excluded runtime dependencies without waiting for all feature work to begin. |

## 22–39 · Shell, dashboard, editor, apps and search

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 22 | SHELL-02 — Typed navigation and URL-driven lists | 01 | Real links, new tabs, search, pagination, query/hash state and navigation blockers behave consistently through file-route search schemas and browser history. |
| 23 | SHELL-03 — Management chrome, landing and tours | 01 | Deliver capability-aware management/home statistics, responsive navigation/header, breadcrumbs, setup guidance and durable board/management tour completion/reset. |
| 24 | SHELL-04 — Document assets, PWA and live translation | 01 | Deliver branding/head/fonts/native-image/static/PWA behavior and Crowdin activation without mismatched builds, private offline caching or duplicate document owners. |
| 25 | SHELL-05 — About, versions and application information | 01 | Render About/dependencies/contributors and safe information/demo/update/analytics presentation; compose the corresponding response contributions without duplicating refresh/job services. |
| 26 | BOARD-01 — Authorized board and home resolution | 01 | Open public/private/home boards through a safe authorized projection and canonical identity, with one board-state/cache authority and denied/missing recovery. |
| 27 | BOARD-02 — Responsive nested dashboard viewing | 01 | Render real stored sections, gutters, layouts and widget hosts at supported sizes, with collapse/focus/accessibility/app-launch behavior and persistent collapse commands. |
| 28 | BOARD-03 — Ordered editor drafts and save/leave recovery | 01 | Enter the lazy editor, coordinate concurrent commands and preserve failed/newer drafts through save/discard/conflict/navigation flows. Q13 selects unified versus retained timing. |
| 29 | BOARD-04 — Add and configure items and sections | 01 | Add/duplicate/configure/remove items, sections and containers through persisted placements, dialogs and the shared widget editor without another option-service owner. |
| 30 | BOARD-05 — Bulk editing, clipboard and undo | 01 | Multi-select, copy/paste with fresh IDs, move/delete across sections and undo reliably through the approved board command model, including keyboard/input exclusions. |
| 31 | BOARD-06 — Board overview, creation and device homes | 01 | List/create/duplicate boards and choose desktop/mobile home boards with correct caller/target validation and preference/group/instance service ownership. |
| 32 | BOARD-07 — Board presentation and settings | 01 | Save appearance/branding/background/custom CSS and other board settings with intentional dirty/discard/failure semantics and canonical identity. |
| 33 | BOARD-08 — Canonical layouts and settings/editor handoff | 01 | Create/select/edit layout modes and hand off consistently between settings and the editor without partial-save races or competing geometry ownership. |
| 34 | BOARD-09 — Board access, naming, visibility and deletion | 01 | Manage resource grants, rename/publication/delete and observe correct authorized navigation and cache revocation; old URL aliases are not a default requirement. |
| 35 | APP-01 — Apps, bookmarks, pickers and embedded forms | 01 | Manage/launch apps and reuse the same valid create/edit/quick-add/picker flows from boards, widgets, integrations and Assistant, preserving async draft/focus behavior. |
| 36 | SEARCH-01 — Search engines and shortcuts | 01 | Manage engines, defaults, supported search preferences and bangs, then execute deliberate safe external/new-tab searches. |
| 37 | SEARCH-02 — Spotlight host and preferences mode | 01 | Open one command palette with the intended interaction dispatcher, settings/preferences mode, focus and route-bound registration lifecycle. |
| 38 | SEARCH-03 — Authorized Spotlight catalogs | 01 | Search and navigate current board/app/user/group/widget/integration/management catalogs with capability filtering, refresh and correct cleanup. |
| 39 | SEARCH-04 — External, media and Assistant search actions | 01 | Execute the remaining external/media/Assistant modes with correct modifiers, selection and context; own generic integration-search orchestration against provider search contracts and the external-bangs lookup, not just their browser consumers. |

## 40–66 · Integration runtime and every provider

Provider names, native methods, auth alternatives, Stats fields and generic HTTP eligibility remain exhaustively assigned in the integration draft's per-kind ledger. Every family below owns reusable upstream execution plus its complete configure/test/authorized-consumption demonstration; none is merely an API-layer rewrite. Do not turn unavailable live installations into permission for production probing or a claimed passed compatibility matrix.

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 40 | INTEGRATION-001 — Miniflux/Mock tracer and integration runtime | 01 | Configure/test/read/delegate/delete a Miniflux connection under real principal policy, preserve Mock, and expose the common trusted execution/credential/session/registration contracts. |
| 41 | INTEGRATION-002 — Complete connection-management catalog | 01, 40 | Extend the initial management-service ownership handoff to every supported kind, masked credential mode, delegated grant, embedded form and actionable sanitized diagnostic. |
| 42 | INTEGRATION-003 — Bounded authorized generic HTTP | 01 | Resolve exact saved credential modes and execute the actual generic request feature with origin/auth/redaction/method/body/timeout/confirmation limits and its existing tool/Assistant consumer. Custom JSX's different executor stays #104-owned. |
| 43 | INTEGRATION-004 — Media/library metric providers | 01 | Configure/test and consume each assigned native library/media counter provider with correct auth, scalar projections and result meaning. |
| 44 | INTEGRATION-005 — Personal/productivity metric providers | 01 | Configure/test and consume each assigned productivity provider with complete pagination, exact credential alternatives, safe errors and Stats fields. |
| 45 | INTEGRATION-006 — Operational metric providers | 01 | Configure/test and consume each assigned operational provider through trusted Fetch/Axios paths with preserved units, results and native errors. |
| 46 | INTEGRATION-007 — Login/token-exchange metric providers | 01 | Complete provider-specific bounded login/token recovery and native metric/test flows, including the recorded Frigate HTTPS constraint or approved replacement policy. |
| 47 | INTEGRATION-008 — RPC download clients and Slskd | 01 | Configure/test and drive assigned RPC download results/actions; explicitly resolve Slskd no-op presentation rather than claim nonexistent successful controls. |
| 48 | INTEGRATION-009 — SDK torrent clients | 01 | Complete session handshakes and version-aware queue/history/actions with shared owned SDK bridges, cancellation and truthful ambiguous-write outcomes. |
| 49 | INTEGRATION-010 — Media organizer libraries | 01 | Configure/test and consume organizer libraries, calendars and missing/queued media with source-specific semantics. |
| 50 | INTEGRATION-011 — Indexers and Bazarr | 01 | List/test assigned indexers and preserve complete Bazarr status with authorized configuration and widget consumption. |
| 51 | INTEGRATION-012 — Media playback, releases and Plex images | 01 | Consume full playing/release data and safe opaque private images, reusing the shared Jellyfin/Emby mapping without cross-user sessions. |
| 52 | INTEGRATION-013 — Seerr search, requests and moderation | 01 | Search/request/moderate through all assigned Seerr-family clients, with source-specific errors, selectors, actions and authorized UI consumption. |
| 53 | INTEGRATION-014 — DNS summaries and controls | 01 | Configure/read/control supported DNS services with intended sessions and reversible, authorized actions. |
| 54 | INTEGRATION-015 — iCal and Nextcloud calendar/OCS | 01 | Read private feeds and CalDAV/OCS data with safe credentials, timezone/recurrence handling and complete native results. |
| 55 | INTEGRATION-016 — Notifications and Anchor notes | 01 | Configure/test/read/delete permitted notifications and edit Anchor notes, retaining Gotify image isolation, auth hooks and exact native/projection behavior. |
| 56 | INTEGRATION-017 — Home Assistant | 01 | Configure/test/read entities/calendars and perform explained authorized automations with explicit real-world effects. |
| 57 | INTEGRATION-018 — Host health and storage | 01 | Consume assigned host/storage/history clients with complete selectors and metrics, without accidentally granting administrator actions. |
| 58 | INTEGRATION-019 — Proxmox | 01 | Configure/test and consume cluster/node/VM/LXC health using the real token/realm policy and supported result surface. |
| 59 | INTEGRATION-020 — UniFi, OPNsense, VPN and UPS | 01 | Preserve network session/cookie/SDK/history semantics and complete assigned native readings/actions through trusted runtime resources. |
| 60 | INTEGRATION-021 — Bounded dashboard/data providers | 01 | Configure/test and consume the seven assigned transcoding/document/update/speed/uptime/model clients without hiding different result/auth contracts. |
| 61 | INTEGRATION-022 — Coolify and Traefik | 01 | Configure/test and consume complete intended orchestration read results without exposing privileged upstream methods automatically. |
| 62 | INTEGRATION-023 — Media/dashboard SDK providers | 01 | Configure/test and consume assigned media/dashboard clients with per-call isolation, complete native/projection data and safe images. |
| 63 | INTEGRATION-025 — TrueNAS connections | 01 | Preserve pooled upstream protocol fallback, configured credentials, native results and bounded reconnect/disposal/shutdown. |
| 64 | INTEGRATION-026 — Beszel upstream runtime | 01 | Preserve systems/history/alerts/actions and authenticated realtime execution with owned resource cleanup and truthful native errors. |
| 65 | INTEGRATION-027 — ArchiveTeam Warrior | 01 | Prove the actual trusted socket snapshot/native Stats path and configure/test/consume progress; HTML connection-test success alone is insufficient. |
| 66 | INTEGRATION-028 — Wazuh dual-origin queries | 01 | Configure/test and execute complete security queries across the two origins, with honest unsupported/empty/error capabilities and safe credentials. |

## 67–93 · Widget runtime, options and all widget families

The widget draft maps **all 69 kinds, 372 direct options and 25 input types** exactly once. Assistant/customApi placement ownership transfers to #98/#104. Umami's provider ownership transfers from INTEGRATION-024 to #89. Other provider and widget owners retain separate local files and complete runtime joins; no widget is complete merely because a fixture renders.

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 67 | WIDGET-RUNTIME — Saved app card and standalone widget runtime | 01 | Place/save/render a real app card through the typed registry; also own the standalone kind workbench route/layout with validated kind, login return, authorized integration selection, home-board preview context, lazy renderer, local options/advanced state, resize/edit toggle/error reset/feedback and safe unsaved IDs. Consume #68's editor rather than rewrite it. |
| 68 | WIDGET-EDITOR — Bookmark collections and common option editing | 01 | Save real bookmark collections through all supported input/validation/preview forms; own the shared option get/save service while families contribute local schemas. |
| 69 | WIDGET-TIME — Clock, countdown and timer | 01 | Configure/save/use clocks, weather/date/timezones, recurring countdowns and timer sessions with coherent lifecycle and reload behavior. |
| 70 | WIDGET-EMBEDS — Iframe and video | 01 | Save and interact with bounded iframe policies and a single video-player lifecycle, including sizing, options, permission failures and cleanup. |
| 71 | WIDGET-NOTES — Notebook and Anchor | 01 | Preserve browser-only rich Notebook content and authorized Anchor editing through saved options, permission-aware UI and durable conversion. |
| 72 | WIDGET-ENVIRONMENT — Weather, air quality and stocks | 01 | Search locations and configure/render weather/AQI/forecast/stock data with correct units, chart state and error/refresh behavior. |
| 73 | WIDGET-FEEDS-RELEASES — RSS and releases | 01 | Aggregate permitted feeds and render secret-backed release data with complete private-secret commands, filtering, links and safe stale/error behavior. |
| 74 | WIDGET-STANDALONE-LOOKUPS — Minecraft and departures | 01 | Configure/read server status and timetable/departure lookups with bounded safe networking, independent query identity and meaningful recovery. |
| 75 | WIDGET-HOME-CONTROLS — DNS and smart-home controls | 01 | Configure/render permitted summaries/entities and invoke explicit DNS/automation controls with correct use-versus-interact policy and invalidation. |
| 76 | WIDGET-DOWNLOADS — Download queues and controls | 01 | Aggregate supported clients' queue/history, persist table layout/filtering and perform safe guarded controls without incorrect retries. |
| 77 | WIDGET-REQUESTS-NOTIFICATIONS — Requests, indexers and messages | 01 | Display request lists/stats, indexer state and notifications, then moderate/test/delete only when permitted and refresh the correct consumers. |
| 78 | WIDGET-DOCKER — Container cards and operational modals | 01 | Render endpoint-scoped containers with persisted table/filter controls and tool-modal handoff; #116 owns the real Docker runtime/actions/log producer. |
| 79 | WIDGET-PLAYBACK-AUDIO — Playback, libraries and Tracearr | 01 | Configure and consume media playback/audio statistics/activity with complete fields, links, options, partial/empty/error handling and safe images. |
| 80 | WIDGET-MEDIA-DISCOVERY — Calendar, missing and released media | 01 | Display/filter the saved calendar, missing/queued media and release lists with correct dates, source identity, selection and paging. |
| 81 | WIDGET-MEDIA-JOBS — Bazarr, transcoding and Warrior | 01 | Render subtitle/provider health, transcoding queues and Warrior progress with saved options and correctly owned source/refresh behavior. |
| 82 | WIDGET-IMMICH — Photo statistics and album carousel | 01 | Select authorized albums and display counts/photo metadata with safe opaque images, stable focus/rotation and correct empty/error behavior. |
| 83 | WIDGET-HEALTH — Systems, resources and disks | 01 | Configure/render all assigned system/cluster/disk sections and charts using actual provider capabilities and preserved unit/storage semantics. |
| 84 | WIDGET-NETWORK — Network, firewall, VPN, UPS and routing | 01 | Render complete network families with saved selectors/history/options and correct unauthorized, stale and unsupported states. |
| 85 | WIDGET-SERVICE-CARDS — Coolify, Paperless, Kuma and WUD | 01 | Render each assigned service card with complete options/result fields and independent query/error/refresh state. |
| 86 | WIDGET-PATCHMON — Compliance cards | 01 | Configure and render protected compliance metrics with correct thresholds, validation, options and authorization. |
| 87 | WIDGET-PERFORMANCE — Speedtests and llama.cpp | 01 | Render saved performance history and model telemetry with correct dates/units/charts, source identity and cleanup. |
| 88 | WIDGET-STATS — Catalog-driven metric cards | 01 | Select/configure/group actual provider metrics and consume last-good snapshots with honest native/projection/unsupported capabilities and safe invalidation. |
| 89 | WIDGET-UMAMI — Umami provider and analytics charts | 01 | Configure/test cloud/selfhosted auth, select websites/events/time ranges, then persist and render analytics; own the provider and Stats projection as one complete path. |
| 90 | WIDGET-BESZEL-INVENTORY — Systems and alert inventory | 01 | Configure and render saved system tables/grids and alert history with qualified system/detail handoff and guarded actions. |
| 91 | WIDGET-BESZEL-LIVE — Historical and live system detail | 01 | Select a saved system and consume correctly merged historical/live metrics with bounded buffering, cancellation, reconnect and permission clearing. |
| 92 | WIDGET-WAZUH-RECORDS — Security record cards | 01 | Configure and render all assigned security-record consumers with exact input/query ownership, paging and honest unavailable/error behavior. |
| 93 | WIDGET-WAZUH-ANALYTICS — Security charts and rankings | 01 | Configure and render timelines, ranked threats and vulnerabilities with correct range/units/options, protected query identity and cleanup. |

## 94–119 · Assistant, Custom JSX, Workshop, onboarding, media and operations

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 94 | ASSISTANT-01 — Provider/model configuration | 01 | Configure every current Assistant preset or custom provider, discover/manual-select usable models and expose safe authenticated runtime/capability choices. |
| 95 | ASSISTANT-02 — Conversations, branches and diagnostics | 01 | Persist/navigate owned thread/message branches, model choice and feedback/telemetry, then copy/export bounded redacted diagnostics with old-content conversion. |
| 96 | ASSISTANT-03 — Incremental multimodal chat | 01 | Send supported text/attachments and receive/save semantic incremental turns, stop/recover failures and reload history through a coherent SDK/client protocol. |
| 97 | ASSISTANT-04 — Tool review, approval and continuation | 01 | Review/approve/deny curated native/browser/research/authoring tools and observe authorized changes, correct continuation and refreshed context without hidden duplicate mutation. |
| 98 | ASSISTANT-05 — Shared runs across chat surfaces and widget | 01 | Share one intended run/history/composer state across panel/sheet/other supported surfaces and the Assistant widget placement without competing executions. |
| 99 | CUSTOM-01 — Portable definition management | 01 | Create/edit/delete/import/export versioned Custom JSX definitions with correct ownership, validation, linked placements and durable content. |
| 100 | CUSTOM-02 — Legacy Custom JSX conversion | 01 | Convert/read existing legacy definitions, placements and credential references without losing supported content or claiming an incomplete migration. |
| 101 | CUSTOM-03 — Revision-safe interactive preview | 01 | Author/edit/preview/simulate actions with owned expiring encrypted preview state, atomic revision/evidence checks and complete limits/recovery. |
| 102 | CUSTOM-04 — Authoring protocols and evidence-gated saves | 01 | Deliver bounded schema/resource/prompt/template/read/patch/create/update flows through authoring clients and the correct validated preview evidence. |
| 103 | CUSTOM-05 — Scoped secrets and human configuration | 01 | Configure source/secret bindings and complete expiring one-claimant human requests without secret delivery, cross-user mutation or ambiguous terminal state. |
| 104 | CUSTOM-06 — Protected runtime and customApi widget | 01 | Render/place/configure the customApi kind and execute its scoped reads/actions through the secure runtime, query/status/refresh/option bridges and bounded executor. |
| 105 | WORKSHOP-01 — Browse, review and install | 01 | Browse/search/details/review/import/install through actual Homarr-facing Workshop contracts, preserving safe metadata and selected content/placement. |
| 106 | WORKSHOP-02 — Workshop identity and publishing | 01 | Sign in independently and publish/update/vote/report through the existing remote service's supported contract without replacing its excluded runtime. |
| 107 | WORKSHOP-03 — Reviewed CSS import | 01 | Inspect/review Workshop CSS and import it into the chosen board/settings draft with safe failure/dirty behavior. |
| 108 | WORKSHOP-04 — Hosted Assistant identity and quota | 01 | Connect the hosted provider using the exact authorized identity/token/quota contract and consume it from real configuration/chat flows. |
| 109 | DATA-01 — Setup claim, account/group and completion | 01 | Own bounded setup claim/current-step transitions, initial identity orchestration and finish flow with correct recovery and no competing onboarding-claim owner. |
| 110 | DATA-02 — Discovery and atomic setup-board planning | 01 | Detect permitted runtime capabilities, test/select discoveries and atomically create/reuse the intended setup board through reusable integration/app services. |
| 111 | DATA-03 — Backup export and archive preview | 01 | Own the backup screen/decoder/inspect/export/snapshot flow with bounds and confidentiality; supply the preparation contract consumed by restore. |
| 112 | DATA-04 — Complete content/crypto conversion and restore | 01 | Convert every encrypted/reference family, prepare/apply under exclusive maintenance and recover on failure; own restore panel/maintenance/replacement, consuming engine primitives and #111 preparation. Q12/Q15 affect the matrix. |
| 113 | MEDIA-01 — Durable media upload and display | 01 | Upload/list/delete/select/render media with bounded safe formats, ownership, durable bytes and actual multipart/binary delivery. |
| 114 | MEDIA-02 — Opaque private-image delivery | 01 | Register/resolve expiring encrypted image handles and serve authorized safe responses, preserving intended already-rendered URL lifetime and credential isolation. |
| 115 | MEDIA-03 — Icon sources, synchronization and picker | 01 | Fetch all five repository sources plus local media, transactionally synchronize/rank/license/search/select icons and consume them in real forms; #20 schedules the service. |
| 116 | OPS-03 — Complete Docker tools runtime | 01 | Own real endpoint/client/inventory/actions/discovery/log producer and management UI; preserve cancellation/late setup cleanup and provide #78 consumer contracts. |
| 117 | OPS-04 — Kubernetes contexts and topology | 01 | Own cluster/context clients and render permitted contexts/topology/node/namespace/count flows with safe configuration and resource lifetime. |
| 118 | OPS-05 — Kubernetes resource tools | 01 | Own assigned workload/network/storage/config/secret adapters and screens with correct resource access, actions, sensitive projections and failure cleanup. |
| 119 | OPS-10 — Application operations CLI | 01 | Deliver executable administration/integration/password/admin recovery commands using the actual domain services, with deliberate new syntax and safe offline lifecycle. |

## 120–125 · Shared protocols and final convergence

| # | Draft key and title | Blocked by | End-to-end delivery |
| --- | --- | --- | --- |
| 120 | TRANSPORT-RPC — Browser and direct-server Fetch RPC | 01 | One real authorized query/mutation works through browser and direct server calls with safe contracts/errors/rich values, per-request identity and intentional API misses. Feature owners supply all procedure semantics. |
| 121 | TRANSPORT-REST — Curated public API and explorer | 01 | Publish/call a deliberate public read/write/error contract and inspect accurate documentation in the sole explorer component, including an admin-guarded standalone reference route consumed by #12's tools screen. Public document access never grants anonymous access to the guarded UI or internal tree. |
| 122 | TRANSPORT-MCP — Curated tools, resources and dispatch | 01 | External and internal clients discover/invoke an authorized catalog and authoring resources through safe schema/diagnostic/result handling; candidates are not automatically broadened into tools. |
| 123 | TRANSPORT-OAUTH — MCP registration, login and PKCE | 01 | Complete real registration/discovery/login continuation/single-use code exchange/tool invocation with approved token authority, origin, consent and expiry behavior. Core auth proof gates real acceptance, not all local service work. |
| 124 | TRANSPORT-STREAMS — Bounded live delivery and cleanup | 01 | Deliver all four real log/task/Docker/Beszel event contracts with correct framing/reducers/backpressure/reconnect/revocation/shutdown on the approved host; Assistant and MCP framing remain separate. Q14 is unresolved. |
| 125 | FINAL-01 — Integrated product, contraction and measured finish | 01–124 | Ship the full selected product and conversion/recovery path; reconcile every capability and runtime dependency, run final scoped checks/focused evidence and publish honest performance/limitations without fixture-only parity claims. |

## Cross-area transfers that must not lose coverage

1. Root/SSR shell joins #01; logs join #19; tasks join #20; certificates join #18; key/API setup joins #12/#121; navigation joins #22; tours/management landing join #23; About joins #25; document/PWA/Crowdin join #24; harness/package launch joins #21.
2. Short-lived security-state behavior becomes feature-local: preview #101, configuration requests #103, integration sessions #40, image handles #114 and setup claims #109. #03 supplies common atomic/clock/expiry primitives; #04 supplies crypto/policy.
3. Archive/export/preview belongs #111; complete crypto/reference conversion, maintenance and live replacement belong #112. Backup parent-screen ownership is singular; onboarding consumes exported restore UI rather than rewriting it.
4. Apps/pickers/embedded create/edit join #35. Assistant widget joins #98; customApi and its custom inputs join #104. WIDGET-EDITOR #68 owns common option get/save; BOARD-04 #29 owns placement/dialog hosting.
5. Generic integration request is a complete #42 feature, not an orphan handoff to Custom JSX. Docker and Kubernetes client guts belong #116–118, not invented integration kinds. Icon upstream fetchers belong #115.
6. Physical schema/migrations have one #02 writer; domain commands and projections remain their ticket owners. Central registries/manifests/root/source assembly always belong the composer; feature-local factories/registries have their explicit owner.

## Evidence and source coverage

The eight source inventories and six drafting ledgers remain the detailed evidence for each row's kinds/options/procedures/models/protocols and acceptance obligations. Final local ticket publication must copy the specific obligations, apply these transfers, bind every exact leaf to a surviving number and remove stale architecture questions; this proposal is not a replacement for those bodies.

- Source totals: 61 page entries and layouts/fallbacks; 334 application procedures; 52 curated REST selections; 133 static MCP candidates; 26 HTTP files/38 method rows; 69 widget kinds/372 options/25 input types; 89 integration kinds/86 Stats implementations/87 HTTP-eligible kinds; 40 durable models. Counts are source capabilities, not mandatory identical target names/catalog counts.
- [Graph audit](GRAPH-AUDIT.md) supplies exact original-key merges, orphan corrections, contract-readiness records and false-cycle repairs. The conservative 125-unit candidate keeps the five conditional provider distributions separate.
- [Coverage audit](COVERAGE-AUDIT.md) reconciles every census but found semantic labels without actual ticket bindings, missing standalone workbench/executor scope and operational ownership gaps. This proposal adds those scopes and resolves the duplicate ownership; the exact per-leaf/page/method owner join still needs publication into the numbered coverage ledger. No observed runtime parity pass is claimed.

## Questions before publication

1. Numbered granularity and native blocker graph are approved; publish them without silently changing the count or predecessor edges.
2. Q11–Q15 and the dependent design frontier in `DESIGN.md` remain readiness holds for affected work.
3. Record the specific reviewed contract revisions required by each consumer; contract readiness is not an invented completed-ticket dependency.
4. Confirm one composition writer and exclusive feature allocations before any implementation dispatch.
5. Linear remains at its free issue limit: approved local fallback is one file per ticket with these numbered blockers, not invented Linear IDs or deletion of unrelated issues.
