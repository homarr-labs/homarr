# Evening W0 repair — explicit mutation holds and original errors

## Frozen outcome

Only the renewed three product files were patched. This report was absence-checked before creation. The requested captured-callback mutation fence is **not implemented or claimed**: the installed public form API cannot supply it safely through this lease without changing the original callback owners. The explicit-HOLD fallback is used instead.

| Owned path                                                        | Frozen mapping                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nitro/src/features/widgets-editor/shared-controls.tsx`      | Keeps the original ten-component delegation intact. Adds an explicit hold for every mutation-bearing static type: text, switch, number, slider, select, multiSelect, multiText, timezoneList and dateTimeEventList. Internal remains nonmutating.                                                                                                                          |
| `apps/nitro/src/features/widgets-editor/widget-option-fields.tsx` | Checks that hold before mounting an original static control or considering a specialized replacement. Shows the existing translated unavailable alert. Removes DOM-capture guards as purported mutation protection. Renders original ReactNode errors for the exact option path and its dot-delimited descendants, including held options and resource-dependent branches. |
| `apps/nitro/src/features/widgets-editor/widget-editor.tsx`        | Counts held static options as missing bindings even when an external specialized binding advertises support. Keeps the complete original form error record rather than filtering it to strings. Threads that record to option error rendering and exposes integration/advanced descendant errors.                                                                          |

The hold is intentionally wider than the two reported DnD controls. Ordinary static inputs also obtain callbacks through the form's closed-over setter, while multiText additionally writes defaults directly. The previous render-captured `canChange` enhancer does not prove live admission or irreversible origin retirement for any of those callbacks. Keeping those inputs enabled would advertise an unproved fence. This is temporary blocking, not deletion, registry pruning or a replacement field implementation.

## Why the public form API is insufficient here

- `packages/widgets/src/_inputs/form.ts` directly exports the existing `createFormContext` result; its provider receives the genuine form object.
- Installed `UseFormInput` has no pre-mutation admission hook. `onValuesChange` observes a write after value storage has changed; undoing it would be the prohibited rollback approach.
- Installed `useForm` creates input callbacks around its internal `setFieldValue`. Replacing only the returned object's setter would not fence those closed-over callbacks, list methods or default effects. A copied/decorated fake form is not used.
- The original timezone/date-event controls directly invoke `form.setFieldValue`; their document-level DnD callbacks and date confirmations cannot be secured by a fieldset or input enhancer. Their required origin must be captured before the retained interaction and checked at the actual write, not renewed at release/confirmation.

The genuine form object, values, captured initial baseline, validation/refinements and dirty state remain unchanged. Legitimate preview-patch generation behavior remains unchanged. No advanced schema, staging algorithm, embedded-save order, definitions, source components or CSS were changed. The remaining pre-existing advanced/resource callbacks are not certified by this static-control fallback.

## Exact minimal original-source callback scope to release the reported pair

These are proposed future allocations, **not edits performed by this lease**:

1. `packages/widgets/src/_inputs/widget-timezone-list-input.tsx`: add a required control-specific capture contract; fence default initialization and `setValues` immediately before the real `form.setFieldValue`. Capture the originating DnD operation at drag start and retire it on cancel/end; an end handler refreshed by a later render must not adopt a new origin. Guard presets, add, row edits/removal and timezone-selection continuations through the same write boundary.
2. `packages/widgets/src/_inputs/widget-date-time-event-list-input.tsx`: the same required capture/write contract for defaults, add, reorder, row updates/removal, recurrence, timezones and progress. `ConfirmedDateTimePicker` must retain the originating dropdown/confirmation operation, including the callbacks passed to it; reopening may capture a new origin, but re-enabling must not revive a retired confirmation. Preserve all existing wall-time/recurrence helpers.
3. `packages/widgets/src/modals/widget-edit-modal.tsx`: the actual original source host must supply those newly required control inputs from its real editor lifetime. It cannot omit them, default them to true or manufacture an owner. The renewed Nitro three-file consumer scope must then pass its real captured editor generation plus a live admission predicate. Contract types may live in the two affected control files; no generic CommonWidgetInputProps widening or new library is needed.

Every eventual write must require both the originally captured generation/interaction and live `canChange` at invocation. Disable, closing, permission retirement and origin changes must permanently retire that capture; re-enable must not refresh it. This is separate from authentication/presentation ownership still owed by the relevant producer lanes.

The other static holds can be released individually only when their actual original callback owners receive the equivalent required capture/write check. Exact additional callback owners are:

- `packages/widgets/src/_inputs/widget-text-input.tsx`
- `packages/widgets/src/_inputs/widget-switch-input.tsx`
- `packages/widgets/src/_inputs/widget-number-input.tsx`, including unit-converted callbacks
- `packages/widgets/src/_inputs/widget-slider-input.tsx`
- `packages/widgets/src/_inputs/widget-select-input.tsx`, including retained dropdown callbacks
- `packages/widgets/src/_inputs/widget-multiselect-input.tsx`
- `packages/widgets/src/_inputs/widget-multi-text-input.tsx`, including default initialization, blur/Enter additions, Backspace/removal and its captured original input callback

Those source callbacks must check before calling their original real form/input mutation function; do not substitute synchronized state, reset the dirty baseline, suppress validation or reinterpret post-write notification as admission. Shared contract/helper factoring is an implementation choice for a subsequent explicit allocation, not permission to edit another source now.

## Error behavior and verification limit

`WidgetEditorFieldErrors` matches `path === requestedPath` or `path.startsWith(requestedPath + ".")`. Thus `options.events.0.label` belongs to `options.events`, while `options.eventsExtra` does not. Each original error value is rendered directly as a ReactNode with its path as the React key; no stringify, coercion, replacement message or string-only filtering is used. Legacy string-only field props remain compatible, but the complete error record is independently displayed.

No other W6 files, original static controls, W1/W2 sources, U/P/H/A sources, manifests, lock, routers or coordinator files were written. No commands, checks, lint/typecheck/compiler, installs, tests, builds, browser/runtime/native operations, data/environment/secrets, Git or delegation were executed. No repeated documentation/quota calls were made.

The three files are frozen for independent source rereview. A remains outside this lease and still writing; integrated checks wait for all reached sources to freeze and rereview. This repair blocks current unsafe enables and reveals validation errors; it is not production evidence, an adoption count or a counterclaim against the reviewer.
