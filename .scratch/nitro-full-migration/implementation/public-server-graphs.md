# Selected public server graphs — frozen check handoff

2026-10-11. **B/server runtime closure remains HELD despite accepted G3 behavior. Optional D's erased runtime-prefix bundle passes, but its type closure remains HELD.** C's accepted browser evidence is preserved; no SQL/host/provider/mount work is authorized by this report.

Coordinator supplied HEAD **`c6e0d4eb0`**, including Common/Definitions/pure Auth declarations. No Git command ran here. Actual working public exports were used, not historical HEAD patches. API's three working exports are reviewed but their source targets are producer-prepared/uncommitted; their old `27f35202d` candidate needs reconciliation before later capture, **not in this task**.

Evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-public-server-graphs.BgmYW1
```

## Current G3 verification, not historical rebaseline

The following four actual files match the top CURRENT G3 hashes in `implementation/persistence.md` exactly:

```text
packages/db/runtime.ts                         07d93bba2965428d88a0255f2e4f38bad4ee193974a41ba87b3e9f5e9f86e630
packages/db/transaction-gate.ts                745d2f5e81c396d744f40307c8683d60226068c2c763fbb3cba49a1d4d17fd8e
packages/db/runtime.spec.ts                    ed55b9171f40e8826ea374be5e04ad7b5dd98b93aa0433b9859f05f441deab3d
packages/core/src/infrastructure/db/scope.ts   3ad2a7c13b3905700f02b7c05947772b4be3a9065d7625014ad3599de81bd3fc
```

User's independent behavior/standards PASS supersedes that handoff's pending-review stop wording. Its **22 tests/311 assertions and 204 compatibility files** are the producer's historical bounded evidence, **not rerun here**. No old pre-G3 graph hash was reused as current acceptance. `runtime.spec.ts` is a freeze anchor only, not a runtime graph root or executed test.

## Actual declared public runtime roots

All twelve selections resolve through existing explicit package exports to real source targets. `graphs.json` records per-root actual erased static/reexport/dynamic imports, type-only edges, native/vendor boundaries, top-level calls and exact source hashes.

| Selection                                   | Workspace prefix files / type-only edges | Result                                                                             |
| ------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `@homarr/db/runtime`                        | 58 / 73                                  | **Held**: five Common-root runtime stops                                           |
| `@homarr/db/driver`                         | 1 / 5                                    | Erased type surface, complete selected runtime closure                             |
| `@homarr/db/migrations/seed`                | 101 / 105                                | **Held**: seven Common-root runtime stops and undeclared migration dependency      |
| `@homarr/db/proxy-reader`                   | 3 / 3                                    | Complete selected erased workspace closure; injected reader, no DB opened          |
| `@homarr/db/copied-sqlite`                  | 58 / 73                                  | **Held**, same five runtime stops as runtime                                       |
| `@homarr/db/trusted-hostnames`              | 1 / 1                                    | Complete selected closure, injected runtime/type projection                        |
| `@homarr/api/nitro/helpers/settings`        | 3 / 5                                    | Complete selected closure; source codec/store, SQL functions not invoked           |
| `@homarr/translation/runtime`               | 53 / 23                                  | Complete selected culture/catalog closure; existing plugin initialization retained |
| `@homarr/api/nitro/context`                 | 1 / 5                                    | Complete erased runtime closure; pure SessionUser import remains type-only         |
| `@homarr/api/nitro/contribution`            | 3 / 9                                    | Complete selected prefix; no handler registered/invoked                            |
| `@homarr/api/nitro/resources/setup-read`    | 5 / 10                                   | Complete selected prefix; genuine candidate factories not executed                 |
| `@homarr/api/nitro/routers/server-settings` | 6 / 15                                   | Factory module prefix only; no routes instantiated or mounted                      |

The union has **165 scanned workspace runtime files**, including incomplete held prefixes. The exact hash set is `runtime-inputs.json`; type-only dependencies are not silently inserted into that runtime set. No private Next/Auth/provider, trust HTTP, jobs, Stats, integrations or full API aggregate was read as runtime. Nonliteral unresolved dynamic imports would stop traversal; none occurred in this selected set. Vendor internals are separate boundaries and are bundled only for the safe group below.

Backup entrypoint is **not necessary** to identify the same public copy engine, so archive/crypto/restore graph is intentionally excluded. No real archive, copy, migration, seed or driver factory ran. Stage P catalog/backing handshake remains plan-only.

## Exact remaining runtime stops and producer scope

All seven sites import **`@homarr/common` at runtime**. Guards stop before resolving/loading that legacy root; no stub, alias, externalization or consumer-side repair is used.

| Frozen source                                                              | Line / actual symbols                                    | Narrow producer proposal, not allocation                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/db/schema/sqlite.ts`                                             | 31: `defaultByteUnitSystem`                              | DB owner may propose same-source public `/number` import                  |
| `packages/db/schema/postgresql.ts`                                         | 43: `defaultByteUnitSystem`                              | Same; both physical schema declarations remain represented                |
| `packages/db/collection.ts`                                                | 6: `objectEntries`                                       | DB owner may propose existing `/object`                                   |
| `packages/db/migrations/custom/0000_release_widget_provider_to_options.ts` | 3: `createId`                                            | Verify actual ID helper public seam before allocation; no invented export |
| `packages/db/migrations/custom/0004_unify_sections_and_gutters.ts`         | 4: `createId`                                            | Same ID seam; retain genuine migration logic                              |
| `packages/db/migrations/seed.ts`                                           | 3: `createId`, `generateResponsiveGridFor`, `objectKeys` | Verify ID/grid seams; existing object port is only part of this import    |
| `packages/db/queries/widget-placement.ts`                                  | 3: `createId`                                            | Same ID producer seam                                                     |

`stops.json` retains exact current source hashes/symbols and ownership for all sites. Root imports are stops themselves, **not proof that all of their downstream legacy environment/Next/logger/crypto code was traversed**. Those forbidden tails were not read or evaluated. Source owner needs a separate explicit narrow cleanup/declaration allocation followed by a new exact graph check; this task does not repair or certify those tails.

An additional actual dependency ownership failure is recorded: **`packages/db/migrations/custom/0004_unify_sections_and_gutters.ts` imports `zod/v4`, but DB declares neither runtime nor development `zod`**. Installed/hoisted availability and passing typecheck do not substitute for a direct declaration. No manifest/lock fix was made. `ownership.json` inventories declared dependencies and whether they are runtime or development fields; declaration-only ownership is not wholesale graph acceptance.

The seed prefix includes real source queries, collection, physical schemas and **37 custom-widget/core/JSX analyzer/catalog source files**, including bundled widgets, options/security/request schemas, placement and assistant-authoring policy helpers. Their names do not imply provider calls: these source definitions were parsed, not invoked. All reachable files are in the graph hash set; none was secretly externalized. Both runtime and seed reach custom migrations and the tracked facade. `definitions/src/docs/index.ts:10` contains a **deferred** environment read in a function; it was recorded, not called or described as literally environment-free.

## Driver/facade cycles and initialization limits

`cycles.json` records actual edges through DB index/runtime/collection and Core driver barrels. `packages/db/index.ts` reexports runtime/copy, owns the tracked AsyncLocalStorage facade and creates its `Proxy` at module definition. Its `currentDatabase()` refuses use without active tracked admission; no configured DB/client is created there. This is a real cycle, not eliminated by declaring the narrow runtime export.

Core DB barrel statically exposes both SQLite and PostgreSQL owner factories and scope; graph traversal retains both driver modules. Module/factory definitions are not opening a pg pool or Bun SQLite connection. Native `node:*` and `bun:sqlite` are explicit source boundaries. No whole-closure claim of “SQLite-only” or “zero side effects” follows: source schema metadata, Day.js plugin installation and facade objects remain module initialization. Actual SQL opening/admission/drain behavior is not exercised here.

## Guarded offline server bundles

Temporary entries only namespace-reexport actual public leaves. Bun **1.4.2**, target **bun**, ESM/splitting/minified, **`packages: bundle`, `external: []`**, only production `process.env.NODE_ENV` define. No fake secret/env DB configuration, UTC default, context/principal/resources, app/provider composition or SSR is supplied.

- **`safe-public` passes**: nine complete-root selections above, **68 loaded workspace files / 410 metadata inputs / 106 outputs**. Entry **322,336 bytes**, total **11,503,437 bytes**. These are uncompressed validation artifact sizes, not a performance benchmark or future tree-shaken host size.
- **144 emitted chunk imports** resolve to owned output files. No bare vendor/workspace external is emitted. The only emitted native boundary is **`crypto`**, a genuine Node builtin used by the setup claim helper; recognized against actual `node:module.builtinModules`, not treated as a vendor external. Source scans separately list all builtins from blocked SQL prefixes.
- **`sql-held` genuinely fails** before the seven forbidden Common-root imports can be resolved/loaded. No successful runtime/seed/copy bundle or size is claimed. `bundles.json` preserves the thrown BuildFailure and exact stops.
- All actual loaded workspace source hashes and successful output hashes are checked. Bundles are never imported/executed. Raw metafile is retained. An initial harness assertion rejected unprefixed native `crypto`; `bundle.log` preserves that harness failure, and the corrected builtin-recognition validation does not suppress any source failure.

## Actual strict type closure — B passes, optional D fails

Installed native TypeScript 7.0.2, explicit Node/Bun/React declarations, no emit or diagnostic filtering. Both commands use:

```text
--ignoreConfig --noEmit --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --esModuleInterop --resolveJsonModule --allowArbitraryExtensions
--noUncheckedIndexedAccess --experimentalDecorators --types node,bun,react,react-dom
--pretty false --listFiles
```

- **B command, exit 0**: explicit roots are DB runtime/driver/seed/proxy-reader/copied-sqlite/trusted-hostnames, API settings helper and translation runtime. **1,977 compiler-listed files / 182 workspace reads**, zero diagnostics. This does not clear the runtime Common-root stops or missing direct dependency.
- **D command, exit 1**: explicit roots are API context/contribution/setup-read index/server-settings factory. **3,904 compiler-listed files / 469 workspace reads**; the broadness is the actual inferred type tail, not selection of a full API/provider runtime root. It is **not accepted**, not silently narrowed or reconfigured to pass.
- D reports **five genuine UniFi diagnostics**: `unifi-controller-integration.ts:16,17` TS7016 missing `@homarr/node-unifi` declarations; `:55` TS7006 `site`; `:189` TS7031 `cookies`; `:263` TS7006 `health`. Raw complete logs and text remain in `types.json`/`types-d.log`; no installed types mapping, stub, suppression or foreign source fix was added.

All workspace compiler paths and compiler-only paths outside runtime are enumerated in `types.json`. Common **FlattenError/DeviceType imports are erased runtime types**, but the Common/server type barrels pull Next and further API/widget/integration metadata typing into D. These compiler reads do not evaluate any private runtime/provider or accept those sources as frozen runtime. Pure SessionUser leaf remains the current accepted context type edge; its old Auth root was not restored. `skipLibCheck` is the preexisting declaration-file policy, not source error suppression. Both logs include real Bun declarations; there are no missing-`bun:sqlite` bypasses.

Twelve explicit selected frozen roots report **7 warnings and 0 errors** in retained `lint.log:65`; all seven concern existing seed `SuperJSON.stringify` calls. This reporting correction follows independent review; no source or retained check artifact was changed or rerun. Read-only formatting check **fails on existing `packages/db/migrations/seed.ts`**; no formatter write was performed. No tests, metadata suite, both-engine SQL or whole-product checks ran.

## Artifact identities / final preservation

```text
graphs.json         b9323a1995195d3b3f023a23f33d0e8c970f7f72c29c2ff372e0c3d9a4331154
runtime-inputs.json 87a5b4eab2ba3765bbf6a50b68ec6146ddbfe938161b3c2c7119bb3e086a2baa
stops.json          d4242998e92115d284111433fd745b42c7848d2f039e94ad66295b823c11ce06
ownership.json      f4ef83d8370e09a4c9704c7cdfa1b9a86cca0f974e1d0630a0d85cf188486577
cycles.json         7d7a54c97693f4bde3635468ba4dd88361c39454056238caff7b5642292b49fb
bundles.json        f84cc32366769ed00f32e0bf35265f026fbff7927cccb43d9588b1406f082536
types.json          e5caf2ec7f51415ebc7b42b868e891583fc09ee0cf344c339b033bc7266b5cff
types-b.log         fef9db4a5979970c62a5b4c7e1f4bd3cf106a6328a5015a9a550d369f608229a
types-d.log         8070b7d1d712871c830fc24d40d83a1521b31c07cc11fba11192d3b6f3a44f80
```

Final guard compares 165 scanned runtime inputs, four G freeze anchors, **44 manifest/lock inputs** and **34 prior browser artifact/handoff files**, plus every successful output. No source drift. Coordinator may commit identical frozen bytes during these checks; source identity, not historical Git/index bytes, is the preservation contract. No Git inspection or mutation was performed. P49 asset identities remain producer evidence, not a fresh all-asset/copy-catalog acceptance here; **P50 must revalidate actual assets/catalog before final host proof**.

All Bun commands use **`--no-env-file`, `env -i`, private HOME, explicit PATH and owned config**; existing local dependencies only, no install/network. Only this report and owned temporary graph/bundle/compiler artifacts were written. No source/manifest/lock edits, factory/module execution, SQL, archive, host build/SSR/hydration/provider, tests, credentials/.env/current data, browser/listener/3000/3100/3200/3210/container/service, nested agents, Stage P mutation, staging or commit.

**Return decisions:** B held on exact runtime/dependency stops; C's browser acceptance retained but actual host waits for B and separate allocation; D separately held on actual SQL/admission proof plus its compiler-only diagnostics. G3 acceptance is preserved, not reopened by unrelated legacy imports. No actual SQL host, private/all-auth engine, Stage P, complete product or live restore acceptance is claimed.
