# Shared forms: Oracle prerequisite allocation

## Decision and scope

**Approve concrete source amendments first; keep P1 consumer adoption HELD.** Dirty observation belongs in the original shared AppForm. Modal presentation ownership belongs in the original modal stack, not in consumer assertions. Both can be implemented without backend execution. Actual producer/Query/session bindings are separate, still-missing prerequisites; another wrapper alone does not complete the migration.

This return writes only this new report, collision-checked absent immediately before creation. Old24/25/09 source leases remain CLOSED. All product allocations below are proposals requiring Oracle and coordinator allocation before any write. No commands, checks, runtime, browser, installation, native SQL, provider/resource invocation, environment/appdata/credential access, Git or children were used. No live/captured snapshot or previous report/evidence was opened for modification. The separately active reader-owner source/topic is excluded.

Read basis: latest authoritative `ROSTER.md:56–102` progress; accepted `implementation/playable-{09,19,20,24,25}.md`; original current source files identified below; recorded32 diagnostic classification in `playable-32-type-correction.md`. Read both terminal independent reviews:09 `ses_ed466b11affe91fz9VbHjHgoQo` and24 `ses_ed4715521ffepxtIF2degSgv6B`.09 is bounded PASS with missing shared seams/client held;24 is scoped P2 PASS, explicitly not P1 adoption or approval to omit upload reconciliation. No fresh hash calculation or independent replay of their checks.

## 1. NOW-ready AppForm source amendment — renewed24

Exact proposed product writes:

- `packages/forms-collection/src/new-app/_form.tsx`
- `packages/forms-collection/src/new-app/_app-new-form.tsx`
- `packages/modals-collection/src/apps/quick-add-app/quick-add-app-modal.tsx`
- `packages/modals-collection/src/apps/app-select-modal.tsx`

Sole proposed new return: `.scratch/nitro-full-migration/implementation/shared-form-source-seams.md` (glob absent). Only the first file implements the form behavior; the other three are its actual internal callers and must thread required real callbacks, not silently discard them. Do not reopen the other nine24 paths, tests, CSS, generic form package or original Next consumers.

Add these **required** props to the real AppForm, exactly matching09:

```ts
onDirtyChange: (dirty: boolean) => void;
captureSubmissionOwner: () => { isCurrent: () => boolean };
```

Retain the existing required `isCurrentOwner: () => boolean`, `iconPickerProps: IconPickerResources`, asynchronous `handleSubmit(values: AppFormValues, redirect: boolean, afterSuccess?: () => void): Promise<void>`, and `AppFormHandle` (`submit(): Promise<boolean>`, `isDirty(): boolean`). No optional defaults or invented successful callbacks. Internal AppNew/QuickAdd/AppSelect props forward the required dirty/capture callbacks from their actual host; their own native modal capture is added in step2, not fabricated here.

Implementation obligations in `_form.tsx`:

1. Observe **actual** `form.isDirty()` on initial committed binding and every dirty/pristine transition. Use the existing controlled Mantine form's committed state, not DOM changes, polling, parent render guesses or an assumed false. Deliver the observation to the originating callback only while that binding is current. Reset/initialize/resetDirty must also report their actual resulting dirty state. A dirty→pristine reversion must notify09 even without a new lookup/parent update.
2. Capture the supplied submission owner once at entry to both native form submission and imperative `submit`, before validation/any suspension. Carry that token through validation and the real handler; never recapture after awaiting. Combine its predicate with the captured local mount lease and existing host-currentness guard. Reject unavailable/stale submissions before invoking a producer.
3. Fence the source `afterSuccess` reset, post-await resetDirty, dirty notification and true Boolean result with that captured owner. Preserve create-another intent capture and reset only after critical settlement; a stale acknowledgement cannot clear a newer draft. Do not treat rejection, unknown/confirmed-but-held outcomes, retirement or absent form ref as successful/pristine submission.
4. Protect edits made during suspension: compare the real current five-field draft to the submitted draft before clearing it for create-another. For ordinary confirmed save, acknowledging submitted values must leave subsequently changed values dirty, not resetDirty to the new values. Preserve09's keyed pristine-lookup remount rather than overwriting a dirty baseline. Do not replace the one-shot Mantine initialize with speculative server lookup adoption.
5. Keep the original schema, five fields, IconPicker generic input binding, ping checkbox/Collapse, fieldset, buttons, Link, translations, imperative validation Boolean and async completion. Preserve accepted24 unknown/confirmed/reconcileheld/settled handling in wrappers; do not move producer replay into recovery.

Installed source evidence was read only: `packages/form/src/index.ts` delegates to Mantine useForm; installed `use-form.mjs` and `use-form-status.mjs` distinguish value updates, reset and resetDirty. `onValuesChange` alone cannot observe all baseline/dirty-only operations. A committed real dirty observation plus actual source reset/acknowledgement handling is feasible **NOW**, without a new form abstraction or changes to `@homarr/form`.

## 2. NOW-ready native modal ownership — renewed25, then narrow24 join

Exact proposed25 product writes:

- `packages/modals/src/index.tsx` — existing ModalContext/ModalProvider/ActiveModal owner
- `packages/modals/src/reducer.tsx` — original real stack/reference transitions and FullModal association
- `packages/modals/src/type.ts` — original ModalActions contract

Sole proposed new return: `.scratch/nitro-full-migration/implementation/modal-instance-owner.md` (glob absent). `creator.ts`, confirm/footer bodies, presentation CSS/animation styling, settings/session/notification sources remain unchanged. Public type export, if needed, is a separate01 request below.

**Observed existing API:** `ModalActions` has `closeModal(): void` and optional `setCloseInterceptor(interceptor: (() => boolean) | null): void`. `createModal<TInnerProps>(component)` preserves its original typed inner props. `useModalAction(modal).openModal(innerProps, options: OpenModalOptions | void)` does not expose the ID returned internally by openModalInner. Do not assume an existing handle/cancel API or widen openModal's return.

**Proposed addition, not an existing method:**

```ts
capturePresentationOwner: () => {
  isCurrent: () => boolean;
};
```

Provide it through the original per-instance `actions` constructed in `getModal`; derive it from that actual `modal.id`, real stack membership and current-layer activation generation. An exiting `state.current` reference is not membership. Covering a keepMounted modal retires its captured presentation generation; uncovering it permits a new capture, never revives the old one. CLOSE/CLOSE_ALL permanently retire removed instances; provider teardown retires every capture. No caller IDs, literal true, auth-only flag, mounted-only flag or separate generic capability provider.

Current dispatch/render lag matters: close or stack cover must retire captured presentation ownership synchronously **before** callbacks/reentry/await can publish. Smallest concrete implementation is one canonical provider-owned real ModalsState reference with rendered state published from its transitions, using the existing reducer exactly once per accepted action. Make the stack reducer's transition pure and move its existing onClose invocations to that owner: publish the actual next state/generation first, then invoke the captured removed-instance callbacks once, preserving single-close and CLOSE_ALL top-to-bottom order. This is not a second shadow stack/registry. Independent review must check reentrant open/close cannot publish an older rendered stack over a newer transition.

Preserve original UI-close interceptor veto; a veto must not retire ownership. Keep programmatic close's original instance association/behavior, keepMounted persistence, translated titles/options, original entry timer cleanup and exit/reference behavior. Bind UI close to the actual current instance, not a stale global current-layer closure. The existing `canceled` action field is unused: do not invent cancellation results; accepted dismissal retires presentation irrespective of that unused field.

Native presentation ownership is **not session/source authority**. Each24 producer continuation additionally captures the real originating draft/controller and session/target owner before awaiting. Reconciliation still runs for its captured originating scope after presentation retirement; notification/reset/selection/close requires all captured predicates. Do not gate reconciliation on the modal being current.

After25 freezes/reviews, proposed narrow24 consumer writes are exactly:

- `packages/modals-collection/src/apps/quick-add-app/quick-add-app-modal.tsx`
- `packages/modals-collection/src/apps/app-select-modal.tsx`
- `packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx`
- `packages/modals-collection/src/search-engines/request-media-modal.tsx`

They extend the actual content-actions typing to require native capture and use it, combined with the real host capture, throughout their existing P2 continuations. Require the host `captureSubmissionOwner: () => { isCurrent: () => boolean }` on these dialog props too; native capture cannot replace the real session/target/draft predicate. Schedule after step1 on the overlapping two app-dialog files, never concurrent writers. Sole proposed new return: `.scratch/nitro-full-migration/implementation/shared-modal-source-join.md` (glob absent); no previous playable24 report edit is implied. External content hosting must supply a genuine owning modal lifetime too, not a structural close callback pretending to be native ownership. Native `createModal`/content/actions assignability and stacked keepMounted behavior remain review/check prerequisites; do not bypass them with casts.

## 3. Consumer allocation sequence — actual adoption, not compiler appeasement

### A. Source seams first

Oracle may release steps1/2 concurrently on their disjoint packages. Freeze/review each before the narrow24 native-action join. No backend dependency is required to implement these real source behaviors. Consumer enabling is still prohibited.

### B. Renew09 for the actual original form join

Exact proposed product paths:

- `apps/nitro/src/source-ui/apps/contracts.ts`
- `apps/nitro/src/features/apps/app-form.tsx`
- `apps/nitro/src/features/apps/context.tsx`

Sole proposed new return: `.scratch/nitro-full-migration/implementation/apps-shared-form-adoption.md` (glob absent). `management.tsx`, `selection.tsx`, roots/routes remain frozen unless an independently demonstrated necessary edit is separately allocated.

Use public `@homarr/forms-collection/new-app/_form`, not another field tree.09's actual SourceAppFormProps currently allows `handleSubmit` to return void and lacks24's icon resources/currentness/disabled props; narrow the submit type to `Promise<void>` and pass real required source resources through the actual09 controller/context. This closes the structural mismatch rather than dropping props in a wrapper. The existing09 `captureSubmissionOwner()` implementation captures its committed mounted binding (user/authority revision/client/QueryClient/mode/appId/source mount); use it unchanged in meaning. `onDirtyChange(dirty)` already drives held-lookup reconsideration. Absent ref remains unavailable.

The09 controller also needs acknowledgement retention before reconciliation: today `mutationFn` returns the real create/update result, but awaited `onSuccess` invalidation failure can make `mutateAsync` reject after the write. Retain that real result before awaiting invalidation; retain unknown outcome if producer acknowledgement is absent. Recovery must only reconcile the captured QueryClient/generated scope and any unfinished navigation, never repeat create/update. Keep that retained operation in the real controller/producer lifetime across source-form remounts; an owner-change mutation.reset must not erase a known/unknown durable operation. Do not reset dirty or announce success before critical settlement. This control-flow amendment can be prepared against existing genuine factory-derived signatures, but cannot make the absent app transport/identity ready.

### C. Exact five Widget controls and host files — new explicit source leases

The recorded five adoption defects are QuickAdd, two IconPickers, Docker app creation and embedded AppForm; Beszel is a separate defect, outside this plan. These are not fixed by broad rebuilding the original Next app.

| Proposed owner and precise product files                                                         | Required actual binding                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19: `packages/widgets/src/_inputs/widget-app-input.tsx`                                          | Real selectable read/create/pending, app-family reconciliation, IconPicker resources, native QuickAdd instance plus original Widget form/property generation. Await reconciliation before the original ID setter; remove the detached `void refetch().then(setFieldValue)` sequence. Fence the setter itself against the initiating draft.    |
| 19: `packages/widgets/src/_inputs/widget-custom-widget-configuration-input.tsx`                  | Original icon option gets real IconPickerResources and original input props; preserve definition/path identity and source value/error binding.                                                                                                                                                                                                |
| 19: `packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx`                    | Thread those same genuine resources into its original RepositoryEditModal; capture actual repository/draft/modal owner and keep suggested-search/empty-URL semantics. Do not change provider/import algorithms.                                                                                                                               |
| 19: `packages/widgets/src/modals/embedded-app-edit-form.tsx`                                     | Real byId/update/pending, ICON, dirty/captured-submit seams and origin reconciliation. Its current absent-ref `submitIfDirty` returns true; change to unavailable/false, retain pristine-current true and real dirty submit Boolean. Retain confirmed update separately from invalidation/notification failure.                               |
| 19: `packages/widgets/src/modals/widget-edit-modal.tsx`, `packages/widgets/src/_inputs/index.ts` | Actual source host threads explicit control-specific typed resources into those three input branches and embedded form, preserving original FormProvider, registry mapping, original rich modal and imperative save ordering. Do not create a new compatibility/context provider or change all CommonWidgetInputProps to evade missing binds. |
| 20, coordinated14: `packages/widgets/src/docker/component.tsx`                                   | Only the original add-to-Homarr handler's real selected-container/app-create-many/reconciliation/presentation-owner binding. No unrelated Docker mutation, inventory, definition, registry or capability rewrite.                                                                                                                             |

These seven source paths are **not covered by old19/20 leases**. Authorize only after their genuine host inputs exist; no prop defaults or callback-style mutate wrapped in an immediately resolved Promise. Required host-input plumbing must be reviewed together with native modal assignability, not declared fixed by adding a local prop which the real caller cannot supply.

Target19 joins use existing `WidgetEditorBindings.IconPicker` and `AppEditor`, `EmbeddedEditorProps { id, handleRef }`, and `EmbeddedEditorHandle { submitIfDirty(): Promise<boolean>; isDirty(): boolean }`. Original embedded source currently takes `appId` and React ref and lacks handle isDirty: the real join must translate the ID/ref and report actual source dirty state, not assert structural assignability. IconPicker's target slot includes disabled but the raw shared IconPicker does not: preserve disabled via its actual enclosing fieldset and captured change/upload guards, including already-open portal callbacks, not ignored forwarding. Target20 already takes `NativeWidgetHostProps.Renderer: ComponentType<WidgetComponentProps<TKind>>`; bind the actual rich Docker view in that slot, not a made-up general-client method.

If target binding code is needed, reserve **only** new `apps/nitro/src/features/widgets-editor/shared-controls.tsx` (19) and `apps/nitro/src/features/widgets-runtime/renderers/docker.tsx` (20), both glob absent, plus the already listed19 source host files. These must render/delegate real original controls with real producers, not inert helper exports. Proposed separate returns:19 `.scratch/nitro-full-migration/implementation/widgets-shared-control-adoption.md` and20 `.scratch/nitro-full-migration/implementation/widgets-docker-shared-control-adoption.md` (both glob absent). No frontend root, routes, private mount or full-namespace rewrite is leased.

### D. Producer, localization and declaration gates

- **Generated/backend HELD:** current `createExpansionApiAssembly` actually contains only integration/widget/customWidget. `createExpansionBrowserClient` infers exactly that assembly. It has no app, Docker, icon/media-upload or board namespace.09's `NativeAppClient` derives from genuine `createAppProcedures`, but that separate type is not an admitted generated transport. No app method cast, widget-client widening, public-integration substitution or manual parallel cache prefix.
- **Identity HELD:** `ExpansionQueryCacheIdentity` requires cacheLifetimeId/clientCacheId/principalCacheId/permissionRevision/boardCacheId/boardRevision. The types and scope lifecycle are present; a genuine six-field owner is not supplied by this plan.09's existing user/revision-derived feature prefix is not that owner.02 plus the actual family/host owners must return an independently accepted originating identity/QueryClient/generated-options binding before private enabling. No backend/identity implementation allocation here.
- **Retained producer vs modal:** unknown/confirmed/held acknowledgement lives with the real operation owner outside disposable modal/form mounts. Native modal capture controls presentation only. Closing/reopening/capability changes must not erase an unresolved operation or re-enable a write. Background reconciliation uses actual captured results and originating query keys/client; a later authorized current read may complete it, never an old principal response transplanted into a new scope.
- **Localization:** propose a dedicated translation-owner lease solely `packages/translation/src/lang/en.json`, with new `.scratch/nitro-full-migration/implementation/shared-outcome-copy.md` (glob absent). Add reviewed unknown/confirmed-but-reconciliation-held copy under a deliberately approved catalog location; this plan does not pretend keys already exist. `loadMessages(locale)` actually merges the existing English fallback with the selected catalog. Consumers resolve `outcomeLabels: { unknown: string; reconcileheld: string }` from that real snapshot. Preserve existing action/field copy. English fallback is not a claim of newly translated selected-language copy; additional locale files need exact separate allocation. No callback no-ops, literal permission or creation-failed wording for an acknowledged write.
- **01 declarations only where needed:** Nitro currently lacks direct `@homarr/forms-collection` and `@homarr/modals-collection`; admit these existing workspace dependencies before direct target imports. Existing shared form subpaths/root and modal collection root suffice. If consumers need ModalActions as a public type,01 alone publishes its type export from `packages/modals/index.ts` to existing `src/type.ts`; no new runtime provider/export path is needed. Widgets already declares the shared packages. `@homarr/widgets/inputs` supplies getInputForType; for direct embedded import request01 only `./modals/embedded-app-edit-form` → existing `./src/modals/embedded-app-edit-form.tsx`. For a Docker rich-view import request01 only `./docker/native-view` → existing `./src/docker/native-view.tsx`. No guessed wildcard imports/deep source bypass.19's recorded Zod4.6.5/4.4.3 coherence hold remains01's exact declaration task, not a cast or broad lock rewrite here.

Original Next files stay read-only evidence; do not repair their callback-style submits merely to quiet a whole reference build. `packages/forms-collection/src/icon-picker/icon-picker.spec.ts` and every other existing test JSX stay unchanged without explicit permission. Board/media/Spotlight/Assistant consumer lists in the accepted24 handoff remain held; they are not silently added to this seven-file Widget allocation.

## Review/check obligations and recorded pins

Each proposed source lease must declare its exact inventory/new return before edits, then freeze and obtain independent Spec/Standards review. Future separately authorized checks: focused lint and types on a complete truthful immutable dependency/config closure, public source-form/native-modal assignability, all five actual Widget host call sites, dirty→pristine lookup reconsideration, stale submit/reset, same-tick close/cover/reentry, keepMounted cover→return, interceptor veto, producer-acknowledged reconciliation failure and remount retention. Retain raw failed diagnostics; no excluded25 pass or callback facades count as integration. No new tests are proposed; runtime/scenario/native proof requires its own later authorization. Report-only32's current compiler-layout proposal is separate and must not be replaced by old snapshot shortcuts.

Recorded, **not freshly computed**, source pins:

| Source                                       | Recorded SHA-256 / meaning                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 24 thirteen-path frozen aggregate            | `4c26956b1201c3c910c5ed10a0af990d14bc4f12a822280eb3b3e30223c92203`; accepted P2 source, P1 held |
| 09 app-form.tsx                              | `f9476c2bf179fdc3e007426bc09f33e2d85253ef836f8688fe4dab07f3c16276`                              |
| 09 source-ui/apps/contracts.ts               | `a0e3e8ba5ceb695c55e99e52a5e53e63bcd8e951c84e30b0cab731b0b915d722`                              |
| 09 selection.tsx, unchanged by proposal      | `5ef088afb3d0af9600381a4efe3dcd94814b876607b9d1e82ed01845ec591041`                              |
| 19 thirty-one-path aggregate                 | `a85be7482268dec34b9a3b35845245f9dc8f84afcdd7f3581568e6f6643da0c5`                              |
| 20 generated-hooks.ts                        | `17af911a0e25c3c95c02db1114226fefc4742998f400030ea2793f4f8db1710d`                              |
| 20 transport-link.ts                         | `e1ebc5970e961e0a7d754994a2cf26802eca770b594b6e5662b83b65ecb64805`                              |
| 25 source-session.tsx, unchanged by proposal | `5bd576ff5d2d071265bdc93da9d88b88e0c94d763de9095a0935bb78abc6375b`                              |

25's handoff does not print individual modal stack/type/reducer hashes; obtain actual pins under a future authorized lease, do not infer them from the session hash. Recorded API/tool pins: Mantine9.6.0, React19.2.7, oRPC2.0.0-beta.43, Query5.101.2, TS7.0.2/Oxlint1.73.0, Node24.18.0/Bun1.4.2. No execution occurred here.

**Oracle release recommendation:** renew24's four-file real form seam and25's three-file native stack seam now; require their review before the serialized24 native dialog join. Allocate09 and the seven Widget controls only with the stated genuine producer/identity/localization inputs and exact declarations. P1 closes only when real composition consumes these original controls and the actual host joins pass review/checks, not when interfaces alone compile. All source/native/resource/writer/COMMIT/SSR/production gates and central91-of334 counts remain unchanged.
