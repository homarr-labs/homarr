# BUILD — complete captured SSR external inventory / final resolver plan

## Decision

**APPROVE a source-plan change in `apps/nitro/vite.config.ts` only: configure final `environments.nitro.resolve.dedupe` for every captured SSR npm package root, plus its observed ReactDOM renderer peer.** Keep the independently accepted resolved-backend SSR external expression and `makeAbsoluteExternalsRelative: false` unchanged. Keep backend Nitro config, native tracing, packaging, manifests, dependencies and output fences unchanged.

This is a whole captured-boundary **project-root resolver correction**, not a one-package `noExternal` patch. It uses Vite's existing resolver; no custom resolver plugin, unchecked alias, source copy, new symlink or package installation is required. It does not flatten a second React/dayjs/backend owner into the independently built SSR intermediate. Approval is for the source plan, not compilation, physical identity, native closure or runtime PASS.

## Terminal second attempt and scope

Evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-artifact-second-azwaqh4V`.

- `records/build.exit:1` is numeric **1**; `build.stdout:570–591` records final Nitro failure resolving `@tanstack/react-router/ssr/server` from the external SSR intermediate.
- `build.stdout:4,158,162,421` records SSR 238 modules/client 7676 modules and completed intermediate stages; line 423 starts final Nitro. Packaging/CLI/migrator compilation and boot remain unreached.
- Intermediate `build-work/build/vite/services/ssr/index.js:1` now imports `fetchApplication` from the actual absolute checkout `apps/backend/src/server/host.ts`. The first bare-host failure is corrected, not recurring.
- Failed partial final `_ssr/ssr.mjs:1` imports `fetchApplication` from `../_chunks/host.mjs`; partial `index.mjs:5` imports `closeApplication` and `loadStartupConfiguration` from that same chunk. This is useful evidence that the retained owner seam is working, **not successful final closure or a bootable artifact**.
- Preserve both this terminal failed attempt and `nitro-artifact-attempt-SkDTX9wH` untouched. Neither is retried or promoted by this report.

## Complete captured direct import inventory

Scope: all six generated JavaScript files under this second attempt's `build-work/build/vite/services/ssr`: `index.js`, `__fullstack_assets_manifest.js`, and four locale assets `assets/{ca-CPhkH2Ou,lt-BJY93RBa,lv-rUjUgaEF,sl-D-OraD8R}.js`. A directory-wide search for static imports, export-from edges, dynamic `import(...)` and `require(...)` returned exactly the 33 imports at `index.js:1–33`; no additional matching edges in the other files.

There are **31 distinct bare specifiers across 19 npm package roots**, not 20 captured roots. The earlier intermediate commentary's 20-root count was a counting error. ReactDOM makes the proposed resolver list 20 roots but is an observed transitive peer, not a fabricated direct SSR import.

| Package root             | Exact captured bare specifiers                                                                                                                                                      | `index.js` lines |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `@tanstack/react-router` | `@tanstack/react-router/ssr/server`, `@tanstack/react-router`                                                                                                                       | 3, 7             |
| `deepmerge`              | `deepmerge`                                                                                                                                                                         | 4                |
| `use-intl`               | `use-intl/core`, `use-intl/react`                                                                                                                                                   | 5, 20            |
| `@tanstack/react-query`  | `@tanstack/react-query`                                                                                                                                                             | 6                |
| `react`                  | `react`, `react/jsx-runtime`                                                                                                                                                        | 8, 9             |
| `@mantine/core`          | `@mantine/core`                                                                                                                                                                     | 10               |
| `cookie`                 | `cookie`                                                                                                                                                                            | 11               |
| `dayjs`                  | `dayjs`, `dayjs/plugin/isBetween.js`, `dayjs/plugin/duration.js`, `dayjs/plugin/relativeTime.js`, `dayjs/plugin/updateLocale.js`, `dayjs/plugin/timezone.js`, `dayjs/plugin/utc.js` | 12–16, 25, 26    |
| `@paralleldrive/cuid2`   | `@paralleldrive/cuid2`                                                                                                                                                              | 17               |
| `zod`                    | `zod/v4`, `zod`                                                                                                                                                                     | 18, 32           |
| `@mantine/hooks`         | `@mantine/hooks`                                                                                                                                                                    | 19               |
| `@tabler/icons-react`    | `@tabler/icons-react`                                                                                                                                                               | 21               |
| `crypto-js`              | `crypto-js`                                                                                                                                                                         | 22               |
| `clsx`                   | `clsx`                                                                                                                                                                              | 23               |
| `@mantine/notifications` | `@mantine/notifications`                                                                                                                                                            | 24               |
| `jotai`                  | `jotai`                                                                                                                                                                             | 27               |
| `@dnd-kit/dom`           | `@dnd-kit/dom`, `@dnd-kit/dom/sortable`                                                                                                                                             | 28, 29           |
| `@dnd-kit/react`         | `@dnd-kit/react`, `@dnd-kit/react/sortable`                                                                                                                                         | 30, 31           |
| `@mantine/dropzone`      | `@mantine/dropzone`                                                                                                                                                                 | 33               |

The remaining two imports are **not bare npm imports**: line 1 is the resolved absolute backend owner; line 2 is relative `./__fullstack_assets_manifest.js`. There is no direct captured `bun:*`, `node:*`, `bcrypt` or bare Homarr workspace import. This inventory is complete for the captured direct SSR seam, not a claimed transitive/native inventory of the entire application.

All 19 installed root package manifests, plus `react-dom/package.json`, were located in the existing root `node_modules`; no missing package was installed or manufactured. `apps/nitro/package.json` already declares the router/query/React/Mantine/DnD and other direct dependencies. Existing workspace manifests account for widened imports: `packages/translation/package.json:34–44` declares `deepmerge`/`use-intl`/dayjs; `packages/common/package.json:37–49` declares cookie/cuid2/dayjs/zod; `packages/ui/package.json:46–65` declares `crypto-js` and its UI dependencies. These reads establish declared/installed inputs, not runtime relocatability.

## Exact minimal source-plan addition

Add this sibling of the existing `ssr`/`client` environment configurations in **`apps/nitro/vite.config.ts`**:

```ts
nitro: {
  resolve: {
    dedupe: [
      "@dnd-kit/dom",
      "@dnd-kit/react",
      "@mantine/core",
      "@mantine/dropzone",
      "@mantine/hooks",
      "@mantine/notifications",
      "@paralleldrive/cuid2",
      "@tabler/icons-react",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "clsx",
      "cookie",
      "crypto-js",
      "dayjs",
      "deepmerge",
      "jotai",
      "react",
      "react-dom",
      "use-intl",
      "zod",
    ],
  },
},
```

Do not set a new environment root, replace Nitro's generated environment, override its production `resolve.noExternal: true`, alter package export conditions, or change its bundler externals. The list covers **package roots**, so router SSR, JSX runtime, Zod and DnD/dayjs subpaths are handled together through actual package exports. It is explicitly derived from this frozen inventory; it is not a promise that arbitrary future new direct SSR package roots will be covered without review.

`react-dom` is included for an actual shared peer edge: installed `@tanstack/react-router/dist/esm/ssr/renderRouterToString.js:1` imports `react-dom/server`; router's manifest declares React/ReactDOM peers, and `apps/nitro/package.json:57–58` pins both to 19.2.7. Installed ReactDOM 19.2.7 exports `./server` with a `bun` target (`react-dom/package.json:57–66`). Keep those exports/conditions; do not alias server rendering to a guessed Node/browser file.

## Installed mechanism and root identity

1. **The defect is importer context, not an absent router export.** `@tanstack/react-router/package.json:43–51` actually exports `./ssr/server` to existing ESM/CJS targets; its ESM server entry was read. In normal resolution, Vite uses an existing absolute importer's directory, so the intermediate outside the checkout cannot find the workspace's hoisted npm packages (`vite/dist/node/chunks/node.js:32242–32267`). Each of the 31 bare imports has that same context problem.
2. **Final Vite project root remains the source frontend.** `apps/nitro/vite.config.ts:82` sets Vite root to its own `apps/nitro` directory. Lines 104–109 move **Nitro** working/output directories outside the checkout; that is not a replacement of Vite's package-resolution root. Installed Vite creates its resolver with `root: config.root` (`node.js:29726–29734`), then forwards environment `dedupe` with root, conditions, builtins and noExternal to Rolldown's native Vite resolver (`32040–32068`). Existing root-level dependencies are found by normal ancestor lookup from `apps/nitro`.
3. **The proposed property is supported on this installed environment API.** Vite 8.1.4 declares `EnvironmentResolveOptions.dedupe?: string[]` and `SharedEnvironmentOptions.resolve` (`vite/dist/node/index.d.ts:1963–1986,3379–3388`); its environment resolver merges and preserves these options (`node.js:35453–35463`). Nitro 3.0.260903-beta supplies production `nitro.resolve.noExternal: true` separately (`nitro/dist/_build/vite.env.mjs:29–54`). Keep it: root-resolved npm modules must enter final compilation, not become new runtime bare imports.
4. **This reaches the actual native resolver, not merely an unused JS compatibility function.** Installed Vite passes `dedupe: options.dedupe` to `viteResolvePlugin`; installed Rolldown's constructor forwards the configuration to `builtin:vite-resolve` and its binding declares the root/dedupe fields (`rolldown/dist/shared/constructors-CE6zZSUt.mjs:28–32`; `binding-B1q9aYT-.d.mts:1867–1890`). Official Rolldown **v1.1.4** native source confirms `should_dedupe` extracts the npm package root, `should_use_importer` returns false for listed roots, and `resolve_bare_import` then invokes `resolve_raw` without the external intermediate importer; `resolve_raw` resolves from the configured root. These paths have no ESM-output-format exception. Conditions and realpath handling remain the ordinary resolver's, not new handwritten alias logic.
5. **Root convergence includes genuinely shared existing packages.** The failed partial backend host chunk already imports bundled cookie, cuid2, deepmerge, use-intl, dayjs and Zod from `_libs`, while the SSR partial still has corresponding bare imports. The full-root `dedupe` policy applies to final compilation's original-source consumers as well as the intermediate, so they resolve the same package copies instead of forcing independent SSR flattening. Subpaths/legitimate ESM-versus-CJS or condition-specific entrypoints are not automatically identical modules; final identity must be inspected, not inferred from the package-root list alone.

## Backend/private owner preservation and proof conditions

- Keep SSR `external: [/\/backend\/src\/server\//]` and `makeAbsoluteExternalsRelative: false` exactly. The absolute host edge is allowed in the intermediate **only**; no final runtime import may point to the checkout.
- `host.ts:8–10` owns startup/initialization/disposal state. Entry and lifecycle both import `closeApplication` through its declared package export; entry also imports startup configuration directly. The retained seam lets final compilation deduplicate those actual source files with SSR's `fetchApplication`, rather than compiling an independent SSR host/config instance.
- The 85 captured SSR region markers contain frontend/workspace UI/translation/definition/validation modules, not an embedded backend host/config or `packages/db` owner region. Markers plus the actual absolute host import and failed final shared-host edge are evidence for retaining this seam; they do not certify every private owner's transitive identity. Do not add a global registry/singleton workaround or claim that pure helper/schema duplication is equivalent to a second native owner.
- After source review and focused lint/typechecks, inspect the next fresh final graph for **one** host/config owner reached by SSR fetch, entry close, lifecycle close and startup reads, and for no embedded second backend/native-private initialization owner. Inspect shared npm canonical package paths and exports, especially React/ReactDOM, router/query contexts, Mantine/Jotai and stateful dayjs extensions; no disconnected duplicate React dispatcher or shared context owner. Separate browser/client copies are expected and do not count as a second server owner.
- Require all 31 captured npm specifiers to resolve through the final root policy and be bundled into final chunks except separately justified genuine native/builtin externals. Require ordinary package export/condition resolution, not browser-empty substitutes or missing-export suppression. Inspect root/conditions after config merge; an unexpected override is a blocker, not a reason to change conditions blindly.
- Current official Vite docs warn that dedupe alone cannot control **runtime loading of external ESM SSR dependencies**. This plan does not rely on that: the correction is compile-time root lookup in Nitro's final bundling environment. If any of these ordinary npm imports survive as unclosed runtime externals, the proof condition fails; do not cite dedupe as runtime closure or switch to CJS as an unreviewed workaround.

## Native boundary and alternatives not approved

Second-attempt `build.stdout:427–431` records tracing bcrypt 6.0.0 and node-gyp-build 4.8.4 (seven files) and explicitly warns that builder platform is **darwin-arm64**. Partial `_chunks/host.mjs:18–25` retains Node builtins, `bcrypt` and `bun:sqlite`. These are genuine external categories, not npm-resolution errors to silence. The proposed resolver list does not alter them. A final Linux candidate still requires inspection of actual addon/package closure for its target architecture; these failed Darwin receipts establish no Linux addon/runtime PASS. No native binary was loaded here.

Not approved: one router-only noExternal fix, blanket final workspace/native externalization, deleting the resolved backend guard, unchecked aliases, output moved into the checkout, source/node_modules symlink grafts, or per-package installs. Blanket SSR npm bundling could remove bare imports but would flatten additional independent shared npm state alongside the backend's already bundled copies (dayjs is an observed example); it needs a wider identity design/proof and is not the minimal plan selected here. A custom resolver plugin is unnecessary because the installed root-dedupe mechanism covers the entire captured inventory.

## Release boundary and sources

All product inputs remain frozen until the designated writer implements and independent review accepts this **one-file** source correction with fresh focused validation. The active private control/launcher work is disjoint and not approved/evaluated here. A next compiler attempt, if separately released after that acceptance, uses another absent external child root with the unchanged authorized clean/no-env-file envelope, full streams and immediate whole-entry numeric status; no retry of either failed attempt. Packaging, final single-owner/module closure and native dependencies must each be inspected independently. K physical pin/PK/FK/collation failures and all boot/authentication/native-SQL/containment holds remain unchanged even if a later compiler returns zero.

Version-specific source authority is the installed Nitro 3.0.260903-beta, Vite 8.1.4 and root Rolldown 1.1.4. Context7's already observed exhausted quota was not retried. Read-only official fallback used to confirm the native mechanism and the ESM limitation:

- https://raw.githubusercontent.com/rolldown/rolldown/v1.1.4/crates/rolldown_plugin_vite_resolve/src/vite_resolve_plugin.rs — bare resolution delegates with dedupe and unchanged conditions.
- https://raw.githubusercontent.com/rolldown/rolldown/v1.1.4/crates/rolldown_plugin_vite_resolve/src/resolver.rs — `should_dedupe`, `should_use_importer`, `resolve_bare_import`, `resolve_raw`, and `symlinks: !preserve_symlinks`.
- https://vite.dev/config/shared-options.html#resolve-dedupe — project-root policy and runtime SSR/ESM caveat (live docs identify 8.3.4, not installed 8.1.4).

Only this new report was written for this task. No commands/rebuild/checks, product writes, application/module evaluation, runtime/native SQL, env/data/secrets access, installs, nested agents or output repair occurred. Both terminal failures remain preserved.
