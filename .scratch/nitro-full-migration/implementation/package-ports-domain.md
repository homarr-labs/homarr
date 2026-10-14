# Domain package ports: frozen declaration handoff

2026-10-10. COMPOSITION-only continuation after coordinator commit **`266c5e6237430689d4f5b4f99d3f16910155d6b4`**. The preceding sixteen-port delivery passed review `ses_ed8ae7ec6ffe8NmVoNYNnNePfk`; this continuation's declarations are frozen for review, not automatically accepted. **Six manifests, the working lock, and this handoff only. No source, peer tsconfig, app/host/provider/route/session/SQL mounting, private authority, coordinator ledger or runtime restart.** Persistence r3 and production trust parity remain held; Q16 and current-backup end-to-end restoration remain unresolved. **Final guard detected an external change to the backup entrypoint after its checks; current backup source is held for owner/coordinator reconciliation, not silently revalidated.**

## Exact new public paths

**17 additions + 16 previous ports = 33 declared migration ports.** All targets already exist; no wildcard, substitute controller or new source barrel was created. `resolution.json` records all thirty-three public resolutions. The existing translation client facade and pre-existing integrations `./stats` remain additional existing surfaces, not new-count inflation.

| Package manifest                    | New path → existing target                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `packages/common/package.json`      | `./number` → `./src/number.ts`; `./date` → `./src/date.ts`                        |
| `packages/translation/package.json` | `./runtime` → `./src/runtime/index.ts`                                            |
| `packages/api/package.json`         | `./nitro/routers/user` → `./src/nitro/routers/user.ts`                            |
| same                                | `./nitro/routers/group` → `./src/nitro/routers/group.ts`                          |
| same                                | `./nitro/routers/invite` → `./src/nitro/routers/invite.ts`                        |
| same                                | `./nitro/routers/api-keys` → `./src/nitro/routers/api-keys.ts`                    |
| same                                | `./nitro/routers/app` → `./src/nitro/routers/app.ts`                              |
| same                                | `./nitro/routers/search-engine` → `./src/nitro/routers/search-engine.ts`          |
| same                                | `./nitro/routers/server-settings` → `./src/nitro/routers/server-settings.ts`      |
| same                                | `./nitro/routers/onboard` → `./src/nitro/routers/onboard.ts`                      |
| same                                | `./nitro/routers/home` → `./src/nitro/routers/home.ts`                            |
| same                                | `./nitro/resources/identity` → `./src/nitro/routers/-identity/resources.ts`       |
| same                                | `./nitro/helpers/preferences` → `./src/nitro/routers/-identity/preferences.ts`    |
| same                                | `./nitro/resources/apps-search` → `./src/nitro/routers/-apps-search/resources.ts` |
| same                                | `./nitro/helpers/settings` → `./src/nitro/routers/-settings-setup/settings.ts`    |
| same                                | `./backup-runtime` → `./src/backup-runtime/index.ts`                              |

The four helper/resource paths expose only the accepted identity/provider/table/operator resources, actual preference algorithms, app/search bindings/resources and settings store/codec. Router-local resource types and home-target resolver are already exported from their named router files; no redundant subpath was added for every internal algorithm. None of these declarations invokes a controller, repository, remote probe or preparation method.

**Not declared:** active integration/icon routers or their helpers, Bangs' pending router, Core HTTP runtime, Core DB runtime, DB runtime/copied SQLite/trusted-hostname repositories. The existing Core legacy exports were preserved, not reclassified as safe Nitro interfaces. Backup exposure is the accepted bounded parser/inventory/injected copied-preparation surface, not a live engine/application/recovery implementation or authorization to replace a database.

## Actual direct dependency consumers

All required versions were verified from installed package manifests and existing root catalog **before editing**. There are **nine new development-dependency fields**, no root catalog changes, no new package entries and no SDK upgrade:

| Owner        | Declaration                                                                                      | Actual existing consumer                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API          | `drizzle-orm: catalog:` → `0.45.2`; `drizzle-zod: catalog:` → `0.8.3`                            | `src/nitro/checks/identity.mts`, `apps-search.mts`, `settings-setup.mts`; real operators/SQLite tooling and select-schema construction. Both libraries are already direct in DB and catalog-pinned. |
| API          | `adm-zip: catalog:` → `0.6.1`; `bcrypt: catalog:` → `6.0.0`; `@types/bcrypt: catalog:` → `6.0.0` | `src/backup-runtime/restore.test.ts:7–8`, archive fixture construction and password preservation checks. API previously declared none of these.                                                     |
| API          | `@types/bun: 1.3.10`                                                                             | Backup's existing config explicitly selects `bun,node`; backup and apps/search checks import `bun:test`/`bun:sqlite`.                                                                               |
| Core         | `@types/bun: 1.3.10`                                                                             | Existing SQLite driver imports `Database`/`Changes` from `bun:sqlite`. Declaration only; no held implementation was compiled.                                                                       |
| DB           | `@types/bun: 1.3.10`                                                                             | Existing driver/copied SQLite types and runtime fixtures; persistence's existing dedicated config selects `node,bun`. Declaration only; no active r3 implementation was compiled.                   |
| Integrations | `bun-types: 1.3.10`                                                                              | Both existing dedicated runtime/Stats configs explicitly select `node,bun-types`; a direct matching declaration now exists instead of reliance on app transitives.                                  |

AdmZip **`0.6.1` includes `types.d.ts`**. Installed `@types/adm-zip@0.5.8` was inspected but **not redundantly added**. bcrypt itself has no bundled types, so its actual check consumer receives the matching direct development type package. Production user/API-key controllers already use the auth package's declared bcrypt engine through `@homarr/auth/security`; no production API bcrypt dependency was introduced.

`@types/bun@1.3.10` exactly depends on `bun-types@1.3.10`; that chain was verified in both installation views. Runtime remains **Bun `1.4.2`**, so these declarations do **not** promise complete new-runtime SDK coverage. Core's shared-derived config still selects only `node`; the Core owner must select Bun locally where appropriate. API's broad spine config also remains node-only; its owner must select Bun in the specific check config if needed, not widen root globals. No peer config, ambient shim, mock cast, assertion or diagnostic suppression was introduced. Context7 was attempted and quota-exhausted; [official Bun TypeScript guidance](https://bun.com/docs/typescript) and the pinned installed declarations were inspected instead. No global CLI/package installation was performed.

The previous approved five still-unstaged runtime dependency fields remain unchanged: API oRPC client/server `2.0.0-beta.43`, Core Axios/Undici `1.20.0`/`7.29.1`, integrations Axios `1.20.0`. The previously committed use-intl field and Axios/use-intl catalog additions are **not repeated** in the new staging delta. No unused integration SuperJSON declaration was added.

## Ownership, baselines and coordinator artifacts

Owned evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-package-ports-domain.aKN5Ot
```

Before any checkout edit, `snapshot.mjs` recorded new HEAD, index path/hash, current working lock, root plus thirteen package/app manifests, and the original pre-install snapshot hash. `before/**` preserves these exact files; `head.lock` is from the **new** HEAD. `after.json` contains every before/after manifest SHA-256, the exact seventeen export and nine development-dependency additions, package-entry preservation and installed metadata. `working-owned-manifests.patch` isolates **this step's six files, 26 additions, zero deletions** from those snapshots.

This step owns edits to:

```text
packages/common/package.json
packages/translation/package.json
packages/api/package.json
packages/core/package.json
packages/db/package.json
packages/integrations/package.json
bun.lock
.scratch/nitro-full-migration/implementation/package-ports-domain.md
```

Root/auth/UI/app manifests, previous Redis/jobs manifests and all other manifest fields remain exactly equal to their before snapshots. Root/catalog/build/dev/start/config was not rewritten. Old approved changes in API/Core/integrations and the seven prior uncommitted manifests were preserved; no unrelated owner work was staged/discarded.

### Two intentionally different lock bases

| Artifact                                                      | Base and delta                                                                                       | Preservation                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `working-owned-lock.patch`                                    | Pre-step **working** `9ede0bc…` → current working lock; **9 additions, zero deletions**              | Exactly the nine new dev-dependency fields. All **2601 package entries** and all other lock metadata remain unchanged, including every experiment entry/root `crossws@0.4.15` and existing scoped crossws copies.                                |
| `commit-declarations.lock` / `staged-declarations-lock.patch` | **HEAD `266c5e623…`** plus all still-pending accepted declarations; **14 additions, zero deletions** | Five previous runtime fields plus nine new development fields. All **2590 HEAD package entries**, catalog and remaining metadata are unchanged. No experiment workspace/package extras, package versions or locations are copied into this view. |
| `head-all-accepted-manifests.patch`                           | New HEAD → all ten currently pending accepted manifests                                              | Includes seven previous manifests, the new common/translation fields and DB's new local type field. This is broader than the six-file step-owned delta by design; no app/source patches.                                                         |

The historical eight-addition HEAD patch is stale after the coordinator's three-field commit and **was never applied/reused**. The new fourteen-addition patch was regenerated from `head.lock`, structurally compared against only the expected dependency-field changes, and passed `git apply --cached --check`; the ten-manifest patch passed the same read-only check. **Nothing was staged.** A `diff -u` exit 1 means differences were found when producing these patches, not a failed verification.

Working-only keys remain preserved separately, including experiment registration/workspace, OpenAPI/JSON-schema/TanStack/Zod experiment adapters, unused experiment rou3 and scoped Zod/h3 crossws keys. The working root crossws stays `0.4.15`; the closed HEAD view retains `0.3.5` plus its two committed `0.4.15` scoped copies. Neither view overwrites the other.

```text
before working lock            9ede0bc67c1cb32fcf0a704e58ffe9584e5d40ba0f8c38972e731e9ceb892bb7
after working lock             645c2edec4303bf70480befaf0c8a8ec76c543c0fc8ab1050f6dd94d4a897470
new HEAD lock                  d7ce9fd1487035c3107051ff824c494c2a7df209813874f9146232d567fbf41d
closed declaration candidate   7f7575d8fed6c3496e511871f9c04ec48fb175bbe799c0c48019d56d7cd7e0aa
working-owned-lock.patch       0109cb423d90515f84b58165996a25957bf18e4df829592904ae84d5782bdc35
working-owned-manifests.patch  d9a2f3a59316e186d4e2da057de2842c05eea4938aa5a8c1aba5dc451b61bd39
staged-declarations-lock.patch 5f94e7a5a694219b149e7bbd6e73b8efd73a4947a76a3e42cc48ebc7874d3d86
HEAD accepted-manifests patch  613a49bdf98d1bd54dbe6e8c47f215bd0a80a84563bec4d92b49710132bd5668
unchanged empty index          612f6945d87e07d1b4df6bb69b4f1c422d065d9f9730d4ed457f8b1b693423a9
original pre-install snapshot  3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210
```

## Exact checks, without runtime mounting

All Bun calls used `--no-env-file` with clean explicit PATH/HOME. Installation additionally used `--config=$owned/clean.toml` (hoisted linker, public npm registry, no private configuration), the existing native cache, `--frozen-lockfile --ignore-scripts`. No `.env`, credentials, appdata, real database/backup, provider/paid call, browser, 3000/3100 service or active listener was accessed. No Vite/Nitro process was started.

### Independently frozen-installed views

- **Current full worktree:** exit 0, `Checked 2336 installs across 2321 packages (no changes)`. This includes the original experiment workspace and is not described as experiment-free. Log: `frozen-working-install.log`.
- **Closed HEAD-plus-declarations fixture:** `fixture.mjs` copied **42 tracked HEAD manifests**, replacing only the ten accepted composition manifests, the candidate lock and exactly four authorized installation patches from `git show HEAD:<path>`. No subsystem/application source or uncommitted patch content was copied. `fixture-provenance.json` records origins and hashes. Frozen install exited 0 with **2052 packages installed**; repeated frozen install exited 0, `Checked 2327 installs across 2314 packages (no changes)`. Logs: `frozen-head-candidate-install.log` and `frozen-head-candidate-repeat.log`.
- `resolution.json` verifies all **14 direct declarations in both views: 28 actual consumer resolutions**, exact pins and the `@types/bun`→`bun-types` chain. Both candidate and working lock hashes stayed unchanged through installations. This is Darwin arm64, scripts ignored; no cross-platform native-binary or executed SDK guarantee is inferred. Source-free fixture installation is dependency closure, not source compilation or feature acceptance.

`final-state.json` independently verifies all fourteen snapshotted manifests, forty-six fixture inputs (42 manifests + four HEAD patches), both lock hashes, original snapshot and empty index after the source-drift guard failed. It records artifact hashes separately from source-validation status. Only owned fixture `node_modules` and the isolated HOME were removed afterward; manifest fixtures, HEAD patches, all snapshots, candidate/delta files, logs and reproduction scripts remain retained. Working-checkout installations/listeners and original artifacts were not removed.

### Three scoped compiler gates, lint and manifests

All three commands initially exited 0, no diagnostics, using `bun --no-env-file run node_modules/typescript/bin/tsc`. Backup's source subsequently changed externally; that compiler result is historical evidence for the recorded checked hash, not validation of the new entrypoint:

1. `--project packages/translation/src/runtime/tsconfig.check.json --noEmit`: actual locale/culture roots and existing local checks; log `typecheck-culture.log`.
2. `--project packages/api/src/backup-runtime/tsconfig.json --noEmit`: bounded backup source/check graph, with its existing `bun,node` selection now directly declared; log `typecheck-backup.log`. The fixture code was compiled, **not executed**; no SQLite was opened or migration run.
3. `--noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node packages/common/src/number.ts packages/common/src/date.ts`; log `typecheck-common.log`.

Scoped oxlint of **41 accepted source files** passed with zero warnings/errors (`scoped-lint.log`): new leaves/culture, nine frozen routers and their accepted helper families, six backup source modules, frozen Stats wrapper/index/legacy guard and Miniflux leaf. It excluded active metadata/integration/icon routers and physical persistence/trust implementations. The six edited manifests passed `oxfmt --check` (`manifest-format.log`). Owned tracked diff whitespace checks passed. No subsystem source was formatted, no tests were added/executed, and no broad repository/API/integration compiler or suite was run.

### Pure runtime/import/bundler graphs

`graphs.ts` parses source import declarations, records source hashes and type-only edges, then follows only the transpiled workspace runtime edges. **Type-only DB/auth/env roots are recorded but never recursively walked/typechecked/initialized.** Active metadata `port-map`, active integration/icon router boundaries, legacy SDK/factory and aggregate provider registries are explicitly excluded. This is a bounded workspace-input audit, not complete vendor-code safety certification.

- All **17 newly declared paths** resolve and had no blocked legacy Next/env/global-DB runtime edge in the recorded scan. The **checked** backup entrypoint's runtime externals are `node:crypto`, `node:zlib`, SuperJSON; that graph did not import Bun SQLite or the held copied-image driver. Its subsequently changed source is not covered by this graph claim.
- Number has no runtime imports. Date imports Day.js and installs its existing `isBetween` plugin at module evaluation; it is **not literally side-effect-free**. Its `isDateWithin` ambient `dayjs()` helper remains exported for source preservation but is **not called** by locale/culture. Accepted culture uses `formatDuration`/`toValidDate`, per-instance locale and injected clock/scheduler; declaring date is not approval to use its ambient helper in request-owned logic.
- In-memory **browser** build of the two new common leaves and translation runtime: success, **109 outputs, 209 recorded inputs, all 36 catalog JSONs**, no Next/next-auth/next-intl or auth/DB/core workspace input, no diagnostics. It writes no assets and executes no provider/UI/hooks. Log/complete inputs: `graphs.log`/`graphs.json`.
- Frozen `stats-integration.ts` has **58 scanned workspace inputs**, no blocked legacy runtime edge; the actual native Miniflux provider has one workspace input. In-memory Miniflux **Bun** bundle succeeds with **one output and 80 recorded inputs** (actual Zod implementation included), no diagnostics. This is the real native leaf, not a factory double or fake provider; it was **not invoked** and no secret/request was used.
- Existing public Stats index still stops at `stats/index.ts:6` → `./existing` and `:7` → `./providers`; runtime stops at `runtime/executor.ts:9` → `../base/creator`. These aggregates were deliberately not bundled or broadly typechecked. Owner-reported Mock/SDK ambient imports and cancellation/compatibility limits remain holds; independent wrapper/native-leaf evidence does not close all 89 providers.
- The recorded scan has **164 unique source/catalog input hashes**. Initial `audit.ts` passed and wrote `after.json`; a later final rerun correctly **failed** because `packages/api/src/backup-runtime/index.ts` had changed externally. `source-drift.json` records all input comparisons: **163 unchanged, one changed**; `final-audit-failed.log` retains the guard failure. That new backup source was not recompiled, rescanned, overwritten or implicitly accepted. Artifact helper initially assumed the removed TS7 legacy compiler API path; it was corrected to the already-installed root-declared `@babel/parser@7.29.7`. No source, dependency or diagnostics were altered to clear that tooling error.

Backup source drift, requiring owner/coordinator review before any consumption:

```text
packages/api/src/backup-runtime/index.ts
checked  a400f66ca953e68241c7c66831b5bceb7f754d9c9600b3d32514544bc58edc0b
observed 91362b63e6eafad7314bcbaa1ea259f79670397462be8797c127220e856777d1
```

Manifest/lock structural checks, both frozen-install views, and consumer resolution evidence remain valid independently of this source drift. The public path still resolves, but the declaration is not permission to consume its changed bytes. The failed source guard is not suppressed or represented as a green final aggregate check.

## Exact source-owner public-import requests and joins

Only producers edit these sources; this lane made **no import cleanup**:

| Owner/source edge                                                                                             | Requested public replacement / remaining boundary                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Culture `packages/translation/src/runtime/index.ts:31`, `date.ts:1`                                           | `../../../common/src/date` → `@homarr/common/date`. Both required functions are preserved; do not invoke ambient `isDateWithin` during request preparation.                                                                                                                                                   |
| Culture `packages/translation/src/runtime/culture.ts:7–16`                                                    | Runtime and type imports from `../../../common/src/number` → `@homarr/common/number`. Four total culture cross-package declarations are recorded in `graphs.json`.                                                                                                                                            |
| Settings/home `packages/api/src/nitro/routers/home.ts:18–19` and `routers/-settings-setup/home-target.ts:5–6` | Replace four type-only relative policy module imports with the existing `@homarr/auth/nitro/policy` barrel, which already exports `constructIntegrationPermissions`, `decideBoardAccess`, `snapshotPolicyIdentity`. No policy split/duplicate source is needed.                                               |
| Jobs `packages/cron-jobs/src/runtime.ts:1–2`                                                                  | Existing type/value imports from `../../cron-jobs-core/src/runtime` → previously declared `@homarr/cron-jobs-core/runtime`. Prior accepted join remains unchanged.                                                                                                                                            |
| Stats fixture `packages/integrations/src/stats/-runtime/fixture.ts:17`                                        | Pure parse-error fixture uses `../../../../common/src/errors/parse/parse-error`; no new error subpath was authorized here. Request an accepted pure leaf if public fixture cleanup is needed; **do not substitute** Common server/ambient-logger-backed error handler constructors.                           |
| Core/API narrow Bun consumers                                                                                 | Local direct declarations now exist; owner selects Bun only in the relevant local config. Shared base remains `types: [node]`; no root-wide workaround. DB and integrations' already-explicit dedicated configs retain their exact selection.                                                                 |
| Host consumers                                                                                                | Use named new router/resource/helper ports instead of deep owner paths or the aggregate barrel while metadata remains active. Inject coherent schema/operator/repository resources only after actual DB r3 acceptance; type-only DB shapes are not accepted physical handles or PostgreSQL transaction proof. |

Pending identity multi-write leaves, search deletion/Bangs, onboarding completion/next-step, real settings/home authority, physical state/log/job backing, backup engine/migration/seal/maintenance/recovery, current session/Q16 and whole provider/SQL parity remain their existing acceptance gates. No central source metadata was updated, no local pending factory gained a procedure and no new feature was mounted. Trusted HTTP signature/proxy production holds were neither relaxed nor revisited by this lane.

## Coordinator stop boundary

Review the six-file step delta and the separately based fourteen-line closed candidate; only the coordinator stages/commits. Reconcile the backup owner's changed entrypoint before accepting its current graph. The prior sixteen ports remain preserved and unmounted. Root/UI/app/auth and active owner sources remain outside this step's writes. No agent delegation/worktree/branch switch/staging/commit/discard occurred. Index is empty and still matches the new-step snapshot. Accepted **PID 89683** remains listening at **127.0.0.1:3200**, unchanged. **Freeze declarations here and wait for actual persistence acceptance before any public host join.**
