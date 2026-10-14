# Integration migration — provisional ticket graph

Planning only; **28 proposed tickets**, not approved, published, dispatched, or ready-for-agent. Sole owned output is this draft. Evidence: completed `research_notes/Homarr full Nitro migration/integrations.md`, especially §§2–7; policy: `TICKET-DRAFTING.md` and `DESIGN.md`. No source changes, checks, live requests, credentials, tracker operations, or container activity are part of this draft.

## Outcome and sizing

- Preserve **89 registered definitions and matching factories**, including Mock; exactly one primary capability owner per kind in the ledger below.
- Preserve **86 Stats implementations = 30 native + 56 existing-client projections**. Preserve native results in addition to scalar projections. `ical`, `bindery`, and `wazuh` have no Stats implementation; the last two remain an explicit selection discrepancy, not fabricated metrics.
- Preserve **87 generic-HTTP-eligible kinds**, excluding only `ical` and `truenas`. Eligibility does not authorize every credential alternative. `qBittorrent` password mode remains native-only; Kuma's generic Basic authentication does not imply private native monitor support.
- The 28 slices exceed the approximate 15–25 target because calendars, notification/note mutations, smart-home effects, Proxmox, Coolify/Traefik, analytics, TrueNAS pooling, Beszel streaming/actions, Warrior websocket snapshots, and Wazuh's two-origin security queries need separate acceptance and ownership. Combining those into broad “infrastructure” or “other providers” tickets would hide different policies/protocols and exceed a fresh implementation context. The seven-provider bounded read-dashboard batch is the largest remaining review candidate; split it if implementation evidence requires it, not by dropping methods.
- External application routes, transport shapes, SDK signatures, and libraries may change. Existing product capabilities, durable integration IDs/content, credential semantics, authorization, upstream behavior, and result meaning must not disappear. No parallel Next-build gate or obsolete signature adapter is required.

## Dependency and ownership conventions

`Start` means an agreed interface is required, not completion of its physical backend or every consumer. Provider tickets may implement and demonstrate against a fake repository, secret accessor, trust transport, clock, image/history/session/connection port, and principal evaluator. A fake principal evaluator must implement the real policy below; it must not substitute unconditional allow. `Land/release` names genuine composed acceptance gates. Seam names such as FOUNDATION, PERSISTENCE, COORDINATION, IDENTITY, ASSETS, WIDGET-RUNTIME, and TRANSPORTS are contracts to reconcile with the coordinator, not invented horizontal implementation tickets.

**Single writers:** INTEGRATION-001 owns integration domain contracts, definition/catalog/capability metadata, registration/composition, central exports, common outbound transport bridges, test/result envelopes, and provider-independent operation execution. It also owns the initial minimal Miniflux CRUD/test/delegation tracer implementation; at that explicit handoff INTEGRATION-002 becomes the sole writer of management/configuration/delegation/test UI and services and extends it to the complete catalog. The two workers must not concurrently modify those handed-off services. INTEGRATION-002 can start its separate full-catalog UI against the agreed interface before the handoff. INTEGRATION-003 owns generic-HTTP credential selection/resolution and redaction integration. Provider tickets own only their explicit clients, native methods, per-provider authentication state machines, result composition and projection implementations. Providers submit registration descriptors to INTEGRATION-001; they do not concurrently edit central registries. The coordinator's shared-manifest/lockfile writer handles dependency changes from all lanes; no provider independently edits those files.

**Shared adapters, one owner:** INTEGRATION-001: Undici/Fetch, Axios, Node HTTPS/DAV transport bridge, ws trust/lifecycle bridge, safe errors, explicit operation signal/deadline, execution fencing and typed session/history/image/connection interfaces. PERSISTENCE/COORDINATION supply their physical implementations; ASSETS supplies private-image mappings; IDENTITY supplies principal/crypto continuity. INTEGRATION-009 owns the download SDK bridges; INTEGRATION-012 owns shared Jellyfin/Emby mapping and Jellyfin SDK injection; INTEGRATION-013 owns the shared Overseerr-derived client; INTEGRATION-015 owns shared calendar result/recurrence contracts and DAV-specific parsing; INTEGRATION-020 owns UniFi SDK/cookie-agent injection; INTEGRATION-023 owns Immich SDK injection. Other tickets consume those interfaces rather than building parallel adapters. Provider auth logic stays provider-owned; INTEGRATION-003 calls it through agreed server-only auth hooks.

**Cross-area ownership/handoffs:**

| Named handoff | Integration owner delivers | Primary consumer/owner elsewhere |
| --- | --- | --- |
| WIDGETS.NativeResultsAndActions | Typed native results, options, selectors, action policy/error/invalidation contracts from each provider ticket | Widget lane owns rendered widget UI, placement/options, selection allowlists and browser interaction; provider ticket acceptance includes a named widget-consumption demonstration, not a duplicate UI rewrite |
| ENDPOINTS.IntegrationBindings | Authorized service contracts, operation registrations and fixture evidence | Endpoint/transport lane owns final application-facing oRPC/OpenAPI/MCP hosting and external registration; providers retain callable public methods without automatically publishing new endpoints |
| EXTENDEDTOOLS.GenericRequestAndCustomJSX | INTEGRATION-003 full-access authenticated connection/auth/redaction resolver | Extendedtools owns arbitrary-request executor, Custom JSX sources/runtime/editor/preview, its API/UI and execution bounds |
| EXTENDEDTOOLS.DockerDiscovery | All aliases/default ports/URLs/discoverability and managed create/test callback | Extendedtools owns Docker discovery/container actions and UI; integration lane owns saved connections, not Docker management |
| EXTENDEDTOOLS.Kubernetes | No registered Kubernetes IntegrationKind is invented or added to 89 | Extendedtools owns Kubernetes cluster/auth/resource/actions/UI and runtime/security acceptance, separate from Proxmox and integration health |
| EXTENDEDTOOLS.Onboarding | Kind ordering/featured/hidden flags, credential modes, embedded create/test completion | Onboarding owner owns the studio/flow and placement; INTEGRATION-002 owns reusable integration forms |
| EXTENDEDTOOLS.CertificateAdministration | Authorized sanitized chain diagnostics, trust/upload-and-retry entry point | Extendedtools/security owner owns certificate storage/upload/trust administration UI and policy; INTEGRATION-002 owns integration-specific remediation presentation, INTEGRATION-001 applies trust |
| EXTENDEDTOOLS.AssistantAndMCP | Safe catalog/managed creation/authenticated native/HTTP connection contracts | Extendedtools owns assistant integration research/chat/tools UI; endpoint owner hosts MCP. Registry-generated descriptions must not invent mandatory secrets |
| ORCHESTRATION.ProviderResults | INTEGRATION-019 Proxmox and INTEGRATION-022 Coolify/Traefik preserved read/result/selector contracts | Widget lane owns their widget presentation. Any dedicated orchestration management UI remains its existing extendedtools owner; integration work does not absorb Docker/Kubernetes or publish privileged SDK admin operations |

## Acceptance baseline applied to every provider ticket

These obligations are incorporated by reference in each ticket, in addition to its 3–6 specific checklist items. They are future implementation acceptance, not assertions that checks or live compatibility have occurred.

**F — synthetic/critical-flow acceptance:** Demonstrate kind/factory identity, every listed native method and Stats field, every defined credential alternative/optional field, connection checks, masked create/edit/null-keep/omitted-remove/mode-switch/delete, and approved principal policies through the target shell. Exercise valid/empty/nullable/partial/malformed/application-error results, exact units/date/link/time scope, configured subpaths and separate external links. Reject before decryption for unauthorized requests; never return stored/derived private credentials, cookies, raw SDK causes or private upstream image URLs in browser/API results or disclose them in logs/cache identities. Authorized full editors may receive the registry's public credential fields; other consumers may not. Editor-entered private values are submitted securely, never loaded back from stored configuration. Test pre-abort/deadline, pagination cancellation, unsettled SDK work, owned-resource teardown, bounded provider auth recovery, no blanket mutation retries, generation fencing and config/trust/delete invalidation. Use relevant existing fixtures and focused newly authorized security/data/critical-flow regressions; no broad speculative suite or automatic environment-based live tests.

**L — deferred opt-in live acceptance:** For each of the **88 non-Mock kinds**, record authorized deployed server/API version, each approved auth alternative, selected runtime/library versions, base-path/TLS/proxy topology, minimum upstream permissions, and exact bounded connection/read operations from its row. Record unknown versions and inaccessible services as blocked, not passed. Mutations require explicit approval, explained effects and a disposable target; restore reversible changes, confirm disk/deletion effects, inspect ambiguous outcomes before retry. Streams/pools require reconnect/expiry, repeated open/close, abort, credential/trust change and runtime shutdown. Images require safe opaque-handle fetch. Mock and connection-test success do not establish real-provider parity. Secure operational setup supplies credentials; no keys are pasted into drafts.

**Composed release gates, not blanket start blockers:** Actual IDENTITY policy/session/crypto, PERSISTENCE conversion and repositories, COORDINATION sessions/history/snapshots/fences, ASSETS images, real outbound runtime and trust/proxy adapters, ENDPOINTS bindings and WIDGETS rendering must be demonstrated for each consuming slice. No provider depends on all peer providers being implemented. All 28 descriptors and row-level evidence feed INTEGRATION-001's final single-writer reconciliation; that is a finishing obligation of 001, not an extra serial feature ticket.

## Provisional tickets

### INTEGRATION-001 — Run an authorized Miniflux connection through target CRUD, execution and registry; preserve Mock

**Delivers:** A runnable target-shell flow creates a real registered Miniflux connection with an API key, tests it, reads feed counters/Stats under native policy, edits masked credentials, delegates access, and deletes it. Mock retains the complete offline fixture capability set. This establishes INTEGRATION-RUNTIME without a providerless horizontal placeholder.

**Start blockers:** Agreed FOUNDATION request/feature registration, PERSISTENCE repository/conversion, IDENTITY principal/crypto, and COORDINATION invalidation interfaces only; target shell must be runnable for the demonstration. Physical backend completion is a release gate. **Exclusive ownership:** common integration contracts/transport bridges/runtime, all central catalogs/registrations/exports and initial Miniflux/Mock implementations. **Kinds:** `miniflux`, `mock`.

- [ ] An authenticated principal with `integration-create` can create; creating a linked app independently checks app-create. Delegated/global full access gates details, edits, deletes, stored tests and permission changes. Native reads resolve allowed kinds plus use/query policy, including board/item visibility, **before decryption**. Interact gates every selected integration. A public-board reader may receive allowed bounded native reads but cannot obtain configuration/secrets or invoke arbitrary HTTP, including GET.
- [ ] Miniflux K → `X-Auth-Token`, counters read, `read,unread` Stats sums, invalid/negative-counter fixtures and actual connection-check service work end to end; API-key redaction and denied-editor/board-reader fixtures exercise a real policy, not all-allow scaffolding. L: authorized `/v1/feeds/counters` and connection check with approved Miniflux version/key.
- [ ] Publish exact 89-key browser-safe definitions/server-only lazy factories, explicit native/read/interact/HTTP-mode/Stats distinctions, domain result/Date envelopes and operation interfaces. Central registration counts are definition=factory=89, native Stats=30, projections=56, HTTP eligibility=87; unknown kinds fail safely. Registration completeness is the final release obligation, not an initial requirement that all clients already work.
- [ ] Common trusted transport bridges honor CA/fingerprint-specific hostname exceptions, proxy/lowercase precedence/NO_PROXY, DNS, base-prefix URLs, credential redaction and owned/shared resource release. Operation context carries signal/deadline; uncancellable work stays owned until settlement, cannot duplicate prematurely or write stale results. Bind crypto/session/history/private-image/revision-keyed connection contracts to physical owners without choosing their backends here.
- [ ] Native response composition retains source-specific TTLs/options, identity including external URL/keyed secret revision, stale/error envelopes, limits/coalescing and generation fences; Stats preserves one-hour freshness, one-minute error retry, last-good snapshots, 128 pending guards, source locks/renewals/four slots/60-second deadline. Fake-store proof starts independently; physical restart/concurrency acceptance follows topology approval, not provider cron invention.
- [ ] Mock remains directly creatable with no credentials, hidden from onboarding/Docker discovery; preserve stateful calendar/DNS/download/system/cluster/indexer/organizer/release/request/playback/transcoding/network/notification/smart-home/UPS/Beszel methods, simulated realtime and separate widget/Wazuh fixture shortcuts. Its projection is `documents,songs,storage` (bytes). Preserve explicit DEMO_MODE/`https://demo.homarr.dev` Stats provenance, never production fake-data substitution. Offline target demonstration performs no upstream calls; no live Mock gate. Collect all provider descriptors/evidence and final exact-once ledger reconciliation centrally.

### INTEGRATION-002 — Manage every connection, delegation and actionable authorized connection diagnostics

**Delivers:** Target overview/create/edit/embedded/completion flows support every catalog kind and stored credential mode, including safe certificate remediation and delegated access.

**Start blockers:** INTEGRATION-001 catalog/config/test/policy signatures, FOUNDATION Router shell, IDENTITY delegation and PERSISTENCE integration relations interfaces. LOCALIZATION and ASSETS contracts for labels/icons; not all providers' completion. UI work can start against those interfaces; extending the initial CRUD/test/delegation implementation requires the explicit 001→002 ownership handoff. **Exclusive ownership:** integration management/configuration/delegation/test services and UI after handoff. No primary provider ownership; consumes all 89.

- [ ] Auth redirect, scoped manageable sorted/searchable rows, create-only/empty states, kind defaults/icons/docs/API-key-settings links, credential alternatives/optional fields, app link/unlink/new-app permission and completion/embedded reuse work against fixture policy/repository; editors see only permitted details.
- [ ] Preserve integration `id,name,url,kind,appId`, linked-app external href fallback, item attachments, user/group delegated use/interact/full and inherited global parents; app deletion nulls appId, integration deletion cascades secrets. Preserve encrypted secret values/revisions/timestamps and legacy unused secret kinds during conversion; no general options JSON is invented. Physical conversion belongs to PERSISTENCE with this exact contract.
- [ ] Test before save; null edited value keeps saved secret, omission removes kind, alternative selection and optional/saved-secret merging are exercised. Writes encrypt; update/delete invalidate native response/session/Stats/pool generations. Specify chosen atomicity with PERSISTENCE rather than claiming current multi-step writes were transactional.
- [ ] Kind/list/ID/name/category/search-support selectors retain public catalog/ID-kind-only boundaries, authenticated selection, deterministic ordering and permission flags. Full-access detail returns only authorized public-secret values, private null and timestamps/app. Public secret metadata is not universal public access; privateKey alone is multiline. Empty arrays remain valid where catalog permits them; Proxmox uses username/tokenId/apiKey/realm, not password examples.
- [ ] Full-access permission editor transactionally replaces explicit user/group grants. Authorized form diagnostics distinguish authorization/certificate/request/status/parse/unknown and provide sanitized chain/remediation/retry; stored test returns only success/safe category. EXTENDEDTOOLS.CertificateAdministration owns trust storage/upload UI; rich errors never serialize secret-bearing raw causes.
- [ ] Synthetic all-kind create/edit/mode/remove/delete matrix plus denied principal and failed-test fixtures is collected per provider as it lands. Native create/update URL inconsistency and ineffective `attemptSearchEngineCreation` remain explicit unapproved decisions, not a silently implemented feature or universal SSRF claim. L uses each provider's approved test deployment; no automatic probing of all saved production connections.

### INTEGRATION-003 — Resolve full-access saved credentials for bounded generic HTTP and Custom JSX

**Delivers:** An authorized caller selects a saved connection and obtains server-owned exact-mode authentication for arbitrary-request and Custom JSX execution, without exposing secrets or treating native use as full access.

**Start blockers:** INTEGRATION-001 immutable authorized snapshot/auth-hook/trust interfaces, IDENTITY full-access policy and EXTENDEDTOOLS.GenericRequestAndCustomJSX agreed executor interface. Provider auth hooks may be fake until their own slices land. **Exclusive ownership:** generic connection selection, exact secret-set mode matcher, auth/session resolution and redaction handoff; extendedtools exclusively owns executor/API/UI.

- [ ] Reconcile eligibility for exactly the 87 ledger rows marked H; reject iCal and TrueNAS protocols. Validate each supported HTTP credential mode separately from native test alternative selection. qBittorrent K bearer is supported; U/P is explicitly rejected on generic HTTP. Kuma optional K uses empty-username Basic while native reads remain public status pages. Xteve adds body token; UniFi cookie/optional CSRF and recorded SDK/session exchanges retain provider isolation.
- [ ] Exactly one ID/name/kind selector chooses the deterministic first full-access match when non-ID; all methods including GET require full access before decryption. Public-board native visibility and interact permissions never authorize this surface. Registry documentation and generated MCP descriptions match actual empty-secret/alternative rules.
- [ ] Supply scoped origin/base-prefix/auth precedence and complete stored/derived credential redaction to the extendedtools executor; coordinated acceptance proves no absolute/protocol-relative escapes/redirects/URL credentials/query/hash, safe static headers, no GET/HEAD bodies, seven methods, DELETE confirmation, no cache/retries, 15-second timeout, 10-KiB body, 16-KiB headers and 1-MiB response. These executor bounds remain extendedtools-owned, not duplicated here.
- [ ] Golden HTTP-mode fixtures for every eligible kind exercise missing/extra/mixed/optional secret sets, query/body/header/cookie/basic/session auth and encoded/JSON/base64 redaction; user-controlled headers cannot replace stored auth. Return safe upstream status/data semantics without assuming HTTP success means application success or timeout means no write.
- [ ] Config/trust/delete evicts derived auth/session state using common revision fencing; native credential exchanges are reused through hooks, not independently reimplemented. Per-row opt-in HTTP live evidence is added only for approved deployed modes/endpoints; unsupported modes are explicit and never accepted by broadening credentials.

### INTEGRATION-004 — Native media/library Stats with authenticated management and widget consumption

**Delivers:** Configure/test these seven native Stats providers and render their exact scalar results through the authorized Stats service.

**Start blockers:** INTEGRATION-001 Stats/context/catalog/trust signatures; INTEGRATION-002 form interface and WIDGETS.NativeResultsAndActions agreed Stats contract, not finished UI. **Exclusive ownership:** these seven provider implementations and row fixtures.

| Kind | Native credentials, exact Stats fields and row-specific synthetic/live obligation |
| --- | --- |
| `autobrr` | K query `apikey`; `approvedPushes,rejectedPushes,filters,indexers`; counts/list lengths, no query leakage; L release stats/filter/indexer reads |
| `jellystat` | K `X-API-Token`; `songs,movies,episodes,other`; Audio/Movie/Series/Other mapping is fixed 30-day plays, not inventory; L same scope |
| `tubearchivist` | K `Authorization: Token`; `pendingDownloads,videos,channels,playlists`; nullable pending recorded zero and doc_count mapping; L all four stats reads |
| `komga` | K `X-API-Key`; `libraries,series,books`; available filtering/totalElements, list reads via POST `{}`; L libraries and both list POSTs |
| `romm` | none; `platforms,roms,saves,states,screenshots,totalFileSize` (bytes); uppercase fields/size alternatives/missing size; L deployed-version stats |
| `stash` | K `ApiKey`; `scenes,images,galleries,performers,studios,tags,sceneBytes,imageBytes` (bytes), `sceneDuration` (seconds); compiled GraphQL query/application errors/data schema; L same query |
| `maintainerr` | none; `itemsHandled,episodesHandled,moviesHandled,reclaimable` (bytes); exact storage field/coercion mapping; L storage metrics |

- [ ] All seven rows retain native Stats/connection checks/H modes, registration descriptors, settings credential validation, errors and exact keys/units; apply F/L per row.
- [ ] Fixtures distinguish collection counts, pagination totals, null defaults and source time scope; HTTP-success GraphQL errors are not normal scalar results.
- [ ] Authorized snapshot/cache refresh and config edits fence stale credentials; cancellation/redaction works for query auth and POST-as-read. WIDGETS Stats demonstration consumes preserved metrics without renamed composites.
- [ ] Each approved live row proves the source-listed bounded calls under its actual auth/version/topology, not just a connection probe; no mutations or extra SDK operations are added.

### INTEGRATION-005 — Native personal/productivity Stats with pagination and secret-safe exact modes

**Delivers:** Configure/test eight independent Stats services and render their recorded personal/space/inventory metrics.

**Start blockers:** INTEGRATION-001 contracts and INTEGRATION-002 form/Stats-widget interfaces. **Exclusive ownership:** the eight providers below; Miniflux is exclusively 001.

| Kind | Native credentials, exact Stats fields and synthetic/live distinction |
| --- | --- |
| `yourSpotify` | K query `token`; `songs,artists,time` (seconds); first bucket/empty arrays/all-time date parameters, ms→s; L exact all-time requests |
| `mealie` | K bearer; `recipes,users,categories,tags`; household schema/scope; L household statistics |
| `trilium` | K raw Authorization, no added Bearer; `version` text, `notesCount`, `dbSize` bytes; JSON format validation; L ETAPI metrics |
| `tandoor` | K bearer; `users,recipes,keywords`; first-space/empty space and paginated count not page length; L same space/keyword reads |
| `spoolman` | none; `spools,remainingWeight` grams; exclude archived/sum weights; L spool list |
| `linkwarden` | K bearer; `links,collections,tags`; envelope variants, collection totals, repeated/max-1000 cursor guard/abort; L multi-page tags |
| `karakeep` | K bearer; `bookmarks,favorites,archived,highlights,lists,tags`; user-owned aggregate/schema errors; L me/stats |
| `changedetection` | K `x-api-key`; `diffsDetected,totalObserved`; object-key watch list and source diff predicate; L watch list |

- [ ] Every row's catalog modes, native tests/H auth and precise metrics work through managed configure/edit and authorized Stats reads; F/L applies.
- [ ] Sanitize query/raw-header credentials and preserve first-bucket/first-space/all-time/user-owned meaning instead of generalized counters.
- [ ] Pagination terminates on repeated cursor/bound, checks abort between pages and cannot overwrite new-config snapshots. Empty/partial/schema-error fixtures preserve missing values distinctly from zero.
- [ ] Named Stats-widget consumer demonstrates each field/unit; approved live evidence covers the recorded source scopes and paging, not all-time guesses or alternative endpoints.

### INTEGRATION-006 — Native operational Stats through Fetch and Axios trust paths

**Delivers:** Manage/test ten no-login/Basic/key operational providers and display their recorded diagnostics/counts safely.

**Start blockers:** INTEGRATION-001 common transport/Stats interfaces; INTEGRATION-002 managed form interface. **Exclusive ownership:** ten native Stats providers, with common Axios bridge consumed from 001.

| Kind | Credentials, exact metrics and synthetic/live obligation |
| --- | --- |
| `scrutiny` | none; `passed,failed,unknown`; settings thresholds/missing status/unknown devices; L settings+summary |
| `netalertx` | K bearer; `total,connected,newDevices,downAlerts`; tuple indices/numeric strings/invalid numbers; L totals |
| `unmanic` | none; `activeWorkers,totalWorkers,recordsTotal`; worker filter/pending POST body; L both reads under `/unmanic/api/v2/` prefix |
| `syncthingRelay` | none; `numActiveSessions,numConnections,bytesProxied` bytes; finite/nonnegative values, not rates/device REST; L relay status |
| `prometheus` | none or U/P Basic; `total,up,down`; success envelope/unknown health not silently down; L targets for configured modes |
| `netdata` | none; `warnings,criticals`; nested alarm counts, no system-resource invention; L info |
| `fileflows` | none; `queue,processing,processed,time` text; existing number/string time transformation; L status |
| `healthchecks` | K `X-Api-Key`; `checksUp,checksDown,checksGrace,checksNew`; four statuses/unknown behavior; L project checks |
| `gatus` | none; `up,down,unknown,total`; array/object forms, latest history/no-result unknown; L statuses |
| `caddy` | none; Axios; `upstreams,requests,requestsFailed`; source active `num_requests`/fails sums, not lifetime traffic; L authorized admin upstream read |

- [ ] All ten rows retain native checks/H modes and exact fields through configuration and Stats consumption; F/L applies per row.
- [ ] Valid/unknown/partial/invalid fixtures distinguish native source envelopes and units; unauthenticated source endpoints do not bypass Homarr principal authorization.
- [ ] Caddy uses the agreed Axios/trust/redirect/signal bridge until any replacement is separately proven; POST-as-read and base prefixes survive. No ad-hoc polling fleet or global transport defaults.
- [ ] Stats-widget fixtures show meaningful unknown/error/stale states and all metrics. L exercises approved bounded reads per actual server/API version; Caddy admin access requires explicitly approved network reachability.

### INTEGRATION-007 — Native Stats login/token exchanges, including Frigate's existing HTTPS guard

**Delivers:** Safe configure/test/refresh for four credential-exchange Stats integrations.

**Start blockers:** INTEGRATION-001 secret-before-network/trust/auth/session interfaces; INTEGRATION-002 diagnostic/form contract. **Exclusive ownership:** these four auth state machines and provider metrics; generic hook consumers are 003.

| Kind | Credentials, exact metrics and synthetic/live obligation |
| --- | --- |
| `frigate` | U/P; require HTTPS before secret access; login cookie → one bounded valid frigate_token/JWT bearer/profile proof; `cameras,uptime` seconds, `version` text; malformed/multiple cookie/auth rejection fixtures; L HTTPS login/profile/stats |
| `homebox` | U/P form login/raw Authorization token; `items,locations,labels,itemsWithWarranty,users,totalValue` text; totalLabels/totalTags, group currency and invalid token; L login+statistics/currency |
| `plantit` | U/P login nested jwt.value bearer; `plants,species,photos,events`; malformed login/stat schema; L login+stats |
| `xteve` | none or paired U/P; JSON login/status, generic body token; `streamsAll,streamsActive,streamsXepg`; pairing/token precedence/status/default streams; L configured no-auth and paired-auth status |

- [ ] F/L for every alternative; form native checks and Stats refresh use one auth implementation and authorized secret snapshot, with hooks handed to 003.
- [ ] Frigate's HTTPS/pre-secret guard and strict cookie/profile proof are existing supported security behavior, not an optional redesign; no universal HTTPS requirement is silently imposed on other providers.
- [ ] Malformed/missing tokens, failed application envelopes and invalid credentials yield sanitized authorized diagnostics and no bogus scalar success; config edits clear derived credentials and fence late results.
- [ ] Real approved target Stats rendering and live login/read evidence cover each deployed mode/version with no credential-bearing cookie/query/body output or blanket retry after ambiguity.

### INTEGRATION-008 — RPC downloads and explicit Slskd no-op discrepancy

**Delivers:** Authorized download queue/history/status reads, preserved controls and scalar Stats for four direct RPC/HTTP clients, with honest Slskd capability evidence.

**Start blockers:** INTEGRATION-001 download/action/trust contracts, agreed WIDGETS download selection/control interface; unapproved Slskd presentation decision gates changed UI behavior, not reading/listing port work. **Exclusive ownership:** `sabNzbd,nzbGet,aria2,slskd`, shared download domain composition; 009 consumes its agreed types/options, not finished clients.

| Kind | Credentials and retained native/projection/row evidence |
| --- | --- |
| `sabNzbd` | K query; jobs/status/history, queue/item pause/resume/delete; completed-vs-pending deletion, paged limits/ETA/duration; L disposable download/both delete modes |
| `nzbGet` | U/P Basic; JSON-RPC jobs/status/history and six controls; application-vs-HTTP error, IDs/units/disk flag; L disposable jobs |
| `aria2` | none or K; custom JSON-RPC params token prefix, jobs/global rates/six controls; torrent/non-torrent/seeding, active/waiting/stopped bounds and deletion; L disposable job per approved mode |
| `slskd` | K `X-API-Key`; directory/file jobs/status, bitwise states/time; all pause/resume/delete methods resolve as **no-ops**, not real controls; L listings only pending separately approved extension |

- [ ] Preserve every queue/item/global source control, including disk/removal flags and ID types where supported; native read limit and history/ETA mapping remain. All four project `download,upload` bytes/s (upload nullable) and `paused` source text label even if boolean, using native limit=1; H/native checks/configuration follow F/L.
- [ ] Shared download types are browser/domain types, not database schema imports. Authorized native reads use query policy; each selected control requires interact before decryption, bypasses read cache and triggers agreed invalidation.
- [ ] Synthetic action/state/application-error/ambiguous-timeout and mode-switch fixtures cover all real controls; no automatic transport retries after a possible write. Slskd resolves no-op fixtures explicitly without claiming successful upstream mutation.
- [ ] WIDGETS.DownloadControls receives named Slskd discrepancy and real action capabilities. Product must approve retaining no-op presentation, disabling unsupported controls, or a separately specified extension; do not silently fix or manufacture support. Opt-in controls require disposable targets/disk effects confirmation; Slskd read evidence remains independently attainable.

### INTEGRATION-009 — SDK torrent clients with session handshakes and version-aware controls

**Delivers:** Configure/test and use three SDK download clients through trusted/cancellable-or-owned execution, with complete download actions and Stats.

**Start blockers:** INTEGRATION-001 transport/policy/lifecycle interfaces and INTEGRATION-008 agreed download result/action contract only; provider-library/runtime/supported-version decisions gate real compatibility. **Exclusive ownership:** Deluge/Transmission/qBittorrent clients and common download SDK bridges; no central registry writes.

| Kind | Credentials, native capabilities and row-specific evidence |
| --- | --- |
| `deluge` | password; SDK cookie/RPC login, generic cookie hook; jobs/six controls; handshake, state/per-item action fanout/disk flag; L disposable torrent |
| `transmission` | U/P Basic; RPC session-ID handshake, jobs/six controls; integer states/speed/time; L disposable torrent |
| `qBittorrent` | K or U/P native; jobs/six controls, version read selects v5 stop/start versus prior pause/resume; generic K only (installed declaration ≥5.2); L approved older/newer servers/modes and disposable torrent |

- [ ] Every native credential mode, native connection test and supported H hook works under F/L; projection is `download,upload` bytes/s, nullable upload, recorded `paused` label/value using limit=1 for each kind.
- [ ] Preserve all source queue/item controls, state fanout/removal flags, version-specific endpoint selection and session challenge recovery. Bound auth retries without retrying ambiguous mutations; qBit password generic requests stay rejected.
- [ ] SDK-specific trust/dispatcher/timeout/signal gaps are proven with fixture handshakes and pending-work ownership rather than assumed from Fetch cancellation; no client leaks another integration's cookie/config.
- [ ] Download-widget action flow proves interact denial before decryption, direct mutation/error/invalidation and stale fencing. Approved live matrix covers chosen server versions and both native auth alternatives; unverified older/newer support stays an explicit release blocker.

### INTEGRATION-010 — Organizer libraries, calendars and missing/queued media

**Delivers:** Five configured organizer clients supply authorized calendar/library/missing/queue results, with supported projections and explicit Bindery mismatch.

**Start blockers:** INTEGRATION-001 execution and INTEGRATION-015 agreed shared calendar/date/link contract, WIDGETS calendar/organizer options interface; no dependence on finished CalDAV clients. **Exclusive ownership:** five clients and shared organizer composition; calendar contract is single-owned by 015.

| Kind | Credentials, native surfaces and exact projection |
| --- | --- |
| `sonarr` | K `X-Api-Key`; library/calendar/missing/queue; `shows,monitored,downloaded` episodes, `missing,queued,episodes,storage` bytes |
| `radarr` | K `X-Api-Key`; library/calendar/missing/queue; `movies,monitored,downloaded` movies, `missing,queued,storage` bytes |
| `lidarr` | K `X-Api-Key`; library/calendar only; `artists,monitored,upcoming` next seven days |
| `readarr` | K `X-Api-Key`; library/calendar only; `books,monitored,upcoming` next seven days |
| `bindery` | K `X-Api-Key`; missing/queue schemas/totals/pageSize only; **no Stats implementation**, despite existing Stats-widget selection |

- [ ] F/L includes all native tests/H modes and form roundtrip. Library/event fixtures preserve Sonarr episode/monitored/image mapping, Radarr physical/digital/cinema release dates, Lidarr album/artist, Readarr author/book/release types and supported server version evidence.
- [ ] Missing/queued totals use totalCount/pageSize=1 for Stats and full requested bounds for native results. Do not invent Lidarr/Readarr missing-media operations or Bindery metrics.
- [ ] Preserve month plus six-day margins, unmonitored on/off, release filters/time windows, external links and image/date semantics across authorized calendar/organizer handlers; registration is per kind, not broad category inference.
- [ ] Widget calendar/organizer/Stats consumers demonstrate the preserved results. Bindery/wazuh Stats mismatch remains the named unapproved product decision; fixture unsupported/empty behavior remains visible until specified correction.
- [ ] Opt-in bounded live library/calendar/missing/queue reads cover each independently deployed kind/filter; Readarr future upstream support is unknown, not guaranteed or a reason to remove existing deployments.

### INTEGRATION-011 — Indexer reads/test commands and complete Bazarr status

**Delivers:** Configure/test three indexer/subtitle providers, display their complete native results and execute explicitly authorized indexer test-all commands.

**Start blockers:** INTEGRATION-001 action/result/trust interface and named WIDGETS indexer/Bazarr consumers. **Exclusive ownership:** `jackett,prowlarr,bazarr` clients and indexer result composition.

| Kind | Auth, native surfaces, projection and evidence |
| --- | --- |
| `jackett` | K query; Torznab XML/attributes/indexer list + testAllAsync; `configured`; L read and separately authorized test-all |
| `prowlarr` | K `X-Api-Key`; indexer/status list + test-all command body; `indexers`; L read and opt-in command |
| `bazarr` | K `X-API-KEY`; every badge/status/connectivity/announcement field and source connection probe; `episodes,movies,providers`; L badges+probe |

- [ ] Native/H credential modes and managed connection checks use F/L; XML/JSON valid/partial/application-error fixtures retain complete results beyond scalar Stats.
- [ ] Indexer test-all is an interact-gated direct action before secret access with preserved command/fanout and cache invalidation; mere source test-connection success does not authorize it.
- [ ] Query auth is redacted, XML/Zod parsing and statuses/counts remain accurate; Bazarr's other native badges are not lost because Stats projects only three fields.
- [ ] Named widget consumers display indexer state/Bazarr results; explicit live test-all approval is separate from bounded read acceptance for each provider.

### INTEGRATION-012 — Media playback/releases and safe Plex images

**Delivers:** Three independently configured media servers supply sessions/recent releases and safe external/image links through native authorization.

**Start blockers:** INTEGRATION-001 execution/SDK/image contracts, ASSETS opaque-image interface, WIDGETS playback/releases options. **Exclusive ownership:** `jellyfin,emby,plex`, shared Jellyfin/Emby mapping and Jellyfin SDK injection; common Axios remains 001-owned.

- [ ] Jellyfin U/P or K token resolution, user scopes/SDK Axios injection, IPv4/IPv6/session/artist/movie/episode mapping, showOnlyPlaying and releases retain all public methods. Emby K `X-Emby-Token` uses independent public-user/latest fetches and fixtures, not inferred Jellyfin success.
- [ ] Plex K `X-Plex-Token` retains XML playback/JSON recent movies+episodes/deep links, machine/section IDs, grouping and explicit owned per-release dispatcher finally-close. Every kind's projection is `sessions` with showOnlyPlaying=false; native options remain independently available. All three H/native modes/checks follow F/L.
- [ ] Plex private images use opaque ASSETS handles, source headers never browser URLs; externalURL/subpath and credential/config/trust image invalidation are exercised.
- [ ] Authorized media-server and media-release compositions preserve their differing TTL/stale options, error/Date semantics and action-free reads; playback/release widget consumers demonstrate each server's results/images.
- [ ] Opt-in live proof includes actual sessions/releases for each independent server and Jellyfin auth modes, plus Plex opaque image fetch; inherited type reuse is not cross-provider acceptance.

### INTEGRATION-013 — Search, request and moderate media across the Seerr family

**Delivers:** Three persisted kinds retain full search/details/seasons/request/list/stats/user and approval/decline workflows.

**Start blockers:** INTEGRATION-001 policy/action/image/transport signatures, WIDGETS media-request and ENDPOINTS search/details/request interfaces. **Exclusive ownership:** `overseerr,jellyseerr,seerr` and shared Overseerr-derived adapter; no generic request shortcut.

- [ ] K (`X-Api-Key`/recorded inherited auth) for each; separate factories and native/H checks. Preserve pagination, season arguments, search/detail availability, avatars/statuses, pending/recent merge and deduplication; Jellyseerr availability override has its own fixtures, Seerr remains a distinct saved kind.
- [ ] Preserve request/list/statistics/users and direct request/approve/decline; each projects `pending,approved,available,processing`. F/L includes inherited behavior and per-kind empty/nullable/invalid/application errors, not just base-class tests.
- [ ] Search/details/native query policy resolves before decryption; request/moderation requires action-specific interact for every selected connection. Direct mutations bypass caches, invalidate lists/stats and never blanket-retry ambiguous writes.
- [ ] Per-detail dispatcher release and cancellation/generation fences prevent leaked resources or old-auth completions; native request/list/stats TTL/filter semantics survive.
- [ ] Media-request/search consumers demonstrate reads and gated request/approval/decline. Live search/read proof is separate for all three deployed kinds; request/moderation needs explicitly approved disposable request/season effects.

### INTEGRATION-014 — DNS summaries and reversible controls with versioned sessions

**Delivers:** Configure/test three DNS providers, view native status and Stats, and run authorized enable/timed/indefinite disable flows.

**Start blockers:** INTEGRATION-001 session/trust/action contracts; WIDGETS DNS control interface. PERSISTENCE physical sessions and supported-version approval are release gates. **Exclusive ownership:** `piHole,adGuardHome,technitiumDns` and DNS composition, version detection and auth lifecycle.

- [ ] Pi-hole K or none retains v5 query/v6 SID factory detection, v6 status/null/expiry/retry/test-session teardown. Technitium K or U/P retains lazy version cache, v15 bearer vs legacy query token, login 404 fallback, one token-expired application retry/test logout. AdGuard U/P Basic retains three-read stats/status/filtering merge.
- [ ] All three preserve DNS summary/counts/status and enable/disable durations/defaults; exact projection is `dnsQueriesToday,adsBlockedToday,domainsBeingBlocked,adsBlockedTodayPercentage` percent. H/native form/test alternatives follow F/L, including no-key supported branches.
- [ ] Interact denial precedes decrypt; direct controls preserve source mutation/recovery semantics, invalidate reads and cannot replay ambiguous writes. Synthetic version/probe/session/auth-failure/duration fixtures cover every branch.
- [ ] Credential/config/trust changes fence encrypted fingerprinted session/cache state without adopting a universal TTL; retain recorded provider lifecycle until state normalization is approved.
- [ ] DNS-widget control/status demonstration and separate approved live v5/v6/Technitium protocol+mode/AdGuard acceptance use reversible human-authorized controls. Unknown upstream support versions remain blocked, not summarized as tested.

### INTEGRATION-015 — Private iCal feeds and Nextcloud CalDAV/OCS with recurrence parity

**Delivers:** Configure/test private feed/CalDAV connections and consume accurate calendar results plus Nextcloud notifications without exposing feed/auth URLs.

**Start blockers:** INTEGRATION-001 HTTPS/DAV transport/clock/policy contracts, LOCALIZATION clock/timezone agreement and WIDGETS calendar/notification consumers. **Exclusive ownership:** `ical,nextcloud`, shared calendar result/recurrence contracts and DAV-specific parser; 010/017 consume agreed interfaces only.

- [ ] iCal private `url` secret is actual feed target; form derives base origin without disclosing feed. No generic HTTP and no Stats. Preserve UID recurrence masters/exceptions, moved standalone exceptions, THISANDFUTURE, overlap/window edges and 100000-iteration bound with timezone fixtures.
- [ ] Nextcloud U/P Basic retains subdirectory DAV URL construction, calendar objects/recurrences/timezones and OCS notifications/application errors; projection `messages` is retrieved notifications, not lifetime count. Native/H mode/test fixtures include Node HTTPS/DAV trust/proxy injection distinct from Undici.
- [ ] Calendar composition preserves month plus margins/release-option-compatible contract and Dates; feeds and private notification results require native query policy before secrets, safe errors and cancellation between expansion/fetches.
- [ ] Managed create/edit/mode/test and calendar/notification widget demonstrations satisfy F/L; calendar-library replacement must prove recurrence fixtures instead of generic date arithmetic.
- [ ] Opt-in authorized feed timezone/window and Nextcloud calendar+OCS bounded reads prove base-path/trust/proxy topology. No upstream mutation or feed URL in notes/browser URLs is required.

### INTEGRATION-016 — Notifications, safe Gotify images and reversible Anchor note edits

**Delivers:** Manage three connections, display notifications/notes, delete authorized Gotify messages and edit authorized Anchor notes with safe source links.

**Start blockers:** INTEGRATION-001 native action/image/result interfaces, ASSETS opaque handles, WIDGETS notification/note consumers. **Exclusive ownership:** `ntfy,gotify,anchor` and notification/note result composition; Nextcloud contributes notification results via 015, not duplicate fetch logic.

- [ ] Ntfy topic or topic+K bearer retains JSON-lines/event/message timestamps/attachment/topic path parsing; polling only, no invented publish API. Gotify U/P Basic retains app→message joins/metadata/icon path/image registration and delete URL. Their projections `messages` count retrieved notifications.
- [ ] Anchor K bearer retains list/options/detail/document/permission/tag/pin/archive mapping and update payload; projection `notes` counts retrieved list. H/native checks/credential forms for all three follow F/L.
- [ ] Full native query policy before decrypt; Gotify delete and note update require interact, bypass read caches and invalidate relevant results. No generic full-access request is substituted for bounded native actions.
- [ ] Fixtures prove malformed JSON lines, nullable/partial joins, safe opaque icon handles, note permissions and no retry after ambiguous writes; config/trust/revision changes invalidate auth/images/results.
- [ ] Notification/note consumers demonstrate list/detail/action success and denial. L: supplied topic notification read only; Gotify read/image plus sacrificial message deletion; Anchor disposable note edit/revert, each separately authorized.

### INTEGRATION-017 — Home Assistant entities, calendars and explained real-world actions

**Delivers:** Configure/test Home Assistant, render entity/calendar states and execute explicitly permitted automation/toggle flows.

**Start blockers:** INTEGRATION-001 action/query/trust contract, INTEGRATION-015 agreed calendar contract, WIDGETS smart-home action/options interface. **Exclusive ownership:** `homeAssistant` native client and entity-state/calendar/action composition.

- [ ] K bearer/native test/H hook; retain entity Stats/state, calendar ranges and automation/toggle POST bodies/results; projection `entities,unavailable,lightsOn,peopleHome` matches recorded domains/states. Empty/invalid/schema fixtures follow F/L.
- [ ] Native query allowlists and zero-TTL entity reads remain distinct from interact-gated actions; check every selected integration before decryption and invalidate/re-read after actions.
- [ ] Fixtures demonstrate domain/state mapping, auth failures, aborted work, no ambiguous-write retry and safe error output; UI action contract states actual real-world effects rather than treating toggle as a harmless cosmetic control.
- [ ] Smart-home/calendar widgets demonstrate authorized state and denied/allowed actions. L requires representative entity/calendar and explicit user-approved automation/toggle on an isolated safe target; restore reversible changes.

### INTEGRATION-018 — Host health, storage selectors and historical CPU without admin expansion

**Delivers:** Configure/test five host-health providers and consume native CPU/memory/storage/network/GPU/uptime results and authorized volume selectors.

**Start blockers:** INTEGRATION-001 session/history/trust/result interfaces, COORDINATION/PERSISTENCE fake adapter contracts and WIDGETS system-health/volume options. **Exclusive ownership:** `openmediavault,dashDot,glances,synology,unraid` plus host health composition; physical history/session stores remain shared-owner work.

- [ ] OMV U/P RPC/cookie/login token/session retry retains filesystem/health and volume list, no new admin RPC. Dashdot none retains system info/CPU/storage/memory/network/GPU and ordered CPU history/window aggregation. Glances none retains `/api/4`, optional sensors/SMART, GPU/network, Python uptime parsing and version cache.
- [ ] Synology U/P retains DSM discovery/CGI/maxVersion/login/SID/relogin/error codes, health/SMART/storage/volume selection; Unraid K `x-api-key` retains GraphQL system/storage/network/GPU/uptime with application errors/ISO-duration/optional GPU fixtures.
- [ ] Each projects `cpu` percent, `memoryUsed,memoryAvailable` bytes and `uptime` seconds; native detailed results/selectors remain separate. Native/H modes/checks/management satisfy F/L, prefixed URLs and external links.
- [ ] Glances and Synology tests must use injected trusted transport rather than their recorded bypasses; session fingerprint invalidation is explicit. Synology's 600-second-vs-no-TTL discrepancy remains an unapproved state-policy decision, not a guessed normalization.
- [ ] System-health widget and volume selector proofs check allowed kinds/query policy before secrets, history missing-GPU/storage/samples and optional-plugin failures. L includes repeated Dashdot samples, Glances v4 plugins on/off, approved DSM variants/selectors and OMV/Unraid bounded delegated reads.

### INTEGRATION-019 — Proxmox cluster/node/VM/LXC health with real token policy

**Delivers:** Manage a Proxmox token connection and view authorized cluster resource health, retaining native SDK error behavior safely.

**Start blockers:** INTEGRATION-001 SDK fetch/query/result interface and WIDGETS cluster-health contract; runtime/provider-library and supported-version approval gate real compatibility. **Exclusive ownership:** `proxmox` native client, SDK injection and cluster health result composition, separate from Docker/Kubernetes and generic host batch.

- [ ] Preserve exact public username/tokenId/realm plus private apiKey PVE token format; native/H test/config validates this set, never replacing it with SDK username/password examples. SDK uses trusted injected Fetch; no disable-TLS sample policy.
- [ ] Retain cluster/nodes/VMs/LXCs, parallel node/VM resources, custom errors and units; projection `nodes,vms,lxcs` counts native arrays. Synthetic delegated permission/API-error/partial-node results and F/L cover every method.
- [ ] Native cluster selection follows actual widget subset/allowlist and use/query policy before decrypt; no SDK administrative operation is automatically exposed. Safe provider errors do not leak token strings or broaden permissions to make reads pass.
- [ ] Cluster-health consumer demonstrates nodes/VMs/LXCs independently from host/Docker/Kubernetes UIs. L uses a real delegated read token on approved PVE version/topology and bounded cluster reads; unavailable rights remain explicit failures.

### INTEGRATION-020 — UniFi, OPNsense, VPN and UPS native results with session/history semantics

**Delivers:** Four configured network/UPS providers retain full native summaries and specialized widget-facing options without invented control operations.

**Start blockers:** INTEGRATION-001 cookie/session/history/trust interfaces, COORDINATION history adapter signature and WIDGETS network/firewall/VPN/UPS contracts. **Exclusive ownership:** `unifiController,opnsense,gluetun,peaNut`, UniFi SDK/cookie-agent bridge and network/firewall/VPN/UPS composition.

- [ ] UniFi U/P retains forked SDK trust/cookie isolation, UniFi OS versus legacy login/port fallback, all sites network summaries. Projection `wifi,lan` = users+guests and `latency` ms. Generic cookie/optional CSRF hook shares provider identity but preserves distinct HTTP session lifecycle.
- [ ] OPNsense opnsenseApiKey/opnsenseApiSecret Basic retains four independent CPU/memory/interfaces/version summaries and 15 ordered interface history samples/rates; projection `cpu` percent from total. No Redis channel symbols leak into provider contract.
- [ ] Gluetun none/U/P/K retains VPN/DNS/public-IP/settings join/missing fields and projection `status,publicIp,country` text, **no native VPN controls**. PeaNut none/U/P retains per-device UPS summary/status/metrics, nullable numeric NUT parsing/combined statuses and `devices,onBattery,lowBattery` projection.
- [ ] F/L/H/form/native tests cover every recorded auth alternative and topological branch. Native query policy precedes decrypt; session/history revision/trust changes cannot leak cross-site cookies or serve old-config rates.
- [ ] Network/firewall/VPN/UPS consumer demos preserve independent native data beyond Stats. L covers both deployed UniFi paths/trusted cert and sites, repeated OPNsense interface reads, four Gluetun reads/configured mode and multi-device/auth/no-auth UPS; runtime/fork compatibility remains a real gate.

### INTEGRATION-021 — Bounded read dashboards: transcoding, documents, updates, speed, uptime and model health

**Delivers:** Seven small read-only native clients retain full result APIs and their scalar projections through managed configuration and provider-specific widget consumers.

**Start blockers:** INTEGRATION-001 native/schema/options/Stats interface and WIDGETS named dashboard contracts. **Exclusive ownership:** `tdarr,paperlessNgx,patchmon,speedtestTracker,uptimeKuma,wud,llamacpp` clients and corresponding native result compositions. This is the largest read-only batch; split by named kinds if needed without changing coverage.

| Kind | Auth and complete native surface / exact projection |
| --- | --- |
| `tdarr` | none or K `X-Api-Key`; statistics/workers/transcoding+health queues with firstItemIndex/pageSize/totals; `totalFileCount,totalTranscodeCount,failedTranscodeCount` |
| `paperlessNgx` | K `Authorization: Token`; statistics + count endpoints/document/inbox/tag/correspondent/type; `documentsTotal,documentsInbox,tagsCount,correspondentsCount,documentTypesCount` |
| `patchmon` | public patchmonApiKey/private patchmonApiSecret Basic; host/update/security/outdated full schema; `totalHosts,hostsNeedingUpdates,securityUpdates,totalOutdatedPackages` |
| `speedtestTracker` | K bearer; latest/aggregate/recent(perPage)/dashboard; `ping` ms, `download,upload` bytes/s from bits/8, null when no latest |
| `uptimeKuma` | none/slug/K/slug+K; default/lowercased public page/heartbeat/category/absent-heartbeat paused; `totalMonitors,upCount,downCount,averageUptimePercent`; generic K Basic is separate from native public reads |
| `wud` | none/U/P Basic; container stats/update-detail predicates/full fields; `totalContainers,updatesAvailable` |
| `llamacpp` | none; health/models/Prometheus metrics/optional slots/normalized Stats, source timeouts; `health` text, `tokensGenerated,requestsProcessing`; no completion/model-control API |

- [ ] F/L per row retains all native checks/H alternatives/form modes, nullable/empty/schema/application errors and full native results rather than only projected counts.
- [ ] Preserve queue/page/result bounds, units, source timeouts and explicit unavailable slots/not-ready health. Speedtest conversion applies only in scalar Stats; Kuma uptime fraction→percent/native public semantics cannot become private-dashboard support.
- [ ] Native use/query authorization, trusted transport, exact auth public/private metadata and no secret in parse/error output are demonstrated; no admin/mutation API is added because upstream supports it.
- [ ] Transcoding/document/update/speed/uptime/WUD/model-health widget handoffs demonstrate all native fields and options. L records approved configured modes/server versions and exact source reads, including optional endpoint and paused/no-latest cases where available.

### INTEGRATION-022 — Coolify and Traefik orchestration read models without privileged API expansion

**Delivers:** Manage two orchestration connections and retain complete resource/read/detail/filter APIs and widget results separately from Docker/Kubernetes management.

**Start blockers:** INTEGRATION-001 authorized native/result/bounds interfaces and WIDGETS Coolify/Traefik interfaces; ORCHESTRATION.ProviderResults handoff for any existing dedicated tools UI. **Exclusive ownership:** `coolify,traefik` clients and provider result composition, not extendedtools orchestration UI.

- [ ] Coolify K bearer retains version/health, applications/by UUID/logs/env variables, projects/details/environments/by name or UUID, resources/servers/services and composed instance info. Fixtures preserve project/environment/resource joins and partial payloads. Projection `applications,services,servers` uses lengths.
- [ ] Traefik none/U/P/K bearer retains version, HTTP/TCP/UDP router/service/middleware lists/details/summaries, status normalization, bounds/pagination/resource errors. Projection `routers,services` sums all three protocols; `middlewares` HTTP/TCP only.
- [ ] Every public client method remains available to authorized existing service consumers; sensitive Coolify logs/environment values never become new public endpoints merely because methods are preserved. Native operation-specific policy, server redaction and no broad SDK/admin exposure are explicit.
- [ ] F/L/H/form/native tests cover each auth alternative and complete detailed result families. Approved native widget/tool consumers demonstrate filters/detail/resource errors; Docker/Kubernetes actions/discovery UI remain EXTENDEDTOOLS.DockerDiscovery/Kubernetes primary-owned.
- [ ] L uses authorized read tokens/deployed topology and source-listed lists/details/composition for each provider/protocol; sensitive data is sanitized and minimum scope preserved. No deployment/env mutation is inferred or executed.

### INTEGRATION-023 — Media/dashboard data, per-call SDK isolation and opaque images

**Delivers:** Configure/test four media-data services and display complete albums/assets/streams/library/session results beyond scalar counters.

**Start blockers:** INTEGRATION-001 native/SDK/image contracts, ASSETS opaque-image interface and WIDGETS provider-specific interfaces. **Exclusive ownership:** `immich,tracearr,audiobookshelf,navidrome` clients/compositions and Immich SDK injection.

- [ ] Immich K `X-API-Key` uses per-call baseURL/headers/fetch, never global credentials; retains server/user totals, albums/list/full/randomized previews/assets, pagination/empty albums/thumbhash/media URLs. Projection `userCount,photoCount,videoCount,totalLibraryUsageInBytes` bytes.
- [ ] Tracearr K bearer retains health, stats/streams(serverId), violations/history(pageSize), composed dashboard, nullable schemas and private image paths; projection `activeStreams,totalUsers,totalSessions,recentViolations`.
- [ ] Audiobookshelf K bearer retains libraries/each library Stats/listening time/active sessions/dashboard and partial/empty libraries; projection `libraryCount,totalAudiobooks,totalPodcasts,activeSessions,totalListeningTimeSeconds` seconds, libraries stay native. Navidrome U/P Subsonic query u/p/v/c/f retains artist/album/song dashboard/current sessions, singleton/array and specific empty-library error; projection `artistCount,albumCount,songCount`.
- [ ] F/L/native/H tests and management modes preserve query-secret redaction/application failures/units/limits/user scopes. Immich/Tracearr image registrations return opaque authorized handles, invalidated by revision/trust changes, not raw authenticated URLs.
- [ ] Provider-specific widgets demonstrate albums/previews/assets, filtered dashboard/streams, library/sessions and now-playing. L covers actual SDK/server pairing, approved filters/limits/scoped keys, empty/nonempty Navidrome library and opaque image fetch; a Stats success alone does not satisfy native acceptance.

### INTEGRATION-024 — Umami website selectors and time-scoped analytics in both auth modes

**Delivers:** Manage cloud/selfhosted Umami and consume website/timeframe analytics without silently changing timezone interpretation.

**Start blockers:** INTEGRATION-001 clock/native/auth/result interfaces, WIDGETS Umami options/website-selector interface; LOCALIZATION time contract agreement. **Exclusive ownership:** `umami` native client and analytic composition/selectors.

- [ ] U/P JWT login or K cloud API mode retains websites/by ID, visitor stats(timeFrame), event names/active visitors, top pages/referrers(limit), multi-event series; projection `websites` count. Native/H checks and managed mode-switch follow F/L.
- [ ] Preserve all date/bucket/null/limit boundaries and source **server-local** ranges versus website timezone; do not invent user-local conversions. Cloud/selfhosted routes/auth/schema have separate fixtures.
- [ ] Website selectors and bounded analytics use native allowlist/use/query policy before decrypt; credentials and login JWT remain isolated/server-only, config changes fence cache/session results.
- [ ] Analytics widget demonstrates website selection, all result families and each timeframe; approved L covers both deployed modes/time ranges. Timezone redesign, if desired, is a separate explicit product decision.

### INTEGRATION-025 — TrueNAS pooled upstream connections, protocol fallback and safe shutdown

**Delivers:** Manage TrueNAS U/P/key connections and consume full system/storage/network/reporting health with bounded reconnecting upstream sockets.

**Start blockers:** INTEGRATION-001 revision-keyed connection/trust/operation interface, approved runtime/topology/lifecycle decision for production, WIDGETS system-health contract. **Exclusive ownership:** `truenas` client/wire protocols/pool lease adapter; shared connection primitive remains 001/COORDINATION-owned.

- [ ] Retain U/P or K native login/test, ws JSON-RPC-first/legacy fallback, system/pool/dataset/reporting/network results, reporting variants and 5-second request timer. Projection `cpu` percent, `memoryUsed,memoryAvailable` bytes, `uptime` seconds; generic HTTP explicitly unavailable.
- [ ] Fixtures cover both protocols, request IDs/auth/close/error/timeout and test eviction. Replace ID-only shared ownership with agreed revision/config/trust-aware acquire/release/invalidate/drain semantics without closing another caller's lease; this is an explicit lifecycle requirement, not measured leak evidence.
- [ ] Config edits/delete/trust refresh/test failure fence late responses/pooled auth state and expose sanitized diagnostics; shutdown drains owned sockets. No broad NAS administration methods are added.
- [ ] F plus native management/system-health demonstration proves permission-before-decrypt, resource cleanup and no duplicate unsettled work. Physical concurrency/restart behavior follows approved COORDINATION topology.
- [ ] L covers approved API generations/auth modes, reconnect/credential edit/trust change/repeated open-close/shutdown and bounded health reads. No public global disposal exists in source; acceptance requires the new owned lifecycle, not an assertion that current maps already drain.

### INTEGRATION-026 — Beszel systems, history, alerts/actions and authenticated realtime

**Delivers:** Manage Beszel, consume complete system/container/SMART/systemd/alert data and execute authorized alert/system actions with safe realtime updates.

**Start blockers:** INTEGRATION-001 session/stream/action/connection signatures, COORDINATION history contract and ENDPOINTS agreed stream host interface; WIDGETS Beszel consumer contract. Actual stream hosting/physical state are composed release gates, not start dependencies. **Exclusive ownership:** `beszel` client, PB auth/realtime parser, native composition/actions; endpoint lane owns public stream transport.

- [ ] U/P PocketBase auth preserves JWT exp/leeway/TTL, expired-token empty-list behavior, one 401 recovery, systems/details/stats(type,perPage), containers/stats/SMART/systemd/alerts/history/selectors. Projection `systems`; H/native checks/managed config follow F/L without universal TTL normalization.
- [ ] Alert create/update/delete and system pause/resume/delete preserve every body/result, action-specific interact policy before secret access and direct cache invalidation. Fixtures include permission denial/invalid payload/ambiguous result; no blanket write retry.
- [ ] SSE parsing retains split frames/PB_CONNECT/topic/register/retry/abort, bounded async delivery and simulated-vs-real distinction. Body cancellation, reader release and dispatcher finally-close are owned on success/error/abort.
- [ ] Authorized Beszel consumer demonstrates all read families/history/actions and realtime subscribe/unsubscribe; zero-TTL history Stats remain explicit. ENDPOINTS stream handoff carries terminal error/abort semantics, not transport objects in browser exports.
- [ ] L uses approved agent ≥0.13.0 for realtime, auth expiry/disconnect/reconnect/config/trust changes/shutdown and bounded collections/history; only explicitly disposable alerts/systems may be mutated. No generic system deletion is casually included in a read probe.

### INTEGRATION-027 — ArchiveTeam Warrior websocket snapshot parity beyond HTML test success

**Delivers:** Configure/test Warrior and render bounded runner/project/item/bandwidth/state snapshots through trusted upstream ws/wss.

**Start blockers:** INTEGRATION-001 ws trust/operation/lifecycle contract and WIDGETS Warrior result interface; production runtime/library/topology decisions. **Exclusive ownership:** `archiveTeamWarrior` HTML probe, SockJS/Seesaw snapshot parser/client and native composition.

- [ ] none/U/P Basic native/H modes; preserve HTML probe then websocket snapshot, runner/project/items/bandwidth/counts and every Seesaw state/frame; projection `running,completed,failed` from native counts.
- [ ] Fixtures exercise 2500-ms snapshot deadline/close/error/auth branches, signal/pre-abort/trust injection, shared vs owned agent/socket release and config revision invalidation; no assumed HTTP trust from an HTML success.
- [ ] Native query policy and safe error normalization precede decrypt; no new runner/project control capability is fabricated. F plus managed create/test/edit and Warrior-widget demo preserves complete native output.
- [ ] L separately proves snapshot authentication/trusted ws/wss, timeout/abort/repeated open-close/shutdown on approved deployed version; connection probe alone cannot pass websocket acceptance.

### INTEGRATION-028 — Wazuh dual-origin security queries and honest unavailable capabilities

**Delivers:** Manage API-only/API+indexer/indexer-only Wazuh connections and render all eight security result families with separate origin/permission and unavailable-data semantics.

**Start blockers:** INTEGRATION-001 multi-origin snapshot/auth/session/clock/policy contracts and WIDGETS Wazuh result/filter/deep-link interface. Stats mismatch and native URL security decisions gate changed presentation/policy, not parser port work. **Exclusive ownership:** `wazuh` API/indexer auth/client/named queries/security composition; security dashboard presentation remains widget owner, not duplicated extendedtools UI.

- [ ] Preserve API U/P, combined API+indexer URL/U/P, or indexer-only URL/U/P; optional dashboard URL. Public indexer URL/username/dashboard metadata versus private passwords remain full-editor scoped. JWT/401 retry and indexer Basic are distinct, with independent origin authorization/trust.
- [ ] Retain **eight** native families: agents, recent alerts(minLevel/limit/hours), timeline, top-list, security summary(range), vulnerabilities, FIM, authentication failures. Preserve named query/fallback/severity/time/aggregation/null/deep-link semantics in each credential mode.
- [ ] No Stats implementation is manufactured; existing selectable-but-unsupported/empty discrepancy is recorded with Bindery. H mode/native connection checks/configuration follow F/L, without flattening indexer/dashboard into API URL.
- [ ] Synthetic API-only/combined/indexer-only fixtures cover every result family and unavailable-without-indexer errors, never fake zeros. Policy denial precedes secret exchange on both origins; bounded retries/redaction/session revision fences prevent credential leakage or stale security data.
- [ ] Wazuh widget demonstrates filters/time ranges/deep links and unavailable states. L requires authorized representative API/index data with minimal per-origin privileges and approved versions; missing indexer services/data/access is blocked, not success or justification to drop capability.

## Exact-once provider/model coverage ledger

Every kind below represents its registered definition, lazy factory, preserved durable integration/secret/permitted relation model and full native surface. `N` = native Stats, `P` = existing-client projection, `—` = no Stats; `H` = generic HTTP eligible under the recorded exact supported modes, `—` = unavailable. Metadata/CRUD/test UI is centrally owned by 001/002 and HTTP connection resolution by 003; these are consumers/shared owners, **not additional primary mappings**. Provider authentication state machines and native methods belong to the primary row ticket.

| Kind | Primary ticket | Stats | Generic HTTP |
| --- | --- | --- | --- |
| `miniflux` | INTEGRATION-001 | N | H |
| `mock` | INTEGRATION-001 | P | H |
| `autobrr` | INTEGRATION-004 | N | H |
| `jellystat` | INTEGRATION-004 | N | H |
| `tubearchivist` | INTEGRATION-004 | N | H |
| `komga` | INTEGRATION-004 | N | H |
| `romm` | INTEGRATION-004 | N | H |
| `stash` | INTEGRATION-004 | N | H |
| `maintainerr` | INTEGRATION-004 | N | H |
| `yourSpotify` | INTEGRATION-005 | N | H |
| `mealie` | INTEGRATION-005 | N | H |
| `trilium` | INTEGRATION-005 | N | H |
| `tandoor` | INTEGRATION-005 | N | H |
| `spoolman` | INTEGRATION-005 | N | H |
| `linkwarden` | INTEGRATION-005 | N | H |
| `karakeep` | INTEGRATION-005 | N | H |
| `changedetection` | INTEGRATION-005 | N | H |
| `scrutiny` | INTEGRATION-006 | N | H |
| `netalertx` | INTEGRATION-006 | N | H |
| `unmanic` | INTEGRATION-006 | N | H |
| `syncthingRelay` | INTEGRATION-006 | N | H |
| `prometheus` | INTEGRATION-006 | N | H |
| `netdata` | INTEGRATION-006 | N | H |
| `fileflows` | INTEGRATION-006 | N | H |
| `healthchecks` | INTEGRATION-006 | N | H |
| `gatus` | INTEGRATION-006 | N | H |
| `caddy` | INTEGRATION-006 | N | H |
| `frigate` | INTEGRATION-007 | N | H |
| `homebox` | INTEGRATION-007 | N | H |
| `plantit` | INTEGRATION-007 | N | H |
| `xteve` | INTEGRATION-007 | N | H |
| `sabNzbd` | INTEGRATION-008 | P | H |
| `nzbGet` | INTEGRATION-008 | P | H |
| `aria2` | INTEGRATION-008 | P | H |
| `slskd` | INTEGRATION-008 | P | H |
| `deluge` | INTEGRATION-009 | P | H |
| `transmission` | INTEGRATION-009 | P | H |
| `qBittorrent` | INTEGRATION-009 | P | H — K only |
| `sonarr` | INTEGRATION-010 | P | H |
| `radarr` | INTEGRATION-010 | P | H |
| `lidarr` | INTEGRATION-010 | P | H |
| `readarr` | INTEGRATION-010 | P | H |
| `bindery` | INTEGRATION-010 | — | H |
| `jackett` | INTEGRATION-011 | P | H |
| `prowlarr` | INTEGRATION-011 | P | H |
| `bazarr` | INTEGRATION-011 | P | H |
| `jellyfin` | INTEGRATION-012 | P | H |
| `emby` | INTEGRATION-012 | P | H |
| `plex` | INTEGRATION-012 | P | H |
| `overseerr` | INTEGRATION-013 | P | H |
| `jellyseerr` | INTEGRATION-013 | P | H |
| `seerr` | INTEGRATION-013 | P | H |
| `piHole` | INTEGRATION-014 | P | H |
| `adGuardHome` | INTEGRATION-014 | P | H |
| `technitiumDns` | INTEGRATION-014 | P | H |
| `ical` | INTEGRATION-015 | — | — |
| `nextcloud` | INTEGRATION-015 | P | H |
| `ntfy` | INTEGRATION-016 | P | H |
| `gotify` | INTEGRATION-016 | P | H |
| `anchor` | INTEGRATION-016 | P | H |
| `homeAssistant` | INTEGRATION-017 | P | H |
| `openmediavault` | INTEGRATION-018 | P | H |
| `dashDot` | INTEGRATION-018 | P | H |
| `glances` | INTEGRATION-018 | P | H |
| `synology` | INTEGRATION-018 | P | H |
| `unraid` | INTEGRATION-018 | P | H |
| `proxmox` | INTEGRATION-019 | P | H |
| `unifiController` | INTEGRATION-020 | P | H |
| `opnsense` | INTEGRATION-020 | P | H |
| `gluetun` | INTEGRATION-020 | P | H |
| `peaNut` | INTEGRATION-020 | P | H |
| `tdarr` | INTEGRATION-021 | P | H |
| `paperlessNgx` | INTEGRATION-021 | P | H |
| `patchmon` | INTEGRATION-021 | P | H |
| `speedtestTracker` | INTEGRATION-021 | P | H |
| `uptimeKuma` | INTEGRATION-021 | P | H |
| `wud` | INTEGRATION-021 | P | H |
| `llamacpp` | INTEGRATION-021 | P | H |
| `coolify` | INTEGRATION-022 | P | H |
| `traefik` | INTEGRATION-022 | P | H |
| `immich` | INTEGRATION-023 | P | H |
| `tracearr` | INTEGRATION-023 | P | H |
| `audiobookshelf` | INTEGRATION-023 | P | H |
| `navidrome` | INTEGRATION-023 | P | H |
| `umami` | INTEGRATION-024 | P | H |
| `truenas` | INTEGRATION-025 | P | — |
| `beszel` | INTEGRATION-026 | P | H |
| `archiveTeamWarrior` | INTEGRATION-027 | P | H |
| `wazuh` | INTEGRATION-028 | — | H |

### Reconciliation totals and non-provider models

- Primary-kind batch counts: 001=2; 004=7; 005=8; 006=10; 007=4; 008=4; 009=3; 010=5; 011=3; 012=3; 013=3; 014=3; 015=2; 016=3; 017=1; 018=5; 019=1; 020=4; 021=7; 022=2; 023=4; 024=1; 025=1; 026=1; 027=1; 028=1. Sum **89**, no omitted/duplicate primary kind. Tickets 002/003 have shared-surface ownership, not another kind partition.
- Native Stats: 001=1, 004=7, 005=8, 006=10, 007=4 → **30**. Projections: Mock=1 plus 008=4, 009=3, 010=4, 011=3, 012=3, 013=3, 014=3, 015=1, 016=3, 017=1, 018=5, 019=1, 020=4, 021=7, 022=2, 023=4, 024=1, 025=1, 026=1, 027=1 → **56**. Total **86**; no implementations for iCal/Bindery/Wazuh.
- Generic HTTP: **89 minus iCal and TrueNAS = 87**, with qBit K-only exception and exact credential-mode matching delegated centrally to 003; 87 is eligibility, not a claim all native alternatives work generically.
- Integration configuration/secret/app link/item attachment/delegated grant model semantics: primary **002**; immutable authorized snapshots/definition/factory/capability/result models: **001**. Actual physical schema/conversion/crypto implementation remains PERSISTENCE/IDENTITY, with named integration handoffs, not duplicate persistence ownership. HTTP selector/auth result model: **003**. Sessions, history, Stats snapshot/cache and connection envelopes: **001** owns contract/execution semantics, physical storage COORDINATION/PERSISTENCE; provider state machines remain their ledger owners. Private-image storage/trust metadata remain ASSETS/extendedtools respectively.
- Every research §4 native composition family is accounted for: indexer 011; downloads 008/009; organizer 010; calendar 015 contract with 010/017 implementations; playback/releases 012; request list/stats/search/actions 013; transcoding 021; DNS 014; host/cluster health 018/019/025; firewall/network/VPN/UPS 020; smart-home 017; notes/notifications 016 with Nextcloud contribution 015; Coolify/Traefik 022; Immich/Tracearr/audiobook/Navidrome 023; Paperless/Patchmon/speed/Kuma/WUD/llamacpp 021; Umami 024; Beszel 026; Warrior 027; Wazuh 028; all scalar Stats snapshot composition 001. No operation is replaced wholesale by arbitrary HTTP.
- Unregistered GitHub is **not** a 90th kind; retain existing durable personalAccessToken/privateKey/githubAppId/githubInstallationId values through 002/PERSISTENCE without inventing a client. Unused Octokit/maria2 dependencies are not providers. Weather/air-quality/stocks/RSS/releases/timetable/Minecraft/Docker/system resources belong to their widget/extendedtools inventories, outside these 89.

## Exact unresolved decisions and blockers

All items below are **unapproved**. They block the specified final behavior/production evidence; only agreed interface availability blocks independent fixture implementation. They are not fictitious implementation tickets and are not resolved by this draft.

1. **DECISION.DeploymentTopology:** single versus concurrent/multi-process deployment, durable storage portability and shared-state guarantees. Gates actual cache/fanout/coalescing/leases/restart behavior and pooled-stream ownership; FOUNDATION/COORDINATION/PERSISTENCE must reconcile it. Do not choose Redis removal or local-only state here.
2. **DECISION.RuntimeAndLifecycle:** final Node/Bun/runtime/preset and explicit agent/dispatcher/socket ownership/cancellation/drain/trust refresh. Node-only TLS/HTTPS/ws/forked UniFi SDK behavior is not proven edge portable; installed fork advertises Node ≥22. Gates actual provider compatibility, especially 009/012/015/019/020/023/025–027, not parsing against fakes.
3. **DECISION.ProviderLibraries:** retain/adapt versus replace SDK/Fetch/Axios/ws/DAV/calendar libraries and pin versions; package/hoisted direct-dependency audit needs the coordinator's manifest writer. A replacement may change signatures but must pass provider/result/auth/trust/lifecycle acceptance. No blanket library-rewrite mandate or automatic upstream API redesign is approved.
4. **DECISION.SupportedProviderVersionsAndAccess:** approved deployed server/API/auth alternatives for each non-Mock provider and secure authorized test services. No maintained live matrix or supplied services/credentials exists in the evidence. qBit older/newer/API-key modes, Pi-hole v5/v6, Technitium variants, UniFi topologies, DSM variants, TrueNAS generations, Beszel agent ≥0.13.0 and independent inherited servers need explicit baseline. Minimum rights/disposable mutation targets and effects approval are real live blockers; no broad privileges or invented pass.
5. **DECISION.StatsSelectionMismatch:** Bindery/Wazuh are selectable but lack generic Stats. Decide retain recorded empty/unsupported behavior versus separately specified selection/capability correction. Keep native providers and all methods; no invented metrics. Blocks changed Stats UI/catalog claims only.
6. **DECISION.SlskdNoOpControls:** decide whether to preserve resolving no-op presentation, expose unsupported controls honestly, or commission a separately scoped upstream extension. Native listings/projection remain preserved; mutation support is not approved. Blocks changed control UX/capability flags only.
7. **DECISION.NativeURLAndDiagnosticSecurity:** specify native update URL validation versus stricter create rules, multi-origin/iCal exceptions, trust scope and backwards handling of stored connections. Frigate HTTPS and generic-HTTP restrictions already exist and must stay. Any universal HTTPS/SSRF-policy expansion is unapproved; rich authorized diagnostics must still be safely redacted.
8. **DECISION.StateAndCryptoContinuity:** actual key/data conversion, session/history/Stats/image lifetime across restart and trust/config-change eviction. Synology's TTL difference and other provider-specific expiries are evidence, not a universal expiry spec. Physical repositories/identity/trust/assets are composed release gates; encrypted durable values/permissions cannot be discarded. Improved atomic config writes require an explicit transaction decision.
9. **DECISION.CreateSearchEngineFlag:** accepted `attemptSearchEngineCreation` has no inspected mutation effect. Decide explicit no-effect preservation/removal of misleading form contract versus a separately specified feature with its actual search owner; do not silently implement or advertise working automatic search creation.
10. **COORDINATION.CrossAreaContracts:** exact final endpoint names/hosts, widget options/allowlists/rendering, stream host, arbitrary executor, certificate administration, onboarding and assistant/Docker/Kubernetes handoffs need coordinator reconciliation with their primary owners. This draft supplies interfaces and primary ownership, not duplicate UI tickets or undiscovered endpoint inventories. Scope/count/edges require user approval before publication.

**Verification status:** Evidence is static source research only. No executed compatibility, benchmark, leak, full live support or migration-safety claim is made. The draft remains reviewable planning until granularity, interfaces and decision dependencies are approved.
