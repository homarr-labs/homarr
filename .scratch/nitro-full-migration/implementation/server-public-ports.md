# Server public declarations — narrow producer return

2026-10-11. **Four existing-file Common exports and one direct DB dependency are available for separately allocated producer import cleanup.** Declaration/install/type evidence only: no B/D server graph acceptance, context source substitution, physical Stage P or host use is authorized by this return.

## Exact base and scope

Read-only Git verified current HEAD at start and final check:

```text
c009cba62d8ffab1d19186e4df62674b616979fd
```

Only checkout writes: `packages/common/package.json`, `packages/db/package.json`, the DB workspace field in `bun.lock`, and this report. New temporary evidence is owned here:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-server-public-ports.94oYzX
```

No old `27f35202d`/`c6e0d4eb0` patches were applied. Existing API three-export candidate and all pending working declarations/experiment fields remain untouched. Coordinator alone curates/stages/commits; never stage the entire working lock for this change.

## Returned declarations and honest boundaries

| Declaration               | Existing unchanged target / boundary                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Common `./id`             | `./src/id.ts`: exact `createId` reexport from already directly declared `@paralleldrive/cuid2`; existing catalog/vendor `3.3.0`   |
| Common `./grid-algorithm` | `./src/grid-algorithm.ts`: existing algorithm, zero runtime/type imports; no algorithm changes                                    |
| Common `./error`          | `./src/error.ts`: actual `FlattenError` class and `extractErrorMessage`, zero imports                                             |
| Common `./request`        | `./src/request.ts`: **retains runtime `next/server` userAgent import** and type-only `./types`; not a safe selected runtime entry |
| DB direct dependency      | `zod: "catalog:"`, matching existing root/lock catalog **4.4.3** and existing `zod@4.4.3` vendor entry                            |

All four public export resolutions were checked against actual package exports and unchanged source bytes from this exact HEAD. No source was imported/evaluated. ID/vendor behavior was not invoked. The `runtimeUseAccepted` flags in `leaf-evidence.json` distinguish eligible leaf syntax from excluded request runtime use; they are **not** whole-server or downstream vendor execution acceptance.

`/request` is declared solely to enable the separately allocated context **TYPE** `DeviceType` consumer. A temporary `import type` consumer erases to **empty runtime text**, including no Next import. The source file itself is not empty or Next-free. No `userAgent` call, proxy resource implementation, different-device policy or source repair was performed. Common already declares Next; its compiler-only closure remains real.

DB already directly declares Common. This change fixes the actual custom `0004` migration's missing direct `zod/v4` ownership from returned graph evidence, without rereading/executing that migration. Checkout and fixture resolve `zod/v4` from vendor **4.4.3**; fixture's require resolution is CJS and checkout's Bun resolution is ESM, both from the same existing version. No hoisting argument substitutes for the newly explicit DB dependency.

## Structural preservation and fresh HEAD candidates

`candidate-proof.json` records full object comparisons, not selected-key-only checks:

- Common manifest: exactly four exports added; every other field/dependency preserved.
- DB manifest: exactly one runtime dependency added; every other field preserved.
- Working and HEAD lock objects: exactly `workspaces["packages/db"].dependencies.zod = "catalog:"` added; **all other structural fields unchanged**.
- Both lock text patches contain **one added line and no removed lines**. Catalog, patches, vendor metadata, resolutions and integrity entries are unchanged; no package entry addition, upgrade or regeneration.
- All **2,601 working vendor entries** and **2,590 HEAD vendor entries** are preserved. The working experiment workspace/package records remain working-only; the curated candidate contains exact current HEAD plus this single DB field.

| Artifact                        | Before / exact HEAD SHA-256                                        | After / narrow candidate SHA-256                                   |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Common manifest                 | `e5086d29a7a776588a2b67acb7a957301ea2a50b9f8e1654baa9775254cf9c1d` | `c88775b0e38b1a8e17750630b7332d8549ca8d646dfb19c29045bd212afc7816` |
| DB manifest                     | `7e29dc80a63aed1f6142a7e16263d39deeafd5675947e44ff86e98cb76c284ce` | `a92b850d2bc0ceecc63e754fbd69f91154e8d516cee44363df8972e566602230` |
| Working lock                    | `094406d2ebe3146f6aa90620473efc12ea1d19f341038ff910a075aa6bbc2183` | `1d3c33501df0be6dfdf60ff1dcf0f8b536d9e53fa0dfd5d6db18a823132ca80f` |
| HEAD lock / `server-ports.lock` | `eecd3e6d7b1a72d2b7c9b8b283d80667f258d712cb192a26ea84a4b1f3092fb1` | `e598d4fc8ed300441eb716571f05b03314b7e7a42d94e8cbf5676eca2da89640` |

Common/DB working baselines match current HEAD, so their minimal candidate bytes also match resulting working bytes. Only the lock's working and HEAD bases differ.

Exact narrow patch identities:

```text
head-common-manifest.patch / working-common-manifest.patch
d33b2c0c2cda38fb80960f0e371c4e1cd6411180c4f149a1f520ffa276bc2c90
head-db-manifest.patch / working-db-manifest.patch
005b3a756ac583bc7d7c0fee821812952f3697ee815841d2936fd4391cf13b5e
head-db-lock.patch
6a5c4ab24a4a87ca76ae8782c04ebdda49a1b1312f8ad3748b96043e0a5431e3
working-db-lock.patch
afb641fcc248749495bf5c4a6eace51c1f9f7374bae0a19ff70c02ebe6eeb66c
```

Read-only `git apply --check` passes for all three HEAD patches against saved exact HEAD bytes outside checkout; reverse checks pass for all three working patches against current files. No patch was applied with Git. Index and HEAD remained unchanged. If coordinator's HEAD changes later, reconcile from that new base instead of applying this evidence blindly.

## Source-free frozen install and repeat

Fixture contains **42 manifests from actual current HEAD**, with only the two selected narrow candidate manifests substituted, **four unchanged HEAD dependency patches**, and curated `server-ports.lock` as `bun.lock`: **47 provided files**. No workspace source, copied DB/schema/migration, `.env`, auth configuration, data or credentials. Workspace source export targets intentionally are absent in this fixture; it proves dependency/lock consistency, not runtime buildability.

Both calls exit **0**:

```text
env -i HOME=<owned-home> PATH=<explicit-Bun/system-path>
BUN_INSTALL_CACHE_DIR=/Users/ajnart/.bun/install/cache
bun --no-env-file --config=<owned-clean.toml>
install --frozen-lockfile --ignore-scripts
```

Config uses hoisted linker and public **`https://registry.npmjs.org`** only. Existing native Bun cache is reused. No checkout install or environment/auth network. Registry/cache resolution is permitted install activity, **not claimed offline**. Native lifecycle scripts were not run. First log reports **2,052 installed packages**, repeat reports **2,327 installs across 2,314 packages, no changes**; these Bun counters are not lock-entry counts. Both fixture manifests and all four patches retain their input hashes; fixture lock remains **`e598d4fc…89640`** after both calls.

## Scoped read-only compiler/lint/format evidence

- Installed TypeScript **7.0.2**, strict explicit-root no-emit checks, real installed Node/Bun declarations, existing `skipLibCheck` policy, no diagnostics filtered/stubbed.
- Safe roots: actual `id.ts`, `grid-algorithm.ts`, `error.ts`; **exit 0**, **215 compiler-listed files**, only those three workspace reads, **zero Next compiler reads**.
- Request TYPE consumer: temporary public `DeviceType` import/export only; **exit 0**, **606 compiler-listed files**, actual workspace reads `types.ts` and `request.ts`, **294 Next declaration reads**. Those are compiler-only reads, not runtime evaluation or a literal zero-Next type closure.
- Shared flags: `--ignoreConfig --noEmit --target ES2024 --lib ES2024,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --strict --skipLibCheck --esModuleInterop --noUncheckedIndexedAccess --pretty false --listFiles`; safe types `node,bun`; DeviceType adds `--jsx react-jsx --types node,bun,react,react-dom`.
- Four source leaves: oxlint **0 warnings / 0 errors**, exit 0. Common and DB manifests: read-only oxfmt check exit 0. No source formatting write.
- No safe/server bundle, factory/module execution, ID/grid/error/userAgent invocation, SQL, host or test suite was run. These narrowly passing types do not clear previous B/D graph/type holds.

`type-evidence.json` retains all compiler paths and raw log identities; `leaf-evidence.json` retains source/transformed identities and actual erased import edges.

Existing source identities, all matching this HEAD and final working bytes:

```text
src/id.ts             db2df2b4d25b565375c4fdd1d47a7ee25749c15dcfa9b3317ce46d997bbf4372
src/grid-algorithm.ts e439feb31aa287924386b743e458bfddf8edf24dbc188954e65b7a9bd3a53ab6
src/error.ts          aba2fdd2cba0f1c19ab8d8eacc6bd18bbb42b69bb5d652581ff02c687093fc9e
src/request.ts        787d7433fee6a5e51acd3ed86097d05f97885a34c832e3fb553608dcd3454868
```

Paths above are relative to `packages/common/`. Selected artifact identities:

```text
candidate-proof.json 3cb351ecd91692cf4ec319f2ae4e9b332d252972642ec08940f1073490b65fe4
leaf-evidence.json   396fae83b30d231d401910822514942fc9307542dbc54759e2905f2ed448d08a
type-evidence.json   cc76bf162f4124bc491b509ebd687d6cebb45aa6dfc3f165c2594a8520956ecf
frozen-install.log   732c4aa23fc5d9562f94894d76308a7128404c829de5babf3467982360379ec7
frozen-repeat.log    b33b38453d7f2227085a4bdbfa6adb34618483d5ab721daa6b5c2ba58a18de02
types-safe.log       4aa85cfb656212f949ae0fcf8b26dcc7ae053730aa733156b2f616e117b666bf
types-device.log     2b0e99bbec3abd0e9066c0ca85f90c06bf2d2c95169fa12cdaed33729ccdf351
```

## Final preservation and handoff limits

Final guard preserves all unrelated working manifests, experiment manifest, complete lock structure, four Common source files and Git index. **21 prior frozen server evidence artifacts and 34 browser artifact/handoff files** remain unchanged. Four G3 anchors were checked for **preservation only**, not rerun or recertified. No physical Stage P/P1 source generation or graph refresh occurred.

Current returned `public-server-graphs.md` already records the independent-review **7-warning lint correction** and has hash **`be3c5b8b3929ccc9bf28a5c2028ea6b41a58606a78ab9e445a737dc9b4e3b796`**. It was not edited here. Initial preservation assertion against its obsolete pre-review report hash failed; `check.log` retains that honest failure. The corrected guard preserves the reviewed report, without changing any frozen graph/check artifact or declaring source acceptance. `final-state.json` records both report hashes and final identities.

**Return for independent declaration review/coordinator capture now; no waiting/polling.** Original DB/SPINE source owners alone perform separately allocated import/type cleanup. Afterwards require a fresh exact graph/type/bundle return on the final DB freeze before B/C/D consumption; the earlier guarded-failure prefixes remain historical evidence. Stage P/reset, genuine auth/SQL admission, restore, private SSR and whole-product parity are not accepted by declaration availability.

All work is complete; no graph/compiler/install subprocess or source-hash consumption remains active from this lane. No source/root catalog/other dependency edits, upgrade, API candidate capture, checkout install, runtime evaluation, schema/migration/copy/backup execution, host build, app data/.env/credentials/providers/paid calls, browser, listener/3000/3100/3200/3210/shared service/container, Git mutation/staging/commit or nested agent.
