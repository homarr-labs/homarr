# Fifth artifact — static packaging evidence

## Result and review boundary

**Static evidence collected; ready for independent read-only packaging/import/relocation review, not STATIC ACCEPT.** Fifth compiler whole-command status remains **0**. Complete recorded input/source/tool/asset/protected-output/evidence conservation passed before measurement and after it; the emitted artifact's complete inventory also remained unchanged. No compiler retry or generated program evaluation occurred.

`TEMP` means `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`. Attempt: `TEMP/nitro-artifact-fifth-lrmee1zm`. All artifact paths below are relative to its **`build-work/artifact`**. New evidence is under its **`records`** directory. The accepted fourth packaging inspection's finite filesystem/package/migration/literal-reference/native-header method was reused with the newly authorized raw-byte collector; no new framework, resolver or application probe was introduced.

Independent owner review must decide actual ESM/SSR/MAIN ownership and reached contexts. This lane supplies byte/layout/text facts only. Full hermetic import closure, effective Bun export/native branches, runtime K/D, hydration, CLI behavior, musl/Node/PG compatibility, boot, credential-file/adoption/data and production acceptance remain unproved or held.

## Frozen artifact inventory

**614 regular files; 48,680,747 regular bytes; 54 directories including the artifact root (53 descendants).** Every regular file has one link; no symlink, special file or shared hardlink group was found. All entries are on device16777232. Directories are physical, not linked ancestors. Full relative names, types, directory member lists, modes/ownership, device/inode/link count, raw sizes/SHA256 and modification timestamps are retained in `packaging-artifact-inventory.json`. No artifact permission or payload was changed.

| Owning subtree    | Regular files | Regular bytes | Directories |
| ----------------- | ------------: | ------------: | ----------: |
| `server`          |           175 |    17,779,176 |          25 |
| `public`          |           276 |    16,159,478 |           8 |
| `db`              |           144 |     8,952,734 |           7 |
| `cli`             |            17 |     5,786,290 |          12 |
| `scripts`         |             1 |         2,739 |           1 |
| Root `nitro.json` |             1 |           330 |           — |

Artifact byte-inventory witness: **`b8f0ffb60529ff258e2e6f3522cc7c8c850d384fcde709f3092921075dc514ce`**. Definition: SHA256 of sorted UTF8 `relative-path<TAB>decimal-size<TAB>file-SHA256<LF>` rows. It is a measured inventory, not publisher provenance or immutable-storage proof.

Actual entry coordinates are `server/index.mjs` (73,492 bytes), **`cli/cli.cjs`** (4,776,438), `db/migration-runners/sqlite.cjs` (3,268,956), `db/migration-runners/postgresql.cjs` (1,783,237) and `scripts/migrate-nitro.mjs` (2,739). No CLI `index` name is substituted.

## Migration roots and wrapper

`packaging-migration-proof.json` compares names/raw sizes/SHA directly against the independently retained `TEMP/nitro-credential-assets-d4axMeII/whole-source-asset-pins.json`, **34,986 bytes**, SHA **`a675179f6c33bf71c4fc4318da73299e2345eaa4a49b90854260fb9fe9c8d868`**. No artifact-derived authority replaced it.

| Root                       | SQL | Meta JSON | Total regular files | Raw bytes | Missing/extra/byte mismatch | Journal tail / runtime anchor |
| -------------------------- | --: | --------: | ------------------: | --------: | --------------------------- | ----------------------------- |
| `db/migrations/sqlite`     |  51 |        52 |                 103 | 2,639,778 | 0 / 0 / 0                   | 50 / 49                       |
| `db/migrations/postgresql` |  19 |        20 |                  39 | 1,260,763 | 0 / 0 / 0                   | 18 / 17                       |

These roots contain only the exact SQL and meta snapshot/journal names, no executable source/helper/runner or hidden extra. The sibling migration-runners directory contains exactly **sqlite.cjs/postgresql.cjs**. Full artifact inventory establishes regular/nonlink types, not merely matching filenames.

The emitted wrapper retains literal artifact-local `new URL(..., import.meta.url)` coordinates at lines40/50/59/67 for both runners and both asset roots. Each target exists under the artifact. The joins remain independent of cwd at the literal URL level. Bun-only, accepted activation, non-skippable migrations and explicit dialect/driver/database guards are visible; none was executed. The wrapper's future DB file checks or SQL operations are not authorized here.

## CLI-local packages, prebuilds and historical context

The actual CLI retains `require("bcrypt")` at line91880. Its completed artifact-local `cli/node_modules/{bcrypt,node-gyp-build}` trees are **exactly equal** to the corresponding completed `server/node_modules` trees by whole relative-name sets, file type, bytes/SHA, modes/link counts and directory member lists/modes, including package-root type/mode. Copies have distinct inode/timestamp identities; those are independently recorded, not required to equal one another.

| Traced package      | Regular files per view | Bytes per view |
| ------------------- | ---------------------: | -------------: |
| bcrypt6.0.0         |                     13 |      1,002,381 |
| node-gyp-build4.8.4 |                      3 |          7,471 |

Bcrypt contains package.json/bcrypt.js/promises.js and **all ten** prebuilds: darwin-arm64/x64; linux-arm/arm64/x64 each glibc+musl; win32-arm64/x64. The loader contains package.json/index.js/node-gyp-build.js. All ten server prebuilds match the enrolled installed raw bytes and the retained third static report's ten size/SHA rows; the identical CLI tree therefore retains those same bytes. Server separately traces four tslib2.8.1 files. Its manifest declares exactly bcrypt6.0.0, node-gyp-build4.8.4 and tslib2.8.1.

All twenty current prebuild copies have hashes and first64-byte headers retained. The selected arm64 libc files in **both** server and CLI have independently measured **ELF64, little-endian, AArch64 machine183** headers:

| Prebuild relative to either bcrypt root   |  Bytes | SHA256                                                             |
| ----------------------------------------- | -----: | ------------------------------------------------------------------ |
| `prebuilds/linux-arm64/bcrypt.glibc.node` | 76,640 | `68f3cf61756809c6d466c186aaa2bc1cbc17911f248c361a5284aa4e769fcc52` |
| `prebuilds/linux-arm64/bcrypt.musl.node`  | 76,552 | `fd7b5f9028fb5f06f305fda90aa8bef8c611bc20017ac93379f7cee8c0814e40` |

All **six operative package/loader identities plus selected glibc addon (seven)** match the actual accepted third `nitro-bcrypt-schemafit-GW44Zcjb` source-pins and recorded-result receipts in both current package views (14 comparisons). The historical result records success=true, sameInput=true, differentInput=false and that exact glibc addon. Its `source-pins.runtimeExecuted:false` is staging metadata, not a negation of the separate successful recorded result. Third server/index.mjs is an old artifact anchor, not an operative bcrypt dependency and not required to equal the rebuilt fifth entry.

The retained historical context identifies Bun1.4.2/Linux-arm64/glibc/network-none and cached image ID `sha256:a81de950abb8b5d961ed8c1dcd345450fab8cda00ea3c11e7ec24a4ed4bb82ce`, digest `sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`. Only existing proof receipts/report text were read; no old artifact/control, container or image was reopened or evaluated.

**Historical compatibility transfer is not claimed.** The available historical source-pins record lacks a complete package-tree names/types/modes snapshot; the retained third shared-graph scope explicitly excludes traced node_modules. Seven operative pins, ten addon report rows and current server/CLI equality cannot supply that missing historical full-tree metadata. Exact operative-byte equality is established, but the requested complete historical-tree antecedent remains unproved. No new load, musl, Node, CLI, application or PG validation follows. The fifth compiler's Darwin-arm64 tracing warning neither proves Linux behavior nor invalidates the narrowly recorded historical byte facts.

Loader text still prefers runtime-provided `require.addon`; otherwise it uses the packaged loader with platform/arch/libc/tag selection, optional overrides, build/Release/Debug precedence, package-local prebuild then executable-nearby fallback. No earlier build/Release/Debug candidate exists in the measured package trees. Actual branch/library/ABI selection was not observed, and no platform guard was bypassed.

## Actual resource and literal-coordinate evidence

Raw emitted text, not source substitutes, establishes:

- **276** direct `server/index.mjs` public-table references: every target exists, and their unique target set equals all276 measured public files. The emitted read uses the table path relative to serverDir. This is not HTTP/hydration execution.
- **163** anchored relative ESM text candidates and **110** relative server literal dynamic-import candidates have present regular targets. Genuine bare ESM text includes bcrypt/tslib, Bun SQLite and Node builtins; no resolver or effective export condition was evaluated.
- `host.mjs` locale configuration contains **72** literal MRT/dayjs import edges; its standalone catalog table contains **36** locale-key literal import edges. Every target exists. Computed selection `catalogImports[locale]` remains runtime-unproved even though the finite literal members are present.
- **538** concrete `/assets/` URL occurrences (249 unique targets) and **284** actual CSS file-URL occurrences have present targets. The two CSS bundles contain **802** complete inline data-URL occurrences. These are occurrence counts, not extra files or unique locales.

Text scanners are not JS parsers. All72 apparent missing relative dynamic-import text candidates were individually retained and classified as documentation imports (70) or React diagnostic strings (2), not missing executable imports. Three apparent bare server dynamic imports are Auth WebAuthn documentation types. The earlier scanner's240 encoded `%23...` URL candidates are nested SVG text inside complete quoted inline data URLs, not requested external files; two `/assets/**` strings are route globs. Intermediate raw receipts remain untouched, with refined classifications in later receipts rather than silent rewriting.

The broader workspace scan records183 bundled-source region comments and **one buildroot-labelled region comment** in `server/_ssr/ssr.mjs:21` naming the generated assets manifest. No literal `/Users/` or `/private/var/` import was found in the retained bounded scans. A source/build label is not an operative import; conversely absence from these scans does not prove universal hermeticity or every computed file access. Source-map/raw JSON files remain fully inventoried, not interpreted as executable edges.

## K pin and physical descriptor text

All four emitted bundles—host, actual CLI and both runners—retain the correct SQLite snapshot pin **at index30**:

`42267f940cd3b2c1b81da89756ac2166386a5b58f0baa99ea86e99673054ecd0`

The old malformed63-character value is absent from these occurrences. Each bundle's four indexed SQL/snapshot arrays matches the immutable authority's51/51 SQLite and19/19 PostgreSQL pins exactly. Physical-definition assignments, primary-key overrides and the integration owning-inline-reference transformation are captured as emitted text; their representation lexical tokens match across all four bundles (token witness `2378dd3f92b4405eef9e968fc2675316e2cecb7d7577b6aeb4be6c686e15f3de`). This token comparison is not a serialized runtime object identity.

The host and both runners retain `homarr.main.physical.create.v2` with identity construction including physicalDefinition/journal/journalPin/sqlPins/snapshotPins. The CLI retains the physical-definition initializer but not that serialized identity-construction/version literal; no absent construction is fabricated. Its initializer uses assignment rather than a var declaration at that point, so the later refined receipt corrects the earlier text scanner's omission without changing evidence. Reached-use/ownership assessment belongs to the separate owner reviewer. **No physical descriptor runtime hash, validator, schema admission, migration, epoch or K/D behavior was executed.**

## Remaining conditional and relocation gaps

| Surface                         | Current evidence / limitation                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI crypto                      | Correct artifact-local required packages and complete current trees; no native/CLI load proof.                                                                                                                 |
| Bun SQLite / Node builtins      | Actual `bun:sqlite` remains in CLI and both runners; lazy `node:sqlite`, workers/zlib and other builtin paths remain. Names do not prove Bun behavior or Node24.18 parity.                                     |
| PG native                       | CLI and both runners retain absent `pg-native` under force-native/.native selection. Default JS PG and explicit native mode are distinct; no PG execution occurred.                                            |
| CLI encoding                    | Optional `require("encoding")` remains absent and its load error is caught; conversion paths are not universally closed.                                                                                       |
| tslib                           | Present default/main tslib.js and import.node modules/index.js; alternate module/non-node targets tslib.es6.js/tslib.es6.mjs and declaration targets are absent. Effective conditions remain the owner's gate. |
| Package tools                   | Loader manifest bins and bcrypt development/header dependencies are absent from completed runtime traces. No install/development-package closure or rebuild requirement is inferred.                           |
| Outside-artifact metadata       | CLI ioredis getPackageMeta at85389–85407 attempts `resolve(__dirname,"..","..","package.json")`, outside the artifact, with error-fetching-version fallback. No universal hermetic-file-read claim follows.    |
| Harness / computed native cases | CLI harness retains checkout/commands; native environment overrides/executable-nearby resolution and intrinsic addon branch remain unmeasured. They were not exercised or followed.                            |

These are precise scope/branch limitations, not blanket statements that every dormant branch causes unconditional default-path failure. No filesystem or network access described by emitted code was carried out merely to inspect that code.

## Conservation and immutable handoff

`packaging-preflight.json` and `packaging-postflight.json` freshly authenticate the sealed compiler-final chain/status/report, current preparation report/preserved original prefix and all recorded unions: base192901 regular files/16454 directories/189 links; workspace176 files/44 directories; implementation supplement1071 files/92 directories; six external input files;25 accepted source witnesses/13 compiler witnesses;142 source migration assets/immutable authority;11 physical tools/five tool manifests; accepted after-images/five zero-check receipts;300 protected-output witnesses. Exact base/workspace member and exclusion sets remain unchanged (1184/34 excluded boundaries). Private physical allocation/ancestor topology, known appdata/absent roots, old-attempt root metadata and unchanged build-work boundary were checked without live-data contents reads.

Postflight additionally rehashes every614 artifact file, checks all54 directories and exact artifact membership, all48 prior record files present at preflight (including the preserved collector failure), and four retained historical proof identities. It reports **unchanged=true, faults=[]**. Existing compiler/base/amendment indices, streams/status, source/tools/assets/manifests/configs, protected outputs and old evidence were not overwritten. Artifact permissions/contents were not altered.

One initial collector failed **before artifact measurement** because it concatenated a boolean `nextRootsMetadataOnly` field as if it were a list. `packaging-preflight-failure.json` preserves that schema error. Corrected schema handling then completed full authentication with no conservation fault; this was not a compiler/runtime retry or evidence replacement.

New0600 write-once receipts: `packaging-preflight-failure.json`, `packaging-authentication-specifications.json`, `packaging-preflight.json`, `packaging-artifact-inventory.json`, `packaging-migration-proof.json`, `packaging-native-proof.json`, `packaging-emitted-literals.json`, `packaging-literal-coordinate-details.json`, `packaging-text-classification.json`, `packaging-proof-summary.json`, `packaging-final-static-conclusions.json`, `packaging-postflight.json`. `packaging-receipt-index.json` binds these raw receipts, this report and the sealed compiler-final index without replacing any prior index.

Only these new records and this new report were written. No product/source helper, comments in product code, test, dependency, compiler retry, chmod/repackage/copy of the artifact, require.resolve/import/evaluation, addon/SQL, generated server/CLI/wrapper/runner, native supervisor/control, container/image operation, install/network/browser/listener or protected data/secret/history access occurred. Boot/credential-file/adoption/data holds and disjoint native reviews remain unchanged. **Return: measured packaging evidence with explicit historical-tree/conditional/computed/owner gaps, awaiting independent read-only review; no STATIC ACCEPT or scope increase.**
