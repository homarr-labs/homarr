# Convergence WG1 — six original static input boundaries

## Frozen scope and release decision

Only these allocated source files and this new report were written:

- `packages/widgets/src/_inputs/widget-text-input.tsx`
- `packages/widgets/src/_inputs/widget-switch-input.tsx`
- `packages/widgets/src/_inputs/widget-number-input.tsx`
- `packages/widgets/src/_inputs/widget-slider-input.tsx`
- `packages/widgets/src/_inputs/widget-select-input.tsx`
- `packages/widgets/src/_inputs/widget-multiselect-input.tsx`

Release remains **0/9**. No registry, form context, host, shared target, definition, manifest, CSS or dependency files were changed. No commands, checks, tests, builds, runtime execution, installs, nested agents, staging or commits were performed. This is a source handoff, not compiler, runtime, procedure or host acceptance.

## Actual callback boundaries

All six components obtain the required `useStaticWidgetInputOwner(kind, property)` from WG0's `static-owner.tsx`. The actual form's `getInputProps` callbacks are destructured; remaining original input props are retained. Each actual `onChange`, `onFocus` and `onBlur` invocation is immediately guarded by its captured owner, with argument forwarding and callback return values retained. No form copy, replacement setter, form decoration or setter monkeypatch was introduced.

Text keeps `TextInput`. Switch keeps `Switch` and the original `{ type: "checkbox" }` input-props request. Number keeps number/string input, limits, step, suffix, decimal precision and the existing KiB/s versus KB/s display/storage factor. Slider keeps its original wrapper, continuous `onChange` writes, range and step. Select keeps translated data, option icons, current icon, checkmarks, placeholder and searchability. MultiSelect keeps translated data and the original control and selection behavior.

## Retained interactions

The small static-only gesture hook is located in the allocated slider module and reused by the number module; it is not exported through the static public entrypoint. Pointer/key start stores the exact starting owner and guarded original change continuation. Movement and keyboard repeats do not refresh either. Keyboard release, pointer release, cancellation, window blur and cleanup consume the operation. A repeat without an observed start is denied. Number's existing up/down buttons are observed through its existing `wrapperProps`, using the installed buttons' `data-direction`; leaving a control consumes the hold. Direct number input events have an explicit separate start path. Native timers and control implementations are not patched or replaced.

Slider starts are observed on its existing `InputWrapper`, before Mantine's track handlers. Its existing mouse/touch move implementation samples through `requestAnimationFrame`; release retains the ending origin through one frame to drain that already-scheduled final sample, then consumes that exact operation. A new start cannot be consumed by the preceding operation's frame, and cancellation/cleanup deny immediately. This bounded end drain still requires focused coordinator review; it is not measured runtime evidence.

The small dropdown hook is located in the allocated select module and reused by MultiSelect. Opening retains the originating owner and guarded original change continuation, including an already observed direct input start. A refreshed handler must pass both its render capture and the retained origin. Closing consumes the continuation and retains a closed tombstone: late selection/clear cannot fall back to today's render owner. A genuine pointer/key/focus/input start outside an active dropdown establishes an explicit direct operation; dropdown search input cannot refresh a retired opening origin. An option submission without an active dropdown is denied rather than capturing an owner at selection time. Private Mantine search/index state is not a replacement authorization boundary; actual form writes remain guarded independently of DOM event capture.

## Verified installed surface

`packages/widgets/package.json` already declares React, `@mantine/core` and `@mantine/hooks`. Installed core is **9.6.0**. Read-only inspection covered installed `Slider`, `NumberInput`, `Select`, `MultiSelect`, `Combobox`, `ComboboxClearButton`, `useMove`, `useWindowEvent`, their declarations and Mantine form's real `getInputProps` declaration.

- Slider exposes `onChangeEnd`, not `onChangeStart`; installed keyboard handlers invoke `onChangeEnd` on every arrow/Home/End change. That callback therefore does not end a keyboard hold.
- Installed `useMove` uses native mouse/touch starts, document move/end listeners and frame-sampled changes. Starts are observed on the existing ancestor instead of inventing a Slider API.
- Number uses existing pointer up/leave to stop its optional hold loop and refreshes increment/decrement continuations internally. The form write gate therefore retains the initiating operation independently of refreshed handlers.
- Select/MultiSelect expose the actual dropdown open/close and option-submit callbacks; their change callbacks are invoked before Select closes its dropdown. Select's second change argument is forwarded, not dropped.
- `useWindowEvent` supplies the existing event-subscription primitive; end/cancel/key-release observations use capture listeners so a stopped bubbling event cannot strand an operation.

Context7 lookup returned the quota-exhausted response. Official documentation was then read at `https://mantine.dev/core/slider/`, `https://mantine.dev/core/number-input/` and `https://mantine.dev/core/select/`; those pages currently identify 9.7.2. Installed 9.6.0 declarations/source were authoritative for the implementation-specific behavior above.

## Remaining required joins and review

WG0's required hook/provider exists at readback. Its missing-provider behavior throws; WG1 adds no default-true or optional owner. The two genuine host provider joins and upstream admission/authority/presentation retirement remain outside this allocation. Irreversible producer retirement must cover disable/re-enable even when no old callback is invoked during the denied interval; local sampled Boolean checks cannot establish that producer guarantee.

Coordinator-owned focused lint/types and relevant existing verification remain required after writers freeze. Review must include slider final-frame drain, pointer/key cancellation and release outside the control, optional NumberInput hold repeats using refreshed handlers, retained dropdown selection/clear across retirement and close, missing-provider fail-closed behavior, field identity changes, unmount/remount and legitimate new interactions. Mantine-owned timer/search/index behavior was inspected, not executed or certified. The other three original controls and all nine holds still require their separately allocated writers and genuine host review.
