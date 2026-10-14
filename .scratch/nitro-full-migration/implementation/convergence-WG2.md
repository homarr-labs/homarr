# Convergence WG2 — retained static list and draft origins

## Frozen scope and status

Changed only:

- `packages/widgets/src/_inputs/widget-multi-text-input.tsx`
- `packages/widgets/src/_inputs/widget-timezone-list-input.tsx`
- `packages/widgets/src/_inputs/widget-date-time-event-list-input.tsx`
- This new report.

No commands, checks, tests, installs, runtime execution, host/context/definition/manifest changes, staging or commits. No holds released: **0/9 released; all nine remain held**. This is source implementation and readback, not compiler, runtime or procedure acceptance.

## Implemented boundaries

All three inputs consume WG0's required `CapturedStaticWidgetInputOwner` / `useStaticWidgetInputOwner(kind, property)` contract. Default effects re-read the real form field and check the captured owner immediately before the original setter; owner dependencies permit a newly published admitted render to reconsider an initially denied default.

MultiText retains the actual `getInputProps` change callback, guards original focus/blur callbacks and every explicit Combobox/local-state mutation, and retains the originating edit's change/blur continuations. Search state is origin-tagged. Blur/Enter/Backspace require an active current edit; additions check uniqueness against real current form values and recheck ownership before clearing search. Pill removal reads current values rather than deleting by an obsolete render index. Invalid unfinished search remains editable across an ordinary same-owner blur/refocus; retired search is cleared only by a fresh admitted start, never adopted by blur/Enter.

Both list `setValues` helpers require an explicit origin and a transform over `form.getValues().options[property]`, with the original defaults as fallback. Helpers check before reading, before the actual real setter, and after mutation. Unchanged transforms do not write. Row callbacks require the retained row ID to exist and transform its current object, preserving unrelated concurrent edits. Timezone addition/change enforce current-list maximum and uniqueness; selected pending timezones retain their own origin and are cleared only after an admitted actual add.

Each list Select retains its initiating owner and original change continuation. Controlled search/dropdown state prevents the local callback paths from renewing retired operations. Close/blur/cleanup consume operations without clearing the retained origin into a fresh-change fallback. Retained key callbacks cannot restart a retired origin. Direct initial changes have an explicit render-owner path; later direct starts use the actual focus/pointer/nonrepeating keyboard surface.

Both DndContexts capture owner, immutable active ID and original reorder continuation at `onDragStart`. End consumes the operation before checking its origin and matching active ID; cancel/cleanup consume it without recapture. Reorder resolves both indices from the current real list and refuses missing IDs. Sensors, sortable attributes/listeners, sorting strategy, transforms and styling remain unchanged.

ConfirmedDateTimePicker now requires `owner` and `onChange(origin, value)`. Real edit/dropdown starts capture the original continuation, draft state retains its owner, and confirmation never captures or reads the latest prop continuation to adopt an old draft. Draft changes, reset and value synchronization are fenced; close/cleanup consume the operation. TimePicker focus/pointer/non-Enter keyboard capture supports editable time fields without requiring a dropdown-open condition. Confirmation resolves wall time against the current row's timezone; an absent row or removed/now-inapplicable start field is not recreated. Current-row timezone conversion retains the original wall-time helpers and progress removal retains delete semantics.

Original components, layout, descriptions, translations, portals, date format, confirmation button, recurrence choices, unsupported-timezone display, maximum/uniqueness constraints and CSS are preserved. No second form or patched form/library methods were introduced. Unknown list values are narrowed structurally instead of adding unsafe casts.

## Actual installed surface and documentation read

Verified dependencies in `packages/widgets/package.json`. Read installed Select, Combobox/useCombobox, DateTimePicker, PickerInputBase, InlineDateTimePicker, TimePicker and Popover declarations/implementations, plus the installed DndContext declarations.

The installed DateTimePicker does **not** expose `onDropdownOpen`: it uses a button target and editable TimePicker fields. Implementation uses the supported `popoverProps.onOpen`, native capture handlers and `timePickerProps` capture handlers, not an invented date-picker gesture event. The installed submit wrapper invokes the supplied button callback before its close/reset path. Select's actual change-before-close ordering was also inspected.

Current primary documentation read:

- <https://mantine.dev/dates/date-time-picker/>
- <https://mantine.dev/core/select/>
- <https://mantine.dev/llms/core-combobox.md>

Context7 was not used because the allocation rules identify its exhausted quota; no CLI/install workaround was attempted.

## Required remaining joins and coordinator verification

WG0's required owner module is present at readback; its producer/provider retirement and source/target host wiring remain separately allocated and unapproved by this writer. Host admission must irreversibly retire captures across disable/re-enable, cover/uncover, binding changes and unmount; consumer guards cannot manufacture that authority or repair a renewable producer Boolean.

Coordinator-owned focused lint/type verification and independent callback/interaction review remain required. Especially verify retained search/Enter/blur, dropdown close/reopen, disable/re-enable without calling the old callback while disabled, Activity/mount disconnect/reconnect, drag release with refreshed handlers, confirmation with refreshed handlers, default publication, removed rows, concurrent row edits and current-timezone wall conversions. No acceptance or release evidence is claimed here.
