# PACK — closed migration roots and packaged caller join

## Decision

**APPROVE the minimal two-source allocation below, source-plan only.** Choose exactly `artifact/db/migration-runners/`; do not put executable bundles inside either authenticated engine root. This does not wire D, override the supplied K frozen-review WITHHELD result, certify compiled CLI/native closure, or grant packaging PASS, activation, production/default-artifact or real-restore acceptance.

| Allocated source                   | Exact responsibility                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build-nitro-candidate.sh` | Package the existing compiled engine runners in the separate sibling directory while leaving closed SQL/meta roots unchanged.           |
| `scripts/migrate-nitro.mjs`        | Load the selected sibling runner and explicitly forward the selected canonical asset root resolved from the packaged wrapper's own URL. |

No third product file is required for this isolated artifact layout. The five AW Backend/API lease sources are excluded and were not inspected. All changes described below are prospective; only this report was written.

## Current source findings

- `build-nitro-candidate.sh:30–34` already compiles both repository-only migration entrypoints into isolated `$BUILD_ROOT/migration-build/<engine>/migrate.cjs`, and separately compiles the CLI. Preserve these compilation inputs, flags and staging paths.
- Lines 38–54 copy SQL and `meta` into the engine root, then incorrectly add `migrate.cjs` to that same closed root. K's actual `readMainTargetBundle` implementation at `packages/db/main-target-catalog.ts:233–338` admits an exact root inventory of pinned SQL files plus `meta`, and an exact meta inventory of snapshots plus journal. Neither `migrate.ts` nor `migrate.cjs` belongs there.
- The inspected `migrate-nitro.mjs` differs from the request's earlier caller description: it **already forwards explicit `migrationsFolder`** for SQLite at line 50 and PostgreSQL at line 67. Retain those fields; the remaining necessary caller correction is its two runner lookup paths at lines 40 and 59. Do not remove or redundantly redesign the existing explicit-root join.
- Both repository migration entrypoints forward the received engine-discriminated config directly to `createPersistenceRuntime`; they need no relocation edit. They remain compiler inputs, not files copied into packaged asset roots.

## Exact prospective build amendment

Keep the existing creation of `artifact/db`, `artifact/scripts` and `artifact/cli`. Extend the existing migrations-directory creation to also create its sibling:

```sh
mkdir "$ARTIFACT/db/migrations" "$ARTIFACT/db/migration-runners"
```

Inside the unchanged engine loop, replace only the runner copy and its nonempty check:

```sh
cp "$BUILD_ROOT/migration-build/$DIALECT/migrate.cjs" "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
test -s "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
```

Keep `test -s "$TARGET/meta/_journal.json"` and the existing SQL/meta copy operations. Do not delete the old destination after copying, clean an existing output, move repository sources, or rely on a generated source-tree `migrate.cjs`: create the correct layout directly in the already-required fresh artifact. The existing recursive source symlink rejection stays before copying; no new symlink or source copy is introduced.

The resulting fixed layout is:

```text
artifact/
  scripts/migrate-nitro.mjs
  db/migration-runners/sqlite.cjs
  db/migration-runners/postgresql.cjs
  db/migrations/sqlite/<51 pinned SQL files>
  db/migrations/sqlite/meta/<51 pinned snapshots and _journal.json>
  db/migrations/postgresql/<19 pinned SQL files>
  db/migrations/postgresql/meta/<19 pinned snapshots and _journal.json>
  cli/cli.cjs
  server/...
  public/...
```

Counts describe K's frozen target contract, not a newly executed artifact inventory. Existing byte-preserving copying is retained; no asset, journal or historical anchor is regenerated or edited. K remains the exact-inventory/content authenticator; shell existence checks are not substituted for authentication.

## Exact prospective caller amendment

Replace the SQLite runner require expression with:

```js
require(
  fileURLToPath(new URL("../db/migration-runners/sqlite.cjs", import.meta.url)),
);
```

Replace the PostgreSQL runner require expression with:

```js
require(
  fileURLToPath(
    new URL("../db/migration-runners/postgresql.cjs", import.meta.url),
  ),
);
```

Retain the actual explicit config fields unchanged:

```js
migrationsFolder: fileURLToPath(
  new URL("../db/migrations/sqlite/", import.meta.url),
);
migrationsFolder: fileURLToPath(
  new URL("../db/migrations/postgresql/", import.meta.url),
);
```

These are separate fields in their existing engine branches, not a combined config. At `artifact/scripts/migrate-nitro.mjs`, each URL resolves to that same artifact's engine folder after relocation, independently of cwd, checkout location or the old build-root pathname. `fileURLToPath` supplies the filesystem path rather than a URL pathname. This wrapper is the genuine packaging owner selecting its fixed layout; this is not permission for the DB runtime or copy engine to discover a fallback from their own module URLs.

Keep activation, migration-disable rejection, Bun requirement, explicit DB URL/driver validation, SQLite regular-file/existence classification, fresh-only seed options, export-shape checks and awaited failure propagation unchanged. Do not add an environment-selectable root, cwd/source lookup, alternate runner path, fallback, receipt or script-specific catalog bypass. D must separately capture/validate the required supplied root and use K before migrator dispatch, with its separately reviewed same-native target checks. This report does not edit `runtime.ts`, strengthen or weaken its current implementation, or claim that join complete.

## Genuine consumer audit and excluded joins

- `scripts/migrate-nitro.mjs` is the only found ordinary script consumer requiring the candidate's old engine runner paths. The selected new directory has no existing conflicting ordinary consumer.
- Root `package.json:261` selects the existing build script; no command change is needed. `apps/nitro/vite.config.ts:36–74,104–114` owns build-root ancestry/isolation, fresh directory creation, artifact output and disabled env/config discovery. None of those paths or guards changes.
- `scripts/run-nitro.sh:53–72` invokes the wrapper at its existing path and waits for migration before listener startup. It does not directly load either engine runner. Its `/app`/`.output` deployment contract is not converted into an isolated-artifact launcher by this plan.
- `Dockerfile:38,46–55` is a genuine **separate held packaging consumer**: it supplies no explicit fresh build root, copies the legacy `.output` and source migration tree rather than this isolated artifact, and uses another CLI location. It would not acquire the new sibling runners through those COPY instructions. Do not represent the two-source plan as Docker-compatible packaging acceptance. Adapting that container lane requires its own explicit allocation; no change or third-file workaround is authorized here.
- `scripts/run.sh:53`, `packages/db/package.json:31–32`, `packages/db/turbo.json` and `packages/db/tsconfig.json` reference the legacy source-tree migration build/output contract, not the candidate's isolated staging/destination. Preserve them. Moving their outputs would unnecessarily extend this lease into the default production lane.
- No runner-path or migration-folder reference was found in `packages/cli/src`; `packages/cli/src/index.ts` dispatches its existing commands. Keep its compilation flags, staging, final `artifact/cli/cli.cjs` path and behavior unchanged. This path audit is not compiled graph or native closure proof.
- The separate runtime/config/copy owning-caller refinements identified by `convergence-D-target-plan.md` and K's backup/copy consumer holds remain separate. Providing this wrapper's root does not repair every runtime construction, authorize copied data, or enable real restore.

## Preserved fences and acceptance limit

Preserve `set -euo pipefail`, explicit accepted activation, absolute absent/nonsymlink build-root rejection, `bun --no-env-file`, Vite's ancestor/disjoint-output fences, unchanged isolated staging and fresh output ownership, recursive migration-source symlink rejection, wrapper nonsymlink/nonempty checks, compiled CLI requirement, server/public checks, relocated runner nonempty checks and journal checks. Do not introduce new config/dependencies, source copies, symlinks, native shims, raw-runtime fallback or fabricated authentication evidence. Previously failed partial artifacts stay untouched.

There is no concrete source-allocation blocker to this two-file correction. K review WITHHELD, D required-root/authentication join, independent callers, Docker/default packaging, immutable host-controlled assets during native rereads, final compiled graph/CLI/native closure and all existing activation/adoption/restore/production holds remain outstanding. A correctly described destination is not an authenticated built artifact or packaging PASS.

No commands, lint/typechecks, tests, builds, evaluation, native/SQL execution, environment/data/secret access or nested agents were performed. Ordinary source/reference reads and this new report are the full work performed.
