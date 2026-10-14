# Settings, setup and home native source factories

2026-10-10. Unmounted preparation against accepted `homarr.backend.source-port.v2`, Foundation Bun r2 and policy/crypto v1. Independent review `ses_ed8b79636ffei4KrLh7nofgbB0` found no findings in the **11 native leaves** and accepted them unmounted; **2 identities remain explicitly pending**. The unregistered home-target helper has the narrow source-parity correction below for re-review, not new feature acceptance. No ticket, full home workflow, onboarding, SQL runtime, archive conversion or restore is marked complete. The accepted localization preparation is frozen and untouched.

## Exact dispositions

| Source identity                      | Disposition            | Native resolver and preserved behavior                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serverSettings.getCulture`          | Implemented, unmounted | Explicit public `{defaultLocale}` projection from source codec/default merge, never a raw row/store/key lookup endpoint.                                                                                                                                                                                                          |
| `serverSettings.getAll`              | Implemented, unmounted | Admin-only eight-family decode/default merge; private claim/deployment rows are excluded by the existing family allowlist.                                                                                                                                                                                                        |
| `serverSettings.getBranding`         | Implemented, unmounted | Public source `parseBrandingSettings` projection including legacy login flags; parser strips unknown/internal fields. Source MCP metadata retained.                                                                                                                                                                               |
| `serverSettings.getBoardSettings`    | Implemented, unmounted | Admin-only source board DTO/schema; source REST/MCP metadata retained.                                                                                                                                                                                                                                                            |
| `serverSettings.updateBoardSettings` | Implemented, unmounted | Admin/demo guard, partial source schema, rejects missing/private referenced homes; source read/merge and one update-or-insert write.                                                                                                                                                                                              |
| `serverSettings.saveSettings`        | Implemented, unmounted | Admin/demo guard; actual branding partial/legacy auth merge and final schema; strict analytics consent patch with source five-attempt serialized-value CAS; source generic family read/merge/update for remaining keys.                                                                                                           |
| `onboard.currentStep`                | Implemented, unmounted | Source current/previous normalization including legacy `settings`/`integrations`→`setup`; safe public step pair only.                                                                                                                                                                                                             |
| `onboard.nextStep`                   | **Pending**            | No handler or success stub. Source welcome→user/group/setup update is not installed without accepted conditional step/claim-state transition proof.                                                                                                                                                                               |
| `onboard.testIntegration`            | Implemented, unmounted | Exact public draft validator; source stable ID and secret-kind alternative/optional-secret selection adapted locally; injected raw integration constructor/test effect; returns `{success}`. Claim/admin, current `setup` step and demo guard precede resolver work.                                                              |
| `onboard.detectRuntimeCapabilities`  | Implemented, unmounted | Actual source capability algorithm, disabled Kubernetes distinction, two bounded probes, exact Workshop `/api/health` request and five-second timeouts; precise injected config/remote primitives. Claim/admin and step proof required.                                                                                           |
| `onboard.discoverDockerServices`     | Implemented, unmounted | Actual source discovery controller: hidden/labeled filtering, image candidates and bounded icon SQL, strict icon match, label/image-derived app/integration DTOs, published-port URL logic, host/status/error projections. Only raw discovery effect/pure label helpers/logger are injected. Claim/admin and step proof required. |
| `onboard.completeSetup`              | **Pending**            | No handler, planner completion claim, partial commit or success stub. Atomic setup→finish, app/integration/secret/board/layout/section/item/settings/everyone-home writes and claim deletion await accepted SQL/crypto/state adapters.                                                                                            |
| `home.getStats`                      | Implemented, unmounted | Actual permission-scoped counts/card order and source management predicates, credentials-gated invite card, scoped media and delegated-full integration counts. Every count now uses explicit request `context.db`, not the source module-global DB.                                                                              |

`serverSettingsImplementedPaths`, `onboardImplementedPaths`, `homeImplementedPaths` and corresponding `*PendingPaths` are exported locally. The focused check reconciles their disjoint union to the 13 exact inventory entries, verifies absence of the two pending methods and validates the real nested router identity through the accepted contribution walker. The central port-map/status/index was not changed; **11 is this accepted unmounted batch's count, not a new global total**.

## Files and real functions

Only these allocated source files/directories plus this report were written:

- `packages/api/src/nitro/routers/server-settings.ts`: `createServerSettingsProcedures(resources)` returns the six real native oRPC procedures and exports `ServerSettingsProcedureResources` and exact lists.
- `packages/api/src/nitro/routers/onboard.ts`: `createOnboardProcedures(resources)` returns the four independently ready native procedures, exports `OnboardProcedureResources` and exact lists; no placeholder `nextStep`/`completeSetup` registration.
- `packages/api/src/nitro/routers/home.ts`: `createHomeProcedures(resources)` returns `getStats`; exports `HomeProcedureResources`, `HomeStatistic`, exact lists and the unregistered target resolver below.
- `routers/-settings-setup/settings.ts`: `createSettingsStore` contains actual source SQL/domain helpers (`read`, `readAll`, `update`, `insert`, `updateAnalytics`) and exports concrete `settingsCodec` using the already installed SuperJSON. No whole settings-controller callback is injected.
- `routers/-settings-setup/steps.ts`: actual `normalizeOnboardingStep` and `getOnboardingOrFallback` bodies without importing legacy Next/auth/DB roots.
- `routers/-settings-setup/integration-test.ts`: `stableOnboardingId`, `testSetupIntegration` and typed constructor/log resources; drafts contain all required form secrets, so this path needs no database-secret decryption or ambient encryption key.
- `routers/-settings-setup/capabilities.ts`: `probeRuntimeCapabilities`, source output schema, exact typed primitive resources and bounded timeout algorithm; no default ambient `fetch`, Kubernetes singleton or env lookup.
- `routers/-settings-setup/discovery.ts`: `discoverDockerServices`, `buildSuggestedUrl`, typed source DTOs/effects and actual source icon/query/filter/mapping/controller logic.
- `routers/-settings-setup/home-target.ts`: `createHomeTargetResolver` candidate shared target selector; no extra procedure identity, route or full board renderer is registered.
- `routers/-settings-setup/{tsconfig.json,typecheck.mts}`: isolated own-file compiler check, following the accepted spine's installed TypeScript async-API pattern.
- `packages/api/src/nitro/checks/settings-setup.mts`: focused public setup denial, safe projection and critical home checks through real oRPC `call`/contribution contracts and unchanged SQLite schema definitions. Fixture query objects and effects are test-only, never production resources.

Source comparators were `router/serverSettings.ts`, `router/onboard/{onboard-router,onboard-queries,capability-probes}.ts`, `router/integration/integration-test-connection.ts`, `router/home.ts`, `db/queries/server-setting.ts`, the pure Docker label/discovery helpers and `router/board.ts` home selection/access bodies. Issues #17/#26/#109/#110, `NEXT-WAVE`, `CONTRACTS` and `DESIGN` were read. Actual public validators/defaults/definitions are reused, not replaced by a toy store or a tRPC caller.

## Exact resource and authority contracts

### Common request/spine boundary

All native procedures use the frozen real `sourceProcedure`/`authenticatedProcedure` surface. Request DB, trusted discriminated principal, demo mode, response effects, claim token and trusted `BackendSetupResources` come from `BackendContext`. No principal or admin flag is parsed from request headers, cookies or input. No session engine, JWT, provider default, runtime key or new clock/locale policy is selected; Q16 remains unanswered.

For setup, COMPOSITION must install actual claim validation through `setup.isClaimOnlyAccessAllowed(db, token)` and actual current-step proof through `setup.currentStep(db)`. A token/cookie value alone is never proof. The source spine permits admin-or-claim entry and enforces step for both; a claim remains setup-only and cannot satisfy ordinary authenticated/admin settings procedures. Fixture authorities are explicitly test-only. Factory types do not by themselves prove the host's authority/CSRF/expiry/current-state implementation.

All tables/operators are injected typed references to existing unchanged source schemas/Drizzle operators, paired by the host with the coherent request-scoped DB. No factory imports the ambient DB driver or chooses a physical schema/driver. Held new persistence/transaction adapters are not consumed. Real backed execution and affected-row behavior remain unverified.

### Settings

`SettingsResources`: exact `serverSettings` table, `eq`/`and`, and `codec.parse/stringify` typed from SuperJSON. `ServerSettingsProcedureResources` also supplies exact `boards` and `inArray`. The concrete `settingsCodec` is exported for the host. Source read/write/analytics-CAS bodies are local, not callbacks supplied by a fake business service.

Default merges reuse existing source defaults; no new runtime defaults or locale choice are introduced. Public culture is explicitly projected to its existing declared field instead of leaking unknown stored extensions. Public branding uses the actual public parser. Admin `getAll` conserves the source family allowlist, not arbitrary private setting rows. Remaining generic save families intentionally retain the source record-based validator/merge; this preparation does **not** claim #17's future stricter per-family validation, memoization, invalidation or forms are finished. No additional public setting-access policy is invented.

`updateBoardSettings` uses the source public-board invariant and one SQL write, not a multi-write transaction. Analytics CAS conserves both setting-key and raw serialized-value predicates, exactly five attempts and the two original failure messages. It is code preparation, not two-dialect concurrency acceptance.

### Setup effects

`OnboardProcedureResources` contains:

- `capabilities: RuntimeCapabilityResources`: required `kubernetesEnabled`, explicit already-resolved `workshopApiUrl`, required `fetch` and `getKubernetesVersion(signal)`. The host resolves source `WORKSHOP_API_URL ?? HOMARR_WEBSITE_URL`; the factory does not import/read env or invent a URL. Workshop request format is GET-default `${urlWithoutTrailingSlashes}/api/health`, `Accept: application/json`, abort signal and response-ok check; Kubernetes uses the injected version client's signal and optional `gitVersion`. Source unavailable/disabled DTOs remain intact.
- `discovery: SetupDiscoveryResources`: `icons`, `like`/`or`, exact source `dockerLabels.hide`/`createDockerSourceId` references, raw `listDiscoveredContainers(): Promise<DockerDiscoveryResult>` and `warn(ErrorWithMetadata)`. The DTO and pure helper types are imported type-only from the existing Docker public package, so no singleton/env initializes. Source IDs retain `docker:${encodeURIComponent(host)}:${encodeURIComponent(externalId)}` through the supplied actual helper. The host must bind the real reviewed discovery primitive; this is not an injected final onboarding DTO/controller.
- `integrations: SetupIntegrationClientResources`: exact `createIntegration({id,name,url,kind,externalUrl:null,decryptedSecrets})` returning a raw client with `testConnectionAsync(): Promise<{success:boolean}>`; actual source secret-option handling/stable mapping/validation and `{success}` output are local. `info(message,{integrationName,integrationKind,integrationUrl})` preserves source pre-test and successful-test log events; no secret values enter those log fields.

These are mandatory primitive capabilities, never optional no-op production callbacks. Tests supply deterministic synthetic effects only. Integration execution/trust owners must supply reviewed execution/cancellation/credential-diagnostic joins; no current provider was used here. The source probe timeouts are preserved, not proof of host request-disposal or upstream cancellation.

### Home

`HomeProcedureResources`: twelve exact source count/grant tables, `eq`/`inArray`/`or`, explicitly resolved `credentialsEnabled`, and accepted pure policy-v1 references `snapshotIdentity`/`integrationPermissions`. Effective permissions come from the trusted request principal; membership IDs come from the provided coherent DB, and the policy helper makes an immutable identity copy. The local delegated-integration query/helper is ported; no opaque final stats callback is supplied.

The auxiliary `createHomeTargetResolver(HomeTargetResources)` takes exact user/group/membership/board/settings tables, codec/operators and accepted `snapshotIdentity`/`decideBoardAccess`. It returns an explicit `async (context) => {id,name}` target, not a board DTO. Selection preserves `router/board.ts:getHomeIdBoardAsync` lines 2521–2567: truthy device-specific user home, truthy user desktop home, then **at most one lowest-position non-everyone membership whose selected-device home and desktop home are both non-null**. Only that group's device→desktop truthy values are considered; if both are empty, selection proceeds to everyone's device→desktop truthy values, never to a later group. Instance defaults use **nullish** device→desktop fallback, including for anonymous requests. An empty selected instance device home is not replaced by the desktop home and produces the existing no-home denial. The helper then queries the selected board's current identity/grants, authorizes view with policy v1 and masks missing/private denial as `NOT_FOUND`. Identity/name are reread on each call; no global target/principal cache or raw-header identity exists. An inaccessible selected target is denied rather than silently falling through to a different home.

For anonymous requests, the source instance-only branch is preserved; this preparation does not invent anonymous membership/everyone precedence. Coordinator disposition explicitly preserves the original nullable-vs-empty/one-group semantics, even where a different ordering might seem nicer. The earlier iteration across all groups was not an approved repair: #26 ticket wording is not human authorization to change source behavior. It has been removed. Integrated recovery/full board projection and any future policy repair belong the assigned owners with explicit approval. This helper is not another registered `board.getHomeBoard`, provider cache or full workflow implementation; neither full #15 nor #26 acceptance is claimed. The host still supplies its accepted encoded dynamic route target; no legacy URL alias/route policy is added.

`HomeTargetResources` now imports `decideBoardAccess` and `snapshotPolicyIdentity` type-only from the already declared `@homarr/auth/nitro/policy` entrypoint, which reexports the same accepted definitions. Runtime factory imports do not initialize legacy auth roots or select an auth engine. Tests pass the actual accepted policy functions, not policy stubs.

## Pending adapters — exact stop lines

- **`onboard.nextStep`:** accepted conditional welcome/current-step transition plus claim-state authority/lease proof and trusted provider gating are needed before installing the source welcome→user/group/setup mutation. Its source unconditional update after separately awaited reads is not treated as safe proof. No reseed, fabricated initial user, empty successful transition or coordinator-owned state adapter is added.
- **`onboard.completeSetup`:** requires a reviewed conditional transaction adapter for **both** SQLite's synchronous transaction body and PostgreSQL's asynchronous body, coherent authorized board/selection reads, exact encrypted secret representation/current key resources, source plan/reference/geometry/limits, one affected onboarding row and claim deletion in the same commit. No async callback is awaited inside Bun SQLite's native transaction, because this mutation is not installed at all. No whole original controller callback is injected and counted as a port. Its unchanged `onboardingCompleteSetupSchema` and source planning bodies remain future inputs, not a fake completed planner.

Current SQLite backup conversion remains mandatory, but this lane does not run/import/replace an installation, migrate a real database or claim crypto-envelope/archive compatibility. SQL→crypto/reference→content ordering and exclusive maintenance/recovery remain the persistence/restore owners' joins.

## Dependency/API verification and COMPOSITION requirements

Verified installed `@orpc/server`/`@orpc/client` **2.0.0-beta.43**, Drizzle **0.45.2**, Zod **4.4.3**, SuperJSON **2.2.6**, TypeScript **7.0.2** and Bun **1.4.2**. Existing API manifest already declares the Homarr definition/validation/DB/auth/Docker/core/settings packages plus Zod, SuperJSON and TypeScript. oRPC is installed/declared by the existing Nitro app; its direct API-package dependency is still COMPOSITION's declaration work. The check's Drizzle dependency is currently available through the existing DB dependency; COMPOSITION should make focused tooling dependencies explicit when publishing the final package surface.

Current [oRPC procedure documentation](https://orpc.dev/docs/procedure), installed server builder/`call` declarations and frozen source spine were used. Current [Drizzle update/returning documentation](https://orm.drizzle.team/docs/update) and pinned SQLite update/dialect declarations confirm the actual APIs used. Installed versions outrank newer documentation examples; no latest-beta-only API was adopted. The known exhausted Context7 quota was not queried again.

COMPOSITION alone should declare accepted API subpaths for `createServerSettingsProcedures`, `createOnboardProcedures`, `createHomeProcedures`, `createHomeTargetResolver` and their resource/list types, expose `settingsCodec`/`SettingsResources` if needed, declare direct `@orpc/server@2.0.0-beta.43` dependency, install accepted policy-v1 references/true setup authority, pair exact schema/operator references with the accepted tracked DB and bind reviewed raw remote clients/config/loggers. It owns aggregation/procedure path installation and optional source REST/MCP publication; metadata preservation here is not mounting permission. No manifests/exports/lockfile/global registry/current info/central spine/other routers/app source were changed by this lane.

## Focused checks

```sh
bun --no-env-file packages/api/src/nitro/checks/settings-setup.mts
bun --no-env-file packages/api/src/nitro/routers/-settings-setup/typecheck.mts
/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node packages/api/src/nitro/routers/-settings-setup/typecheck.mts
./node_modules/.bin/oxlint packages/api/src/nitro/routers/server-settings.ts packages/api/src/nitro/routers/onboard.ts packages/api/src/nitro/routers/home.ts packages/api/src/nitro/routers/-settings-setup packages/api/src/nitro/checks/settings-setup.mts
```

Passed:

- 13-path conservation, 11 real native nested contracts and absent pending handlers.
- Anonymous/non-admin/demo denied settings calls; spoofed cookie/token/header setup access and wrong step/completed-step denial; denied calls touch neither fixture DB nor external effects.
- Public culture/branding secret-extension stripping, legacy branding semantics, admin family-only row projection and safe current/previous steps.
- Claimed narrow setup can test/probe/discover with source DTOs; three deterministic synthetic effects, **zero real external calls** and no grant of admin settings access.
- Guest stats expose only board cards; member stats count delegated-full integration grants but not foreign grants; real Drizzle SQL expressions retain public/creator/user/group board filtering and do not query user/invite counts for guests/members.
- User mobile→desktop, source skipping of null mobile/desktop group fields, lowest eligible group only, non-null empty-string group handling, everyone and nullish instance branches; fresh renamed target identity; unchanged private/foreign/revoked grant denial and anonymous public/private behavior through the actual accepted policy functions.
- Scoped compiler diagnostics: **0** under both Bun **1.4.2** and the actual pinned Node **24.18.0** executable; scoped lint exit **0**. The compiler script obtains program/options diagnostics plus syntactic/semantic diagnostics for only the allocated roots, not unrelated concurrent lanes or a whole-repository check. Node does not autoload env files and no env-file flags/setup are used.

This is Bun fixture evidence, not PostgreSQL/Bun-SQLite backed execution or Node production-host acceptance. A preliminary fixture expectation incorrectly used a boolean instead of SQLite's encoded `1`, and the pinned dialect type required its concrete sync class rather than the abstract base; both check-only issues were corrected before the passing run. No broad/unit-matrix/full-repo suite, live provider, paid call, listener/browser/container action or real database was used.

Final integration acceptance still needs actual backed SQL reads/single writes/CAS in both engines, lease/transaction and crypto completion joins, current authority/origin/expiry/session resources, safe host bootstrap/invalidation/route/provider/UI hydration integration and full setup→finish/home/restore workflows. The 11 accepted leaves remain unmounted and uncommitted; no stage/commit/branch/worktree/nested agent/.env/real data or credentials operation occurred. Shared concurrent changes and frozen localization files were not modified.

## Narrow source-parity follow-up

Only `routers/-settings-setup/home-target.ts`, `checks/settings-setup.mts` and this note changed. All 11 accepted procedure bodies/resource interfaces, shared helpers, manifests and central files remain frozen. The helper's resource signature and current-board identity/view check are unchanged.

The existing focused check was first changed to expect everyone when both memberships lack mobile homes; it failed against the old helper (`first-board` instead of `everyone-mobile`). The corrected helper then passed that boundary, lowest-eligible selection, a non-null mobile with null desktop being skipped, empty selected-device truthy fallback to the same group's desktop, an all-empty lowest eligible group going to everyone rather than a later group, and anonymous empty-vs-null instance fallback. Existing current-user homes/private-view denial checks remain unchanged. These are a tiny source-selection boundary inside the existing check, not a new unit matrix.

Follow-up validation passed: existing `bun --no-env-file .../checks/settings-setup.mts`, own `bun --no-env-file .../routers/-settings-setup/typecheck.mts` (zero diagnostics), and lint scoped to the two changed code files (zero warnings/errors). Checks remain synthetic: 13 conserved identities, 11 native leaves, two pending paths, zero denied DB touches and zero real external calls. No actual SQL/PostgreSQL/host/UI/restore or full #15/#26 acceptance is inferred. The three accepted router source-file SHA256 hashes were checked unchanged across this follow-up.

## PUBLIC-HOST-JOIN type-only producer cleanup

Oracle approved this independent mechanical cleanup; the source-exact home correction and all eleven settings/setup/home leaves are accepted and frozen. This follow-up writes only `packages/api/src/nitro/routers/-settings-setup/home-target.ts` and this report, for narrow review rather than ticket closure or host-graph acceptance.

Replaced these two private cross-workspace type edges with one type-only import retaining both original names:

- `../../../../../auth/nitro/policy/resources` -> `@homarr/auth/nitro/policy` (`decideBoardAccess`).
- `../../../../../auth/nitro/policy/identity` -> `@homarr/auth/nitro/policy` (`snapshotPolicyIdentity`).

The existing Auth manifest already declares `./nitro/policy`; its barrel reexports both original definitions. No Auth types, BackendContext, runtime import, resource interface, selection/authorization byte, check, certificate source, manifest/dependency, central map or mount was changed.

SHA256 evidence for `home-target.ts`:

- Before: `aec66a79c5d51c0fdd9dd045e00cb7c7d5b2a350746ae509c174a92137068504`.
- Actual after, matching the precomputed exact import-only substitution: `cf67b51b889d07790367495f614916b13c22964bc1d2aeb1d91d53795e6fe120`.
- Unchanged bytes from `export interface HomeTargetResources` through EOF: `77f555c77c3d29925d7e63bf65f72c84ef5e6a7890833726235925d50ff64a79`.

Validation for this cleanup is limited to the existing settings/setup fixture, existing scoped compiler and lint/format checks of the changed helper. COMPOSITION's evolving runtime graph remains held; no production SQL/admin/session/UI/multipart/transport join or ticket completion is inferred. No tests were added or edited, and no environment/data/network/listener/browser/container/Git/nested-agent operation is part of this follow-up.

Passed: `bun --no-env-file packages/api/src/nitro/checks/settings-setup.mts` (13 conserved identities, 11 native unmounted leaves, two pending paths, zero denied DB touches and zero real external calls); `bun --no-env-file packages/api/src/nitro/routers/-settings-setup/typecheck.mts` (zero diagnostics); scoped `oxlint` and `oxfmt --check` for `home-target.ts` (no lint findings, correct format). The exact whole-file expected hash and unchanged interface/implementation hash were both asserted. This import-only delta is now frozen for narrow review.
