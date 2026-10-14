# Production request lifecycle — frozen two-file amendment

2026-10-11. **Implemented and focused checks PASS; independent review required. Not accepted for preview consumption, production mounting or authenticated producer dispatch.** Coordinator-supplied lease records Oracle `ses_ed49054b8ffehaf3xm38SFW6J4` approval, explicit01 acknowledgement and completed/frozen current -g input capture. This worker did not modify or consume an existing preview/buildhost copy.

## Exclusive source change

- `packages/contracts/src/request.ts`: `RequestServices.resolvePrincipal` now receives `Pick<RequestContext, "request" | "signal" | "requestId" | "onDispose">`.
- `apps/backend/src/server/application.ts`: one request-owned `onDispose` function closes over the existing disposer list before the first principal await. The same function is passed to `resolvePrincipal` and assigned directly to the eventual `RequestContext.onDispose`.
- `disposeRequest` sets `disposalStarted = true` synchronously before entering the existing asynchronous cleanup body or iterating disposers. Subsequent registrations throw `Error("Request disposal already started")`, including registrations attempted by a disposer, reentrant callback or an aborted request's cleanup. Registration before disposal starts remains allowed; abort alone does not silently discard an acquired cleanup obligation.

Existing reverse-order awaited cleanup, cleanup promise reuse, per-disposer error reporting, memo clearing, completion and active-request accounting are unchanged. Principal resolution failure and setup failure still reach the same request cleanup even when no full context was constructed. Successful response-body consumption, cancellation and abort retain the existing request ownership paths. Effects, response finalization, stream retention and shutdown sequencing are untouched. These are source preservation observations, not newly executed runtime/race proofs.

`Principal` is byte-for-byte unchanged. No lease token, counter, password, profile or private authority field was added to public contracts. No new dependency, assertion, suppression, comment, producer or substitute cleanup capability was introduced. `resolveSetup`, authorization, routes, native/private mounts, runtime composition, host/config/manifests and frontend were not edited.

This new handoff path was verified absent before source edits and again immediately before creation; no existing handoff was overwritten.

## Frozen source identities

| File                                     | Before SHA-256                                                     | Amended SHA-256                                                    |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/contracts/src/request.ts`      | `1e02663a723b7173ee4a25bc9bd7628a001f399fabd5fc6f42e39d455aa7d33c` | `72d2095f2647a83f3be0faf00793dadd09fa067bb8b4b6f10767820dd752cce3` |
| `apps/backend/src/server/application.ts` | `ec5b19fdf29b0ffb6fa19afd84f2870e64e04809d0106da498e8b79e24e83c7c` | `719f40dc1ec1a6f420c1fc9adbe9036327f3aadad1d7018b4dd0ede468a8abd1` |

Amended identities matched physical capture and post-check source hashes. Exact unified amendment: `exact-amendment.diff`, SHA-256 `f9598365d360f15919b41cf9cd875274d98393f18fb2cad6c2d8c387536ca79b`, under the diagnostic directory below. Its before-images were reconstructed from the exact amendment and verified against the actual preflight SHA-256 identities; both `/usr/bin/diff` exits were 1, meaning differences, with empty stderr. No Git command was used.

## Genuine physical focused validation

Diagnostic directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/production-request-lifecycle.eH9IoN`

Check CWD: that directory's `/physical` child, a fresh physical copy, not an existing preview or a symlink into the checkout. All 1,044 copied/generated input files and their parent directories were made non-writable before checks; executable bits were retained where needed. Before/after checks found zero symlinks, changed inputs, new files or emitted/cache files. Physical input aggregate SHA-256: `3896d9416f9071521bf8c13a0d507e0086fc2ebb854ce67df709e8943ac42981`.

Actual declared dependencies were read before code: backend declares `@homarr/contracts: workspace:^0.1.0`; contracts exports the real request/contribution sources and declares TypeScript. The new code uses only existing request-owned state and built-ins. Installed tool metadata was inspected: TypeScript/platform compiler `7.0.2`, oxlint/platform binding `1.73.0`, `@types/bun` and `bun-types` `1.3.10`, `@types/node` `24.13.3`, `undici-types` `7.18.2`. These installed packages were physically copied without installation or scripts. The genuine contracts package manifest/source was physically materialized at `node_modules/@homarr/contracts`; no alias, shim or fabricated declaration was used.

Root and backend lint configurations were copied unchanged; backend extends the root's built-in-plugin configuration. Contracts tsconfig was copied unchanged. A snapshot-only `apps/backend/tsconfig.request-lifecycle.json` extends the unchanged backend tsconfig, retains its actual strict/Bundler/ES2023/DOM/Bun options and existing `skipLibCheck`, selects only `src/server/application.ts`, and explicitly disables emit/incremental/composite. No repository config was edited.

All execution used `env -i`, `CI=true`, `NO_COLOR=1`, disposable `/home` and `/tmp` children of the diagnostic directory, and PATH exactly:

`/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin:/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin`

Actual version gates returned Bun `1.4.2` and Node `v24.18.0`, both exit 0 and empty stderr. No inherited credentials, `NODE_OPTIONS`, env-file loading, fallback or installation occurred. Checks ran foreground within a single 120-second tool timeout, without build/test/runtime evaluation of application source.

| Check             | Exact command from physical CWD                                                                                                 | Exit | Result                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| Application lint  | `node node_modules/oxlint/bin/oxlint --config apps/backend/.oxlintrc.json apps/backend/src/server/application.ts`               | 0    | 0 warnings/errors; 1 file, 197 rules              |
| Contracts lint    | `node node_modules/oxlint/bin/oxlint --config .oxlintrc.json packages/contracts/src`                                            | 0    | 0 warnings/errors; 2 files, 197 rules             |
| Application types | `node node_modules/typescript/bin/tsc --noEmit --incremental false --listFiles -p apps/backend/tsconfig.request-lifecycle.json` | 0    | No diagnostics; 205 real source/declaration files |
| Contracts types   | `node node_modules/typescript/bin/tsc --noEmit --incremental false --listFiles -p packages/contracts/tsconfig.json`             | 0    | No diagnostics; 65 real source/declaration files  |

Application compiler source closure was exactly `apps/backend/src/server/application.ts` plus the actual `node_modules/@homarr/contracts/src/{request,contribution}.ts`; remaining inputs were real copied standard/Bun/Node/Undici declarations. Contracts compiler source closure was exactly `packages/contracts/src/{request,contribution}.ts` plus standard libraries. Every returned compiler filename stayed inside the physical snapshot. This validates the amended public-host request lifecycle/contracts only, not the host singleton, composition, producers, native mounts, full backend or frontend graph.

## Raw evidence and unchanged neighbors

Files under the diagnostic directory:

- `bun-version.stdout.log`, `bun-version.stderr.log`, `node-version.stdout.log`, `node-version.stderr.log`, `preflight-status.log`: actual version gate and original source-capture status, exits 0.
- `source-pre.json`, `source-amended.json`, `source-post.json`: complete captured pre/amended/post SHA-256 mappings for 26 repository files, including the two owned sources.
- `snapshot-inputs.json`: every original physical input path, destination path and hash, plus the generated focused-config hash.
- `snapshot-capture.stdout.log`, `snapshot-capture.stderr.log`: capture verification, no mismatches; stderr empty.
- `application-lint.stdout.log`, `application-lint.stderr.log`, `contracts-lint.stdout.log`, `contracts-lint.stderr.log`: actual raw linter output; stderr empty.
- `application-typecheck.stdout.log`, `application-typecheck.stderr.log`, `contracts-typecheck.stdout.log`, `contracts-typecheck.stderr.log`: actual compiler file lists; no diagnostics, stderr empty.
- `validation-commands.log`, `validation-status.log`: all four exact commands and exits 0.
- `postcheck.stdout.log`, `postcheck.stderr.log`: actual post-check proof; source, snapshot, original-dependency and inventory verification exits 0; stderr empty.
- `exact-amendment.diff`, `diff-status.log`, `source-before/`: exact two-file diff and preflight-hash-verified before-images.

All 24 captured neighboring repository files remained byte-identical. Coverage is all other files in `packages/contracts/src`, `apps/backend/src/server` including its actual runtime-composition directory, and `apps/backend/server`, plus root `package.json`, `bun.lock`, root/backend lint configs, backend manifest/tsconfig/Nitro config and contracts manifest/tsconfig. Directory membership was also unchanged. Neighbor aggregate SHA-256: `01cc41f24c23dc9dff7719024cb5d670c7f23ae656a9d155262d5b9d87c7ef5e`. Original installed dependency bytes also still matched all physical-copy hashes after checks. This is bounded neighbor evidence, not a whole-workspace freeze claim.

## Hold and next action

**Freeze this exact two-source amendment for independent behavioral and standards review.** No reviewer or producer session was dispatched. No tests/new test files, build, server, SQL, provider/browser calls, install, Git operation, nested agent, protected listener, current-data access or existing output modification occurred. Repository writes were only the two allocated source files and this new handoff; additional writes were confined to the unique diagnostic directory.

No acceptance, live cleanup execution, authenticated authority, physical producer settlement or production parity is claimed. Existing accepted live/buildhost bytes were not touched. Explicit01 must not consume the amendment in the current preview, and authenticated producer dispatch remains held until independent acceptance and a separate authorized join.
