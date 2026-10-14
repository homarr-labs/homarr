# Complete endpoint and transport preservation map

Research for [AJN-510](https://linear.app/ajnart/issue/AJN-510/map-the-complete-endpoint-migration-to-orpc), under [AJN-482](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr). Inspected 2026-10-10, shared checkout `rework-hono`, HEAD `66e2199f9cd1e4026249c3763413988bab8664c4`. Application sources below are the current working-tree files, not the uncommitted fixture's built image. Existing `.gitignore`, lockfile, scratch, fixture, reports and research changes were left alone. Only this note was written. No nested agents, application execution/probes, installs, tests, builds, lint or typechecks; the loopback fixture was not touched.

## Recommendation and scope

Port **334 registered application procedure paths**, preserving their domain behavior through module-local contracts/services/oRPC implementations. Keep protocol HTTP responses as ordinary Nitro Fetch handlers: Auth, OAuth, MCP, AI SDK chat, media, backup, health, authoring resources and public assets. Preserve **52 curated REST operations** explicitly rather than mounting the entire internal oRPC tree as REST. MCP is a separate curated capability catalog, not an OpenAPI export. Auth metadata documents requirements; only server policy executes them.

The live parent excludes the separate docs site and Go/PocketBase Workshop runtime from replacement. Their boundary endpoints are recorded below, not added to the 334 application count. Reuse the existing integrations, request handlers, DB/schema, encryption, permission constructors and background services; replacing tRPC glue does not require reimplementing these systems. The approved stack slice is direct oRPC `2.0.0-beta.43` + Nitro v3 + Vite/React + TanStack Router/manual SSR. Full-product policy/transport choices below remain recommendations, not approvals or demonstrated parity.

Read predecessor evidence: [API/auth seams](../Homarr%20Nitro%20migration%20experiment/api-auth-migration.md), [exact oRPC evidence](../Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md), `.scratch/nitro-full-migration/RESEARCH.md`, `.scratch/nitro-feasibility/worker-notes/integration.md`. Earlier temporary-tRPC recommendations are optional controls, not requirements of the now requested direct-oRPC migration. Fixture evidence is bounded; final measurements/checks and whole-product acceptance remain pending.

## Registration reconciliation, not a syntax census

The inventory followed actual `createTRPCRouter` object registrations using a read-only Babel TypeScript AST traversal: resolve named relative imports, local aliases, object spreads, nested routers, and each lazy import's exported symbol; expand the `queryFirewall` factory's four registered keys. It never imported application modules (which initialize env/DB/jobs). Chained middleware/factory policy was then inspected directly. An earlier traversal stopped on the factory rather than silently omitting it. Caller references were AST member-path references plus targeted computed-key/helper inspection, not inferred from endpoint names. Counts are **static registration counts**, not observed live catalogs.

| Registry | Roots | Registered leaves | Queries | Mutations | Subscriptions | Exposed subset |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `packages/api/src/root.ts:appRouter` | 27 | 334 | 191 | 139 | 4 | All internal application paths, lazily loaded |
| `packages/api/src/mcp.ts:mcpRouter` | 29 | 204 | 108 | 94 | 2 | 133 explicitly enabled non-subscription candidates; extractor can omit invalid schemas/names |
| `packages/api/src/open-api.ts:openApiRouter` | 8 | 78 | 33 | 45 | 0 | 52 leaves have OpenAPI method/path metadata |
| `apps/nextjs/src/app/**/route.ts` | 26 files | 38 explicit method exports | — | — | — | Dynamic catchalls are families, not one operation each |

Root leaf totals: assistant19 + user26 + group15 + invite3 + integration20 + board26 + section1 + app10 + searchEngine9 + widget95 + location1 + log1 + icon1 + onboard6 + home1 + docker11 + kubernetes11 + serverSettings6 + cronJobs8 + apiKeys3 + media3 + updateChecker1 + certificates6 + bangs1 + analytics1 + info3 + customWidget46 = **334**. Widget registration has **46 subrouters**; Kubernetes has **10 subrouters / 11 leaves**. The ledger below enumerates every leaf once under its application path; REST and MCP tables describe aliases/selections, not additional application leaves.

MCP's 204 includes Docker and Beszel subscriptions, which extraction explicitly skips. Application MCP annotations outside the eager catalog include `widget.llamacpp.getStats` and all eight Wazuh procedures (factory-inherited metadata); they are **not currently exposed MCP tools**. Thus counting `.meta` text in source gives the wrong surface. Kubernetes MCP uses three distinct admin wrappers, not the lazy application Kubernetes router; these wrappers delegate to its callers. With factory inheritance, application annotation candidates total 142, versus eager catalog candidates133. Runtime JSON-schema compilation was deliberately not executed; `packages/api/src/test/mcp.spec.ts:212` expresses an empty-diagnostics expectation, not evidence it passed today.

## Shared preservation rules applied to every procedure row

Sources: `packages/api/src/trpc.ts`, `rsc-context.ts`, `client.ts`, `server.ts`, `shared.ts`, `query-cache.ts`, `middlewares/integration.ts`; `apps/nextjs/src/app/[locale]/_client-providers/{trpc,query-retry,session-query-scope}.tsx` (query-retry is `.ts`); HTTP route sources in the transport ledger.

1. **Current wire/method:** every Q/M/S row is `/api/trpc/<dot.path>`: Q is a query (GET/batched HTTP, direct server caller); M is a POST mutation; S is subscription (WS except Beszel HTTP SSE in the browser). HTTP route exports GET/POST/OPTIONS; batch streaming and multipart use different links. All leaves are also callable through direct server callers with middleware/schema validation, and the WS host mounts the full application router, not an isolated subscriptions-only router.
2. **Context:** session or null, expanded user permissions, db, device type, forwarded base URL, onboarding claim cookie; integration middleware adds authorized/decrypted integration(s). Browser RPC tries `ApiKey` first then cookie session. Server/RSC uses cookie auth and request-local React memoization. REST is **ApiKey only**, no ambient cookie fallback. MCP is ApiKey then Bearer, no cookie fallback. WS is session-token cookie only today. Preserve these distinctions before sharing a context constructor.
3. **Policy codes in tables:** `P` public base (not necessarily unrestricted); `U` protected session; `A` admin; `R(permission)` named permission; `O(step)` claimed onboarding/current step; `OC` claimed onboarding; `C` Assistant conversation (demo-writable authenticated exception). Named/custom integration policies are described per family. Public-board query access must remain possible; do not blanket-require login for widget data.
4. **Schemas:** table inputs summarize the actual chained schema at the cited source line, not replacement DTO definitions. `∅` means no local input; concatenated integration middleware still contributes `integrationId` or `integrationIds`. Optional/default/trim/refine/transform semantics must be copied from that expression and its imports. `I` is an inferred handler result with **no explicit output parser**. `V` is explicit void/undefined. Other output labels refer to the exact `.output` expression at the row's source anchor. Adding an explicit output contract requires preserving the existing return shape, null/undefined, rich types and privacy projection; never invent an output from a method name.
5. **Errors:** all rows inherit validation errors, policy errors and their invoked service/helper failures. `E` lists local literal domain codes where useful, **not an exhaustive transitive error set**. `—` does not mean infallible. Preserve `TRPCError` code/message meaning and the formatter's flattened Zod `data.zodError` / `FlattenError` `data.error`; oRPC needs explicit safe mappings. Board denial intentionally looks like NOT_FOUND. Native upstream failures may be returned as typed data/partial results instead of thrown errors.
6. **Serialization:** existing RPC uses SuperJSON, including Date-rich cached widget data and undefined; persisted widget/message strings also use SuperJSON and are **durable encodings independent of the transport**. oRPC RPC serialization is not SuperJSON wire-compatible. REST JSON and MCP result serialization are different projections. Maintain Dates/timezones/units and errors in clients, SSR bootstrap/hydration and legacy persisted values separately.
7. **Demo/cancellation:** base mutations are forbidden under `DEMO_MODE && DEMO_READ_ONLY`; `internalProcedure` bypasses that base and Assistant conversation deliberately uses `demoWritableProtectedProcedure`. Local row policy remains authoritative. Ordinary procedures generally do not consume an AbortSignal; forwarding it at a new handler is not proof DB/upstream work stops. Preserve existing upstream deadlines; add cancellation only with explicit lifecycle ownership. Do not auto-retry writes or ambiguous timeouts.
8. **Default target/reuse:** every ordinary Q/M row → module-local oRPC contract + implementation invoking retained/extracted authorized service. Contracts are client-safe; service DB/secrets/policy stay server-only. Every S row → typed async iterator with a separate transport choice below. tRPC builder/caller/options/error glue is rewritten; the existing service behavior, normalization, permissions, cache invalidations and result projections are reused, not transport-reimplemented.

### Caller notation

`B` browser and `S` server reference; `X` externally callable via a REST/MCP alias below; `?` no literal application member reference located, not unused or safe to delete. MCP/Assistant dispatch is dynamic through `callMcpTool`, so a `?` can still be externally important. Shared root call surfaces are `packages/api/src/{client,server}.ts` and the client provider above.

To keep every endpoint row readable, caller codes expand to these concrete roots: `N = apps/nextjs/src`; `L = N/app/[locale]`; `M = L/manage`; `B = N/components/board`; `AS = N/components/assistant`; `CW = N/components/custom-widgets`; `W = packages/widgets/src`; `SP = packages/spotlight/src`; `FC = packages/forms-collection/src`; `MC = packages/modals-collection/src`; `ON = packages/onboarding/src`. A family caller path in the heading applies to all rows that name its abbreviated component; `?` explicitly retains discovery gaps. These are representative verified source references, not a promise that all aliases/call sites have been enumerated. Preserve the independent server helper entrypoints listed after the ledger.

## Application procedure preservation ledger

Row source line anchors identify the current exported router property, or its imported procedure definition. All paths use the family prefix in the heading. Q/M/S and global rules above are part of **each row's contract**.

### assistant — 19; `packages/api/src/router/assistant.ts`

Retain provider discovery/configuration, encrypted credentials, model capability policy, thread/message ownership, feedback and telemetry. `adminProcedure` is A; `conversationProcedure` is C. `ownedThreadAsync:536` contributes NOT_FOUND, and stored-message parsing contributes INTERNAL_SERVER_ERROR even where no local throw appears. Chat streaming is a separate HTTP operation below. Callers: `AS/assistant-provider.tsx`, `assistant-message-content.tsx`, `assistant-history.tsx`, `assistant-conversation-context.tsx`; administration `M/assistant/_components/assistant-configuration.tsx`.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| getAvailability @564 | Q U | ∅ → I | — | ?; separate layout availability helper |
| getContextEntities @568 | Q U | ∅ → I | — | B AS/message-content |
| getModelCapabilities @572 | Q U | optional modelId → I | — | ? |
| getRuntimeOptions @589 | Q U | ∅ → I | PRECONDITION_FAILED | B AS/provider |
| getAdminConfiguration @631 | Q A | ∅ → I | — | B configuration |
| updateConnection @647 | M A | provider/baseUrl/discovery/auth configuration → I | — | B configuration |
| clearCredentials @721 | M A | ∅ → I | — | ? |
| discoverModels @736 | Q A | ∅ → modelSchema[] | PRECONDITION_FAILED | B configuration |
| updateConfiguration @744 | M A | enabled/model/web search/settings → I | PRECONDITION_FAILED,BAD_REQUEST | B configuration |
| listThreads @779 | Q U | ∅ → I | — | B AS/provider |
| createThread @787 | M C | optional localId → I | — | B AS/provider |
| updateThreadModel @803 | M C | threadId/modelId → I | PRECONDITION_FAILED,BAD_REQUEST | B AS/provider |
| getThread @835 | Q U | threadId → I | — | B AS/history,provider |
| getGenerationTelemetry @855 | Q U | threadId/messageId → I | — | B AS/conversation-context |
| renameThread @901 | M C | threadId/title → I | — | B AS/provider |
| deleteThread @911 | M C | threadId → I | — | B AS/provider |
| appendMessage @918 | M C | threadId/message/id/parent/content → I | — | B AS/provider |
| submitFeedback @979 | M C | threadId/messageId/positive-or-negative → I | NOT_FOUND | B AS/provider |
| deleteMessages @1023 | M C | threadId/ids(max100) → I | — | B AS/provider |

### user — 26; `packages/api/src/router/user.ts`

Retain credentials-only registration/edit/password rules, self-versus-admin targeting, previous-password checks, group assignment, preference patch-vs-replace/null semantics and demo exceptions. REST preferences root refinement must survive JSON-schema generation. Caller roots: `M/users`, `SP/preferences/use-user-preference.ts`, `L/_client-providers/mantine.tsx`, `N/components/onboarding`.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| initUser @70 | M O(user) | userInitSchema → I | — | B ON/account.tsx |
| register @116 | M P/invite checks | userRegistrationApiSchema → V | FORBIDDEN | B L/auth/invite/[id]/_registration-form.tsx |
| create @180 | M A | converted userCreateSchema → V | — | B users/create stepper; X |
| setProfileImage @210 | M U/self-or-admin | userId/image bounded data URL or null → V | FORBIDDEN,NOT_FOUND | B users/[userId]/general profile-avatar; X |
| getAll @265 | Q A | void → public profile[] | — | B user-list; S users/page; X |
| selectable @303 | Q U | optional provider filters → profile[] | — | B N/components/access/user-select.tsx; X |
| search @337 | Q A | query/limit1..100 → profile[] | — | B SP/modes/user-group/users-search-group.tsx; X |
| getPreferences @384 | Q U/self-or-admin | optional userId field → userPreferencesResponseSchema | — | ?; X |
| getById @404 | Q U/self-or-admin | userId → selected profile/provider/preferences | FORBIDDEN,NOT_FOUND | S user layouts/general/security; X |
| editProfile @483 | M U/self-or-admin | userEditProfileSchema → V | FORBIDDEN,NOT_FOUND | B general-settings-form; X |
| delete @544 | M U/self-or-admin | userId → V | FORBIDDEN | B delete-user-button; X |
| changePassword @577 | M U/self-or-admin | converted userChangePasswordApiSchema → V | FORBIDDEN,NOT_FOUND | B security change-password-form; X |
| updatePreferences @659 | M U/self-or-admin | strict userPreferencesPatch/refinement → userPreferencesResponseSchema | — | ?; X |
| changeHomeBoards @690 | M U/self-or-admin | userChangeHomeBoardsSchema + userId → V | — | B general-settings,SP/preferences; X |
| changeDefaultSearchEngine @710 | M U/self-or-admin | legacy partial search preferences + userId → V | — | ?; deprecated X |
| changeSearchPreferences @735 | M U/self-or-admin | search preferences + userId → V | — | B general-settings,SP/preferences; X |
| changeColorScheme @756 | M U | userChangeColorSchemeSchema → V | — | B Mantine provider; X |
| changeByteUnitSystem @772 | M U/self-or-admin | userByteUnitSystemSchema + byIdSchema → V | — | B general-settings,SP/preferences |
| changeEnableRightClickOnWidgets @778 | M U/self-or-admin | right-click schema + byId → V | — | B general-settings,SP/preferences; X |
| changePingIconsEnabled @795 | M U/self-or-admin | ping-icons schema + byId → I | — | B general-settings,SP/preferences |
| changeHeaderPreferences @800 | M U/self-or-admin | id/headerPreferencesMutationSchema → V | — | B general-settings; X |
| changeDdgBangs @817 | M U/self-or-admin | ddg schema + byId → V | — | ?; deprecated X |
| changeFirstDayOfWeek @835 | M U/self-or-admin | first-day schema + byId → V | — | B general-settings,SP/preferences; X |
| completeTour @852 | M U | tour manage/board → I | — | B board-tour/manage-tour |
| resetTours @862 | M U | ∅ → I | — | B general/_reset-tours.tsx |
| getTourStatus @871 | Q U | ∅ → I | — | B general/_reset-tours.tsx |

### group — 15; `packages/api/src/router/group.ts`

Retain permission inheritance, positions, external group rules, membership and ownership transfers, board defaults and transactional writes. Caller root `M/users/groups` unless specified.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| getAll @24 | Q A | ∅ → I | — | S groups/page.tsx |
| getPaginated @48 | Q A | paginatedSchema → I | — | ? |
| getById @83 | Q A | byIdSchema → I | NOT_FOUND | S [id] layouts/member/settings/permissions pages |
| selectable @133 | Q U | optional withPermissions defaultfalse → I | — | B N/components/access/group-select.tsx |
| search @160 | Q A | query/limit → I | — | B SP/modes/user-group/groups-search-group.tsx |
| createInitialExternalGroup @178 | M O(group) | groupCreateSchema → I | CONFLICT | B ON/account.tsx |
| createGroup @224 | M A | groupCreateSchema → I | — | B group-create-form |
| updateGroup @242 | M A | groupUpdateSchema → I | — | B [id]/_rename-group-form |
| savePartialSettings @258 | M A | groupSavePartialSettingsSchema → I | — | B [id]/settings/_group-home-boards |
| savePositions @272 | M A | groupSavePositionsSchema → I | — | B _groups-table |
| savePermissions @295 | M A | groupSavePermissionsSchema → I | — | B [id]/permissions/_group-permission-form |
| transferOwnership @339 | M A | groupUserSchema → I | — | B [id]/_transfer-group-ownership |
| deleteGroup @353 | M A | byIdSchema → I | — | B [id]/_delete-group |
| addMember @362 | M A | groupUserSchema → I | NOT_FOUND,FORBIDDEN | B [id]/members/_add-group-member |
| removeMember @393 | M A | groupUserSchema → I | — | B [id]/members/_remove-group-member |

### invite — 3; `packages/api/src/router/invite.ts`

All require A and enabled credentials authentication; listings omit tokens, creation returns a token, deletion checks existence. Caller root `M/users/invites`, plus external REST/MCP.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| getAll @14 | Q A | undefined → selected invite[] | — | B invite-list,S page; X |
| createInvite @58 | M A | offset ISO expirationDate → id/token | — | B invite-create-form; X |
| deleteInvite @99 | M A | id → undefined | NOT_FOUND | B invite-list; X |

### integration — 20

Default source `packages/api/src/router/integration/integration-router.ts`; request is `integration-request.ts:124`, stored test is `integration-test-stored-connection.ts:12`. Retain use/interact/full permissions, scope filtering, kind narrowing, **authorization before decrypting**, encrypted secret writes, public-secret projection, linked app creation permissions and cache invalidations. Generic request is a mutation even for upstream GET; full access and explicit DELETE confirmation apply, with no redirects/retries/cache. Native calls and tests use existing integration factory/clients. Caller roots `M/integrations`, `SP/modes/external`, `SP/modes/media`, `MC/search-engines/request-media-modal.tsx`.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| request @124 | M U/full | integrationRequestSchema → explicit integration/ok/status/data response | BAD_REQUEST,PRECONDITION_FAILED,PAYLOAD_TOO_LARGE,BAD_GATEWAY | X; dynamic Assistant tool |
| testConnection @12 | Q U/full | byIdSchema → success discriminated union | NOT_FOUND | X |
| getKinds @56 | Q P | ∅ → I | — | X |
| all @72 | Q U/scoped | ∅ → I | — | S integration page/manage access/widget-prefetch; B selection/catalog; X |
| allThatSupportSearch @83 | Q U/scoped | ∅ → I | — | B M/search-engines/_form.tsx |
| allOfGivenCategory @94 | Q U/scoped | category enum → I | — | ? |
| search @106 | Q U/scoped | query/limit1..100 → I | — | X |
| byIds @146 | Q P | string[] → id/kind only | — | B W/health-monitoring/component.tsx |
| byId @155 | Q U/full | byIdSchema → redacted metadata | NOT_FOUND | S edit page; B embedded edit form; X |
| create @225 | M R(integration-create) | integrationCreateSchema → I/safe connection-error union | FORBIDDEN,BAD_REQUEST | B new form; X |
| update @309 | M U/full | integrationUpdateSchema → I/safe connection-error union | NOT_FOUND,BAD_REQUEST | B edit form |
| delete @415 | M U/full | byIdSchema → I | NOT_FOUND | B _integration-buttons; X |
| getIntegrationPermissions @439 | Q U/full | byIdSchema → I | — | S edit page; B integration-access-settings |
| saveUserIntegrationPermissions @511 | M U/full | integrationSavePermissionsSchema → I | — | B integration-access-settings |
| saveGroupIntegrationPermissions @557 | M U/full | integrationSavePermissionsSchema → I | — | B integration-access-settings |
| searchInIntegration @603 | Q U/query-kind | integrationId/query → I | — | B SP external search; X |
| mediaRequestSearchTargets @617 | Q U/query-access | ∅ → I | — | B SP media fallback/search; X |
| searchMediaRequests @641 | Q U/query-access | query/optional integrationIds → I | — | B SP media search; X |
| getMediaRequestOptions @695 | Q U/query | mediaRequestOptionsSchema + integrationId → I | — | B request-media-modal; X |
| requestMedia @709 | M U/interact | mediaRequestRequestSchema + integrationId → I | — | B request-media-modal; X |

### board — 26; `packages/api/src/router/board.ts`

Retain view/modify/full/creator/public/group/global permission composition, denial-as-NOT_FOUND, integration placement checks, Custom Widget admin placement, grid overlap/bounds, responsive Base/Mobile constraints, complete-save destructive semantics and home-board visibility restrictions. Do not substitute the fixture's revision DTO for full board options/sections/layout contracts. Caller roots `L/boards/[name]/settings`, `M/boards`, `packages/boards/src/{context,updater}.tsx` (updater is `.ts`), `FC/board-create/board-create-form.tsx`.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| exists @283 | Q R(board-create) | string → I | — | B board-create-form |
| getPublicBoards @297 | Q P | ∅ → I | — | S M/settings/page.tsx |
| getBoardsForGroup @307 | Q A | groupId → I | — | B group home defaults |
| getAllBoards @338 | Q P/scoped | void → boardSummarySchema[] | — | B header/preferences; X |
| getManageOverview @393 | Q P/scoped | manageOverviewInputSchema → I | FORBIDDEN | S M/boards,user-general; B board-switcher |
| catalog @656 | Q P/scoped | ∅ → I | — | B SP/lib/catalog.ts; X |
| search @659 | Q P/scoped | query/limit → I | — | X |
| createBoard @668 | M R(board-create) | boardCreateSchema → boardId/name/layoutId | — | B board-create-form; X |
| duplicateBoard @746 | M R(board-create)/view/use/admin-CW | boardDuplicateSchema → boardId | NOT_FOUND | B duplicate form; X |
| renameBoard @1053 | M U/full | boardRenameSchema → V | — | B settings/_danger; X |
| changeBoardVisibility @1078 | M U/full | boardChangeVisibilitySchema → V | BAD_REQUEST | B settings/_danger; X |
| deleteBoard @1116 | M U/full | id → V | — | B settings/_danger,card-menu; X |
| setHomeBoard @1139 | M U/view | id → V | — | B card-menu,SP boards-search; X |
| setMobileHomeBoard @1162 | M U/view | id → V | — | B card-menu,SP boards-search; X |
| getHomeBoard @1185 | Q P/view | ∅ → I | NOT_FOUND | S board-server helper |
| getBoardByName @1208 | Q P/view | boardByNameSchema → I | — | S settings,board-server; B boards context; X |
| getBoardSettings @1223 | Q U/modify | id → boardSettingsSchema | NOT_FOUND | B AS/assistant-board-settings-tool.tsx; X |
| saveLayouts @1282 | M U/modify | boardSaveLayoutsSchema → layouts schema | BAD_REQUEST,INTERNAL_SERVER_ERROR | B settings/_shared; X |
| resetLayout @1567 | M U/modify | boardResetLayoutSchema → V | NOT_FOUND,INTERNAL_SERVER_ERROR,BAD_REQUEST | B settings/_layout; X |
| savePartialBoardSettings @1647 | M U/modify | boardSavePartialBoardSettingsSchema + id → V | — | B settings/_shared; X |
| saveBoard @1699 | M U/modify/admin-CW | boardSaveSchema → V | — | B content header-actions,boards updater; X |
| getBoardPermissions @2143 | Q U/full | byIdSchema → I | — | S settings page; B _board-access |
| saveUserBoardPermissions @2215 | M U/full | boardSavePermissionsSchema → I | — | B _board-access |
| saveGroupBoardPermissions @2254 | M U/full | boardSavePermissionsSchema → I | — | B _board-access |
| addItem @2295 | M U/modify/use/admin-CW | addItemToBoardSchema → itemId | NOT_FOUND,BAD_REQUEST | X; dynamic Assistant configure-widget workflow |
| updateItemLayout @2410 | M U/modify | updateBoardItemLayoutSchema → same schema | NOT_FOUND,BAD_REQUEST,CONFLICT | X |

### app — 10; `packages/api/src/router/app.ts`

Retain URI schemes/blank hrefs, optional ping URL clearing, anonymous public-board visibility and linked integration invalidation. Callers `M/apps`, `FC/new-app`, `MC/apps`, W app/bookmark/edit components and SP catalog.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| getPaginated @22 | Q R(app-modify-all) | paginatedSchema → items/totalCount | — | S apps/page; X |
| all @58 | Q R(app-modify-all) | void → selectAppSchema[] | — | X |
| search @78 | Q U/app-or-board-modify-all | query/limit → selectAppSchema[] | FORBIDDEN | X |
| selectable @118 | Q U | void → selected app[] | — | B integration new,board selection,app-select,SP,widget inputs; X |
| byId @156 | Q P/visibility | byIdSchema → selectAppSchema | NOT_FOUND | S edit page; B W/app,embedded edit,board registrar; X |
| byIds @184 | Q P | string[] → I | — | B board layout/section apps,W/bookmarks |
| create @188 | M R(app-create) | appManageSchema → appId + selectAppSchema | — | B new-app,app-select,quick-add; X |
| createMany @223 | M R(app-create) | appCreateManySchema → V | — | B MC/docker/add-docker-app-to-homarr.tsx |
| update @238 | M R(app-modify-all) | converted appEditSchema → V | NOT_FOUND | B edit/embedded edit; X |
| delete @289 | M R(app-full-all) | byIdSchema → V | — | B app-delete-button; X |

### searchEngine — 9; `packages/api/src/router/search-engine/search-engine-router.ts`

Retain default-selection/public catalog and integration-related lookup semantics, not just CRUD. Caller roots `M/search-engines`, `SP/lib/catalog.ts`, `SP/preferences/preference-registry.tsx`.

| Leaf @line | Kind/policy | Input → output | Local E | Caller |
| --- | --- | --- | --- | --- |
| getPaginated @17 | Q U | paginatedSchema → I | — | S search-engines/page |
| getSelectable @32 | Q U | withIntegrations defaulttrue → I | — | S settings/user-general; B preferences |
| byId @47 | Q U | byIdSchema → I | NOT_FOUND | S edit page |
| getDefaultSearchEngine @73 | Q P | ∅ → I | — | ? |
| catalog @133 | Q P | ∅ → I | — | B SP catalog; X |
| search @155 | Q P | searchSchema → I | — | ? |
| create @176 | M R(search-engine-create) | searchEngineManageSchema → I | — | B new form |
| update @191 | M R(search-engine-modify-all) | searchEngineEditSchema → I | NOT_FOUND | B edit form |
| delete @218 | M R(search-engine-full-all) | byIdSchema → I | — | B delete-button |

### Infrastructure/admin/small families — 65 leaves

Paths below are fully qualified. Source is under `packages/api/src/router/` as indicated. `dockerMiddleware()` and `kubernetesMiddleware()` retain runtime availability/context/capability constraints; A alone is not sufficient. Source lines reference input/output expressions and service calls as for other rows.

| Procedure; source @line | Kind/policy | Input → output; local E | Caller |
| --- | --- | --- | --- |
| section.changeCollapsed; section/section-router.ts @13 | M U/board modify | sectionId/collapsed → I; NOT_FOUND,BAD_REQUEST | B B/sections/section-collapse.tsx |
| location.searchCity; location.ts @37 | Q P | locationSearchCityInput → locationSearchCityOutput | B W/_inputs/widget-location-input.tsx |
| log.subscribe; log.ts @19 | S R(other-view-logs) | levels defaultinfo → history/message union | B M/tools/logs/terminal.tsx |
| icon.findIcons; icons.ts @8 | Q P | iconsFindSchema → I | B FC/icon-picker/icon-picker.tsx; X |
| onboard.currentStep; onboard/onboard-router.ts @140 | Q P | ∅ → I | ?; onboarding queries also read directly |
| onboard.nextStep; same @142 | M OC | ∅ → I; PRECONDITION_FAILED | B ON/welcome.tsx |
| onboard.testIntegration; same @150 | M O(setup) | onboardingIntegrationDraftSchema → I; BAD_REQUEST | B ON/setup-studio.tsx |
| onboard.detectRuntimeCapabilities; same @168 | Q O(setup) | ∅ → runtimeCapabilitiesSchema | B ON/setup-studio.tsx |
| onboard.discoverDockerServices; same @179 | Q O(setup) | ∅ → I | B ON/setup-studio.tsx |
| onboard.completeSetup; same @318 | M O(setup) | onboardingCompleteSetupSchema → I; NOT_FOUND,BAD_REQUEST,CONFLICT,PRECONDITION_FAILED | B ON/setup-studio.tsx |
| home.getStats; home.ts @57 | Q P/scoped | ∅ → I | S M/page.tsx |
| docker.reconcileServices; docker/docker-router.ts @32 | Q A/docker | ∅ → I | B M/tools/docker/docker-reconciliation.tsx; X |
| docker.getServiceHealth; same @43 | Q A/docker | ∅ → I | B reconciliation; X |
| docker.refreshInventory; same @54 | M A/docker | ∅ → I | B reconciliation,table,W/docker; X |
| docker.getContainers; same @68 | Q A/docker | optional endpointIds(max100) → I | B table,W/docker/release input; S tools/docker/page,W/server-prefetch; X |
| docker.getEndpoints; same @91 | Q A/docker | ∅ → I | S log page; B W/docker/index.ts; X |
| docker.startAll; same @101 | M A/docker capability | targets(endpointId,id)[] → I | B computed-key table,W/docker; X |
| docker.stopAll; same @114 | M A/docker capability | targets[] → I | B computed-key table,W/docker; X |
| docker.restartAll; same @127 | M A/docker capability | targets[] → I | B computed-key table,W/docker; X |
| docker.removeAll; same @140 | M A/docker remove capability | targets[] → I | B computed-key table,W/docker; X |
| docker.logs; same @154 | Q A/docker logs | endpointId/id/tail1..1000 → logs | NOT_FOUND; S tools/docker/logs/[containerId]/page.tsx; X |
| docker.subscribeLogs; same @185 | S A/docker logs | endpointId/id/tail1..1000 → string events | INTERNAL_SERVER_ERROR,NOT_FOUND; B same terminal.tsx |
| kubernetes.contexts.getContexts; kubernetes/router/contexts.ts @6 | Q A/Kubernetes | ∅ → I | B context-selector,S kubernetes-context; X wrapper |
| kubernetes.nodes.getNodes; nodes.ts @13 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B nodes-table,S nodes/page |
| kubernetes.cluster.getCluster; cluster.ts @15 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B cluster-dashboard |
| kubernetes.cluster.getClusterResourceCounts; cluster.ts @151 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B cluster-dashboard |
| kubernetes.namespaces.getNamespaces; namespaces.ts @10 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B namespaces-table,S page |
| kubernetes.ingresses.getIngresses; ingresses.ts @11 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B ingresses-table,S page; X wrapper |
| kubernetes.services.getServices; services.ts @10 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B services-table,S page |
| kubernetes.pods.getPods; pods.ts @15 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B pods-table,S page; X wrapper |
| kubernetes.secrets.getSecrets; secrets.ts @10 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B secrets-table,S page |
| kubernetes.configMaps.getConfigMaps; configMaps.ts @10 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B configmaps-table,S page |
| kubernetes.volumes.getVolumes; volumes.ts @10 | Q A/Kubernetes | kubernetesContextInput → I; INTERNAL_SERVER_ERROR | B volumes-table,S page |
| serverSettings.getCulture; serverSettings.ts @41 | Q P | ∅ → I | ?; root settings helper |
| serverSettings.getAll; same @44 | Q A | ∅ → I | S M/settings/page.tsx |
| serverSettings.getBranding; same @47 | Q P | ∅ → I | X; root settings helper |
| serverSettings.getBoardSettings; same @55 | Q A | void → boardServerSettingsSchema | X |
| serverSettings.updateBoardSettings; same @78 | M A | boardServerSettingsUpdateSchema → boardServerSettingsSchema; BAD_REQUEST | X |
| serverSettings.saveSettings; same @132 | M A | settingsKey/value record → I | B settings/_components/settings-form.tsx |
| cronJobs.triggerJob; cron-jobs.ts @18 | M A | jobNameSchema → I | B tasks-table |
| cronJobs.startJob; same @24 | M A | jobNameSchema → I | ? |
| cronJobs.stopJob; same @30 | M A | jobNameSchema → I | ? |
| cronJobs.updateJobInterval; same @36 | M A | name/cron → I | B tasks-table |
| cronJobs.disableJob; same @47 | M A | jobNameSchema → I | B tasks-table |
| cronJobs.enableJob; same @53 | M A | jobNameSchema → I | B tasks-table |
| cronJobs.getJobs; same @59 | Q A | ∅ → I | B tasks-table,S tasks/page |
| cronJobs.subscribeToStatusUpdates; same @62 | S A | ∅ → TaskStatus events | B tasks-table |
| apiKeys.getAll; apiKeys.ts @13 | Q A | ∅ → I/redacted key list | S tools/api/page; X |
| apiKeys.create; same @36 | M A | ∅ → I/one-time key | B api-keys,mcp-instructions,ON/setup-studio |
| apiKeys.delete; same @57 | M A | apiKeyId → I | B api-keys; X |
| media.getPaginated; medias/media-router.ts @15 | Q U/user scope | pagination/includeFromAllUsers/search → I | S medias/page; B board background |
| media.uploadMedia; same @55 | M R(media-upload) | mediaUploadSchema(FormData) → I | B FC/upload-media/upload-media.tsx |
| media.deleteMedia; same @101 | M U/owner-or-global | byIdSchema → I; NOT_FOUND,FORBIDDEN | B medias/_actions/delete-media.tsx |
| updateChecker.getAvailableUpdates; update-checker.ts @9 | Q A | ∅ → I | B N/components/layout/header/user-client.tsx |
| certificates.getCertificate; certificates/certificate-router.ts @38 | Q A | fileName → rootCertificateMetadataSchema nullable | X |
| certificates.ensureRootCertificate; same @55 | M A | fileName/certificate64KiB → created/metadata | X; helper contributes validation/conflict |
| certificates.addCertificate; same @85 | M A | zfd.formData/file/check → I; BAD_REQUEST | B certificate-upload/test-connection-certificate |
| certificates.trustHostnameMismatch; same @117 | M A | hostname/certificate → I; BAD_REQUEST | B test-connection-certificate |
| certificates.removeTrustedHostname; same @151 | M A | hostname/thumbprint → I | B tools/certificates/hostnames/remove-hostname |
| certificates.removeCertificate; same @174 | M A | certificateValidFileNameSchema → I | B tools/certificates/remove-certificate |
| bangs.search; bangs/bangs-router.ts @7 | Q P | query/limit1..50 → I | B SP/modes/external/search-engines-search-group.tsx |
| analytics.sendAnalytics; analytics.ts @9 | M A | ∅ → I; PRECONDITION_FAILED | ?; retain telemetry opt-in/availability |
| info.getInfo; info.ts @7 | Q U | void → version | X |
| info.isDemoMode; same @29 | Q P | ∅ → I | ? |
| info.isDemoReadOnly; same @30 | Q P | ∅ → I | ? |

Kubernetes caller roots in the table are `M/tools/kubernetes/<resource>`; tables and pages use different case than RPC keys (notably `configmaps` vs `configMaps`). Tasks caller is `M/tools/tasks/_components/tasks-table.tsx`. API-key callers are `M/tools/api/components`. Docker actions are demonstrably computed at `docker-table.tsx:327,447` and `W/docker/component.tsx:223`, so absence from literal-member discovery is **not** absence of consumers.

### widget — 95 leaves / 46 registered subrouters

Registration authority `packages/api/src/router/widgets/index.ts`. Default source for each row is `packages/api/src/router/widgets/<file>.ts`, at the given line. Default result is **I**, except the explicitly named subscription event type. `IQ1/IQN` means public integration query policy with inherited `integrationId:string` / `integrationIds:string[]`; `IA1/IAN` means protected integration interaction policy with the corresponding inherited ID field. The middleware's exact supported kinds are the widget definition or literal kind list at that source anchor, not an invented universal provider list. These policies contribute NOT_FOUND/FORBIDDEN/kind-validation failures before secrets are decrypted. Default browser caller roots are W; `S prefetch` means verified `W/server-prefetch.ts` member reference; `X` is curated MCP selection below.

Retain existing `packages/request-handler` cache/timestamp contracts and `settleIntegrationQueries` partial-failure vs all-failed semantics. Do not turn a returned safe `{error,data:null}` or per-integration failure into an unrelated HTTP failure. Public-board read access is required even when no browser session exists. PatchMon is a deliberate protected exception. Stats refresh and Custom API refresh are public **mutations** with query/board-access checks, not unguarded public writes.

| Application leaf; source @line | Kind/policy | Additional input; local E | Browser/server/external caller |
| --- | --- | --- | --- |
| stats.catalog; stats @13 | Q IQ1(all kinds) | ∅ | B _inputs/widget-stats-entries-input.tsx,stats/component.tsx; X |
| stats.snapshot; stats @27 | Q IQ1(all kinds) | ∅ | B stats/component.tsx; X |
| stats.refresh; stats @37 | M IQ1(all kinds) | force defaultfalse | X; retain bounded queue/one-hour freshness |
| archiveTeamWarrior.getStatus; archive-team-warrior @8 | Q IQ1 | ∅ | B archive-team-warrior/component.tsx |
| beszel.getSystems; beszel @22 | Q IQN(beszelSystemGrid) | ∅ | B beszel-system-grid/stats/table components and stats/index.ts; S prefetch; X |
| beszel.getAlerts; beszel @66 | Q IQN(beszelAlerts) | includeHistory defaulttrue/maxHistoryItems1..100 default10 | B beszel-alerts/component.tsx; X |
| beszel.getSystemStats; beszel @140 | Q IQN(beszelSystemStats) | systemId/timePeriod/includeDocker; BAD_REQUEST | B beszel/_shared/stats-view.tsx,beszel-system-stats/component.tsx; S prefetch; X |
| beszel.subscribeSystemStats; beszel @198 | S IQN(beszelSystemStats) | systemId; BAD_REQUEST,METHOD_NOT_SUPPORTED,BAD_GATEWAY; LiveStatsEvent | B beszel/_shared/use-live-stats.ts; HTTP SSE |
| anchorNotes.listNotes; anchor-notes @51 | Q IQ1(anchorNote) | anchorNotesListInputSchema | B _inputs/widget-anchor-note-input.tsx |
| anchorNotes.getNote; anchor-notes @73 | Q IQ1(anchorNote) | noteIdInput | B anchor-note/component.tsx |
| anchorNotes.updateNote; anchor-notes @91 | M IA1(anchorNote) | anchorNoteUpdateInputSchema; FORBIDDEN,NOT_FOUND | B anchor-note/component.tsx |
| coolify.getInstancesInfo; coolify @19 | Q IQN | ∅ | B coolify/component.tsx |
| immich.getServerStats; immich @15 | Q IQ1(immich-serverStats) | ∅ | B immich/server-stats/component.tsx; S prefetch |
| immich.getAlbum; immich @24 | Q IQ1(immich-albumCarousel) | optional albumId | B immich/album-carousel/component.tsx; S prefetch |
| immich.getAlbumPreview; immich @43 | Q IQ1(immich-albumCarousel) | albumId/randomizePhotos | B same; S prefetch |
| immich.getAlbums; immich @58 | Q IQ1(immich-albumCarousel) | optional limit1..500 | B immich/album-carousel/index.ts,server-stats/component.tsx |
| paperlessNgx.getStats; paperless-ngx @8 | Q IQ1 | ∅ | B paperless-ngx/component.tsx |
| patchmon.getStats; patchmon @8 | Q U + IQ1 | ∅ | B patchmon/component.tsx; X |
| bazarr.getBadges; bazarr @8 | Q IQ1 | ∅ | B bazarr/component.tsx; X |
| notebook.updateContent; notebook @12 | M U/board | itemId/content/boardId; NOT_FOUND | B notebook/notebook.tsx |
| weather.atLocation; weather @14 | Q P | atLocationInput | B weather/component.tsx,clock/weather-summary.tsx; S prefetch |
| airQuality.atLocation; air-quality @14 | Q P | atLocationInput(latitude/longitude bounded) | B air-quality/component.tsx; X |
| app.ping; app @11 | Q P/app visibility | id; FORBIDDEN,NOT_FOUND,CONFLICT | B app/ping/ping-indicator.tsx |
| dnsHole.summary; dns-hole @29 | Q IQN(dnsHoleSummary) | ∅ | B dns-hole/controls,summary/component.tsx; S prefetch; X |
| dnsHole.enable; dns-hole @63 | M IA1(dnsHoleControls) | ∅ | B dns-hole/controls/component.tsx; X |
| dnsHole.disable; dns-hole @78 | M IA1(dnsHoleControls) | optional duration seconds | B same; X |
| smartHome.entityState; smart-home @14 | Q IQ1(smartHome-entityState) | entityId | X; no literal browser reference found |
| smartHome.entityDetails; smart-home @29 | Q IQ1(smartHome-entityState) | entityId | B smart-home/entity-state/component.tsx; X |
| smartHome.switchEntity; smart-home @44 | M IA1(smartHome-entityState) | entityId; BAD_GATEWAY | B same; X |
| smartHome.executeAutomation; smart-home @63 | M IA1(smartHome-executeAutomation) | automationId; BAD_GATEWAY | B smart-home/execute-automation/component.tsx; X |
| stockPrice.getPriceHistory; stocks @15 | Q P | stockPriceInputSchema | B stocks/component.tsx |
| mediaServer.getCurrentStreams; media-server @10 | Q IQN | showOnlyPlaying | B media-server/component.tsx,audio-stats/component.tsx; S prefetch; X |
| mediaRelease.getMediaReleases; media-release @8 | Q IQN(mediaReleases) | ∅ | B media-releases/component.tsx; S prefetch |
| calendar.findAllEvents; calendar @11 | Q IQN | year1970..9999/month1..12/releaseType/showUnmonitored | B calendar/component.tsx; S prefetch; X |
| downloads.getJobsAndStatuses; downloads @50 | Q IQN | limitPerIntegration/history settings/defaults | B downloads/component.tsx; S prefetch; X |
| downloads.pause; downloads @95 | M IAN | ∅ | B downloads/component.tsx; X |
| downloads.pauseItem; downloads @113 | M IAN | downloadClientItemSchema | B same |
| downloads.resume; downloads @125 | M IAN | ∅ | B same; X |
| downloads.resumeItem; downloads @143 | M IAN | downloadClientItemSchema | B same |
| downloads.deleteItem; downloads @155 | M IAN | item/fromDisk | B same; irreversible upstream deletion semantics |
| mediaRequests.getLatestRequests; media-requests @27 | Q IQN(mediaRequests-requestList) | mediaRequestListInputSchema | B media-requests/list/component.tsx; S prefetch; X |
| mediaRequests.getStats; media-requests @82 | Q IQN(mediaRequests-requestStats) | ∅ | B media-requests/stats/component.tsx; X |
| mediaRequests.answerRequest; media-requests @131 | M IA1(mediaRequests-requestList) | requestId/approve-or-decline | B media-requests/list/component.tsx; X |
| mediaOrganizer.getData; media-organizer @10 | Q IQN(mediaMissing) | pageSize1..50 default10 | B media-missing/component.tsx; X |
| rssFeed.getFeeds; rssFeed @35 | Q P/feed URL restriction | feedsInput; BAD_GATEWAY(all feeds failed) | B rssFeed/component.tsx; S prefetch |
| indexerManager.getIndexersStatus; indexer-manager @11 | Q IQN | ∅ | B indexer-manager/component.tsx; S prefetch |
| indexerManager.testAllIndexers; indexer-manager @38 | M IAN | ∅; INTERNAL_SERVER_ERROR | B same |
| healthMonitoring.getSystemHealthStatus; health-monitoring @19 | Q IQN(system kind list) | ∅ | B health-monitoring/system-health.tsx,system-disks/component.tsx,system-resources/component.tsx; X |
| healthMonitoring.listStorageVolumes; health-monitoring @51 | Q IQ1(synology/openmediavault) | ∅ | X; no literal browser reference found |
| healthMonitoring.getClusterHealthStatus; health-monitoring @64 | Q IQ1(cluster kind list) | ∅ | B health-monitoring/cluster/cluster-health.tsx; X |
| mediaTranscoding.getDataAsync; media-transcoding @8 | Q IQ1 | page/pageSize from paginatedSchema | B media-transcoding/component.tsx |
| minecraft.getServerStatus; minecraft @12 | Q P | serverStatusInputSchema | B minecraft/server-status/component.tsx |
| options.getWidgetOptionSettings; options @16 | Q P | ∅ | ? |
| options.saveItemOptions; options @28 | M U/board | itemId/boardId/newOptions record; NOT_FOUND | B beszel-system-stats/table,docker,downloads components |
| releases.getLatest; releases @35 | Q P/provider/placed-item policy | optional itemId/repositories/provider settings | B releases/component.tsx; preserve release credentials/cache/URL policy |
| networkController.summary; network-controller @23 | Q IQN(networkControllerSummary) | ∅ | B network-controller/network-status,summary/component.tsx |
| firewall.getFirewallCpuStatus; firewall @71→36 | Q IQN(firewall) | factory cpu handler/fallback; ∅ | B firewall/component.tsx |
| firewall.getFirewallInterfacesStatus; firewall @76→36 | Q IQN(firewall) | factory interfaces handler/fallback; ∅ | B same |
| firewall.getFirewallVersionStatus; firewall @81→36 | Q IQN(firewall) | factory version handler/fallback; ∅ | B same |
| firewall.getFirewallMemoryStatus; firewall @86→36 | Q IQN(firewall) | factory memory handler/fallback; ∅ | B same |
| notifications.deleteNotification; notifications @11 | M IA1(gotify) | notificationId positive-decimal max20 | B notifications/component.tsx |
| notifications.getNotifications; notifications @26 | Q P/service scope | ∅ | B same; policy inside handler remains necessary |
| timetable.getTimetable; timetable @252 | Q P/source validation | timetableSourceSchema/stationId/limit | B timetable/component.tsx |
| timetable.searchStations; timetable @267 | Q P/source validation | timetableSourceSchema/query max200 | B timetable/index.ts |
| tracearr.getDashboard; tracearr @9 | Q IQN | ∅ | B tracearr/component.tsx |
| speedtestTracker.getDashboard; speedtest-tracker @9 | Q IQN | ∅ | B speedtest-tracker/component.tsx |
| uptimeKuma.getDashboard; uptime-kuma @9 | Q IQN | ∅ | B uptime-kuma/component.tsx |
| audioStats.getStats; audio-stats @9 | Q IQ1 | ∅ | B audio-stats/component.tsx |
| umami.getWebsites; umami @26 | Q IQ1 | ∅ | B _inputs/widget-umami-website-input.tsx |
| umami.getVisitorStats; umami @37 | Q IQN | websiteId/timeFrame/optional eventName | B umami/component.tsx,umami-content.tsx |
| umami.getEventNames; umami @77 | Q IQ1 | websiteId | B _inputs/widget-umami-event-input,event-names-input.tsx |
| umami.getTopPages; umami @99 | Q IQ1 | websiteId/timeFrame/limit1..500 | B umami/component.tsx,umami-top-list.tsx |
| umami.getTopReferrers; umami @133 | Q IQ1 | websiteId/timeFrame/limit1..500 | B same |
| umami.getMultiEventTimeSeries; umami @167 | Q IQ1 | websiteId/timeFrame/eventNames[] | B umami/component.tsx,umami-content.tsx |
| umami.getActiveVisitors; umami @204 | Q IQ1 | websiteId | B same |
| vpn.getSummaries; vpn @17 | Q P/service scope | ∅ | B vpn/component.tsx |
| ups.getSummaries; ups @8 | Q IQN | ∅ | B ups/component.tsx |
| traefik.getDashboard; traefik @9 | Q IQN | ∅ | B traefik/component.tsx; X |
| customApi.refresh; custom-api @183 | M P/placed-board view | itemInputSchema | B custom-api/widget-definition-context.tsx |
| customApi.getData; custom-api @190 | Q P/placed-board view | itemInputSchema | B custom-api/component.tsx |
| customApi.queryRequest; custom-api @285 | Q P/manifest request permission | namedRequestInputSchema; BAD_REQUEST | B custom-api/widget-definition-context.tsx |
| customApi.executeAction; custom-api @301 | M U/manifest request permission | namedRequestInputSchema/optional confirmed; PRECONDITION_FAILED | B same |
| secrets.setSecret; widget-secrets @22 | M U/board modify | itemId/kind/value1..4096 | B _inputs/widget-multiReleasesRepositories-input.tsx; X alias widgetSecrets |
| secrets.deleteSecret; widget-secrets @57 | M U/board modify | itemId/kind | B same; X alias widgetSecrets |
| secrets.getConfiguredKinds; widget-secrets @74 | Q U/board modify | itemId | B same; X alias widgetSecrets |
| wud.getStats; wud @8 | Q IQ1 | ∅ | B wud/component.tsx; X |
| llamacpp.getStats; llamacpp @8 | Q IQ1 | ∅ | B llama-cpp/component.tsx; annotated but absent MCP registry |
| wazuh.getAgents; wazuh @99 | Q IQ1(wazuhAgents) | ∅ | B wazuh-agents/component.tsx; annotated but absent MCP registry |
| wazuh.getAlerts; wazuh @109 | Q IQ1(wazuhAlerts) | minLevel0..16/limit/range settings | B wazuh-alerts/component.tsx; same MCP exclusion |
| wazuh.getSummary; wazuh @126 | Q IQ1(wazuhSummary) | range default24h | B wazuh-summary/component.tsx; same |
| wazuh.getTimeline; wazuh @138 | Q IQ1(wazuhTimeline) | range/interval/minLevel | B wazuh-timeline/component.tsx; same |
| wazuh.getTopList; wazuh @156 | Q IQ1(wazuhTopList) | kind/range/limit | B wazuh-top-list/component.tsx; same |
| wazuh.getVulnerabilities; wazuh @175 | Q IQ1(wazuhVulnerabilities) | cveLimit/agentLimit/order | B wazuh-vulnerabilities/component.tsx; same |
| wazuh.getFim; wazuh @194 | Q IQ1(wazuhFim) | range/event/limit | B wazuh-fim/component.tsx; same |
| wazuh.getAuthFailures; wazuh @213 | Q IQ1(wazuhAuthFailures) | hours1..168/limit | B wazuh-auth-failures/component.tsx; same |

Special service obligations: RSS `canAccessAllFeedsAsync/restrictUrlsAsync` allows all feeds only for callers with board creation/modification access; otherwise restricts to configured feed URLs, returns failedFeedCount/partial posts, honors NO_EXTERNAL_CONNECTION, and throws BAD_GATEWAY only when every attempted feed fails. This is not an RSS publication endpoint. Wazuh returns `WazuhResult` data/error/dashboardUrl union with safe upstream reasons and mock timestamps, not generic thrown transport errors. Firewall's factory produces four separate leaves with distinct fallbacks. Weather/air quality/location/stocks/timetable/Minecraft/release-provider requests remain server-owned upstream protocols, not newly exposed arbitrary browser proxies. Placed Custom JSX resolves item→board visibility→definition/enabled/options repair→manifest request permission→rate limit→source binding/decrypt→bounded fetch; retain legacy migration PRECONDITION_FAILED, source cache versions, confirmation and invalidation capabilities. Sources: cited leaf files and `custom-api.ts:67–179`, `request-handler/*`, `definitions/*`, `custom-widget/{source-resolver,request-executor,request-manifest,request-limits}.ts`.

### customWidget — 46 leaves; all A, all output I

Registration `packages/api/src/router/custom-widget/custom-widget-router.ts`, including **ten spread groups**: metadata, management, creation, secret, Workshop, template, transfer, preview base, preview query and preview action. Source below is relative to `packages/api/src/router/custom-widget/`; schemas/refinements/transforms and domain helper errors are at the anchors. `X` identifies the 33 MCP candidates. All retain admin plus integration binding/full access, secret-source checks, constrained JSX interpreter/network/SSRF policy, source configuration ownership, Redis preview TTL/revisions/evidence, simulation-vs-live-action policy and Workshop error privacy. These are server-service rules, never client schema metadata alone.

| Leaf; source @line | Kind | Input | Local E | Caller |
| --- | --- | --- | --- | --- |
| schema; metadata-procedures @51 | Q | ∅ | — | X |
| getAuthoringPrompt; same @56 | Q | ∅ | — | X |
| getSkill; same @76 | Q | ∅ | — | X |
| getReference; same @87 | Q | name reference enum | — | X |
| getComponentCatalog; same @99 | Q | ∅ | — | X |
| findComponents; same @110 | Q | query2..240/limit1..16 | — | X |
| getComponent; same @133 | Q | name1..128 | NOT_FOUND | X |
| getComponents; same @149 | Q | names1..8 | — | X |
| getSharedProps; same @169 | Q | names1..64 | — | X |
| getExample; same @189 | Q | name1..128 | NOT_FOUND | X |
| validateTemplate; same @206 | Q | customWidgetTemplateValidationInputSchema | — | X |
| validate; same @243 | Q | widget unknown + authoring schema parser | — | X |
| list; management-queries @31 | Q | ∅ | — | S M/custom-widgets/page.tsx; X |
| legacyMigrationPrompt; same @51 | Q | id | NOT_FOUND | X |
| get; same @78 | Q | id | NOT_FOUND | S edit/publish pages; B CW/custom-widget-source-setup-dialog.tsx; X |
| available; same @104 | Q | boardId/optional currentId | — | B item-select-modal,W Custom Widget inputs |
| optionRequest; same @124 | Q | boardId/definitionId/requestId/params | NOT_FOUND | B W/_inputs/widget-custom-widget-configuration-input.tsx |
| create; creation-procedures @33 | M | customWidgetCreateSchema | — | B M/custom-widgets/_use-custom-widget-form-actions.ts; X |
| createFromPreview; same @53 | M | previewSessionId/optional targetBoardId | BAD_REQUEST | X |
| updateFromPreview; same @97 | M | previewSessionId | BAD_REQUEST,CONFLICT | X |
| update; custom-widget-router @42 | M | customWidgetUpdateSchema | NOT_FOUND | B form-actions; X |
| secretSet; secret-procedures @60 | M | definitionId/customWidgetSecretInputSchema | NOT_FOUND | X |
| sourceConfigure; same @75 | M | definitionId/sourceId/binding/url/secrets | NOT_FOUND,BAD_REQUEST | B CW source-setup-dialog; X |
| configurationRequestUser; same @136 | M | secretRequestInputSchema modes/refinement | NOT_FOUND | X |
| secretClear; same @214 | M | definitionId/sourceId/kind | NOT_FOUND | B M/custom-widgets/_custom-widget-sources-editor.tsx |
| workshopSearch; workshop-procedures @84 | Q | workshopSearchInputSchema | — | X |
| workshopGet; same @118 | Q | submissionId | — | X |
| workshopInstall; same @144 | M | submissionId/name/sources/bindings | BAD_REQUEST | X |
| toggleEnabled; custom-widget-router @74 | M | id/enabled | NOT_FOUND,BAD_REQUEST | B M/custom-widgets/_custom-widget-actions.tsx |
| delete; same @97 | M | id | — | B actions; X |
| duplicate; same @106 | M | id | NOT_FOUND | B actions |
| readTemplate; template-procedures @36 | Q | id | NOT_FOUND | ? |
| writeTemplate; same @54 | M | id/template or templateLines/refinement | NOT_FOUND | ? |
| templatePatch; same @81 | M | id/expectedRevision16chars/line edits | NOT_FOUND,CONFLICT,BAD_REQUEST | X |
| export; transfer-procedures @21 | Q | id | NOT_FOUND | B publish/[id]/_workshop-publish-form.tsx |
| exportLegacy; same @32 | Q | id | NOT_FOUND | ? |
| import; same @58 | M | customWidgetImportSchema/secrets default[] | — | B CW/use-custom-widget-import.ts |
| migrateLegacy; same @69 | M | id/import widget/secrets | NOT_FOUND,CONFLICT | B same; X |
| previewCreate; preview-base-procedures @111 | M | previewCreateInputSchema | BAD_REQUEST,NOT_FOUND | B form-actions; X |
| previewReviseTemplate; same @232 | M | previewReviseTemplateInputSchema | BAD_REQUEST | X |
| previewGet; same @273 | Q | sessionId | — | S preview/[id]/page.tsx |
| previewRefresh; preview-query-procedures @18 | M | sessionId/optional requestIds≤128 | — | B W/custom-api/widget-definition-context.tsx |
| previewQuery; same @38 | Q | previewSessionRequestSchema | NOT_FOUND | B form-utils,W/widget-definition-context; S preview page; X |
| setPreviewLiveActions; same @104 | M | sessionId/enabled | — | B _custom-widget-preview-panel.tsx |
| previewJournal; same @111 | Q | sessionId | — | B preview-panel; X |
| previewAction; preview-action-procedures @17 | M | previewSessionRequestSchema/confirmed | NOT_FOUND,PRECONDITION_FAILED | B preview-action,W/widget-definition-context; X |

### Server-only service consumers outside the procedure count

`packages/api/src/board-server.ts` invokes board.getBoardByName/getHomeBoard through a request-context caller and React cache; used by board layouts/home/widgets routes. `server-settings-server.ts`, `user-server.ts`, `assistant-availability-server.ts` call DB/domain helpers directly, not RPC. Root layout, theme, metadata/manifest and widget prefetch consume them. Reuse these services behind Nitro request-scoped memoization/manual SSR; avoid routing server loaders through loopback HTTP or global user caches. `packages/common/src/revalidate-path-action.ts` is one Next server action; it has a build-generated action protocol, not a stable hand-authored route. Replace its consumers with explicit authorized domain invalidation/revalidation, not an arbitrary client-supplied filesystem/page-path API.

## Curated REST/OpenAPI preservation ledger — 52 operations

Authority: `packages/api/src/open-api.ts:19–34` selects **78 leaves**, but only the following **52** carry OpenAPI method/path metadata. The other 26 remain internal procedures, not additional public REST operations. The existing adapter is `apps/nextjs/src/app/api/[...trpc]/route.ts:15–61`, mounted with endpoint `/`. External callers include third-party clients and MCP-independent scripts; the browser API-management page consumes `/api/openapi?format=scalar`, not necessarily these REST operations.

For **each row**, the corresponding application ledger supplies input/output/schema/policy/error/service obligations. Registry aliases `appRouter`, `boardRouter`, `infoRouter`, `inviteRouter`, `serverSettingsRouter`, `userRouter` become application roots without `Router`; `integration.testConnection` delegates to `integrationTestStoredConnectionProcedure` in both registries, not the unsaved-configuration helper `testConnectionAsync`. GET query/path coercion and non-GET JSON bodies need compatibility adapters; these are not the internal RPC rich-value wire. The current wrapper defaults missing Content-Type to JSON, authenticates **ApiKey only**, and adds wildcard CORS to success/error plus OPTIONS204 (`GET, POST, PUT, PATCH, DELETE, OPTIONS`; allowed headers Content-Type/ApiKey; no credentialed cookie CORS). Domain errors flow through the current OpenAPI adapter's status/body encoding; replacement must explicitly reconcile those with beta.43 `errorStatusMap`, declared response/status metadata and void response behavior. No generated document or response was executed during this research, so exact adapter-produced error bodies/statuses are an acceptance obligation, not an invented observed snapshot.

Target for every row: explicit public contract/REST metadata and adapter invoking the same authorized module service as internal oRPC. Keep the **method, case-sensitive path and parameter names** below. Do not mount the full internal tree: oRPC OpenAPI's default POST exposure would otherwise broaden the surface. Schema-generator filters alone do not block invocation.

| Method | Public path | Application procedure | Metadata source under `packages/api/src/router/` |
| --- | --- | --- | --- |
| GET | `/api/apps/paginated` | app.getPaginated | app.ts:25 |
| GET | `/api/apps` | app.all | app.ts:63 |
| GET | `/api/apps/search` | app.search | app.ts:87 |
| GET | `/api/apps/selectable` | app.selectable | app.ts:133 |
| GET | `/api/apps/{id}` | app.byId | app.ts:160 |
| POST | `/api/apps` | app.create | app.ts:193 |
| PATCH | `/api/apps/{id}` | app.update | app.ts:243 |
| DELETE | `/api/apps/{id}` | app.delete | app.ts:293 |
| GET | `/api/boards` | board.getAllBoards | board.ts:342 |
| POST | `/api/boards` | board.createBoard | board.ts:671 |
| POST | `/api/boards/{id}/duplicate` | board.duplicateBoard | board.ts:749 |
| PATCH | `/api/boards/{id}/name` | board.renameBoard | board.ts:1055 |
| PATCH | `/api/boards/{id}/visibility` | board.changeBoardVisibility | board.ts:1080 |
| DELETE | `/api/boards/{id}` | board.deleteBoard | board.ts:1118 |
| PATCH | `/api/boards/{id}/home` | board.setHomeBoard | board.ts:1141 |
| PATCH | `/api/boards/{id}/mobile-home` | board.setMobileHomeBoard | board.ts:1164 |
| GET | `/api/boards/{id}/settings` | board.getBoardSettings | board.ts:1225 |
| PUT | `/api/boards/{id}/layouts` | board.saveLayouts | board.ts:1284 |
| POST | `/api/boards/{boardId}/layouts/{layoutId}/reset` | board.resetLayout | board.ts:1569 |
| PATCH | `/api/boards/{id}/settings` | board.savePartialBoardSettings | board.ts:1649 |
| PUT | `/api/boards/{id}/content` | board.saveBoard | board.ts:1701 |
| POST | `/api/boards/items` | board.addItem | board.ts:2297 |
| PATCH | `/api/boards/{boardId}/items/{itemId}/layouts/{layoutId}` | board.updateItemLayout | board.ts:2412 |
| GET | `/api/info` | info.getInfo | info.ts:11 |
| GET | `/api/invites` | invite.getAll | invite.ts:30 |
| POST | `/api/invites` | invite.createInvite | invite.ts:67 |
| DELETE | `/api/invites/{id}` | invite.deleteInvite | invite.ts:108 |
| GET | `/api/settings/board` | serverSettings.getBoardSettings | serverSettings.ts:58 |
| PATCH | `/api/settings/board` | serverSettings.updateBoardSettings | serverSettings.ts:81 |
| POST | `/api/users` | user.create | user.ts:183 |
| PUT | `/api/users/profileImage` | user.setProfileImage | user.ts:213 |
| GET | `/api/users` | user.getAll | user.ts:280 |
| GET | `/api/users/selectable` | user.selectable | user.ts:316 |
| POST | `/api/users/search` | user.search | user.ts:356 |
| GET | `/api/users/preferences` | user.getPreferences | user.ts:386 |
| GET | `/api/users/{userId}` | user.getById | user.ts:430 |
| PUT | `/api/users/profile` | user.editProfile | user.ts:487 |
| DELETE | `/api/users/{userId}` | user.delete | user.ts:548 |
| PATCH | `/api/users/{userId}/changePassword` | user.changePassword | user.ts:581 |
| PATCH | `/api/users/preferences` | user.updatePreferences | user.ts:661 |
| PATCH | `/api/users/changeHome` | user.changeHomeBoards | user.ts:694 |
| PATCH | `/api/users/changeSearchEngine` | user.changeDefaultSearchEngine | user.ts:718 |
| PATCH | `/api/users/search-preferences` | user.changeSearchPreferences | user.ts:739 |
| PATCH | `/api/users/changeScheme` | user.changeColorScheme | user.ts:760 |
| PATCH | `/api/users/right-click-widgets` | user.changeEnableRightClickOnWidgets | user.ts:780 |
| PATCH | `/api/users/header-preferences` | user.changeHeaderPreferences | user.ts:802 |
| PATCH | `/api/users/ddg-bangs` | user.changeDdgBangs | user.ts:821 |
| PATCH | `/api/users/firstDayOfWeek` | user.changeFirstDayOfWeek | user.ts:839 |
| GET | `/api/certificates/{fileName}` | certificates.getCertificate | certificates/certificate-router.ts:41 |
| POST | `/api/certificates/root` | certificates.ensureRootCertificate | same:58 |
| POST | `/api/integrations/request` | integration.request | integration/integration-request.ts:126 |
| GET | `/api/integrations/{id}/test-connection` | integration.testConnection | integration/integration-test-stored-connection.ts:14 |

Reconciliation: apps8 + boards15 + info1 + invites3 + settings2 + users19 + certificates2 + integration2 = **52**. Existing `.meta` summaries/tags/deprecation descriptions are public-contract data to preserve alongside the schemas, not new permissions. `openApiDocument:53–74` patches optional authentication to `[{}, {apikey:[]}]` for GET `/api/boards` and `/api/apps/{id}`, repairs the preferences root refinement using `z.toJSONSchema(...,{io:"input"})`, and gives integration.request an exactly-one-selector example. These corrections and Scalar recursive-schema normalization must survive generator replacement. The two legacy preference routes remain deprecated, not deleted by this research. REST GET stored-connection testing can contact upstream services; HTTP verb alone does not establish cache safety.

## Curated MCP catalog — 29 roots, 133 enabled candidates

Authority: `packages/api/src/mcp.ts:36–66`, `mcp-tools.ts:67–172`, route `_extract-tools.ts`, `_handler.ts:86–199,233–344` and `_protocol.ts:29–82` under `apps/nextjs/src/app/api/mcp/`. This is a **static candidate ledger**, not an observed tools/list. Each listed leaf retains its application schema/service/policy from the procedure ledger; wrapper exceptions are explicit below. No explicit name overrides were found among these candidates, so the wire name is `<eager.root>_<leaf.with.dots.replaced.by.underscores>`. Preserve descriptions verbatim from the referenced leaf's metadata; they contain discovery prerequisites, required IDs, bounds and destructive-operation guidance, not just prose labels.

| Eager root | Application root | Enabled leaves (all, not examples) | Count |
| --- | --- | --- | ---: |
| stats | widget.stats | catalog, snapshot, refresh | 3 |
| app | app | getPaginated, all, search, byId, create, update, delete | 7 |
| apiKeys | apiKeys | getAll, delete | 2 |
| board | board | getAllBoards, catalog, search, createBoard, duplicateBoard, renameBoard, changeBoardVisibility, deleteBoard, setHomeBoard, setMobileHomeBoard, getBoardByName, getBoardSettings, saveLayouts, resetLayout, savePartialBoardSettings, saveBoard, addItem, updateItemLayout | 18 |
| customWidget | customWidget | schema, getAuthoringPrompt, getSkill, getReference, getComponentCatalog, findComponents, getComponent, getComponents, getSharedProps, getExample, validateTemplate, validate, list, legacyMigrationPrompt, get, create, createFromPreview, updateFromPreview, update, secretSet, sourceConfigure, configurationRequestUser, workshopSearch, workshopGet, workshopInstall, delete, templatePatch, migrateLegacy, previewCreate, previewReviseTemplate, previewQuery, previewJournal, previewAction | 33 |
| docker | docker | reconcileServices, getServiceHealth, refreshInventory, getContainers, getEndpoints, startAll, stopAll, restartAll, removeAll, logs | 10 |
| icon | icon | findIcons | 1 |
| info | info | getInfo | 1 |
| integration | integration | request, getKinds, all, search, byId, create, delete, searchInIntegration, mediaRequestSearchTargets, searchMediaRequests, getMediaRequestOptions, requestMedia | 12 |
| invite | invite | getAll, createInvite, deleteInvite | 3 |
| kubernetes | dedicated wrappers | contexts.getContexts, ingresses.getIngresses, pods.getPods | 3 |
| searchEngine | searchEngine | catalog | 1 |
| user | user | create, getAll, getPreferences, getById, delete, updatePreferences | 6 |
| airQuality | widget.airQuality | atLocation | 1 |
| bazarr | widget.bazarr | getBadges | 1 |
| serverSettings | serverSettings | getBranding, getBoardSettings, updateBoardSettings | 3 |
| beszel | widget.beszel | getSystems, getAlerts, getSystemStats | 3 |
| calendar | widget.calendar | findAllEvents | 1 |
| dnsHole | widget.dnsHole | summary, enable, disable | 3 |
| downloads | widget.downloads | getJobsAndStatuses, pause, resume | 3 |
| healthMonitoring | widget.healthMonitoring | getSystemHealthStatus, listStorageVolumes, getClusterHealthStatus | 3 |
| mediaRequests | widget.mediaRequests | getLatestRequests, getStats, answerRequest | 3 |
| mediaServer | widget.mediaServer | getCurrentStreams | 1 |
| mediaOrganizer | widget.mediaOrganizer | getData | 1 |
| patchmon | widget.patchmon | getStats | 1 |
| smartHome | widget.smartHome | entityState, entityDetails, switchEntity, executeAutomation | 4 |
| traefik | widget.traefik | getDashboard | 1 |
| widgetSecrets | widget.secrets | setSecret, deleteSecret, getConfiguredKinds | 3 |
| wud | widget.wud | getStats | 1 |

The 204 registered leaves include **71 non-candidates**, including two subscriptions; neither subscriptions nor unannotated leaves become tools. `kubernetes/mcp-router.ts:7–61` owns three admin wrappers: contexts has no input; ingresses/pods require `{contextId:string.min(1)}` and dynamically import/delegate through the corresponding application's authorized caller. Preserve these external names and service policy without an unsafe double-run of equivalent oRPC middleware. Application annotations for Wazuh8/llamacpp1 are outside this eager registration and must not be silently added in migration.

Extractor obligations, not optional shortcuts:

- Skip subscriptions; require metadata.enabled; default/override name must match `[a-zA-Z0-9_.-]{1,128}`; omit **all** collisions, sort tools by name and diagnostics by path/reason. Diagnostics distinguish unsupported_input/invalid_schema/duplicate_name/invalid_name without leaking schema internals.
- No-input/void/undefined procedures present a strict empty object schema and dispatch `undefined`. Object or optional-object inputs are converted in **input mode**, intersecting chained input objects and forcing an object root. SDK/AJV2020 compilation checks the schema; it does not replace actual procedure parsing. Coercion/default insertion/property removal are disabled in AJV.
- Trim/case-overwrite strings remove incompatible raw-JSON length/pattern/format constraints; date-time regex schemas remove the stricter incompatible JSON Schema format. Defaults, normalization/refinements and authorization still run once through raw-input dispatch. An oRPC schema adapter must recreate these semantics instead of handing already transformed output to an input parser.
- Non-admin callers hide the 33 `customWidget_*` candidates; **100 remaining static candidates is not a guaranteed runtime count**. Other admin tools can remain listed and deny execution through service policy. Catalog cache is private (`tools/list` TTL300000ms), not globally reusable across identities.
- Successful tool results become MCP text content after `toAssistantToolOutput` plus `serializeMcpToolResult`; failures become `isError:true` with safe JSON text, not raw exception stack/secret/URL. Preserve Custom Widget error sanitization and the generic safe-code map. `callMcpTool` currently traverses the eager caller dynamically; its replacement must dispatch through authorized module implementations, never directly through an unguarded DB function.

Admin-only non-tool protocol registrations are **additional capabilities**, not extra procedure leaves: prompt `homarr-custom-widget-author` accepts optional request/documentationUrl; resources `homarr://custom-widgets/{schema,components,skill}`, one `references/<name>` per `CUSTOM_WIDGET_SKILL_REFERENCE_NAMES` (schema/runtime/security), one `examples/<id>` per `customJsxExamples`; templates `homarr://custom-widgets/components/{name}` and `.../examples/{name}`. Retain JSON/schema+JSON/Markdown MIME types, URI decoding, unknown-resource failures, and server instructions. These use authoring-resource services directly. Assistant also consumes the extracted catalog internally and applies its own activation/approval policy; an externally visible tool is not automatically approved for an Assistant conversation.

Target: module-local client-safe tool descriptors/input schemas with server-only authorized dispatch; a central explicit MCP selection composes them. Retain the MCP SDK Fetch handler and OAuth/discovery protocols rather than pretending tools/resources/prompts are oRPC or REST routes. Catalog/schema compilation and authenticated tools/list parity remain future acceptance checks.

## HTTP route ledger — 26 files / 38 explicit method exports

Sources in this table are under `apps/nextjs/src/app/`; a path ending in `/route.ts` is the registration authority. **One row per file**, with every explicit method named. Implicit framework HEAD/OPTIONS behavior is not counted; require deliberate equivalents/405 behavior during implementation. No generic CORS, cache or abort policy may be inferred for rows without one: route-local exceptions are stated below, global headers come from `apps/nextjs/next.config.ts:79–118`, and nginx currently owns outer body limits/upgrades. HTTP status lists are source branches, not exhaustive network/runtime failures. All non-RPC protocol rows target ordinary Nitro Fetch Request→Response adapters calling retained services, with NextRequest/NextResponse/params/auth/header helpers replaced.

| Current path; methods | Source @line | Identity/schema/result and special behavior | Verified consumer / target seam |
| --- | --- | --- | --- |
| `/api/trpc/:trpc`; GET, POST, OPTIONS | api/trpc/[trpc]/route.ts:26–59 | ApiKey then cookie; full334 router, batch JSON/SuperJSON, SSE and non-JSON links; OPTIONS204 and wildcard CORS. Error formatter/context above | `L/_client-providers/trpc.tsx`, `packages/api/src/client.ts`; replace wire/client together with oRPC Fetch mount, not just rename prefix |
| `/api/*`; GET, POST, PUT, PATCH, DELETE, OPTIONS | api/[...trpc]/route.ts:23–61 | ApiKey-only curated52 REST; JSON fallback/CORS/OPTIONS204 above. More specific API routes take precedence | external REST clients; explicit curated OpenAPIHandler selection, not catch-all internal exposure |
| `/api/auth/*`; GET, POST | api/auth/[...nextauth]/route.ts:9–17 | Provider-sensitive Auth.js dispatch; credentials/LDAP/OIDC, cookies/CSRF/redirects/database sessions; trusted-origin rewrite and secure-cookie choice | `packages/auth/client.ts`, login/logout/session provider; protocol handler owned with identity work, not an oRPC login mutation |
| `/api/assistant/chat`; POST | api/assistant/chat/route.ts:130,155,411,1160,1292 | Cookie session, thread ownership; requestSchema, 12000000-byte ceiling, ≤200 messages/≤200 parts, ≤16 browser-tool entries, attachment/model validation. JSON errors400/401/404/413/502/503; AI SDK UIMessage stream success, request.signal, duration600 | `N/components/assistant/assistant-provider.tsx:466` via AI SDK transport; retain UIMessage framing, approvals/continuations, terminal metadata and abort semantics |
| `/api/mcp`; POST | api/mcp/route.ts:1 | ApiKey then Bearer, no cookie; stateless Streamable HTTP, SDK protocol statuses plus route401/429 and WWW-Authenticate/Retry-After | external MCP clients; retain `_protocol.fetch`, curated catalog/auth adapter |
| `/api/mcp/:transport`; GET, POST, DELETE | api/mcp/[transport]/route.ts:3 | Same handler; resource compatibility `/api/mcp/mcp`; `/sse` and `/message` return410 before auth. Dynamic route is not evidence every arbitrary transport name is supported | external MCP clients; same protocol adapter with exact supported/removed path behavior |
| `/api/mcp/oauth/register`; POST | api/mcp/oauth/register/route.ts:47 | Public JSON client_name/redirect_uris; 1–10 http(s) URIs; client name truncated256; bounded in-memory registration, attempts5/min/IP. 201 client_id/client_secret/URIs/name with auth method none; 400/429/503 | MCP OAuth clients; preserve registration protocol, no implicit authenticated admin requirement |
| `/api/mcp/oauth/authorize`; GET | api/mcp/oauth/authorize/route.ts:8 | Cookie session or login continuation; client_id/redirect_uri/code_challenge/state/resource or pending; S256 only, exact registered redirect and resource checks. Redirect302, errors400/403/503 | MCP clients and `/auth/login?callbackUrl=...`; same Auth/OAuth boundary, bound pending/code state |
| `/api/mcp/oauth/token`; POST | api/mcp/oauth/token/route.ts:58 | FormData or JSON authorization_code/code/code_verifier/redirect_uri/resource; single-use consume then PKCE/redirect/resource validation. Failures10/min/IP, 400/429/500. Durable hashed API-key insert; JSON access_token/token_type Bearer/scope mcp:tools, no expires_in | MCP OAuth clients; retain protocol/token service, never log keys or auto-retry an ambiguous issuance |
| `/well-known/*`; GET, OPTIONS (external rewrite aliases below) | well-known/[...path]/route.ts:11,49 | Public oauth-authorization-server / oauth-protected-resource JSON, suffix-specific issuer/resource; unknown404, OPTIONS204; wildcard CORS GET/OPTIONS/any header | MCP client discovery and Bearer challenges; explicit Nitro aliases with stable forwarded base URL |
| `/api/health/ready`; GET | api/health/ready/route.ts:1 | Public empty200, no dependency check or local cache header | deployment/orchestrator; preserve current counterintuitive naming unless separately approved |
| `/api/health/live`; GET | api/health/live/route.ts:12 | Public DB/Redis checks, JSON status/healthChecks/latency; 200 healthy/500 unhealthy, no-store; catches safe failures | deployment/orchestrator; reuse DB/Redis heartbeat, explicit lifecycle owner |
| `/api/backup/export`; GET | api/backup/export/route.ts:12 | Cookie admin403; SQLite-only400; missing DB/export error500. ZIP200 with db.sqlite and metadata including encryption key; attachment filename/length. Native SQLite/VACUUM, temporary-file cleanup; no explicit local no-store or request cancellation | `M/tools/backup/_components/backup-export-card.tsx`; retained binary/native service, package assets and cleanup ownership |
| `/api/backup/import`; POST | api/backup/import/route.ts:211 | Cookie admin or initial claimed onboarding403; SQLite400; multipart file/ZIP checks400/413, restore lock409, configuration/restore500. 256MiB compressed, multipart +1MiB, DB512MiB, archive +2MiB, metadata1MiB/key1024bytes. Migrates, key conversion, atomic file replace/sidecar cleanup; success JSON restartAfterMs500/homeBoardName then process exit | `N/components/backup/database-restore-flow.tsx:201`; retain bounded restore transaction/runtime restart, no speculative automatic retry |
| `/api/backup/migrations`; GET | api/backup/migrations/route.ts:28 | Public `{total,migrations:[idx,tag,sql,when]}`; packaged SQLite journal/SQL; missing/read500; public max-age3600 | `N/components/backup/use-backup-analysis.ts:27`; native asset reader or equivalent packaged response |
| `/api/backup/sql-wasm`; GET | api/backup/sql-wasm/route.ts:15 | Public WASM bytes; missing500; cached Buffer, application/wasm, public immutable31536000 | same analysis hook:84; package exact sql.js WASM asset, not a JSON RPC result |
| `/api/custom-widgets/:resource`; GET | api/custom-widgets/[resource]/route.ts:19,47,56 | Cookie admin403; schema/components/skill/reference-schema/reference-runtime/reference-security/authoring-prompt JSON; unknown404 | authoring clients and tool prompt links; retain resource service, MIME/result shape |
| `/api/custom-widgets/configuration-request/:token`; GET, POST | api/custom-widgets/configuration-request/[token]/route.ts:26,48,173 | Cookie admin403 plus token user ownership/expiry; GET safe fields/no-store or404. POST strict connection/secrets JSON ≤24KiB, requested secret values1..8192, integration-vs-HTTP policy, bindings check, claim/release/retry;400/404/409/413; completed/no-store | `L/custom-widget-configuration/[token]/configuration-entry.tsx:47,67`; retain owner-bound source setup concurrency service |
| `/api/user-medias/:id`; GET | api/user-medias/[id]/route.ts:51 | No local session check; DB blob or Next notFound404; sanitize SVG, SHA256 ETag;200/304 with private no-cache, MIME/length, sandbox CSP, nosniff; validator list/weak/wildcard parsing | board backgrounds, uploaded icons/profile/branding, `packages/icons/src/repositories/local.icon-repository.ts:26`; binary Fetch service and explicit404 |
| `/api/image-proxy/:id`; GET | api/image-proxy/[id]/route.ts:3 | No local session check; proxy registry ID→ImageProxy; upstream-error status passthrough, fetch502, missing404 with X-Homarr-Image-Proxy-Error. Success bytes/MIME, public immutable3600 | URLs made by `packages/image-proxy/src/index.ts:140`, upstream-backed widgets; retain proxy service/cache/error contract |
| `/api/about/contributors/crowdin`; GET | api/about/contributors/crowdin/route.ts:5 | Public static JSON from @static-data/translators.json; force-static | external/legacy readers; About page also reads bundled data directly; Nitro static JSON response |
| `/api/about/contributors/github`; GET | api/about/contributors/github/route.ts:5 | Public static JSON from @static-data/contributors.json; force-static | same; Nitro static JSON response |
| `/api/about/contributors/opencollective`; GET | api/about/contributors/opencollective/route.ts:5 | Public static JSON from @static-data/opencollective-contributors.json; force-static | same; Nitro static JSON response |
| `/api/about/dependencies`; GET | api/about/dependencies/route.ts:5 | Public dependency JSON via versions/package-reader.ts; force-static, requires version/package assets | About page also calls reader directly; bundled public-safe dependency response |
| `/api/openapi`; GET | api/openapi/route.ts:6 | Public generated JSON with forwarded base; optional `format=scalar` recursive-schema normalization | `M/tools/api/components/scalar-api-reference.tsx:15`; serve canonical curated oRPC-generated specification, preserve formatting option |
| `/api/onboarding/claim`; POST | api/onboarding/claim/route.ts:13 | Cookie claim/current DB state, admin force; sec-fetch-site same-origin/none or absent; cross-site403, finished409+cookie delete, admin-required403, lock423+expiry/no-store, unavailable409; issued/active200+httpOnly strict cookie/secure forwarded HTTPS/expiry/no-store | `packages/onboarding/src/{welcome,onboarding-studio}.tsx`; retain atomic claim service and response cookie adapter |

### Dynamic protocol and framework surfaces not counted as fixed operations

- **Auth action family:** installed `node_modules/@auth/core/src/lib/index.ts:41–96` dispatches GET callback/`csrf`/`error`/`providers`/`session`/`signin`/`signout`/`verify-request`/`webauthn-options`, and POST callback/`session`/`signin`/`signout`; provider segments attach to signin/callback/webauthn-options. These are library-supported action families, not nine independently registered Homarr providers. Homarr config enables credentials/LDAP/OIDC depending on env; no email/WebAuthn provider should be invented because an action exists. Preserve `/api/auth/{signin,callback}/<active-provider>`, session/CSRF/provider-list/logout behavior, form-vs-JSON handling, redirect cookies and client return conventions. Core Fetch dispatch is reusable only after replacing Homarr's Next cookie/database-session customization; `next-auth/react` session consumer is adapter work. Source: `packages/auth/{configuration.ts,client.ts,next.ts,providers,adapter.ts}`.
- **OAuth aliases:** `/.well-known/:path*` → `/well-known/:path*`; `/api/mcp/:transport/.well-known/:path*` → `/well-known/:path*/api/mcp/:transport`. Canonical challenges use `/.well-known/oauth-protected-resource<request-path>`. Retain both discovery kinds, suffix handling, allowed resources `/api/mcp` and `/api/mcp/mcp`, and one trusted forwarded-origin policy; `next.config.ts:68–75`, MCP `_base-url.ts`, discovery route. No runtime rewrite/OAuth exchange was performed.
- **Manifest:** `apps/nextjs/src/app/manifest.ts` is dynamic metadata generation, yielding `/manifest.webmanifest` in the framework convention, **not** a route.ts file. Reuse branding settings/public-safe projection, name/short name/color/start_url/icons; replace with explicit Nitro manifest response and correct MIME/cache policy. Never cache session-dependent bootstrap globally.
- **Server action:** revalidate-path action's generated endpoint/identifier is build-specific. Replace domain callers with targeted authorized invalidation or SSR cache update, not emulation of Next's private wire protocol. Page loaders/SSR APIs may be new implementation entrypoints; they must not inflate the existing334 count.
- **Framework assets:** `/_next/image` (four current consumers), `/_next/static/*` and RSC/navigation traffic are framework-generated, not domain API registrations. Vite static assets, ordinary images or an explicitly chosen optimizer and manual SSR replace them. Retain deep links, media URLs, size/loading/error behavior and public assets; old Next asset URLs need only an intentional rollout compatibility policy, not permanent Next runtime retention.
- **Static/public and global HTTP policy:** public fonts/images/icons/service worker (`/sw.js`), PWA icons, robots or favicons when present are packaging/renderer surfaces. Preserve service-worker content type/no-cache/no-store/must-revalidate/CSP and global Accept-CH viewport width and current CSP capabilities (iframe, worker/blob media, external connects). The current permissive CSP is a compatibility baseline, not security endorsement; tightening is a separate reviewed change. Do not overwrite the stronger per-media CSP with a weaker global header. `next.config.ts:79–118`, `apps/nextjs/public/`, root metadata and `nginx.conf:10–26` own these concerns today.

Binary uploads **within the334** are media.uploadMedia and certificates.addCertificate (FormData); backup.import is separate HTTP multipart. beta.43 supports root binary/FormData-related transport capabilities, but successful type inference is not proof the existing `zod-form-data` parser, file limits, byte fidelity and error/progress behavior work. Keep schema parsers/services and choose a plain Fetch upload adapter if needed; this local decision does not block ordinary JSON procedures. Restore contains encryption-key material and currently visibly re-encrypts integrationSecret only; Assistant/Custom Widget encrypted families need a full-key-coverage review before claiming cross-key restore parity. Adding no-store to key-bearing responses or stronger CSRF/origin checks is worthwhile security work but must be recorded as an intentional change, not claimed as current behavior.

## Subscription and stream lifecycle preservation

There are **four application S leaves**, with **three browser WS consumers and one HTTP SSE consumer**; ordinary procedure requests currently also have batch-response streaming. These, MCP Streamable HTTP and Assistant UIMessage streams are distinct protocols. Async iterators are a plausible common server interface, not a common wire format.

| Procedure / current transport | Event/state semantics and service reuse | Cleanup/backpressure/reconnect obligation | Recommended local target |
| --- | --- | --- | --- |
| log.subscribe / WS | `log.ts:14–85`; permission other-view-logs, levels defaultinfo; union history(messages[]) / message(message). Subscribe Redis before reading recent history, buffer live events, deduplicate by message ID | Cleanup handles close before async subscribe resolves; unsubscribes on failure/return; history buffer currently unbounded. Preserve order/race semantics; choose bounded log policy explicitly, not snapshot dropping. Recent history is not a general durable replay guarantee | authorized async generator over retained loggingChannel; typed event schema; streamed accumulation or dedicated log reducer with bounded UI history |
| cronJobs.subscribeToStatusUpdates / WS | `cron-jobs.ts:62–83`; admin, TaskStatus from all registered job channels; initial table data comes from getJobs separately | Unsubscribe every channel on close; no replay cursor/history provided. Reconnect refreshes job snapshot then follows events; do not start a second scheduler from a subscription | generator over retained status channels; per-job keyed reducer, not live.latest-only for all jobs |
| docker.subscribeLogs / WS | `docker/docker-router.ts:185–240`; admin + Docker availability/endpoint logs capability; endpointId/id/tail1..1000/default200, string chunks | Dispose sets isSubscribed=false and calls cleanupFn if resolved. **Late async setup can assign cleanup after disposal without calling it**: port must close this race, not preserve a resource leak. Retain upstream stream cleanup, terminal errors, tail semantics; logs need bounded accumulation, no blind writes/replay | authorized generator over streamContainerLogsAsync; finally/late-resolution cleanup, bounded text reducer; transport choice independent of Docker commands |
| widget.beszel.subscribeSystemStats / HTTP SSE | `widgets/beszel.ts:198–294`; public integration query policy, integrationIds + systemId; first authorized integration used; LiveStatsEvent. Browser `W/beszel/_shared/use-live-stats.ts` uses credentialed EventSource | Queue bound4 drops oldest pending snapshots; request signal→local AbortController→upstream; generator finally aborts/removes listener/returns queue. Unknown subscription capability and upstream failure safely map errors. Preserve upstream events and consumer merge semantics, not only newest arbitrary event | async iterator Fetch/SSE is nearest fit; preserve bounded queue/abort; use live options only if its latest-event replacement matches the existing reducer |

**WS host** (`apps/websocket/src/main.ts`, `nginx.conf`, client provider): whole appRouter can run over WS today, although browser routing chooses only three S leaves. Porting only subscriptions is an intentional exposure change requiring a decision for any external WS clients. Current upgrade context authenticates session-token cookie only; errors become null session. Heartbeat30000ms/pong5000ms; lazy client close30000ms; SIGTERM broadcasts tRPC reconnect before server close. The session-token helper returns expiry but does not itself reject expired rows: agree enforcement/revocation during long-lived connections, permission refresh, Origin checks and reconnect policy with the identity owner. Do not silently expand to Bearer/ApiKey WS access. Adapter readiness/shutdown belongs to the runtime owner; no independent second listener is necessary if Nitro owns upgrades.

**oRPC choice:** beta.43 Fetch async iterators use oRPC SSE completion/framing; plain EventSource/tRPC links must be replaced. CrossWS is `experimental_RPCHandler` and requires immediate ordered `.message(peer,message,{context})` before unrelated async work, plus `.close(peer)` on every close path. Capture authenticated upgrade context without awaiting out of order inside message dispatch. Neither adapter automatically recreates heartbeat, revocation, replay, graceful shutdown or queue bounds. Recommendation: implement generator/services first, then decide whether the three existing WS streams stay WS or move to SSE. Do not block ordinary Q/M work on this choice.

**Other streams:** preserve AI SDK UIMessage framing and approval continuation on `/api/assistant/chat`, SDK Streamable HTTP on MCP, and upstream provider/media protocols below. `request.signal` being forwarded does not prove Nitro's preset/nginx/client disconnect cancels generation or private tool work; later evidence must cover slow readers, abort before setup, abort after setup, errors after headers, terminal events and shutdown. Logs are event histories, Beszel is snapshots, task status is keyed state: choosing `liveOptions` indiscriminately would lose data. Event IDs/Last-Event-ID enable replay only when a service can actually supply it; Redis pub/sub alone does not create retained replay.

## External protocol boundaries and excluded runtimes

These are **not new internal endpoint registrations** and must remain operational through the replacement's browser/server adapters.

| Boundary | Existing ownership/source | Preservation/classification |
| --- | --- | --- |
| Workshop provider GET `/api/ai/v1/models`, GET `/api/ai/usage`, POST `/api/ai/v1/chat/completions` | `apps/workshop/homarr_provider.go:113–129`; usage/chat require PocketBase users auth; chat body12000000bytes. Homarr provider/client chooses external base/auth | External Go runtime unchanged; OpenAI-style generation/stream protocol, quota/errors/model discovery and cancellation are not oRPC wire. Reuse Homarr Assistant provider adapter |
| Workshop collections/auth/files | `packages/workshop/src/backend.ts:146–153,291–625`; PocketBase users authRefresh/authWithOAuth2; workshop_listings/submissions/votes/reports/workshop_report_summaries/comments; files `/api/files/submissions/<id>/<encoded filename>?thumb=...` | External dynamic SDK APIs, CRUD/filters/pagination/uploads/OAuth/token storage/cancellation/user-scoped client state retained. Custom Widget workshopSearch/Get/Install remain internal authorized proxies to these services. Do not invent finite registration counts for SDK-generated collection APIs |
| Workshop detail share pages | `apps/workshop/pb_hooks/workshop.pb.js:78–79`, GET `/workshop/{id}` and trailing-slash variant | External social metadata/redirect/static-shell delivery remains Go/PocketBase-owned, not Nitro replacement scope |
| Docs search/feeds/LLM exports/SEO | `apps/docs/src/app/api/search/route.ts`, `blog/rss.xml/route.ts`, `llms.txt/route.ts`, `llms-full.txt/route.ts`, `llms.mdx/{blog/[...slug],docs/[[...slug]],api-reference/[...slug]}/route.ts`, sitemap.ts/robots.ts | Separate docs app outside replacement. Preserve links/Assistant documentation retrieval, Workshop browsing and shared contracts; docs RSS publication is distinct from Homarr rssFeed.getFeeds consumption |
| RSS/Atom/JSON feed and iCal consumption | `widgets/rssFeed.ts`, `packages/request-handler`, integration iCal/native calendar services | Retain permitted configured URLs/public-board access, partial failure, feed parser/date/unit behavior, no-external policy and cache. No main-app RSS publication route was registered |
| Image/video/iframe/external application content | image-proxy package, media/release providers, widgets/video and iframe/browser URL consumers, CSP above | Media binary/status/header/cache contracts retained. Browser video/HLS/iframe requests are external protocols, not server procedures to indiscriminately proxy; preserve CSP/player framing and safety constraints |
| Integrations, Docker, Kubernetes, LDAP/OIDC | `packages/integrations`, `docker`, auth providers/certificate clients, middleware and application ledger | Retain native HTTP/WS/socket/auth/certificate/deadline/cache/policy services. tRPC middleware/context is adapter work, not reason to rewrite every provider. Native TrueNAS/iCal exclusion from generic integration.request does not remove their own protocol capabilities |
| Notifications/search/release/weather/location/stock/timetable/Minecraft | corresponding widget/root procedures and request handlers | Server-owned upstream protocols and safe results preserved; browser oRPC inputs do not grant arbitrary URL/credential access. Detailed provider enumeration belongs to integration/widget research, not duplicate internal endpoint counts |

The proposed migration changes the Homarr application transport and its framework adapters, not these remote services' published protocols. Reuse classifications are per entrypoint: an apparently framework-neutral package can still re-export Next-only helpers (`packages/common/src/server.ts` → request.ts). Check transitive client/server imports before exporting any contract or SSR bootstrap data.

## Exact beta.43 evidence and constraints on the target

Context7 resolution failed with **Monthly quota reached**; no retry or claim of Context7 verification is made. Evidence is installed `node_modules/@orpc/*/package.json` / released declarations/source, current official pages retrieved for this research, and the linked exact-release stack note. Current docs describe moving v2; local/release files settle beta.43 syntax. Inspection is static: no compiler, server, generated schema, client exchange or deployment compatibility test was run.

| Verified capability / constraint | Exact installed/released evidence | Official guidance and migration implication |
| --- | --- | --- |
| Aligned `@orpc/{server,client,contract,openapi,tanstack-query,zod}` version2.0.0-beta.43 | package.json for each; [exact server manifest](https://registry.npmjs.org/@orpc/server/2.0.0-beta.43) | [Getting started](https://orpc.dev/docs/getting-started), [v1 migration](https://orpc.dev/docs/migrations/from-v1): use exact prerelease pairing, not v1 snippets or moving @beta |
| Contract-first `oc` + `implement`, `RouterContractClient`; server `call`/`createRouterClient` | contract/server dist/index.d.mts; contract initial output is Schema<unknown> | [Contract-first](https://orpc.dev/docs/contract-first), [server clients](https://orpc.dev/docs/client/server-side): an omitted output is **unknown in the client contract**, not inferred runtime DTO. Modules must supply real output schemas/types, or explicitly choose a code-first internal leaf while completing that contract; public REST/MCP schemas cannot be invented |
| Runtime Standard Schema `.input`/declared `.output`; error code/message/data, not error.status | server/contract declarations, shared handler source | [Procedures](https://orpc.dev/docs/procedure), [errors](https://orpc.dev/docs/error-handling): preserve transforms, refinement and flatten-safe error data; handler errorStatusMap owns status. Inferred server return typing alone does not validate output; avoid double middleware execution |
| Fetch `RPCHandler` / `OpenAPIHandler`; handle returns matched discriminated Response | server/dist/adapters/fetch/index.d.mts:13–30; openapi/dist/adapters/fetch | [Fetch adapter](https://orpc.dev/docs/adapters/fetch-api), [Nitro entry](https://nitro.build/docs/server-entry): pass raw Request/prefix/request context; return matched Response. API-prefix misses404, page fallback only where intended; server.ts fallback is not security middleware for more specific routes |
| Rich RPC serialization vs REST projection vs persisted SuperJSON | client/dist/shared serializer source | [RPC serializer](https://orpc.dev/docs/rpc/serializer), [OpenAPI serializer](https://orpc.dev/docs/openapi/serializer): Date/bigint/Map/Set/undefined/non-finite values have v2 transport support, not SuperJSON-wire compatibility. RegExp is not built in; files in iterator events have limits. Separate durable decoding and SSR hydration serializer |
| Query query/mutation/infinite/streamed/live options and signal forwarding | tanstack-query/dist/index.mjs:43–117,212–502 | [TanStack Query](https://orpc.dev/docs/integrations/tanstack-query): live replaces latest event; streamed accumulates/maxChunks; context excluded from generated query key. Preserve explicit identity scope, cache clearing on logout/permission denial, retries, optimistic invalidations, pagination/refresh/default intervals; no infinitely open server prefetch |
| Typed async iterators and cancellation; SSE framing | contract `asyncIteratorObject`, server standard/Fetch handlers, client Fetch adapter | [Server streaming](https://orpc.dev/docs/async-iterator-object), [client streaming](https://orpc.dev/docs/client/async-iterator-object): typed event schema + generator finally/signal/upstream cleanup. Plain EventSource does not understand oRPC completion; keepalive/header flush is adapter configuration, not automatic proxy parity |
| WebSocket/CrossWS adapter difference | server/dist/adapters/crossws/index.d.mts:25–62 and index.mjs:29–55; `/websocket` exports separately | [WebSocket adapter](https://orpc.dev/docs/adapters/websocket), [Nitro WS](https://nitro.build/docs/websocket): CrossWS name is **experimental_RPCHandler**, ordered message/close lifecycle is mandatory. Nitro owns listener/upgrades; no evidence of drop-in tRPC client, heartbeat or shutdown parity |
| Curated OpenAPI handler/generator separate; default3.2 with downgrade3.1/3.0 | openapi/dist/index.d.mts/index.mjs and adapters/fetch | [Routing](https://orpc.dev/docs/openapi/routing), [specification](https://orpc.dev/docs/openapi/specification), [handler](https://orpc.dev/docs/openapi/handler): use `.meta(openapi(...))`; `.route` needs extension. Default nested exposure POST; explicit registry and public schemas required. Generator filter does not secure handler; choose common spec version, mount/server prefix and unique IDs intentionally |
| Zod converter peer conflict | zod/package.json:38–44 requires zod>=4.5.0; repository catalog4.4.3 | [Standard Schema](https://orpc.dev/docs/integrations/standard-schema): optional converter conflict is real, but not proof current Zod cannot validate inputs. Upgrade with schema parity or use a verified converter for current schemas; an empty-schema fallback is unacceptable public documentation. Local dependency decision, not blocker for every module's service extraction |
| Existing Redis publisher reuse | current logging/status channels; optional publisher package has redis>=6 peer, repository uses ioredis | [v1 migration](https://orpc.dev/docs/migrations/from-v1): no need to replace pub/sub just to implement generators. New publisher/state transport would be a separate dependency/lifecycle change |

oRPC contracts/services can therefore be migrated directly without Elysia or the temporary tRPC bridge. The endpoint-preservation task does **not** authorize changing DB schema/keys, RPC public-access policy, the auth library or every upstream provider. Nitro v3 exact release/preset remains the runtime owner's decision; existing stack evidence cites `nitro@3.0.260903-beta`, not `nitropack` v2. Read pinned release docs/types rather than using v2 H3 event APIs.

## Module ownership and parallel implementation graph

### Shared boundary to settle once

Proposed naming under the existing API package, not a demand for new packages: `modules/<domain>/{contract,service,router,rest,mcp}.ts`, with client-safe exports separate from server implementations. Existing schema/definition/auth/request-handler packages remain their authorities. A module owns its public DTOs/input normalization/event schemas, authorized business service, oRPC implementation and **local** optional REST/MCP descriptors. It does not edit global app/REST/MCP composition or HTTP-prefix selection. Shared schema files are edited only by their named owner or through an agreed additive contribution, not independently copied by every worker.

Foundation owner publishes a small server-only context/policy interface: request identity/session with expanded permissions, db, device type, trusted external base URL, onboarding claim, optional signal; plus policy capabilities matching public/protected/admin/named permission/onboarding step/demo exceptions. Integration middleware contributes typed authorized/decrypted integration(s) after permission checks; transport callers cannot manufacture trusted integrations. Keep separate constructors for internal RPC, ApiKey-only REST, cookie SSR, ApiKey/Bearer MCP and selected realtime identity. Response cookie mutation belongs to the identity/protocol adapter, not client-safe contract metadata.

Agree a safe domain-error union/data shape and handler status map (including field/domain flattened validation and privacy-preserving NOT_FOUND), output/rich-value conventions, SSR request-local memoization, and identity-scoped Query key policy. This is a small interface freeze, not a prerequisite to rewrite every service. Foundation may reuse current permission constructors and Drizzle/integration services unchanged. Module workers can write contracts and extract reusable services against these types while the full production cookie adapter is being ported; they cannot expose a policy-bypassing live route as a substitute.

### Non-overlapping batches

Counts below reconcile the334 **once**; HTTP files and REST/MCP selections do not add leaves. Every batch can demonstrate a module-local direct server caller/contract and its owned client route after the common context is available, without waiting for all other modules. Future demonstrations/checks require separate execution authorization; none were performed here.

| Batch / exclusive module ownership | Application leaves | Minimal source context and reusable services | Parallel deliverable / independent acceptance |
| --- | ---: | --- | --- |
| F — transport/context foundation, no domain leaf ownership | 0 | trpc.ts/rsc-context/shared/client/server, auth/session/permissions, Query provider, exact beta.43 evidence | Typed request/policy/error/client/SSR adapters, no global module rewrites; enforce per-transport identity and server-only imports |
| D — dashboard/navigation: board26, section1, app10, searchEngine9, home1, bangs1 | 48 | six router families, board/app access helpers, validation schemas, boards updater/context, spotlight/catalog, layouts/settings consumers | Contracts/services/local REST/MCP descriptors; public board read, private denial, scoped search and complete editing/save/layout/home flows |
| A — identity/admin: user26, group15, invite3, apiKeys3, serverSettings6, onboard6, info3, analytics1 | 63 | eight router families, auth providers/adapter/manual cookies, onboarding claims, server/user settings helpers | Authorized contracts plus Auth/onboarding protocol adapters; self/admin/groups/invites/preferences/demo/claim flows and no secret bootstrap. Cooperate with F through the explicit interface, not concurrent edits to it |
| I — integration/utilities: integration20, location1, icon1, updateChecker1, certificates6 | 29 | integration router/middleware/permissions/factory/test/error/redaction, other five router files, existing HTTP/certificate clients | Local contracts/descriptors; full-vs-use/interact/query, decrypt ordering, generic-request limits, native cert/test/upload/query behavior. Widget workers depend on the interface, not completion of all integration CRUD |
| W — native widgets: all46 subrouters /95 leaves | 95 | widgets/index.ts, each assigned leaf file, widget definitions/request handlers/server-prefetch/client component; integration policy interface | Assign disjoint **subrouter** sets, not edits to widgets/index.ts. One local export per subrouter; preserve cache/units/partial failures/public reads/actions. Beszel stream service belongs here, outer realtime mount does not |
| O — operations: docker11, kubernetes11, log1, cronJobs8 | 31 | operations routers, native Docker/Kubernetes services, logging/status Redis channels, task manager, WS host | Authorized procedure services plus three generator implementations, Kubernetes3 MCP wrappers; lifecycle/log/task/stream policy and resource cleanup. Scheduler/runtime shutdown remains one owner's responsibility |
| H — Assistant:19 | 19 | assistant.ts/domain configuration/thread helpers, chat route and adjacent execution/approval/browser-tool/output/error helpers | Local contracts plus retained `/api/assistant/chat` protocol; user-owned threads/model settings/demo writable conversation, approval continuation, UIMessage/abort. Can consume MCP descriptor interface before full external MCP/OAuth mount |
| X — extended: customWidget46 + media3 | 49 | ten Custom Widget spread groups and shared resolver/preview/configuration services, medias router, Custom JSX/Workshop/backup/media HTTP files | Split non-overlapping subgroups if needed: authoring/management, source/secrets/configuration, previews/actions, uploads/backups. Internal contracts plus native HTTP; network sandbox, owner/token/revision/concurrency/legacy/Workshop and binary/restore fidelity |
| P — protocol composition/supporting HTTP, no extra leaf ownership | 0 | curated REST52/MCP133 tables, OAuth/discovery/protocol sources, about/OpenAPI/health/static route ledger | Curated registry adapter, schemas/resources/prompts/safe dispatch/OAuth; supporting response adapters. Module services/descriptors consumed, not independently reimplemented |
| C — **single composition writer** | 0 | existing root.ts, widgets/index.ts, mcp.ts, open-api.ts; Nitro route entry/HTTP prefixes; client registry/export manifests | Own final app router, widget roots, public REST/MCP selections, route precedence, contract/client exports and route registration. Integrate local contributions incrementally; nobody else changes these composition files |

48 +63 +29 +95 +31 +19 +49 = **334**. Within W, existing subrouter names are the exclusive boundaries and the95-row ledger is the assignment checklist. Within X, configuration/preview shared helpers have one named owner even when multiple procedure groups call them. Contract-generation/schema converter changes, root package manifests/exports and global HTTP headers remain single-writer integration decisions; no worker should finish by making competing registry edits.

### Genuine edges versus false blockers

1. **F interface → all module transport implementations**; service extraction/schema/caller inspection can begin in parallel before the runtime mounts exist. Production identity correctness → any authenticated live demonstration, not → authoring every contract. The identity owner must settle database-session/expiry/forwarded-origin/cookie semantics before release.
2. **Integration policy interface → native widget/query/action implementations**. Existing integration factory/permissions/request-handler reuse means W does not wait for ported integration management UI or all provider services. Public-board integration access is shared with D; agree authorization service signature first.
3. **Module local contracts/services/descriptors → C incremental registration**, not every module → every other module. One contribution can be mounted/checked without regenerating or rewriting unrelated domains. C maintains completeness/missing-path accounting until334, REST52 and MCP candidates133 reconcile.
4. **A cookie/Auth adapter → OAuth authorize/onboarding/backup/configuration routes**. OAuth ephemeral-store design and external-origin policy → end-to-end MCP OAuth, not → tool service/catalog extraction. MCP safe authorized dispatch → Assistant tools; Assistant chat framing stays separate.
5. **O/W generator event schemas + realtime identity/transport choice → realtime host/client**. WS-vs-SSE blocks those four stream mounts only. It does not block ordinary JSON procedures, HTTP health/media or REST contract work. Runtime lifecycle owner must pair generator disposal with server shutdown and one scheduler.
6. **Public schema converter/spec-version/status decisions → generated REST specification/MCP schema parity**, not → reuse of server services. Existing schemas can still validate through Standard Schema; do not globally hold the migration for an optional converter upgrade.
7. **Key coverage/runtime restore transaction → backup cross-key acceptance**, not → ordinary media/contracts/Custom JSX editor work. Workshop/docs remote protocols remain stable external dependencies; rewriting those runtimes is a false prerequisite.
8. **Query identity keys/rich hydration → SSR/client acceptance**; module contracts can progress first, but user-private data must never pass through globally cached server callers or unscoped browser caches. Streaming SSR prefetch must finish/cancel rather than hold rendering open forever.

## Open human decisions, gaps and acceptance gates

### Decisions still needed (recommendations above are not approval)

- **Realtime transport/exposure:** keep WS for current three consumers or move them to SSE; whether the full334 router remains callable over WS or becomes subscriptions-only. Decide session expiry/revocation/permission refresh, allowed Origin, reconnect/heartbeat, shutdown and bounded log policy; do not inherit the current expiry gap silently.
- **External compatibility:** internal tRPC clients must change to oRPC together; choose a bounded legacy endpoint/WS compatibility window or intentional break for unknown external tRPC callers. Public REST52 and MCP names/resources/OAuth are separately curated compatibility obligations. No source inventory establishes that there are no external clients.
- **Contract output policy:** adopt accurate explicit output schemas (recommended at public and parallel contract boundaries) versus code-first inference for selected internal leaves while authoring them. Many current I results lack output validators; beta.43 contract-first unknown output cannot masquerade as inferred DTO parity. Retain privacy/null/undefined/Date unions rather than hardening away valid existing results.
- **Public spec authority/version:** recommend one curated oRPC document served at existing `/api/openapi`, common3.1 if combined with Nitro route metadata, deliberate status/coercion/error/void compatibility and Scalar normalization. Decide whether protocol/binary routes are documented alongside REST without implying their contents are ordinary JSON RPC. Nitro wildcard extraction alone is incomplete.
- **Converter and dependency choices:** resolve Zod4.4.3 versus @orpc/zod>=4.5; exact Nitro v3/preset and server/client package boundary. These are local reproducibility/packaging gates, not proof that the chosen stack cannot work.
- **Identity and security changes:** auth library/core adapter choice stays with identity work; retain credential/LDAP/OIDC/database identities while intentionally resolving expired-session/forwarded-origin/CSRF/no-store concerns. Avoid accidental cookie fallback on REST/MCP or broad new credential transport support.
- **OAuth process state:** keep one-process bounded/TTL client/code/pending-auth/rate-limit stores or use shared Redis for multiple workers/restarts; registrations currently disappear on restart, issued API keys do not. Decide durable registration/consent/token lifecycle deliberately, not as collateral of Nitro scaling.
- **Sensitive binary/restore handling:** Node/native assets, file sizes/proxy timeouts/cache semantics, all encrypted-family cross-key conversion and one restore/restart authority. Existing export includes the key; format/security changes need explicit approval and rollback evidence.

### Evidence gaps that must not be presented as compatibility

MCP candidate count is statically reconciled but runtime schema compilation/catalog has not been run. Representative caller anchors include dynamic Docker/MCP/Assistant dispatch; `?` leaves remain capability obligations, not dead-code permission. Current OpenAPI adapter-generated error/void/coercion bodies and implicit HEAD/OPTIONS need a later exact baseline. Browser WS endpoint reachability, proxy buffering/timeouts, multipart parsers, SDK OAuth/resource protocols, custom auth cookies and AbortSignal propagation require actual execution evidence. No performance/RSS/image-size benefit follows from these inventories, and the playable fixture proves only its bounded seam.

### Release acceptance obligations (future, not executed)

1. **Static coverage:** application334=191Q+139M+4S across27 roots; widgets95/46 and Kubernetes11/10; eager MCP204 across29 roots/133 candidates with exact names/descriptions and documented exclusions; REST78 selected/52 explicit operations; HTTP26 files/38 methods plus dynamic Auth/discovery/manifest/assets/action families. Missing paths require an explicit approved disposition, not deletion because no literal caller was found.
2. **Policy/identity matrix:** anonymous public boards/native reads; private view/modify/full plus anti-disclosure; authenticated self/admin/group preferences and owned threads; integration use/interact/full/authorization-before-decrypt; onboarding claim/step/expiry; demo read-only and Assistant exception; expired/revoked sessions/API keys; REST cookie rejection, MCP ApiKey/Bearer precedence and selected realtime identity. Include direct server/SSR callers, not only HTTP guard checks.
3. **Contracts/client behavior:** defaults/transforms/refinements/pagination, output null/undefined/Date units, flattened errors and safe upstream partial results; cache invalidation/optimistic updates/retries/refresh intervals, forbidden clearing/session reset, request-local SSR/hydration/public-safe bootstrap. Verify generated REST path/method/status/query/body/optional-auth/deprecation and schema compatibility with Scalar and existing consumers.
4. **Protocols/lifecycle:** all four streams including subscribe/history race, late Docker setup disposal, queue saturation, reconnect/initial state, revoke/expiry, abort/shutdown; Assistant approval/continue/browser tool/UIMessage/end/error/abort flows; MCP tools/list/call/schema omissions/errors/private cache/admin prompt/resource/template visibility plus OAuth registration/login/PKCE/single-use/resource/discovery/legacy410. Runtime failures must leave no upstream subscription/tool task alive.
5. **Binary/state/assets:** FormData media/certificate limits and bytes, SVG/ETag304/CSP/error headers/proxy statuses, WASM/migration/static dependencies packaged, large backup and same/different key restoration including Assistant/Custom Widget secrets, claim/restore lock/restart. Workshop install/share/auth/upload/files/provider streaming and feed/player functionality continue against unchanged remote protocols.

### Final reconciliation

Final read-only AST-to-Markdown reconciliation found **334 unique registered application paths and334 unique ledger paths, with zero missing or extra paths**, across27 roots. Markdown kind totals independently match191Q/139M/4S; REST table52, MCP table29 roots/133 candidates, HTTP table26 files/38 methods match source registration. No application modules were imported or initialized by these static inspections.

The registered application surface, REST selection, eager MCP candidates and explicit HTTP route files are all enumerated above without adding aliases/external protocols to the334. Source-derived counts are complete **within those registries**; transitive errors, all possible dynamic caller sites, runtime-generated catalogs and compatibility/performance are deliberately not claimed complete. Only `research_notes/Homarr full Nitro migration/endpoints-transports.md` was written; no application execution/probes, installs, tests, builds, lint or typechecks were run. Keep the existing loopback fixture running unchanged for the coordinator's separately authorized acceptance work.
