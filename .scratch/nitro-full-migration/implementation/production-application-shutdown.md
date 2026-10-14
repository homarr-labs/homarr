# Production application shutdown — frozen exact repair

2026-10-11. **Focused application lint/types PASS; independent review pending.** This sequential shutdown-only lease follows the accepted lifecycle amendment. Coordinator records Oracle `ses_ed49054b8ffehaf3xm38SFW6J4` approval. Sole source write: `apps/backend/src/server/application.ts`; sole new repository handoff: this file. This handoff path was verified absent before editing and again immediately before creation.

## Exact change and preserved behavior

`dispose()` remains non-async. It first returns the existing `disposal` promise when present. Otherwise it creates the genuine built-in `Promise.withResolvers<void>()` already used by this file, assigns its promise to `disposal`, then directly invokes the unchanged original async shutdown body. That body's returned promise is connected to both real `shutdown.resolve` and `shutdown.reject` handlers; its rejection is handled and propagated to the published shutdown promise.

The promise is published before `lifetime.abort()` can synchronously invoke an abort listener. Reentrant `dispose()` therefore returns the identical promise rather than starting a second contribution-disposal traversal; reentrant `fetch()` sees the existing disposal fence and returns 503. The original body is invoked directly, not scheduled through a microtask: abort remains synchronous during the first dispose call. Its active-request join, readiness join, reverse contribution cleanup and shutdown error reporting are unchanged. These are source reasoning observations, **not an executed runtime reentry proof**.

The exact diff changes only the shutdown wrapper at the original lines 166–179. Request cleanup, shared `onDispose`, readiness implementation, principal/context/contracts, composition, host/config, routes, manifests, frontend and native producers are unchanged. No helper, capability substitution, cast, suppression, `any` or comment was added.

## Source freeze and exact diff

| Identity                                                             | SHA-256                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Required application beforehash, verified before any edit            | `719f40dc1ec1a6f420c1fc9adbe9036327f3aadad1d7018b4dd0ede468a8abd1` |
| Frozen amended application                                           | `e3cad44891bb73f678da2f22ec0a1d14319bba646e10eff4a086a1d0f27dc904` |
| Read-only `packages/contracts/src/request.ts`, unchanged             | `72d2095f2647a83f3be0faf00793dadd09fa067bb8b4b6f10767820dd752cce3` |
| Accepted `implementation/production-request-lifecycle.md`, unchanged | `aeff2bc2e57bf8aa58a7a64bac5728decb199e2a48ff54b688a08080a9e7060f` |
| Exact one-file unified diff                                          | `c81289dc69558aff23b1c839c1e0b012374923a86cabdeb972c51355bf0aee78` |

Actual accepted pre-edit application bytes were copied to the new diagnostic directory's read-only `application-before.ts` before editing, not reconstructed. `exact-amendment.diff` compares those bytes with the amendment using `/usr/bin/diff`; exit 1 means differences, stderr empty. A separate exact text comparison verified that replacing only the two shutdown-wrapper boundaries reproduces the entire amended source. No Git command was used.

## New genuine physical validation

Diagnostic directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/production-application-shutdown.13RGCT`

Checks ran from its fresh `/physical` child, not an existing live -g/-f or compiled/copied snapshot. All 1,044 copied/generated files and parent directories had write bits removed before checks; executables retained execute bits. No symlink, alias, shim, fabricated declaration, installation or dependency script was used. Each physical input was checked against its actual source hash before and after validation. Physical aggregate SHA-256: `8e084d82db3c789a3c74546946308a3d577952dc494aa0d7a4db6bd619d92013`.

Declared backend/contracts dependencies and actual configs were reread before code. Backend already declares `@homarr/contracts: workspace:^0.1.0`, TypeScript `7.0.2`, `@types/bun` `1.3.10` and `@types/node` `24.13.3`; contracts exposes the actual request/contribution files. Installed metadata was verified and copied for TypeScript/platform compiler `7.0.2`, oxlint/platform binding `1.73.0`, Bun declarations `1.3.10`, Node declarations `24.13.3` and Undici declarations `7.18.2`. The actual Bun declaration of `Promise.withResolvers` was located; no library or new dependency was introduced.

The physical snapshot contains unchanged root/backend lint configs and backend tsconfig. Its only generated focused config, `apps/backend/tsconfig.application-shutdown.json`, extends that real backend config and selects `src/server/application.ts`, with emit/incremental/composite explicitly disabled. Existing strict/Bundler/ES2023/DOM/Bun and `skipLibCheck` settings are retained. The real contracts manifest/source is physically copied at `node_modules/@homarr/contracts`; no repository config was modified.

All execution used `env -i`, `CI=true`, `NO_COLOR=1`, disposable diagnostic `/home` and `/tmp`, and PATH exactly:

`/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin:/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin`

Actual clean-environment version gates returned Bun `1.4.2` and Node `v24.18.0`, both exit 0 with empty stderr. No inherited credentials, `NODE_OPTIONS`, env-file loading or fallback was used. Checks ran foreground within one 120-second tool timeout.

| Check             | Exact command from physical CWD                                                                                                    | Exit | Result                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| Application lint  | `node node_modules/oxlint/bin/oxlint --config apps/backend/.oxlintrc.json apps/backend/src/server/application.ts`                  | 0    | 0 warnings/errors; 1 file, 197 rules              |
| Application types | `node node_modules/typescript/bin/tsc --noEmit --incremental false --listFiles -p apps/backend/tsconfig.application-shutdown.json` | 0    | No diagnostics; 205 real source/declaration files |

Compiler source closure was exactly `apps/backend/src/server/application.ts` and the actual contracts `request.ts`/`contribution.ts`, with real standard/Bun/Node/Undici declarations. Every listed file stayed inside the new physical snapshot. Post-check inventory found zero emit/cache files, added files, changed input hashes, symlinks or write bits. This is focused application source/type evidence, not full backend/composition/runtime validation.

## Raw logs and unchanged neighbors

Files under the diagnostic directory:

- `bun-version.stdout.log`, `bun-version.stderr.log`, `node-version.stdout.log`, `node-version.stderr.log`, `preflight.stdout.log`, `preflight.stderr.log`, `preflight-status.log`: real version/hash/collision gates; exits 0, stderr empty.
- `source-pre.json`, `source-amended.json`, `source-post.json`: complete 26-file pre/amended/post source hash mappings.
- `accepted-lifecycle-handoff.json`, `declared-tools.json`: unchanged accepted handoff identity and actual installed metadata.
- `snapshot-inputs.json`, `snapshot-capture.stdout.log`, `snapshot-capture.stderr.log`: real origin/destination/hash map, generated config hash and pre-check physical verification; no mismatches, stderr empty.
- `application-lint.stdout.log`, `application-lint.stderr.log`, `application-typecheck.stdout.log`, `application-typecheck.stderr.log`: raw lint output and compiler file list; no diagnostics, stderr empty.
- `validation-commands.log`, `validation-status.log`: exact commands and both exits 0.
- `postcheck.stdout.log`, `postcheck.stderr.log`: source, snapshot, original-dependency, inventory and accepted-handoff verification exits 0; stderr empty.
- `application-before.ts`, `exact-amendment.diff`, `diff-status.log`: actual accepted pre-edit bytes and exact one-file amendment.

Contracts stayed read-only and byte-identical. All 24 additional captured neighbors also remained byte-identical, with unchanged directory membership: the other contracts source, all other `apps/backend/src/server` files including runtime composition, backend lifecycle/plugin files, root/package manifests, lock, lint/TypeScript configs and backend Nitro config. Neighbor aggregate SHA-256 remains `01cc41f24c23dc9dff7719024cb5d670c7f23ae656a9d155262d5b9d87c7ef5e`. Original copied installed dependency bytes were reverified unchanged. The accepted lifecycle handoff was not rewritten. These are bounded captured-neighbor guarantees, not a whole-workspace freeze claim.

## Mandatory hold

Freeze this exact repair for independent behavioral and standards review. No review/producer/child session was dispatched. No tests/new test files or repository commands, runtime reentry probe, build, server, SQL, provider/browser call, install, Git operation, protected listener, current data or existing output was used or changed. Additional writes were confined to the new diagnostic directory. Existing live -g/-f, compiled/copied snapshots and old accepted lifecycle copies were not modified or rebuilt; 26/27/32 runtime inputs received no admission change.

No general shutdown, native-settlement, preview, production or authenticated-producer approval is claimed. Independent acceptance and a separate authorized consumption/join remain required.
