# Fifth compiler envelope — static preparation

## Result and release boundary

**Static preparation complete; ready for independent exact-envelope review, not compiler approval.** One fresh allocation is `TEMP/nitro-artifact-fifth-lrmee1zm`, where TEMP is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`. Parent/records/home/tmp are private0700; evidence files are write-once0600. `build-work` remains absent, including no symlink. HOME/TMP remain empty. No compiler approval or once-lock was created.

The supplied release and latest continuation checkpoint establish both MAIN enrollment source axes ACCEPT, AUTHHTTP-ENROLLMENT2-1 fivezero checks and all product authors terminal. These permit the measurements below only. Future Oracle exact-envelope review and explicit coordinator one-attempt compiler/config-evaluation release remain required. The fourth artifact and failed attempts remain immutable/stale; this is **RECONSTRUCTED prospective invocation**, never recovered fourth-invocation evidence or fresh-artifact proof.

## Measured prospective invocation

Physical cwd: `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono`.

Program argv, recorded but **not invoked**:

```text
/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run build:nitro:candidate
```

`records/invocation-reconstructed.json` binds that argv/cwd and the `/usr/bin/env -i` clean-launch argv to exactly five initial entries:

| Entry                   | Literal value                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| PATH                    | `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin:/opt/homebrew/Cellar/node/26.11.1/bin:/usr/bin:/bin` |
| HOME                    | `TEMP/nitro-artifact-fifth-lrmee1zm/home`                                                                    |
| TMPDIR                  | `TEMP/nitro-artifact-fifth-lrmee1zm/tmp`                                                                     |
| HOMARR_NITRO_ACTIVATION | `accepted`                                                                                                   |
| HOMARR_NITRO_BUILD_ROOT | `TEMP/nitro-artifact-fifth-lrmee1zm/build-work`                                                              |

TEMP notation in this table is expanded to the full absolute path in the receipt. No ambient application/provider/DB/data configuration, secret, NODE_PATH, native/package/interpreter override or install/network setting is forwarded. The existing root script remains `bash scripts/build-nitro-candidate.sh`; inner Bun/Vite/esbuild commands and flags are unchanged. No new Bun flag or cache/dotenv variable is proposed.

**Derived script-runner environment is not measured.** Bun package-runner-generated PATH/script metadata must be bounded to pinned installed tool/package coordinates and explicitly addressed by the future reviewer; actual derived values may only be recorded under a separately released compiler envelope, without inheriting parent secrets/configuration. Raw `.bin` link inventories are retained, not resolver execution. Root `.bin/vite` targets installed Vite; root `.bin/esbuild` targets the native Darwin-arm64 compiler, while the candidate explicitly invokes the separate `esbuild/bin/esbuild` Node helper. No Bun/Node/bash/system-utility shadow symlink was found in these inventories. This is not a completed script-runner observation.

## Tool identities and permitted version observations

`records/tools.json` retains absolute paths, physical targets, raw bytes/SHA, ownership/modes/link counts, installed manifest identities and full clean version invocations. Version processes used only the five-entry environment above, cwd at this attempt's empty tmp, no stdin, and their existing version option; all returned0. No Vite/Nitro/Rolldown CLI or esbuild JavaScript helper was evaluated.

| Tool           | Measured identity                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun            | Physical `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun`; version1.4.2; 61,884,464 bytes; SHA `35d20dd0263e5c950194434b925454fdfa9ba6e4467da960410fa05b08a7a5b5`.                                                                                 |
| Node           | Physical `/opt/homebrew/Cellar/node/26.11.1/bin/node`; versionv26.11.1; 132,848 bytes; SHA `f75a79e4c96954709a130427e452d6720b35c90318ca8293727a4c6376198453`. Required by existing esbuild helper's `#!/usr/bin/env node`; no Node24.18 runtime-parity claim. |
| Bash           | `/bin/bash`; GNU3.2.57(1)-release arm64-apple-darwin26; SHA `1db6b7ffd3996bd220869d98e21f9e05140fdc84acab3039dfd5bead40dc02ee`.                                                                                                                                |
| esbuild native | Checkout `node_modules/@esbuild/darwin-arm64/bin/esbuild`; version0.28.2; 10,590,882 bytes; SHA `10b6243df618d374bb2d5c9cfbe7052e1405f6aa4e53a6164f11a91b9f2e1384`.                                                                                            |
| esbuild helper | Checkout `node_modules/esbuild/bin/esbuild`; 9,350 bytes; SHA `183d6ead2dbc3af51aec767d5395f86fe54fbbc2d2aa8e54feb4e31d76a62f7e`; library helper also pinned, neither imported.                                                                                |

The same receipt pins `/usr/bin/env`, `/usr/bin/dirname`, `/bin/mkdir`, `/usr/bin/find`, `/bin/cp`; bash's cd/pwd/test are builtins, not extra executable dependencies. Installed manifest versions match Vite8.1.4, Nitro3.0.260903-beta, Rolldown1.1.4, esbuild/@esbuild-darwin-arm640.28.2. Native binaries were hashed only except the explicitly allowed existing Bun/Node/bash/esbuild version calls; no addon was loaded. Tool binary identities do not claim a measured whole host shared-library closure.

## Source freeze, immutable assets and conservative inventory

- `records/source-freeze.json`: **25 current accepted source witnesses** match their retained after-images: enrollment2, publication4, Auth5-after-2 five, Native6 six, Backend auth/auth-http two, K4 final plus three unchanged companions, D2 final runtime plus its explicitly named unchanged fixture witness. The fixture is hashed only as historical source identity, excluded from compiler inputs; no fixture data/test was consumed or run. Superseded Backend contracts/nativeMain and pre-followup K/D images are authenticated as historical images, not asserted current.
- All **13 prior compiler witnesses** are freshly measured. Three differ from fourth: runtime.ts/assembly.ts now match accepted enrollment, contracts.ts matches accepted publication; other ten equal the fourth historical witnesses. This does not certify the stale fourth against current source.
- Five retained AUTHHTTP-ENROLLMENT2-1 exit receipts are genuinely0; no check was rerun. Existing source-after manifests' historical review-pending flags are not treated as current review status; current source acceptance comes from the coordinator release/latest checkpoint.
- `records/migration-assets.json`: immutable authority SHA remains `a675179f6c33bf71c4fc4318da73299e2345eaa4a49b90854260fb9fe9c8d868`; all **142 raw names/sizes/SHA** match, SQLite103/PostgreSQL39. Complete tails are50/18, original runtime anchors49/17. Each source root additionally contains only its compiler entry `migrate.ts`, outside the142; the future packaged roots must exclude it. No migration/native SQL replay occurred.
- `records/inputs-manifest.json`: conservative authorized source/resource/config/manifest roots plus complete containing root installed package tree: **192,901 regular files,16,454 directories,189 symlinks;1,859,912,655 regular bytes**. Links are recorded without traversal; no unapproved external target was found. Included source roots are Backend src/server, Nitro src/public, packages and tooling/typescript, with explicit scripts/root/manifests/compiler configs. Private source bodies were raw-hashed, not interpreted or evaluated.
- `records/installed-workspace-supplement.json`: separate authorized Backend/Nitro/package-local node_modules trees add **176 regular files/14,202,727 bytes**; no external target. This avoids assuming root hoisting covers workspace-local resolution.
- `records/inputs-supplement.json` retains root tsconfig descriptors and declared patch provenance; no root tsconfig.json exists. These descriptors are conservative identities, not claims that unrelated e2e/scripts configurations are active compiler roots. `records/resolution-metadata.json` records51 source tsconfig literal-extends descriptors,45 workspace links and145 installed `.bin` links without compiler/module-resolution evaluation.
- `records/post-inventory-source-proof.json`: all25 accepted source identities remain unchanged after inventory. No old13 full-closure claim or computed-import/context identity proof is made.

Concrete scope limitations stay visible: source tests/fixtures/data/secret/user configuration and checkout generated outputs are excluded; installed dist/build are installed implementation bytes, not source build outputs. Exact excluded paths are retained. Recorded workspace links to docs/nextjs/tasks/websocket are not traversed or enrolled as source; any genuinely reached excluded/unenrolled source requires STOP and review, not automatic broadening. Nitro index.html is absent; no substitute was created. Static literal extends/metadata is not effective compiler-config evaluation. A conservative byte inventory is not an executed import graph.

## Contained-output witnesses and evidence handling

`records/fences.json` verifies physical ancestor chains, attempt/checkout/`/appdata` disjointness, private empty HOME/TMP and absent build-work. `/appdata` was metadata-only; no data directory contents or ambient configuration were read. Additional data roots cannot be invented from this scope: the coordinator must reconcile any additional already-known protected roots before release.

`records/protected-output-witness.json` retains **300** targeted existing compiled-output directory/file witnesses under Nitro .output/.tanstack plus absence/metadata for named default roots and old source CLI/migration outputs. They are preservation witnesses, never compiler inputs. No playable fixture data was read, source/default output repaired or output consumed by evaluation. Final static postflight verifies these witnessed outputs and captured source/tool identities unchanged; evidence hashes/modes are bound by the write-once receipt index.

All receipt paths are relative to the new attempt's records directory. `records/receipt-index.json` is the final hash/size/private-mode index; no build stdout/exit, compiler approval, once-lock or artifact is fabricated. Current receipts, source and protected outputs must be reauthenticated at future exact-attempt release; any input change invalidates this preparation rather than authorizing a retry or overwrite.

Only this report and the one fresh TEMP evidence allocation were written. Actions were static filesystem/source hashing/metadata/inventory and permitted clean existing-tool version calls; no application/config/plugin/module/CLI/runner evaluation, build, native addon/SQL, listener/browser/network/install/container, environment/secret/data/global-history read or nested agent occurred. No fresh artifact, compiler/runtime/native/adoption/App/production or Node24.18 parity acceptance follows.

## P1 static amendment — installed implementation resources

**Amendment prepared for bounded rereview; no exact-envelope PASS or compiler release.** The reviewer's HOLD correctly identifies a filtering defect: installed package-owned directories named data/cache/vendor are not automatically protected live data. The earlier base inventory's containing-tree claim is limited by its recorded exclusions. This append and new supplements correct that limitation without rewriting the base collector, manifests, source, tools or old evidence.

`records/exclusions-amendment-preflight.json` reauthenticates the original index SHA `6e87be35d6756da8e389cc56e87240e7838a6f6b6513a98b1ce361d30cef8e09`, all27 indexed receipts and the original report identity before append. `records/implementation-resource-metadata.json` records metadata-only examination of **91** root/workspace installed data/cache/vendor exclusions. **57** physical package-owned implementation/resource roots are enrolled; **34** workspace `packages/*/node_modules/.cache` roots remain excluded generated caches, with no contents read. No source/live-data exclusion was relaxed.

`records/implementation-resources-supplement.json` adds **1,071 regular files,92 directories,5,298,552 regular bytes**, with complete names/raw SHA/type/link/ownership/mode/current metadata, no symlink traversal or external target. Its38 owning package manifests match the already enrolled base identities. Package-owned JS/TS/declarations/maps/static JSON/lookup tables/vendor code/assets are conservatively captured; enrollment does not claim that every file is reached by this compiler.

The concrete required edges are retained with authenticated referencer identities in `records/exclusions-amendment.json`:

- `@tanstack/router-plugin/dist/esm/core/code-splitter/compilers.js:6` → router-utils; router-utils `dist/esm/ast.js:4` → babel-dead-code-elimination; its `dist/index.js:7` → Babel traverse. `@babel/traverse/lib/scope/index.js:14–15` directly requires **builtin-lower.json/builtin-upper.json**. All three helper-globals data files, including manifest-exported **browser-upper.json**, are now enrolled; no direct browser-upper import is invented from those traverse lines.
- `undici/index.js:59,62,174` references `lib/cache/memory-cache-store`, `lib/cache/sqlite-cache-store`, and `lib/web/cache/cachestorage`. Both root implementation directories and every analogous recorded nested Undici cache directory are enrolled. Their `.js` files implement cache behavior; they are not live cached responses or databases. No SQLite/native cache implementation was evaluated.
- Analogous additions include Babel compat data/core vendor, caniuse-lite/node-releases/CSS lookup data, tldts/Xterm/bidi/mux data, Drizzle/SWRV/Webpack/make-fetch-happen cache implementation, and package-distributed vendor code/declarations/assets. Every examined root, owning installed package/version, extension inventory and decision is retained, including conservative npm/node-gyp resources without running an installer/build.

Tests/fixtures/.env/secret/user configuration and genuinely generated caches remain excluded. No additional nested exclusion was encountered inside the57 enrolled roots. This is not a complete required-edge audit of other test/fixture exclusions: a concretely required installed resource there must receive a cited static owner edge and finite supplemental enrollment; none is declared unreachable merely by its directory name. No private source body interpretation or complete import-graph/probe was needed. The separately active native-driver control/report outside this closure is not enrolled or touched.

**Derived-environment clarification:** the unchanged five-entry initial environment and measured argv/tool/build recipe permit normal Bun package-script-generated PATH `.bin` additions **only at enrolled physical tool/package coordinates**, and manifest-derived npm/script metadata from enrolled manifests. Ambient parent configuration/secrets and new overrides are not permitted. Actual derived values remain unmeasured until separately authorized compilation; no pre-execution environment probe or runtime helper is required or performed by this amendment.

`records/supplement-postflight.json` binds full raw-byte/metadata reauthentication of **all base source/installed entries plus supplements**,25 accepted source witnesses,142 immutable assets, tool identities and protected-output witnesses—not merely the25 pins. Future pre/post authentication must likewise cover that full union, directory/link inventories and all immutable receipts. `records/receipt-index-2.json` binds the unchanged base index/receipts and every new amendment receipt, with this appended report's current identity separately recorded and the original report prefix preserved. Old index/report-hash fields remain historical, not overwritten.

Only new supplemental0600 receipts and this appended report were written. Build-work remains absent; HOME/TMP remain empty. No compiler approval/once-lock/streams, build, config/import evaluation, probe, CLI/runner/addon/native SQL, version rerun, network/install/container, protected source/live data/.env/global-history read or automatic retry occurred. Independent bounded rereview and explicit future coordinator one-shot release remain required.
