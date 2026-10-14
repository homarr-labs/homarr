# PLAYABLE-WAVE32 lane08

## Exact write inventory before implementation

- `apps/nitro/src/source-ui/settings/header-composer.tsx`
- `apps/nitro/src/source-ui/settings/header-composer.module.css`
- `apps/nitro/src/source-ui/settings/board-select.tsx`
- `apps/nitro/src/source-ui/settings/index.ts`
- `apps/nitro/src/features/settings/schema.ts`
- `apps/nitro/src/features/settings/data.ts`
- `apps/nitro/src/features/settings/instance-form.tsx`
- `apps/nitro/src/features/settings/preference-form.tsx`
- `apps/nitro/src/features/settings/pages.tsx`
- `apps/nitro/src/features/settings/branding-fields.tsx`
- `apps/nitro/src/features/identity/header-preferences.tsx`
- `apps/nitro/src/features/identity/preferences.tsx`
- This handoff.

Original sources, accepted P2 presentation leaves, shared providers, Identity clients, routes, manifests and peers remain read-only. No child agents, Git, tests, comments or installations.

## Immediate dependency requests to01

The original header composer uses repository-declared/catalog-pinned `@dnd-kit/dom` and `@dnd-kit/react` 0.5.0 (already declared by the original Next app). Admit those exact direct Nitro dependencies before bundling this lane; no new library/version is requested. Existing Nitro declarations cover React, Mantine, Tabler, Query and Zod. Existing source-relative settings imports additionally require direct `@homarr/settings` and `@homarr/server-settings` workspace admission for normalized public packaging.

Host-provided original BoardLayoutThumbnail and HomarrLogo renderers, image picker, CSS editor/Workshop import and original board selection rich renderer are consumer slots, not mutable peer imports. Supply only frozen accepted implementations. Missing rich branding editors are visibly unavailable; no textarea replacement is claimed.

## Frozen implementation

The exact inventory above is complete and frozen. No shared/provider/client/route/manifest/original file was edited. The preexisting `SettingsFeatureClient`, draft generation guard, partial-group reconciliation and same-key cancellation/publication algorithms are reused rather than rewritten. Compile-only dependency snapshots do not admit mutable peers as accepted runtime implementations.

### Immediately mountable exports and props

| Entry                                        | Export                                                                           | Required composition                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nitro/src/source-ui/settings/index.ts` | `HeaderComposer`, `HeaderComposerProps`, `HeaderComposerBoard`, `moveHeaderItem` | Controlled `value: HeaderPreferences`, `onChange`, accessible `boards: {id,name,logoImageUrl}[]`, desktop/mobile home IDs, actual branding `appName`, actual logo React node. Optional `disabled` and `renderBoardPreview({boardId,label,className})`. No transport/provider/authority is created.                            |
| Same entry                                   | `BoardSelect`, `BoardSelectProps`                                                | Original board icon/image + label option presentation; normal Mantine Select props and controlled values; actual `{id,name,logoImageUrl}[]` catalog. Only the old custom-select wrapper glue changes to Mantine v9 `renderOption`; portal, clear, saved ID and callback behavior remain controlled.                           |
| `features/settings/instance-form.tsx`        | `InstanceSettingsForm`                                                           | Existing real client/initial canonical snapshot/search engines/access/cache scope/documentation href; optional `boards` and frozen original rich `brandingSlots`. The missing source board defaults/status group is restored and persisted via the actual existing `saveSettings({settingsKey:"board",value})` signature.     |
| `features/settings/preference-form.tsx`      | `PreferenceSettingsForm`                                                         | Existing client/initial canonical preferences/search engines/source formatting/access/cache scope; required `headerComposer: Pick<HeaderComposerProps,"appName"                                                                                                                                                               | "logo" | "renderBoardPreview">`; optional accessible `boards`and current-user`languageSlot`. |
| `features/settings/pages.tsx`                | `InstanceSettingsPage`, `PreferenceSettingsPage`                                 | Existing real read scope and client. Instance forwards optional board catalog. Preference forwards board catalog and required header composition. The host owns acquisition of those catalogs; no invented board client method is added.                                                                                      |
| `features/identity/preferences.tsx`          | `UserPreferencesForm`, `UserPreferencesPresentation`                             | `userId`, existing genuine IdentityBoundary; optional presentation `{header,weekdays,language}` from source branding/culture. `mutationHoldReason` defaults to an explicit hold. Only an accepted host binding may pass `null`; merely supplying a client is not release of native mutation authority.                        |
| `features/identity/header-preferences.tsx`   | `HeaderPreferencesEditor`                                                        | Existing value/change/board option/disabled props plus desktop/mobile home IDs and optional source `presentation`. Without presentation the original saved header is retained and the composer is visibly held. With presentation it delegates to the same original HeaderComposer body, not the old MultiSelect replacement. |

`features/settings/index.ts` is unchanged and continues publishing both settings pages/forms and existing controllers. The new source-ui barrel is independently importable and requires no route or global provider change.

### Exact original source mapping

- `apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx` → `source-ui/settings/header-composer.tsx`: original Mantine tree, item/icon catalog, device stage, three droppable zones, drag overlay, selection tray, search/logo segmented controls, board-add menu and required-account removal guard. Pointer distance remains six pixels; `KeyboardSensor` and `SortableKeyboardPlugin` remain the original implementation. `moveHeaderItem` retains the original remove/clamp/insert algorithm. Source casts are replaced with checked drop-data narrowing and explicit enum checks, not unsafe assertions. Added disabled guards cover controls, callbacks, sortable and droppable hooks. Brand/provider and thumbnail acquisition become typed React slots, not substitutes for native reads.
- Original `header-composer.module.css` → owned identically named CSS module: source device/zone/tray/overlay layout, spacing, state attributes and reduced-motion rules retained. Only the original Mantine PostCSS breakpoint variable becomes its actual default `48em`, so plain Nitro CSS does not require an unadmitted PostCSS plugin.
- `apps/nextjs/src/components/board/board-select.tsx` → `source-ui/settings/board-select.tsx`: same board logo/image fallback icon and weighted label render; the framework-era select adapter changes to current installed Mantine Select's native renderOption contract. No new board DTO/authority is inferred.
- `manage/settings/_components/{settings-form,board-settings-form,analytics.settings,crawling-and-indexing.settings}.tsx` → existing settings controller plus the restored instance board section, source switches and full eight-group schema. Analytics and crawler switches reuse the accepted P2 `SettingSwitchView` directly; no duplicate body is extracted. Its source title-region click/disabled semantics remain intact.
- `manage/settings/_components/branding-settings-form.tsx` → retained branding fieldsets/summary plus actual source `BoardColorInput` and `CornerStylePicker`. The earlier generic radius Select and plain CSS textarea are removed. Missing source image picker/CSS editor/Workshop import have visible holds and retain saved values; optional rich slots remain controlled and disabled-guarded. No missing editor is represented as functional.
- `manage/users/[userId]/general/_components/_general-settings-form.tsx` → restored preferences/header/home-board/search/language/byte/accessibility controls using existing accepted settings/Identity controllers. Profile name/email/avatar remain lane06's responsibility and are not duplicated here. Source weekday order stays Monday, Saturday, Sunday. User locale stays a host-owned current-user slot, not a database preference or a switch that alters the actor when editing someone else.
- Original `_reset-tours.tsx` → Identity preferences tour section: original status badges, description and light IconRefresh reset button are restored. Loading is not represented as false completion; the default native hold disables reset. Actual success uses the existing accepted action/query invalidation rather than a fake refresh function.

### Save, order and reset conservation

Instance schemas/dirty comparisons include desktop/mobile homes and both board status flags. Only changed groups are written. Fresh canonical reads and partial-error draft preservation remain the accepted P2 implementation. Preference schemas/dirty patches include desktop/mobile homes and complete validated header preferences; structural comparison avoids writing an unchanged reconstructed header. Successful native preference responses, not submitted drafts, become canonical. Identity save cancels its exact in-flight preference read before canonical cache publication and retains existing authority retirement for self updates. No optimistic durable save or mutation retry is added.

Required account items cannot be removed, duplicate items cannot be added, arbitrary drop payloads cannot pick a zone, and same-zone/cross-zone drag uses source ordering. Search and logo display stay separate controlled values. Pending/demo-disabled fields cannot change the draft. Discard retains existing accepted baseline/remote-update behavior. Source settings generation guards and canonical publication sequencing remain unmodified.

## Routes and integration holds for01/25

- Intended source routes: `/manage/settings` → InstanceSettingsPage/Form; `/manage/users/:userId/general` → UserPreferencesForm (or PreferenceSettingsPage when composing the existing separate profile surface). No route was registered by08.
- Mount controlled `HeaderComposer` alone for immediate explicitly labeled synthetic feedback if desired. Its local onChange is a draft, never proof of authentication/persistence. The original rich thumbnail must be supplied only after its lane freezes; omission uses the original empty-layout icon, not an invented board grid.
- Real private Settings pages need accepted Query/I18n/settings/session composition, actual principal-scoped clients, canonical initial snapshots and stable principal/session cache scopes. Preview must pass existing `read-only` access with a visible reason; it must not claim native saves. Identity preference/tour writes remain held by default. No no-op refresh, fabricated principal or fabricated success adapter is provided.
- Direct Nitro declaration requests remain `@dnd-kit/dom@0.5.0`, `@dnd-kit/react@0.5.0`, `@homarr/settings`, `@homarr/server-settings`. Dnd libraries were verified in repository declarations/catalog and actual installed `.d.ts` files; no new library/version is introduced. Public packaging admission is01-only. Mantine v9 Select, dnd sortable/droppable disabled inputs and keyboard/pointer APIs were verified from installed current declarations.
- Full closure typecheck also exposes the existing out-of-lane `features/identity/feedback.tsx:130` unknown-as-ReactNode condition and missing `@homarr/node-unifi` dependency/types. These are concrete coordinator dependency/source requests, not permission to repair shared files here.

## Immutable focused validation

Frozen copy: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable08-ue62vg13`.

The closure was copied, including concrete installed vendors, without symlinks, installs, environment files, data, watchers or emitted application output. Source reads remained stable during materialization; final owned source hashes match the frozen copy. `owned-inputs.json`, `source-inventory.json`, `checks.json` and unfiltered compiler/lint logs remain there. This is a compile-only snapshot, not acceptance of private transitive/API/peer runtime graphs.

All commands use explicit Node24.18.0 and an environment containing only PATH, disposable HOME and disposable TMPDIR. Lint and TypeScript run solely inside the copied closure. TypeScript7.0.2 uses noEmit, strict, noUncheckedIndexedAccess, the existing skipLibCheck policy, real installed declaration packages and explicit owned file roots. No aliases, shims, unsafe casts or diagnostic filtering were introduced.

- Scoped lint: **PASS**, 20 owned files, zero warnings/errors.
- Source-ui presentation TypeScript roots: **PASS**, zero diagnostics.
- All owned settings/Identity roots: **BLOCKED by six preexisting out-of-lane diagnostics**: `features/identity/feedback.tsx:130`; five Unifi errors caused by missing `@homarr/node-unifi` (two missing imports, three consequent implicit parameter types). **Zero owned-file diagnostics** after fixes. This is not a passing full closure or runtime proof.
- No new tests, broad suites, build, install, server, browser, provider/network/SQL, deployment, Git or child-agent operations were performed. Runtime drag/browser/hydration/private-save verification belongs to01's frozen preview integration.

The Impeccable product register and original styling were read for identity preservation. Its update/context script was not run because it accesses a home-directory cache and may make a network request outside this lease; PRODUCT.md was read directly. No redesign authority was inferred from the site's brand register.
