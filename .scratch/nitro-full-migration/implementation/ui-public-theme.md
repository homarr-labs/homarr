# Public UI theme producer relocation — frozen for review

Only `packages/ui/src/theme.ts`, `apps/nextjs/src/theme/branding.ts` and this handoff changed. Earlier UI/navigation/forms/modals/notifications and media work remain frozen. No manifests/exports/install, translation/settings sources, host code or provider registration changed. This is source identity preservation, not a redesign or whole-provider/runtimeGraph acceptance.

## Exact relocation

- The actual source `generateColorScale` and `createBrandTheme` now live at the already declared public `@homarr/ui/theme` boundary.
- `generateColorScale` is text-identical to the original function. All ten steps remain `[-0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2]`. Negative steps call real Mantine `lighten`; zero/positive steps call real `darken`. The source split/space-removal/parseInt/first-three-channel/hex conversion and fallback remain unchanged. No validation, normalization or palette repair was added.
- The existing `as unknown as MantineColorsTuple` bridge is retained exactly: array `.map` does not infer Mantine's required ten-element tuple even though the source step array always produces ten entries. It is a source-specific type bridge, not a new runtime conversion or generic cast utility.
- `createBrandTheme` retains real `mergeThemeOverrides`, the existing Homarr theme and `createTheme`, both named primary/secondary color scales, primary-role selection, branding default radius and ActionIcon/Button/Card/Paper radius defaults. Its only function-body text change is replacing the old imported alias `homarrTheme` with the same module's `theme` object.
- The old Next file is solely `export { createBrandTheme, generateColorScale } from "@homarr/ui/theme";`. Both exports are the identical shared function references, not wrappers or forked algorithms.
- The original theme body beginning at `export const scrollAreaDefaultProps` through the existing `createTheme` call is byte-for-byte unchanged. Fonts, headings, sizing, spacing, shadows, color/defaults, scroll configuration and every component default are preserved. Modal implementation is untouched. No application-global theme state was introduced.

## Language components: no unnecessary edits

`packages/ui/src/components/language-combobox.tsx` and `language-icon.tsx` remain byte-identical. The former already consumes the declared translation root's `localeConfigurations` and `supportedLanguages`; the latter's language-icon import is type-only. Layout, controls/options/flags/icons/labels/pending state, portal default, handlers and existing target/ref behavior are untouched.

The existing translation root forwards `src/index.ts`, which exports type-only translation types, pure configuration and the mapping factory. `config.ts` obtains/re-exports its list from the declared `/languages` source and contains locale metadata plus lazy MRT/Dayjs loader functions; these are not invoked by rendering the language selector. `mapping.ts` constructs lazy locale loaders only when called. `/languages` does not itself export locale configuration or icon definitions, so moving every import there would be incorrect. No undeclared `/config` leaf, private cross-package path or replacement locale/provider/catalog algorithm was added.

Remaining graph edges are the root's configuration/mapping exports and their lazy MRT, Dayjs and locale-JSON targets, plus type-only translation/client typing. This inspection is not whole translation graph or provider acceptance. Existing flag CSS, translations, client provider composition and actual browser behavior remain host joins.

## Dependency/API and import boundaries

- Current UI manifest declares `@mantine/core`, `@homarr/server-settings`, `@homarr/translation`, React and Tabler, plus `/theme` and `/language-combobox` entrypoints. No declaration was assumed from hoisting or added here.
- Installed Mantine is **9.6.0**. The configured Mantine MCP was not available in this session's tool catalog; it was not installed or started. Context7 quota was already exhausted. With network prohibited, the installed official Mantine declaration files and shipped source implementations for `lighten`, `darken`, `mergeThemeOverrides`, theme types and existing theme/modal/component conventions were inspected directly.
- Theme runtime imports are only `@mantine/core` and its existing same-package `./theme/modal`. `ServerSettings` and Mantine tuple/override imports are type-only. The shared theme no longer needs any application source or UI root barrel.
- Next branding runtime imports only the declared public `/theme` boundary. Language runtime imports remain Mantine, React, Tabler, the existing public translation root and same-package `LanguageIcon`; no Settings/Next routing, backend, env or application provider import was introduced.
- The type-only ServerSettings boundary can reach its translation/definition types; the translation types can reach the existing client typing graph. Scoped typecheck passed without transitive Bun errors, suppressions, widening or foreign source changes. Public declaration review remains separately active.

## Actual deterministic equivalence evidence

Before forwarding, original source text, SHA256 hashes and source-generated reference outputs were captured at:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/ui-public-theme-original-33124ee5-7f43-4c89-acf3-1310545d8b20.json`

The disposable comparison used Bun's TypeScript transpiler on that captured original source and real installed Mantine functions. Only original imports/exports were adapted for the comparison, injecting the actual Homarr theme/modal dependency; no source color/merge algorithm or expected swatches were hand-written. The captured theme body was also re-evaluated against real Mantine and deep-compared, including existing modal function identities. No repository test or runtime module was added for this evidence.

Results:

- **80 shade comparisons:** every one of ten scale entries matched the captured original for `#fa5252`, `#fd7e14`, `#000000`, `#ffffff`, `#Ab12cD`, `#abc`, `rgba(12, 34, 56, 0.5)` and `var(--source-edge)`.
- Source edge behavior was deliberately not repaired: the CSS-variable case still returns ten `#NaNNaN` entries through the original conversion. It is not a supported branding-schema value or a new palette recommendation.
- Both brand colors and whole merged themes matched the original at all **five radii**: xs/sm/md/lg/xl. Primary role, default radius and all four branded component radius defaults were verified. Full theme equality also preserves unmodified component defaults and typography.
- Original theme body bytes and both language files/modal hashes matched. Both old Next exports equal the shared exported function references.
- Scoped `oxlint` and `oxfmt --check` passed on the two modified source files. Strict installed TypeScript 7.0.2 explicit-root check passed for shared theme, Next forwarding and both unchanged language components, with `--noEmit --ignoreConfig --target ES2024 --module esnext --moduleResolution bundler --jsx preserve --strict --skipLibCheck --allowArbitraryExtensions --resolveJsonModule --esModuleInterop --noUncheckedIndexedAccess --experimentalDecorators --types node,bun` and DOM/ES2024 libraries.

All execution used `bun --no-env-file`, generated inputs and the approved disposable directory. No network, browser/screenshot, live data/env/credential/provider, listener, compiled app, build/restart/container, Git operation or nested agent was used. Direct module/equivalence execution is not mounted SSR, hydration, CSS or public-host behavior proof.

## Frozen SHA256 identities

| Source                                             | Before                                                             | After                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/ui/src/theme.ts`                         | `8929457b5f96393507a0313cecc39e656a17f880d3a6a11f014bd5a0da600b5a` | `607b1221953784ba5f7a9d56a48ae2051a07acd5314212ab6d1e4eaf31a7b206` |
| `apps/nextjs/src/theme/branding.ts`                | `3223489e3e24165bc8c82aa57732727f81cc2699c8fdf2a821947a7a3ce31e98` | `2cfed83ed113d88f0109d7ce2e0fba9a81c31d7592e0f5461fd14e06b694f9f3` |
| `packages/ui/src/components/language-combobox.tsx` | `b3c6d1c59960633f6218045411ae8fbacf4325b3b10d9294f4db8fb1404823cf` | Unchanged                                                          |
| `packages/ui/src/components/language-icon.tsx`     | `7998aeadd3b16c5b10ad4be372fef0808efba26c1e3be1a0b476dbb4afa175f5` | Unchanged                                                          |
| `packages/ui/src/theme/modal.ts`                   | `3d12168f716d72748f09a4aa707e2740d01707dfe8d496b560cdf62df3e2fe93` | Unchanged                                                          |

Original unchanged theme-body SHA256: `e8a864313e7568cd156ec1c44e90c9c2bd8fb563f23713462f9f14a66d2f539b`.

Trimmed function-source SHA256:

- `generateColorScale`, identical before/after: `beb969b231d650f0e9957a8b2c989944e8f70b83edf27940492ade160d50df2f`.
- Original `createBrandTheme`: `e246848e94ca7325313bbdd91233b1f58a2889fec027202b4e4a2b5364e04c25`.
- Shared `createBrandTheme`, only same-object alias substitution: `29023886b3893ecabb052147d798eb5c94633db453af99d6464cbc95c750c8e3`.

Frozen for independent producer/declaration review. COMPOSITION owns actual public host/provider consumption and runtimeGraph acceptance; none is implied by these hashes or offline equivalence checks.
