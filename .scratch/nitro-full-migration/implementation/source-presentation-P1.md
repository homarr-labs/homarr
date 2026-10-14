# P1 source presentation extraction

## Outcome and authority

Producer-first NEW-file-only P1 dispatch is the authority for this extraction, in addition to `FRONTEND-PRESENTATION-LEASES.md` P1. The dispatch explicitly supersedes the older export-first paragraph at lines 176–182; no separate producer-first amendment text was found in the planning files. No original wrapper, export, manifest, constant, controller, route or generated type was changed.

Added exactly 18 presentation files below and this canonical handoff. All 19 targets were enumerated and absent before writing; no existing user file was overwritten. These are frozen review candidates, not a mounted main chrome or complete management migration. One CSS byte-identity requirement remains blocked by automatic patch-time formatting, detailed below.

## Exact inventory and source bodies

Paths in this table use `N = apps/nextjs/src/` and `U = packages/ui/src/source-views/`. Each original was read-only. Render ranges refer to the source baseline below, not renamed target line numbers.

| New owned path                              | Original read-only source / extracted range                                                                                                                 | Deliberate boundary substitutions                                                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `U/chrome/contracts.ts`                     | Types from the four chrome originals; no source model imported                                                                                              | Types-only resolved display values, slots, key/render closures and action props                                                                                                                        |
| `U/chrome/shell-view.tsx`                   | `N/components/layout/shell.tsx`, return lines 27–50                                                                                                         | `collapsed`, `backgroundProps`, resolved `headerHeight` become required inputs; source `hasHeader`/`hasNavigation` defaults retained                                                                   |
| `U/chrome/configurable-header-view.tsx`     | `N/components/layout/header/configurable-header.tsx`, render lines 110–160; complete `FloatingHeaderControls` lines 166–243; lifetime constants lines 45–46 | Actual zones/desktop display/visibility supplied; actual `renderItem(item, display)` and `getItemKey(item)` supplied; burger, floating user and spotlight supplied as nodes; no HeaderItem replacement |
| `U/chrome/configurable-header.module.css`   | `N/components/layout/header/configurable-header.module.css`, all 182 source lines                                                                           | Complete stylesheet, with one automatic whitespace-only wrap that prevents byte identity                                                                                                               |
| `U/chrome/header-button.tsx`                | `N/components/layout/header/button.tsx`, style constant and branches lines 24–49                                                                            | Existing relative Link leaf; honest button-or-anchor forwarded ref with a stable callback instead of source anchor cast                                                                                |
| `U/chrome/header-logo-view.tsx`             | `N/components/layout/header/header-logo.tsx`, content/return lines 21–29                                                                                    | Required resolved `href`; existing relative Link leaf; optional board acquisition stays out                                                                                                            |
| `U/chrome/header-logo.module.css`           | `N/components/layout/header/header-logo.module.css`, all 22 lines                                                                                           | None, byte-identical                                                                                                                                                                                   |
| `U/manage/contracts.ts`                     | Types from the management originals                                                                                                                         | Types-only presentation props; required breadcrumb, translated labels, resolved hero values and actual layout constants                                                                                |
| `U/manage/manage-container.tsx`             | `N/components/manage/manage-container.tsx`, lines 5–11                                                                                                      | Only type location changes                                                                                                                                                                             |
| `U/manage/manage-page-layout-view.tsx`      | `N/components/manage/manage-page-layout.tsx`, lines 31–47                                                                                                   | Required supplied breadcrumb replaces implicit DynamicBreadcrumb; supplied `floatingActionBottomOffset` replaces held source constant                                                                  |
| `U/manage/manage-collection.tsx`            | `N/components/manage/manage-collection.tsx`, page lines 14–24, list 27–31, item 43–70                                                                       | Types moved; page composes the extracted layout with its explicit inputs; all three leaves retained                                                                                                    |
| `U/manage/section-card.tsx`                 | `N/components/manage/section-card.tsx`, lines 9–19                                                                                                          | Only type location changes                                                                                                                                                                             |
| `U/manage/danger-zone-view.tsx`             | `N/components/manage/danger-zone.tsx`, root render lines 15–38, item 46–60                                                                                  | Supplied localized heading replaces i18n read; array-vs-single-child and index/divider behavior unchanged                                                                                              |
| `U/manage/unsaved-changes-bar-view.tsx`     | `N/components/manage/unsaved-changes-bar.tsx`, lines 15–25                                                                                                  | Supplied localized label replaces i18n read; source inline bottom 20 retained                                                                                                                          |
| `U/manage/manage-sticky-footer.tsx`         | `N/components/manage/manage-sticky-footer.tsx`, lines 15–35                                                                                                 | Only type location changes                                                                                                                                                                             |
| `U/manage/manage-mobile-primary-action.tsx` | `N/components/manage/manage-mobile-primary-action.tsx`, lines 6–15                                                                                          | Required actual min-width and Affix position replace held source constants; both md branches and duplicate child render unchanged                                                                      |
| `U/manage/hero-banner-view.tsx`             | `N/app/[locale]/manage/_components/hero-banner.tsx`, lines 13–37                                                                                            | Supplied title/subtitle/resolved logo URL/alt/marquee replace RSC/settings/translation acquisition                                                                                                     |
| `U/manage/hero-banner.module.css`           | `N/app/[locale]/manage/_components/hero-banner.module.css`, all 24 lines                                                                                    | None, byte-identical; dark/light mixins not flattened                                                                                                                                                  |

No domain barrel was added. Public exports and original-wrapper reuse are a separate coordinator-owned join. Current originals remain the product implementation; new files are not independent editable redesign forks.

## Props, effects and pure closure

- Shell keeps source background spread order, `bg`-conditional `100dvh`, header-presence branch, 300px/sm/mobile-collapsed navbar and `padding="xs"`. The wrapper must supply the actual five background display fields and source visible-header calculation (60 or 0), not a new setting default or video heuristic. Jotai, settings, board/path/background acquisition and background video stay excluded.
- Configurable header retains all desktop left/center/right and mobile left/center-then-right trees, conditional context actions, data attributes and hidden-header floating branch. Source mobile display is still icon/logo. Keys come from the actual supplied source key closure; keyed Fragments add no DOM. The renderer must return the actual source HeaderItem tree with its resources, not a substitute navigation list. The same real burger node is used in each source position; supplied nodes still have separate mounted positions exactly as before.
- `FloatingHeaderControls` is exact source text, including local state/ref/closure bodies, 5,000ms intro, 900ms dismiss, timer cancellation/cleanup, pointer handlers, capture focus and related-target containment guard. No timer/controller policy was invented. This full body, excluding surrounding trailing whitespace, has SHA256 `0852979384fcb7ef051252171abb8a1be72f8619251be6bcdca6fca3772a05f4`; exact text comparison against the original returned true. Its constants are relocated original local presentation constants, not copies of excluded shared constants.
- HeaderButton retains href-vs-action branches, prop spread ordering, children, subtle/no-border/gray/lg styling and event props. The source `HTMLButtonElement` ref asserted to an anchor is replaced with `HTMLButtonElement | HTMLAnchorElement`; a `useCallback([ref])` bridge forwards null/current element and returns a callback ref's result. No ref cast is used; focus/preload events remain caller actions. Review this intentional type correction when joining originals, including tooltip ref use.
- HeaderLogo keeps logo-vs-logoAndText content, UnstyledButton/Link attributes and classes. Its original wrapper must resolve `/` vs encoded board-name URL; the leaf has no implicit route default.
- Management keeps all source Mantine primitives and spacing, collection empty-vs-list branch, semantic ul/li, action/badge/leading conditions, default flex-start alignment, string-vs-node title, conditional footer, sticky bars and md mobile/desktop action zones. Source defaults are retained, not synthetic model defaults. DangerZone keeps array shape, index keys and divider-after-each-except-last behavior rather than normalizing children.
- Caller supplies `MANAGE_FLOATING_ACTION_BOTTOM_OFFSET` (48), `MANAGE_ACTION_BUTTON_MIN_WIDTH` (160) and `MANAGE_AFFIX_POSITION` (bottom/right 20) from the actual source constants or a reviewed dependency-light publication. No copied constant module exists. The unsaved bar's original inline bottom 20 is unchanged, not a new shared constant.
- Hero keeps exact Box/Stack/Title/Group/Image tree, 48/64 image height, 128/192 max width, contain fit, flex-shrink, title sizes, 30% desktop marquee positioning and original classes. Caller supplies the original translated title, translated subtitle with actual app name, resolved `logoImageUrl ?? "/logo/logo.png"`, original `${appName} logo` alt, and genuine IntegrationMarquee. No RSC/settings data or fallback app name enters UI.
- Contracts import only React and Mantine types. Runtime imports are React, Mantine, owned same-domain leaves/CSS, and existing `../../components/link`. That Link uses the existing public navigation adapter context, not Next; its real provider remains a held composition dependency. No broad UI barrel, API model/result, principal, DB/auth, frontend/private controller or mutable peer source-view was imported. No new dependency, business helper, `any`, cast, code comment or test was added.

## Held HeaderItem and resources

`HeaderItem` lines 245–421 and `getBoardInitial` lines 423–426 remain solely in the original file. Their omission is deliberate, not parity credit. Original branches still include:

- Board shortcut: missing-board disabled `?` avatar; available name/logo/encoded URL and source initial helper.
- Logo, board-edit action and board-settings action.
- Search: tour target, input/icon branch, desktop input and mobile button placement/alwaysVisible.
- Home link; board switcher open with focus/pointer preload.
- Assistant actual enabled/running/unread indicator and open action.
- Docker actual availability and original technical label/modal action.
- Settings actual user-id-dependent URL; actual theme toggle.
- Fallback user-menu tour target and genuine UserButtonClient.

Held acquisition includes settings preferences, actual ordered HeaderItems and `getHeaderItemKey`, BoardSwitcher lifetime, board query and source 60,000ms freshness/Map, assistant context, Docker modal, user/session/menu, theme settings, i18n, real actions, burger Jotai state, Spotlight/search/tour resources and navigation provider. No board-unavailable, admin, readiness, loading, transport or availability value was fabricated. The complete header CSS retains `.search`/`.userMenu` selectors for the held original subtree; later original import-only CSS joins must not lose them.

Other exclusions remain as P1 records: navigation/header/background wrappers, dynamic breadcrumb, management guards/constants and hero RSC settings/translation acquisition. Original resources and source behavior are not replaced merely by action props.

## Dependencies and admission

Read `packages/ui/package.json` before writing: React, Mantine core/hooks and Tabler are already declared; only React/Mantine are needed by these leaves. Existing CSS-module declarations are already declared, and UI's tsconfig includes src. No installed module was imported or evaluated to verify APIs.

Installed source/declarations were read directly: React 19.2.7 manifest and `@types/react` forwardRef/ForwardedRef; Mantine core 9.6.0 manifest and ActionIcon, AppShell, AffixPosition, UnstyledButton, polymorphic ref, Container, Group and Image declarations; `@types/css-modules/index.d.ts`. Relative `components/link.tsx` and `navigation/index.tsx` were inspected read-only. Context7 was not called because the dispatch states its quota is exhausted. No library API lookup required network access.

Loaded codebase-context and impeccable. Ran only impeccable's read-only context loader with its update check explicitly disabled, then read both register references and actual source components/CSS. Existing identity/layout wins; no font, palette, restyling, accessibility redesign or new motion was introduced.

## CSS artifact evidence and blocker

| Stylesheet          | Original bytes / SHA256                                                   | New bytes / SHA256                                                        | Disposition                               |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| configurable-header | 3243 / `6a35cf11f853325bf690289a0674669d9df4b5b40efcd659a2ebdf1464824453` | 3247 / `034ec09c8f1e13717f18b3748500144aa7a4b6f5bd0030d1dcb17054ce0c66d7` | **Byte-identical freeze blocked**         |
| header-logo         | 491 / `c24652021c9ac0f5329562aaa6dae98c4e1fbfc2db77a48f273171604a466b38`  | 491 / same                                                                | Byte-identical frozen relocation artifact |
| hero-banner         | 469 / `370894667d491b4f61e887010203872b4323ba3de09d60ff4455ca8434348f6f`  | 469 / same                                                                | Byte-identical frozen relocation artifact |

The header patch supplied the exact source CSS. The patch tool automatically wrapped its source line 116 from `border: rem(1px) solid color-mix(in srgb, var(--mantine-color-default-border) 70%, transparent);` onto two lines; a second exact-line patch was automatically wrapped again. The sole observed diff is newline/indentation after `solid`, adding four bytes. Do not accept this as byte identity. An authorized formatter-bypassed exact relocation is required before this artifact's freeze can pass. No out-of-scope formatter/config write or shell file-write bypass was attempted.

Header `rem()`/`$mantine-breakpoint-sm` and hero `@mixin dark/light` remain intact; no macro flattening or redesign. Coarse-pointer/hover-none, focus-within and reduced-motion rules remain intact. `apps/nextjs/package.json` declares `postcss-preset-mantine`; UI does not. Host pipeline admission remains held separately from correcting byte identity. Source logo CSS uses native syntax.

Named current original CSS import consumers found under Next source: `components/layout/header/configurable-header.tsx`, `components/layout/header/header-logo.tsx`, `app/[locale]/manage/_components/hero-banner.tsx`. Coordinator must admit exact CSS subpaths/typings/host pipeline and original import-only joins before old styles are removed. No old stylesheet was removed.

## Original baseline fingerprints

All paths below are relative to `N`. SHA256 covers complete original file bytes, including imports, held controller bodies and trailing newlines.

| Original                                                  | SHA256                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `components/layout/shell.tsx`                             | `56e3e2828272a580baf1ab806011e494003756c17c8745eebde88cefc601936d` |
| `components/layout/header/configurable-header.tsx`        | `dfbbff7fb17da9f8b3f36e798f55d24c260580ffe22b92a20ce66f868afde7c2` |
| `components/layout/header/configurable-header.module.css` | `6a35cf11f853325bf690289a0674669d9df4b5b40efcd659a2ebdf1464824453` |
| `components/layout/header/button.tsx`                     | `dc9d91eb95fd3c8f3e0f09e50253002b512cca3f16291be56f433ab9a016d0a1` |
| `components/layout/header/header-logo.tsx`                | `b067679795448d2a8aab0382725c976c9687391e4bb08812b7e043430befd06a` |
| `components/layout/header/header-logo.module.css`         | `c24652021c9ac0f5329562aaa6dae98c4e1fbfc2db77a48f273171604a466b38` |
| `components/manage/manage-container.tsx`                  | `289a13a6720078a605d0d83d1fbe306001dae272977697d974968f69787e213d` |
| `components/manage/manage-page-layout.tsx`                | `d2a4ceab327a13a2464d4f2c86fc2359d25f828da59f3a2921e4cda6740b7902` |
| `components/manage/manage-collection.tsx`                 | `60fe948e05db8a191ea6880f0796e3686312a8bb060833878a36ed48a99ef8b9` |
| `components/manage/section-card.tsx`                      | `824f8a29d36b913774b357e0b95dc8729f0cd289d978cdf6da1f908464e79043` |
| `components/manage/danger-zone.tsx`                       | `af6e05d9ec8d3527ece5eb235f4d80054375f70b0a1f6934a40e7f890bba97b9` |
| `components/manage/unsaved-changes-bar.tsx`               | `53295b578243fc11eb6eac04b3c71ac9ff15811f6da5c7d4813e4af5fbde1455` |
| `components/manage/manage-sticky-footer.tsx`              | `5e9b96d8f564269deb50549902563ea58bf6c67cec776918e1f8ac22fe7f1f89` |
| `components/manage/manage-mobile-primary-action.tsx`      | `4d7d01bb5a90bbc6ed5dbce390bd54b0d2367c25e036c4a55dccc89e488fe252` |
| `app/[locale]/manage/_components/hero-banner.tsx`         | `987f05bc6336be41bfadab8d6a7c47042a65660b9bf64d687ee5f60903789571` |
| `app/[locale]/manage/_components/hero-banner.module.css`  | `370894667d491b4f61e887010203872b4323ba3de09d60ff4455ca8434348f6f` |

## New candidate fingerprints

All paths below are relative to `U`; this freezes the actual written bytes, including the blocked header CSS. The handoff itself is not self-hashed.

| Candidate                                 | SHA256                                                             |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `chrome/contracts.ts`                     | `79065578c958ff2c734809b0f833ffd5530da39981cc75d996aac96aa87605ca` |
| `chrome/shell-view.tsx`                   | `344259a28532d4ae00af25a0d96a5c079a1767443c5a49f3771abd34915f648b` |
| `chrome/configurable-header-view.tsx`     | `d3c726d4143688f7fe310bfbfac7cd755ff118a757471db71a487a0b31341021` |
| `chrome/configurable-header.module.css`   | `034ec09c8f1e13717f18b3748500144aa7a4b6f5bd0030d1dcb17054ce0c66d7` |
| `chrome/header-button.tsx`                | `25f8c79e10213b8d1a8e57fdfceff0496d57176b000f2f7f8cb27b06524acd8d` |
| `chrome/header-logo-view.tsx`             | `1bcf373d6b614e3fb85aeb2f6bb19586ff412f5a235070b4d01afcdb251f5575` |
| `chrome/header-logo.module.css`           | `c24652021c9ac0f5329562aaa6dae98c4e1fbfc2db77a48f273171604a466b38` |
| `manage/contracts.ts`                     | `d55de481148a1f2d3168ff7b63ae249d581ed1104a8627d01fbfca540da1f95b` |
| `manage/manage-container.tsx`             | `85a14ceccac4e3aa74505ed928895754743b340f38201ec347941a466e11d808` |
| `manage/manage-page-layout-view.tsx`      | `f780d25d3feea2a68c241aba7f2dc082a65bdf106e606906c8530349b6d3390d` |
| `manage/manage-collection.tsx`            | `0c615efe149befc1fc61056e3f0fd96ea4078c4f4c546b191e16b68f3f98535b` |
| `manage/section-card.tsx`                 | `91edf2597a74792364d1a791fae67eb6e57319af263d1c2c92e46bb1a0eaf380` |
| `manage/danger-zone-view.tsx`             | `efaedf360e0d75fca87553d8f904188a0d8d5240e02272e9d263e12a2d4d1b21` |
| `manage/unsaved-changes-bar-view.tsx`     | `8939d88ef2305cb73d92feac4c6847bde9b9447e5bf8d60bb42aebf0a33e82cb` |
| `manage/manage-sticky-footer.tsx`         | `304424717ac82f8a23c2c9d5e0f064dd5e18b8a2e040ad1cb901e3e6819edeec` |
| `manage/manage-mobile-primary-action.tsx` | `5e89c94d8c2583edafa9b6efecd1c86069ea38ac8651cfad5dedec38bf478711` |
| `manage/hero-banner-view.tsx`             | `47043a9c43dddd8c1bd78a7e0fbf52586b08f3cf2fa08b3fe48ee03fcfcca9fd` |
| `manage/hero-banner.module.css`           | `370894667d491b4f61e887010203872b4323ba3de09d60ff4455ca8434348f6f` |

## Validation boundary and next independent review

Only safe source/declaration reads, source-origin/path inventory, byte hashing/diff and the read-only design-context loader were performed. No requested lint/typecheck/build/install/test/check suite, runtime app import/evaluation, live network/provider/SQL/browser, environment/credential/data access, listener, Git mutation or nested agent was run. Automatic patch-time formatting was observed, not independently invoked.

Independent source review should first compare these fingerprints and source render ranges, exact FloatingHeaderControls body and keyed slot composition; review the cast-free ref adaptation; resolve header CSS byte identity without changing design. Only then may the coordinator review/publicly export the presentation contracts and admit the exact original-wrapper/CSS joins, real navigation/resource producers and host pipeline. None of these files grants API/native mutation authority or clears any existing availability, safety, resource or mounting hold.
