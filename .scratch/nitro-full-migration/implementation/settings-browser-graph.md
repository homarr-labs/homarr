# Complete selected Settings browser graph — artifact-only freeze

2026-10-11. **The selected public `@homarr/settings/context` and `/creator` runtime closure and actual offline browser bundle pass**, after the five independently accepted Definitions producer changes and accepted Common URL/query-core candidate. This is new bounded graph evidence, not a host/provider, G/server, B/C or feature-ticket acceptance claim. The previous `public-browser-graphs.md` still describes its historical guarded prefix; it and its UI/translation artifacts were read-only and were not rebuilt or rewritten.

New owned evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-settings-browser-graphs.lyYrqM
```

Only this handoff and that new temporary directory were written. No source, manifest, lock, app, provider, export or installation was edited. No Git operation, nested agent, source factory evaluation, rendering/SSR, browser/listener, current data, credentials, environment file, network, provider, container, build/restart or 3000/3100/3200/3210 operation occurred. Bundler outputs were never executed.

## Exact selected scope and runtime closure

| Actual declared public path | Actual target                       | Conservative workspace runtime files | Runtime edges | Erased/type-only edges |
| --------------------------- | ----------------------------------- | ------------------------------------ | ------------- | ---------------------- |
| `@homarr/settings/context`  | `packages/settings/src/context.tsx` | 39                                   | 52            | 24                     |
| `@homarr/settings/creator`  | `packages/settings/src/creator.ts`  | 38                                   | 51            | 22                     |

The union is **39 workspace runtime files**, all recorded with exact SHA256 in `graphs.json` and `runtime-inputs.json`. Actual Bun 1.4.2 browser TypeScript erasure precedes parsing static imports, reexports, literal dynamic imports and require expressions. Type-only/actually erased imports are recorded separately rather than walked or hashed as runtime. Nonliteral module imports would fail the probe; no selected workspace nonliteral runtime import remains. Resolution uses the declared public entrypoints and the real installed resolver, not stubs, aliases, diagnostics suppression or path overrides.

The previous blocker chain now completes:

```text
settings/context -> ./creator
settings/creator -> @homarr/validation/user
validation/user -> @homarr/definitions
definitions/index -> src/index -> all sibling runtime exports
  permissions -> @homarr/common/object
  widget-integration-map -> @homarr/common/object
  docker-integration-match -> @homarr/common/object
  release-provider -> @homarr/common/object
  integration-url-template -> @homarr/common/url
common/object -> actual @tanstack/query-core 5.101.2
```

The five accepted producer files were not modified or approximated. Definitions' whole root export chain, not just those five isolated files, was traversed. Public Common object/url/number leaves resolve to their real source. The legacy **`@homarr/common` root guard remains intact**; Common server/env, Core/G, DB, Auth, API, Redis, integrations, Next and builtin runtime specifiers/paths remain prohibited before held source load/hash. There were **zero blocked edges and zero protected runtime source hashes**. The completed bundle was also guarded on resolution and pre-read load; a server-reachable runtime would stop rather than be ignored or externalized.

Creator remains `bf76764d66046975c32838bbf28d37d73f4e8c25cbdb7273815644cb2a6ded38`. The number leaf remains `5410ff2375b6bf7ac106322646b46979a3d133f5215e11f947e265e7943e595d`, matching the previous probe's bytes. Its algorithm was not changed.

`packages/settings/src/byte-format.ts` remains `dcae24a1a65d30276ce9f4456d6acbe2cce27c5ff1168ddfb78c7fcc8ba4831e`. It is the requested **separate producer type-root only**, importing public Common number for the existing three formatters. It is not transitively reached or bundled from context/creator, and no byte-format public port was invented.

### Dormant ambient boundaries are not browser-health claims

- `packages/common/src/object.ts:17` contains deferred `Buffer.from(hashKey([obj])).toString("base64")` inside `hashObjectBase64`. It was parsed and frozen but **not called, polyfilled, repaired or certified browser-healthy**. The actual query-core package was used, not a replacement hash function.
- `packages/definitions/src/docs/index.ts:10` retains the deferred documentation helper's `process.env` branch. That function was **not called** or represented as environment-free.
- Namespace bundle generation does not execute source top-level declarations or factories. Recorded top-level call expressions are static observations, not evaluation evidence. No SettingsProvider or fake user/server context was rendered.

## Actual Bun browser bundle and complete input capture

The generated `settings.entry.ts` contains only namespace reexports of the two selected public paths. The actual build uses Bun **1.4.2**, `target: "browser"`, `format: "esm"`, `splitting: true`, `packages: "bundle"`, **`external: []`**, minification enabled and no sourcemap. Only vendor production-mode `process.env.NODE_ENV` is defined; no workspace env/config substitute is supplied. There is no bundler alias, source substitution, held Common-root removal or externalization.

Results:

| Evidence                                                   | Actual result                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Build                                                      | Success, zero build diagnostics                              |
| Workspace files loaded                                     | 39, every byte matches the conservative graph                |
| All load-observed source inputs                            | 128, each SHA256/byte size captured                          |
| Metafile inputs                                            | 126, each SHA256/byte size captured and reconciled to onLoad |
| JS outputs                                                 | One entry, **151,815 bytes**                                 |
| Actual emitted imports, including dynamic imports/requires | Zero                                                         |
| Emitted externals/unresolved chunks                        | Zero                                                         |
| Raw Bun input edges marked external                        | 17; preserved verbatim, not an emitted-external count        |

`settings.metafile.json` is the actual Bun metafile. `runtime-inputs.json` captures both **all 128 onLoad input hashes** and the **126 actual metafile input hashes**, including every actual vendor input and the generated entry. The two load-observed files absent from Bun's metafile are React's `index.js` and `jsx-runtime.js` wrapper files; they are still hashed/frozen rather than omitted. All output JS was parsed for static/reexport/dynamic/require module edges. With no emitted module imports, there are no missing emitted chunks. Splitting was enabled; this selected closure simply required no split chunks.

The 17 raw input flags include query-core root references that Bun marks external in the input graph despite bundling/pruning the relevant output. They are not silently discarded from evidence or mistaken for live imports. Output metadata has zero external edges, and independently parsed actual output also has zero externals. A namespace bundle and its uncompressed artifact size are not a host payload/performance budget.

Output SHA256:

```text
bundle-settings/settings.entry.js
5a9ca4d932d7c1eb61a642d4cca5480768d658f7a5363a21ce7951d78a6bc472
```

An initial artifact observer using an asynchronous onLoad hook produced a real public-entry resolution failure. `probe.log`/`build-failure.json` retain it. A guarded resolution-only attempt passed; the final observer uses the previous scaffold's synchronous pre-read capture shape and the unchanged full guards. `probe-final.log` records the successful fully guarded build. No producer/dependency change or diagnostic suppression was made to achieve success; the raw failure is not called a passed build. Preliminary attempt outputs remain owned, unexecuted and indexed separately.

## Dependency owners, exact pins and selective freeze

`dependency-ownership.json` checks every cross-package workspace runtime edge against its actual owner's declared dependency and public resolution target. Selected declaration snapshots cover **only five packages**: Settings, Common, ServerSettings, Validation and Definitions. Actual vendor manifests and input bytes cover React **19.2.7**, Zod **4.4.3** and query-core **5.101.2**. Actual nonexternal vendor metadata edges are checked for package-owner declarations; their bundled internal edges stay within those installed package owners. A hoisted module existing on disk is not treated as sufficient declaration evidence.

Common directly declares **`@tanstack/query-core: "5.101.2"`**; its installed manifest is that exact version. Root's existing ReactQuery catalog pin, installed `@tanstack/react-query` metadata and its direct query-core dependency all remain **5.101.2**. ReactQuery metadata is comparison evidence only; ReactQuery is not a selected runtime dependency of these Settings leaves. `summary-details.json` preserves vendor/tool metadata and the exact selected lock lines.

The accepted Common candidate adds its URL export and query-core dependency (two manifest fields) plus the Common workspace lock dependency field. Its **supplied uncommitted candidate state is preserved**; no committed-HEAD claim or Git inspection is made. The accepted selected lock records and root catalog value are frozen only as those fields/records, not a whole lock/root-manifest baseline.

**No all-44 manifest hashing or stability assertion occurred.** Auth/API composition writes are outside this freeze, and their manifests were not hashed. Final checks reverify only these five selected manifests, their 39 runtime producer files, the separate unchanged byte-format producer, actual loaded vendor bytes/metadata/tool metadata, selected query-core/ReactQuery records and output bytes. They neither freeze nor bless mutable G/type-only sources.

Selected manifest hashes:

```text
settings        d8f56678465fde37b54b01ee68b60db8951e88d6f469fe4bc194388c98e78307
common          e5086d29a7a776588a2b67acb7a957301ea2a50b9f8e1654baa9775254cf9c1d
server-settings e6e661310d9dfdffb662459f155879256c6a17ebd955017a52aab613be4c3272
validation      f4a2860127dc7a8563a84467949e43e7f7e989cf0d48ecdc3597e90e1cc96087
definitions     9bd6cc64fc403c60d1ffd9af27150ecaeb80447c2badf6c45eccd1556844da56
```

## Actual scoped compiler, lint and format evidence

Installed TypeScript **7.0.2** exits **0**, zero diagnostics, for explicit roots `settings/src/context.tsx`, `creator.ts` and the separate `byte-format.ts`. Full unfiltered compiler output is retained in `typecheck-settings.log` and all **1,906 transitive file paths** in `types.json`. Exact command array is stored. Flags retain the previous policy:

```text
--noEmit --ignoreConfig --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --allowArbitraryExtensions --resolveJsonModule --esModuleInterop
--noUncheckedIndexedAccess --experimentalDecorators --types node,bun,react,react-dom
--pretty false --listFiles
```

Real `@types/bun`/`bun-types` **1.3.10**, including `bun-types/sqlite.d.ts`, and Node **24.13.3** declarations were used. No shim, `any`, assertion repair, alias/path override, error filtering or `skipDiagnostic` was introduced. Existing `skipLibCheck` policy does not certify all declaration-file semantics.

The compiler reads the following **13 Core/DB files through erased type edges**:

```text
core/src/infrastructure/db/mapping.ts
core/src/infrastructure/db/constants.ts
core/src/infrastructure/db/drivers/shared.ts
core/src/infrastructure/db/drivers/postgresql.ts
core/src/infrastructure/db/scope.ts
core/src/infrastructure/db/drivers/sqlite.ts
core/src/infrastructure/db/drivers/index.ts
core/src/infrastructure/db/index.ts
core/src/infrastructure/certificates/hostnames/db/postgresql.ts
db/schema/postgresql.ts
core/src/infrastructure/certificates/hostnames/db/sqlite.ts
db/schema/sqlite.ts
db/schema/index.ts
```

These paths are prefixed `packages/` in the full evidence list. They were not evaluated or hashed as browser runtime. In particular **mutable Core scope/G is not frozen or accepted** by this typecheck. Native Bun declaration traversal is allowed type evidence, not a runtime server escape.

Scoped read-only oxlint **1.73.0** exits 0 on the 39 runtime files plus byte-format. It reports **one preexisting warning**, `unicorn(no-useless-spread)` at `packages/definitions/src/permissions.ts:182:38`; zero errors. No repair was authorized or performed. Scoped oxfmt **0.58.0 --check** exits 0 on the same 40 files, all already formatted. No tests were created/run and no broad suite was invoked.

## Frozen producer and artifact anchors

```text
settings/context.tsx              d62c98c0ffe5f7591ff7c53301593dcace5629712d2adc728dab43f0155a30fe
settings/creator.ts               bf76764d66046975c32838bbf28d37d73f4e8c25cbdb7273815644cb2a6ded38
settings/byte-format.ts           dcae24a1a65d30276ce9f4456d6acbe2cce27c5ff1168ddfb78c7fcc8ba4831e
common/number.ts                  5410ff2375b6bf7ac106322646b46979a3d133f5215e11f947e265e7943e595d
common/object.ts                  99b969a659f7a959f257883b22f7d1e95f5fcd53aef32dea4eb6731c24f91921
common/url.ts                     5d13a39fd18be4e89b5af964c6b7bc35c2a1bcdcd5162aefc627c3eb05148e6a
definitions/permissions.ts        13ed37057c8060094a6dd4d00a7fc3c0911f6c5d437a29686d2f99fa4b8918cf
definitions/widget-integration-map.ts 01b1558f32a8ddf9637f733337d651692ad2c588cf50747d04a30cf87c908d84
definitions/docker-integration-match.ts 305fabc0f3eacd18223ed1d3ec5adea6c30fe34f1351839f4e60bd5493768cc4
definitions/release-provider.ts   9c8c4186f978a7b557f6c84669614652b20df380500dd3777487e7ecb2a01496
definitions/integration-url-template.ts a8491a22c5eafeea90ee03ee5c8856f9006f2e480deaf2948781adb34bac971b
```

Producer paths above are under `packages/<package>/src/`; full unambiguous paths and every remaining runtime source hash are in `runtime-inputs.json`/`final-state.json`.

```text
graphs.json               ff698ad863d676d3464524d16d1cfee6999049dc9702e77607f2fdc003e8a821
runtime-inputs.json       faadaef5b9e28208c8d615840b1016393709768a87b23531298246934c74cea7
bundles.json              eca895e60ed4e1d2d83dfc5c10e5e0f2dc2f18103dcbc3478c862b5e8dbbbadb
settings.metafile.json    8ffc99b0db7f0377e59013fac9f05bdc29ffdb17c6c67d7ae1b9db52e07e0d89
dependency-ownership.json a95388357624cb66f47c5817e2b5e9fc8b312576f1dd1ff01906bda74b8acbf2
types.json                bc30e9abd038ff35addc7087caeb97816cc2f248a40a3d2f23180aabe2a00b08
typecheck-settings.log    73f82c5061af54ecba3d5533392be37149763288657f9f6e197e7561f2a6ad67
checks.json               a371d7201fad7351b7af60d891d44560d1178211e327fe2d325448c6ad517a57
final-state.json          301b51aadbb0f8de4312b657cb6c8c1c6207df9880c578f6de0f4161974b1e9b
```

Final freeze indexes **24 owned artifact files**, including the real failures/logs, scripts, main and preliminary unexecuted bundle outputs. All selected input/manifest/output hashes were reverified after scoped checks. All Bun invocations used **`env -i`, `--no-env-file`, isolated owned HOME, explicit Bun 1.4.2 PATH and owned clean config**. The evidence node_modules link points at the existing installation; no install/download occurred.

**Frozen for independent selected Settings graph review only.** Existing UI/translation accepted bundles remain untouched. Legacy unselected Day.js still has its Next/global-mutation hold. Protected Core/G/DB/Auth/API/server graphs, real public host/provider joins, B/C and feature completion remain independently unaccepted by this artifact.
