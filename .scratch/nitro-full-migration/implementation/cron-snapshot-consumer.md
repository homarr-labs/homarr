# J1 cron snapshot consumer — frozen for independent review

## Lease and disposition

Oracle's latest exact three-file J1 fix lease is active; all old parent leases remain inactive. Consumes `.scratch/nitro-full-migration/BOUNDED-CONSUMER-JOINS.md` J1 and the explicit configuration-store extraction instruction only. The native 30/2 batch source was reviewed correct; this fix leaves both batches untouched. This is source preparation, not executable composition, native snapshot proof, runtime mounting or #20/#115 completion.

Exact write inventory:

- `packages/cron-jobs/src/sql.ts`: extract the existing configuration store into exported `createJobConfigurationSqlStore(port: Pick<JobsSqlPort, "dialect" | "queryAsync">)`; the full factory uses its returned store. Required snapshot port and 30/2 batches remain unchanged.
- `packages/cron-jobs/src/runtime.check.ts`: the exact existing configuration-only fixture now constructs that named source factory through its actual narrow object capability. No snapshot method/delegate is supplied.
- `.scratch/nitro-full-migration/implementation/cron-snapshot-consumer.md`: this canonical handoff updated, no separate ledger created.

The earlier missing-member edge and the decision not to invent a snapshot forwarder were notified in-session before initial J1 edits. The latest lease explicitly adds this fixture for extraction, not for a snapshot mock. Before fix edits, the in-session notification enumerated the constructor binding, unused transaction member and unused codec argument; query implementation/tasks/assertions were retained.

Dependency inspection: `packages/cron-jobs/package.json` already declares `@homarr/cron-jobs-core` and `@homarr/db`; the existing `@homarr/cron-jobs-core/runtime` import and local body/runtime type imports remain unchanged. No library code, dependency, manifest, export or lock change was introduced.

## Current fix: exact origins and equivalence

Before this fix, `sql.ts` was 335 lines; after source readback it is 350. No fresh hashes, Git diff or executable checks were run. The extracted configuration implementation has one definition, not a replacement controller, SQL engine or registry:

| Pre-fix origin             | Current location                             | Conservation                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql.ts:1–47`              | `1–47`                                       | Imports, scalar/statement types, exact required snapshot port, codec contract and validators untouched.                                                                                                                     |
| `sql.ts:50–52`             | `50–52` inside private `createJobSqlHelpers` | Exact original placeholder/boolean/query closure bodies moved once; both factories use this helper. `query` still invokes `port.queryAsync({ sql, parameters })` as a member on the captured port, preserving its receiver. |
| `sql.ts:54–62`             | `62–70` in `createJobConfigurationSqlStore`  | Actual `decodeConfiguration` body moved unchanged: accepted job names, nullable unknown-name filter, identical cron-expression/string and enabled/boolean decoding/error labels.                                            |
| `sql.ts:64–84`             | `72–92` in the same factory                  | Actual configuration store body moved unchanged; `getAllAsync` query/filter and `updateAsync(name, patch, defaults)` parameter order, SQL, saved-row decoding and error branches are identical.                             |
| Existing enclosing factory | `97–99`                                      | Full `createJobsSqlResources(port, codec)` obtains the same helpers and sets `configuration = createJobConfigurationSqlStore(port)`. The returned resource object's configuration slot is unchanged.                        |
| `sql.ts:86–335`            | `101–350`                                    | Remaining settings/CAS, all analytics collection/materialization, icon batch/materialization/legacy apply, board read and session deletion source untouched by this fix.                                                    |

The configuration factory has only its narrow port, local helpers/decoder/store, and the unchanged module validators/job-name predicate. It has no codec or unavailable outer capture. No connection/admission/disposal ownership changed: it uses the caller's bound query port, as the original closure did. Placeholder formatting remains PostgreSQL `$1/$2/$3` versus SQLite `?`; booleans remain PostgreSQL boolean versus SQLite `Number(value)`.

Configuration read SQL remains exactly:

```sql
SELECT "name", "cron_expression", "is_enabled" FROM "cron_job_configuration"
```

Configuration save SQL remains the source template:

```text
INSERT INTO "cron_job_configuration" ("name", "cron_expression", "is_enabled") VALUES (${parameter(1)}, ${parameter(2)}, ${parameter(3)}) ON CONFLICT ("name") DO UPDATE SET ${updates.join(", ")} RETURNING "name", "cron_expression", "is_enabled"
```

`updates` is still assembled in cron-expression then enabled order only for patch fields that are not `undefined`; empty patches still throw `No cron job configuration changes`. Parameters remain `[name, patch.cronExpression ?? defaults.cronExpression, boolean(patch.isEnabled ?? defaults.isEnabled)]`: these are the **method's actual passed defaults**, not codec defaults. Returned first-row presence, known job-name validation, decoded save output and `Cron job configuration was not persisted` / `Unknown persisted cron job` failures remain the original source branches. No configuration SQL/business logic is duplicated.

### Exact existing fixture changes

- `runtime.check.ts:12` imports `createJobConfigurationSqlStore` instead of `createJobsSqlResources` from the same source module.
- Pre-fix `81–116` construction becomes current `81–104`: `{ configuration: createJobConfigurationSqlStore({ dialect: "sqlite", queryAsync: ... }) }`. This is inferred object capability binding, not a type assertion or unavailable delegate.
- The entire query fixture body at `84–102`, including SQL recording, selected rows, upsert simulation, existing assertion and unexpected-SQL error, remains unchanged at the same locations.
- Remove pre-fix `103–105`'s unused `executeTransactionAsync` throwing member because it is an excess member on the literal passed to the narrow Pick port. It was not used by the configuration store: that source uses only `queryAsync`; the fixture resource's only located consumer was pre-fix `300` → current `288`, still `configuration: sqlResources.configuration`.
- Remove pre-fix `107–115`'s codec argument (JSON decode/type assertion, encode and analytics/board/culture defaults) because the configuration-only factory takes no codec. The original configuration store never referenced it. No new cast is introduced.
- Everything from pre-fix `118` onward is retained with a 12-line location shift; actual tasks, separate analytics/icon fixtures and assertions were not edited. No new tests, assertions, optional snapshot, fake Promise.all snapshot or throwing snapshot stub was added.

The prior fixture's missing-required-snapshot edge is removed by using the actual narrow source factory, not by claiming snapshot support. This is source reasoning only, not a typecheck/regression PASS. All full-factory consumers still require the genuine snapshot method.

## Historical initial J1 inventory

The following inventory records initial J1's 330 → 335-line source change, before the current extraction fix. Its after locations are historical. Current source locations for every statement/materialization below are those after locations **plus 15**; the batches themselves are untouched. These are source-location inventories, not fresh hash-based conservation certificates.

| Before `sql.ts`                                                    | After `sql.ts` | Disposition                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–11 imports/scalars/statement shape                               | 1–11           | Unedited. `JobSqlValue = string \| number \| boolean \| null`; SQL and parameters retain the same types.                                                                                                                                                                                |
| 12–16 `JobsSqlPort`                                                | 12–17          | Add required `querySnapshotAsync(statements: readonly JobSqlStatement[]): Promise<readonly (readonly Record<string, unknown>[])[]>`. Existing dialect/query/transaction members retained. Matches frozen `packages/db/runtime-jobs/types.ts:3–16` structurally; no new producer import. |
| 18–122 codec, validators, configuration/settings/CAS               | 19–123         | Unedited. Independent query helper remains only for these non-batched operations and the other unchanged reads/mutations below.                                                                                                                                                         |
| 123–242 analytics collection                                       | 124–247        | Replace independent dispatch with one ordered 30-statement native batch; decode returned rowsets locally. SQL strings, parameters, count/group meaning, defaults and output keys conserved as mapped below.                                                                             |
| 246–250 icon read dispatch                                         | 251–255        | Replace two independent queries with one ordered two-statement native batch.                                                                                                                                                                                                            |
| 251–265 icon row/repository materialization                        | 256–270        | Unedited. Same IDs/URLs/checksums, field validators and repository membership filtering.                                                                                                                                                                                                |
| 267–310 legacy `applySyncAsync`                                    | 272–315        | Unedited and still unsupported as accepted `atomicApply`. No relabelling or physical cutover.                                                                                                                                                                                           |
| 313–330 resource return, board settings, provider session deletion | 318–335        | Unedited; no mutation/configuration/CAS folded into either snapshot.                                                                                                                                                                                                                    |

Frozen producer/G3, compiler/runtime/limits, actual jobs bodies, scheduler/status, icon service/planner/selected-reference reads and all parent-plan sources received no writes. No budget, epoch, authority, cancellation, deadline, transaction or native snapshot implementation was added to this consumer.

## Ordered analytics mapping: exactly 30 statements

Positions below are one-based batch positions; `sql.ts` destructuring uses that same order. Before/after columns record initial J1 statement construction locations; current after locations are **plus 15** (analytics collection now `139–262`, snapshot call `180–214`). `p1` is the unchanged `parameter(1)` (`?` SQLite, `$1` PostgreSQL). Every count has the exact source form `SELECT count(*) AS "count" FROM "<table>"`, with only the indicated source WHERE clauses. Empty parameters remain `[]`; boolean parameters still use `boolean(value)` (numeric SQLite, boolean PostgreSQL).

| Position | Before line | After line | Statement/source parameters                                                              | Decoded destination                |
| -------- | ----------- | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| 1        | 137 → 86    | 166        | `SELECT "value" FROM "serverSetting" WHERE "setting_key" = p1`, `["culture"]`            | `cultureSettings.defaultLocale`    |
| 2        | 138 → 86    | 167        | Same settings SQL, `["board"]`                                                           | `boardSettings.forceDisableStatus` |
| 3        | 140         | 168        | count `board`, `[]`                                                                      | `countBoards`                      |
| 4        | 141         | 169        | count `board` WHERE `"is_public" = p1`, `[boolean(true)]`                                | `countPublicBoards`                |
| 5        | 142         | 170        | count `board` WHERE `"disable_status" = p1`, `[boolean(false)]`                          | `countBoardsWithStatusEnabled`     |
| 6        | 143         | 171        | count `group`, `[]`                                                                      | `countGroups`                      |
| 7        | 144         | 172        | count `app`, `[]`                                                                        | `countApps`                        |
| 8        | 145         | 173        | count `section`, `[]`                                                                    | `countSections`                    |
| 9        | 146         | 174        | count `search_engine`, `[]`                                                              | `countSearchEngines`               |
| 10       | 147         | 175        | count `iconRepository`, `[]`                                                             | `countIconRepositories`            |
| 11       | 148         | 176        | count `icon`, `[]`                                                                       | `countIcons`                       |
| 12       | 149         | 177        | count `layout`, `[]`                                                                     | `countLayouts`                     |
| 13       | 150         | 178        | count `item_layout`, `[]`                                                                | `countItemLayouts`                 |
| 14       | 151         | 179        | count `section_layout`, `[]`                                                             | `countSectionLayouts`              |
| 15       | 152         | 180        | count `cron_job_configuration`, `[]`                                                     | `countCronJobConfigs`              |
| 16       | 153         | 181        | count `custom_widget_v2_definition`, `[]`                                                | `countCustomWidgets`               |
| 17       | 154         | 182        | count `trusted_certificate_hostname`, `[]`                                               | `countTrustedCertificates`         |
| 18       | 155         | 183        | count `user`, `[]`                                                                       | `countUsers`                       |
| 19       | 156         | 184        | count `apiKey`, `[]`                                                                     | `countApiKeys`                     |
| 20       | 157         | 185        | count `invite`, `[]`                                                                     | `countInvites`                     |
| 21       | 158         | 186        | count `media`, `[]`                                                                      | `countMedias`                      |
| 22       | 159         | 187        | count `session`, `[]`                                                                    | `countSessions`                    |
| 23       | 160         | 188        | count `account`, `[]`                                                                    | `countAccounts`                    |
| 24       | 163         | 189        | `SELECT "kind", count("id") AS "count" FROM "integration" GROUP BY "kind"`, `[]`         | `integrationKinds`                 |
| 25       | 164         | 190        | `SELECT "kind", count("id") AS "count" FROM "item" GROUP BY "kind"`, `[]`                | `widgetKinds`                      |
| 26       | 165         | 191        | `SELECT "kind", count(DISTINCT "board_id") AS "count" FROM "item" GROUP BY "kind"`, `[]` | `boardsWithWidgetKinds`            |
| 27       | 167         | 193        | Integration/item join SQL below, `[]`                                                    | `boardsWithIntegrationKinds`       |
| 28       | 169         | 196        | `SELECT "role" AS "kind", count("id") AS "count" FROM "layout" GROUP BY "role"`, `[]`    | `layoutRoleCounts`                 |
| 29       | 170         | 197        | `SELECT "kind", count("id") AS "count" FROM "section" GROUP BY "kind"`, `[]`             | `sectionKindCounts`                |
| 30       | 172         | 198        | `SELECT "board_id", count("id") AS "count" FROM "item" GROUP BY "board_id"`, `[]`        | `boardItemCounts`                  |

Position 27 is preserved literally:

```sql
SELECT "integration"."kind" AS "kind", count(DISTINCT "item"."board_id") AS "count" FROM "integration_item" INNER JOIN "integration" ON "integration_item"."integration_id" = "integration"."id" INNER JOIN "item" ON "integration_item"."item_id" = "item"."id" GROUP BY "integration"."kind"
```

One `await port.querySnapshotAsync([...])` supplies all 30 rowsets. Settings still take the first row, validate `value` with the `"server setting"` error input, decode with the same codec and overlay decoded fields onto culture/board defaults. Missing settings rows use defaults. Counts still read the first row's `count`, allow numeric strings, and reject unsafe/negative/noninteger/missing counts with `Invalid SQL count`; no counts are replaced with zero. Group kind/count and board ID/count validators retain their original field labels and row ordering. No count aggregation, distinct meaning, normalization or unit change is introduced.

Readonly result rows are fully materialized into the same snapshot fields after the native batch settles. Destructured rowset defaults are empty arrays, not independent-query fallbacks; the genuine producer is responsible for returning one rowset per statement. This change does not prove producer cardinality or snapshot guarantees. Consent checks, process-local coalescing, send behavior, settings retries/CAS, instance IDs and timestamps in the frozen actual analytics body remain separate and unchanged.

## Ordered icon mapping: exactly two statements

The after column is initial J1's location; current statements are `268–269`, with the unchanged snapshot call at `267–270`.

| Position | Before line | After line | Exact SQL                                                                  | Parameters |
| -------- | ----------- | ---------- | -------------------------------------------------------------------------- | ---------- |
| 1        | 248         | 253        | `SELECT "id", "slug" FROM "iconRepository"`                                | `[]`       |
| 2        | 249         | 254        | `SELECT "id", "checksum", "name", "url", "icon_repository_id" FROM "icon"` | `[]`       |

One native `querySnapshotAsync` call returns repository and icon rowsets. The existing icon decoding and per-repository filtering are unchanged. This two-query join does **not** add selected-reference/media reads to that snapshot and does not accept the legacy executor as `IconAtomicApplyResources`; transaction-time catalog/reference/current-authority verification and accepted physical atomic apply remain held.

## Compilation edges and stop lines

- Initial repository source searches located this module and the fixture's former full-factory construction; that fixture now uses exported `createJobConfigurationSqlStore` instead. No host construction was located in that search; this is not executable composition proof.
- Frozen `RuntimeJobsSqlPort` already has the exact required member and scalar/statement/result structure. Direct genuine producer assignment is source-structurally compatible; it was not compiled, imported or executed here.
- The existing check now binds only the actual configuration capability through the source factory above. Its separate analytics/icon runtime fixtures still bypass SQL snapshot collection and do not establish native coverage. No delegate is invented and no snapshot requirement is weakened on the full factory. Compilation remains unexecuted, so this source-level removal of the known missing-member edge is not a compiler PASS.
- Other host adapters must supply the genuine required method; no optional member, downgrade, independent-query fallback, consumer SQL transaction wrapper or custom epoch/budget shim is acceptable. Producer admission/limits/captured epoch/timing and the accepted PostgreSQL bounded snapshot belong to their frozen owner. SQLite producer behavior is unchanged by this patch.

## Remaining proof after convergence

Independent rereview must verify this exact extraction, bound-port/configuration decoding/save equivalence, fixture source-factory binding and enumerated removals, plus conservation of the already reviewed required port and 30/2 batch bodies. No additional write lease is implied by review.

Still required under a subsequent explicit execution lease: compiler confirmation of the narrow fixture/full-host capability joins, integrated scoped lint/typecheck/format, relevant existing jobs and consumer conservation/regression checks, genuine producer/native snapshot/isolation/current-authority/cancellation checks, and full-graph executable composition using the real bounded resource owner. Source acceptance is not a fresh native repeatability, deadline/epoch, database or restart certificate. No new tests/assertions/mocks were added; no checks, lint/types/build, imports/evaluation, install, SQL, provider/network/browser/environment/credential/current-data access, listener, Git operation or nested agent was run for J1 or this fix. Exactly the three leased files were patched; source is frozen on return.
