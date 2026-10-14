# Icon join-wave candidate r2

2026-10-10. Frozen for independent review, unmounted. This is the authorized #115 domain/parser/failure repair and #20 icon-body join only; neither #115 nor #20 is complete. No host contribution, global registry, manifest, schema, migration, media mutation or picker component was changed. Actual atomic SQL apply remains unavailable until the shared adapter and its authority/reference contract are accepted.

## r2 narrow all-source-failure correction

Independent review `ses_ed8d0a9c3ffe0654GKXk9lL9ir` identified a false-success job result at r1 `sync.ts:178`. Exclusive r2 edits are only `packages/icons/src/sync.ts`, `packages/api/src/nitro/checks/icons.mts`, the explicitly authorized icon imports/fixtures/expectations in `packages/cron-jobs/src/runtime.check.ts`, and this handoff. Production delta: one `return` becomes a fixed `throw` when no fetched source succeeded. The accepted pure planner, all parsers, reference-preservation algorithm, API leaf, shared-service composition, job body alias and every other production file are unchanged.

Safe error shape: ordinary `Error`, `name: "Error"`, `message: "Icon synchronization failed: no icon source succeeded"`, no custom code and no `cause`. It does not interpolate source names, URLs, network errors or credentials, and it does not echo underlying failure causes. The existing job runtime catches the shared-body rejection and records `lastExecutionStatus: "error"`; the source control promise still resolves as before. No scheduler/status failure policy was changed.

The all-source failure rejects BEFORE repository/reference reads, planning or atomic apply. The planner still returns `{kind: "unchanged", reason: "no-success"}` when called directly with all failures; no destructive replacement fallback was introduced. Explicit `NO_EXTERNAL_CONNECTION`/`external-disabled` opt-out remains an earlier permitted skip, not a failed job. A `success: true` feed with zero icons counts as a successful source; partial success continues preserving failed-source references.

### Exact red/green evidence

Before the production fix, both commands below were executed against unchanged r1 `sync.ts` and exited 1:

```sh
bun --no-env-file run packages/cron-jobs/src/runtime.check.ts
bun --no-env-file run packages/api/src/nitro/checks/icons.mts
```

The job check first confirmed unchanged plan receipts and the known existing repository, then failed `All six unavailable icon sources must fail the actual iconsUpdater job, not report success`, with actual `"success"` versus expected `"error"`. The direct shared-service check failed `Missing expected rejection`. These exercise the actual reviewed return path, not a fake replacement callback. The review already pinpointed the cause, so no broader diagnostic search/instrumentation or provider matrix was needed.

After the single production-line fix, both commands exit 0. The icon check keeps its three recorded r1 PASS lines; the jobs check reports:

```text
PASS iconsUpdater: all six unavailable fails without replacement; external opt-out and empty success remain successful
PASS critical read shutdown: configuration listing and failed multi-key snapshot drain
PASS critical cleanup errors: original subscription failure and all-consumer error drain
PASS source jobs: persisted controls, restrictions, real bodies, keyed freshness, interrupted repair, async disposal and stop/drain
```

The minimal authorized jobs fixture now uses `IconSynchronizationPlan`, current-source slug identity, authority/reference reads and `atomicApply` with explicit deletion-ID expectations. It invokes the existing actual `iconsUpdater` runtime path. Its in-memory plan receipts are test effects only, NOT a physical atomic adapter. Additional icon expectations check all six failures without replacement, external opt-out and one empty successful local feed while the five remote sources fail. All analytics/ping/status/configuration/shutdown checks and their expectations are byte-identical: reversing only the icon imports/fixtures/expectations reconstructs the exact old r3 check SHA-256 `e0cd4cc055cc377bad55ef6497828045d5d489b64fbbe7df839d6b93045e6fc3`.

Final affected-only validation commands all exit 0 with zero lint/typecheck diagnostics and correct formatting:

```sh
bun --no-env-file run packages/cron-jobs/src/runtime.check.ts
bun --no-env-file run packages/api/src/nitro/checks/icons.mts
bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node,bun --jsx preserve packages/icons/src/sync.ts packages/api/src/nitro/checks/icons.mts packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install oxlint packages/icons/src/sync.ts packages/api/src/nitro/checks/icons.mts packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install oxfmt --check packages/icons/src/sync.ts packages/api/src/nitro/checks/icons.mts packages/cron-jobs/src/runtime.check.ts
```

All executions used explicit disposable fixtures and Bun `--no-env-file`; no upstream, provider, paid effect, current media/SQL runtime/environment/appdata/credentials, app listener, proxy, browser/container, nested agent, installer, manifest, staging/commit or branch/worktree operation occurred. The existing icon check's fresh `:memory:` SQLite fixture is not a live/shared SQL runtime or production adapter.

### r2 freeze and unchanged production evidence

Updated exact fingerprints:

```text
85c11e3d5b1b67a9cc98a29555a402dacdebe809a1d3d234589efe9ee4671f3c  packages/icons/src/sync.ts
a4a804ba06f6967116a78d0bee32c84a9dbdcd0913a38b1f328b13747a1feb1a  packages/api/src/nitro/checks/icons.mts
75ece20aa38cdab6b2a29f1760a6398226fa800dd4ebaf504f336094a62482e7  packages/cron-jobs/src/runtime.check.ts
```

The jobs check is intentionally changed under this turn's authorization; its old r3 fingerprint is historical, NOT an unchanged-file claim. All 15 other r1 candidate source fingerprints still match the r1 table below, including `runtime-bodies.ts`. The four readonly r3 production assets still match `implementation/jobs.md`:

```text
cfdc358b61662c1786d3ad392f87b7728294ae3b1ca8091a1c15530990ece2e1  packages/cron-jobs-core/src/runtime.ts
3c2b1cf7fb8bc8173b1e6bef4e399d8d68e156f504f399b0f6bf02e36c3919f7  packages/cron-job-status/src/runtime.ts
41e4fb40e2d7c084a7090a189e614c82692d0d84f00bdcdc22d564757f2a9761  packages/cron-jobs/src/runtime.ts
fd3def52e8a7112488846a4417fa6f93296df30c3d2c2dd028a95868ea421353  packages/cron-jobs/src/sql.ts
21eabaa8710b4900d789834e90e0c31c404b93c7c43a958b0465fad193bb2317  packages/cron-jobs/src/jobs/runtime-bodies.ts
```

The fifth line is the unchanged r1-authorized icon-body join, not its historical pre-icon r3 hash. No analytics/ping/provider/scheduler/status production source changed in r2. Atomic SQL apply/removals, transaction-bound current authority/reference verification, storage cutover, native host mounting and real form/media save/reload joins remain HELD as described below. The legacy jobs SQL executor was not repaired, relabeled or accepted. r2 is frozen for narrow re-review, not #115/#20 completion.

## Retained r1 implementation and historical evidence

The implementation inventory and remaining resource/host/form holds below remain applicable. Validation/check-readonly statements and hashes explicitly labeled r1 describe that earlier delivery; r2's corrected service/check fingerprints above supersede them.

## Exact delivered boundaries

| Source                                                                  | Functions / contracts                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/icons/src/icons-fetcher.ts`                                   | `iconRepositorySources`, `createIconFetcher`, `fetchIconsAsync`: exactly the existing five remote sources plus local media, injected resources, all-source settlement. No job or IntegrationKind is added.                                                                                       |
| `packages/icons/src/repositories/github.icon-repository.ts`             | `parseGitHubIconIndex`, `GitHubIconRepository`: actual `tree`, `truncated`, `path`, `sha`, optional `size` parser for dashboard-icons, selfhst and SimpleIcons.                                                                                                                                  |
| `packages/icons/src/repositories/jsdelivr.icon-repository.ts`           | `parseJsdelivrIconIndex`, `JsdelivrIconRepository`: actual flat `files`, `name`, `hash`, `size` parser for Papirus and homelab-svg-assets.                                                                                                                                                       |
| `packages/icons/src/repositories/icon-repository.ts`                    | `IconRepository`, `IconRepositoryMetadata`, `IconSourceHttpError`, `readIndexRecord`, `readIndexString`, `readIndexPath`: trusted injected HTTP, bounded streaming JSON read, deadline/body cancellation and private source-error diagnostics.                                                   |
| `packages/icons/src/repositories/local.icon-repository.ts`              | `LocalIconRepository`, `mapMediaToIcon`, `createLocalImageUrl`, `LOCAL_ICON_REPOSITORY_SLUG`: source MD5 over original bytes, unchanged name/size, `/api/user-medias/<media-id>` identity. No global DB import.                                                                                  |
| `packages/icons/src/resources.ts`                                       | `IconSourceClock`, `IconFetchResources`, `LocalIconResources`, `LocalIconMedia`, `IconReadScope`, `IconSqlStatement`.                                                                                                                                                                            |
| `packages/icons/src/sync.ts`                                            | `planIconSynchronization`, `synchronizeIconsAsync`, `FetchedIconRepository`, `StoredIcon`, `StoredIconRepository`, `IconSyncPlanningResult`, `IconSynchronizationPlan`, `IconAtomicApplyResources`, `IconSyncResources`.                                                                         |
| `packages/icons/src/service.ts`                                         | `createIconSynchronizationService`, `IconSynchronizationServiceResources`: owns actual fetch/parser/local-read/reference-read/planner orchestration, returns `jobResources` and `synchronizeAsync`. The caller supplies primitives, not an opaque sync business callback.                        |
| `packages/icons/src/sql.ts`                                             | `readLocalIconMediasAsync`, `readStoredIconRepositoriesAsync`, `readSelectedIconUrlsAsync`, `collectSelectedIconUrls`, `IconReferenceCodec`: current physical SQL tables/columns and injected source SuperJSON codec. No schema replica or production write adapter.                             |
| `packages/icons/src/search.ts`                                          | `findIconsAsync`, `arrangeIconPickerSections`, `getIconRepositoryMetadata`, `isDirectImageUrl`, `isImageSource`, `isSvgImage`; `PublicIcon`, `PublicIconGroup`. Reuses public `@homarr/common` normalization/ranking; directly ports picker grouping/sorting helpers.                            |
| `packages/icons/src/auto-icon-searcher.ts`                              | `getIconForName`: current source name-LIKE/first-result semantics, bound SQLite/PostgreSQL parameter, camel-case stored projection; suppresses missing local media without substituting another media ID.                                                                                        |
| `packages/icons/index.ts`                                               | Startup-safe local public exports for these candidates; no autonomous fetch/DB/env/log initialization. Existing `@homarr/icons/local` still exports the same three pure mapping helpers.                                                                                                         |
| `packages/api/src/nitro/routers/icon.ts`, `routers/-icons/resources.ts` | `createIconProcedures`, `createIconContribution`, `iconImplementedPaths`, `iconPendingPaths`, `iconSourceBindings`, `IconProcedureResources`. One unmounted native leaf.                                                                                                                         |
| `packages/cron-jobs/src/jobs/runtime-bodies.ts`                         | Icon imports/types/body only: `IconsJobResources = IconSyncResources`, `updateIconsAsync = synchronizeIconsAsync`. There is no second fetch or reconciliation loop. The old `IconSyncPlan` shape remains solely for the read-only legacy jobs SQL/check boundary and is NOT the new atomic plan. |
| `packages/api/src/nitro/checks/icons.mts`                               | Explicit disposable critical checks using actual parsers, native SQLite reads and injected failures/cancellation; not a production memory adapter.                                                                                                                                               |

## Source metadata and parsing preserved

The five names/slugs/index URLs/blob templates are copied from source, including the existing Papirus metadata slug `PapirusDevelopmentTeam/papirus-icon-theme` versus indexing/blob `PapirusDevelopmentTeam/papirus_icons`, SimpleIcons' `master` tree and `https://cdn.simpleicons.org/{1}`, and jsDelivr's original leading-slash/double-slash URL substitution. No upstream URL/version migration was invented.

License metadata remains source-declared: dashboard-icons unknown/undefined, selfhst CC0-1.0, SimpleIcons CC0-1.0, Papirus GPL-3.0, homelab-svg-assets MIT, local undefined. `getIconRepositoryMetadata(slug)` provides source name/license/repository URL to domain consumers without replacing a selected URL. These are retained declarations, not live legal/license verification. The source schema has no persisted license column; none was invented.

The original case-sensitive `.png`, `.svg`, `.jpeg` extension allowlist, basename and checksum extraction are retained. Invalid/truncated/oversized/path-unsafe indexes are unavailable, never an authoritative empty catalog. Parsers validate unknown records; HTTP errors include the source rate-limit/retry headers in server-only diagnostic metadata. No automatic retry/fallback fetch was added.

## Authorized failure/reference repair versus r3 source plan

- Before: zero successful groups produced `deleteIcons: {kind: "all"}` and could clear all icons. Now: `no-success` is an unchanged planning result; the service does not read replacement inputs or call apply when every group failed. r2 additionally rejects with the fixed safe error rather than reporting a successful job. The new plan has no all-icons deletion operation.
- Failed but still-listed sources retain their repository and every old icon. Successful sources alone reconcile their icons. Missing repositories retain selected icons/repository IDs; otherwise their old removal behavior remains. No-success never prunes even absent repositories.
- Existing remote checksum matches retain original IDs/names/URLs. Valid selected URLs retain their original rows even if missing from a successful upstream index; selected URLs present with changed checksums do not create another binding. No conversion/rebinding of app/branding/background values occurs.
- Local matching is by the exact media URL, not the MD5 alone. Two identical files with different media IDs remain independently selectable. An authoritative successful local read can remove only the mapping for a missing media; the plan records `missingLocalUrls`, and public queries also suppress that stale mapping. It never points the deleted selection at the surviving same-content file. #113's actual media deletion remains untouched.
- Deletion is by explicit old icon IDs, not retained-checksum predicates that could keep a deleted local alias. The source's N-way batches capped at 5,000 icons remain; the physical adapter must additionally respect engine parameter bounds inside one transaction.
- Cancellation/current-owner checks bracket fetching, state reads, planning and apply. Any observed `external-disabled` source result prevents apply even if the current flag later reopens. Failed reads settle all sibling reads; aborted fetches settle all five bodies and local reads before returning. No detached side-effect queue is introduced.

Selections are URL strings in the actual source app/search-engine/board/branding/options models, not a fabricated foreign key to the icon row. Native reference reads include app/search-engine icons; board logo/favicon/background; legacy/v2 widget icon URLs; branding SuperJSON; item/advanced/section/widget options. Traversal conservatively retains exact URL-like strings and rejects codec/bounds failures. Source URLs and local stored bytes are not mutated. Retaining remote rows cannot prove historical immutable upstream bytes: no such binary artifact is returned or fetched by source, so this candidate makes no remote-content pinning claim.

## One public leaf disposition

`icon.findIcons`: source-port revision `homarr.backend.source-port.v2`, query, public/anonymous, demo `guarded`, original MCP enabled description, no new OpenAPI metadata. Input is the existing `iconsFindSchema` (optional search text, 1–500 per-group limit, default 12). Output is exactly `{ icons: [{ id, slug, icons: [{ id, name, url }] }], countIcons }`; no raw media bytes, size, content type, owner, management permission or checksum is projected.

The public source has no owner/grant restriction on icon projections. This candidate retains that authority rather than exposing a restricted media-management DTO or adding an invented owner filter. SQL uses current `iconRepository`, `icon`, `media` table/column names; no-search ranking limits are per repository, local comes first, SVG comes first, normalized search retains source rank/tie rules, and `countIcons` is the source raw total (not a matched or stale-local-filtered count). License/repository metadata remains available through the domain helper, not an unauthorized change to the existing RPC response shape.

`IconProcedureResources.runReadAsync(context, operation)` must bind a request-isolated migrated/read-ready SQL scope to `context.signal`, reject drain/closed/maintenance/unavailable authority, and keep every launched query owned until settlement. No source procedure/global registration or host listener is changed; COMPOSITION must review and mount the contribution later.

## Primitive resource contract and atomic-apply HOLD

- `IconReadScope`: `dialect: "sqlite" | "postgresql"`; `queryAsync({sql, parameters}) -> Promise<readonly Record<string, unknown>[]>`. Read failures must reject, never return fabricated empty rows. Media binary values must be Uint8Array/Buffer with valid numeric sizes. Neither domain nor router opens a DB.
- `IconFetchResources`: current `noExternalConnection()`, scope/owner `assertCurrentAuthorityAsync(signal)`, trusted cancellable `fetchWithTrustedCertificatesAsync(URL, {signal})`, explicit positive safe-integer maximum-index bytes/files/path length, clock, server-only error reporting. Host trust/SSRF/redirect/CA/redaction rules remain mandatory; these resources may not use a raw fetch bypass. `createDeadline(10000, parentSignal)` must actually enforce the deadline and parent cancellation and dispose its timer/listener. Fixture clocks deliberately use no real timers.
- `IconReferenceCodec`: real source SuperJSON `decode`, explicit serialized-byte and traversal-node bounds. The check uses installed actual SuperJSON, not a plain-JSON production codec. Configuration/default/migration ownership stays with persistence/settings lanes.
- `IconSynchronizationServiceResources`: those resources plus `createId`, logger, `runReadAsync(operation, signal)`, reference codec and REQUIRED `atomicApply`. Constructing the service starts no work. COMPOSITION passes its exact `jobResources` to the existing #20 `iconsUpdater`, retaining source scheduling/restrictions/overlap and runtime ownership.
- `IconAtomicApplyResources`: revision `homarr.icons.atomic-apply.v1`; `applyAsync(plan, {signal, assertCurrentAuthorityAsync, noExternalConnection})`. Plan revision `homarr.icons.replacement.v1` includes explicit deletions/inserts, old authoritative repository/icon snapshot, protected selection URLs and missing-local URLs. The revision is a typed contract identifier, not evidence that an adapter was reviewed.

The pending adapter must verify the expected catalog, latest selected references and still-missing local IDs at the transaction boundary; stale catalog, new selection of a would-be-deleted icon, restored media, cancellation, maintenance or lost scope ownership must reject before publication. It must preserve unchanged rows and never mutate app/board/branding/media selections as a side effect. All deletes/inserts and visibility are atomic. SQLite work must be synchronous inside its native transaction callback; never put awaited work in an async SQLite callback. PostgreSQL must use one checked-out client with rollback/release. The final cancellation/external/owner gate must be coupled to commit/visibility, not merely a check before a sequence of independent statements. A rejected operation must leave the catalog unchanged. Plan comparison/reference locking and both-driver transaction execution require independent acceptance; no implementation of that adapter exists here.

The frozen `createJobsSqlResources().icons.applySyncAsync` is a different legacy checksum/all-delete statement API. It does not meet this new contract and must NOT be relabeled, passed through as `atomicApply`, wrapped in a no-op production memory adapter or mounted. Host synchronization stays HELD pending an accepted physical adapter.

## Manifest and remaining joins for COMPOSITION

No manifests were edited and no installs occurred. Current declared dependencies already supply `@homarr/icons` in API/jobs, `@homarr/common` in icons, `@orpc/server`/Zod/validation/SuperJSON in API, and installed Bun/Node facilities. Icons adds no third-party runtime dependency; SuperJSON stays injected. Existing public `@homarr/icons` and `@homarr/icons/local` exports resolve, as does the currently declared `@homarr/cron-jobs/runtime-bodies` check import. COMPOSITION owns acceptance/export policy; a separate client-only picker subpath may be warranted before frontend consumption because the current root includes Node-only parser/mapping modules.

Required joins, none silently performed:

1. Review the new shared service/atomic plan/resources and connect accepted migrated, scoped #02/#40 resources. Execute real both-driver atomic rollback/cancellation/reference-concurrency checks; validate actual backups/config codecs. This lane's native SQLite read check is NOT shared-adapter acceptance.
2. The r1-requested jobs check icon fixture/resource update is now completed under r2's explicit authorization: `assertCurrentAuthorityAsync`, `readSelectedUrlsAsync`, `atomicApply`, `IconSynchronizationPlan` and explicit IDs replace the old icon-only shape. Scheduler/status/analytics/ping check expectations remain unchanged. This resolves check compatibility, not physical adapter or host acceptance.
3. Legacy `packages/cron-jobs/src/jobs/icons-updater.ts` still calls zero-argument `fetchIconsAsync`, and legacy `packages/api/src/router/app.ts` still expects `getIconForName(...).sync()`. Their readonly legacy roots cannot consume the new explicit resource signatures. COMPOSITION must retire/cut over those source consumers rather than introduce implicit DB/env/network fallbacks. The native app lane's separate injected auto-search also requires review to consume this shared domain function; its readonly files are unchanged.
4. Mount the one icon contribution and actual #20 runtime with the SAME service; retain one backend/listener and source job registry. No sixth job/provider exists.
5. Join #113 media mutations/binary serving and #35/#17/#32 app/branding/background commands/forms. Existing picker UI is not redesigned or wired here. Real selected-reference save/reload/refresh/backup restoration and licence presentation are still pending; helpers/fixture references are not end-to-end form evidence.

## r1 executed validation and limits

Final r1 commands all exited 0; scoped lint/typecheck had zero diagnostics:

```sh
bun --no-env-file run packages/api/src/nitro/checks/icons.mts
bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node,bun --jsx preserve packages/icons/index.ts packages/cron-jobs/src/jobs/runtime-bodies.ts packages/api/src/nitro/routers/icon.ts packages/api/src/nitro/checks/icons.mts
bun --no-env-file x --no-install oxlint packages/icons/src packages/icons/index.ts packages/cron-jobs/src/jobs/runtime-bodies.ts packages/api/src/nitro/routers/icon.ts packages/api/src/nitro/routers/-icons packages/api/src/nitro/checks/icons.mts
bun --no-env-file x --no-install oxfmt --check packages/icons/src packages/icons/index.ts packages/cron-jobs/src/jobs/runtime-bodies.ts packages/api/src/nitro/routers/icon.ts packages/api/src/nitro/routers/-icons packages/api/src/nitro/checks/icons.mts
```

```text
PASS icons: five bounded actual source parsers, failure isolation, licenses and local content identity
PASS icons: native SQLite ranking, groups, selected references, deleted-local non-rebinding and anonymous v2 leaf projection
PASS icons: shared job service, rejected apply unchanged, cancellation, external denial and failed-read settlement
```

The fixture uses a fresh `bun:sqlite` `:memory:` database with only the current named columns required for these reads. Explicit fixture insertion is not production apply. Its atomic apply resource deliberately rejects and confirms unchanged rows; it does NOT prove physical transaction rollback. Cancellation also checks all five response bodies are cancelled while a sibling local read remains owned. No source was fetched live, and no all-upstream/provider matrix was run.

Read-only compatibility diagnostic command:

```sh
bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node,bun --jsx preserve packages/cron-jobs/src/runtime.check.ts
```

At r1 this exited 1 only with TS2353 (`applySyncAsync` not in `IconSyncResources`) and TS7006 (its then-uncontextualized `plan` parameter), both at the old check line 250. The frozen check was not edited in r1 or falsely reported green. R2's authorized icon-only fixture change resolves both diagnostics; current scoped checks above pass. An initial r1 owned typecheck omitted Bun/JSX declarations; the final command above includes installed declarations. One r1 fixture key-order assertion had an incorrectly ordered expected array; corrected to lexical order, with no production change for that failure.

All Bun executions used `--no-env-file`; fixtures supplied configuration/clock/bytes/SQL/effects explicitly. No current environment/appdata/credentials/database, image 3100, real analytics/ping/icon/provider/paid effect, installer, browser/container, nested agent, branch/worktree, staging or commit was used. Context7's docs-only lookup returned its existing quota error; installed declarations and source were inspected instead.

## Historical r1 frozen evidence

At r1 the five readonly r3 runtime/core/status/SQL/check files matched every fingerprint in `implementation/jobs.md` (verified with built-in SHA-256 over file bytes). In r2 the four production files remain unchanged but the explicitly authorized icon-only jobs check has the new fingerprint above. Only r1 icon imports/types/body in runtime-bodies changed; analytics/ping/provider algorithms were not edited. `implementation/jobs.md` itself is readonly and remains historical r3 evidence.

Historical r1 candidate source SHA-256 (r2 supersedes only sync.ts and icons.mts below, plus the separately recorded jobs check):

```text
851185a9e35e8dae267a12b56ab81b5aae8f24d5379f9f9b169f75e2a8aa1817  packages/icons/index.ts
179324bfbde4e133374aaf474828049f42a38eac3370a4f970493335ec25b431  packages/icons/src/auto-icon-searcher.ts
1beedd68064b9c2cb163ba4682276824075566674176e51dcd5b10d9a06d074d  packages/icons/src/icons-fetcher.ts
726e91f8e9e410567333e0445097c29cd9908406c9edd9306d0aecfe1576e001  packages/icons/src/repositories/github.icon-repository.ts
d3358684d688f34ee46eb97a6f9b47107012287a780d13befd8db2fef7fa73f3  packages/icons/src/repositories/icon-repository.ts
574a97f9ffa842fd67338c755f454aa94ee548c1db0608e3d656d9b6dd2b3f7a  packages/icons/src/repositories/jsdelivr.icon-repository.ts
57c3f59c01b0d421d464495215cdf95e787357d650108b596ea3650fa71d4a77  packages/icons/src/repositories/local.icon-repository.ts
55fb836f8eb043475f12aa8231a5b10369955e2e944dd018a790f9ab194d68c2  packages/icons/src/types/repository-icon-group.ts
be67f7595abe42ed4bb350433be3598afcfba52afc2fe96b5041787c58028954  packages/icons/src/resources.ts
c07a12db808e66bd683336774be718b620e0127d57b1a3faf51749e30382280e  packages/icons/src/search.ts
ae051dd58abb7c6e889fd23404cd4bcf823edea9cd674b3c7b4e1f180801fbf8  packages/icons/src/service.ts
2d535c856f3f46bd9d46c0f7238f2ff226219b89df53af5f4e70195738acb7c4  packages/icons/src/sql.ts
e989d0738fa262878185c7ee266b20124bddc3e123433b40555b17bbe2f5a208  packages/icons/src/sync.ts
c95cf5414f7da3a0e25a32bf3e9627d2d01f7dcc51f82ed30aba32172c6ed32e  packages/api/src/nitro/routers/icon.ts
09efac21b1843e7cd76ea16323a6b7a95d90d8794e3238aeaebd68e088401470  packages/api/src/nitro/routers/-icons/resources.ts
384a43be2f82d2c4ae866e406120fd2523180aafc5114271f95f88076347051e  packages/api/src/nitro/checks/icons.mts
21eabaa8710b4900d789834e90e0c31c404b93c7c43a958b0465fad193bb2317  packages/cron-jobs/src/jobs/runtime-bodies.ts
```
