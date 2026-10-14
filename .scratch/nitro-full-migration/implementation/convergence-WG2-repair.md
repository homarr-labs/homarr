# Convergence WG2 repair — genuine fresh starts

## Frozen allocation

Renewed three-source repair only, following the supplied oracle approval `ses_ecf309c3effevL5S3XXm2WZKLG`. Changed the original three control files and this new report. The original `convergence-WG2.md` and existing failure evidence were not overwritten. No WG1/ST/D, host, owner-context, form, definition, manifest or other source writes.

No commands, lint/type checks, tests, installs or runtime execution. **0/9 holds released; all nine remain held.** Source readback is not compiler/runtime/procedure acceptance.

## Actual source delta from the first WG2 freeze

- `packages/widgets/src/_inputs/widget-multi-text-input.tsx`: `beginEdit` now returns early only for `previous?.active && previous.owner.isCurrent()`. An admitted focus/click can replace a retired operation, retaining that start's original change/blur callbacks and clearing retired search. Removed the unconditional `operation.active = false` from `onDropdownClose`: Escape closes the dropdown without ending a still-current focused edit. Actual blur and cleanup still end it. Change, Enter, Backspace and blur do not call `beginEdit` or capture a replacement origin.
- `packages/widgets/src/_inputs/widget-timezone-list-input.tsx`: `useTimezoneSelect.begin` now preserves only an active **current** operation. Nonrepeating genuine keyboard starts call `begin` without a blanket rejection of the retired stored owner; focus/pointer starts remain intact. Added `clearButtonProps: { onClickCapture: begin }`, capturing the native clear-button click before Mantine's bubble-phase clear callback. Added the required private `startSearch(origin)` seed callback: the pending selector clears a retired selection under the admitted start owner and returns an empty search seed; valid pending selections remain unchanged, and row selectors seed from their committed timezone label. A retired pending selection no longer supplies the label used by search synchronization or a fresh start.
- `packages/widgets/src/_inputs/widget-date-time-event-list-input.tsx`: both `ConfirmedDateTimePicker.beginEdit` and `useEventSelect.begin` now return early only for an active **current** operation. Genuine focus/pointer/nonrepeating keyboard starts can replace a retired operation, seeding from committed `value`/`label`; still-current active edits remain untouched. Removed the retired-owner blanket rejection from the genuine key-start handlers. Editable TimePicker Enter still does not start an operation; draft change, confirmation, close and reset remain existing-origin continuations without new capture.

No changes to DnD start/end/cancel continuations, real-form current-list transforms, row-ID checks, changed-field merging, limits/uniqueness, wall-time helpers, recurrence, progress deletion, setters/default effects, host contracts, input focus behavior, sensors, original controls, CSS or portals.

## Installed clear-button surface

Read the installed `Select.d.ts`, `InputClearButton.d.ts` and `ComboboxClearButton.mjs`. Select's `clearButtonProps` accepts native button element props. ComboboxClearButton forwards capture props through `...others`; its bubble `onClick` invokes `onClear()` before the supplied ordinary `onClick`. The repair therefore uses supported `onClickCapture`, not an invented Mantine gesture event or a patched method. Previously read public Mantine documentation remains the documentation basis; no new library or import was introduced.

## Remaining acceptance

Coordinator-owned focused verification and independent review remain required for fresh interaction after retirement, Escape followed by continued MultiText editing, clear after dropdown close, retired pending-selection/search discard, committed date/time seeds, and unchanged retained-continuation rejection. Genuine producer/provider and source/target host retirement remain separate required joins; this repair does not certify them or release any hold.
