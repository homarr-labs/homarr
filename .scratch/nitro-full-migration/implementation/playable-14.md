# PLAYABLE-WAVE32 lane14

## P2 reopen: exact writes before correction

Only `apps/nitro/src/features/docker/add-apps.tsx` and this existing handoff are reopened. The other eleven declared code files remain frozen. Capture the actual committed mount-generation lease and require a host current-owner predicate for route/authority/dialog ownership; gate success/rejection presentation without cancelling or changing the genuine writer/cache-settlement promise. Preserve private Query, CanvasAddon and native holds. Validation will reuse the immutable dependency snapshot, replacing only the corrected controller, with raw lint/type output and hashes recorded below.

## Exact writes declared before implementation

- `apps/nitro/src/source-ui/docker/contracts.ts`
- `apps/nitro/src/source-ui/docker/table.tsx`
- `apps/nitro/src/source-ui/docker/actions.tsx`
- `apps/nitro/src/source-ui/docker/add-apps.tsx`
- `apps/nitro/src/source-ui/docker/management.tsx`
- `apps/nitro/src/source-ui/docker/index.ts`
- `apps/nitro/src/features/docker/actions.tsx`
- `apps/nitro/src/features/docker/columns.tsx`
- `apps/nitro/src/features/docker/inventory.tsx`
- `apps/nitro/src/features/docker/management.tsx`
- `apps/nitro/src/features/docker/add-apps.tsx`
- `apps/nitro/src/features/docker/index.ts`
- This handoff file.

Original Next sources, frozen P1–P6 views, shared packages, manifests, routes, build output, Docker/backend execution and peer lanes remain read-only. Existing authority-scoped queries, log-session cleanup and reconciliation controllers are reused, not regenerated. Oracle amendments in PLAYABLE-WAVE32.md apply. Validation will use an immutable owned presentation closure with clean environment, no emit/build/watch; full controller validation blockers will be recorded rather than consuming mutable peers.

## Source mapping and mount contract

Implemented 12 code files in the exact declared paths: six transport-free presentation files, the new add-app controller, and five existing Docker controller/barrel updates. No Next source, backend, manifest, route, lock, peer or deployment file was changed.

| Original read-only source                                                         | Implemented destination                                             | Preservation                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:27–35`                 | `source-ui/docker/management.tsx`, `features/docker/management.tsx` | Original breadcrumb slot, Stack, order-1 title, reconciliation before inventory                                                                                                                                                                                                      |
| `apps/nextjs/src/app/[locale]/manage/tools/docker/docker-table.tsx:228–304`       | `source-ui/docker/table.tsx`, `features/docker/inventory.tsx`       | Original MRT compact rows, visible search, 300px search input/autofocus, toolbar refresh, grouped selection banner, row identity, no pagination/fullscreen/footer, original endpoint warning icon                                                                                    |
| Same source, `73–189`, `495–503`                                                  | `features/docker/columns.tsx`                                       | Original 120px state badge, image Box/truncation, one visible port with overflow popover, CPU/memory source sorting/colors/formatter; reuses the frozen existing `packages/ui/src/components/overflow-badge.tsx` rather than copying it                                              |
| Same source, `307–490`                                                            | `source-ui/docker/actions.tsx`, `features/docker/actions.tsx`       | Original action icons/colors/labels, row-menu stopPropagation, red add-app control, selected actions; source success/failure messages alongside actual per-target results                                                                                                            |
| `packages/modals-collection/src/docker/confirm-docker-container-removal.ts:12–25` | `DockerRemovalConfirmationView`, `DockerRemovalConfirmation`        | Original translated count/name confirmation and red.9 remove action; cancel autofocus and actual fresh-target/capability recheck remain; pending blocks dismissal                                                                                                                    |
| `packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx:22–115`       | `source-ui/docker/add-apps.tsx`, `features/docker/add-apps.tsx`     | Original per-container avatar/list/URL form, nullable URL overrides, source browser-first service URL candidates, LoadingOverlay, cancel/add spacing, lg dialog, source URI validation and exact creation fields; original success/error notification copy handed to a host callback |
| `apps/nextjs/src/components/layout/header/docker-quick-access-modal.tsx:7–10`     | `DockerQuickAccessView`                                             | Original Docker title/inventory slot and 1400px modal size; framework modal glue becomes controlled Mantine props                                                                                                                                                                    |

Existing accepted Docker reconciliation and log controllers were retained unchanged: `reconciliation.tsx`, `log-session.ts`, `logs.tsx`, `queries.ts`, `binding.ts`, `client.ts`, and `feedback.tsx`. They are now named exports where appropriate, not another rewritten algorithm or new transport. Original candidate filtering/dismissal/URL modes/setup actions, authority-scoped caches, action bounds, read-only/capability checks, no automatic mutation retries, on-settled invalidation, raw log ordering, request abort/iterator return and history/live separation remain intact. P1's Docker header branch belongs to lane05; P4 explicitly did not extract Docker/log terminal bodies. No accepted P1–P6 leaf was duplicated or changed.

## Ready-to-mount exports for01

Import display-only preview components directly from `apps/nitro/src/source-ui/docker/index.ts`; this entrypoint imports only React, Mantine, Tabler, MRT and same-directory presentation contracts. It does not import authentication, API types, Query, Next, xterm, backend or any peer module.

- `DockerManagementView(DockerManagementViewProps)`: `title`, `inventory: ReactNode`; optional `breadcrumb`, `reconciliation`, `unavailableReason`.
- `DockerQuickAccessView(DockerQuickAccessViewProps)`: `opened`, `title`, `inventory`, `onClose`; optional `unavailableReason`.
- `DockerTableView<Container extends DockerViewContainer>(DockerTableViewProps<Container>)`: actual `containers`, `columns`, `localization`, `fetching`, optional `actionPending`; resolved `searchLabel`, `selectedLabel(selected,total)`, `updatedLabel`, `emptyLabel`, `refreshLabel`, optional `unavailableLabel`; `renderRowActions(container)`, `renderSelectedActions(containers)`; optional `onRefresh`. Missing refresh is disabled, not a no-op handler.
- `DockerActionBarView` / `DockerContainerMenuView`: typed containers, actual pending state, resolved source action labels, `canRun(action,containers)`, optional `onAction` / `onAddApps`; row menu also takes `container` and optional `onLogs`. Missing handlers disable the corresponding source controls. Callers must not supply successful synthetic operations.
- `DockerRemovalConfirmationView`: controlled open/title/message/pending/allowed/labels and confirm/close actions. The real inventory controller revalidates current resource IDs and remove capability immediately before submission.
- `DockerAddAppsView`: controlled open/title/containers/URLs/errors/pending/labels/change/close, optional submit, feedback and unavailability reason. This view never creates apps itself.
- `DockerViewContainer`: source structural fields `resourceId`, `endpointId`, `endpointName`, `id`, `name`, nullable `iconUrl`; generic table rows may retain all richer source fields.

Existing/private controller entrypoint `apps/nitro/src/features/docker/index.ts` exports `DockerManagementPage`, `DockerInventoryTable`, `createDockerColumns`, `DockerLogsPage`, `DockerReconciliationPanel`, action/confirmation/result components, the existing admission/client types, all pure views, and the new `DockerAddAppsDialog` / `DockerAddAppsDialogProps` / `DockerAppContainer` / `DockerAppCreationInput`.

`DockerAddAppsDialog` requires actual `selectedContainers`, `canCreate`, `readOnly`, `onClose`; accepts source `initialUrls`, an explicit unavailable reason, optional `onCreate(apps): Promise<void>`, `onFeedback({kind,title,message})` and `isCurrentOwner(): boolean`. Submission is unavailable without writer, feedback and actual current-owner bindings or with denied permission/read-only state. `onCreate` must use a genuine admitted writer and confirmed app-cache invalidation; resolving a placeholder promise is not an acceptable binding. Only actual resolved creation for the still-current originating owner emits source success copy and closes that dialog; current-owner rejection leaves it open with source error feedback. Retired completions do neither. An immediate ref guard prevents duplicate concurrent submissions. Remount the dialog for each source modal invocation/selected-target/route-authority generation to preserve original initial-value lifetime; the owner predicate must check that specific invocation against actual current host ownership, not merely return an old administrator flag or unconditional true.

Original route inventory for01: `/manage/tools/docker` mounts the management view/controller; `/manage/tools/docker/logs/$containerId` carries source `endpointId` and `name` search values and mounts `DockerLogsPage` only after real route/log admission; quick access is a header modal, not a new route. Existing log controller props are `{binding,container,onBack}`. No router/provider/transport is installed by lane14.

For synthetic feedback,01 may provide labeled display rows, original `createDockerColumns` formatting, localization and the pure views, but must omit operation handlers and display a clear synthetic/unavailable reason. Do not manufacture `DockerFeatureBinding`, administrator principals, endpoint capability admission or successful action results. Pure preview mounting does not require any principal/client contract. Load `mantine-react-table/styles.css` in01's owned style composition; full controller entry already preserves the original table stylesheet import.

## Dependencies and held joins

All newly added imports use already declared Nitro dependencies. Verified installed Mantine core 9.6.0, Tabler 3.44.0, MRT alias `mantine-react-table-open` 9.0.3 and TypeScript 7.0.2. Installed Modal/Group/TextInput and MRT toolbar/selection/loading declarations were inspected; the Oracle-approved installed-API fallback was used without retrying exhausted Context7 quota.

Requests for sole manifest owner01, retaining current holds:

1. Admit MRT peers missing from the inspected Nitro manifest: `@mantine/dates` installed 9.6.0, `clsx` installed 2.1.1, `dayjs` installed 1.11.21. No install or manifest edit was performed here.
2. Existing `logs.tsx` imports `@xterm/addon-canvas`, still undeclared. Installed CanvasAddon 0.7.0 explicitly requires xterm `^5.0.0`, while installed xterm is 6.0.0. Do not mount history or live terminal until01 resolves and verifies this compatibility; a live-stream permission flag does not resolve the renderer mismatch. No guessed pin/downgrade or addon substitution was made.
3. Real private principal/host configuration, physical Docker oRPC transport, generated Query integration and native cleanup admission remain owned downstream joins. The accepted existing feature client contract was not replaced with mutable lane02 contracts or invented browser methods. Source Query/controller integration still requires01/02's frozen return and full integrated typecheck.
4. New add-app writer/notification callbacks remain visibly unavailable until genuine admitted backend and frozen provider bindings exist. Inline refresh success is derived only from the existing real mutation's success state; action success requires complete returned target evidence. Missing action results remain explicitly unknown, never counted as successful or asserted failed container operations.

## Initial focused immutable validation — historical baseline

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable14.xTtv4S`. Executables ran with `env -i PATH=/usr/bin:/bin` and explicit Node24.18.0; no .env, real data, credentials, native providers, application modules, server listeners or source runtime imports were evaluated. Copied source/config closure was immutable during checks; no peer watch/symlink or protected output was used. The frozen original add-app dependencies were copied from definitions, standalone translation/catalogs, validation/app, and common object/types/url; installed registry dependencies supply the remaining declarations.

- TypeScript7.0.2 `tsc --noEmit -p <snapshot>/tsconfig.json`: **exit0**, all six new presentation files plus new add-app controller and their frozen source dependency closure. The first closure attempt identified three missing copied translation JSON files; copying the original MRT localization directory resolved it without modifying product code.
- Oxlint1.73.0 with copied repository config, disabled nested config, `--deny-warnings`: **exit0, 0 warnings/0 errors**, six presentation files plus new add-app controller.
- All thirteen copied Docker feature files: **exit0, 0 errors**, two existing `import/no-unassigned-import` warnings for required MRT/xterm CSS imports in management/logs. No suppressions or stylesheet removal were added.
- Entire private Docker feature type closure is **not claimed clean**: `client.ts` uses legacy aggregate `RouterInputs`/`RouterOutputs`, and binding uses the native API context. Resolving those would consume actively changing API/auth/core peer source; they were not used for an integrated acceptance claim.01 must snapshot completed frozen returns before that check. Lint establishes syntax, not private controller type/runtime proof.
- Pre-P2 deterministic code digest of the twelve declared code files: `2b6191031f58facba41799bbb6d63b2219a9f04d93f8e571dcceae2dcf477808`. All twelve then-current source files were byte-compared with the immutable snapshot before that successful typecheck and warning-free focused lint rerun. The corrected P2 digest below supersedes this code baseline.

No Git operation, nested agent, new test, test suite, build, Docker operation, native log acquisition, live external call, browser or production activation was performed. This is concrete mountable implementation with focused source checks, not a claim that held Docker/backend routes run.

## P2 correction returned for independent rereview

Only the reopened controller and this handoff changed. The other eleven code files were byte-compared against the original immutable snapshot and remained identical.

### Original lifetime and callback verification

The originally inspected add-Docker-app modal initializes URLs once per mounted invocation, submits the original app fields, and displays success/error callbacks from mutation completion. Its previous unguarded completion behavior was the P2 issue, not a lifecycle guarantee. The current read-only source reference `packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx:53–63,85–105,108–127` also distinguishes the captured mount lease/current-owner predicate from genuine creation/reconciliation settlement, and rechecks currentness between success feedback and close. That source was consulted only as callback/lifetime evidence; no changed peer implementation, provider, writer, transport or outcome contract was imported or adopted. The admitted Nitro `onCreate` writer/cache-settlement promise remains unchanged.

### Captured generation and actual owner

- A new lease is installed by the committed mount's `useLayoutEffect`; synchronous cleanup retires that exact lease on unmount/layout-effect replay. Each submission captures its own lease, and checks both lease activity and `owner.current === lease`, preventing an old continuation from becoming current again after a new setup on the same ref.
- `isCurrentOwner` is a local presentation-only host callback, matching the original source ownership vocabulary. It supplies actual originating dialog/route/authority ownership that container IDs, callback presence and permission booleans cannot establish. It is optional for held display composition but mandatory for submitting: absence is visibly unavailable, never default-current.01 must bind it to the real specific invocation and current host ownership; no root/route/provider join was invented here. This is not a new backend/client method or authority principal.
- Before starting a writer, before each completion-driven state update/feedback callback, and again immediately before success-close, the captured generation and original owner's predicate must still be current. Success feedback precedes close, so feedback that replaces the dialog or navigates cannot cause the subsequent callback to close the replacement. Rejection presentation is guarded too, including the error-state update.
- User-initiated cancel remains available on a committed idle held dialog even when the writer/current-owner binding is absent. Pending dismissal remains blocked by the unchanged source view. URL initialization, validation, list/modal presentation and pending controls are unchanged.

### Settlement is not presentation

The original `onCreate(apps)` is invoked once and fully awaited without ownership cancellation or a new AbortSignal. Retirement suppresses only completion-driven presentation; it does not cancel the actual writer, skip the cache reconciliation inside that promise, restore/roll back anything, manufacture a business outcome, retry or invoke a replacement writer. The host's existing writer/cache contract must settle against its original real scope even if its dialog retires. Rejection does not establish rollback or non-creation; the existing source error copy is feedback for a still-current owner only. Independent native/writer outcome proof is still outside this frontend correction.

### Real isolated checks and raw evidence

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable14-p2.RiV5R4`. The original immutable closure/config was copied and only `features/docker/add-apps.tsx` replaced with the corrected bytes. No mutable peer source was pulled into this check. Explicit Node24.18.0 subprocesses used `env -i PATH=/usr/bin:/bin`, no emit/cache/build/watch/runtime source evaluation. Installed React19.2.7 / `@types/react` declared `useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void`; no dependency was added or changed.

Typecheck command: `node <root>/node_modules/typescript/bin/tsc --noEmit -p <snapshot>/tsconfig.json`. Scope remains the six frozen presentation files plus corrected add-app controller and the previously frozen original dependency closure. **Exit0; stdout/stderr empty.** Raw file: `<snapshot>/p2-typecheck.log`, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

Lint command: `node <root>/node_modules/oxlint/bin/oxlint --config <snapshot>/.oxlintrc.json --disable-nested-config --deny-warnings <snapshot>/features/docker/add-apps.tsx`. **Exit0.** Raw file: `<snapshot>/p2-lint.log`, SHA-256 `2b9de9292238c323b7c480ca0af3f5f51d70aadc660fbc6aa823bf2c3a14eacb`.

```text
Found 0 warnings and 0 errors.
Finished in 121ms on 1 file with 197 rules using 16 threads.
```

- Corrected controller SHA-256: `bc57ead76b59f0fc03ab22b5fb737402ef0fe08c7589c6e802a4d0fb7933cae9`.
- Prior controller SHA-256: `513c685b51e4ed4464fcd4622e8c4ec411787a5f7023d11400676e6732f46209`.
- Updated twelve-code-file digest, preserving the other eleven: `1f82bd999494c18b241e93eaa1f60c05bee6f1ea8599b9357d11cc20e5c3ad36`.
- The corrected source was byte-compared against the isolated copy again after checks.

Ready for P2 rereview, not independently accepted. Private Query/type integration, real owner/provider/writer binding, CanvasAddon/xterm compatibility and native cleanup holds remain intact. No new test, runtime/native/external operation, Git action, child agent, framework, redesign, unsafe cast, `any`, comment or client contract was introduced.
