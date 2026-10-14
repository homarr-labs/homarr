# Evening D — two-source implementation handoff

## Frozen write scope

Changed only `apps/nitro/vite.config.ts` and `scripts/build-nitro-candidate.sh`, plus this absence-checked new report. No commands/checks/build/runtime/SQL/Docker/tests/install/Git/delegation or data/secret access occurred. Lint, typecheck, shell syntax validation and actual build remain coordinator-owned after all reached source tranches freeze and are reviewed. Coverage remains 91/334; deadline remains an objective.

## Exact build-root contract

Production builds require both `HOMARR_NITRO_ACTIVATION=accepted` and explicit `HOMARR_NITRO_BUILD_ROOT`:

- Normalized absolute path, no CR/LF, with an already-existing physical directory parent. The root itself must **not exist**, including a dangling symlink. Vite creates it once with mode 0700 and nonrecursive `mkdir`; existing roots fail, including a previous failed build. There is no delete/cleanup/reuse path.
- Outside and disjoint from the entire checkout, its canonical location and `/appdata`; this covers protected `apps/nitro/.output`, all checkout source and existing compiled 3200 output. If an absolute `DB_URL` is supplied, its parent directory is protected too. Explicit `HOMARR_DATA_DIR`/`HOMARR_NITRO_DATA_ROOT`, when supplied, must be normalized absolute paths and disjoint. These optional names are additional build fences, not a new H runtime configuration interface.
- Existing ancestors of build/data/protected directory paths must be directories, not symlinks. Missing protected data directories are allowed without creating or reading data. Build parent must exist. Coordinator must own/stabilize that parent and supply a sanitized environment with explicit synthetic paths; this is not an adversarial concurrent filesystem sandbox.
- Activation/path validation and exclusive root creation happen before `createNitro`, and therefore before Nitro's destructive `prepare`. The candidate shell script also rejects absent/relative/existing roots before launching the frontend build.

All target paths are beneath `<root>`:

| Purpose                                      | Path                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| Nitro `rootDir`                              | `<root>`                                                 |
| Nitro `buildDir` / SSR service intermediates | `<root>/build`                                           |
| Vite cache                                   | `<root>/vite-cache`                                      |
| Router temporary directory                   | `<root>/router-tmp`                                      |
| Vite public build input directory            | `<root>/build/vite/public`                               |
| Nitro `output.dir`                           | `<root>/artifact`                                        |
| Nitro server/public outputs                  | `<root>/artifact/server`, `<root>/artifact/public`       |
| Migration bundle stage                       | `<root>/migration-build/{sqlite,postgresql}/migrate.cjs` |
| CLI bundle stage                             | `<root>/cli-build/cli.cjs`                               |

Vite root remains the frontend source directory explicitly. Nitro workspace/scan paths retain the checkout and frontend source for resolution; backend config/server/plugins remain selected through the original absolute c12 config path. Nitro's root is isolated because installed v3 `writeBuildInfo` writes `node_modules/.nitro/last-build.json` under `rootDir` even with an overridden `buildDir`. Its marker now belongs to `<root>`, not the protected checkout's last-build marker.

`envDir: false`, `createNitro` loader `dotenv: false`, backend config selection, React/Mantine/CSS pipeline, plugin ordering and existing SSR host externals remain unchanged. Build route generation is disabled with the installed plugin's `enableRouteGeneration: false`; development retains generation. No generated route tree was reset, regenerated or pruned. Source routes/tree must already match before the proof build.

## Artifact staging contract

Candidate script first runs the existing frontend build entrypoint with `--configLoader native`; the existing package script uses Bun (`--bun`), so Vite can import TypeScript config without its default checkout-local `.vite-temp` bundle. This is supported by installed Vite 8.1.4 CLI/native loader source, but has not been executed here.

Only after Nitro completes and its emitted server/public outputs exist does the script bundle migrations and CLI to the external stages. Migration esbuild flags retain Node bundling and `bun:sqlite` externalization. CLI retains existing Node bundling, external `bcrypt`/`cpu-features`, HTML/text and native-node/text loaders, and adds explicit `bun:sqlite` externalization for its current Bun-backed DB graph. No package source migration/CLI output is written.

Post-Nitro artifact additions:

```text
artifact/
  server/index.mjs + emitted chunks/dependencies
  public/ + emitted assets
  db/migrations/sqlite/*.sql + meta/ + migrate.cjs
  db/migrations/postgresql/*.sql + meta/ + migrate.cjs
  scripts/migrate-nitro.mjs
  cli/cli.cjs
```

Migration asset trees must contain no symlinks; the migration wrapper itself must not be a symlink. Only SQL and metadata assets are copied, not migration source/test/old compiled files. Custom migration code is statically imported by the existing migration runtime and bundled, not copied as a source checkout. The wrapper's existing `../db/migrations` resolution matches its new artifact-local location. Final file postconditions cover server/public, both migration bundles/journals, wrapper and CLI. New staging/artifact subdirectories use exclusive `mkdir`, not destructive cleanup.

## Coordinator/H integration and remaining blockers

After all source inputs are reviewed and frozen, allocate an existing canonical `<run>` parent, separate physical synthetic data/home/tmp/evidence directories, and an **absent** `<run>/build-work`. Use an allowlist environment; do not pass real/provider keys, `.env`, `_FILE` inputs, ambient proxy/loader settings, real appdata, or validation-bypass flags. Existing invocation is `bun --no-env-file run build:nitro:candidate`; the script supplies `--configLoader native` to its frontend build. Run inside the coordinator's sanitized environment with accepted candidate activation, explicit build root and any genuinely required synthetic source configuration. Failure leaves the root intact; next attempt needs a different absent root, not cleanup/retry over prior output.

H receives `<root>/artifact/server/index.mjs` and `<root>/artifact/db/migrations/sqlite`; artifact wrapper is `<root>/artifact/scripts/migrate-nitro.mjs`, CLI is `<root>/artifact/cli/cli.cjs`. No start, host, configuration, Docker, manifest/lock, router-tree or test harness file was changed. H still owns the versioned config/origin/pre-listener readiness and real main resource enrollment. Existing `run-nitro.sh`, default start and Docker paths are **not** updated by this tranche; do not invoke their protected 3200/default output paths as an isolation shortcut.

Actual relocatable artifact is **not yet proven**: final graph/dependency/asset verification, correct same-owner SSR/lifecycle closure, Bun migration/CLI runtime compatibility, and external CLI dependencies remain to validate. Existing forced host externals were not loosened, and no checkout/symlink copy workaround was introduced. This does not supply a readiness endpoint, authenticated resources, outbound provider permissions, a restart/restore guarantee or production acceptance. Migration wrapper execution remains stopped-synthetic-only with explicit DB path, and later H adoption must use that same DB in `existing` mode. No listener started and no port used. Any later isolated boot must avoid 3100/3200, use actual H startup, and deny real-provider/network effects.

Version-specific read references: installed Nitro `dist/docs/0.docs/8.configuration.md`, `dist/_build/common.mjs` (`prepare`, `writeBuildInfo`), `dist/_chunks/nitro.mjs` path resolution, `dist/vite.mjs` frontend scan/service resolution; installed Vite `dist/node/cli.js` and `chunks/node.js` native config loader; installed TanStack router-plugin `dist/esm/vite.d.ts` and `src/core/router-generator-plugin.ts` generation-disable guard. No exhausted Context7 call or library installation was needed.
