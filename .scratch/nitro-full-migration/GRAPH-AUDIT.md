# Full migration graph audit

Planning recommendation only. Not approval, publication, implementation readiness or executed verification. This audit owns only this file. The six drafts, research, tracker, application, dependencies, data and playable fixture remain unchanged. No checks, runtime probes or nested agents were used.

## Outcome

The six drafts contain **140 proposals: core 25 + dashboard 20 + widgets 28 + integrations 28 + extended 34 + transports 5**. They are rich coverage inventories, but not yet one executable DAG. The main problems are conflicting primary ownership, mutually graded completion, unbound semantic seam references, several oversized contexts and no explicit whole-product terminal node.

Recommend **119 implementation units plus one explicit finishing unit = 120**. This removes 21 existing proposals through the exact merges/distributions below and adds FINAL-01. Five of the provider distributions require a reuse/sizing review: if they do not fit, retain those five original integration units, giving **125**, rather than create oversized feature tasks to hit 120. Neither number is a mathematically proven minimum or a final agreement. It is the smallest defensible candidate from this static audit; additional reductions need evidence, not a numerical target.

Do not publish the drafts unchanged or add native blockers for the reserved words FOUNDATION/PERSISTENCE/etc. First reconcile ownership, decide the remaining policy choices, present the numbered graph for approval, and only then publish one file per approved local ticket or real tracker issue, with actual resolved blocking IDs.

## Authority corrections before reconciliation

DESIGN.md is authoritative over the drafts' stale questions:

- Singleton: one active backend per data directory; no replicas, cluster workers or rolling overlap. Drain/restart/recovery still matter. Remove replica-election and distributed-deployment requirements from ticket scope; retain the actual singleton exclusion/atomicity requirements.
- SQLite default **and optional PostgreSQL** are retained. Q11 leaves ORM/driver selection unresolved; Drizzle is neither mandated nor rejected, and db0 is not an approved production result.
- Mantine and the recognizable dashboard/editor are retained. Standalone use-intl behind the translation facade is selected, not merely recommended. All 36 locale catalogs/rich/plural capabilities remain in scope.
- Investigate direct Auth.js Core Fetch integration first using the bounded credentials/LDAP bridge spike. A candidate evaluation is not a proven production bridge or approval of a replacement.
- File-based TanStack routes use folders and descriptive filenames, route-local ignored helpers and the required root/index exceptions. Code-versus-file routing is no longer open. The transport draft's literal “folders named files” is not a requirement in DESIGN.md.
- Redis is removed. Remove “Redis may remain” alternatives and optional Redis elimination language. Nitro KV is preferred where suitable; transaction/CAS/security/TTL/fanout semantics still require per-service evidence and ownership.
- Nitro is the only application build gate. Old API/URL/CLI/serialized contracts may break, but intended capabilities and durable content require explicit conversion. No simultaneous Next build or default old-contract shim.
- Focused security, durable-conversion and critical-flow regressions are authorized at implementation time. No checks now, broad suites or full-repository typecheck. Keep the fixture available and untouched.
- **Q11–Q15 remain open:** SQL stack; copied-data importer versus in-place upgrade; atomic board draft; primary live transport/listener; old-session continuity versus intentional re-login. Other detailed token, locale/time, freshness, scheduler and source-discrepancy policies also require explicit dispositions. None is settled by this audit.

AUTH-05's foreign-grant fix, AUTH-01's origin/session changes, membership symmetry, anonymous media access, no-op controls, option validation, cached revocation and other “fix” wording are proposals/hold conditions, not automatic user approval. Equally, capability preservation does not require reproducing bugs. Record the evidence, candidate intended policy, affected data/UX and approval owner; keep an unsafe or undecided surface unavailable rather than silently choose either policy.

## One central writer, feature-local exclusivity

Assign **one person/session as COMPOSITION writer**, owning CORE-01, later CORE-08 and FINAL-01 integration/publication work. These are different bounded deliveries by the same writer, not parallel ownership of the same files. The writer remains the only editor of central application sources throughout feature waves.

| Surface | Exclusive writer and contribution rule |
| --- | --- |
| Central Nitro entry/plugins, service graph, request assembly, route precedence, backend RPC/REST/MCP registration | COMPOSITION; transport and feature owners export local adapters/descriptors, never edit central assembly |
| Root SSR document, client entry, request-local Router/Query construction, provider order, replay, root error/status handling, global effect dispatch | COMPOSITION; eliminate competing CORE-01/SHELL-01/localization root writers |
| Central route/type generation configuration and registration, global exports, root/app/package manifests affected by migration, catalog/version decisions, lockfile, build/container/resource publication | COMPOSITION; dependency/export requests enter a queued contribution ledger. Generated output also has this writer |
| Physical SQL schema, migration assembly, journals, driver factories, connection/transaction implementation | CORE-02 feature-local domain; declarations from feature owners, no competing schema edits. COMPOSITION mounts/ships it |
| Coordination backing stores, common CAS/lease/generation primitives, internal namespaces and common in-process fanout | CORE-03 local modules; consumers own their store-specific behavior/adapters. COMPOSITION installs the backend descriptor |
| Auth cookies/effects and session reader/verifier; policy/crypto | AUTH-01 and AUTH-05 respectively, separate local files; mounts/providers/bootstrap are COMPOSITION |
| Integration definitions/factories/outbound bridges and widget metadata/editor registries | INTEGRATION-001, WIDGET-RUNTIME, WIDGET-EDITOR each owns its own feature-local registry only; application backend/root registration is COMPOSITION |
| Locale catalogs/facade/formatting and route/form primitives | I18N-01/02/03/05 and SHELL-02 local modules; none owns root/provider installation |
| Scheduler/job bodies and local registry; logs/history; trust; backup; icons | CORE-06; CORE-05; ADMIN-06; DATA-03/04; MEDIA-03, with local contributions to COMPOSITION |
| Spotlight and management navigation | SEARCH-02 owns the local Spotlight dispatch registry; SHELL-03 owns local navigation/tour metadata. Central installation stays COMPOSITION |

“One writer” does not mean that COMPOSITION rewrites every repository, feature handler, loader, widget or provider. Its work is assembly/publication and cross-boundary integration. Every feature-local module, route, form, descriptor, service and focused regression has one exclusive owner. A shared table is not a shared source-file editing license. A producer hands a typed contribution to a consumer; it does not edit that consumer's source concurrently.

Before dispatch, create an actual file allocation for each approved unit. Resolve shared package exports, not just root manifests. If two owners need the same feature-local file, merge their unit or perform an explicit dated producer→consumer ownership handoff. Do not rely on “both coordinate” wording.

## Exact original-key merge and handoff map

### Mandatory ownership reconciliation — 15 proposals removed

These eliminate duplicate vertical delivery or thin bridge-only work. They are not behavior deletions.

| Original keys | Surviving primary unit(s) | Exact transferred scope / boundary |
| --- | --- | --- |
| CORE-01 + SHELL-01 | **CORE-01** | Minimal public-safe runnable host, root SSR/client/providers/request-local routing/query/effects, deny-by-default protected slot and central ownership. Do not grade all migrated routes to close this expansion. CORE-08/FINAL-01 own later assembly gates |
| CORE-05 + OPS-01 | **CORE-05** | Whole authorized log history→subscription→terminal/filter/focus/resize/reconnect flow. CORE-03 owns common fanout/CAS backing primitives; CORE-05 owns log-specific history/buffer/dedup and sample-history implementation. Provider-specific Docker/Beszel payloads remain elsewhere |
| CORE-06 + OPS-02 | **CORE-06** | Task configuration/service/endpoint/UI/status, three actual jobs, startup cleanup and drain. Preserve eight task capabilities and restrictions. Local job registry is CORE-06; central startup mounting is COMPOSITION |
| CORE-04 distributed | **CUSTOM-03, CUSTOM-05, INTEGRATION-001, MEDIA-02, DATA-01** | CUSTOM-03 owns PreviewSessionStore plus preview limits/revision/evidence; CUSTOM-05 owns ConfigurationRequestStore and token one-applier flow; INTEGRATION-001 owns IntegrationSessionStore adapter; MEDIA-02 owns ImageRegistrationStore and opaque retrieval; DATA-01 owns SQL onboarding claim/step orchestration. CORE-03 owns shared atomics only; AUTH-05 owns crypto/policy. Keep every TTL/bound/restart rule from CORE-04 |
| CORE-07 + DATA-03 + DATA-04 | **DATA-03 and DATA-04** | DATA-03 owns bounded archive decoder/inspect/snapshot/export, browser preview and packaged SQL/WASM requests. DATA-04 owns complete crypto/reference conversion, prepare/apply/recovery, MaintenanceCoordinator and restore UI/onboarding handoff. DATA-03→DATA-04 has an explicit archive-preparation API; only DATA-04 edits live replacement modules. CORE-02 supplies engine primitives; CORE-08 supplies startup/drain/supervision. Do not make one enormous archive+restore+UI context |
| ADMIN-06 + OPS-06 | **ADMIN-06** | Whole secure TrustFileStore/SQL hostname+fingerprint/service/upload/list/remove/UI flow. Preserve all six certificate capabilities and integration remediation handoff, not just install/list. INTEGRATION-002 owns its diagnostic retry caller; it never edits trust storage |
| AUTH-04 + OPS-07 | **AUTH-04** | Key authority/one-time reveal/copy/revoke and API/MCP management instructions. TRANSPORT-REST owns API specification and reference/explorer component; AUTH-04 embeds/link-consumes it rather than becoming a second explorer owner. TRANSPORT-OAUTH remains the flow/state owner |
| OPS-08 + tour portions of ADMIN-04/SHELL-03 | **SHELL-03** (tour flow), **ADMIN-04** (other preferences) | Move getTourStatus/completeTour/resetTours, tour flags' command behavior, board/management targets and profile reset component to SHELL-03. CORE-02 preserves physical user fields. ADMIN-04's page hosts the exported reset control but does not re-port its service/state |
| OPS-09 distributed | **SHELL-03, SHELL-05, CORE-03, CORE-06** | SHELL-03 owns home.getStats and management landing/counts/nav; SHELL-05 owns About plus four responses, info.getInfo/isDemoMode/isDemoReadOnly projections and update/analytics presentation descriptors; CORE-03 owns updateChecker refresh/state/service; CORE-06 owns analytics send/job body/service. ADMIN-05 owns consent/settings only. No duplicate update/analytics network bodies |
| I18N-04 + SHELL-02 | **SHELL-02** | One routed Link, debounce/search/page parser, query/history normalization, blocker adapter and mutation-effect convention. Move I18N-04's ledger rows here; real board/app forms remain feature-local, not shared navigation ownership |
| I18N-06 + SHELL-04 + OPS-12 | **SHELL-04** | Fonts/known native-image adapter, safe head/theme/static/PWA manifest/service-worker and Crowdin activation all live here. I18N-01 keeps cr markers/catalog identity; I18N-02 owns locale switch semantics. COMPOSITION emits document/CSP/resources; MEDIA-01/02 own fetched media. No invented offline caching/push requirement |
| OPS-11 + packaging/launcher portions of CORE-08 | **CORE-08** | Harness lazy-dispatch adapter and Go developer-tool launch/provenance consumer contract join one packaging/resource/launcher delivery. Do not rewrite excluded Go tools or run them now. OPS-10 remains application domain CLI |
| APP-01 + APP-02 | **APP-01** | App CRUD/list/safe launch and the already shared form/picker/quick-add/embedded completion flows. Preserve dirty async forms/focus/return and assistant/integration callers. This is one resource capability, not separate page versus modal implementations |
| WIDGET-EXTENDED-BRIDGES distributed | **ASSISTANT-05 and CUSTOM-06** | ASSISTANT-05 owns assistant widget-local renderer/slot/placement bridge. CUSTOM-06 owns customApi kind-local definition/options/placement/query/action/status/refresh bridge and customWidgetSelect/customWidgetConfiguration inputs. WIDGET-RUNTIME/EDITOR receive descriptors. No second chat/interpreter/source implementation |

Count of removed original keys: SHELL-01, OPS-01, OPS-02, CORE-04, CORE-07, OPS-06, OPS-07, OPS-08, OPS-09, I18N-04, I18N-06, OPS-12, OPS-11, APP-02, WIDGET-EXTENDED-BRIDGES = **15**.

### Provider/consumer consolidation — six more proposals removed

Providers remain distinct local implementations and preserve every native method, auth mode, Stats projection and generic-HTTP hook. The consolidation is a fresh-context capability delivery with managed configure/test and an actual consumer, not “UI skips backend acceptance.” Reuse source bodies rather than rewrite SDKs gratuitously. INTEGRATION-002 still owns reusable connection forms; INTEGRATION-003 owns exact-mode generic HTTP assembly.

| Original provider unit | Surviving primary unit(s) | Precise allocation |
| --- | --- | --- |
| INTEGRATION-024 | **WIDGET-UMAMI** | Umami native cloud/selfhosted client, auth/session hooks, website/event/time results and Stats projection join its selector/chart consumer. One provider and one widget already share the same query graph. This is the strongest consolidation candidate |
| INTEGRATION-016 | **WIDGET-NOTES**, **WIDGET-REQUESTS-NOTIFICATIONS** | Anchor client/native note composition/Stats/auth hook → WIDGET-NOTES; Ntfy and Gotify clients/native notification composition/Stats/auth hooks/images/delete → WIDGET-REQUESTS-NOTIFICATIONS. Nextcloud client remains INTEGRATION-015. Partition common notification DTO helpers before editing |
| INTEGRATION-021 | **WIDGET-MEDIA-JOBS**, **WIDGET-SERVICE-CARDS**, **WIDGET-PATCHMON**, **WIDGET-PERFORMANCE** | Tdarr native queue/stat client → MEDIA-JOBS; Paperless/UptimeKuma/WUD native clients → SERVICE-CARDS; PatchMon client → PATCHMON; Speedtest/llama.cpp clients → PERFORMANCE. All seven provider definitions/checks/H modes/native fields/Stats projections transfer exactly once |
| INTEGRATION-022 | **WIDGET-SERVICE-CARDS**, **WIDGET-NETWORK** | Coolify complete native client/result surface → SERVICE-CARDS; Traefik complete HTTP/TCP/UDP reader/detail surface → NETWORK. Sensitive unused client methods do not become new exposed endpoints. Docker/Kubernetes never transfer here |
| INTEGRATION-023 | **WIDGET-IMMICH**, **WIDGET-PLAYBACK-AUDIO** | Immich per-call SDK/client/albums/assets/stats/H hooks → IMMICH; Tracearr/Audiobookshelf/Navidrome native clients/results/Stats/H hooks → PLAYBACK-AUDIO. Keep source-only capability methods even when a widget does not display them; record their callable authorized consumer/disposition |
| INTEGRATION-027 | **WIDGET-MEDIA-JOBS** | Warrior HTML test, trusted upstream socket snapshot/native Stats and complete progress consumer. It is one feature path, not an independent permanent upstream-websocket infrastructure ticket |

The last five distributions are conditional on a fresh-context sizing review. In particular MEDIA-JOBS would own three distinct native seams (Bazarr consumed from INTEGRATION-011, Tdarr and Warrior implemented locally); SERVICE-CARDS would implement Coolify plus three smaller clients; PLAYBACK-AUDIO would implement three independent clients. If source adaptation is substantial, retain **INTEGRATION-016/021/022/023/027** with exact local file boundaries and their own runnable managed/native demonstration. That yields 125 total, not five new generic API-only tasks. Do not merge INTEGRATION-020's UniFi/session/firewall internals into six network widgets merely to reduce count.

### Retained original keys — exhaustive disposition

Every original key is either in the 21-removal list above or retained below. Partial transfers in retained units are explicitly described above; no hidden “remaining” units.

| Area | Retained keys | Count |
| --- | --- | ---: |
| Core | CORE-01, CORE-02, CORE-03, CORE-05, CORE-06, CORE-08; AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05; ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06; I18N-01, I18N-02, I18N-03, I18N-05 | 21 |
| Dashboard | SHELL-02, SHELL-03, SHELL-04, SHELL-05; BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05, BOARD-06, BOARD-07, BOARD-08, BOARD-09; APP-01; SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04 | 18 |
| Widgets | WIDGET-RUNTIME, WIDGET-EDITOR, WIDGET-TIME, WIDGET-EMBEDS, WIDGET-NOTES, WIDGET-ENVIRONMENT, WIDGET-FEEDS-RELEASES, WIDGET-STANDALONE-LOOKUPS, WIDGET-HOME-CONTROLS, WIDGET-DOWNLOADS, WIDGET-REQUESTS-NOTIFICATIONS, WIDGET-DOCKER, WIDGET-PLAYBACK-AUDIO, WIDGET-MEDIA-DISCOVERY, WIDGET-MEDIA-JOBS, WIDGET-IMMICH, WIDGET-HEALTH, WIDGET-NETWORK, WIDGET-SERVICE-CARDS, WIDGET-PATCHMON, WIDGET-PERFORMANCE, WIDGET-STATS, WIDGET-UMAMI, WIDGET-BESZEL-INVENTORY, WIDGET-BESZEL-LIVE, WIDGET-WAZUH-RECORDS, WIDGET-WAZUH-ANALYTICS | 27 |
| Integrations | INTEGRATION-001, INTEGRATION-002, INTEGRATION-003, INTEGRATION-004, INTEGRATION-005, INTEGRATION-006, INTEGRATION-007, INTEGRATION-008, INTEGRATION-009, INTEGRATION-010, INTEGRATION-011, INTEGRATION-012, INTEGRATION-013, INTEGRATION-014, INTEGRATION-015, INTEGRATION-017, INTEGRATION-018, INTEGRATION-019, INTEGRATION-020, INTEGRATION-025, INTEGRATION-026, INTEGRATION-028 | 22 |
| Extended | ASSISTANT-01, ASSISTANT-02, ASSISTANT-03, ASSISTANT-04, ASSISTANT-05; CUSTOM-01, CUSTOM-02, CUSTOM-03, CUSTOM-04, CUSTOM-05, CUSTOM-06; WORKSHOP-01, WORKSHOP-02, WORKSHOP-03, WORKSHOP-04; DATA-01, DATA-02, DATA-03, DATA-04; MEDIA-01, MEDIA-02, MEDIA-03; OPS-03, OPS-04, OPS-05, OPS-10 | 26 |
| Transports | TRANSPORT-RPC, TRANSPORT-REST, TRANSPORT-MCP, TRANSPORT-OAUTH, TRANSPORT-STREAMS | 5 |
| Finishing | New FINAL-01 | 1 |
| Total | 119 retained original keys + FINAL-01 | **120** |

OPS-10 receives ADMIN-01's offline password/admin-recovery command entry implementation; ADMIN-01 owns credential algorithms/session consequences, not a second CLI entry. INTEGRATION-002 supplies offline integration command service to OPS-10. CORE-08 publishes the executable. This is a partial handoff, not a third user recovery ticket.

## Additional ownership gaps/conflicts to repair

These are concrete corrections to coverage accounting, not extra horizontal tickets.

1. **Generic arbitrary integration request is not owned end to end.** INTEGRATION-003 says extended owns executor/API/UI, but no extended ticket claims integration.request as a complete generic HTTP feature. CUSTOM-06's DNS-pinned Custom JSX executor is explicitly different. Expand INTEGRATION-003 to own the generic request service/executor, authorized endpoint and existing tool/Assistant review consumer, including exact origin/auth/redaction/method/body/timeout/confirmation bounds. Keep the two executors separate; do not impose one universal SSRF policy by assumption.
2. **Docker/Kubernetes client guts are orphaned by the proposed handoffs.** Dashboard assigns them to integrations, integration draft assigns them to extended, and extended excludes their clients as another owner's work. No Kubernetes IntegrationKind exists; Docker is outside the 89-provider ledger. Assign complete Docker endpoint runtime/inventory/actions/discovery/log producer + tools UI to OPS-03. Assign Kubernetes clients/context/topology to OPS-04 and six resource adapter/screen modules to OPS-05. WIDGET-DOCKER consumes OPS-03; no new IntegrationKind or phantom provider ticket.
3. **Icon fetch/refresh bodies have no named integration unit.** MEDIA-03 currently excludes them and CORE-06 calls an unspecified owner. Assign all five repository fetchers plus local-media icon query/replace/ranking/license/picker domain to MEDIA-03. CORE-06 invokes its transactional synchronization service. Six named source families remain counted; no sixth background job.
4. **Common option service is split among runtime/editor/board without one owner.** Assign widget.options.getWidgetOptionSettings/saveItemOptions service/validation/authorized persistence wrapper to WIDGET-EDITOR, using WIDGET-RUNTIME's metadata and BOARD-03's ordered command contract where Q13 requires it. Family owners contribute local schemas/inputs only. BOARD-04 owns picker/placement/dialog hosting, not a second widget editor. Table option commands consume this wrapper; WIDGET-DOWNLOADS owns the shared debounce primitive only.
5. **Home command versus preference write.** BOARD-01 owns read/resolution; BOARD-06 owns setHomeBoard/setMobileHomeBoard orchestration; ADMIN-04 owns user preference write/clear semantics; ADMIN-03 owns ordered group defaults; ADMIN-05 owns instance defaults. Exactly one service per command, not three different home-policy implementations. Agree the target-user/mobile policy before mounting.
6. **Native provider composition versus widget procedure composition.** Provider owns upstream protocol/auth/result composition; widget owns its saved-placement query/action orchestration and widget endpoint. Shared helpers belong to one owner. Do not recreate the same provider cache/authorization wrappers independently in INTEGRATION-001, CORE-03 and every widget.
7. **Health and manifest attribution in transport ledger is semantic, not final ownership.** Health handlers/readiness are CORE-08, public info projections SHELL-05, manifest/Crowdin/known images SHELL-04. COMPOSITION mounts them. The old core/integrations/extended area totals cannot remain the final owner totals after reconciliation.
8. **Archive screen parent ownership.** DATA-03 owns backup screen assembly/inspect-export panels; DATA-04 supplies local restore panel/handler and owns replacement engine. DATA-01 owns onboarding page and consumes restore component. Never let both backup units edit the parent page.

### Exact representative application-leaf owner rebinding

The 334-row transport census needs a key join, not another endpoint census. Rebind its semantic owner labels using the feature draft's actual procedure ledger, with these conflict resolutions:

| Source capability / semantic family | New exact primary key |
| --- | --- |
| log.subscribe; log UI/history | CORE-05 |
| cronJobs eight leaves | CORE-06 |
| certificates six leaves / hostname UI | ADMIN-06 |
| apiKeys three leaves / API tools | AUTH-04 |
| user.getTourStatus/completeTour/resetTours | SHELL-03 |
| home.getStats | SHELL-03 |
| info.getInfo/isDemoMode/isDemoReadOnly | SHELL-05 |
| updateChecker.getAvailableUpdates | CORE-03 |
| analytics.sendAnalytics | CORE-06 |
| icon.findIcons | MEDIA-03 |
| location.searchCity | WIDGET-ENVIRONMENT |
| integration.request | INTEGRATION-003 (including previously unassigned executor) |
| integration management selectors/CRUD/test/delegation | INTEGRATION-002 after 001→002 handoff |
| integration mediaRequestSearchTargets/searchMediaRequests/getMediaRequestOptions/requestMedia; Seerr search binding | INTEGRATION-013; source-specific search adapters need exact local declarations |
| onboard.currentStep/nextStep; initial user/group/setup-claim orchestration | DATA-01; ADMIN-01/03 provide account/group constructors, AUTH-05 policy |
| onboard.testIntegration/detectRuntimeCapabilities/discoverDockerServices/completeSetup | DATA-02 |
| docker eleven leaves | OPS-03 |
| Kubernetes contexts/nodes/cluster/counts/namespaces | OPS-04 |
| Kubernetes pods/services/ingresses/volumes/configMaps/secrets | OPS-05 |
| widget.options two leaves | WIDGET-EDITOR |
| widget.secrets three leaves | WIDGET-FEEDS-RELEASES |
| widget.customApi four leaves; customWidget.available/optionRequest | CUSTOM-06 |
| customWidget schema/resources/prompt/template read/write/patch/createFromPreview/updateFromPreview | CUSTOM-04 |
| customWidget preview eight leaves | CUSTOM-03 |
| customWidget ordinary nine CRUD/transfer leaves | CUSTOM-01 |
| customWidget legacy three leaves | CUSTOM-02 |
| customWidget secret/source/configuration four leaves | CUSTOM-05 |
| customWidget Workshop three leaves | WORKSHOP-01 |

All remaining widget leaves follow the original kind/service ledger and the consolidation table. All remaining board/app/search/auth/group/settings/Assistant leaves follow the drafts' exact feature ledgers, not the transport draft's coarser labels. user.register belongs to ADMIN-02, not a blanket core.ACCOUNTS assignment. section.changeCollapsed belongs to BOARD-02, not BOARD-03 just because the transport ledger says BOARD-EDITOR. Claims and initial account/group commands must be accounted once as orchestration with named constructors, not assigned to two primary leaves.

## False blockers, actual contracts and cycles

There is no published machine DAG to prove cyclic, and the drafts often explicitly say “interface, not completion.” Nevertheless, interpreting their completion-gate prose as native blocked-by creates the following cycles. These are concrete **would-be cycles**, not a claim that a real tracker already contains them.

| Would-be cycle | Repair |
| --- | --- |
| CORE-01/root needs auth/locale/transport; auth/locale/transport need CORE-01 | Close CORE-01 on the minimal public shell and small accepted contracts; real adapters are later runnable joins/FINAL-01 requirements |
| CORE-01 ↔ SHELL-01 for root/provider/SSR registration | Merge into CORE-01 with one central writer |
| BOARD-01 needs BOARD-02 populated viewer; BOARD-02 needs BOARD-01 projection | Accept C-BOARD read/item/geometry boundaries early. Each closes its owned bounded delivery; populated viewer is a milestone join, not mutual start blocking |
| BOARD-03/04/05/07/08/09 mutually require editor/form/canonical commands | Q13 is a real decision hold. Freeze queue/operation/panel/geometry interfaces; parent forms have one writer. Complete settings/editor join later, no cyclic ticket edges |
| WIDGET-RUNTIME needs board option/editor consumer; WIDGET-EDITOR and board need WIDGET-RUNTIME | Minimal saved app-card expansion plus accepted metadata/options/host interfaces; editor can start before every kind. Full registry reconciliation is FINAL-01 |
| INTEGRATION-001 requires named widget proof; widgets require provider/runtime finished | Initial Miniflux/Mock managed-native demo, shared accepted execution DTOs; provider/widget co-demo is milestone evidence. Never gate all widgets on all 89 providers |
| CUSTOM-01→CUSTOM-05→CUSTOM-06→CUSTOM-01, CUSTOM-03↔CUSTOM-04 | Agree records/binding/runtime/evidence contracts before work. Each closes only its direct flow; cross-consumer save/runtime integration is a milestone join |
| ASSISTANT-02→ASSISTANT-03→ASSISTANT-04→ASSISTANT-03; ASSISTANT-01↔WORKSHOP-04 | History/turn/tool contracts early; generic/custom provider works without hosted account. Hosted path is a join of WORKSHOP-02/04 and ASSISTANT-01/03, not all-provider blockers |
| AUTH-04 requires OAuth, OAuth requires AUTH-04; AUTH-03 needs trust, trust needs OIDC | API-key issuer/trust contracts unlock peers; real session/token/trust connection is runnable acceptance, not reciprocal start edge |
| DATA-01↔DATA-02↔DATA-04; DATA-04 requires CORE-08, CORE-08 requires all restore acceptance | Narrow step/plan/restore/maintenance interfaces early. CORE-08 packages readiness/drain without requiring full product parity. DATA-04 proves real restore afterward; FINAL-01 alone joins them all |
| WIDGET-BESZEL-INVENTORY needs LIVE drill-down, LIVE selector needs inventory | Qualified system discovery/detail interface starts both; shared detail acceptance is late join, not mutual completion |
| TRANSPORT-RPC “all334” completion → features → transport completed | RPC closes on one real authorized read/write caller. All334 disposition/actual feature acceptance belongs to FINAL-01, not RPC's start gate |

Reserved names, read-only discovery, library questions, future live-service availability, a contribution waiting in the central writer's queue and “peer must be integrated eventually” are not native completed-ticket blockers. A controlled disposable fixture permits work against a policy-correct interface; it never grants permission to mount fake identity or close production behavior acceptance.

### Explicit early acceptance milestones

Use these as **named, finite acceptance records** in the reconciled graph, not giant hidden horizontal tickets or placeholders called “FOUNDATION complete.” They must list owner, exact contract revision, accepted types/errors/effects, review evidence, timestamp and affected consumers. Their status is initially **unaccepted**. This audit accepts none of them.

| Milestone | Issuer / exact acceptance | Unblocks local work; does not assert |
| --- | --- | --- |
| C-ROOT | CORE-01: immutable anonymous/principal/setup context, native response effects/abort, descriptor registration, request-local Router/Query/locale snapshot and central writer allocation; public runnable shell | All local contributions; not production identity or populated UI |
| C-SQL | CORE-02: repository identity/reference, transaction/savepoint/error/readiness/close/maintenance interfaces for both engines; Q11 chosen stack only where concrete adapter work depends on it | Domain ports/conversion inventories; not old-data migration passed |
| C-STATE | CORE-03: revision/generation identity, local CAS/acquire/release/renew/invalidate/TTL/bounds/clock/lifecycle semantics and backend ownership | Preview/image/session/cache/history consumers; not persistence or restart guarantees |
| C-AUTH | AUTH-01 + AUTH-05 + AUTH-04: session/effects/current principal policy/crypto references, trust-origin and per-surface authority; disputed policies marked held | Auth consumers/key protocol extraction; not Core credentials bridge proven |
| E-AUTH-BRIDGE | AUTH-01: bounded disposable Core Fetch credentials/LDAP bridge evidence, request-local effects/failure cleanup and candidate decision | Concrete chosen login bridge and OAuth login-resume integration; not all providers complete |
| C-LOCALE-UI | I18N-01/02/03/05 + SHELL-02: selected use-intl facade, catalog/Intl/time/direction, scoped issues/modal/notification/nav contracts; unresolved switch/time choices explicitly scoped | Feature UI/localized DTO callers; not final locale switching/RTL proof |
| C-BOARD | BOARD-01/02/03 + WIDGET-RUNTIME/EDITOR: board projection/item host/geometry/options/ordered effects; queue timing only after Q13 approval | Viewer/editor/widget implementations; not all editor interactions or 69 widgets accepted |
| C-INTEGRATION | INTEGRATION-001/002/003: snapshots/query/interact/full-before-decrypt, outbound/session/image/history ports, exact result/credential/registration and reusable form contracts | Named provider/consumer paths; not runtime SDK trust or all89 accepted |
| C-WIRE | TRANSPORT-RPC/MCP/REST/STREAMS: local Fetch/DTO/error/raw-input/tool/iterator/multipart contribution contracts; Q14-specific host only after choice | Local handlers/tools/generators; not generated schema/runtime framing passed |
| C-MAINTENANCE | CORE-02/03/08 + DATA-03/04: prepare/inspect/lock/reject/drain/close/epoch/restart/readiness/recovery contract; Q12 scope explicitly decided | Restore UI/preparation; not authorization for live replacement |

Accept contract revisions in the bounded provider/feature unit that already owns them. Do not require the whole issuer ticket to finish before a contract consumer starts. If the tracker cannot express a readiness milestone, the coordinator maintains these explicit acceptance records separately and opens eligible work only after acceptance; do not fabricate completed blockers. If automatic frontier scheduling absolutely needs an issue, propose a **narrow real contract-acceptance issue** with these exact obligations and get its added count approved. Do not silently add ten reservation tickets.

The C-* rows are indexes of individual accepted interfaces, not atomic area-wide barriers. For example a calendar consumer needs the clock/date interface, not completed MRT/modal/navigation contracts; an anonymous widget read needs board-view/query policy, not every external token/consent decision. Record acceptance independently for each named interface and let each consumer list only the revisions it actually needs. A still-open sibling choice must not turn an entire C-AUTH/C-BOARD/C-LOCALE-UI row into another fake infrastructure blocker.

### Native blocked-by rules and actual surviving-key edges

Before publication, give every approved ticket one `Blocked by` list containing **only predecessor tickets whose entire bounded delivery must finish before this ticket's first implementation work can start**. Put C-* acceptance conditions, human decision holds, runnable demo inputs and release joins in separate fields. Feature completion is not inferred from fixtures, and deferred runnable acceptance does not make every demo input a start edge.

The following is a viable native-edge shape, subject to the approved starting artifact and accepted milestones:

| Successor | Native predecessor(s) | Why / excluded false edges |
| --- | --- | --- |
| CORE-01 | none | Initial runnable expansion; never waits for feature completion |
| Target-bound units requiring the new host/contribution files | CORE-01 | Its bounded delivery actually creates the target workspace. Independent extraction/planning can precede it; do not include already available artifacts as blockers |
| INTEGRATION-002 service extension | CORE-01, INTEGRATION-001 | The explicit 001→002 management-service ownership handoff requires initial tracer completion. Its nonshared form exploration can precede this edge only if it is not the dispatched implementation unit |
| CORE-08 | CORE-01 | Same writer's later packaging/lifecycle delivery; real adapter integrations arrive incrementally. Not blocked by every feature to begin |
| FINAL-01 | Every remaining surviving implementation leaf, plus unresolved required acceptance/decision evidence | Real final convergence. Use exact ticket IDs after numbering; no implementation ticket points back to FINAL-01 |

For most other units, C-ROOT and their finite accepted interfaces permit start after CORE-01; no completed AUTH-01/CORE-02/all-widgets/all-provider blocker is justified merely by protected integration eventually being required. If a fresh implementer cannot do any owned work without a concrete predecessor artifact (for example the chosen board queue or actual restore preparation), elevate **that exact surviving key** to a native edge after review; do not disguise the needed artifact as a broad seam word.

Publication must topologically number the approved graph, bind keys→real IDs once, and emit native blocking relationships where supported. Local fallback: one approved file per actual NN ticket ID with explicit numbered blockers. Existing discovery/wayfinder issues are not implementation IDs. This planning audit deliberately supplies **no invented tracker numbers**. FINAL-01's all-unit list can be transitively reduced only after actual edges are frozen; retain full capability acceptance accounting separately.

## Viable runnable milestones and frontier

Up to twelve workers means twelve *eligible exclusive owners*, not twelve complete infrastructure rewrites or twelve concurrent central writers. COMPOSITION is one slot and a contribution queue; dependencies are readiness, not an excuse to serially dispatch every feature.

1. **M0 — public safe target:** CORE-01 closes minimal root/host/contracts. Public shell and denied protected slot; no fixture admin mounted. Independent local service/DTO inventories can already progress read-only, but nothing is dispatched without approval.
2. **M1 — real first product path:** join CORE-02, AUTH-01/05, I18N-01/05, TRANSPORT-RPC, APP-01, BOARD-01/02 and WIDGET-RUNTIME as available. Show actual authorized persisted app placement/read plus denied direct access, safe SSR/navigation and reload. Choose exact initial behavior before dispatch; do not gate every family on completion of this whole batch.
3. **M2 — editor/manage path:** BOARD-03/04/05/06/07/08/09, WIDGET-EDITOR, relevant ADMIN units, SHELL-02/03/04/05 and SEARCH units. Approve Q13/setting timing first. Demonstrate edit/save/failure/leave, canonical settings→editor→settings, ACL/home effects, real management/tours/About/assets. Domain workers own local files; composer batches mounts.
4. **M3 — independent capability cohorts:** provider/widget families, media/icons/proxy, log/task/trust/tools, Custom JSX and Assistant/Workshop flow groups enter the ready frontier using their specific accepted interfaces. Accept each complete supported path on real target services and narrowly controlled data. Cohorts can overlap M1/M2; this is not a mandatory global serial phase.
5. **M4 — shipping/conversion/lifecycle:** CORE-08 publishes the target artifact/resource graph; DATA-03/04 prove approved old-data and encrypted-content conversion/restore/recovery against disposable copies, both supported SQL paths and real readiness. OAuth, streams, native resources and offline CLI join here where they need the shipping host. Q11/12/14/15 must have explicit applicable decisions.
6. **FINAL-01 — whole-product finish:** target-only contraction and complete reconciled acceptance ledger, no orphan sources/callers/registries/assets or silently unresolved supported feature. Not “the fixture renders.”

Example eligible frontier after C-* acceptance: COMPOSITION; CORE-02; CORE-03; AUTH-01; I18N-01; BOARD-01/02 local-owner slots; APP-01; INTEGRATION-001; MEDIA-01/03; TRANSPORT-RPC; one independent WIDGET-TIME/EMBEDS family. This is a capacity illustration, not dispatch or a claim all interfaces are accepted. Q13-held board queue work can be replaced by independent family work; unknown SQL/backend choices do not stop locale/forms/known browser consumers. Real auth bridge evidence unlocks auth-dependent integration, not unrelated DTO work.

## Fresh-context sizing guardrails

- **CORE-01** must not freeze all final feature DTOs or implement all providers/storage/locale. It owns a small public-safe root and contribution mechanism. The later same-writer assembly is CORE-08/FINAL-01.
- **CORE-02** is the largest schema/conversion context (40 models, two dialects, historical SQL and native driver behavior). Keep feature command/UI outside it. If Q11 or Q12 adds large cross-engine transformation work, propose bounded independently verifiable copied-data/open/read or transaction/conversion scenarios; do not assume the entire engine rewrite fits or silently remove PostgreSQL.
- **CORE-03** owns backing primitives and one real refresh/last-good consumer, not every feature state machine. Moving CORE-04 store-specific logic to actual users reduces its horizontal bulk. Preserve fences/bounds/expiry/outage semantics, not necessarily every old distributed mechanism under approved singleton.
- **DATA-04** still combines conversion, maintenance/recovery and UI. Limit it to the approved supported-import matrix and complete secret/reference handling; use reusable engine/codec/prepare seams. It cannot also rewrite all domain schemas, supervisor and archive explorer.
- **AUTH-01** includes the evidence spike and local session flow, not every LDAP/OIDC algorithm or external policy decision. If the bounded spike invalidates the candidate, return evidence and replan; do not turn this ticket into an unapproved auth-platform replacement.
- **INTEGRATION-001** is currently common transport bridges + caches + registry + huge Mock capabilities + initial management. Leave cache backing with CORE-03, image/security stores with their consumers, and management after handoff with 002. Treat Mock as a retained dedicated local module by this owner, not an obligation to reimplement every simulation in its first shell. All89 registry closure goes to FINAL-01.
- **INTEGRATION-004/005/006** contain 7/8/10 simple Stats providers. Existing result/auth bodies and a common configure/test/Stats demonstration can justify batching; independent upstream quirks/live evidence do not fit by provider count alone. Split only named complete provider scenarios if adaptation warrants it. Do not split “all metrics API” from “all metrics UI.”
- **BOARD-03** keeps one queue/grid/save/leave spine; dialogs and bulk operations remain BOARD-04/05, settings/ACL/layouts remain bounded owners. Q13 can materially change sizing and storage; do not merge the whole editor to remove interface edges.
- **ASSISTANT-04 and CUSTOM-03/04/06** are high-risk contexts. Preserve separate real approval/research/authoring, interactive preview/evidence save and protected runtime paths. The removed placement bridge belongs to actual feature owners, not a second interpreter/turn rewrite.
- **SHELL-04** now consolidates the same duplicated asset/presentation work, not three times its size. Keep remote media out, keep locale resolver out, keep central emitter out. PWA source behavior has no required offline caching/push; do not add a second asset runtime.
- **OPS-03/04/05** must explicitly own the previously orphaned clients. If Docker terminal or Kubernetes resource clients are genuinely different large adapters, use complete tools scenarios and preserve shared context ownership, not backend/UI halves.
- **Conditional provider distributions** are a ceiling, not a forced minimum. If resulting WIDGET-MEDIA-JOBS/SERVICE-CARDS/PLAYBACK-AUDIO contexts need multiple unrelated SDK migrations, retain their original provider unit(s). INTEGRATION-025/026/028 and the separate Beszel/Wazuh consumers remain because protocol/state/chart complexity is demonstrated, not because “API and UI are different teams.”

## FINAL-01 — missing whole-product convergence unit

**Delivery:** one shipped, runnable Nitro product with approved migration/recovery path, preserved intended capabilities/content and a complete observed acceptance ledger. Exclusive domain: central final assembly/publication/contraction by COMPOSITION; feature-local corrections return to their exact owners. This is the expand–contract integrate-and-verify exception, not a new horizontal testing department.

**True start blockers:** all surviving required implementation deliveries. Human decisions and external evidence availability are explicit holds, not fictitious native issue numbers. **No downstream implementation depends on FINAL-01.**

Required acceptance obligations:

1. **Exact primary coverage and replacement disposition:** reconcile 61 source pages, their layouts/loading/error/not-found interactions, 334 unique application leaves, 52 REST selections, 133 MCP candidates (plus deliberate noncandidate/annotation-only dispositions), 26 HTTP files/38 method rows, dynamic resources/streams/assets/CLI surfaces, 89 provider kinds, 86 Stats implementations, 87 HTTP-eligible kinds, 69 widget kinds/372 options/25 inputs and 40 durable models. Counts are source-ledger checks, not promised identical runtime tool/route names. Approved merges/aliases/exposure changes map to concrete replacement capability, never “removed during rewrite.” Correct area ownership totals after the handoffs.
2. **Real product joins:** board/home/view/edit/settings/ACL/app/search, all named operational tools, login/providers/invites/admin/preferences, tours/About/PWA/Crowdin, media/icons/proxy, Assistant branches/approvals/multisurface/hosted boundary, Custom JSX legacy/v2/configuration/authoring/runtime/Workshop, standalone widgets and onboarding/restore all have primary-owner target evidence. Fixture imports/screenshots or compiling a shell do not close missing services or interaction paths.
3. **Durable and secret preservation:** approved Q11/12/15 decisions; disposable/copied fixtures for fresh/old/interrupted/repeated startup and both SQL backends; complete ID/reference relationships and all encrypted families (integration, widget, Assistant key/headers, v2 and legacy custom secrets and any authoritative additional encrypted fields); same/different/missing/wrong-key cases; retained/invalidated ephemeral state and excluded trust-file prerequisites explicit. No real appdata/credentials touched and no unsupported downgrade/whole-volume backup claim.
4. **Security and delivery behavior under approved policy:** anonymous/authenticated/foreign/admin/setup/demo cases; current permission-before-decrypt; origin/cookie/session/key/OAuth/replay and long-lived reauthorization; private query/SSR/render/catalog invalidation; malformed/oversized multipart/binary/SVG/configuration/URL inputs; actual serializer/schema converters and curated exposure. Each source bug/discrepancy has an approved correction/preservation/defer-with-unavailable-surface disposition, not automatic “security fix approved.”
5. **Shipping resources and singleton lifecycle:** exact pinned runtime/dependencies, target-only build and scoped lint/typecheck at authorized batch gates; native DB/TLS/DNS/sanitizer/editor/terminal dependencies, migrations/SQL/WASM/fonts/icons/static assets/CLI/harness and Go launch contract present; API/auth/stream/binary/static precedence before SSR; ready/start/reject/drain/dispose/restart/recovery with one runtime/data-directory owner; no Redis-dependent service or second scheduler/listener left accidentally. Docs and Go/PocketBase remain excluded runtimes except actual client-facing consequences.
6. **Focused evidence and remaining limitations:** run only authorized relevant regressions/target checks at agreed milestones, not broad suites/full-repo typecheck. Distinguish synthetic policy/result evidence from opt-in live provider evidence. The integration draft's mandatory all88 live deployment matrix is not automatically authorized by the focused-check policy: obtain an explicit release-evidence scope, secure services and mutation approvals; inaccessible services remain unverified/held, never passed. Record approved limitations and rollout/recovery conditions. Contract temporary expansion only when migrated target callers are accounted for; old released Homarr remains rollback reference, not a second build gate.

The current CORE-08 “relevant adapters assembled” wording and INTEGRATION-001/WIDGET-EDITOR “all descriptors eventually” wording do not together establish this finishing gate. FINAL-01 makes the convergence and outstanding evidence visible without making early domain work wait for the entire product.

## Recommendations to coordinator

1. Adopt one COMPOSITION writer and the 15 mandatory reconciliations; review the six provider consolidations with the five stated sizing fallbacks. Present **120 proposed units / 125 conservative fallback** with this exact original-key disposition, not a fictitious settled minimum.
2. Resolve the concrete generic-request, Docker/Kubernetes, icon, common-option and leaf-owner gaps. Rewrite coverage owner joins once; do not run a duplicate source census or create per-endpoint tickets.
3. Replace stale architecture questions with confirmed DESIGN decisions. Keep Q11–Q15 and specific policy/source discrepancies explicit; do not infer agreement from recommendations or security labels.
4. Approve finite C-* contract milestones, separate them from runnable joins/release gates, then enumerate true surviving-key predecessor edges. No amorphous reservation becomes a native blocker; no mutual completion dependency survives.
5. Present the full numbered, blockers-first proposal for granularity/dependency approval. Only afterward publish one approved local file per actual ID or native tracker issues with real blocking links. Do not delete existing issues or invent IDs to evade the Linear limit.
6. Include FINAL-01 explicitly, retain focused batched acceptance and keep the playable fixture up. No dispatch, checks, source changes or publication are authorized by this audit.
