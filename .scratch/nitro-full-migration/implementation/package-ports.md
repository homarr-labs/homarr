# Accepted package ports: declarations only

2026-10-10. COMPOSITION dependency/export delivery after coordinator commit `46091f602139f7a3797d3357462fb75effdd5dbe`. All ports remain **unmounted**. No app DI, provider, route, private authority, host, subsystem source, tsconfig, schema, SQL execution or coordinator ledger was changed. Trust HTTP/certificates and persistence/copy remain HELD; Q16 is still unanswered. Neither full UI/auth/runtime/SQL parity nor backup acceptance is claimed.

## Owned files and exact ports

Only these eleven manifests, `bun.lock`, and this handoff were written in the checkout:

| Manifest                                | Added export → source                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                          | No export; catalog-only Axios `1.20.0` and use-intl `4.13.1` additions. Root build/dev/start and other configuration remain unchanged.                                 |
| `packages/translation/package.json`     | `./standalone` → `./src/standalone/index.ts`; `./standalone/client` → `./src/standalone/client.tsx`; `./standalone/server` → `./src/standalone/server.ts`              |
| `packages/auth/package.json`            | `./nitro/policy` → `./nitro/policy/index.ts`; `./nitro/verifiers` → `./nitro/verifiers/index.ts`; `./nitro/session-primitives` → `./nitro/session-primitives/index.ts` |
| `packages/api/package.json`             | `./nitro` → `./src/nitro/index.ts`                                                                                                                                     |
| `packages/redis/package.json`           | `./state` → `./src/state/index.ts`                                                                                                                                     |
| `packages/common/package.json`          | `./object` → `./src/object.ts`                                                                                                                                         |
| `packages/integrations/package.json`    | `./runtime` → `./src/runtime/index.ts`                                                                                                                                 |
| `packages/core/package.json`            | `./infrastructure/logs/runtime` → `./src/infrastructure/logs/runtime/index.ts`                                                                                         |
| `packages/cron-jobs-core/package.json`  | `./runtime` → `./src/runtime.ts`                                                                                                                                       |
| `packages/cron-job-status/package.json` | `./runtime` → `./src/runtime.ts`                                                                                                                                       |
| `packages/cron-jobs/package.json`       | `./runtime` → `./src/runtime.ts`; `./sql` → `./src/sql.ts`; `./runtime-bodies` → `./src/jobs/runtime-bodies.ts`                                                        |

Six direct dependency declarations:

- Translation: `use-intl: catalog:`, resolving exactly `4.13.1`; the existing client facade is retained and now has a direct engine dependency. No extra standalone catalogs/types subpaths or legacy server/request/middleware rewrites were added.
- API: `@orpc/client` and `@orpc/server`, each exact `2.0.0-beta.43`, matching the already accepted installed app pins. No auth-engine, OpenAPI, adapter or router registration was added.
- Core: Axios and Undici through the catalog, resolving `1.20.0` and `7.29.1`. Existing Core HTTP source imports both; declaring them fixes dependency ownership, **not** acceptance of the held factory. No HTTP/certificate/DB runtime export was added.
- Integrations: Axios through the catalog, resolving `1.20.0`, required by existing base/provider imports. Undici was already direct. No current integration source imports SuperJSON; its future injected codec does not justify adding an unused dependency. Existing Core/API/Redis SuperJSON `2.2.6` declarations remain unchanged.

Axios was installed but **not actually in the root catalog**, despite the request's shorthand. Its approved exact catalog entry was added. use-intl was already installed transitively through next-intl and is now correctly direct. All six versions plus SuperJSON `2.2.6` were verified against installed package manifests. No npm package resolution/version was upgraded.

## Lock ownership and snapshots

Owned evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-package-ports.xK8dcL
```

`before/bun.lock` and the eleven `before/**/package.json` snapshots were captured before edits. `before.json` records their SHA-256 hashes, HEAD and index location/hash. `after.json` records every owned manifest's before/after hash, exact export/dependency additions, installed versions and semantic lock checks. The original pre-install snapshot remains retained separately.

The new-step delta against the current working baseline is **12 inserted lines, zero deletions**:

- Six workspace dependency lines.
- Two catalog entries.
- Two package keys, each with its separating blank line: `env-runner/crossws` and `nitro/crossws`, copied exactly from new HEAD. These restore committed metadata missing from the separate working experiment lock; they do not change root crossws or existing locations.

All **2599 pre-step working package entries** are unchanged. The experiment workspace, its package keys, root `crossws@0.4.15`, `h3/crossws` and original experiment Zod/OpenAPI entries remain present and unchanged. No working lock was reset to HEAD. The only changed pre-existing metadata is the six approved dependency fields plus the two added catalog fields.

For a future coordinator-owned declaration commit, `commit-declarations.lock` is a separate **HEAD-plus-declarations** view, preserving all **2590 committed package entries** and omitting the working experiment extras. `staged-declarations-lock.patch` changes only the six workspace dependency fields and two catalog fields: **8 additions, zero deletions, no package-entry changes**. `git apply --cached --check` passed against the empty index; nothing was staged. Do not stage the whole working lock or apply the historical foundation patch again.

Hashes:

```text
pre-step working lock          c54c7275e6ef5a56de90fa9891a1d71f8d5f353570088af094fe2d29eca00118
current working lock           9ede0bc67c1cb32fcf0a704e58ffe9584e5d40ba0f8c38972e731e9ceb892bb7
HEAD-plus-declarations lock     4a8ed77bd65d37ef79ea1656bce709e719cc5de747a60e3bc3d727964c99c7f5
working-owned-lock.patch        8e5a337e84cd5706716dc694116469ff655875da782d8df95aa1d15e1c17cadb
staged-declarations-lock.patch  454e67cfb205a3a568d43650aee419c9e36412c8e116e9ce4751b671dbc6ffee
owned-manifests.patch           9dfb074dfc7610499ecc3f7840842eb673836d16e1610580a3897193d6f1ca60
original pre-install snapshot  3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210
unchanged post-commit index     fcfd9de92068a6bcb285a474c7003d82d28291a759dba9ce71b61e593bb1ae66
```

The two patch files have different bases intentionally. `working-owned-lock.patch` isolates this step from the newly captured working baseline; `staged-declarations-lock.patch` is applicable to committed HEAD without committing pre-existing experiment work. `owned-manifests.patch` contains only the eleven manifest edits.

## Executed checks and limits

Every Bun execution used `--no-env-file` and a clean explicit environment. No `.env`, appdata, credential, real SQL, provider, paid service, browser or application runtime was accessed. The only installer used the public registry/native cache, ignored scripts, and kept frozen mode enabled.

### Current full-worktree installation, not an experiment-free commit proof

From the working checkout:

```sh
env -i PATH="$PATH" HOME="$owned/home" bun --no-env-file install --cache-dir=/Users/ajnart/.bun/install/cache --frozen-lockfile --ignore-scripts
```

**Exit 0**; `frozen-working-install.log` records:

```text
Checked 2336 installs across 2321 packages (no changes) [460.00ms]
```

This validates the **current working manifest/lock view, including pre-existing experiment entries**. The current lock hash remained unchanged by installation. The earlier isolated 216-addition foundation closure was independently frozen-installed and committed by the coordinator, as recorded in `lock-commit.md`. The new eight-line HEAD-plus-declarations view is structurally verified and patch-applicable, but was **not separately frozen-installed in a new isolated copy**; do not conflate these evidence scopes.

### Scoped compiler/lint/format gates

All six compiler commands exited 0 with no diagnostics; logs are `typecheck-localization.log`, `typecheck-policy.log`, `typecheck-auth-helpers.log`, `typecheck-logs.log`, `typecheck-jobs.log`, and `typecheck-state.log` in the evidence directory:

- Translation's existing `src/standalone/tsconfig.json`, including actual catalogs and preserved client facade.
- Auth's existing policy and verifier `tsconfig.check.json` files; verifier config includes session primitives.
- Logs' existing `runtime/checks/tsconfig.json`.
- Exactly jobs-core/status runtime, jobs runtime, runtime bodies and SQL statement port, with strict/noUncheckedIndexedAccess, ES2024/Bundler, node types, skipLibCheck and no emit.
- Exactly Redis state index and common object utility, with the same explicit CLI compiler options.

Commands use `bun --no-env-file run node_modules/typescript/bin/tsc`, with no incremental output or tsconfig changes. Existing author tests included as compiler roots were **not executed**. No new tests or broad suites were added/run, and no Next/full-repository build/typecheck was run.

Scoped oxlint covered these frozen families plus the explicit frozen API spine/index and seven integration runtime files: **60 files, zero warnings/errors** (`scoped-lint.log`). This did not walk active group/provider/Stats source. Format checking covered **only the eleven edited manifests**, all passing (`manifest-format.log`); no subsystem source was formatted. `git diff --check` on owned tracked files passed.

Full API index typechecking/bundling is deliberately deferred: its existing barrel reexports `routers/group`, whose identity work is active. No API broad check/security check or active router source inspection was performed. Full integration runtime typechecking/bundling is also deferred because `executor` imports the lazy base creator, which opens the active native provider/Stats graph. The accepted runtime declaration and focused lint are not proof of that unfinished graph.

### Pure runtime-input and localization browser graph

`graphs.ts` statically strips type-only imports and scans runtime import edges without importing/executing workspace modules. `graphs.json` records source SHA-256 inputs, resolved public paths, external libraries, protected boundaries and relative edges; `graphs.log` records the summary.

- All sixteen new public paths and the existing translation client facade resolve through the actual manifests.
- Standalone/core/client/server localization, auth policy/verifiers/session primitives, Redis state/common object, logs and jobs runtime/statement ports show no workspace Next/auth-provider/legacy env/SQL-global runtime import.
- Auth verifier graph includes the real pure password module and public validation schemas, not a new schema copy. The library `@auth/core/errors` remains an external class import, not an invoked auth engine.
- API scanning is limited to the five frozen spine modules (`context`, `contribution`, `errors`, `procedure`, `port-map`); the public barrel's active router graph is explicitly outside the audit.
- Integration scanning stops before `base/creator.ts`, records that exact blocked edge, and does not claim a complete clean provider graph or inspect active Stats/provider implementations.

An in-memory Bun browser build (`write:false`) uses actual resolved standalone client/core and existing client-facade entries. **Exit 0, 110 in-memory outputs, 205 recorded inputs, all 36 `src/lang` catalogs included, no Next/next-auth/next-intl or auth/DB/core workspace input, no build diagnostics**. Four existing Mantine React Table localization JSONs also enter through the reused locale mapping; these are not additional application catalogs. The initial counting helper included those four table JSONs; its metric was narrowed to the actual `src/lang` family without changing source or hiding inputs. Browser inputs remain fully recorded. This is a pure bundler/input graph, **not** hydration, locale switching, provider mounting or whole UI acceptance. No bundle was written to app assets and no browser was used.

## Type requirements and exact remaining producer/consumer joins

1. **Jobs cross-package edge:** `packages/cron-jobs/src/runtime.ts:1–2` still imports types and `createJobsRuntime` from `../../cron-jobs-core/src/runtime`. The source owner must replace both with `@homarr/cron-jobs-core/runtime` before final consumption. No producer file was edited here. Same-package body/SQL imports need no new competing module.
2. **Bun declarations:** shared base tsconfig explicitly limits `types` to `node`. Core/DB's `bun:sqlite` modules therefore require reviewed **project-local** Bun declaration visibility. Installed/accepted app `@types/bun` and `bun-types` are `1.3.10`; runtime is Bun `1.4.2`, not a claim of complete SDK alignment. Recommend reviewing a direct local `@types/bun` declaration in each actual Bun-SQLite owner plus explicit local `types: [node, bun]`, rather than adding root-wide globals/shims. The integration runtime's existing dedicated config already selects `node,bun-types`, but relies on installed transitive types. No additional type dependency, tsconfig, ambient shim, assertion, fetch mock cast or global suppression was added. Source owners retain the held factory/copy and existing Beszel cast joins; their graphs were not validated by these pure checks.
3. **API aggregate:** freeze/accept active group identity work before compiling/consuming the aggregate `@homarr/api/nitro` barrel. Real current authority, setup resources, SQL repositories and response-effect/disposal adapters remain consumer joins. The declaration alone registers no procedures.
4. **Integration graph:** contract native creator/Stats wrapper and held trust-resource edges before full runtime compiler/bundle/host consumption. Provide real current policy, coherent saved configuration/secrets, fenced session backing and an explicit codec. If the producer actually imports SuperJSON in that future graph, request the direct declaration then; an injected codec is not an import today.
5. **Localization:** host must join the explicit snapshot and accepted provider order, serialization/hydration, locale routing/persistence, draft-preserving switching and RTL/time basis. Legacy translation server/request/middleware roots were not converted by declaring standalone ports.
6. **State/logs/jobs:** physical atomic backing, SQL statement execution, clocks, source authority, retention, lifecycle drains and same-listener transport remain unresolved integration gates. Jobs r3 declarations do not accept the held icon-sync behavior or execute SQL/analytics/ping.
7. **Auth:** real provider enablement, injected repositories, cookies/origin/CSRF, renewal/revocation and Q16 remain outstanding. No JWT, fallback authority, bypass or native Credentials-database workaround was selected.

## State left for coordinator

Only manifests/lock and this handoff changed in this lane. UI manifest and all `apps/nitro` source/config/assets remain untouched. Index remains empty and its post-commit hash matches the snapshot; no staging/commit/branch switch/worktree or nested agent was used. Other source owners' active work was neither reverted nor staged. Original and new-step snapshots, delta artifacts, helper scripts and check logs remain in owned temporary storage for review; no disposable installer runtime or listener was created. Accepted built server **PID 89683**, **127.0.0.1:3200**, remains running without stop/restart; 3000/3100, the person browser and real data remain untouched. Stop here: no app/package-host consumption is implied by these declarations.
