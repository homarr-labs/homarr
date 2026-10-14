# PLAYABLE-WAVE32 lane 05

## Exact writes declared before implementation

- `apps/nitro/src/source-ui/chrome/contracts.ts`
- `apps/nitro/src/source-ui/chrome/configurable-header.tsx`
- `apps/nitro/src/source-ui/chrome/navigation.tsx`
- `apps/nitro/src/source-ui/chrome/manage-navigation.tsx`
- `apps/nitro/src/source-ui/chrome/management.tsx`
- `apps/nitro/src/source-ui/chrome/shell.tsx`
- `apps/nitro/src/source-ui/chrome/breadcrumb.tsx`
- `apps/nitro/src/source-ui/chrome/user-menu.tsx`
- `apps/nitro/src/source-ui/chrome/index.ts`
- `apps/nitro/src/features/global-tools/chrome.tsx`
- This handoff, `.scratch/nitro-full-migration/implementation/playable-05.md`.

Only these paths are writable. Original Next files, accepted P1 leaves/CSS, providers, navigation adapters, root routes and manifests remain untouched. P1 bodies are consumed, not re-extracted. No peer work is treated as accepted.

## Coordinator declaration requests (01)

Publish accepted P1 named exports and types through `@homarr/ui/source-views/chrome` and `@homarr/ui/source-views/manage`. Publish the existing canonical stylesheet at `@homarr/ui/source-views/chrome/configurable-header.module.css` without copying or editing it. The header subtree consumes its original search/user-menu selectors. Admit the original Mantine PostCSS pipeline separately; macro flattening is not permitted. All runtime library imports use already declared Nitro dependencies.

## Frozen outcome

Concrete implementation complete and frozen. Nine frontend-local files plus the exclusively leased global-tools chrome were written. No root route, provider, adapter, shared UI body/CSS, manifest, lock, Next original, test or Git state was edited. No listener, browser, install, build, native action or authenticated API call was launched. This is source presentation ready for lane 01's export admission and copied preview integration, not a claim that a route is already mounted.

### Immediate mount entrypoints and exact props

Import named exports from `apps/nitro/src/source-ui/chrome/index.ts` (relative app imports, no package declaration needed).

- `SourceChrome(props: SourceChromeProps)`: required `collapsed`, `onToggleNavigation`, `backgroundProps`, `header`; optional `children`, `navigation`, `mainId`, `direction`, `sessionBlocked`. `header` is `ConfigurableHeaderProps` minus `burger` and `hasNavigation`. Supply the original MainNavigation node as `navigation`. The burger is the actual source Mantine Burger with sm visibility/size, and AppShellMain wraps the supplied route body. Navigation state is caller-owned, not a new global store.
- `ClientShell(props: ClientShellProps)`: P1 ShellView props except `headerHeight`, plus required `headerVisible`; exact visible height 60, hidden height 0. Optional P1 `hasHeader`/`hasNavigation` defaults remain true. Source navbar remains 300px/sm/mobile collapsed; source background spread/minimum 100dvh and padding remain unchanged.
- `ConfigurableHeader(props: ConfigurableHeaderProps)`: required canonical `HeaderPreferences`, `hasNavigation`, `burger`, `spotlight` and `HeaderResources`; optional context `actions`. Real zones and `getHeaderItemKey` are consumed directly from `@homarr/validation/header-preferences`, the already-exported canonical header model, not a copied model.
- `HeaderItem(props: HeaderItemProps)`: `HeaderResources` plus actual `item`, `display`, and resolved `board | undefined`. `HeaderResources` requires `logo`, `logoWithTitle`, resolved `logoHref`, actual `boards`, real `userId | null`, real `userMenu`, `desktopSearchInput`, `renderMobileSearchButton(alwaysVisible)`, `boardSwitcher`, `assistant | null`, `docker | null`, `themeToggle`, `TourTarget`, `label(HeaderBuiltinItemId)`, `boardUnavailableLabel`, and invariant `dockerLabel`; optional `boardEditAction`/`boardSettingsAction`.
- `MainNavigation(props: MainNavigationProps)`: required actual `links`, `collapseNavigation`, `TourTarget`; optional original header/footer sections. Links retain original icon/iconProps/hidden/tour-id, href/external/exact branches and nested item data. `CommonNavLink` also exposes the rendered-icon variant `ClientNavigationLink` plus the same navigation actions. `ChromeLink(NavigationLinkProps)` is a stable thin function delegating to the accepted UI NavigationProvider's actual Link; it avoids Mantine's ComponentType union inference issue without a router replacement or type cast.
- `createManagementNavigation(options: ManagementNavigationOptions)`: required `access`, `navbarLabel`, `entityLabel`, `documentationHref`, `homarrLogoPath`; returns the complete source ordered route tree. `access` requires independently resolved display booleans `apps`, `integrations`, `admin`, `searchEngineCreate`, `mediaUpload`, `viewLogs`, `credentials`, `docker`, `kubernetes`, `backup`. These are display inputs, never a principal or authority grant. Source admin+Docker/Kubernetes and admin+backup conditions remain in the exact tree.
- `DynamicBreadcrumb(props: DynamicBreadcrumbProps)`: required translated `homeLabel`, `actionLabel(create|edit)`, `entityLabel`, `newLabel`, `navigationLabel(key): string | undefined`; optional `customHome` (default manage, supports null), `customHomeLink` (default /manage), `dynamicMappings: ReadonlyMap`, `nonInteractable`. Uses accepted UI canonical pathname/Link, original segment/action/entity/invariant mapping precedence, raw unresolved dynamic segment fallback and noninteractive tools category.
- `UserButton(props: UserButtonProps)`: required actual `avatar`, supplied `updateIndicator` component/`updatesMenuItem`, actual `colorSchemeCombobox`/`languageCombobox`, authorized `boardSettingsHref | null`, `boardSwitcher`, `assistant | null`, `docker | null`, real `session`, `signOut`, localized `labels`. Session is authenticated+userId, unauthenticated, or unavailable+reason. No account, update result, permission, logout endpoint or currentness is invented.
- `ManagePageLayout(props: ManagePageLayoutProps)` and `ManageCollectionPage(props: SourceManageCollectionPageProps)` directly compose P1, supplying the actual source 48px floating offset; all other props are unchanged P1 contracts, including required breadcrumb. `ManageMobilePrimaryAction({children})` supplies the original 160px and bottom/right20 constants. These exact source values come from read-only layout/manage constants, not a new preference default.
- Reexports without duplicate render bodies: `ManageContainer`, `ManageCollectionList`, `ManageCollectionItem`, `SectionCard`, `ManageStickyFooter`, `DangerZoneRootView`, `DangerZoneItem`, `UnsavedChangesBarView`, `HeroBannerView`, and their published P1 prop types. Hero marquee/branding/copy remains real caller-supplied content.
- `GlobalToolsChrome(props: GlobalToolsChromeProps)` keeps snapshot/queryClient/slots/signals/labels/children and now requires `chrome` plus explicit `sessionBlocked`. Its chrome header omits spotlight: the Search slot is mounted exactly once in P1's original spotlight position. Assistant/Operations hosts mount once separately. The old generic brand/header/nav/main tree is gone. No active root session-transition implementation is imported. Existing `GlobalToolFeedback`, signal/slot types and `freezeGlobalToolSlots` are preserved. This API has no current mounted callsites in the inspected baseline; lane 01 and provider lane 25 must pass explicit session currentness instead of relying on an active peer hook.

### Exact original source mappings and preservation

`N = apps/nextjs/src/`, `U = packages/ui/src/source-views/`.

| Owned implementation               | Original specification / accepted dependency                                                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell.tsx`                        | N/components/layout/shell.tsx, header/burger.tsx, layout/constants.ts; consumes U/chrome/shell-view.tsx unchanged                                                                                                                                          |
| `configurable-header.tsx`          | N/components/layout/header/configurable-header.tsx HeaderItem lines245–426; consumes accepted ConfigurableHeaderView/HeaderButton/HeaderLogoView and canonical header CSS unchanged                                                                        |
| `navigation.tsx`                   | N/components/layout/navigation.tsx and navigation-link.tsx; replaces Next pathname/Link and Jotai collapse acquisition with public UI navigation and explicit collapse action                                                                              |
| `manage-navigation.tsx`            | N/app/[locale]/manage/layout.tsx complete navigationLinks array, original icons/order/tour targets/conditions/URLs; removes server auth/env/access acquisition only                                                                                        |
| `breadcrumb.tsx`                   | N/components/navigation/dynamic-breadcrumb.tsx; original Mantine breadcrumb tree and all original label maps, direct router-aware links                                                                                                                    |
| `user-menu.tsx`                    | N/components/user-avatar-menu.tsx and header/user-client.tsx render; preserves width300, portal/keepMounted, menu order, combobox nonclosing items, hotkeys, Assistant running/unread and 99+ indicators, preferences/management/board settings/auth links |
| `management.tsx`                   | accepted U/manage leaves exclusively; original N/components/manage/manage-page.constants.ts values20/48/160 supplied to P1                                                                                                                                 |
| `contracts.ts`, `index.ts`         | explicit frontend-local types and named exports, no API transport or server controller copied                                                                                                                                                              |
| `features/global-tools/chrome.tsx` | replaces unmounted generic composition contract tree with actual SourceChrome; retains skip link, tool signal feedback and explicit session-transition announcement                                                                                        |

Every genuine HeaderItem branch is present: missing-board disabled question-mark avatar; board name/logo/encoded route and Unicode initial; logo display; board edit/settings slots; input plus mobile search versus always-visible icon; home; switcher open/focus/pointer preload; enabled Assistant with original loader/unread Indicator; actual Docker availability; user-dependent settings route; theme toggle; user-menu tour target. ConfigurableHeaderView still owns exact desktop/mobile zones and hidden-header floating controls with accepted 5000ms intro/900ms dismissal, cleanup, focus/coarse-pointer/reduced-motion rules. Canonical CSS is neither copied nor flattened.

Unavailable switcher/theme/Docker/logout resources get disabled original controls with the real supplied reason instead of fake success or a no-op action. Missing Assistant/Docker capabilities retain original hidden branches. An unavailable session cannot masquerade as an unauthenticated login state. All live action callbacks remain resource-owner obligations.

Navigation retains client hydration gating, prefix/exact matching, longest-match nested selection, automatic open on active location, manual submenu state, mobile collapse on internal links, external target_blank and original tour target composition. Original index keys and child label keys are preserved. Source header/library APIs remain Mantine9.6.0 and React19.2.7; installed declarations were inspected, including NavLink/ActionIcon/AppShell/Menu/React and Tabler icon types. No Context7 call was made because the wave explicitly records exhausted quota.

### Exact route inventory

Management tree, in original order: `/manage` (exact), `/manage/boards`, `/manage/apps`, `/manage/integrations`, `/manage/custom-widgets`, `/manage/search-engines`, `/manage/medias`; users submenu `/manage/users`, `/manage/users/invites`, `/manage/users/groups`; tools submenu `/manage/tools/docker`, `/manage/tools/kubernetes`, `/manage/tools/api`, `/manage/tools/logs`, `/manage/tools/certificates`, `/manage/tools/tasks`, `/manage/tools/backup`; `/manage/assistant`, `/manage/settings`; help links to caller-resolved documentation, `https://github.com/homarr-labs/homarr/issues/new/choose`, `https://discord.com/invite/aCsmEV5RgA`, `https://github.com/homarr-labs/homarr`; `/manage/about`.

Header/menu routes: supplied logoHref (source root `/` or current board), `/boards`, `/boards/${encodeURIComponent(board.name)}`, caller-authorized board settings URL (source `/boards/${encodeURIComponent(board.name)}/settings`), `/manage/users/${realUserId}/general`, `/manage`, `/auth/login`. This inventory does not claim the destination loaders/actions have been mounted or authorized.

## Exact lane 01 publication requirements

The existing accepted P1 files have no public chrome/manage barrels or exports in the frozen manifest. Lane 01 must publish named exports/types before the preview imports this lane:

- `@homarr/ui/source-views/chrome`: `ShellView`, `ConfigurableHeaderView`, `HeaderButton`, `HeaderLogoView`, and `ShellViewProps`, `HeaderDisplay` (all existing files/contracts).
- `@homarr/ui/source-views/manage`: all existing P1 management view symbols/types referenced in `management.tsx`; notably names are `DangerZoneRootView` and `DangerZoneItem`, not a fabricated DangerZone namespace.
- `@homarr/ui/source-views/chrome/configurable-header.module.css`: exact existing canonical P1 stylesheet. Header/logo/hero relative CSS imports stay at their canonical P1 locations.
- Original host PostCSS Mantine rem/breakpoint/dark/light pipeline, with declarations/install controlled by 01. Header CSS remains Oracle-approved formatting-equivalent, not claimed byte-identical; logo/hero CSS and all P1 leaf hashes matched P1's accepted handoff in the immutable snapshot.

No new external runtime package is required by lane05: Nitro already declares React, Mantine core, Tabler, TanStack Query, zod, @homarr/ui and @homarr/validation. CSS typing used the existing declared UI @types/css-modules in the focused closure; lane01 must admit host CSS typing if its preview config does not already provide it.

## Focused immutable validation

Final source/dependency/config closure copied physically, without symlinks or watched peers, to `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-05-frozen-xkzv9sn7`. It contains only owned TS/TSX, frozen P1 leaves/CSS and their UI Link/navigation context, canonical header-preferences, frozen ProviderProps/RenderSnapshot, the baseline skip-link stylesheet, copied oxlint configs and32 discovered external dependency packages. Public UI manifest was copied unchanged, deliberately preserving its missing exports rather than fabricating success. Original external installed tools alone run from explicit paths. No build/config stub, tunnel, install, test or emit was introduced.

Both commands used `env -i`, Node `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`, PATH that Node directory + `/usr/bin:/bin`, disposable HOME/TMPDIR under the closure, `CI=true`, `NO_COLOR=1`. Tool versions verified from installed manifests: oxlint1.73.0, TypeScript7.0.2. No env file/credential/NODE_OPTIONS was loaded.

- Lint: `node <original-root>/node_modules/oxlint/bin/oxlint -c apps/nitro/.oxlintrc.json apps/nitro/src/source-ui/chrome apps/nitro/src/features/global-tools/chrome.tsx`. **PASS: exit0, 0 warnings/0 errors, 10 files/197 rules**.
- Typecheck: `node <original-root>/node_modules/typescript/bin/tsc --noEmit --strict --target ES2023 --module ESNext --moduleResolution bundler --jsx react-jsx --lib ES2023,DOM,DOM.Iterable --types react,css-modules --skipLibCheck --esModuleInterop apps/nitro/src/source-ui/chrome/*.ts apps/nitro/src/source-ui/chrome/*.tsx apps/nitro/src/features/global-tools/chrome.tsx`. **BLOCKED: exit1, only seven TS2307 missing-public-export diagnostics**: chrome import in configurable-header.tsx, contracts.ts and shell.tsx; manage imports/reexports in management.tsx at lines5/10/22/33. Earlier own Mantine polymorphic Link diagnostics were corrected by the stable thin ChromeLink and disappeared in this final run. Missing-public-export errors prevent a whole-lane typecheck pass; none is claimed.

Mount/build/browser/race proof belongs to01 after the exact declarations and original CSS pipeline are admitted. Native queries/actions and session currentness are not established by this presentation snapshot.

Post-check comparison confirmed all10 owned final TS/TSX files remained byte-identical to the validated immutable closure. No code edits followed the final lint/typecheck.

### Final owned SHA256 identities

| Path suffix (under apps/nitro/src)       | SHA256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| source-ui/chrome/contracts.ts            | `2d7f60678d22c8fc38d269333301f7d2efe55f47c8b3245da49fb70fd56528ee` |
| source-ui/chrome/configurable-header.tsx | `d441f010632b22b0f92c87f764071883ce23dd39ba619d04db37dd36ae5a4975` |
| source-ui/chrome/navigation.tsx          | `7b956271617b1bdee63f608a8dd3055daf935f2595827c6db33e45a505880ccd` |
| source-ui/chrome/manage-navigation.tsx   | `6ec8ece03e8fc0d8d6dc5206047731aa9fc57fb8a229291a58211ee3e26abfa5` |
| source-ui/chrome/management.tsx          | `e7664b46d686ad3882784f0c2a364c4a953bd4b2e6851b81d8f3f94e18081a53` |
| source-ui/chrome/shell.tsx               | `6c603a0ec2258d5918b86e8a806da432472ee18e4d7ee98e11f6afe178861cfb` |
| source-ui/chrome/breadcrumb.tsx          | `0de55bdbcdbd1fddb458ee0c4dff7cda9cb1824c95e122043b8eeb2cdcccd917` |
| source-ui/chrome/user-menu.tsx           | `89076e11758c588ee2ca8598157be7ce749dda9fdaa550e30778f1ec132c1ab6` |
| source-ui/chrome/index.ts                | `967c8c2e19fca7b4b1bf7ccc6f30976af1765b9e8a1a24a58304a0f3b09c10bc` |
| features/global-tools/chrome.tsx         | `8aa62c07abc7aa4a62b35044273fee79a0f86f5182fad4d2fc5b93968ad77bca` |

## Remaining real resource joins, not fake implementations

Lane01/02/25 must bind accepted actual header settings/session/admin-current update acquisition, 60-second board-shortcut query freshness and exact generated options/keys. Source's admin-current update query defers2seconds and has one-hour freshness; those are not replaced by a local fake update result here. Lane17 supplies genuine desktop/mobile search controls and one lazy Spotlight host. Lane18 supplies actual board edit/settings/switcher preload/open ownership. Lane21 supplies actual Assistant enabled/running/unread/open. Lane14 supplies actual permitted Docker modal ownership. Lane23 supplies real TourTarget lifecycle. Lane03 supplies accepted UI NavigationProvider/Router navigation and prefetch. Logout and theme/locale comboboxes remain real session/settings provider actions, including failure handling and durable reconciliation. P1 hero's IntegrationMarquee remains caller-supplied genuine content. Presentation callback props never authorize an action or clear a held native join.

## Additive publication lease: exact writes before implementation

The returned05 slot now owns only two new files and this handoff:

- `packages/ui/src/source-views/chrome/index.ts`
- `packages/ui/src/source-views/manage/index.ts`
- `.scratch/nitro-full-migration/implementation/playable-05.md`

Both barrels were confirmed absent. The prior10 chrome/global-tools implementation files, accepted P1 bodies/CSS/contracts, manifests and all other files stay frozen.

Exact chrome value exports: `ShellView` from shell-view; `ConfigurableHeaderView` from configurable-header-view; `HeaderButton` from header-button; `HeaderLogoView` from header-logo-view. Exact chrome type exports needed by frozen05: `HeaderDisplay`, `ShellViewProps` from contracts. No unused source contracts are expanded.

Exact manage value exports: `ManageContainer` from manage-container; `ManagePageLayoutView` from manage-page-layout-view; `ManageCollectionPage`, `ManageCollectionList`, `ManageCollectionItem` from manage-collection; `SectionCard` from section-card; `DangerZoneRootView`, `DangerZoneItem` from danger-zone-view; `UnsavedChangesBarView` from unsaved-changes-bar-view; `ManageStickyFooter` from manage-sticky-footer; `ManageMobilePrimaryAction` from manage-mobile-primary-action; `HeroBannerView` from hero-banner-view.

Exact manage type exports from contracts: `ManageContainerProps`, `ManagePageLayoutViewProps`, `ManageCollectionPageProps`, `ManageCollectionListProps`, `ManageCollectionItemProps`, `SectionCardProps`, `DangerZoneRootViewProps`, `DangerZoneItemProps`, `UnsavedChangesBarViewProps`, `ManageStickyFooterProps`, `ManageMobilePrimaryActionProps`, `HeroBannerViewProps`.

All exports are explicit named bindings to already accepted P1 sources. No wildcard export, namespace, API/client resource, new render body, CSS fork or broad root barrel is introduced. Lane01 alone owns exact manifest and canonical CSS subpath declarations. At lease preflight the two exact public subpaths remain undeclared; the existing manage/collection subpath is not a substitute.

### Additive publication frozen result

Both new barrels are complete: chrome has4 named values/2 named types; manage has12 named values/12 named types. Only these two files and this handoff were edited under the new lease. No prior05 implementation, P1 leaf/CSS/contract, package manifest, source wrapper or runtime was changed.

New barrel identities:

- `packages/ui/src/source-views/chrome/index.ts`: SHA256 `7df4dfa34d27c32e2df1b1db132564adee21da2a401cc41066c7ed329a6e987e`.
- `packages/ui/src/source-views/manage/index.ts`: SHA256 `12e1b7e8587031d83dc42b5a492cb2ac75b0c00bd692dd090b2b6f044c356bb4`.

Source provenance below is relative to `packages/ui/src/source-views/`. All18 existing files matched the accepted P1 handoff and previous frozen05 physical closure before publication checks, then remained byte-identical after checks. The original-source mappings remain those of `implementation/source-presentation-P1.md`; these barrels bind accepted symbols directly, never re-extract their bodies.

| Accepted source                         | SHA256                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| chrome/contracts.ts                     | `79065578c958ff2c734809b0f833ffd5530da39981cc75d996aac96aa87605ca` |
| chrome/shell-view.tsx                   | `344259a28532d4ae00af25a0d96a5c079a1767443c5a49f3771abd34915f648b` |
| chrome/configurable-header-view.tsx     | `d3c726d4143688f7fe310bfbfac7cd755ff118a757471db71a487a0b31341021` |
| chrome/header-button.tsx                | `25f8c79e10213b8d1a8e57fdfceff0496d57176b000f2f7f8cb27b06524acd8d` |
| chrome/header-logo-view.tsx             | `1bcf373d6b614e3fb85aeb2f6bb19586ff412f5a235070b4d01afcdb251f5575` |
| chrome/configurable-header.module.css   | `034ec09c8f1e13717f18b3748500144aa7a4b6f5bd0030d1dcb17054ce0c66d7` |
| chrome/header-logo.module.css           | `c24652021c9ac0f5329562aaa6dae98c4e1fbfc2db77a48f273171604a466b38` |
| manage/contracts.ts                     | `d55de481148a1f2d3168ff7b63ae249d581ed1104a8627d01fbfca540da1f95b` |
| manage/manage-container.tsx             | `85a14ceccac4e3aa74505ed928895754743b340f38201ec347941a466e11d808` |
| manage/manage-page-layout-view.tsx      | `f780d25d3feea2a68c241aba7f2dc082a65bdf106e606906c8530349b6d3390d` |
| manage/manage-collection.tsx            | `0c615efe149befc1fc61056e3f0fd96ea4078c4f4c546b191e16b68f3f98535b` |
| manage/section-card.tsx                 | `91edf2597a74792364d1a791fae67eb6e57319af263d1c2c92e46bb1a0eaf380` |
| manage/danger-zone-view.tsx             | `efaedf360e0d75fca87553d8f904188a0d8d5240e02272e9d263e12a2d4d1b21` |
| manage/unsaved-changes-bar-view.tsx     | `8939d88ef2305cb73d92feac4c6847bde9b9447e5bf8d60bb42aebf0a33e82cb` |
| manage/manage-sticky-footer.tsx         | `304424717ac82f8a23c2c9d5e0f064dd5e18b8a2e040ad1cb901e3e6819edeec` |
| manage/manage-mobile-primary-action.tsx | `5e89c94d8c2583edafa9b6efecd1c86069ea38ac8651cfad5dedec38bf478711` |
| manage/hero-banner-view.tsx             | `47043a9c43dddd8c1bd78a7e0fbf52586b08f3cf2fa08b3fe48ee03fcfcca9fd` |
| manage/hero-banner.module.css           | `370894667d491b4f61e887010203872b4323ba3de09d60ff4455ca8434348f6f` |

### Additive publication isolated checks

Physical immutable closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-05-publication-wsb8znxy`. Reuses the previously copied declared external dependencies and accepted source closure, adds only the real new barrels, and copies the actual UI manifest unchanged. No generated type stub, temporary manifest override, paths alias, wildcard declaration expansion or missing-export bypass was used. All checks had `env -i`, explicit Node24.18.0, disposable HOME/TMPDIR, CI=true/NO_COLOR=1, and no emit/cache/build/test/runtime.

- New-barrel lint: `node <original-root>/node_modules/oxlint/bin/oxlint -c .oxlintrc.json packages/ui/src/source-views/chrome/index.ts packages/ui/src/source-views/manage/index.ts`. **PASS, exit0: 0 warnings/0 errors, 2 files/197 rules**.
- Barrel entrypoint + actual accepted transitive closure types: `node <original-root>/node_modules/typescript/bin/tsc --noEmit --strict --target ES2023 --module ESNext --moduleResolution bundler --jsx react-jsx --lib ES2023,DOM,DOM.Iterable --types react,css-modules --skipLibCheck --esModuleInterop packages/ui/src/source-views/chrome/index.ts packages/ui/src/source-views/manage/index.ts`. **PASS, exit0, no diagnostics**. This verifies real relative source bindings and accepted React/Mantine types, not public package subpath resolution or CSS transformation.
- Actual frozen05 consumer typecheck: same strict compiler flags with `apps/nitro/src/source-ui/chrome/*.ts`, `*.tsx` and `apps/nitro/src/features/global-tools/chrome.tsx`. **Still BLOCKED, exit1: exactly the seven TS2307 diagnostics already recorded above**, because the captured real manifest has no exact chrome/manage public subpaths. No consumer typecheck pass is claimed.
- Post-check byte comparison: **PASS** for both new barrels, all18 existing P1 files, and all10 prior05 implementation files against the checked physical closure.

The checked UI manifest SHA256 is `cb829c78840c922b8b37f94d4d804081922a230206eda80e7aa85b686f799e1e`. In that actual snapshot all three required declarations are absent. Lane01's exact remaining manifest additions are:

```json
{
  "./source-views/chrome": "./src/source-views/chrome/index.ts",
  "./source-views/manage": "./src/source-views/manage/index.ts",
  "./source-views/chrome/configurable-header.module.css": "./src/source-views/chrome/configurable-header.module.css"
}
```

This is a declaration request to01, not an edit or assumed approval. Source CSS pipeline admission, genuine resources and runtime mounting remain the previously recorded holds. The complete05 implementation plus these two frozen additive barrels are now ready for the requested independent review.

## Reopened portal transition repair: exact writes before implementation

Only these two paths will be written under the reopened05 lease:

- `apps/nitro/src/source-ui/chrome/shell.tsx`
- `.scratch/nitro-full-migration/implementation/playable-05.md`

The other three optionally reopened files are not needed. ConfigurableHeader, HeaderItem, UserButton, contracts, other05 files, accepted P1 bodies/CSS and both publication barrels remain frozen.

Repair boundary: the actual SourceChrome `sessionBlocked` state will remove the supplied `header.userMenu` node before ConfigurableHeader composes its desktop/mobile item and hidden-header floating copies. This unmounts the actual UserButton/Menu and all descendant body portals, removing their menu/link/action event handlers during transition rather than trusting ancestor DOM inertness. When unblocked, the original supplied menu node is restored with its original withinPortal/keepMounted/order/focus/hotkey semantics; no fake action, generic wrapper or authority claim is introduced. An old open menu cannot survive or automatically reopen across the transition. Already-started resource operations and full session/backend authorization remain held at their real owners.

### Portal repair frozen result for rereview

Implemented exactly one source-line addition in `shell.tsx`, after the header spread:

```tsx
userMenu={sessionBlocked ? null : header.userMenu}
```

This overrides only the actual menu resource supplied to the existing ConfigurableHeader. Its unchanged `floatingUser={userMenu}` and HeaderItem props consume that same value in every original placement. While blocked the menu component, Menu.Target, Menu.Dropdown, body Portal descendants and their React event callbacks are absent, rather than still interactive behind a DOM-inert ancestor. On unblock the unchanged original node remounts closed; unblocked `withinPortal`, `keepMounted`, menu order, keep-mounted lifetime, links, action callbacks, focus configuration, keyboard handling and hotkey labels are not rewritten. The other header/layout nodes keep their original structure and existing inert presentation fence.

No changes were needed in `user-menu.tsx`, `configurable-header.tsx` or `contracts.ts`. All other05 files and both additive P1 barrels remain unchanged. This is the explicitly permitted unmount solution, not an inert-based authorization boundary, generic wrapper, fabricated unavailable action or cancellation claim for a resource operation already started before the transition. Full session/backend authority remains held.

New `apps/nitro/src/source-ui/chrome/shell.tsx` SHA256: `947e2cf4490a260fea0323c22ef3fd1dddc3413b7eb14d8e7794c56ac58f1842`. Only this identity supersedes the earlier05 source identity table; the other nine identities and both barrel identities remain valid.

### Portal repair real isolated validation and raw evidence

Final physical, no-symlink source/dependency/config closure:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-05-portal-fence-upy10vhy`

The real lane01 manifest now declares both public barrels and the canonical header CSS subpath. It was copied unchanged into the closure, SHA256 `009be1c65d09c5e00729037c69762d6bdc3a985fdf6f3204110b5e8bc35b8292`. No source/manifest alias, fake declaration or missing-export bypass was used. This resolves the historical consumer export blocker for this actual snapshot; no other resource/authority/runtime hold is cleared.

Both checks used `env -i`, Node `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`, PATH that Node directory + `/usr/bin:/bin`, HOME/TMPDIR under this disposable closure, `CI=true`, `NO_COLOR=1`, and no inherited environment/env-file/credentials. Explicit installed tool entrypoints and previously physically copied declared dependency packages were used.

- Focused repair lint: `node <original-root>/node_modules/oxlint/bin/oxlint -c apps/nitro/.oxlintrc.json apps/nitro/src/source-ui/chrome/shell.tsx`. **PASS, exit0: 0 warnings/0 errors, 1 file/197 rules**.
- Strict actual05 consumer types: `node <original-root>/node_modules/typescript/bin/tsc --noEmit --strict --target ES2023 --module ESNext --moduleResolution bundler --jsx react-jsx --lib ES2023,DOM,DOM.Iterable --types react,css-modules --skipLibCheck --esModuleInterop <nine explicit source-ui/chrome TS/TSX paths> apps/nitro/src/features/global-tools/chrome.tsx`. **PASS, exit0, stdout/stderr empty**. Checks the repaired shell with the unchanged05 consumer graph, real public barrels, P1 bodies/contracts and actual installed library types.

Raw artifacts in the closure, not summaries or regenerated output:

- `lint.stdout.log`: actual `Found 0 warnings and 0 errors.` and `Finished in 172ms on 1 file with 197 rules using 16 threads.`
- `lint.stderr.log`: empty.
- `typecheck.stdout.log`, `typecheck.stderr.log`: both empty.
- `lint.command.json`, `typecheck.command.json`: exact executed argv including absolute tool paths and every explicit source file.
- `validation-status.json`: actual lint/typecheck return codes, both0.
- `source-hashes.sha256.log`: actual SHA256 values of all checked05 files, accepted P1 files and both barrels, plus captured real manifest metadata.

Preflight verified all otherwise frozen05/P1/barrel inputs against the prior publication closure. Post-check comparison verified all those inputs were still unchanged and the repaired shell remained byte-identical to its checked copy. Only the repaired shell and this handoff were written in the checkout. No tests, child agents, Git operation, build, app runtime, browser or server launch occurred. Ready for requested independent rereview; no runtime portal/focus proof is claimed from static lint/types.
