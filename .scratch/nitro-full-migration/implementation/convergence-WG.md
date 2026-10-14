# Convergence WG — original static-control owner fence

## Decision and limits

Amend the nine original mutating controls at their actual callback boundaries. Keep the genuine `useForm`/`FormProvider`, original inputs, validation, initial baseline, dirty tracking and Mantine/CSS. The existing nine holds remain until this amendment and its genuine host ownership join receive independent review. This is an implementation allocation, not a claim that the holds have been released.

Only this new report was written. No product edits, commands, checks, tests, environment/data access, service calls or nested agents were performed. The frozen W writer `ses_ecf87128cffeKOcCmdq9NU9PF4` is not resumed or given concurrent ownership by this report.

## Verified source boundaries

- `_inputs/form.ts` exports the original form context unchanged. Replacing its returned `setFieldValue` would not intercept callbacks already created by `getInputProps`.
- Text/switch/slider/multiSelect spread `getInputProps`; number additionally retains/converts `inputProps.onChange`; select retains that callback through its dropdown.
- MultiText retains `inputProps.onChange`, writes defaults directly, and also owns search state, blur/Enter additions, Backspace removal and pill removal.
- Timezone/date-event lists write defaults and `setValues` directly. Both DnD end callbacks presently use the render's `values`; neither captures drag origin. Timezone Select also owns a local pending selection.
- `ConfirmedDateTimePicker` presently passes `setDraftValue` directly, resets from a refreshed `value`, and confirms through a refreshed `onChange`. Its retained interaction is not protected by a disabled ancestor.
- Target `canChange()`/input enhancer are render-closed predicates. `editorGeneration`/`activePreview` protect preview work, not static controls. Do not reuse the preview generation: ordinary form changes advance it, which would unnecessarily invalidate legitimate multi-step input interactions.
- BoardEditor has the real `activeWidgetEditor`, widget/edit generations, captured baseline, reserved item ID and `current` refs. Its `onApply` fence is not currently exposed as a capture contract. Source native modal actions already have `capturePresentationOwner()` and an irreversible stack activation fence.

## Exact proposed write allocation

### WG original-control amendment

1. NEW `packages/widgets/src/_inputs/static-owner.tsx` — static-controls-only required context, captured-owner types and the small field/mount ownership join described below. No form wrapper or general-purpose stale-callback library.
2. `packages/widgets/src/_inputs/static.ts` — export that provider and its public owner type through the existing static entrypoint; retain all ten original component exports.
3. `packages/widgets/src/_inputs/widget-text-input.tsx`
4. `packages/widgets/src/_inputs/widget-switch-input.tsx`
5. `packages/widgets/src/_inputs/widget-number-input.tsx`
6. `packages/widgets/src/_inputs/widget-slider-input.tsx`
7. `packages/widgets/src/_inputs/widget-select-input.tsx`
8. `packages/widgets/src/_inputs/widget-multiselect-input.tsx`
9. `packages/widgets/src/_inputs/widget-multi-text-input.tsx`
10. `packages/widgets/src/_inputs/widget-timezone-list-input.tsx`
11. `packages/widgets/src/_inputs/widget-date-time-event-list-input.tsx`
12. `packages/widgets/src/modals/widget-edit-modal.tsx` — provide a real source editor activation joined to native presentation; synchronously retire it before submission/closing, publish fresh captures only for new admitted activations.
13. `apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx` — replace the existing close-only `LazyWidgetEditModalContentProps.actions` type with imported `ModalActions`. Pass the already supplied real actions through unchanged. Do not synthesize presentation capture. This is a narrow signature join, not a Next.js repair tranche.

The required context avoids widening `CommonWidgetInputProps`, changing the heterogeneous `_inputs/index.ts` registry, or adding optional/default-true ownership props. Missing provider is a wiring error, not permission to mutate. Internal remains nonmutating and does not consume the new hook.

### Serialized W consumer amendment

14. `apps/nitro/src/features/widgets-editor/contracts.ts` — required real editor current-owner/capture contract, using the same `{ isCurrent(): boolean }` shape as existing AppForm/modal contracts.
15. `apps/nitro/src/features/widgets-editor/widget-editor.tsx` — own the local static-input activation, maintain committed live admission refs, and mount the required static provider inside the unchanged real `FormProvider`.
16. `apps/nitro/src/features/widgets-editor/shared-controls.tsx` — preserve delegation to original components. Remove each static hold only after its original boundaries and host join are reviewed; no specialized replacement may bypass a remaining hold.
17. `apps/nitro/src/features/widgets-editor/widget-option-fields.tsx` — retain disabled Fieldset/inert presentation and exact/descendant ReactNode errors. Retain held alerts until release is reviewed. No DOM-capture safety claim.
18. `apps/nitro/src/features/widgets-editor/add-widget.tsx` — require and forward the actual initiating host capture/currentness to its WidgetEditor; join the selected definition/destination lifetime rather than manufacture an owner from `opened`.

### Required U/A producer allocation, not WG/W concurrent writes

- `apps/nitro/src/features/boards/contracts.ts` — add required `isCurrentOwner(): boolean` and `captureChangeOwner(): { isCurrent(): boolean }` to `BoardWidgetEditorInput`.
- `apps/nitro/src/features/boards/editor.tsx` — expose the existing session/generation/baseline fence and join actual authority retirement, as specified below.
- NEW `apps/nitro/src/features/boards/widget-composition.tsx` — the proposed private composition seam forwards that same owner plus the real request/query/presentation lifetime to AddWidget/WidgetEditor. If U chooses another concrete composition path, name and allocate it before implementation; no imaginary route contract is accepted here.

No `_inputs/form.ts`, `CommonWidgetInputProps`, option definitions/defaults, schema, original registry, CSS, manifests, lockfiles, global assembly or unrelated resource control needs changing for this static amendment. Existing W overlaps require serialization against the frozen three-file repair.

## Actual contract: captures, not renewable Boolean callbacks

Public types in `static-owner.tsx`:

```ts
export interface CapturedStaticWidgetInputOwner {
  isCurrent(): boolean;
}

export interface StaticWidgetInputOwnerProviderProps {
  owner: CapturedStaticWidgetInputOwner;
  children: ReactNode;
}

export function StaticWidgetInputOwnerProvider(
  props: StaticWidgetInputOwnerProviderProps,
): ReactNode;

export function useStaticWidgetInputOwner(
  kind: WidgetKind,
  property: string,
): CapturedStaticWidgetInputOwner;
```

The context contains a **previously captured** editor activation, not a function that can obtain today's owner at mutation time. Each of the nine original components calls the required hook and closes its callbacks over the returned field/mount capture. All direct setter helpers require that capture as an explicit parameter. No default origin and no `origin ?? currentOwner` branch.

The hook only joins the supplied captured editor owner to the original component's mount/field activation. Its `isCurrent()` requires the exact captured local lease to remain active and current, unchanged `kind`/`property`, and the supplied captured editor owner's `isCurrent()`. Property change, provider-owner change or cleanup irreversibly retires the old lease. A replacement creates a different lease object; it never sets an old lease's `active` back to true. Activation publication must request the fresh render that supplies callbacks for the new lease, including effect disconnect/reconnect. Until publication, return a denied capture. Do not let an old callback read a newly published lease and adopt it.

This uses the existing `lease.active && owner.current === lease && capturedOwner.isCurrent()` convention from AppForm. It owns no form values, pristine baseline, list copy, resource observer or submission state.

## Host activation and live admission

Target WidgetEditor requires:

```ts
isCurrentOwner(): boolean;
captureChangeOwner(): { isCurrent(): boolean };
```

For a committed admitted activation, capture upstream once and create a distinct local input lease. The owner object published to the provider is fixed to that lease:

```ts
const isCurrent = () =>
  lease.active &&
  inputOwner.current === lease &&
  lease.binding === current.current.binding &&
  lease.hostOwner.isCurrent() &&
  current.current.isCurrentOwner() &&
  current.current.canChange();
```

Here `current.current.canChange` reads committed current props plus immediate refs, never the old render's `canChange`. Admission requires opened, configure permission, no pending/integration creation/discard presentation, and neither synchronous submission lock. `binding` identifies the genuine host/draft lifetime: board/reserved item/kind/definition, initial draft identity, client/query ownership and authority/presentation capture binding. It is not `form.values`, the fresh Mantine form object, or a fresh `createOptions` object.

Implementation flow is specific:

1. Maintain an input-owner ref separate from the existing preview ref. A committed layout update publishes live context and reconciles the binding/admission state. Initial or replacement activation publishes a **new** lease and requests a render for its captured owner; callbacks from the preceding render remain denied. Reconcile stable semantic binding fields, not freshly constructed callback/object identity, to avoid an activation/render loop.
2. On loss of admission or binding change, first set the old lease inactive and remove it from the current ref. Never reactivate it. On later admission, capture a new upstream owner and allocate a new lease; re-enabling does not refresh an old owner object.
3. Retirement is synchronous before `submitting.current = true`, `integrationCreationLock.current = true`, opening discard, requesting actual close or invoking a host-changing continuation. It is not deferred until `setPending`/`setCreatingIntegration` commits. Local close/unmount cleanup retires even with `keepMounted` content.
4. Permission/read-only/principal/query/board/presentation retirement must also invalidate the upstream captured owner at the producer, including transitions without a consumer render. A denied-then-restored Boolean sampled only at invocation is insufficient. Committed consumer layout retirement supplements, not replaces, that producer epoch.
5. Stale callbacks cannot call `captureChangeOwner` to renew admission. Newly rendered controls receive the new captured provider object; retained interactions keep their old object. Existing preview guards and genuine form baseline remain untouched.

U's capture must close over the actual `widgetEditor` session, widget/edit generation, captured baseline and authority/presentation origin **before** handing it to W. Its `isCurrent()` retains BoardEditor's existing `activeWidgetEditor.current === widgetEditor`, generation equality, `current.current.baseline === widgetEditor.baseline`, `mounted` and live `canUpdate` checks. Additionally require the captured request/query/authority owner's currentness; rotate/retire at actual authority loss, discard/close and replacement. Merely rereading restored `getBoardAccess` would revive an old capture and is not the required producer join. `onApply` returning void remains unrelated to successful staging.

The original source host uses its real form/editor mount and native `actions.capturePresentationOwner()` rather than a fabricated modal owner. Join current session/configure admission and board/item/definition/value lifetime to its own irreversible local input lease. Retire synchronously before original submit and close, and on committed session/permission/binding loss. On modal cover/uncover, the native captured activation already remains retired; a newly admitted source render may publish a **new** capture, not revive the covered one. The close-only lazy-wrapper type must not erase this action. Session observation alone is not a substitute for any still-missing authenticated producer retirement; do not certify that boundary or enable a target host without U/A's actual join.

## Exact original callback amendment

For callbacks returned by the real form, destructure the actual `onChange`, `onFocus` and `onBlur`; spread only their remaining input props and install guarded callbacks afterwards. Preserve callback arguments/events and return behavior. Check the field capture immediately before calling **each** original callback, including focus/touched and blur/validation callbacks. Do not copy/decorate the form object or call another setter in place of its original callback.

```ts
const owner = useStaticWidgetInputOwner(kind, property);
const inputProps = form.getInputProps(fieldPath);
const originalOnChange = inputProps.onChange;
const onChange = (next: unknown) => {
  if (!owner.isCurrent()) return;
  originalOnChange(next);
};
```

This is the boundary shape, not a suggestion to erase component-specific event types. Switch keeps its checkbox `getInputProps` call; number keeps its string/number signature and exact conversion before the guarded original callback. Text keeps its original UI and events.

Slider must also retain the pointer/keyboard gesture's starting field capture: a continued drag cannot adopt a refreshed `onChange` after re-enable. Capture at the original control's pointer/key start, require that operation for continuous changes, consume it at end/cancel, and never renew on movement or key repeat. Keep range/step and continuous writes unchanged. Number's retained increment/decrement repeat, if used by the installed component, needs the same initiating-button/key capture; a delayed repeat is not a new user interaction. Review the actual installed callback/gesture surface before wiring these starts/ends; do not invent a Mantine `onChangeStart` API or replace the component. Fresh ordinary change events still use their render-bound owner.

### Select and multiSelect

Direct changes use the render-bound field capture. Dropdown open retains that capture in an operation ref; dropdown selection/search/clear handlers must reject a retained retired dropdown even if Mantine uses newly rendered handlers. Close retires/clears that operation; a real subsequent open can start a new one. Do not null an invalid interaction and then treat its late callback as a fresh direct change. Direct clear outside a dropdown can use its own render capture, but the path must be explicit. Preserve Select's translated options, icons/checkmarks and all MultiSelect behavior; do not replace either control.

### MultiText

Guard its default effect before `form.setFieldValue` and include the captured field owner among dependencies so a denied initial activation can be reconsidered by a fresh admitted render. Guard `handleRemove`, `handleAddSearch`, Backspace and the retained original `onChange`. Guard before `setSearch`, Combobox callback calls, opening/index updates, and post-add search clearing; recheck after invoking the original form callback before any additional local mutation. Blur/Enter must retain the originating edit/search capture, not renew at blur. The search operation is cancelled on retirement; retained text must not auto-add merely because the editor re-enables. This is existing search state, not a second form. Preserve validation/uniqueness and current PillsInput UI.

### Timezone/date-event direct writes

Change the list helper to require the originating capture and a transform over the genuine current list:

```ts
const setValues = (
  origin: CapturedStaticWidgetInputOwner,
  update: (values: OptionTimezone[]) => OptionTimezone[],
): boolean => {
  if (!origin.isCurrent()) return false;
  const currentValues = readCurrentValuesFromRealForm();
  const nextValues = update(currentValues);
  if (!origin.isCurrent()) return false;
  form.setFieldValue(fieldPath, nextValues);
  return true;
};
```

For the other list substitute `OptionDateTimeEvent[]`. `readCurrentValuesFromRealForm` means the existing field in `form.getValues().options[property]`, with the original default fallback; it is not a new state store or public helper requirement. Guards also cover the default effect's real setter. Check again before any subsequent local-state mutation/callback. Preserve original timezone max/uniqueness constraints against that current list. Row changes/removals require the original row ID still exists, and merge only the changed fields into that current row; an old row snapshot must not replace unrelated newer fields. Keep unsupported timezone display and all existing recurrence/wall-time calculations.

Timezone pending selection retains its dropdown/selection owner. `setSelectedTimeZone` is guarded; add must check that retained owner and current uniqueness/limit. Clear local selection only after an admitted actual add, with another currentness check. Presets/add-label/remove/change timezone use their render or retained interaction origin explicitly.

The existing private row props must actually carry the origin, rather than close over a refreshed parent setter. Amend `SortableTimezoneProps` and `SortableEventProps` in their respective original files with the following boundary shape (substitute `OptionDateTimeEvent` for the event row):

```ts
owner: CapturedStaticWidgetInputOwner;
onChange(
  origin: CapturedStaticWidgetInputOwner,
  update: (current: OptionTimezone) => OptionTimezone,
): void;
onRemove(origin: CapturedStaticWidgetInputOwner): void;
```

The parent's callback retains row ID, verifies origin, and delegates to `setValues(origin, currentList => ...)` only if that ID still exists. Row handlers verify their stored field/interaction owner before calling `onChange` or `onRemove`. Label handlers extract the event's string synchronously, then transform the current row's label only. Timezone/recurrence/progress handlers transform that current row, not `...event`/`...city` from an older render. Event timezone conversion computes wall values from the current row inside the admitted transform using the unchanged helpers; start removal keeps the original delete semantics. Row Select dropdowns retain their opening origin just like the top-level Select controls. `ConfirmedDateTimePicker` passes its retained origin through this same parent boundary.

### DnD: capture start, consume end

Both original `DndContext`s gain `onDragStart` and `onDragCancel`. The retained operation is `{ owner, activeId, onReorder }`, where `owner` is the starting field capture and `onReorder` is the starting guarded write continuation. On start, reject unless that owner is current; retain the active row ID. On end, consume exactly that operation, check matching `active.id`, currentness and `over`, and call its continuation. The continuation derives indices from the genuine current list and checks both IDs still exist before `arrayMove` and the fenced real setter. Clear/retire the operation on end/cancel/cleanup; never capture at release or replace the operation when a handler refreshes. Do not erase a retired drag ref and allow the same late release to fall back to today's owner. Existing sensors, sortable rows, transforms and CSS stay.

### ConfirmedDateTimePicker: capture dropdown, retain original continuation

Its private signature becomes:

```ts
interface ConfirmedDateTimePickerProps {
  label: string;
  value: string | null;
  confirmLabel: string;
  owner: CapturedStaticWidgetInputOwner;
  onChange(origin: CapturedStaticWidgetInputOwner, value: string | null): void;
}
```

`SortableEvent` passes the captured row/field owner and a guarded continuation identifying row ID plus `targetUtc`/`startUtc`. `onDropdownOpen` captures `{ owner, onChange }` from that opening render. Guard draft edits using the retained operation; `confirmDraft` calls **its stored** `onChange` with **its stored** owner only if still current and draft is nonempty. A refreshed prop callback cannot adopt the old draft. The row continuation rechecks the origin, reads the current row by ID, resolves wall time with its current timezone, then invokes the same fenced list setter. A removed row, changed field/mount, or retired activation yields no callback/write.

Close/cleanup consumes and retires the operation. Guard the current `resetDraft` and value-sync effect before local writes; neither may recreate an operation. Reopening establishes a new operation and synchronizes from the current committed value. Direct text-entry draft edits need an explicit admitted edit-start capture as well; do not require dropdown opening for existing editable-input functionality, and do not capture for the first time at confirmation. Preserve DateTimePicker format, submit button, portal settings and original wall-time helpers. No new confirm modal or substitute picker.

## Review/release bar

Review all nine original paths, both host providers and the U/A capture producer before releasing their holds. Readback must establish that every actual setter/original callback/local mutation is dominated by its captured owner check, and that dropdown/drag/confirmation continuations cannot renew their origin. Review default effects and helper continuations as well as JSX handlers.

Later coordinator-owned focused verification must cover disable→re-enable without invoking the old callback during the disabled interval; native cover→uncover; retained DnD release/date confirmation using refreshed handlers; field hide/reappear; row removal and concurrent row edits; close/unmount/remount; initial denied default effects followed by fresh admission; and legitimate interactions after a new capture. This report adds no tests or evidence. Full resource-backed W1/W2 and stage/integration continuation ownership remain their separately allocated work; static capture must not be advertised as fixing them.
