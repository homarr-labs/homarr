# Playable lane 32 — existing copied restore proof fixtures

## Exact write inventory

- `packages/db/runtime.spec.ts`
- `packages/db/test/create-legacy-copy-fixture.mjs`
- `packages/api/src/backup-runtime/restore.test.ts`
- `packages/api/src/backup-runtime/create-legacy-fixture.mjs`
- `.scratch/nitro-full-migration/implementation/playable-32.md`

Scope: existing historical46, explicit old49 engine, old49→target50 API preparation and current50 reset/sealed reopen assertions. No production algorithms, schema, auth, manifests, new test files, child agents or Git operations. Explicit old49 DB-engine compatibility is separate from old49 API preparation incompatibility because API preparation unconditionally requires target50 reset.

## Delivered fixture corrections

- `runtime.spec.ts`: current catalog asserts50; oversized ledger asserts65 source rows and exactly51 rows materialized before rejection. Historical46→50 retains its46-entry ledger prefix and all five transformation assertions, awaits real same-copy reset before sealing, and reopens sealed bytes read-only to check ledger/meta/content/empty runtime tables. Its existing case also exercises an explicitly configured authentic49 engine target: migration/content/seal without reset remain supported, with49 unchanged ledger entries and no runtime objects; requesting50-only reset rejects and prevents later seal.
- The existing current50 persistence/reopen case remains a current50 regression, not relabeled upgrade proof. Its genuine current source contains imported runtime rows. Added observations await the actual copied-engine reset, require empty state/history/stream tables and exactly meta IDs1/2 with fresh UUID/null, reject later epoch tampering at seal without retry, preserve every raw domain table plus source bytes, and reopen sealed bytes read-only.
- `test/create-legacy-copy-fixture.mjs`: explicit `historical`/`old49`/`current` modes require46/49/50 journal lengths and actual native ledger counts. Current50 inserts synthetic imported epoch/state/stream/entry rows; earlier modes never fabricate runtime tables.
- `restore.test.ts`: the existing all-family conservation case now runs authentic old49 and distinct current50 inputs. Old49 uses a separately owned49-entry journal and exact copied first49 SQL assets; the target still receives the complete50 bundle. Both retain all **40 families /43 source domain rows /6 cipher columns**, ordinary/noncipher raw values, bcrypt authentication, media, SuperJSON, references, selected-board and source-digest/cleanup assertions. Target ledger preserves the entire original source prefix and asserts the exact accepted `0049_robust_gateway` hash/timestamp/native ID. Same-copy observers delegate to the actual factory/reset/seal and require logout before awaited reset and seal after reset completion. Read-only reopen checks50 entries, fresh private epoch/null and empty runtime data.
- The existing API failure case now observes reset interruption after genuine reset (no sealing or successful preparation, no rollback claim) and post-disposal interruption (`cleanup-failed`, no success). Existing cancellation/same-key corruption/archive/reference cases remain intact. No new test files or extra top-level tests were added; restore still contains its seven existing cases.
- `create-legacy-fixture.mjs`: explicit source version49/50 rejects a mismatched bundle or native ledger. It accepts the current fixture's imported runtime rows only for50, replacing only synthetic migration-default runtime meta inside the fixture population transaction. Domain/default-row exact-match behavior and legacy ZIP generation remain unchanged.

Native fixture inspection corrected an additional genuine assertion error: Drizzle SQLite's authentic `SERIAL` ledger ID is **null**, not an invented autoincrement50. The appended row is asserted as `{ id: null, hash: <exact SQL SHA-256>, created_at: <journal when> }`. Observed accepted SQL hash: `29d003efc340625e9539d5a133508cb98e6e66342934d295855577074643141e`; timestamp `1791712104288`.

## Compatibility boundary

**Explicit49 DB-engine support remains distinct from explicit49 API incompatibility.** API always invokes real reset, which requires the exact50 target. The existing full conservation case additionally observes that an explicit49 API target reaches its genuine49 reset attempt, rejects with sanitized `invalid-database`, never seals and disposes its copy. No fallback, optional/no-op reset, altered producer or claimed old-target API success was added. These are source assertions pending native joined execution, not newly passed engine observations.

## Actual bounded validation

Owned disposable validation root:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-lane32-6mgARI`

Its `source/` contains physically copied, read-only owned files, the exact50 SQLite SQL assets/journal, copied lint config and39 physically independent installed dependency packages. No dependency symlinks, writable shared `node_modules`, environment files, appdata, Git metadata, active lane26 code, listener or application build was copied/used. `evidence/materialization.json` records the initial56-file allowlist/hashes/dependency versions; `evidence/final-owned-hashes.json` supersedes its four owned-file hashes after the native ledger-ID correction and final assertions. No install, registry/provider call or build occurred.

All commands ran from that copied `source/` with only explicit `PATH`, owned `HOME`, owned `TMPDIR`, `CI=true`, `NO_COLOR=1`; no inherited environment. Actual tool identities:

- `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node --version`: exit0, `v24.18.0`.
- `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file --version`: exit0, `1.4.2`.

| Check                                                                                                                      | Actual result                                                                                                                                                            | Raw evidence under `evidence/`                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Node invoking copied `node_modules/oxlint/bin/oxlint` on the four exact owned files                                        | PASS, exit0,0 warnings/errors,197 rules,4 files                                                                                                                          | `lint-final.json`, `.stdout`, `.stderr`                                                                                             |
| Existing DB helper, explicit46 prefix/`historical`                                                                         | PASS, child exit0                                                                                                                                                        | `generator-46.json`, `.stdout`, `.stderr`                                                                                           |
| Existing DB helper, explicit49 prefix/`old49`                                                                              | PASS, child exit0                                                                                                                                                        | `generator-49.json`, `.stdout`, `.stderr`                                                                                           |
| Existing DB helper, full50/`current`                                                                                       | PASS, child exit0                                                                                                                                                        | `generator-50.json`, `.stdout`, `.stderr`                                                                                           |
| Read-only native fixture observations                                                                                      | 46/49/50 entries all match exact packaged SQL hashes/journal timestamps; old46/49 have0 runtime objects;50 has4 tables+1 index, imported data counts1/1/1 and2 meta rows | `native-source-observations.json`, `authentic-target50-final-ledger-row.json`                                                       |
| Existing API generator smoke49/50 using DB-helper rows converted to the existing API fixture's `Uint8Array` representation | PASS, each child exit0; raw source rows preserved and actual ZIP has `db.sqlite`/`metadata.json`                                                                         | `api-generator-uint8-49.json`, `api-generator-uint8-50.json`, corresponding raw outputs and `api-generator-uint8-observations.json` |
| Initial API-generator smoke using Node `Buffer` payload                                                                    | FAIL, each child exit1 in configuration; smoke payload SuperJSON could not deserialize its unknown typed-array name                                                      | `api-generator-49.json`, `api-generator-50.json`, corresponding raw outputs                                                         |
| Focused joined TypeScript checks                                                                                           | BLOCKED / NOT RUN; no invented exit                                                                                                                                      | See dependency stop-line below                                                                                                      |
| Existing copied DB tests and seven restore tests                                                                           | BLOCKED / NOT RUN; no invented test/expect counts                                                                                                                        | See dependency stop-line below                                                                                                      |

The corrected generator smoke is **not** all40/43/6 conservation, decrypt/rekey, reset, seal or product restore proof. Its earlier payload failure was a manual smoke-harness representation mismatch, not a production codec repair; neither fixture generator required a workaround for the real API test's already-correct `Uint8Array` payload. All native smoke clients closed and only this lane's owned synthetic `data/` directory was removed; `evidence/disposal.json` records cleanup. The immutable source/tool closure and raw exits remain for inspection.

## Dependency stop-line and remaining checks

No safe complete engine/TypeScript closure was available independently of active26. `runtime.spec.ts` directly imports `runtime.ts`/`transaction-gate.ts`; API's actual `sqlite.ts` imports the public `@homarr/db` root, which reexports `runtime.ts`, and the five real custom migrations also consume that root. Native execution or transitive type resolution therefore reaches26's mutable files even for a name-filtered test. Those files were neither snapshotted, imported, shimmed, pruned nor treated as accepted. No waits/polls of peers occurred.

After26's exact consumed closure is frozen and independently copied with actual manifests/configuration/dependencies, the remaining existing checks are:

```text
bun --no-env-file test packages/db/runtime.spec.ts --test-name-pattern 'copied '
bun --no-env-file test packages/api/src/backup-runtime/restore.test.ts
node node_modules/typescript/bin/tsc --noEmit -p packages/db/tsconfig.persistence.json
node node_modules/typescript/bin/tsc --noEmit -p packages/api/src/backup-runtime/tsconfig.json
```

These commands were **not executed here**. Scoped compiler evidence, native old49→50 all40 conservation/reset/sealed reopen and the full P3 guard matrix remain outstanding. Existing source failure assertions do not claim native rollback/postcommit/cancellation coverage. Live authorized apply, maintenance/admission/drain/recovery, race, browser and restart remain HOLD. No production algorithms/schema/auth/manifests/lock, protected3100/3200, coordinator3210 process, real environment/data, children, Git or code comments/`any` were touched.

## Reopened validation-only appendix — stopped at materialization

The four reviewed fixture files remained frozen. Lane26 is no longer reported mutable: its published six-file freeze and126-file immutable type-closure inventory were consumed. A fresh copy attempt used:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable32-native-Rixopc`

**Source preflight PASS:**211 exact source/config/SQL/JSON paths were checked before copying, with0 hash mismatches. This included lane26's126-source closure, the four exact reviewed lane32 fixture hashes, preserved P2 source/assets, both complete migration journals/SQL trees, and existing focused DB/API/base compiler configuration. The two accepted J2 changes (`backup-runtime/contracts.ts` and `index.ts`) were classified against the frozen reset-consumer handoff rather than incorrectly requiring their pre-J2 hashes. `evidence/preflight.json` records every admitted path/hash/provenance and an empty mismatch list. The six lane26 files matched its published current closure hashes; no source tail was rejected as mutable26.

**Materialization FAIL, raw shell exit1:** after physical source copying, the workspace-manifest pass attempted a second write to `source/tooling/typescript/package.json`. That identical file had already been copied through the source/config allowlist and marked0444. Node24.18.0 rejected the redundant write with:

```text
Error: EACCES: permission denied, open '<V>/source/tooling/typescript/package.json'
code: 'EACCES'
syscall: 'open'
```

`evidence/materialization-failure.json` records the actual failure phase/code/path and exit1. The copy is **incomplete**, not an accepted dependency/runtime closure. The external-package materialization/final read-only walk had not run. No Bun tests, compiler check, SQL operation or native engine import was dispatched. As requested, execution stopped on this failure; no corrective retry occurred.

| Authorized existing check                                                          | Outcome                                |
| ---------------------------------------------------------------------------------- | -------------------------------------- |
| `bun --no-env-file test packages/db/runtime.spec.ts --test-name-pattern 'copied '` | NOT RUN;0 cases executed, no test exit |
| `bun --no-env-file test packages/api/src/backup-runtime/restore.test.ts`           | NOT RUN;0 cases executed, no test exit |
| DB `tsconfig.persistence.json` no-emit check                                       | NOT RUN; no compiler exit              |
| API `backup-runtime/tsconfig.json` no-emit check                                   | NOT RUN; no compiler exit              |

**Exact fix request — ephemeral materializer only:** deduplicate manifest-copy paths. When a byte-identical real manifest is already present from the source/config allowlist, verify its hash and skip the redundant write rather than writing over an immutable file. Authorize a fresh disposable attempt after this correction. No fixture/source/config/manifest/dependency/DB-algorithm change, assertion weakening, install or SQL retry is requested.

Remaining dependency scope is not claimed resolved: DB's existing compiler roots additionally include `proxy-reader.ts`, `queries/*.ts`, `migrations/{seed,run-seed}.ts`, `migrations/{sqlite,postgresql}/migrate.ts` and `migrations/custom/run-custom.ts`; API's existing compiler include additionally selects `backup-runtime/nitro-join/{contracts,index,lifetime,service}.ts`. Their complete imported type tails were not enumerated or materialized before the setup failure, so this is an explicit discovery/currentness gap, not a finding that those files are mutable or a substituted narrow compiler pass. Actual installed external/type dependencies likewise remain uncopied in this attempt.

Clean `env -i` used explicit Node24.18.0 and filesystem/crypto operations only, with no inherited credentials, environment-file reads, source mutation, installs, builds, browser/listener/ports, Git or children. No target50 conservation/reset/seal/native issuance acceptance follows from the source preflight. All previously retained40/43/6, authentic49 prefix, logout/await/reset/read-only reopen and explicit49 engine/API assertions remain unchanged and unexecuted in this reopened attempt.

### Steering: corrected26 statements freeze required

Materialization was incomplete, so there is no already-complete immutable candidate closure eligible to continue under the steering authorization. No further source reads, tests, typechecks, native imports or mutations were attempted, and the active correction was not consumed or polled.

The preflight/source copy contains the **old candidate** `packages/db/runtime-auth-session/statements.ts` SHA-256 `2c5040dec605f3aa826ae8e5d102522d727747f4799b23476dda4b0f9be7c141`. Its hash match is not acceptance of the independently reported P1 PostgreSQL UTC timestamp-codec, parameter-encoding or SQL/host-clock-skew findings, and is not native issuer proof. No green26 or executed regression result is claimed.

Exact prerequisite for a later accepted-closure run: coordinator-approved corrected freeze of `packages/db/runtime-auth-session/statements.ts`, with its new authoritative SHA-256 and any actual changed consumed-interface/source closure identified. Then use a fresh complete physical immutable materialization with the manifest-path deduplication requested above. The four fixtures and all40/43/6, authentic49→50, logout/await/reset/seal/read-only reopen and explicit49 engine/API assertions remain frozen; no source fix, weakening or mutation retry occurred.

## Accepted26 validation-only reopen — fresh attempt, setup STOP

Read canonical `playable-26-review.md`: bounded PASS for the three P1 source corrections, not native issuer/writer/authentication/mount approval. Consumed the approved126-source inventory at `playable26-p1-final-i76RRY/source-closure.json`. All six current26 hashes matched; corrected `runtime-auth-session/statements.ts` is `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`, other five unchanged. All four reviewed32 fixture hashes matched before discovery and again after the stopped attempt. Neither earlier partial directory was reused.

Fresh owned disposable directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable32-accepted-thtfn3`

### Real configuration/import enumeration

Installed TypeScript7.0.2 metadata discovery used the **unchanged actual two config paths**, all their actual roots and normal package exports, with filesystem-read caching and no semantic diagnostic request. Only physically copied TypeScript tooling was imported; no application module, engine, environment file or auth/data/provider code executed.

| Actual existing config                          | Root files | Compiler source files |
| ----------------------------------------------- | ---------- | --------------------- |
| `packages/db/tsconfig.persistence.json`         | 17         | 6337                  |
| `packages/api/src/backup-runtime/tsconfig.json` | 12         | 1762                  |

`evidence/metadata-discovery.json` enumerates every root/source filename and6933 read source/config/package/declaration inputs with SHA-256. This is broader than the prior211-file candidate: DB seed/query roots genuinely traverse Widget/UI/form/modal/legacy API/auth/integration types; API includes all four actual Nitro-join source files. No roots were pruned, narrowed, shimmed or aliased. `evidence/discovery-currentness.json` rechecked all6933 input bytes: zero changes. This establishes metadata currentness, **not complete freeze admission or a physical executable closure**. External native/runtime package dependency enumeration and copying were not completed.

Independent pure-contract classification: actual `packages/api/src/backup-runtime/contracts.ts` is the unchanged canonical pure entrypoint from reviewed12, SHA-256 `7a9a242530d125ad28bf8f9596ef3d9293ab4c214a4b5fc443e1928745cb54dd`; it has no imports. `apps/nitro/src/features/backup/contracts.ts` was not pulled by either actual config. Lane24's13 source files all matched its final immutable `lane24-review-frozen-qvd7cm6u/source-hashes.json`; recorded in `evidence/lane24-currentness.json`. No discovered source input was under `apps/` or `/nitro/`; no lane27 issuer or lane28 private producer was admitted. Other recursively discovered source provenance remained in classification when setup stopped; no blanket frozen-peer claim is made.

### Actual first failure and stop

The ephemeral materializer implements the authorized duplicate-path rule: an existing copied file must be regular, byte-identical and hash-verified, then its write is skipped; a mismatch throws without chmod/overwrite. **Execution did not reach this copy pass.** Earlier provenance setup assumed lane25's immutable packet contained this original source at a repository-relative path:

```text
Error: ENOENT: no such file or directory, open
'/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane25-frozen-78gotdvy/packages/notifications/src/index.tsx'
code: 'ENOENT'
syscall: 'open'
```

This is a **materializer provenance-path assumption failure**, not a notifications/source/producer regression and not a finding that lane25 is mutable. Actual materialization process and capturing shell both exited1. Raw empty stdout, verbatim stderr/stack, executable/arguments/cwd/clean environment/status are retained in `evidence/materialization.{stdout.log,stderr.log,command.json}`. Stopped immediately: no repair/retry, alternate unverified path, application import or SQL operation followed.

**Exact fix request:** resolve the actual published immutable source location/hash for `packages/notifications/src/index.tsx` from lane25's packet (or its authoritative unchanged-original provenance), rather than assuming that packet's repository-relative directory layout. Finish admission of every remaining enumerated source and actual external/native/type dependency, then complete a separately authorized fresh physical materialization with pre/post hashes. No new26 correction/freeze is requested. Do not substitute fake modules, change manifests/configs/fixtures, prune compiler roots or treat this incomplete copy as runnable.

| Authorized check                                                                        | Actual result                                |
| --------------------------------------------------------------------------------------- | -------------------------------------------- |
| Bun1.4.2 `--no-env-file test packages/db/runtime.spec.ts --test-name-pattern 'copied '` | NOT RUN; no test exit or executed case count |
| Bun1.4.2 `--no-env-file test packages/api/src/backup-runtime/restore.test.ts`           | NOT RUN; no test exit or executed case count |
| Node24.18.0 existing DB no-emit config check                                            | NOT RUN; no compiler exit                    |
| Node24.18.0 existing API backup no-emit config check                                    | NOT RUN; no compiler exit                    |

### Raw identities and cleanup

| Evidence under owned `evidence/` | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `fixed-freeze-preflight.json`    | `05faf9fdfb8e0d676608a6c4310affd7724eb9a47ecf44b5a011e72d762f591f` |
| `metadata-discovery.json`        | `69b9ceebace03f87fb14804c33c4f00c9c289ca30d6e156b25336693a0c54874` |
| `discovery-currentness.json`     | `7dcd896a6c3ee87f043214e2c63beaae1d03e641b813b737c55b54634ebd54e3` |
| `materialization.stdout.log`     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `materialization.stderr.log`     | `37b63e38a3cf24c6d04b5e637bc3678d481b7484f7afaf81afc2668f03499b55` |
| `materialization.command.json`   | `7283f35e721def8dad42c9b1baf7062302a5074b1636d623c6a3286b24f278fc` |

`evidence/stopped-result.json` records all529 physically copied compiler-tool files and their origin/hash, zero symlinks, zero writable copied inputs, exact unchanged fixture hashes, actual failure/exit and cleanup state. Disposable HOME/TMP are empty. No synthetic SQL/data files were created, so none needed disposal; retain owned compiler tooling/raw evidence only, explicitly **incomplete and not accepted for execution**. No existing/protected output or peer data was touched. Commands used `env -i`, explicit Node24.18.0, isolated HOME/TMP and a Node-only PATH; Bun was never launched. No install/build/browser/listener/provider/Git/child agent/source edit/new test occurred.

All40/43/6 conservation, authentic49 prefix→50, logout/await/same-copy reset/seal/read-only reopening and explicit49 engine/API distinctions remain unchanged. Native restore acceptance and all native issuer/writer/auth/mount claims remain outstanding; accepted26 SOURCE and metadata currentness are not substitutes.

## Coordinator-resolved25 reopen — new attempt, external admission STOP

New independent disposable directory, with no application/tool source reused from either partial attempt:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable32-resolved-ePZAtM`

Only the prior recorded6933-input metadata inventory and ephemeral materializer were reused as evidence/control inputs. The materializer's only correction was the explicit approved lane25 provenance mapping; its destination was relocated to this fresh directory. No repository source/config/root/assertion/manifest changed.

### Exact published25 mapping resolved

Read lane25's actual snapshot config/directories and `lane25-p2-frozen-y0spbvvv/p2-source-hashes.json`. All three mapped files are regular physical files, not symlinks; published and current canonical bytes match their authoritative hashes:

| Canonical path                         | Published path under `lane25-frozen-78gotdvy/`     | SHA-256                                                            |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/modals/src/index.tsx`        | `packages/modals/src/index.tsx`                    | `7cbd2288d32d67b685a555206e29e22e50e4f9280ac5bdc2595f68ecb2974eca` |
| `packages/settings/src/context.tsx`    | `packages/settings/src/context.tsx`                | `798def1753a027e886c664dfcfcdeb53446f1edd07eb334e0f3bcd16d637292e` |
| `packages/notifications/src/index.tsx` | `node_modules/@homarr/notifications/src/index.tsx` | `5b5c8dfc5760daaf937b5362e38fe1887d40c8d4d1c72e63d57e1f5d10fbf2e6` |

The first two identities come from published25 unchanged-source metadata; notifications uses the coordinator's independently verified exact snapshot/original identity, not an assumed layout or alternate fallback. `evidence/lane25-mapping.json` retains paths, expected/published/current hashes and regular-file checks.

### Source admission reached; complete dependency closure not reached

The unchanged actual DB/API compiler roots remain17/12 and compiler source inventories6337/1762. Metadata discovery was not rerun or narrowed. The materializer verified all recorded input hashes, admitted the reviewed26/32/24/25/12 and allocated10 identities, classified other original read-only source outside exact wave edit inventories, preserved real package manifests/exports and added existing Bun config, compiler-package config, fixture generators and complete migration-journal SQL assets. `evidence/source-admission.json` records7006 exact source/config/declaration/metadata/asset inputs and classifications. Post-stop recheck of every7006 input found zero changes. All six26 and four32 authoritative hashes still match; corrected statements remain `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`.

**First setup failure: external package identity classification. Actual exit1; no copy pass or authorized check ran.**

```text
Error: Installed package alias requires exact classification:
mantine-react-table -> mantine-react-table-open
```

The materializer's strict package-name equality guard stopped before the external admission inventory/copy pass completed. Read-only follow-up established the exact existing declaration, not a fake new alias:

- Root `package.json` catalog: `mantine-react-table: npm:mantine-react-table-open@9.0.3`.
- Actual consumer `packages/ui/package.json`: `mantine-react-table: catalog:`.
- Installed real package at `node_modules/mantine-react-table`: name `mantine-react-table-open`, version `9.0.3`, manifest SHA-256 `5e5597db8f58e887ba56ca474e9a5427fa47f3b2df5a14fc7fcf50ae99c93c2a`.

**Exact fix request:** explicitly admit this repository-declared npm package identity in the ephemeral external provenance mapping, preserving the existing import/install name `mantine-react-table`, actual package bytes/exports and version9.0.3. Do not add a TypeScript alias, runtime override, facade, renamed manifest or repository edit. A future attempt must still finish every actual external/native/runtime/type dependency, refuse any further mismatch, complete a fresh physical immutable copy, verify pre/post provenance and only then dispatch the four authorized checks. No fallback or corrective retry occurred here.

All four commands remain **NOT RUN**: DB copied-filter Bun test, API restore Bun test, existing DB persistence no-emit config and API backup no-emit config. No test exit/executed case count or compiler exit is reported; setup exit1 is not a failed source/test/producer result. Source/import enumeration is not native regression evidence.

### Raw evidence and cleanup

| Evidence under fresh `evidence/` | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `lane25-mapping.json`            | `6cfb130f3630a2218d5f3cebe254a202717da661eb5a2c54e989c711ee43855e` |
| `source-admission.json`          | `3ca6c1b7e9a54cf8c40c79ec31bf9b31d25c70c30a1f8710cdfe085a409f2b46` |
| `materialization.stdout.log`     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `materialization.stderr.log`     | `6ad76ea53af9c885a04fd1c8e8b96be6ea6814189be5f3bee3cc2ee2dbf01a9f` |
| `materialization.command.json`   | `538658df9e0dd0a963927074c239324a97769b798a01802f7f6ea75932d70251` |

Raw stdout is empty; raw stderr retains the unfiltered error/stack. The command record retains actual executable/arguments/cwd/status and clean environment. `post-currentness.json` stores all7006 post hashes; `stopped-result.json` records the authoritative ten-source checks, exact declared/installed alias provenance, checks dispatched0 and cleanup state. Source/HOME/TMP directories are empty. No SQL/data was created or needed disposal; only owned control/evidence files remain. Node24.18.0 ran under `env -i` with isolated HOME/TMP and a Node-only PATH; its macOS process environment additionally recorded native `__CF_USER_TEXT_ENCODING`, not application settings. Bun1.4.2 was never launched. No application import, semantic compiler check, SQL/commit retry, install/build/listener/browser/provider/Git/child agent/source fix/new test/protected data/output operation occurred.

All40/43/6, authentic49 prefix→50, logout/await/same-copy reset/seal/read-only reopen/conservation and explicit49 engine/API assertions remain byte-frozen. The corrected26 bounded source review is still not native issuer/writer/auth/mount approval; no native proof follows from this setup attempt.

## Approved external-alias reopen — physical copy finished, currentness STOP

New independent directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable32-alias-hagE43`. No prior partial application/dependency copy was reused. Only recorded metadata/provenance and the ephemeral materializer were carried forward. Its sole correction was the explicitly approved existing npm-alias identity; destination was relocated to this fresh directory. No repository source/config/assertion/manifest edit occurred.

### Exact alias and entire external copy inventory

Verified root catalog declaration, actual `bun.lock` catalog/package entries and installed original manifest identity before admission. `mantine-react-table` remains the real import/install name; copied manifest remains `mantine-react-table-open`, version9.0.3, SHA-256 `5e5597db8f58e887ba56ca474e9a5427fa47f3b2df5a14fc7fcf50ae99c93c2a`, unchanged bytes/exports. All other package names retained the strict equality guard. No other alias exception was used.

`evidence/external-admission.json` inventories783 actual installed external/runtime/native/type packages, original physical paths, versions and manifest hashes. The approved alias also records root manifest SHA-256 `ef098f9f1f319d573bc3fdea75955a9ad03b717765df076f1850ee00248b0298` and lock SHA-256 `6ff9b3f25a10d3e22dabdce46c42a17cb906dda4d0da1b4e52d7580acc9b4572`. Package dependencies and installed peers were fully enumerated before copying; physically copied native/compiler packages retain their actual installed executable bytes. No install or lifecycle script ran.

All7006 previously recorded source/config/journal/asset inputs passed the initial hash checks, including authoritative26/32/24/25/12 identities. Actual config roots/inventories remain17/6337 DB and12/1762 API. Physical copying then produced83323 files with exact origin/content SHA-256 in `evidence/materialization.json`. The immutable duplicate-path gate verified and skipped32 byte-identical destinations, with no overwrite/chmod of existing files. Inspection after stopping found zero symlinks and zero writable copied files.

### First failure: two real manifests changed during copying

**Actual materialization and capturing shell exit1 at the post-copy currentness gate.** No application import/check/SQL had run. Raw stderr records:

```text
Error: Post-copy currentness mismatch:
node_modules/@homarr/translation/package.json, packages/translation/package.json,
node_modules/@homarr/ui/package.json, packages/ui/package.json
```

The raw message repeats these four spellings because both the input gate and origin/copy gate detected them; these are two canonical manifests, not eight independent changes. Copied bytes still match the admitted hashes. The canonical current bytes no longer do:

| Canonical manifest, also observed through actual installed workspace path | Captured/copied SHA-256                                            | Current SHA-256                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/translation/package.json`                                       | `758ed4d08de2dece7bd0d5c8921e7b05cde2d0f46ce7a5f6fa4205c1075f198a` | `9493598b61f153699c83b2a01b80fa71dd7fd0616805f264d055e3fbb6f6ce63` |
| `packages/ui/package.json`                                                | `009be1c65d09c5e00729037c69762d6bdc3a985fdf6f3204110b5e8bc35b8292` | `6093e845ced3aaf94804b4f3c3d4d8610273ef2c23351cc9327a5fde9cb9a54d` |

Read-only comparison finds only export additions: Translation `./standalone/dayjs`; UI `./source-views/assistant-workshop/assistant-dot-matrix` and `./source-views/assistant-workshop/contracts`. No mutable package change was silently accepted or copied over the frozen candidate. `post-currentness.json` rechecks all7006 inputs: only these two manifests/four path spellings differ. All six26 and four32 frozen hashes still match exactly, including corrected statements `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`.

**Exact remaining prerequisite:** coordinator must freeze authoritative `packages/{translation,ui}/package.json` identities and approve either the captured historical manifest graph for explicitly old-hash regression evidence or a newly discovered graph for the new manifest hashes. Do not patch this rejected-currentness immutable copy or assume added exports cannot affect the actual closure. No new26/source algorithm correction is requested. No retry/poll or follow-up check occurred.

All four authorized existing tests/typechecks remain **NOT RUN**, with no test/compiler exit or executed case count. This is setup/currentness exit1, not a source/producer/test failure and not native regression proof. The physical-copy inventory completed, but the provenance/currentness acceptance gate did not; no `ready.json` was issued.

### Raw evidence and cleanup

| Evidence under fresh `evidence/` | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `source-admission.json`          | `3ca6c1b7e9a54cf8c40c79ec31bf9b31d25c70c30a1f8710cdfe085a409f2b46` |
| `external-admission.json`        | `6e480427a9839c835f3e53e95a64e0c3ef3bcf7300a719c5429993766911987f` |
| `materialization.json`           | `39cd0fbdb6d586a5abf38e0f4adf9d6b8eb001f973298eac0ce18871f003903b` |
| `materialization.stdout.log`     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `materialization.stderr.log`     | `7ff50ea3ece693ea28494d810c42d5750a4315d62873faa420659162552ae29c` |
| `materialization.command.json`   | `a05ef5d3a8b8a6abacc9e52baa3c686092e7495363e0e0b41689df3b90851fee` |

Raw stdout is empty; stderr/stack/status are unfiltered actual process captures. `stopped-result.json` retains manifest old/current hashes and exact changed export fields, authoritative six26/four32 post hashes, copy/external counts, checks dispatched0 and cleanup. Copied inputs/evidence remain owned disposable artifacts explicitly **rejected for currentness and not authorized for execution**. HOME/TMP are empty; no SQL/data files were created or needed disposal. Commands used `env -i`, explicit Node24.18.0 and isolated HOME/TMP; no Bun invocation, application/native engine import, semantic check, provider, environment-file/data/protected output/port access, build/install/Git/child agent/source fix/new test or SQL mutation/retry occurred. All40/43/6/authentic49→50/logout/await/reset/seal/read-only reopen and explicit49 engine/API assertions remain unchanged and unexecuted. No native issuer/writer/auth/mount acceptance is inferred.

## Coordinator-approved OLD-MANIFEST regression execution — native PASS, types FAIL

**Actual outcome:** existing native SQLite copied tests **4 pass / exit0**; existing API restore tests **7 pass / exit0**, including real old49→50 and current50 conservation/reset/sealed reopen. Existing DB compiler **exit1 /20 diagnostics**; existing API backup compiler **exit1 /1 diagnostic**. This is bounded **OLD-MANIFEST frozen regression evidence**, not current-manifest integration/type readiness or native issuer/writer/authentication/mount approval. No source fixes or retries occurred.

### Separate approval and complete provenance gate

Coordinator explicitly approved the captured physical graph in `playable32-alias-hagE43/source` with old Translation `758ed4d08de2dece7bd0d5c8921e7b05cde2d0f46ce7a5f6fa4205c1075f198a` and old UI `009be1c65d09c5e00729037c69762d6bdc3a985fdf6f3204110b5e8bc35b8292`. New export publications were not treated as equivalent or patched into copied inputs. The prior real materialization exit1 and its logs remain unchanged.

Before any application import or check, a separate filesystem-only gate verified **all83323 actual copied files against the existing materialization hashes**, zero symlinks/writable/unlisted files, all7006 recorded canonical inputs and all783 external package identities. Only the two explicitly approved canonical manifest deltas, also checked through both installed workspace spellings, were accepted as historical identities. No other drift was ignored. `evidence/historical-ready.json` records READY/exit0, exact old/current identities, prior exit1, scope and inventory hashes; it is outside immutable inputs.

All six accepted26 source hashes and all four fixture hashes matched authoritative inventories. Five26 files are actually consumed/copied by these existing configs. `runtime-auth-session.ts`, the issuer factory, is not imported by either existing check graph; its canonical approved hash was verified separately, it was not injected into the frozen graph or represented as exercised native issuer code. Corrected consumed statements remain `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`.

### Four exact authorized checks, actual results

All cwd values are the frozen `playable32-alias-hagE43/source`. Commands use explicit `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun` or `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`, `env -i`, isolated HOME/TMP, Node24.18.0-only PATH and explicit `NO_COLOR=1`. Fixture generators resolve Node24.18.0 from that PATH. Bun reports `v1.4.2 (744846f84)` in both raw outputs; environment-file loading is disabled.

| Existing command, binary shortened here only                                                     | Actual exit/result                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `bun --no-env-file test packages/db/runtime.spec.ts --test-name-pattern 'copied '`               | **0;4 pass,11 filtered out,0 fail,128 expect calls**,1 file,1260ms |
| `bun --no-env-file test packages/api/src/backup-runtime/restore.test.ts`                         | **0;7 pass,0 fail,220 expect calls**,1 file,1.80s                  |
| `node node_modules/typescript/bin/tsc --noEmit -p packages/db/tsconfig.persistence.json`         | **1;20 emitted diagnostic headers**, stderr empty                  |
| `node node_modules/typescript/bin/tsc --noEmit -p packages/api/src/backup-runtime/tsconfig.json` | **1;1 emitted diagnostic header**, stderr empty                    |

Each check's actual binary/args/cwd/environment/status/signal/timestamps and unfiltered stdout/stderr are retained in `evidence/{db,api,db-types,api-types}.{command.json,stdout.log,stderr.log}`. Test cases/counts are extracted from actual Bun output in `historical-final-result.json`. No additional tests, lint/build command, narrowed compiler substitute or source repair was run. Native tests had no failures; the independent final authorized no-emit API check was captured after DB compiler failure without mutation or retry.

### Native copied SQLite evidence now executed

DB's four existing cases cover trigger rejection without rewriting, oversized ledger bounds65/51, historical46 upgrade through the five real content transforms plus explicit49 engine compatibility, and populated current50 migration/reset/sealed reopening without seeding. All unchanged assertions passed, including reset/epoch tampering, authentic prefix/target identity, same-copy sealing and read-only reopening. Explicit49 engine compatibility remains distinct from API preparation's required target50 reset and consequent explicit49 rejection; no distinction was removed.

API's seven existing cases passed. Its all-family case emitted these actual records, not inferred generator results:

| Input                                | Families/rows/cipher columns | Source→target ledger | Same-copy reset before seal | Original digests unchanged / copied directory empty |
| ------------------------------------ | ---------------------------- | -------------------- | --------------------------- | --------------------------------------------------- |
| Authentic old49                      | **40/43/6**                  | **49→50**            | true                        | true/true                                           |
| Current50 with imported runtime rows | **40/43/6**                  | **50→50**            | true                        | true/true                                           |

Old49 source archive SHA-256 `6386fab7fc83dff1e579fcd0176381591070ce974188f7ca9b66693952ea7955`, database `dd4898bc762115ea3e04be0bfedc78e6bfea2752f36dbdc7fb920ab06db6d43a`; current50 archive `4b21e4e725a4186c125f9df4e5544519c09903b025d605f836361d5d888cfd84`, database `381b773cfc4078c9ccec7eaf3a733c8fab6c0536859baad36a6125afa2b2933f`. These identify only this run's disposable synthetic fixtures. The passing unchanged case includes authentic49 prefix/native appended null identity, raw/blob/SuperJSON/ciphertext conservation, logout→awaited same-copy reset→seal, read-only reset metadata/runtime-row checks and failure-path assertions. No live maintenance/apply/recovery or PostgreSQL/auth issuer proof follows.

### Compiler blockers — exact fix requests, not repairs

Three emitted diagnostics are in the frozen owned fixtures:

1. `packages/db/runtime.spec.ts:1073`: expected appended ledger object's `created_at` is inferred `number | undefined` from `journal.entries[49]?.when`, incompatible with `CopiedSqlRow`. A future scoped correction must explicitly narrow the real required journal entry and retain the exact timestamp/hash/null-ID assertion, not weaken it.
2. `packages/db/runtime.spec.ts:1139`: unparameterized SuperJSON `parse` infers an incompatible generic for the `.toEqual(app)` assertion (`Record<string, unknown>` versus inferred `undefined`). A future scoped correction must use the real expected parsed options type/generic and retain equality, without casts or fabricated data.
3. `packages/api/src/backup-runtime/restore.test.ts:475`: `createdCopy` remains `CopiedDatabase | undefined` at `expect(copy).toBe(createdCopy)`. A future scoped correction must establish the actual created-copy value before asserting exact identity; keep logout/reset/await/seal ordering and identity proof unchanged.

DB's other18 emitted headers are not owned fixture findings. They include existing icon API/cron consumer signature mismatches, six Widget/UI incompatibilities (five form/Docker/P3 adoption issues and one Beszel time-period type issue) reported at both real-package and physical-mirror paths, and three missing repository-relative root JSON imports. The latter are **materialization layout limitations**, not proof those imports fail in the original repository: physical `node_modules/@homarr/...` mirrors change where `../../../package.json` or `../../../../package.json` resolves. No config/alias/root JSON shim, manifest rewrite or mirror repair was made. The exact full diagnostics are in `db-types.stdout.log`; do not claim20 independent source defects or a clean original/integrated DB graph. API's sole emitted diagnostic is the owned line475 issue above.

Request bounded authorization for those three genuine fixture typing corrections if wanted; separately resolve original Widget/icon consumer compatibility and faithful compiler package-layout handling before future full type acceptance. **Current integrated types remain HELD.** No automatic source repair, compiler rerun or SQL retry was performed.

### Post-check provenance, cleanup and raw identities

After all four commands, every83323 copied input again matched its materialization SHA-256; file count remained83323, with zero symlinks/writable/unlisted/new output files. All7006 canonical inputs still matched except the same two approved historical manifest identities; no additional source drift occurred. Original fixture/source hashes are unchanged. `historical-final-result.json` records the real test cases, both conservation records, compiler diagnostic headers, statuses and the complete post-gate summary.

Existing tests disposed their synthetic copies: recorded historical/current/API fixture prefixes have no new remaining directories. Both DB boundary cases also passed their awaited `rm/rmdir` finally cleanup. Only an owned Bun transpilation cache was generated under initially empty disposable HOME;140 files were inventoried/hashed and removed from the exact `home/Library/Caches/bun` path. Empty owned parent directories were removed non-recursively. HOME/TMP are now empty; no synthetic SQL files or emitted compiler output remain. Immutable inputs and raw evidence are retained. `historical-cleanup.json` records the owned cache disposal and scope; no shared/protected cache or peer data was read/deleted.

| Evidence under `playable32-alias-hagE43/evidence/` | SHA-256                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `historical-ready.json`                            | `02f9c4b9d6e94daba89b9fc35fe752983ebb31fb13dbd69bc75b2c33c9767929`                                                                      |
| DB raw stdout / stderr                             | `26bde8528a6b2c9b9b2e0220303049f4c715b4a2179b49cdb3c73f34d7705677` / `74fbf0d0b3c31af26bfbadae9559ffbc5a29db34ea40cd0b76cbb9f98d112c29` |
| API raw stdout / stderr                            | `4734c77549d62b3860bd057c3be119401eb5dcb9b5b927c7eb011d95aeeb11e5` / `712e74e65feeaba2bbf69636b3031b141ebacb64d31c10e8a4d7675f8070c1fd` |
| DB / API compiler raw stdout                       | `18a8d08cc5535e46d6c0add43bf5317107f145a6014a2950144efcae72c3a9a0` / `840446a813be0bdf4ba95334579d193471e717c7b8acc54af3013abf37340b95` |
| Both compiler raw stderr, empty                    | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`                                                                      |
| `historical-final-result.json`                     | `01c4e644e2ab5ac7cc8797e3be3f37753d512f8df9dfaf584a668344b228d20d`                                                                      |
| `historical-cleanup.json`                          | `b660eb9cd2a1e8d91e53ace7bdeaa59918cfb21620b5add8d37b478f5f58f1c2`                                                                      |

No immutable input was patched/re-copied. No repository code/config/assertion/test/manifest, real environment/data, protected output/ports, runtime host, provider, install/build/Git or child agent was touched. Earlier setup failures are retained honestly. Native copied restore regressions are now evidenced **only for this approved old-manifest graph**; type acceptance is failed/held, and current integrated, live restore/apply/recovery, native26 issuer/writer/auth and production mounting remain separate gates.
