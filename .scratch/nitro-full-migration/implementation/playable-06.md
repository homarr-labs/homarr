# PLAYABLE-WAVE32 lane06

## Reopened P2 correction lease: exact writes declared before edits

The rereview correction reopens only these already-owned paths:

- `apps/nitro/src/source-ui/users/contracts.ts`
- `apps/nitro/src/source-ui/users/user-list.tsx`
- `apps/nitro/src/source-ui/users/user-create.tsx`
- `apps/nitro/src/source-ui/users/user-detail.tsx`
- `apps/nitro/src/source-ui/users/invites.tsx`
- `apps/nitro/src/source-ui/users/api-keys.tsx`
- `apps/nitro/src/source-ui/users/index.ts`
- `apps/nitro/src/features/identity/users.tsx`
- `apps/nitro/src/features/identity/user-detail.tsx`
- `apps/nitro/src/features/identity/invites.tsx`
- `apps/nitro/src/features/identity/api-keys.tsx`
- `.scratch/nitro-full-migration/implementation/playable-06.md`

Original Next files and accepted P2 leaves remain read-only. This correction changes loading/settlement ownership and uses existing translation namespaces/keys only. Validation artifacts remain in the previously declared disposable lane06 directory; final raw logs and source hashes will replace the historical check result for rereview.

## Exact writes declared before implementation

- `apps/nitro/src/source-ui/users/contracts.ts`
- `apps/nitro/src/source-ui/users/user-list.tsx`
- `apps/nitro/src/source-ui/users/user-create.tsx`
- `apps/nitro/src/source-ui/users/user-detail.tsx`
- `apps/nitro/src/source-ui/users/invites.tsx`
- `apps/nitro/src/source-ui/users/api-keys.tsx`
- `apps/nitro/src/source-ui/users/index.ts`
- `apps/nitro/src/features/identity/users.tsx`
- `apps/nitro/src/features/identity/user-detail.tsx`
- `apps/nitro/src/features/identity/invites.tsx`
- `apps/nitro/src/features/identity/api-keys.tsx`
- `.scratch/nitro-full-migration/implementation/playable-06.md`

No Next source, groups/preferences/shared client, manifests, root routes, or peer implementation is writable in this lane.

## Declaration request to lane01

Original invitation presentation needs `@mantine/dates` at catalog/installed `9.6.0`, plus its `styles.css` in document composition. It is installed but not currently declared by `apps/nitro/package.json`; no undeclared import will be introduced before admission. `mantine-react-table` is already declared at catalog alias `npm:mantine-react-table-open@9.0.3`; document composition needs its `styles.css`. Existing React/Mantine/hooks/Tabler/UI/translation/validation/Query dependencies suffice otherwise.

That paragraph records the original dependency request. On reopening, the lane01-owned manifest now contains `@mantine/dates`; this lane still retains the explicit picker slot and does not claim acceptance of an active peer's document/provider composition.

## Implementation complete and frozen

Eleven source files implement original rich presentations and join the four existing controllers. The manifest, original Next sources, shared identity boundary/client/action hook/draft, groups, preferences, root routes, and every other lane remain untouched. The existing controller entrypoints remain usable; user creation now retains the original completed step with create-another and return-to-list controls instead of immediately navigating away.

### Exact source mapping

| Original read-only source under `apps/nextjs/src/app/[locale]/`        | Implemented destination                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manage/users/_components/user-list.tsx`                               | `source-ui/users/user-list.tsx`: original Mantine React Table name/avatar/anchor and verified-email cells, row selection, column ordering/filtering, pagination, grid-no-grow configuration                                                                  |
| `manage/users/create/_components/create-user-stepper.tsx`              | `source-ui/users/user-create.tsx`: four-step profile/password/groups/review tree, selected-group table with permission tooltips/badges, Everyone protection, avatar review, completed icon and reset flow                                                    |
| `manage/users/create/_components/stepper-navigation.tsx`               | Existing accepted `@homarr/ui/source-views/identity-settings` `StepperNavigationView`, consumed directly, not copied                                                                                                                                         |
| `manage/users/[userId]/layout.tsx`                                     | `source-ui/users/user-detail.tsx` `UserDetailView`: original responsive identity header and general/security side navigation                                                                                                                                 |
| `manage/users/[userId]/general/_components/_general-settings-form.tsx` | `UserProfileFieldsView`, `UserProfileSaveView`, `UserGeneralView`: profile fields, divider, transparent bordered profile card, dirty-only sticky save/discard, original main/avatar layout. Preferences/header fields remain lane08's slot, not another port |
| `manage/users/[userId]/general/_components/_profile-avatar-form.tsx`   | `UserAvatarMenuView`: original 120/200 avatar/menu/file-button/pencil overlay/change/remove tree                                                                                                                                                             |
| `manage/users/[userId]/general/page.tsx`                               | `UserGeneralView`, `UserDangerZoneView`, controller external-provider notice and existing deletion confirmation                                                                                                                                              |
| `manage/users/[userId]/security/_components/_change-password-form.tsx` | `features/identity/user-detail.tsx` `UserPassword`: original fieldset, self-only previous-password input, password requirements, confirmation and submit group                                                                                               |
| `manage/users/invites/_components/invite-list.tsx`                     | `InviteListView`: creation collapse/card, expiry-sorted selectable/reorderable Mantine table, creator and relative expiry cells, revoke action slots                                                                                                         |
| `manage/users/invites/_components/invite-create-form.tsx`              | Existing controller `InviteCreateForm`, `InviteExpirationView`, `CreatedInviteView`: four-hour default, bounded expiry, ISO submission, original marked ID/token/link output and copy-and-close behavior                                                     |
| `manage/tools/api/components/api-keys.tsx`                             | `ApiKeysView`: original compact-density table, creator/avatar cells, toolbar creation and row revocation                                                                                                                                                     |
| `manage/tools/api/components/new-api-key-alert.tsx`                    | `NewApiKeyView`: original masked/visible password field, copy/check icon and two-second copy feedback, explicit dismissal                                                                                                                                    |

Existing unchanged `packages/ui/src/components/inline-confirm-action.tsx` supplies original `InlineConfirmActionIcon`/`InlineConfirmMenuItem`; unchanged password-input `PasswordRequirementsPopover` and `PasswordRequirement` are consumed, not duplicated. These exact narrow relative imports avoid the broad UI barrel's currently active settings/provider graph. Lane01 may publish equivalent narrow subpaths later, but no manifest change is required for this frozen implementation.

### Immediately usable exports and props for lane01

Pure presentation exports are available from `apps/nitro/src/source-ui/users/index.ts`, with named prop interfaces in their corresponding files:

- `UserListView({ users, onOpen?, loading?, refreshing?, localization?, renderAvatar?, usernameLabel?, emailLabel?, verifiedLabel? })`.
- `UserCreateView(UserCreateViewProps)`: controlled step/profile/password/group state, Everyone name, effective permission preview, field/group callbacks, `navigation` and `feedback` slots. Feed the existing accepted stepper view into `navigation`; no mutation exists in this presentation.
- `UserDetailView({ user, credentials, section, onSectionChange, children, renderAvatar? })`.
- `UserGeneralView({ profile, avatar, preferences?, danger, externalProvider? })`, `UserProfileFieldsView({ children })`, `UserProfileSaveView({ dirty, pending, disabled, onDiscard })`, `UserDangerZoneView({ action })`.
- `UserAvatarMenuView({ user, disabled, pending, onImageChange, onRemove, renderAvatar? })`.
- `UserPasswordInput(PasswordInputProps & { value: string })` and `PasswordSuggestionsView({ password })` reuse original password components. Mount under the existing real standalone I18n provider.
- `InviteListView({ invites, createOpen, createDisabled, onToggleCreate, createForm, renderActions?, loading?, refreshing?, localization?, now? })`. An omitted row action renders the existing translated unavailable label, never a pretend handler.
- `InviteExpirationView({ component, value, onChange, min, max, disabled })`: exact original DateTimePicker presentation via an explicit component slot. After the dependency is admitted, supply installed `DateTimePicker` from `@mantine/dates`; browser-local date strings are normalized at this narrow seam.
- `CreatedInviteView({ id, token, url, onDismiss, disabled? })` and `NewApiKeyView({ apiKey, onDismiss })` are one-time output presentations only, not creation/authentication operations.
- `ApiKeysView({ apiKeys, creating, createDisabled, onCreate?, createdKey, feedback?, renderActions?, loading?, refreshing?, localization?, renderAvatar? })`. Missing creation callbacks disable creation and visibly explain its absence; missing row callbacks show unavailable revocation.
- `UserUnavailableView`, `UserRequestErrorView`, `UserActionFeedbackView`, `UserLoadingView` provide localized presentation bodies for the unchanged shared identity action hook. No action lifecycle or native client implementation moved into these views.

`UserSummary`, `UserRow`, `InviteRow`, `ApiKeyRow`, `SelectedUserGroup`, `UserAvatarRenderer` and `UserTableOptions` are structural display contracts, not principals or RPC contracts. They permit explicitly labeled synthetic preview metadata without mounting an identity boundary or inventing authentication. Do not show a created-key/invite success panel for a fake write.

Existing controller exports and route composition:

| Controller module                   | Exports/props                                                                                                                                                                                                                                                                             | Intended route                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `features/identity/users.tsx`       | `UserList({ onOpen, onCreate, mutationUnavailableReason?, renderAvatar? })`; `UserCreate(UserCreateProps)` with `onComplete`, optional actual `linkComponent`, mutation reason and avatar renderer; retained `PasswordSuggestions`                                                        | `/manage/users`, `/manage/users/create`                           |
| `features/identity/user-detail.tsx` | `UserEditor(UserEditorProps)` with `userId`, `onDeleted`, controlled `section?`, `initialSection?`, `onSectionChange?`, lane08 `preferences?`, mutation reason and avatar renderer; individually reusable `UserProfile`, `UserAvatarEditor`, `UserPassword`, `IdentityRecordAvailability` | `/manage/users/:userId/general`, `/manage/users/:userId/security` |
| `features/identity/invites.tsx`     | `InviteAdministration(InviteAdministrationProps)` with `initiallyCreateOpen?`, host `onCloseCreate?`, mutation reason and `renderExpirationPicker?`; exported `InviteCreateForm`, `CreatedInviteDetails` and picker props                                                                 | `/manage/users/invites`                                           |
| `features/identity/api-keys.tsx`    | `ApiKeyAdministration({ mutationUnavailableReason?, renderAvatar? })`                                                                                                                                                                                                                     | `/manage/tools/api`                                               |

Mount controllers only beneath the existing real `IdentityBoundary`. No new query client, transport, Query key convention, principal, authority adapter, credential, router, refresh stub or backend method was created. The host owns real routed links, URL query cleanup, provider composition and admitting mutations. Supply `mutationUnavailableReason` for every unadmitted writer; display-only previews should use the pure views instead.

### Preserved behavior and explicit limits

- Original source schemas, actual native client calls, admin/self/provider/demo checks and authority retirement remain intact. Everyone membership cannot be removed; selected stored permission badges remain distinct from the effective inherited preview.
- Self password changes still require the previous password even for administrators; another-user reset retains the original nonempty placeholder. Confirmation validation and password clearing remain in the existing controller. No session revocation is implied.
- Original avatar menu now uses the existing bounded data-URL/FileReader controller and real refresh behavior, including the 256 KiB/mime checks and cancellation. No media upload or fake stored image was added.
- API keys and invitation tokens stay in component state, never Query caches/keys or logs. Acknowledged results are published before metadata invalidation, preserved across background errors, and cleared on dismissal/closure/navigation/authority retirement. Revoking a just-created API key clears its reveal.
- Linked accounts/session inspection and revocation render visibly disabled controls with their native capability gap, not fabricated records or operations.
- The original rich expiration picker is implemented through the typed slot but held from direct package import until lane01 admits `@mantine/dates`. The existing browser-native date-time control remains a functional fallback. The controller supports `renderExpirationPicker={(props) => <InviteExpirationView component={DateTimePicker} {...props} />}` once admitted.
- Preferences/header remain an explicit lane08 composition slot. The controller no longer imports that active peer; missing composition is visibly unavailable. Gravatar/central settings are likewise not consumed from active lane25: host `renderAvatar` slots can supply the real accepted `UserAvatar` after that provider freezes; fallback avatars use the actual returned image/name only and never transmit an email to a new service.
- Table localization and avatar slots are public. The reopening replaces owned fixed labels with existing translations, including controller bindings; it does not claim a mounted localized application/provider join. No production/mounted/browser/native-writer proof is claimed by this source work.

## Validation

Disposable validation artifacts are scoped to `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable06-users-check-pRVZHy/`: `snapshot.mjs`, `snapshot/`, copied `.oxlintrc.json`, generated `tsconfig.views.json`, `paths.json` and validation logs. Exact unchanged workspace dependencies copied were definitions/translation/validation, `common/src/{object,types,url}.ts`, accepted identity-settings leaves, inline-confirm-action and the two password presentation leaves. Installed declared third-party declarations were resolved without installs, watchers or workspace symlinks. Every final check ran against copied own source under `env -i`, using explicit Node24.18.0, with no emit or incremental build cache.

- Final owned lint: **PASS**, exit0, all eleven source files, `oxlint -c .oxlintrc.json --disable-nested-config --deny-warnings`; `lint-final.log` records zero warnings/errors. Initial nested JSX callback warnings and a forwarding-anchor accessibility error were corrected before the final check.
- Final presentation closure typecheck: **PASS**, exit0, all seven owned source-view files plus their unchanged copied workspace dependency closure, `tsc --noEmit -p tsconfig.views.json`; `typecheck-views-final.log` is empty. Initial snapshot-only React type resolution/missing common paths were corrected in the disposable config, not source types or declarations.
- Full controller typecheck: **HELD, not claimed**. Existing `IdentityClient` factory types reach the DB barrel's active lane26 runtime and other private joins. No active peer implementation was compiled or treated as accepted; no fake declaration, `any`, unsafe cast or erased client type was substituted. Lane01 must run the integrated controller check after consuming frozen native returns.
- Static own-source search found no `any`, unsafe casts, Next/tRPC imports, comments or console logging in the new presentation tree. No new tests, child agents, Git commands, build/server/installation, environment/credential/data reads, Docker, provider calls or protected output writes occurred. Impeccable context/theme/product register were read statically; its updater/network-capable context script was not executed under this bounded lease.

## Reopening complete: return for rereview

### P2 corrections

- API-key/invitation controllers pass only initial no-data pending state to MRT `isLoading`. Background fetches render a separate translated `output`/loader outside the table. Existing data, row IDs and action owners are retained through refetches and background errors; no acknowledgement rollback or fabricated result was added.
- `InviteCreateForm` synchronously latches submission and notifies its parent through `onPendingChange`. Parent toolbar closure/reset and child cancel/dismiss/copy-and-close are blocked until the real `action.run` promise settles, including metadata invalidation. The acknowledged token is published before invalidation and stays in the same component-local owner. The revealed branch now also retains mutation/refresh feedback. Authority retirement still tears down that owner through the unchanged boundary.
- All owned product labels/descriptions/actions use existing original namespaces: `user`, `user.field`, `user.action.manageAvatar`, `management.page.user`/`create`/`invite`, `management.page.tool.api.tab.apiKey`, `management.page.tool.api.modal.createApiToken`, `group.action.select`, `group.permission`, `permission`, and `common`. Invitation emphasis uses the original `action.copy.description` rich `<b>` translation. No language catalog or translation key was added.
- Permission display defaults are now a complete type-checked mapping from `GroupPermissionKey` to the existing original category/item label and description keys. Both stored badges and separate effective-permission badges have translated tooltips without requiring host callbacks. Everyone membership and inherited permission calculation remain unchanged.
- Validation uses the existing `zodErrorMap` and localized field labels while retaining the original schemas. Date validation boundaries and relative/absolute invitation dates use the existing locale formatter. Table localization loads the existing `localeConfigurations` modules using the original shared locale-query key, non-suspending to avoid displacing an action owner; callers can still supply the original localization override. Pure tables require the real existing I18n/Query provider composition, not an identity provider or fabricated principal.
- New fallback/unavailable presentation uses the existing `customWidget.secretEntry.unavailable` label because the original identity catalogs contain no general capability-unavailable key. Unsupported account/session identifiers and the literal `user.changePassword ↛ sessions` remain technical capability evidence in `Code`, not invented translation keys or nonexistent callable client methods. Existing server error/reason content remains server-supplied; only owned labels and fallback errors are translated.
- Password self/admin rules, bounded avatar encoding, secret-local-state ownership, redacted native metadata, actual client calls and authority checks remain unchanged. Unadmitted writers still require `mutationUnavailableReason`. No dependency manifest, original/P2 source, shared identity hook/client, native writer hold or peer implementation was edited.

### Final immutable evidence (supersedes the historical validation above)

Artifact directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable06-users-check-pRVZHy/`.

- `check-reopen.mjs` executed installed tools with only explicit `PATH` under `env -i`, Node `v24.18.0`; no emit/incremental cache, install, test, server, child agent or Git operation. Previously copied fixed dependencies were retained rather than resnapshotting active peers; the unchanged bounded `common/src/error.ts` leaf was added for the original error presentation body.
- **Owned lint PASS, exit0:** `lint-reopen-final.log`, all11 owned source files, `oxlint -c .oxlintrc.json --disable-nested-config --deny-warnings`, zero warnings/errors. Raw log SHA-256: `97e5a84835da142bedcaf2759fc6a0af260ca697e2978b4fddbb67003998cd7a`.
- **Presentation types PASS, exit0:** `typecheck-views-reopen-final.log`, `tsc --noEmit -p tsconfig.views.json`, all7 own presentation files and real copied dependencies, no stub declarations or erased authority/client types. Empty raw log SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `presentation-closure-reopen.log` records actual TypeScript `--listFilesOnly` output, exit0; no workspace file outside the copied snapshot and installed `node_modules` was included. Raw closure SHA-256: `ca6c1b5aa2598f1d52773fb024bd2ac642f8d055d50cb36bceebd600f7edd87b`.
- `source-hashes-reopen.json` records per-file SHA-256 for all11 owned files and every copied fixed dependency. Manifest SHA-256: `f504685cf98d7c83fc63f6dc7a2689b5a212f1cbbef5390a94a74b2f92d618b7`. Checks confirmed source/dependency/config hashes unchanged before/after execution and all11 copied sources byte-identical to their working sources.
- `validation-reopen.json` contains exact commands, environment, exit statuses, config hashes, raw-log hashes and closure/source assertions. TypeScript config SHA-256: `d22b02b2e4326c3ba7ac3067960570238f065169c4c078eb9da0d229cf52fac1`; lint config SHA-256: `770d3e1149c5098e441036cbea1fa83cf9c7576b4c077ec317cab25e88663dd9`.
- **Controller closure HELD, not passed:** the4 controllers are parsed/linted but intentionally excluded from presentation typecheck. Their unchanged `IdentityClient` reaches real procedure factory return types and native DB/private joins; no accepted immutable full native closure has been supplied to this lane. No live-peer compilation, fake contract, controller-pass inference or mounted/native-writer claim is made. Coordinator integrated typecheck and runtime settlement/locale/browser rereview remain required.
