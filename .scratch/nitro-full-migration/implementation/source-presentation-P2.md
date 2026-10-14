# P2 source presentation: identity and durable settings controls

## Scope and freeze

Prepared source-only leaves, frozen for independent preservation review before publication or original delegation. This implements the explicit Oracle-approved P2 NEW-file-only assignment and its producer-first boundary: original Next wrappers, definitions, controllers, existing Nitro features, package barrels, manifests and exports remain read-only. No original import/delegation or native producer join was performed.

Read `FRONTEND-PRESENTATION-LEASES.md` P2 and its cross-cutting restrictions. At preparation, that document ended at line 184 and contained no producer-first amendment section; a targeted scratch-document search found no separate amendment. The assignment's explicit producer-first restrictions govern this contribution; the coordinator must reconcile the missing written amendment before publication. No release of original files or export admission is inferred from the planning document.

## Exact new-file inventory and absence evidence

Before writing, the dedicated glob for `packages/ui/src/source-views/identity-settings/**` returned no files. The handoff glob returned no file, and a dedicated listing of `.scratch/nitro-full-migration/implementation/` independently contained no `source-presentation-P2.md`. Only these previously absent files were added:

- `packages/ui/src/source-views/identity-settings/contracts.ts`
- `packages/ui/src/source-views/identity-settings/stepper-navigation-view.tsx`
- `packages/ui/src/source-views/identity-settings/reserved-group-alert-view.tsx`
- `packages/ui/src/source-views/identity-settings/setting-switch-view.tsx`
- `.scratch/nitro-full-migration/implementation/source-presentation-P2.md`

## Frozen source origins

| Original exact source                                                                 | Read symbol/body                                                                         | New leaf                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| `apps/nextjs/src/app/[locale]/manage/users/create/_components/stepper-navigation.tsx` | `StepperNavigationComponent`, entire original lines 1–60; JSX lines 29–58                | `StepperNavigationView`  |
| `apps/nextjs/src/app/[locale]/manage/users/groups/[id]/_reserved-group-alert.tsx`     | `ReservedGroupAlert`, entire original lines 1–30; JSX lines 15–28                        | `ReservedGroupAlertView` |
| `apps/nextjs/src/app/[locale]/manage/settings/_components/setting-switch.tsx`         | `SwitchSetting`, entire original lines 1–48; click guard lines 27–33 and JSX lines 36–46 | `SettingSwitchView`      |

Origins were enumerated by dedicated full source reads before the patch. Originals were not edited, moved, deleted or imported by the new leaves. No Git/HEAD/hash identity certificate is claimed.

## Actual presentation contracts and preserved behavior

### Stepper navigation

Supplies the original four booleans `hasPrevious`, `hasNext`, `isComplete`, `isLoadingNextStep`; original `prevStep`, `nextStep`, `reset` callbacks; resolved `previousLabel`, `nextLabel`, `createAnotherLabel`, `backLabel`, `backHref`; and a required pure React anchor-compatible `linkComponent`. The link component is a presentation element slot, not a router instance or new navigation controller. There is no fallback link or invented return action.

Preserves `Card`, nonwrapping groups, `space-between` while incomplete and `end` after completion. Previous remains disabled when unavailable or pending. Next remains disabled when unavailable or pending and has exactly the original loading indicator. Original 1rem arrow icons, light reset button and separate linked return button are retained. Completion does not gain a pending/disabled gate absent from the source. Reset remains distinct from return-to-list navigation.

Future exclusively released original delegation must retain `useI18n("common")` with `action.previous`/`action.next`, `useI18n("management.page.user.create")` with `action.createAnother`/`action.back`, and `backHref="/manage/users"`. Supply the real existing `Link` component after navigation-owner review. The source's create/reset/list-return business lifetime remains in its wrapper.

### Reserved group notice

Supplies `renderMessage(documentationLink)`, resolved `documentationLabel`/`documentationHref` and the required pure React anchor-compatible `linkComponent`. The render callback preserves localized rich content placement, not a split English prefix/suffix or plain-string replacement. The actual source `Alert` remains light/yellow, with its 1rem, stroke-1.5 exclamation icon; the documentation link remains a size-sm `Anchor` with `target="_blank"` and source-compatible linked children.

Future original delegation must retain `useI18n("group")` and `tGroup.rich("reservedNotice.message", { checkoutDocs: () => documentationLink })`, plus `useI18n("common")`/`action.checkoutDocs`. Resolve the exact original `createDocumentationLink("/docs/management/users", "#special-groups")` outside the view. Reading the frozen helper showed document/meta and environment acquisition, so neither that helper nor the broad definitions barrel is imported here. Preserve its resolved host override rather than hardcoding `homarr.dev`. No environment or DOM acquisition was executed.

### Durable setting switch

Supplies actual `checked: boolean`, optional `disabled`, `title: string`, `text: ReactNode`, optional `ms: MantineSpacing`, and `onToggle()`. The original BooleanKeys generic, `UseFormReturnType`, `Boolean(form.values[formKey])` acquisition and functional `form.setFieldValue` inversion remain in the future original wrapper, not in UI contracts.

Preserves source `Group` inline-start spacing, `space-between`, `gap="lg"`, centered alignment and no wrapping. The title/text region remains a flex-growing `UnstyledButton`, with a gap-0 stack, bold title, gray.5 text and xs/base–sm/md text sizing. Both title-region and switch-input clicks share the same disabled-guarded callback. The title button does not acquire a new native disabled attribute; disabled clicks remain inert through the guard, matching the original. The switch retains controlled checked state and its native disabled attribute. No additional `onChange` mutation handler was added, avoiding a double toggle. No local durable setting state or success flag exists.

## Dependency and transitive purity boundary

All external imports are declared dependencies already present in `packages/ui/package.json`: React, `@mantine/core` and `@tabler/icons-react`. Contracts use React anchor/ref/node/component types and Mantine spacing only. Each leaf imports only those packages and its local contracts; local contracts have type-only imports. No existing shared UI barrel, navigation provider, translation runtime, form package, Next, tRPC, Auth, DB, API, backend DTO or mutable peer implementation enters the new graph. Passed nodes/components/callbacks still require owner-controlled composition; their existence is not authority or proof of downstream purity.

Current APIs were verified through safe reads of installed official declarations, not training-only assumptions or live calls: Mantine 9.6.0 Button/Card/Group/Alert/Anchor/Stack/Text/UnstyledButton/Switch declarations and spacing style types; Tabler 3.44.0 declarations for all five original icons, string sizes and stroke; React 19.2.7 manifest. Installed Mantine Switch implementation confirms click props reach the input and its own change path remains separate. Installed API evidence replaces unavailable/exhausted live documentation quota for this bounded slice.

Impeccable product-register guidance and the existing UI theme/original components were read for identity preservation. The context script was inspected but not executed because it imports/evaluates code, reads environment and can perform network/cache operations prohibited by this lease. Root PRODUCT.md was read directly; its website-brand register does not authorize redesigning these existing application controls. No palette, typography, copy, motion, layout or accessibility redesign was introduced.

## Explicit remaining holds and omissions

- Independent source-body/contract review must precede coordinator-owned `index.ts`/explicit subpath publication, and separately released original-wrapper delegation. These leaves are unexported and unmounted candidates, not integrated single-source-of-truth consumers yet. Frozen originals remain the active specification until that join.
- Real identity authority, provider lists, ordered permissions, preferences, settings access/read scope, hydration and resource ownership stay with their existing owners. No principal, grant, permission, readiness or API shape is fabricated; callbacks confer no authority.
- User/profile/avatar/delete/password/tour, group rename/delete/transfer/permissions/home-board/membership and invite forms remain missing source-preservation obligations. The three leaves do not provide full Identity or Settings parity.
- Full settings, culture, appearance, search, board, branding, analytics and crawling/indexing forms remain outside this lease. HeaderComposer's native drag sensors, keyboard ordering and preview are still held; no textarea/select substitution is supplied.
- Native identity/profile/password/invite/home-board/tour writes and canonical settings/theme/locale/document reconciliation remain separate reviewed joins. Passwords never become view props, query keys, cache entries or SSR values. Durable defaults/header/branding remain outside these leaves.
- No controller, query key, refresh stub, validation strengthening, new dependency, native mutation, policy choice or publication approval was added.

## Verification status

Only dedicated static reads/searches and a patch to the five owned new files were used. A final manual source reread is preservation review evidence only, not executable validation or independent acceptance. No checks, lint, typecheck, build, install, tests, import evaluation, browser, network/provider/SQL, environment/credential/data access, listeners, Git operations or nested agents were run. No new tests or comments, `any` types or type assertions were added. Coordinator validation and independent review remain outstanding.
