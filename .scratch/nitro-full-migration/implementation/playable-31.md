# PLAYABLE-WAVE32 lane31 — deployment candidate

## Exact write lease, recorded before implementation

- `Dockerfile`: split the existing install/source stage from its unchanged legacy build; add explicitly selected/gated `nitro-builder` and `nitro-candidate` stages before the existing final `runner`. The default final image remains Next/nginx/Redis.
- `scripts/build-nitro-candidate.sh`: gated single frontend/Nitro build plus the existing DB migration and CLI builds, no second backend build; the reviewed fix below replaces DB script dispatch with the same declared esbuild entrypoints plus the verified Bun builtin external.
- `scripts/run-nitro.sh`: gated migration-before-listener launcher, persistent caller-supplied secrets, one direct Bun listener and exec shutdown ownership.
- `scripts/entrypoint-nitro.sh`: candidate-only gate, `_FILE`, numeric PUID/PGID validation and ownership of existing writable data directories without Redis/Next/nginx paths.
- `deployments/nitro/compose.yaml`: explicit candidate profile, isolated named volume, loopback published listener and shutdown grace; no Redis dependency.
- `.github/workflows/nitro-candidate.yml`: manual, acceptance-gated, nonpublishing candidate image build; no release/Pages/docs/workshop workflow change.
- `packages/cli/src/commands/harness.ts`: explicit optional candidate runtime selection, distinct candidate image/container/volume naming, no default runtime switch.
- This handoff only under the canonical scratch root.

`nginx.conf`, `development/development.docker-compose.yml`, current startup scripts, existing production workflows and artifact extraction remain unchanged: the candidate bypasses nginx altogether, and no legacy runtime is silently repointed. No package.json, lock, backend config/composition, docs/Pages, Go Workshop, protected fixture/output, live runtime, credential/environment file or peer mutable source writes. No new tests/comments/agents/Git operations.

## Consumed evidence

Authoritative PLAYABLE-WAVE32 Oracle amendments, STACK-CUTOVER, A16 and CONVERGENCE-VALIDATION were read. Frozen backend-relocation handoff establishes one frontend Vite build with backend config and `.output/{server,public}`, Bun preset, lifecycle plugin and no standalone backend build. It does not establish production/private feature acceptance. Installed Nitro/Srvx source and Turbo bundled docs are inspected read-only before prescribing commands. No active peer backend/frontend implementation is consumed as accepted code.

## Concrete artifacts and preserved source mappings

Implementation is frozen for coordinator review. The initial seven product paths above are retained; the reviewed fix below adds the eighth, `scripts/migrate-nitro.mjs`. No manifests were written.

- `Dockerfile`: existing install/source instructions are now the shared `dependencies` stage. Existing `builder` still builds Next and CLI; the unchanged final `runner` remains the default stage. Explicit `--target nitro-candidate` selects a separate Bun/Node Alpine runtime, copying the entire genuine frontend `.output` (server and public), existing CLI bundle, existing migration assets, root native SQLite binding and bcrypt/node-gyp-build runtime dependencies. No Next standalone, nginx, Redis package/config, port3001, tasks/websocket process or second backend build enters the candidate runtime. No output was built or inspected.
- `scripts/build-nitro-candidate.sh`: refuses absent/non-accepted activation; the reviewed fix uses the two real DB migration source entrypoints/current output names and declared esbuild tool with `--external:bun:sqlite`, followed by unchanged `@homarr/cli build` and exactly one `@homarr/nitro build`. DB produces both existing dialect migration bundles and CLI uses its existing esbuild command. The only main application build is the frozen Vite/Nitro build contract; there is no invented backend build task or Turbo traversal into Next/docs. Expected emitted entry/public/CLI/migration files and wrapper are checked for existence before image packaging.
- `scripts/run-nitro.sh`: source behavior retained from `scripts/run.sh` is MySQL rejection, writable DB/certificate setup, migration failure abort and signal ownership during migration. The reviewed fix invokes the new Bun wrapper and actually awaits the frozen migration exports; direct execution of export-only bundles was incorrect and is removed. Migration-disabled startup is rejected. After completed migration/close, `exec bun --no-env-file apps/nitro/.output/server/index.mjs` makes the actual listener PID1 rather than adding a restart supervisor. Listener defaults are direct7575/IPv4; operator-supplied `NITRO_HOST` can select another explicit bind. No nginx forwarding rewrite or fake websocket delivery exists. AUTH_SECRET and encryption key must be supplied persistently; no fresh-per-boot auth secret, random replacement, Redis startup/config/logging, or data deletion occurs.
- `scripts/entrypoint-nitro.sh`: retains `_FILE` secret loading and PUID/PGID privilege drop from `scripts/entrypoint.sh`, but fails unreadable/invalid inputs, validates IDs after loading, and only owns `/appdata/db` and `/appdata/trusted-certificates`. Existing Redis/Next/nginx paths are not created/chowned/deleted. Both UID and GID changes use the existing su-exec tool. Gate is checked before secret loading/data writes and again after `_FILE` overrides.
- `deployments/nitro/compose.yaml`: opt-in `nitro-candidate` profile selects the named target, requires explicit activation and persistent secrets, publishes only loopback7575 and creates a separate `homarr-nitro-candidate` project/named data volume. No legacy bind/volume reuse, Redis requirement, external Redis address, or health-success fabrication. It sets SIGTERM/60s stop grace, with runtime drain timeout30s. It deliberately does not auto-restart a failed/uncertain migration.
- `.github/workflows/nitro-candidate.yml`: only workflow_dispatch with default `held`; `accepted` selects the candidate on native amd64/arm64 runners, exports image archives without starting a container, and uploads only preparation artifacts. It has read-only repository permission, no registry login/push, product runtime secret, release/default CI switch or deployment. A green preparation build is not runtime acceptance.
- `packages/cli/src/commands/harness.ts`: existing brocli command tree gains optional `--runtime legacy|nitro-candidate`; omission remains exactly legacy. Candidate build passes the real Docker target and build arg after checking explicit activation. Candidate identities append `.nitro-candidate` before image/container/volume naming, and startup never force-removes an existing candidate container. Candidate starts require explicit persistent auth/encryption overrides, omit the legacy default writable-demo/mock environment and key generation, bind published traffic to loopback, and use a 60s stop timeout. Port/stop resolve the same candidate name. Existing product user/integration/password commands and their auth/DB algorithms are untouched.

No new public library/component/factory export is required. Reusable interfaces are Docker target `nitro-candidate`, the four standalone candidate scripts including the migration wrapper, the Compose profile and existing `harness {build,run,setup,port,stop} --runtime nitro-candidate`. External listener7575 and `/appdata` remain the packaged contract. Backend lifecycle/authority/cache/media/SSR modules are not modified or considered accepted by these artifacts.

## Exact requests to lane01 — no manifest edits by31

Add these **new, explicit opt-in** root script fields only after checking the frozen owned source closure. They do not replace `build`, `start`, `dev`, `docker:dev:up` or existing release routes:

```json
{
  "build:nitro:candidate": "bash scripts/build-nitro-candidate.sh",
  "docker:nitro:candidate": "docker compose --env-file /dev/null -f deployments/nitro/compose.yaml --profile nitro-candidate up --build",
  "docker:dev:postgresql:up": "docker compose -f ./development/development.docker-compose.yml up -d postgresql"
}
```

The build script's acceptance variable must be supplied by the authorized executor, not embedded as an always-on manifest value. The Compose script deliberately disables implicit `.env` discovery; credentials must come from the separately authorized operator context. No additional library/tool dependency or package export/lock change is requested. `start` currently hardcodes3200 through its workspace script; do not use it for candidate execution or the owned3210 preview. Container `run-nitro.sh` is intentionally `/app`-specific, not a checkout root start command.

Upon actual production cutover acceptance, remove the obsolete Redis setup requirement/root `docker:dev:up` field rather than replacing it with mandatory PostgreSQL setup for SQLite users. The separately named PostgreSQL script remains optional. Keep legacy developmental Redis available for legacy commands until their consumers are retired; this lane has not silently changed their default behavior.

## Exact activation request and remaining gates

Request: after the immutable installed/built production closure passes its required acceptance ledger, authorize **explicit** Docker target `nitro-candidate` with build arg `HOMARR_NITRO_ACTIVATION=accepted`, and supply the same runtime activation plus persistent AUTH_SECRET/SECRET_ENCRYPTION_KEY. Use only an independently owned disposable volume initially, preserving all existing appdata and existing processes. These values are an operator acknowledgement, not a cryptographic proof or automatic clearance of backend holds. Docker's default target/current launch scripts remain legacy; no default production switch is requested in this return.

Before activation,01 must confirm the final `.output` is genuinely the sole same-listener Bun application with backend lifecycle joined once, all emitted externals/native resources packaged, all private SQL/session/resource/grant/cache joins accepted, correct media/deep-link/static/API error semantics, and real readiness/liveness. The existing CLI/migration bundles still use their retained legacy package algorithms; packaging does not establish new-session COMMIT/maintenance admission compatibility. Existing custom-Widget browser-byte budget, API/schema projection, release artifact extraction and benchmarks still target Next and need independently accepted replacements before any default CI/release cutover. They were intentionally not repointed to unverified Nitro artifacts.

Specific direct-listener decisions awaiting01: preserve256MiB upload admission through an actual supported backend/preset boundary (Bun's default is not an equivalent nginx limit); explicit IPv6 and trusted-forwarding policy; durable auth secret configuration compatibility; final emitted native SQLite/bcrypt/external closure. Do not invent a runtime max-body flag, authority callback, Redis/KV subscription substitute or silent private-action success to clear these gates.

Shutdown source facts: installed Nitro `3.0.260903-beta` Bun preset reads NITRO_HOST/NITRO_PORT and installs setupCloseHooks; installed Srvx Bun adapter owns its listener/waitUntil, and its graceful plugin registers SIGINT/SIGTERM. The actual timeout is `SERVER_SHUTDOWN_TIMEOUT` **seconds**, default5, not the older NITRO_SHUTDOWN_TIMEOUT documentation. The launcher clears CI/TEST, which otherwise disable this preset's default graceful handler. It admits1–30seconds and defaults30; Compose/CLI allow60seconds before the container manager kills. Nitro invokes the real close hooks once after listener close, but catches/logs close-hook failures. No assertion of hard-bounded native drain, successful critical ledger settlement, failure propagation or full restart safety follows from the deployment wrapper.01 must retain and verify real host pre-drain/lifetime ownership and failure behavior; no backend config changes by31.

## Validation evidence and closure

All checks used clean `env -i`, explicit Node24.18.0, HOME=/var/empty, no inherited app configuration and no emit/cache. No app source was imported/evaluated. The CLI compiler root imports only Node builtins and installed brocli0.12.0; no mutable peer graph participates. Installed types/enum signature were read before the CLI change; installed bcrypt6.0.0 declares node-gyp-build, and actual DB/CLI/frontend manifest scripts were inspected read-only before prescribing their calls. Turbo2.11.7 bundled README/run docs were read; candidate avoids Turbo traversal entirely.

| Check                                                                                                                                                                                                                    | Result / exact scope                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bash -n scripts/build-nitro-candidate.sh scripts/run-nitro.sh scripts/entrypoint-nitro.sh`                                                                                                                              | PASS, syntax only; no script executed                                                                                                                                |
| `sh -n scripts/entrypoint-nitro.sh`                                                                                                                                                                                      | PASS, POSIX entrypoint syntax                                                                                                                                        |
| Installed oxlint1.73.0 `packages/cli/src/commands/harness.ts`                                                                                                                                                            | PASS, one file/197rules,0warnings/0errors                                                                                                                            |
| Installed TypeScript7.0.2 `--ignoreConfig --noEmit --incremental false --target ES2023 --module ESNext --moduleResolution Bundler --strict --noUncheckedIndexedAccess --types node packages/cli/src/commands/harness.ts` | PASS, immutable Node/brocli declaration closure only                                                                                                                 |
| Installed YAML2.9.0 parseDocument of the two new YAML files                                                                                                                                                              | PASS, syntax only; no Compose interpolation/engine or workflow execution                                                                                             |
| Static Docker/script text assertions                                                                                                                                                                                     | PASS: last stage is runner, candidate runtime has no Next/Redis/nginx reference, exactly one Nitro main build, exec listener and no secret regeneration/restart loop |
| Docker/build/install/native migration/CI/listener/browser/restart                                                                                                                                                        | NOT RUN; no such execution authorized in lane31                                                                                                                      |
| Whole-product lint/type/build/native runtime acceptance                                                                                                                                                                  | BLOCKED pending frozen integrated closure and separately authorized01 validation                                                                                     |

No broad tests or new test files, environment/credential reads, Git actions, nested agents, provider calls, Docker/CI executions or protected output changes. Every startup/deployment command above describes prepared future source, not an executed operation or permission grant.

## Reviewed fix lease — exact paths before edit

Reopened only `Dockerfile`, `scripts/build-nitro-candidate.sh`, `scripts/run-nitro.sh`, new `scripts/migrate-nitro.mjs`, and this existing handoff. All other31 artifacts remain frozen. Install Bash solely in `nitro-builder`; replace candidate export-only migration startup with an actual awaited invocation of the verified frozen SQLite/PostgreSQL exports. The new wrapper uses their real PersistenceConfig shapes, explicit packaged migration paths, nondestructive fresh/existing SQLite admission and no logger/demo/default secrets. Unsupported configuration, disabled migrations, missing/wrong exports, migration rejection or close rejection must prevent listener startup. No DB/backend/config/seed/schema/manifests or default legacy stage edits, runtime/SQL/build execution, tests, child agents or Git operations are authorized. Exact installed esbuild/Bun built-in support is checked read-only before any candidate build command changes; static checks will not import/evaluate the wrapper or application graph.

### Reviewed fix implementation — frozen return

- `Dockerfile`: `RUN apk add --no-cache bash` is added only inside `nitro-builder`, before its Bash command. Candidate runtime copies the new source wrapper to `/app/scripts/migrate-nitro.mjs`. The entire before Dockerfile is reproduced byte-for-byte by removing these exact two lines; default legacy stages are unchanged.
- `scripts/build-nitro-candidate.sh`: compile the same `packages/db/migrations/{sqlite,postgresql}/migrate.ts` entries to their existing `migrate.cjs` output paths using installed/declared esbuild0.28.2. The explicit `--external:bun:sqlite` is required because the genuine current SQLite driver imports Bun's native builtin, while the existing DB scripts select platform=node without this external. Installed `esbuild/lib/main.d.ts` and `lib/main.js:628,716,721,733` verify platform/bundle/outfile/external syntax; no invented flags or new tool are used. These bundles now run under Bun, not Node. The ordinary CLI/Nitro script requests remain unchanged. No build was executed; final emitted native/module closure remains a production hold.
- `scripts/migrate-nitro.mjs`: a real executable ESM wrapper, run as `bun --no-env-file scripts/migrate-nitro.mjs`. It gates activation, rejects disabled migrations/non-Bun execution/absent DB_URL and checks the actual named export before calling it. `createRequire(import.meta.url)` loads the packaged CommonJS bundle deterministically, avoiding reliance on synthetic CJS named-namespace export detection.
- SQLite: require the existing supported DB_DRIVER label `better-sqlite3` and an explicit absolute file path; `lstat` accepts an existing regular file, and only ENOENT chooses `mode: "fresh"`. Existing input always uses `mode: "existing"`, preserving the source migration ledger validation. The runtime's real fresh open uses exclusive `wx`, so a competing file creation fails rather than truncating/replacing data. Supply the actual `{ engine: "sqlite", path, mode, migrationsFolder }`; only genuinely absent-file initialization receives `{ allowMockIntegration: false, demoMode: false }` as the supported optional second argument. Existing content gets no fresh seed callback. No unlink/recreate/copy/reset, default secrets, SQL logger or demo/mock initialization is introduced. A failed fresh file is not automatically wiped/retried on the next boot.
- PostgreSQL: require `node-postgres` and an explicit postgres/postgresql DB_URL; pass the actual `{ engine: "postgresql", connection: { connectionString }, migrationsFolder }`. Host-only environment configuration is deliberately unsupported here and fails closed rather than manufacturing connection settings. No invented seed argument, driver adapter or logger is supplied.
- Both calls use top-level `await` on the actual `migrateSqliteAsync`/`migratePostgresqlAsync`. Their verified frozen source opens, awaits schema/content migration and awaits close in finally. Load/export/config/open/migration/close errors propagate as process failure; no catch-and-success or explicit exit0 is added. The parent awaits that child and aborts before `exec` on any nonzero exit. `DB_MIGRATIONS_DISABLED` is no longer a bypass: there is no independently accepted schema-ready admission proof in this deployment lease. All activation/production/backend/native/restore holds remain in force.

### Reviewed fix static checks

Each check uses clean `env -i`, PATH=/usr/bin:/bin, HOME=/var/empty, explicit Node24.18.0 and no emit/cache. No wrapper/application import, build, SQL, data/environment read or listener execution occurred.

| Check                                                                                                                                                                                                                                | Result                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `bash -n scripts/build-nitro-candidate.sh scripts/run-nitro.sh`                                                                                                                                                                      | PASS                                        |
| `node --check scripts/migrate-nitro.mjs`                                                                                                                                                                                             | PASS, parsing only                          |
| Installed oxlint1.73.0 `scripts/migrate-nitro.mjs`                                                                                                                                                                                   | PASS,1file/197rules,0warnings/0errors       |
| Installed TypeScript7.0.2 `--ignoreConfig --noEmit --incremental false --allowJs --checkJs --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --types node scripts/migrate-nitro.mjs` | PASS, wrapper/Node declaration closure only |
| Exact two-line Docker inverse and unchanged frozen artifact/source SHA256 comparisons                                                                                                                                                | PASS                                        |
| Compiled export/runtime dependency resolution, actual migration/close failure behavior, schema/content conservation, native IO, built image and restart                                                                              | NOT RUN / activation HOLD                   |

The isolated JS typecheck does not compile the DB/runtime/seed graph or certify generated CommonJS export types. Configuration and invocation shapes were checked against actual frozen source, not fabricated declaration stubs. Any subsequent bundle/resolution/source failure is a blocker, not permission to substitute an implementation or start the listener.

### Reviewed fix byte freeze

| Owned code path                    | Before SHA256                                                      | Frozen after SHA256                                                |
| ---------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `Dockerfile`                       | `34c659b0db9fe223569144c2d7f53108e0f22313ad1ec95e4efcd11b2f5d8a75` | `891a668f6c4dffe80d0eeb0dd1bcafe5cdc4160164f7a59e260b24b7bfaa55e6` |
| `scripts/build-nitro-candidate.sh` | `a6a9db05801bf89b478ed53960c03dcdf0b6b0931505208744daa6dd5eb8fcbb` | `ed180c2115e71923031930f999e4d484b57435253511d0f3eb2c831dce8a6ed1` |
| `scripts/run-nitro.sh`             | `84efab7a0e1ab84de2d1a7919d3c82504f57db141e2762811896dd4aeaba3946` | `4b2eea1a0ecc4c63762290a279f174a82043438a8a8eb32e8438945f5d322df2` |
| `scripts/migrate-nitro.mjs`        | absent                                                             | `5faade75ee7127b10a628d2869e00805db0189cfa84b5350fc1984e65d4028ff` |

Frozen nonowned31 artifacts and inspected migration entrypoints matched before/after:

| Path                                           | Unchanged SHA256                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `scripts/entrypoint-nitro.sh`                  | `a4b7b61ec972fa93e805ce99969d9eac11d23e06a2420d72872ad97d8969d7fa` |
| `deployments/nitro/compose.yaml`               | `939a97155e63735603085b157dae511358ecb01341eb945ff397f5da5dee6289` |
| `.github/workflows/nitro-candidate.yml`        | `088aeea8bf41d8ffe0c3d52b072e958826bc20b7ce66e3e26a5d5a45586b2236` |
| `packages/cli/src/commands/harness.ts`         | `fdd5c75eb973c7aeec614fd05cedeed5a46eb3713eb7d5b930dd77c5ab13ffac` |
| `packages/db/migrations/sqlite/migrate.ts`     | `088edb32e420f19279b69b2b2c11b1e219dfcfbbaadc59f066bfdfea47db791d` |
| `packages/db/migrations/postgresql/migrate.ts` | `d7e171caaf2c64a11cf0b555f253950926e2391d151c71d54c1e1c3c4a2d8737` |

No manifest/script/export/lock additions are requested by this fix. Coordinator owns the independent review report. This source freeze does not authorize candidate activation, image/build/CI execution or production rollout.

## Executable invocation rereview fix — exact lease before edit

Reopen only `scripts/build-nitro-candidate.sh` lines9–10 and this handoff. Independent rereview `ses_ed478e229ffe4iLE3SithhgRxs` passed the prior Bash/migration wrapper corrections but identified the new Node-interpreter assumption. Replace only `node node_modules/esbuild/bin/esbuild` with direct `./node_modules/esbuild/bin/esbuild` on both migration build lines. Preserve every argument, Bun builtin external, activation/failure gate, other build step and frozen artifact. Installed esbuild0.28.2 `package.json` declares `bin/esbuild`; `install.js:225–235,292` replaces that path with the native executable for non-Windows/non-Yarn/non-WASM installations. Direct execution supports both that binary and the retained executable Node-shebang wrapper. No manifests, locks, Docker/run/migration bodies, dependency changes or build/container/SQL/runtime/test/Git/child execution are permitted. Validation is shell syntax and the already authorized focused wrapper lint only, plus raw source hashes; no typecheck or application execution in this reopen.

### Executable invocation correction — frozen for independent rereview

Only both executable prefixes on lines9–10 changed to `./node_modules/esbuild/bin/esbuild`. The exact inverse reproduces the prior script SHA256, proving all flags (including `--external:bun:sqlite`), entry/output paths, activation/failure gates and subsequent commands remain byte-identical. Declared `packages/db` esbuild catalog dependency, installed0.28.2 executable metadata and postinstall source were verified read-only. No collision with01 was observed: before bytes matched the reviewed freeze exactly. Docker/run/migration hashes also remain unchanged. Prior reviewed behavior and activation HOLD remain in force.

Clean environment for checks: `env -i PATH=/usr/bin:/bin HOME=/var/empty`; lint additionally sets NO_COLOR=1 and uses explicit Node24.18.0. Only shell parsing and the already authorized unchanged wrapper lint were run, not esbuild, Bun, application code, typechecks, builds, containers, SQL or tests.

Raw shell syntax command: `/bin/bash -n scripts/build-nitro-candidate.sh`; exit0, no output.

Raw focused lint command: explicit Node24.18.0 `node_modules/oxlint/bin/oxlint scripts/migrate-nitro.mjs`; exit0:

```text
Found 0 warnings and 0 errors.
Finished in 85ms on 1 file with 197 rules using 16 threads.
```

Raw static comparison/hash output:

```text
ed180c2115e71923031930f999e4d484b57435253511d0f3eb2c831dce8a6ed1  scripts/build-nitro-candidate.sh (before)
Declared esbuild catalog dependency; installed0.28.2; executable bin/esbuild verified
Exact two-prefix inverse PASS; all build arguments/gates preserved
45e42e049f86f23a93e712c43dc7aa95691c2b316eb8ec23660dd691a31b50a2  scripts/build-nitro-candidate.sh (after)
891a668f6c4dffe80d0eeb0dd1bcafe5cdc4160164f7a59e260b24b7bfaa55e6  Dockerfile (unchanged)
4b2eea1a0ecc4c63762290a279f174a82043438a8a8eb32e8438945f5d322df2  scripts/run-nitro.sh (unchanged)
5faade75ee7127b10a628d2869e00805db0189cfa84b5350fc1984e65d4028ff  scripts/migrate-nitro.mjs (unchanged)
```

Latest authoritative script freeze is `45e42e049f86f23a93e712c43dc7aa95691c2b316eb8ec23660dd691a31b50a2`, superseding only the earlier build-script after hash. No additional01 requests or permission expansion; coordinator captures the independent rereview.
