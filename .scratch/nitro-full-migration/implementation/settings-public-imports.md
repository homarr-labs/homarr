# Settings public number-import cleanup

## Frozen mechanical delta

PUBLIC-HOST-JOIN's approved producer cleanup is complete. **Freeze the two Settings producer files for narrow read-only review and coordinator-curated commit.** Only these files and this report were edited; no settings policy/default, formatting algorithm, React API, signature, dependency, export, manifest, context/provider or host behavior changed.

Verified before editing: `packages/settings/package.json` already declares `@homarr/common: workspace:^0.1.0`; `packages/common/package.json` already exports `./number → ./src/number.ts`. No dependency installation or declaration change was needed.

| Exact owned declaration                  | Old edge         | New edge                | Same symbols                                       |
| ---------------------------------------- | ---------------- | ----------------------- | -------------------------------------------------- |
| `packages/settings/src/creator.ts:2`     | `@homarr/common` | `@homarr/common/number` | `defaultByteUnitSystem`                            |
| `packages/settings/src/byte-format.ts:5` | `@homarr/common` | `@homarr/common/number` | `formatByteRate`, `formatBytes`, `formatBytesPair` |

The old Common root's `index.ts → src/index.ts → src/number.ts` reexport chain was read and verified. The new public port resolves to that same physical `packages/common/src/number.ts`, preserving the imported values/types at their source rather than copying helpers. This intentionally avoids each changed edge's Common aggregate-barrel evaluation; it does **not** certify the remaining Settings dependency graph as free of aggregate imports or side effects.

SHA-256 before → after:

```text
packages/settings/src/creator.ts
2b6fbb3bfddef3fd9b8dd644094c60dd2758f82ca78677fc781a958ed50f6eae
bf76764d66046975c32838bbf28d37d73f4e8c25cbdb7273815644cb2a6ded38

packages/settings/src/byte-format.ts
0f32822100677511855823118dbfc097a60dfeb1cb36f3a19716cfa7fed3ba12
dcae24a1a65d30276ce9f4456d6acbe2cce27c5ff1168ddfb78c7fcc8ba4831e

packages/common/src/number.ts — unchanged before/after
5410ff2375b6bf7ac106322646b46979a3d133f5215e11f947e265e7943e595d
```

Reversing only `@homarr/common/number → @homarr/common` in each owned file reproduces its exact pre-edit hash. Read-only Git diff also shows exactly the two import-line replacements. All function bodies, user/guest defaults, preference projection, memo dependency and formatting options remain byte-identical.

## Scoped checks

From repository root:

```sh
node node_modules/oxlint/bin/oxlint packages/settings/src/creator.ts packages/settings/src/byte-format.ts
node node_modules/oxfmt/bin/oxfmt --check packages/settings/src/creator.ts packages/settings/src/byte-format.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --esModuleInterop --resolveJsonModule --target ES2024 --module ESNext --moduleResolution Bundler --jsx react-jsx --types node,react,react-dom --pretty false packages/settings/src/creator.ts packages/settings/src/byte-format.ts
```

- Two-file lint: **exit 0, no warnings**.
- Two-file formatting check: **exit 0, both files already formatted**; no formatter write was required.
- Scoped two-entrypoint typecheck: **exit 1, two transitive diagnostics, zero diagnostics in either owned file**:

```text
packages/core/src/infrastructure/db/drivers/sqlite.ts(1,26): TS2307 Cannot find module 'bun:sqlite' or its corresponding type declarations.
packages/core/src/infrastructure/db/drivers/sqlite.ts(2,30): TS2307 Cannot find module 'bun:sqlite' or its corresponding type declarations.
```

This is an honest type-closure limitation, not a passing full Settings typecheck. The unchanged DB/schema type projection can still reach Core driver declarations. No Bun shim, assertion, diagnostic suppression, compiler-config broadening or unrelated source fix was added. An initial attempt to use the classic TypeScript JavaScript compiler API stopped before compilation: installed TypeScript 7.0.2's root export does not provide `ScriptTarget/createProgram`. The subsequent actual native CLI invocation above is the recorded scoped typecheck; no compiler API service/listener was started.

No new tests were added or run for this import-only change; no broad Settings/repository suite or typecheck was run. No Bun command was executed. Checks used installed tooling only and wrote no configuration, cache or generated fixture files.

## Actual bounded browser-resolution evidence

Installed esbuild was invoked in memory with these exact options:

```js
{
  entryPoints: ["packages/settings/src/creator.ts", "packages/settings/src/byte-format.ts"],
  outdir: "packages/settings/.public-import-check",
  bundle: true,
  platform: "browser",
  format: "esm",
  write: false,
  metafile: true,
  logLevel: "silent",
  external: ["react", "./context", "@homarr/server-settings", "@homarr/validation/user"]
}
```

**Exit 0.** Both actual emitted public import edges resolve to `packages/common/src/number.ts`. The complete bounded metadata input list is exactly:

```text
packages/common/src/number.ts
packages/settings/src/creator.ts
packages/settings/src/byte-format.ts
```

Resolver verification used `createRequire` from `packages/settings/package.json`, `require.resolve("@homarr/common/number")` and `realpathSync`; the result equals the old reexport chain's number leaf. The bounded bundle includes no Next/env/backend module. No output directory or bundle was written (`write:false`). This check intentionally leaves the unrelated runtime roots external, rather than asserting the whole Settings browser graph is clean.

## Remaining joins and boundaries

- `creator.ts` still has runtime `parseBrandingSettings` from `@homarr/server-settings` and `parseHeaderPreferences` from `@homarr/validation/user`; those unmodified roots were external to this narrow bundle check.
- Its `User` DB/schema, `ServerSettings` and `HeaderPreferences` imports remain type-only. The actual scoped compiler reaches unresolved Bun driver types as recorded above; runtime erasure is not proof of a cleared type closure.
- `byte-format.ts` still imports React `useMemo` and the existing `./context`/`useSettings`; context/provider/index/browser graphs remain read-only and were not broadly bundled. Those APIs and memo behavior are unchanged.
- COMPOSITION must check the whole selected provider/host runtime and type graph against these frozen hashes after narrow review. No Settings public context export, provider mounting, SQL, private identity or production browser acceptance is established by this mechanical return.

Auth/culture accepted sources, catalogs, standalone/client providers, manifests/exports/lockfiles and all other owner files were not edited. No `.env`, app data, credentials, DB, network/provider, browser, listener/3100/3200/3210, container, install, Git stage/commit/branch/worktree or nested agent operation occurred. Q16 is unchanged; public provider/host and browser SSR/RTL/draft/persistence joins remain pending, and #06/#07 are not closed.
