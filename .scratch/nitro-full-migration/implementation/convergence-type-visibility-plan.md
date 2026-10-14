# Shared Bun/CSS type visibility: minimal implementation lease

## Decision

For this fully installed workspace, lease **only `tooling/typescript/base.json`** for implementation. Replace its existing `compilerOptions.types` value `['node']` with the following JSON value:

```json
"types": ["node", "bun", "css-modules"]
```

Both added entries resolve to genuine installed, already declared and locked packages. Do not create ambient declarations, add Vite globals to the shared base, remove the explicit types list, or change app configs. This is a proposed change, not an implemented or compiler-validated result.

This discovery wrote only this report. No commands, compiler checks, tests, runtime execution, installs, network requests, private environment reads, or nested agents were used.

## Evidence and dependency ownership

| Package              | Actual installed version | Existing declaration/metadata                                                                                                                     |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@types/bun`         | `1.3.10`                 | `node_modules/@types/bun/package.json`; declared directly in core, db, api, backend, nitro, and nitro-experiment manifests; present in `bun.lock` |
| `bun-types`          | `1.3.10`                 | Exact dependency of `@types/bun`; also a direct integration-package dev dependency; present in `bun.lock`                                         |
| `@types/css-modules` | `1.0.5`                  | Existing root catalog entry and `packages/ui/package.json` dev dependency; present in `bun.lock`                                                  |
| `@types/node`        | `24.13.3`                | Installed package metadata and existing root catalog entry; preserve Node types                                                                   |
| `typescript`         | `7.0.2`                  | Installed package metadata and existing root catalog/dev dependency                                                                               |

`@types/bun/index.d.ts` references `bun-types`. Its shipped `index.d.ts` references Node plus `sqlite.d.ts`, `test.d.ts`, `bun.ns.d.ts`, globals and overrides. The inspected shipped declarations provide `declare module "bun:sqlite"`, `declare module "bun:test"`, and the real global Bun namespace. Nothing needs to be fabricated or copied.

`@types/css-modules/index.d.ts` supplies a `CSSModule` string index signature and a default export for `*.css` (also several preprocessor extensions). This is the existing UI declaration dependency, not a new permissive `any` shim. With `noUncheckedIndexedAccess` retained, unknown class-index reads remain subject to that setting; do not substitute a stronger-looking synthetic class map.

`tooling/typescript/package.json` currently publishes only `base.json`, with no exports map or dependencies. No declaration file, package export, or publish-file-list change is required for the installed-workspace fix.

The root manifest does not directly declare either added type package. The one-file lease relies on their observed root-visible installation and existing workspace dependency/lock ownership, not on a claim that isolated installs of every individual package will resolve them.

If the owner additionally requires root-owned dependencies for shared compiler types, the exact optional manifest addition is root `devDependencies` containing `"@types/bun": "1.3.10"` and `"@types/css-modules": "catalog:"`. No new Bun catalog entry or version selection is needed. That expands the source lease to `package.json` plus `tooling/typescript/base.json`; a separately authorized lockfile synchronization would also be required before claiming a clean frozen installation. Do not install, hand-edit lock records, or include this optional hardening in the minimum lease without authorization.

## Inheritance and baseline reach

The existing final baseline is `TEMP/nitro-convergence-type-baseline-yqp3yq3v/records/final-result.json`: 37 workspaces, 18 green, 19 red. The inspected core log has only two `bun:sqlite` resolution failures; the UI log has three Bun-resolution failures and six CSS import failures. The db log includes unresolved `bun:sqlite`, unresolved `bun:test`, and missing Bun globals, alongside separate diagnostics.

All 19 baseline-red workspace configs inherit `@homarr/tsconfig/base.json` without their own `compilerOptions.types`: analytics, api, auth, boards, cli, core, cron-jobs, cron-jobs-core, db, forms-collection, icons, integrations, modals-collection, onboarding, request-handler, settings, spotlight, ui, and widgets. Thus the proposed base value reaches these compilation programs, including imported workspace source; editing only core/db/UI configs would not give their consumers equivalent visibility.

Do not claim propagation to every config:

- `packages/ping/tsconfig.json` and `packages/image-proxy/tsconfig.json` explicitly retain `['node']`; both baseline checks are green.
- `packages/modals/tsconfig.json` explicitly uses `['node', 'bun']`; it is baseline-green and is not a CSS producer fix target.
- Several narrow check configs override types or do not inherit this base. Preserve their deliberately scoped configuration.
- `apps/backend/tsconfig.json` and `apps/nitro/tsconfig.json` are independent configs, already using `bun` and `vite/client`; Nitro also uses `nitro/vite/types`. Both baseline checks are green. Leave their types unchanged.
- Root scripts/e2e configs and legacy Next.js inherit the base. They will receive the ambient additions; this requires regression attention, not app/source edits in this lease.

## Physical CSS asset gate

Every CSS specifier found in `packages/ui/src/source-views` resolves to an existing physical asset. Six import sites reference these five files:

| Existing physical asset                                                           | Import sites                                        |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `packages/ui/src/source-views/assistant-workshop/assistant-dot-matrix.module.css` | `assistant-dot-matrix.tsx`                          |
| `packages/ui/src/source-views/chrome/configurable-header.module.css`              | `configurable-header-view.tsx`                      |
| `packages/ui/src/source-views/chrome/header-logo.module.css`                      | `header-logo-view.tsx`                              |
| `packages/ui/src/source-views/custom-workbench/custom-widget-form.module.css`     | `editor-section.tsx`, `section-navigation-view.tsx` |
| `packages/ui/src/source-views/manage/hero-banner.module.css`                      | `hero-banner-view.tsx`                              |

The configurable-header CSS file also has an existing public package export. No asset copy, source import rewrite, or producer change is warranted by these observations. If a later failing specifier lacks its physical asset, stop that diagnostic and hand it to the asset producer; the wildcard type declaration must not be treated as evidence of asset existence.

Existing public conventions inspected: `packages/custom-widgets/src/styles.d.ts` declares `*.module.css` as `Readonly<Record<string, string>>`; installed `vite/client.d.ts` supplies readonly CSS-module classes plus other asset/import-meta globals. Reuse the already-declared `css-modules` package for this shared lease rather than reaching across to the custom-widget declaration or globally importing the broader Vite client environment. Backend/Nitro continue using their own Vite conventions.

## Ambient effects and unchanged boundaries

The Bun bundle is not ambient-neutral: shipped `overrides.d.ts` augments Node `Process` and `ProcessEnv`, and Node stream/buffer interfaces; shipped globals augment web interfaces while using DOM-availability fallbacks. Loading it makes Bun APIs type-visible even in frontend/SSR compilation programs. That is compile-time visibility needed by existing source graphs, not evidence that Bun exists in a Node process or browser. Do not replace web compatibility libraries or change any runtime selection to match these added ambient members.

Preserve `target: 'ES2024'`, the existing DOM/ES2024 libraries, the Node-24 type version/runtime target, package engines, bundler resolution, strictness, `noUncheckedIndexedAccess`, existing `skipLibCheck`, and every include/exclude. In particular, do not hide `runtime.spec.ts` or other existing tests from compiler input.

The shipped Bun environment interface has optional `NODE_ENV`, and its overrides extend `NodeJS.ProcessEnv`; this does not authorize weakening an existing required application `NODE_ENV` definition or environment schema. A legacy restore fixture missing required `NODE_ENV` remains a separate fixture-owner correction, not a reason to modify global definitions here.

The existing db baseline also reports a possibly undefined iterator and schema expectation mismatches. Do not promise that adding types fixes these, adjust their producer contracts, or include source edits in this lease. Newly exposed non-visibility diagnostics also remain separate owner work.

## Fresh focused checks for the implementing owner

No checks were run in this discovery. After the authorized single-file edit:

1. Read the effective configs and declaration resolution for core, db, and UI using the installed compiler. Confirm explicit Node/Bun/CSS inclusion and the genuine installed entrypoints; confirm include/exclude and strictness are unchanged. Reconfirm the five physical CSS assets independently of compiler success.
2. Reuse the recorded compiler-only invocation pattern from the baseline: installed Bun with `--no-env-file`, installed `node_modules/typescript/bin/tsc`, and `--noEmit --incremental false --pretty false -p <workspace>/tsconfig.json`, retaining the sanitized environment and per-workspace cwd. Start with **core, UI, db**. Write new receipts outside the old records; preserve baseline outputs. Expected targeted outcome: no missing `bun:sqlite`, `bun:test`, Bun-global, or listed CSS-module diagnostics. Db may remain red for unrelated real errors.
3. Check **boards** as an inherited UI-consuming program and **custom-widgets** as the existing narrower CSS-declaration coexistence sentinel. Recheck **backend and Nitro** as existing-green SSR/Vite consumers; their configs remain unchanged. Any ambient compatibility regression blocks acceptance; do not fix it by weakening libraries, types, or application environment contracts.
4. Run existing lint scoped to the leased config. If root manifest hardening is separately authorized, include that file in the focused formatting/lint checks and separately validate lock/install consistency only when authorized.
5. Record the remaining diagnostics by owner. A later authorized broad compiler baseline can establish the new 37-workspace result; this discovery and the focused checks cannot claim all workspaces green. A legacy Next.js/root-script compiler check is a separate useful ambient-regression follow-up, not permission to edit their source.

No tests, runtime SQL, application boot, CLI execution, engine/container work, or package installation is needed to establish this type-visibility delta. JavaScript source bodies remain unchanged, but changing shared compiler configuration creates new source/configuration provenance. Existing compiled artifacts and all historical receipts remain immutable; do not relabel old outputs as validation of the new config.
