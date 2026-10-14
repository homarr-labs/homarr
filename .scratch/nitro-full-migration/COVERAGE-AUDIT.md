# Full Nitro migration — capability coverage audit

## Verdict

**The inventory census is complete; the proposed ticket coverage is not yet closed.** All required widget, option, input, provider, model, page, procedure, REST, MCP and HTTP identities are present. This is not evidence that every capability has one implementable primary ticket: the drafts contain missing delivery obligations, orphaned backend handoffs, conflicting vertical owners and unresolved ticket-key bindings.

Blocking findings:

1. **B1 — Bind real ticket keys:** all 334 procedure rows use 88 semantic owner labels, not actual proposed ticket keys; 47/61 page rows and 19/38 HTTP method rows also use external/semantic labels. Some labels require leaf-level splits and some name the wrong lane. The crosswalk below identifies candidates, not coordinator-approved assignments.
2. **B2 — Generic request execution is orphaned:** INTEGRATION-003 owns credentials/resolution, explicitly excludes the arbitrary-request executor, and delegates it to extendedtools. No extended ticket accepts the separate `integration.request` capability. Custom JSX execution is not its replacement. This affects one internal mutation, REST R51 and MCP `integration_request`.
3. **B3 — Standalone widget delivery is not accepted:** `/widgets/[kind]` and its layout are handed to the widget lane, but none of its 28 tickets names or accepts that standalone feature. Embedded editor previews are not equivalent. The standalone API-reference entry also needs an explicit disposition/guarded consumer binding, although its explorer capability already has candidates.
4. **B4 — Docker/Kubernetes engine handoffs have no accepting ticket:** OPS-03–05 cover pages/adapters while excluding or depending on separately owned clients/readers; the integration draft explicitly excludes Docker management and Kubernetes from its provider work. Bind the reusable backend/runtime adaptation and lifecycle obligations, not merely their 22 procedure names or 11 pages.
5. **B5 — Resolve overlapping delivery claims:** root composition, shared routing controls, management/About, tours, logs/tasks, certificates/key tools and assets/PWA have competing owners. Some backend/UI splits are sensible, but several ticket bodies claim the same complete UI or service boundary. Exactly-one primary capability ownership is not established.
6. **B6 — Apply current decisions:** older drafts still reopen singleton, router convention, Mantine/use-intl and Redis removal. They must not turn settled choices into blockers or assume approval for Q11–15.

No drafts were rewritten, no ownership/DAG was independently approved, and no tickets were published or marked ready. Only this audit file was written. All comparisons were read-only text/table parsing or directory enumeration; no application imports, checks, live calls, tracker changes, runtime/container access or nested agents occurred.

## Baseline and interpretation

Current authority is `.scratch/nitro-full-migration/DESIGN.md:18–51` and `.scratch/nitro-full-migration/TICKET-DRAFTING.md:5–23`: singleton, SQLite plus optional PostgreSQL, retained Mantine, standalone use-intl, bounded Auth.js Core Fetch-first investigation, named folder/file TanStack routes, Redis removal/Nitro KV where suitable, Nitro-only build and focused future regressions. External contracts may break; application capabilities and durable content may not disappear. Q11 ORM/drivers is provisional; Q12 copied-data import, Q13 editor drafts, Q14 realtime and Q15 login continuity are unanswered.

Eight completed inventories were consumed:

| Inventory under `research_notes/Homarr full Nitro migration/` | Audit authority |
| --- | --- |
| `widgets.md` | §§1–5: 69 definitions/loaders, 372 exact direct option keys, 25 input types, per-kind data/actions/refresh/security |
| `integrations.md` | §§1–4: 89 native/factory identities, 30 native Stats, 56 projections, exact credential/native/HTTP boundaries |
| `persistence-background.md` | §§2–6: 40 models, migrations/transactions, non-SQL state, three jobs, lifecycle/files/complete crypto |
| `identity-administration.md` | §1 I01–I28 and §5: authentication, grants, settings, setup, secret and security discrepancies |
| `localization-ui.md` | §§1,3,6: 36 catalogs, translator/formatting contracts, frontend consumers and uncertainty |
| `dashboard-navigation.md` | §§2–9,12: 61 pages, 10 layouts, fallback boundaries, viewer/editor/search/navigation |
| `extended-features.md` | §§2–10,12: Assistant, Custom JSX, Workshop, onboarding, media/icons, backups, ops/CLI/packaging/PWA |
| `endpoints-transports.md` | Application/REST/MCP/HTTP ledgers and lifecycle obligations, including non-procedure protocols |

Counts measure **source identities represented in planning**, not implemented parity, runtime tools/list, successful generated schemas or live provider support. Semantic families and consumers are not extra tickets. Evidence-derived candidate bindings below are deliberately not a new ownership graph.

## Reconciled counts

| Census | Inventory | Draft reconciliation | Actual-ticket binding status |
| --- | ---: | --- | --- |
| Proposed tickets | — | core 25 + dashboard 20 + widgets 28 + integrations 28 + extended 34 + transports 5 = **140 distinct keys** | All 140 headings exist; no duplicate heading key |
| Widget kinds | 69 | **69/69**, exact set, no missing/extra/duplicate kind | Each row names one existing WIDGET key |
| Direct widget options | 372 | **372/372**, exact per-kind key lists, including internal/generic/zero-option definitions | Same primary kind ticket; no option-key difference from inventory |
| Input types | 25 | **25/25**, exact set | Each names an existing WIDGET key; editor dispatch is a separate consumer |
| Registered integrations | 89 | **89/89**, exact set, no missing/extra/duplicate kind | Each names one existing INTEGRATION key; 26 kind-owning tickets, plus 002/003 shared surfaces |
| Stats implementations | 86 | **30 native + 56 projections**, exact per-kind classification | Same provider keys; no Stats for `ical`, `bindery`, `wazuh` |
| Generic HTTP eligibility | 87 | **89 minus `ical` and `truenas`** | Same provider rows plus INTEGRATION-003 resolver; eligibility is not complete executor coverage (B2) |
| Durable models | 40 | **40/40**, exact model set | All structural-preservation rows name CORE-02; behavior consumers are not all actual keys |
| Source pages | 61 | **61/61**, exact set against static page-file paths; 10 non-management + 51 management | **14 actual local keys + 47 external-label rows**; B3/B5 remain |
| Source layouts | 10 | **10/10** listed; distinct from the 61 pages | Six local/composite rows, four external rows; standalone widget acceptance missing |
| Fallback files | 2 loading / 3 error / 5 not-found | All ten responsibilities listed | External Docker/Kubernetes/settings boundaries still require key binding |
| Application procedures | 334 | **334/334 exact paths and kinds**, 27 roots; 191Q + 139M + 4S | **0/334 literal actual-ticket keys**, 88 distinct semantic labels; crosswalk required |
| Public REST selections | 52 | **52/52 exact method/path/application joins**, no duplicate or broken R join; 17Q + 35M | Inherits unresolved procedure bindings; R51 executor gap |
| Eager MCP candidates | 133 | **133/133 exact names**, unique and joined to application leaves; 77Q + 56M | Inherits unresolved procedure bindings; `integration_request` gap |
| HTTP route files/methods | 26 / 38 | **26/26 files and 38/38 explicit methods**, no duplicate file+method | **9 protocol files/19 methods have actual TRANSPORT keys; 17 feature files/19 methods have semantic keys** |

Evidence: `drafts/widgets.md:40–147,530–568`; `drafts/integrations.md:451–554`; `drafts/core.md:394–439`; `drafts/dashboard.md:340–499`; `drafts/transports.md:135–618,650–698`, all under `.scratch/nitro-full-migration/`. Source model authority: `packages/db/schema/{index,sqlite,postgresql}.ts`; widget authority: `packages/definitions/src/widget.ts`, `packages/widgets/src/{registry,manifest}.ts`, `_inputs/index.ts`; integration authority: `packages/definitions/src/integration.ts`, `packages/integrations/src/base/creator.ts` and `stats/existing.ts`. Inventory source links retain the per-kind definition/client evidence.

### Important non-additive counts

- REST registry selects 78 leaves (33Q/45M); **26 selected leaves lack public operation metadata**, not 26 extra public operations.
- Eager MCP registry has 29 roots/204 leaves (108Q/94M/2S): **133 candidates + 71 non-candidates**. Nine application annotation-only queries (`widget.llamacpp.getStats` and Wazuh8) are outside eager selection. **142 annotations is not 142 tools**; hiding Custom Widget33 leaves 100 static non-admin candidates, not a proven runtime catalog.
- Widget95 includes 46 subrouters; Kubernetes11 includes ten subrouters. Subrouters are neither additional widget kinds nor pages.
- HTTP method totals: GET20 + POST11 + PUT1 + PATCH1 + DELETE2 + OPTIONS3 = **38**. REST52 and HTTP38 are different censuses; dynamic auth actions, manifest, MCP resources/templates, external Workshop/Docs and generated framework assets do not add fixed registrations.
- Widget discovery is 68 native choices plus dynamic definitions under `customApi`; advanced-focus flags are 42, not additional kinds. Provider89 includes Mock; **88 non-Mock** future live rows is not the Stats selection count.

### Transport area's totals are label totals, not reconciled ticket ownership

| Current semantic area | Procedures | REST selections | MCP candidates |
| --- | ---: | ---: | ---: |
| core | 57 | 25 | 15 |
| dashboard | 48 | 23 | 26 |
| widgets | 95 | 0 | 33 |
| integrations | 29 | 4 | 13 |
| extended | 105 | 0 | 46 |
| **Total** | **334** | **52** | **133** |

These arithmetic totals pass, but cannot be promoted to the final graph: e.g. certificates6 are labelled integrations despite ADMIN-06/OPS-06, icons1 despite MEDIA-03, and updates1 despite OPS-09/CORE-03. `drafts/transports.md:268–331,684–696` is the evidence, not authority to invent integration tickets for these families.

## Blocking capability findings

### B1 — Unresolved key mappings are relational gaps, not 334 missing features

`drafts/transports.md:12,129–133` explicitly postpones key resolution. A single blanket alias map will be wrong: `dashboard.BOARD-CATALOG` spans BOARD-01, BOARD-06 and SEARCH-03; `dashboard.BOARD-LIFECYCLE` spans BOARD-06/09; `widgets.BESZEL` spans two tickets; `widgets.WAZUH` spans two; the Custom Widget families split differently from the extended ledger. REST/MCP joins are identity-correct but do not fix this.

Coordinator closure: replace or bind every semantic/area primary label to exactly one actual key **per source leaf/capability**, distinguishing structural persistence, platform implementation, feature adapter and consumer. Resolve disagreements below rather than preserving the transport area's incidental ownership partition. This audit does not assign writers or dependency edges.

### B2 — Separate generic arbitrary-request executor is not covered

- `drafts/integrations.md:27,73–83` assigns INTEGRATION-003 only connection/auth selection and redaction, and explicitly gives executor/API/UI to EXTENDEDTOOLS.GenericRequestAndCustomJSX.
- `drafts/extended.md:194–208,591–629` accepts Custom JSX protected named requests, not `integration.request`; its request/redirect/time-limit contract is different. ASSISTANT-04 consumes authorized tools, not a substitute executor owner (`extended.md:79–94`).
- `drafts/transports.md:202,530` retains the source mutation/R51/MCP name, under the nonexistent actual key `integrations.HTTP-REQUEST`.
- Canonical source: `packages/api/src/router/integration/integration-request.ts:124`; `research_notes/Homarr full Nitro migration/endpoints-transports.md:144–148`; connection and executor separation: `integrations.md:213–219,338`.

Required closure: an actual ticket must accept the whole existing executor/service+authorized descriptor+client-consumer delivery (or an explicit capability-preserving replacement): exactly-one selector/full access before decrypt, origin/path/header restrictions, seven methods, DELETE confirmation, no retries/cache/redirects, 15-second timeout, 10-KiB body, 16-KiB headers, 1-MiB response and safe result/redaction. These bounds are already stated in INTEGRATION-003, but assigned away. Do not invent a new arbitrary-request management screen or treat HTTP eligibility87 as completion.

### B3 — Standalone widget and reference consumers need disposition

`drafts/dashboard.md:336,353,421,519,571` hands off the standalone widget page/layout. `drafts/widgets.md:153–183,514–526,564–569` provides board runtime/editor bridges but no standalone page delivery/acceptance.

Source feature is concrete, not merely an embed alias:

- `apps/nextjs/src/app/[locale]/widgets/[kind]/page.tsx:20–44`: kind validation, login return target, authorized integration list, home-board preview context and modal/loading composition.
- Same directory `layout.tsx:9–20`: kind navigation and headerless shell.
- `_content.tsx:30–104,108–173`: lazy definition/renderer, local options/integration/advanced state, edit modal, resize dimensions, edit-mode toggle, error reset, undefined saved IDs and feedback.

Bind one actual feature ticket to these capabilities (candidate shared widget-runtime/editor scope, not assigned here), or record deliberate incorporation into an equally usable target feature. Preserving all 69 card renderers does not preserve this workflow by itself.

`/reference/api` is likewise only EXT-TRANSPORTS in `dashboard.md:352`. TRANSPORT-REST owns a curated explorer flow; OPS-07 owns API-tools presentation. Preserve the standalone reference capability through one of those existing keys or explicit consolidation; do not automatically require the old URL. Source `apps/nextjs/src/app/[locale]/reference/api/page.tsx:7–11` requires admin and masks denial with not-found. No replacement may silently turn this guarded UI into an anonymous explorer because `/api/openapi` is public.

### B4 — Operational backend adaptation is delegated in a circle

`drafts/integrations.md:28–29` places Docker management and Kubernetes outside IntegrationKind89; `research_notes/Homarr full Nitro migration/integrations.md:338` confirms the non-registry boundary. Its 28 ticket bodies contain no Docker/Kubernetes engine slice. `drafts/extended.md:429,445,449,461` excludes Docker client/runtime guts and requires integration-owner Kubernetes readers. `drafts/dashboard.md:334,387–403,548` still hands their tools UI to EXT-INTEGRATIONS, contradicting OPS-03–05's UI delivery.

Actual capabilities: Docker11, Kubernetes11, Docker two pages and Kubernetes nine pages, plus Kubernetes layout and Docker/Kubernetes recovery. Evidence: `research_notes/Homarr full Nitro migration/endpoints-transports.md:252–273,307,631–646`; `extended-features.md:226–228`; sources `packages/api/src/router/docker/docker-router.ts`, `packages/docker/src/{index,singleton}.ts`, `packages/docker/src/discovery/`, `packages/api/src/router/kubernetes/`.

Required closure: name an accepting actual ticket for reusable engine/service adaptation, environment/capability/secret guards, endpoint identity, discovery/actions/readers, upstream lifecycle and disposal. Reusing those source modules is valid; assuming an unlisted provider owner ports them is not. The 22 leaves are listed, so this is an accepting-scope gap, not a numerical omission or a requirement to add Docker/Kubernetes to the 89 registry.

### B5 — Competing primary deliveries

| Capability | Competing claims in actual drafts | Evidence / required distinction |
| --- | --- | --- |
| Root/SSR/provider/route composition | CORE-01/CORE-08 versus SHELL-01 | `core.md:50,148,565`; `dashboard.md:47–60`; `transports.md:11`. Both claim root/route/provider single-writer territory; split explicit contributions versus final composition, not two registrars. |
| Shared Link/search/pagination internals | I18N-04 versus SHELL-02 | `core.md:350–362`; `dashboard.md:62–74`. Both claim the same shared adapter internals, not just different callers. |
| Management home/About and four HTTP payloads | SHELL-03/SHELL-05 versus OPS-09 | `dashboard.md:76–115,354–355,443–446`; `extended.md:523–537,626`. OPS-09 is not merely an external update/analytics consumer in its body. |
| Tours/status/reset | ADMIN-04 + SHELL-03 versus OPS-08 | `core.md:269–278,467`; `dashboard.md:79,87,513`; `extended.md:507–521,625`. Three user procedures have dual primary ledger claims. Separate durable service/target slots from one workflow owner. |
| Log UI and authorized stream adapter | CORE-05 versus OPS-01 | `core.md:102–112`; `extended.md:395–409,618`; `dashboard.md:335,389`. Core explicitly calls its log screen a vertical slice, not only a history service. |
| Task calls/UI | CORE-06 versus OPS-02 | `core.md:116–126`; `extended.md:411–425,619`; `dashboard.md:390`. Scheduler/configuration versus feature adapters could be distinct, but both bodies currently include task UI/calls. |
| Certificates/hostname UI/calls | ADMIN-06 versus OPS-06 | `core.md:295–306`; `extended.md:475–489,623`; `dashboard.md:393–394`; transport assigns six leaves to integrations. Secure storage/trust policy may be a backend seam; both tickets still claim lists/upload/exception UI. |
| API-key reveal/revoke tools page | AUTH-04 versus OPS-07 | `core.md:200–206`; `extended.md:491–505`; `dashboard.md:391`. Issuer/verifier versus page/help/explorer is a valid intended split, but core also owns admin calls/UI. |
| Head/fonts/branding/PWA | I18N-06 + SHELL-04 + OPS-12 | `core.md:378–390`; `dashboard.md:90–102`; `extended.md:571–585`; `transports.md:626,629`. Descriptors, emitter and feature consumers can differ; manifest/worker/static/head/known-image implementations currently recur. |
| Offline account recovery | ADMIN-01 versus OPS-10 | `core.md:228–237`; `extended.md:539–553`. Shared account algorithm versus CLI adapter is a plausible split; explicitly accept it rather than count the same recovery delivery twice. |

Not every repeated reference is a duplicate: CORE-02 physical schemas versus feature commands, CORE-07 archive/maintenance versus DATA-03/04 routes/UI, Custom JSX interpreter versus WIDGET-EXTENDED-BRIDGES, and provider native methods versus widget cards are already explained cross-owner seams. INTEGRATION-001→002 initial CRUD handoff is also explicit (`integrations.md:17,64`). Keep those distinctions; do not collapse legitimate consumers just to reduce ticket count.

### B6 — Settled decisions versus genuinely open gates

Stale statements include `drafts/core.md:48,154,312–314,593`, `dashboard.md:9,33–43,566`, `widgets.md:583`, `integrations.md:560` and `extended.md:698`. `transports.md:82,112` still offers Redis as an OAuth-state choice despite Q10 removal. Apply DESIGN's later authority: choose suitable replacement lifetimes/atomics/backing stores without reopening Redis retention or multi-replica support.

Do not overcorrect: exact ORM/driver/version/native-runtime proof, data conversion approach, draft atomicity, realtime/exposure, one-time re-login, locale/time/SSR policy and OAuth scope/consent/revocation are not all settled. Existing suggestions are not approval, and named interface readiness is not a full production gate for every worker.

## Procedure-to-actual-key candidate crosswalk

This accounts for **all 334 leaves** without assigning final ownership. Each row inherits the exact paths/kinds in `drafts/transports.md:139–472` and the source policy/schema/service obligations in `research_notes/Homarr full Nitro migration/endpoints-transports.md:47–466`. A candidate is an existing proposed key whose scope contains the capability; **disputed/gap** means the coordinator cannot simply substitute an alias. No new ticket keys are invented.

### Non-widget leaves — 239

| Application family | Leaves | Actual-key candidates and necessary splits |
| --- | ---: | --- |
| assistant | 19 | ASSISTANT-01: first nine configuration/availability/context/model/runtime leaves; ASSISTANT-02: ten conversation leaves. Source extended ledger is explicit (`extended.md:595–596`), despite two transport configuration/runtime labels. |
| user | 26 | `initUser`: DATA-01 account/setup flow with identity primitive; `register`: ADMIN-02; nine other account/profile leaves: ADMIN-01; twelve ordinary preference leaves: ADMIN-04; `completeTour/resetTours/getTourStatus`: **ADMIN-04 versus OPS-08 disputed**. Transport `core.ACCOUNTS/PREFERENCES` cannot be substituted wholesale. |
| group | 15 | `createInitialExternalGroup`: DATA-01 setup consumer with ADMIN-03 group primitive; other fourteen: ADMIN-03. Bind the setup adapter explicitly, without duplicating its group transaction. |
| invite | 3 | ADMIN-02. |
| integration | 20 | Fourteen catalog/management/test/ACL leaves: INTEGRATION-002 after 001 handoff; searchInIntegration plus four media-request search/options/request leaves: INTEGRATION-013 native service and SEARCH-04 client consumer, with explicit wrapper acceptance; `request`: **B2 no accepting executor ticket** (003 is resolver only). |
| board | 26 | Actual per-leaf dashboard ledger `dashboard.md:472–497`: BOARD-01 six reads; BOARD-06 overview/create/duplicate/two homes (5); SEARCH-03 catalog/search (2); BOARD-07 settings read/partial write (2); BOARD-08 save/reset layouts (2); BOARD-09 permission read/rename/visibility/delete/two grant saves (6); BOARD-03 saveBoard/updateItemLayout (2); BOARD-04 addItem (1). Exact partition below. |
| app | 10 | APP-01 bounded CRUD/list/by-ID/selectable services; APP-02 embedded consumers; `createMany` needs explicit bulk Docker/OPS-03 caller acceptance, not ten duplicated app owners. |
| searchEngine | 9 | SEARCH-01 engine/default/catalog/search services; SEARCH-03/04 are catalog/execution consumers. |
| section | 1 | BOARD-02 `changeCollapsed`, explicitly stated at `dashboard.md:499`; transport BOARD-EDITOR label is wrong for this leaf. |
| location | 1 | WIDGET-ENVIRONMENT city lookup/service+location input, not a missing INTEGRATION.LOCATION ticket (`widgets.md:228–235`). |
| log | 1 | OPS-01 versus CORE-05: **B5**; history platform versus feature stream/UI must be explicit. |
| icon | 1 | MEDIA-03 public icon query/picker, CORE-06 scheduled synchronization consumer. No integration.ICONS ticket exists. |
| onboard | 6 | DATA-01 currentStep/nextStep; DATA-02 testIntegration/detectRuntimeCapabilities/discoverDockerServices/completeSetup. CORE-04 claim service is distinct. |
| home | 1 | SHELL-03 versus OPS-09: **B5**, home.getStats scoped landing contribution. |
| docker | 11 | OPS-03 explicit procedure/UI candidate; WIDGET-DOCKER and DATA-02 consumers; **B4 backend/runtime acceptance gap**. |
| kubernetes | 11 | OPS-04 contexts/nodes/cluster two leaves/namespaces (5); OPS-05 ingresses/services/pods/secrets/configMaps/volumes (6); **B4 underlying reader/runtime handoff gap**. |
| serverSettings | 6 | ADMIN-05 all six; typed family snapshots and save semantics, not six new tickets. |
| cronJobs | 8 | OPS-02 versus CORE-06: **B5**; final source kinds include status subscription. |
| apiKeys | 3 | AUTH-04 authority/service; OPS-07 page/help consumer; **B5 overlapping page claim**. |
| media | 3 | MEDIA-01 (including native multipart within the procedure census). |
| updateChecker | 1 | OPS-09 feature adapter/consumer with CORE-03 UpdateStateService; not INTEGRATION.UPDATES. |
| certificates | 6 | ADMIN-06 versus OPS-06: **B5**; not INTEGRATION.CERTIFICATES. |
| bangs | 1 | SEARCH-04 external-bangs adapter/service binding; SEARCH-01 engine service is not automatically the bangs lookup owner. |
| analytics | 1 | OPS-09 manual feedback adapter, ADMIN-05 consent/CAS and CORE-06 job/service consumer; bind manual descriptor, not only the scheduled job. |
| info | 3 | OPS-09 explicit getInfo/isDemoMode/isDemoReadOnly adapters; FOUNDATION supplies policy/build context, not a nonexistent core.RUNTIME-INFO ticket. |
| customWidget | 46 | CUSTOM-01 nine CRUD/transfer; CUSTOM-02 legacyMigrationPrompt/exportLegacy/migrateLegacy (3); CUSTOM-03 preview lifecycle/query/action (8); CUSTOM-04 authoring/template/evidence-save (17); CUSTOM-05 secrets/sources/configuration (4); CUSTOM-06 available/optionRequest (2); WORKSHOP-01 workshopSearch/Get/Install (3). Exact names at `extended.md:600–606`. |

Exact board partition (26, no overlap): BOARD-01 **6** (`exists,getPublicBoards,getBoardsForGroup,getAllBoards,getHomeBoard,getBoardByName`); BOARD-06 **5** (`getManageOverview,createBoard,duplicateBoard,setHomeBoard,setMobileHomeBoard`); SEARCH-03 **2** (`catalog,search`); BOARD-07 **2** (`getBoardSettings,savePartialBoardSettings`); BOARD-08 **2** (`saveLayouts,resetLayout`); BOARD-09 **6** (`getBoardPermissions,renameBoard,changeBoardVisibility,deleteBoard,saveUserBoardPermissions,saveGroupBoardPermissions`); BOARD-03 **2** (`saveBoard,updateItemLayout`); BOARD-04 **1** (`addItem`).

### Widget leaves — 95

The following compact grouping maps every widget procedure family/leaf to an actual candidate. Source short paths below have `widget.` prefix; these are source identities, not target naming requirements. Bodies in `widgets.md:153–526` and its per-kind/input ledgers supply the capability evidence.

| Actual candidate | Exact source family / split | Leaves |
| --- | --- | ---: |
| WIDGET-RUNTIME | app.ping | 1 |
| WIDGET-RUNTIME / WIDGET-EDITOR / board service — explicit binding needed | options.getWidgetOptionSettings, options.saveItemOptions; `widgets.md:566` names contract/editor/board-persistence roles, not one endpoint primary | 2 |
| WIDGET-NOTES | anchorNotes.listNotes/getNote/updateNote; notebook.updateContent | 4 |
| WIDGET-ENVIRONMENT | weather.atLocation, airQuality.atLocation, stockPrice.getPriceHistory | 3 |
| WIDGET-FEEDS-RELEASES | rssFeed.getFeeds; releases.getLatest; secrets.setSecret/deleteSecret/getConfiguredKinds | 5 |
| WIDGET-STANDALONE-LOOKUPS | minecraft.getServerStatus; timetable.getTimetable/searchStations | 3 |
| WIDGET-HOME-CONTROLS | dnsHole summary/enable/disable; smartHome entityState/entityDetails/switchEntity/executeAutomation | 7 |
| WIDGET-DOWNLOADS | downloads getJobsAndStatuses/pause/pauseItem/resume/resumeItem/deleteItem | 6 |
| WIDGET-REQUESTS-NOTIFICATIONS | mediaRequests getLatestRequests/getStats/answerRequest; indexerManager getIndexersStatus/testAllIndexers; notifications getNotifications/deleteNotification | 7 |
| WIDGET-PLAYBACK-AUDIO | mediaServer.getCurrentStreams; audioStats.getStats; tracearr.getDashboard | 3 |
| WIDGET-MEDIA-DISCOVERY | calendar.findAllEvents; mediaOrganizer.getData; mediaRelease.getMediaReleases | 3 |
| WIDGET-MEDIA-JOBS | bazarr.getBadges; mediaTranscoding.getDataAsync; archiveTeamWarrior.getStatus | 3 |
| WIDGET-IMMICH | immich getServerStats/getAlbum/getAlbumPreview/getAlbums | 4 |
| WIDGET-HEALTH | healthMonitoring getSystemHealthStatus/listStorageVolumes/getClusterHealthStatus | 3 |
| WIDGET-NETWORK | networkController.summary; firewall four getFirewall*Status leaves; vpn.getSummaries; ups.getSummaries; traefik.getDashboard | 8 |
| WIDGET-SERVICE-CARDS | coolify.getInstancesInfo; paperlessNgx.getStats; uptimeKuma.getDashboard; wud.getStats | 4 |
| WIDGET-PATCHMON | patchmon.getStats | 1 |
| WIDGET-PERFORMANCE | speedtestTracker.getDashboard; llamacpp.getStats | 2 |
| WIDGET-STATS | stats.catalog/snapshot/refresh | 3 |
| WIDGET-UMAMI | umami getWebsites/getVisitorStats/getEventNames/getTopPages/getTopReferrers/getMultiEventTimeSeries/getActiveVisitors | 7 |
| WIDGET-BESZEL-INVENTORY | beszel.getSystems/getAlerts | 2 |
| WIDGET-BESZEL-LIVE | beszel.getSystemStats/subscribeSystemStats | 2 |
| WIDGET-WAZUH-RECORDS | wazuh.getAgents/getAlerts/getSummary/getFim/getAuthFailures | 5 |
| WIDGET-WAZUH-ANALYTICS | wazuh.getTimeline/getTopList/getVulnerabilities | 3 |
| WIDGET-EXTENDED-BRIDGES | customApi.refresh/getData/queryRequest/executeAction; CUSTOM-06 engine remains consumer/service seam | 4 |
| **Total** | **All 95 identities; no duplicate family/leaf grouping** | **95** |

WIDGET-TIME/EMBEDS have local/browser engines rather than additional remote leaves; WIDGET-EDITOR's bookmarks use app services; WIDGET-DOCKER consumes OPS-03's Docker11. Those facts do not remove their kind/option obligations or give them extra procedure ownership.

## Pages/layouts and HTTP: actual-key handoff candidates

### The 47 external page rows

The 14 local dashboard rows already name keys: BOARD-01 three, BOARD-07 one, APP-01 three, SEARCH-01 three, BOARD-06 one, SHELL-03 two, SHELL-05 one. Home/About rows still conflict with OPS-09, so even local-key presence is not exclusivity.

| External source page group | Rows | Candidate actual key / unresolved acceptance |
| --- | ---: | --- |
| auth login; invite | 2 | AUTH-01; ADMIN-02 |
| init; configuration-request token | 2 | DATA-01; CUSTOM-05 |
| reference/api; widgets/[kind] | 2 | TRANSPORT-REST/OPS-07 reference consumer disposition; **B3 no accepted standalone widget feature** |
| integrations list/new/edit | 3 | INTEGRATION-002 after explicit 001 handoff |
| medias; settings; assistant | 3 | MEDIA-01; ADMIN-05; ASSISTANT-01 |
| custom-widgets list/new/edit | 3 | CUSTOM-01 |
| custom-widgets preview; publish | 2 | CUSTOM-03; WORKSHOP-02 |
| custom-widgets workshop list/detail; manage/workshop redirect | 3 | WORKSHOP-01; redirect may be deliberately consolidated, no obsolete URL requirement |
| users list/create/general/security | 4 | ADMIN-01 |
| users invites; five group pages | 6 | ADMIN-02; ADMIN-03 |
| Docker inventory/logs | 2 | OPS-03, not EXT-INTEGRATIONS; B4 |
| logs; tasks | 2 | OPS-01/CORE-05 and OPS-02/CORE-06 disputed; B5 |
| API tools; backup | 2 | OPS-07/AUTH-04 disputed; DATA-03/04 export-analysis versus restore slots need one page composition owner |
| certificates; hostnames | 2 | ADMIN-06/OPS-06 disputed |
| Kubernetes root/nodes/namespaces | 3 | OPS-04, not EXT-INTEGRATIONS; B4 |
| Kubernetes configmaps/ingresses/pods/secrets/services/volumes | 6 | OPS-05; B4 |
| **Total** | **47** | Source identities all represented; key acceptance is not all closed |

Ten layouts are root, root-home, boards-home, named-board viewer, named-board/settings branch, management, user detail, group detail, Kubernetes, standalone widget. Dashboard binds the first six to local/composite keys; remaining candidates are ADMIN-01, ADMIN-03, OPS-04 and the unaccepted standalone widget feature. Preserve source fallback scope and do not invent a tenth Kubernetes page for the error-only `cluster-dashboard` directory (`dashboard-navigation.md:52–76`; `drafts/dashboard.md:408–431`).

### Seventeen feature HTTP files / nineteen methods

Source file names are relative to `apps/nextjs/src/app/`; H IDs join `drafts/transports.md:579–616`. Current key candidates, not replacement paths or method compatibility requirements:

| H IDs / source files | Files / methods | Actual candidate |
| --- | --- | --- |
| H03 auth/[...nextauth] | 1 / 2 | AUTH-01 with AUTH-02/03 provider contributions |
| H04 assistant/chat | 1 / 1 | ASSISTANT-03 (ASSISTANT-04 tool continuation and WORKSHOP-04 hosted token consumers) |
| H11–12 health ready/live | 2 / 2 | CORE-08 runtime/lifecycle, CORE-02 readiness consumer; choose explicit health meaning after Redis removal |
| H13 backup/export | 1 / 1 | DATA-03 feature, CORE-07 backend |
| H14 backup/import | 1 / 1 | DATA-04 feature, CORE-07 backend |
| H15–16 backup/migrations, backup/sql-wasm | 2 / 2 | DATA-03 analysis consumer, CORE-02/08 packaged assets |
| H17 custom-widgets/[resource] | 1 / 1 | CUSTOM-04 |
| H18 custom-widgets/configuration-request/[token] | 1 / 2 | CUSTOM-05 |
| H19 user-medias/[id] | 1 / 1 | MEDIA-01 |
| H20 image-proxy/[id] | 1 / 1 | MEDIA-02 |
| H21–24 about contributors three / dependencies | 4 / 4 | SHELL-05 versus OPS-09 disputed |
| H26 onboarding/claim | 1 / 1 | DATA-01 feature, CORE-04 claim service |
| **Total** | **17 / 19** | All feature method identities present |

Nine protocol files/19 methods already bind actual keys: H01 TRANSPORT-RPC; H02/H25 TRANSPORT-REST; H05/H06 TRANSPORT-MCP; H07–H10 TRANSPORT-OAUTH. All source route-local auth/body/status/MIME/cache/abort obligations remain inherited from `endpoints-transports.md:587–629`; a same-method identity census alone does not prove those obligations.

## Durable/background/localization and extended completeness

- **Models40 pass structural coverage**, with explicit preserved constraints/IDs/serialized/binary/encrypted values and per-feature behavioral consumers (`core.md:58–70,394–439`). All physical rows map CORE-02, but broad `BOARD-RUNTIME`, `ASSETS` and extended labels still need actual consumer keys. Models are not 40 independently delivered CRUD features; no invented role table, locale column or generic integration-options JSON.
- **Migrations/background pass inventory coverage:** 49 SQLite + 17 PostgreSQL SQL assets/journals, five transformations, three registered jobs, disabled-provider session cleanup, on-demand refresh/streams and separate connection/file lifetimes are represented (`core.md:474–512`; `persistence-background.md:36–115`). CORE-03/04/05 classify every non-SQL duty; Nitro KV must not substitute unproven TTL/CAS/fencing/limiting/fanout. Redis removal still requires a per-store conversion/invalidation/restart policy, not retaining Redis configuration by accident.
- **Identity I01–I28 pass capability-ledger coverage** (`core.md:441–472`). Native unrelated-ACL risk, expired live sessions, LDAP-only local login, membership asymmetry, target-home checks, key/OAuth scope ambiguity, trusted-origin and full-secret conversion remain explicit acceptance/decision items. Counting an identity ID does not settle contested desired behavior.
- **Localization36 and shared frontend families pass preservation coverage** (`core.md:514–556`; `localization-ui.md:15–74,99–128,174–191`). Catalog conservation, rich/plural links, first-paint Hebrew RTL, request-safe Zod/Day.js, locale/Intl aliases, MRT, notifications/modal drafts, revalidation and Crowdin are named. **`board.snapshot.*` remains reachability-unknown**, not a proven missing feature and not permission to delete catalog keys. Source `localization-ui.md:190`, `core.md:518,594`, `dashboard.md:580` all agree on that uncertainty.
- **Extended families pass listed-content coverage:** Assistant19, Custom Widget46, onboard6, media3, Workshop separate identity/install/publish/CSS/hosted quota, previews/tokens/named requests, both-format definitions/secrets, backup analysis/restore, CLI/harness and excluded external Docs/Go consumers are represented (`extended.md:591–690`; `extended-features.md:42–70`). Generic request executor B2 and operational backend B4 are not closed by that broad coverage claim.
- **Complete crypto is explicitly retained**, not inferred from old restore: CORE-07/DATA-04 cover integrations, widget secrets, legacy/v2 Custom JSX and Assistant encrypted API key/headers, plus retained encrypted state. Source integration-only `reEncryptSecrets` is a documented defect (`persistence-background.md:113`; `extended-features.md:207–222`), not acceptable parity. MEDIA-01 already accepts public binary delivery/SVG/ETag; CORE-08 already accepts packaging, so earlier “unnamed media/packaging owner” notes are stale aliases/coordination concerns rather than absent feature tickets.

## Sizing/merge risks for coordinator review

These are scope risks, not instructions to split/rewrite the drafts or add horizontal API/UI/test tickets.

| Existing ticket(s) | Why suspicious | Bounded closure criterion |
| --- | --- | --- |
| CORE-02 | 40-model/dialect/history conversion plus optional ORM/driver replacement; simple model count hides transaction and encoding work | Resolve Q11/Q12 and distinguish reusable structural runtime from historical conversion scenarios; no fixture reseed. |
| CORE-04 | Atomic security stores, preview CAS/journal, request leases, sessions, image registration and SQL setup claim | Reuse one explicit atomic/lifetime interface; if replacing every backend, size by actual independent protected flow, not generic KV assumptions. |
| CORE-07 / DATA-04 | Cross-key content conversion, temporary/live DB replacement, writer drain and recovery spans every encrypted family | Keep backend versus route/UI division explicit; supported conversion matrix is a gate, not a fresh-context promise. |
| INTEGRATION-001 | Miniflux tracer plus broad Mock methods, common native transports/SDK handoffs and final registry/evidence composition | Do not turn final 89-row composition into a start gate or absorb every provider/client engine. |
| INTEGRATION-005 / 006 / 021 | 8/10/7 independent provider implementations; common Stats/read interface is real but authentication, pagination/Axios/result variants differ | Provider-specific acceptance/evidence must remain individually enumerated; split only if common adapter reuse does not bound the actual context. |
| WIDGET-EDITOR | Shared editor/refinements/preview/embedded forms and dispatch25 plus bookmarks | Already distributes input implementations; do not silently pull all 25 into one context or omit standalone B3. |
| WIDGET-NETWORK / WIDGET-DOWNLOADS / WIDGET-DOCKER | Six status kinds or destructive multi-client/table/modal behavior | Preserve provider-engine ownership and exact action/confirmation/query identity; UI option count is not a size estimate. |
| ASSISTANT-04 / CUSTOM-03 / CUSTOM-04 | Native reviews/research/authoring or revision-safe preview/workbench or 17 authoring/template/evidence-save leaves | Reusable ports/approval/evidence semantics must actually bound the slice; no permissive executor or stale-evidence shortcut. |
| DATA-02 / OPS-03 / OPS-05 | Setup transaction/discovery; Docker inventory/actions/logs; six Kubernetes tables/secret projections | Freeze domain interfaces and accepting backend scopes first; do not hide B4 behind “provider owner.” |

The draft totals should remain **140 proposals**, not 140 approved independent fresh-context tickets. No reduced total is justified until B5 overlaps and these assumptions are reconciled by the coordinator.

## Snapshot and completion criteria

Read-only SHA-256 snapshots identify the audited six drafts; all paths are under `.scratch/nitro-full-migration/drafts/`:

| File | Lines | SHA-256 |
| --- | ---: | --- |
| core.md | 599 | `7aa5db317ff836a70a443cb5c1eab089abb0a4ee295ad872ebbcf474c77e34fe` |
| dashboard.md | 583 | `ad8c76d0404457938fb43e667229c3b47907d0b7da4adff65765dbbf900f652d` |
| extended.md | 701 | `0335278a4b0d7587cb8402159442173f440a34efb84f1b72a2c0eb9d8547e316` |
| integrations.md | 571 | `9618270906ef0d3192b5e74a7288b354570197245bda94d101c6373d2ad2b192` |
| transports.md | 734 | `a528fb0687340a993256fccce5f4ab7b04c2a487330b6b1fec17d76ad477ccd7` |
| widgets.md | 587 | `ddaa69a3428295ab7a9be6cb84910ff10d785cc5ab1d686c5d7f53bb82005f06` |

Before capability coverage can be called closed, the coordinator must bind actual keys per leaf/page/HTTP/dynamic feature, obtain accepting scope for B2–B4, resolve B5 duplicate deliveries, apply B6 current decisions, and retain explicitly open decision/sizing/reachability gates. No numerical shortfall was found in the required censuses; no runtime or publication readiness is claimed.
