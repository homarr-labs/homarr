# Backend source-port handoff

## Accepted-additions conservation reconciliation — frozen for narrow review

Current recorded status is exactly **73 + 10 + 1 + 1 + 6 = 91 direct-unmounted / 243 pending**. The 91 identities are deduplicated; all **334 unique** source identity/type/owner/REST/MCP tuples remain unchanged and match COVERAGE-LEDGER exactly, including **52 REST / 133 MCP** candidate joins. This is recorded implementation status, not mounted capabilities or whole-feature/ticket closure. Earlier snapshots below are historical.

Only this allocation's three files changed: `packages/api/src/nitro/port-map.ts`, existing `packages/api/src/nitro/checks/security.mts` and this handoff. No producer, router assembly, index, contribution, procedure, context, handler, manifest, export, dependency or lockfile was edited. Original identity bodies and the ten integration bodies remain frozen.

| Accepted addition      | Exact frozen implemented-path export | Runtime-module pointer (`module`)                | Count |
| ---------------------- | ------------------------------------ | ------------------------------------------------ | ----- |
| Integration management | `portedIntegrationManagementPaths`   | `packages/api/src/nitro/routers/integration.ts`  | 10    |
| Icon query             | `iconImplementedPaths`               | `packages/api/src/nitro/routers/icon.ts`         | 1     |
| Media query            | `mediaImplementedPaths`              | `packages/api/src/nitro/routers/media.ts`        | 1     |
| Certificate adapters   | `certificateImplementedPaths`        | `packages/api/src/nitro/routers/certificates.ts` | 6     |

New exact identities: `integration.testConnection`, `integration.getKinds`, `integration.all`, `integration.allThatSupportSearch`, `integration.allOfGivenCategory`, `integration.search`, `integration.byIds`, `integration.byId`, `integration.delete`, `integration.getIntegrationPermissions`; `icon.findIcons`; `media.getPaginated`; `certificates.getCertificate`, `certificates.ensureRootCertificate`, `certificates.addCertificate`, `certificates.trustHostnameMismatch`, `certificates.removeTrustedHostname`, `certificates.removeCertificate`. There are no invented icon/certificate identities. Four integration mutations (`create`, `update`, `saveUserIntegrationPermissions`, `saveGroupIntegrationPermissions`) and two media mutations (`uploadMedia`, `deleteMedia`) remain pending under the same exact source paths.

The map imports only the **types** of those four frozen path-list exports. Each new literal list uses `satisfies typeof <export>` and the enclosing map retains its exact `SourceLeafPath` membership check. The existing literal runtime-module pointers and typed flatten/find algorithm are preserved, including kebab-case `api-keys.ts`, `server-settings.ts`, `search-engine.ts`; no filename is inferred from a camel-case identity. No runtime controller dependency is added to the map.

The existing security check reads those four frozen source files as text and validates their exact literal array declarations, rejecting nonliteral content rather than evaluating code. It deep-compares all fourteen module/list bindings, including the ten previously accepted bindings, against the map. This preserves independent producer-list conservation without eagerly importing the new icon/certificate/integration/media controllers or invoking their runtime graphs. There is no new parser dependency, unsafe cast, registry, dynamic module import or controller instantiation. Existing older list imports are unchanged.

Every source row's pending/direct status and exact module pointer is still checked. Results distinguish **91 recorded / 91 deduplicated** from **six instantiated fixture leaves**: only original `group.getAll`, `group.selectable`, `group.updateGroup`, `info.getInfo`, `info.isDemoMode`, `info.isDemoReadOnly`. The fixture contribution still receives its separate `fixtureLeaves`, never the recorded list. Its renamed-route rejection remains unchanged: `Source procedure route does not match its declared identity`. Existing anonymous/admin/demo denial, direct/Fetch, 404/405, cookie and exact source-ledger checks remain intact.

Validation, all with `env -i PATH="$PATH" HOME="$HOME"` and `bun --no-env-file`:

- Existing `packages/api/src/nitro/checks/security.mts` passed: **91 recorded / 91 unique / six instantiated / 243 pending / 334 conserved / 52 REST / 133 MCP**, zero denied database touches and zero external calls.
- Inline installed TypeScript async compiler invocation with unchanged `nitro/tsconfig.json`, diagnostics restricted to `port-map.ts` and `checks/security.mts`: **two files / zero diagnostics**. No producer or DB Stage G runtime diagnostics were requested.
- Scoped `x --no-install oxlint` on those two files: **zero warnings/errors**; scoped `x --no-install oxfmt --check`: **passed**.

No tests/check files were added, no broad API check or producer/runtime revalidation ran, and no real SQL, current data, credentials, provider/network/browser, app listener/container, installation or git operation was used. Independent acceptance of the integration factories, icon r2 correction, media source `.and` intersection restoration and actual Core certificate adapters is consumed as the user's frozen input, not re-reviewed by this lane. COMPOSITION alone declares ports/dependencies. DB Stage G, home-target type-owner work, production auth/trust/resources and host/REST/MCP joins remain outside this reconciliation; no live SQL or feature completion is claimed.

**All three allocated files are frozen and relinquished for narrow independent review.**

## JOIN-WAVE 73-leaf conservation reconciliation — historical frozen snapshot

The STEP1 recorded status was **73 direct-unmounted actual bodies / 261 pending**, conserving all **334** exact `sourcePortRows` tuples and their **52 REST / 133 MCP** candidate joins. Source identity/type tuples and v2 context/procedure/contribution contracts were unchanged. This and the older six-leaf snapshot below are historical, not the current status total.

| Explicit implementation module                      | Accepted bodies |
| --------------------------------------------------- | --------------- |
| `packages/api/src/nitro/routers/info.ts`            | 3               |
| `packages/api/src/nitro/routers/user.ts`            | 23              |
| `packages/api/src/nitro/routers/group.ts`           | 12              |
| `packages/api/src/nitro/routers/invite.ts`          | 3               |
| `packages/api/src/nitro/routers/api-keys.ts`        | 3               |
| `packages/api/src/nitro/routers/server-settings.ts` | 6               |
| `packages/api/src/nitro/routers/onboard.ts`         | 4               |
| `packages/api/src/nitro/routers/home.ts`            | 1               |
| `packages/api/src/nitro/routers/app.ts`             | 10              |
| `packages/api/src/nitro/routers/search-engine.ts`   | 8               |

Algorithm: `directPortModules` stores explicit literal module-to-leaf bindings copied from independently accepted local factory lists; `satisfies` validates every identity against `SourceLeafPath`. `directPortPaths` flattens only those bindings using the typed `flatMap<SourceLeafPath>` API. `getSourcePortStatus` finds the exact conserved source row, then its explicit containing module, otherwise returns pending. It never derives filenames from camel-case roots, imports factory modules into the map, traverses/assembles routers, creates an exposure registry or uses an unsafe type assertion. The map has no runtime import dependencies, preventing a procedure → map → factory → procedure cycle.

The existing security check reads the accepted factory path-list exports and deep-compares all ten module bindings; it checks every source row's status/module and uniqueness/counts. Its instantiated router remains **only six** group/info procedures with its own explicit `fixtureLeaves`; recorded 73-leaf status is not substituted for that router's contribution leaves. No other factories are instantiated or mounted by this check. Existing route-identity/denial/Fetch/404/405/cookie and ledger assertions remain.

Validation, all with `env -i PATH="$PATH" HOME="$HOME"` and `bun --no-env-file`: existing `checks/security.mts` passed with 73 recorded, six instantiated fixture, 261 pending, 334/52/133 conserved, zero denied DB touches and zero external calls. An inline installed TypeScript async compiler invocation, using existing `nitro/tsconfig.json` and filtering diagnostics to only `port-map.ts` and `checks/security.mts`, reported **two files / zero diagnostics**. Scoped `x --no-install oxlint` and `oxfmt --check` for those exact two files passed. No new test matrix or check/config file was added.

Only `port-map.ts`, `checks/security.mts` and this report changed during STEP1. Accepted identity/settings/apps bodies and lists stayed read-only. No index, procedure, contribution, aggregate router, host, manifest, package export or dependency changed. Factory-list imports in the check are already accepted pure preparation graphs, not permission to consume the deferred API/provider aggregate graph in production. Independent reviews and declarations remain bounded as recorded in CONTRACTS/JOIN-WAVE; actual authority/SQL/host/REST/MCP execution remains unverified.

**STEP1 frozen and spine write ownership relinquished before STEP2 integration-management work.** Future integration bodies must not modify these recorded totals without a separate coordinator allocation/review.

## Original frozen v2 candidate — historical snapshot

Revision **`homarr.backend.source-port.v2`**, unmounted preparatory contribution. This supersedes v1 only to strengthen the contribution's routed-path identity invariant; request/context/procedure shapes and all six resolver bodies are otherwise unchanged. Stop here for coordinator review before allocating disjoint leaf workers. This does not complete #120, #04 or the backend. Original routers, helpers, Next app, central host/registry/manifests and backup-runtime files were not edited.

### Independent review repair

Reviewer `ses_ed8d0fb06ffe4puvIaMS1cmBWE` reported one P2 hold: the contribution walker ignored its actual nested path, allowing `{ info: { renamed: info.getInfo } }` to declare `info.getInfo` while exposing the wrong Fetch path. The review otherwise accepted the base/context/procedure surface and six source-preserving resolver inputs/projections/guards for subsequent disjoint unmounted preparation.

The focused existing security check now calls public `defineBackendContribution` with exactly that renamed router and requires rejection. **Red before implementation:** `env -i PATH="$PATH" HOME="$HOME" bun --no-env-file packages/api/src/nitro/checks/security.mts` exited 1 with `AssertionError: Missing expected exception.` The minimal fix receives the walker's `path` and rejects `path.join(".") !== descriptor.path` before recording the leaf. Existing duplicate, missing, unidentified and nonlazy guards remain intact. No arbitrary API shape, host/mount, manifest/dependency or leaf-port change was made.

**Green:** the same security command passed at v2, including existing canonical direct/Fetch info access, denials, 404/405 and 334/52/133 conservation checks. Scoped typecheck reported 10 files and zero diagnostics; oxlint was clean; oxfmt --check passed all 11 TS/JSON files. Routers were byte-identical before/after: group SHA-256 `5d9067ea81579a0fe58194e781886340b9e3ca395dce87f766f97fa76b8d10cd`, info SHA-256 `17b73add33c7a9a0fcbb21328f881b251792c499083c4953beeabb381e57650d`.

Repair writes only `contribution.ts`, the revision literal in `context.ts`, `checks/security.mts`, the reported revision in `checks/typecheck.mts`, and this report. Six native leaves remain unmounted and 328 remain pending. No next leaf batch was started.

`packages/api/src/nitro/context.ts` declares explicit `Database`, immutable anonymous/authenticated principal, original session-user field types and effective permissions, Request/AbortSignal, device/base URL/onboarding claim, demo flags, injected source setup checks, error-reporting/flattening, response effects and disposal. `createBackendContext` snapshots principal permissions/demo flags; it never initializes SQL, parses credentials or chooses an auth/session engine. Caller supplies source-derived device/base URL/claim values and actual principal. Headers remain on `request.headers`. Setup resources must bind the real `isClaimOnlyOnboardingAccessAllowedAsync` and `getOnboardingOrFallbackAsync` behavior after their runtime adaptation is accepted; there is no permissive fallback.

`procedure.ts` uses installed **@orpc/server 2.0.0-beta.43**, `os.$context`, middleware and metadata plugins. `sourceProcedure` requires an exact inventoried path with its conserved Q/M/S kind. It retains demo-readonly mutation rejection, protected/named-permission rejection and admin-or-claim/current-step checks. `authenticatedProcedure` narrows principal only after guards. Internal and authenticated-demo exceptions are explicit descriptor choices, not global bypasses. These base guards do not replace board/integration/self/owner/kind/source-grant authorization in each remaining resolver.

`errors.ts` maps source TRPCError codes/messages without a tRPC caller/tunnel, preserves safe flattened Zod/domain errors through an explicit injected source FlattenError formatter, flattens oRPC Standard Schema validation issues, and redacts unexpected/internal failure messages. Causes stay server-side. Only source domain handlers may create intentional public ORPCError data. No guessed serializer, error metric or plain-text secret projection was added.

`contribution.ts` keeps local router type inference, verifies actual nested router paths against source metadata and declared leaves, rejects duplicate/missing/unidentified/lazy local leaves, supplies direct `createRouterClient` execution without HTTP, and provides a structural Fetch contribution compatible with the current host request/effect interfaces. No host or global registry is registered here. The candidate wire is POST-only native oRPC under an explicitly supplied prefix, returning API 404/405 rather than SSR fallthrough. Source GET/batch-streaming/OPTIONS replacement and final browser/client adoption still need coordinator disposition. Do not silently mount this as REST/MCP.

Cookie effects are individual values in the same portable discriminated shape as the host, permitting multiple Set-Cookie headers. The host remains responsible for final effect application, failure disposition and request/stream disposal. No NextResponse dependency. Request abort is explicitly available; this does not prove all legacy SQL/upstream work cancels.

## Actually ported source bodies

| Source identity       | Native module      | Conserved behavior                                                                                                                                                                                                   |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group.getAll`        | `routers/group.ts` | Source `group.ts:24–46`: admin guard, Drizzle relational member/user selection and member projection.                                                                                                                |
| `group.selectable`    | `routers/group.ts` | Source `group.ts:133–159`: authenticated access, optional/defaulted withPermissions, permissions only for admins, source field projection.                                                                           |
| `group.updateGroup`   | `routers/group.ts` | Source `group.ts:242–257`, helpers `407–429,440–451`: actual groupUpdateSchema trimming/refinements, existence, reserved name, LIKE-based duplicate exclusion and actual Drizzle update; void result and demo guard. |
| `info.getInfo`        | `routers/info.ts`  | Source `info.ts:7–28`: authenticated void input, version output parser, source GET /api/info REST metadata and enabled MCP description. Version is composition-supplied product version, not a fixed fixture.        |
| `info.isDemoMode`     | `routers/info.ts`  | Source `info.ts:29`: public effective configured demo flag.                                                                                                                                                          |
| `info.isDemoReadOnly` | `routers/info.ts`  | Source `info.ts:30`: public DEMO_MODE && DEMO_READ_ONLY equivalent.                                                                                                                                                  |

Group table/operators are typed source contracts supplied explicitly through `GroupProcedureResources`. No runtime import of the legacy DB/schema/auth/env root occurs. Direct SQL resources must use matching connection/schema/operators from the persistence owner after acceptance; current type-only Database compatibility is a preparation input, not evidence either final engine is integrated. No `createCaller`, router introspection/tRPC resolver proxy, no-op production service or automatically exposed all-leaf catalog is used.

## All-334 conservation map

`port-map.ts:sourcePortRows` explicitly records **334 unique** `(source path, Q/M/S, primary ticket, REST ID, MCP candidate)` tuples from current COVERAGE-LEDGER.md, including factory-generated firewall leaves, all four subscriptions and Kubernetes wrappers' source identities. `SourceLeafPath` is the literal union. The focused check compares every tuple and order against the ledger and independently asserts 52 REST/133 MCP joins. These are source candidate identities, not generated/exposed tools or accepted public schemas.

`directPortPaths` names only the six source bodies above. `getSourcePortStatus` returns `direct-unmounted` with their exact implementation file, or **`pending` for each other 328 leaf**. The map never registers or calls a procedure. All remaining paths retain their original owning ticket and original source body as the conservation reference. Do not substitute counts for completed feature behavior.

Original REST/MCP metadata is separately recorded by `sourceProjectionMeta`; only the actually ported info.getInfo currently has such metadata. No unrelated group endpoint was promoted to REST/MCP. Future projection workers must curate the 52 and 133 boundaries from actual source metadata/catalog membership and must not expose every native internal leaf.

## Validation

- `bun --no-env-file packages/api/src/nitro/checks/typecheck.mts`: uses installed TypeScript 7 async compiler API, requests syntactic/semantic diagnostics only for this directory's root files, and checks project options. No full-repository typecheck. The old TypeScript root API no longer supplies `sys`; its sync API cannot run on Bun's missing stream `_handle`, so the compatible async API is used.
- `bun --no-env-file x --no-install oxlint packages/api/src/nitro` and `oxfmt --check` are scoped to owned files.
- `env -i PATH="$PATH" HOME="$HOME" bun --no-env-file packages/api/src/nitro/checks/security.mts`: one focused authorized policy/Fetch seam check. Synthetic principals and a throw-on-access database spy test anonymous/nonadmin/demo denials without any DB use; this is not fake production authentication or an authorized group SQL success claim. Actual info read works through both the typed server client and native Fetch RPC client. No external network requests: RPCLink fetch is replaced by the local contribution. Check also asserts 404/405, portable individual cookie effects, all 334 exact tuples and 52/133 candidate counts.
- Clean-environment import of `nitro/index.ts` succeeded without application environment or global DB initialization.

Final rerun: **10 scoped TypeScript files, zero diagnostics; oxlint clean; all 11 TS/JSON files formatting-clean; security check passed with 6 native-unmounted leaves, 334 conserved leaves, 52 REST/133 MCP candidates, zero database touches on denied paths and zero external calls.** Freeze requested at this revision. Authorized group SQL success and final production identity were not simulated or claimed.

## Acceptance/dependency needs and missing ports

COMPOSITION must declare **@orpc/server = 2.0.0-beta.43** for @homarr/api and **@orpc/client = 2.0.0-beta.43** for the local check/client surface, and accept/declare the package export. They are already installed and explicitly declared in apps/nitro; this lane did not modify manifests or lock/install. Zod, tRPC error class, source validation/definitions and TypeScript are existing API dependencies. The imported original types remain type-only. Do not consider this API package publicly consumable until these declarations are reviewed.

Accept the exact request/principal/DB/effect/context/contribution revisions before mounting. The auth-engine decision remains pending after Core Credentials/LDAP database-session UnsupportedStrategy evidence. No JWT or fabricated session implementation is supplied. The policy owner's principal-filtered grant/secret APIs are not silently accepted by this preparation lane.

Real authorized group read + update against accepted disposable full-schema SQLite/PostgreSQL resources, actual session/API-key credential precedence, browser consumer/invalidation/rich-value hydration, bounded subscription cleanup, safe public output/schema generation and REST/MCP dispatch remain unverified. Integration/board/source secret checks must execute before decrypt/upstream in their future ports; **all integration/widget/board leaves currently remain pending and unexposed**. Backup restore remains exclusively the backup-runtime and persistence owners' work and mandatory #125 end-to-end gate. Neither #120 nor current-backup compatibility is claimed complete.

Exclusive owned files: `context.ts`, `errors.ts`, `procedure.ts`, `contribution.ts`, `port-map.ts`, `index.ts`, `routers/group.ts`, `routers/info.ts`, `tsconfig.json`, `checks/typecheck.mts`, `checks/security.mts`, all beneath `packages/api/src/nitro/`, and this report.
