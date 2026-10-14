# WG1 P2 — synchronous slider keyboard lane

## Frozen scope

This renewal writes only `packages/widgets/src/_inputs/widget-slider-input.tsx` and this new report. The permitted `widget-number-input.tsx` remains unchanged. All previous reports remain immutable. No other source, host, form, ownership, registry, manifest, theme, library or styles files were written.

The confirmed slider finding is the released pointer's pending Mantine frame adopting a subsequently started keyboard operation through the refreshed gesture ref. The bounded amendment follows the approved Oracle scope `ses_ecf2e7003ffedxVVw78aoOetpd`; it does not extend that finding into a currently enabled NumberInput hold defect.

## Actual source amendment

- The existing static gesture helper accepts a slider-only synchronous-keyboard requirement, defaulting to false. The existing NumberInput call therefore retains its previous behavior without a body edit.
- The existing slider ancestor's keydown capture establishes a dispatch object containing the actual native keyboard event and the exact retained keyboard operation. Mantine's installed keydown capture invokes its value callback synchronously inside this ancestor dispatch.
- A repeat reuses the original operation, owner and change continuation; only its bounded dispatch object is refreshed. It does not obtain a new owner or callback.
- The same ancestor's keydown bubble exits the matching native-event dispatch. A microtask additionally clears only the exact dispatch object that scheduled it, covering stopped bubbling without an older cleanup clearing a newer dispatch. Cancellation and unmount also clear the scope.
- In slider mode, the keyboard branch of `onChange` requires `keyboardDispatch.current.operation === operation`, in addition to the unchanged captured-owner checks. Outside a live dispatch, a pending asynchronous pointer sample cannot call the keyboard operation's original continuation.
- Starting a new keyboard operation replaces the ending pointer operation. Its old frame cleanup still compares exact operation identity and cannot consume the replacement keyboard gesture. Without a new gesture, the original pointer operation and its final-frame drain remain unchanged.

The original callback arguments/returns, continuous writes, form ownership guards, range, step, wrapper, focus/blur callbacks and Mantine props/styles are preserved. No `onChangeStart` API, timer API, synthetic pointer event, library patch or replacement control was introduced.

## NumberInput remains conditional and unresolved

Installed Mantine enables its timer hold loop only when both `stepHoldDelay` and `stepHoldInterval` are supplied. The current NumberInput body supplies neither; read-only searches found neither hold prop in `packages/widgets/src`, `packages/ui` or `apps/nitro/src`. The target widget editor's actual `enhanceGetInputProps` supplies `disabled` and a guarded `onChange`, not hold configuration. This corroborates the approved finding's conditional status; it does not prove all possible external/custom configurations are absent.

The generic enabled-hold configuration remains unresolved: if both supported hold props are supplied by another configuration, a surviving old timer must not adopt a later direct/keyboard origin. This amendment neither disables such theme functionality nor certifies that case. Installed stepping calls `setValue` before its `onValueChange` source notification, so that notification alone is not an established independent pre-write origin guard. No small supported-API guard preserving callback timing/returns was established in this bounded readback, and no speculative NumberInput implementation was added.

## Review and remaining holds

No commands, lint/typecheck, tests, builds, runtime execution or nested agents were performed. Source inspection is not functional certification. Independent review and coordinator-owned focused verification remain required for released pointer → new keyboard → old frame, legitimate keyboard values/repeats, stopped bubbling and identity-safe cleanup, and final pointer-frame preservation when no new gesture starts.

Release remains **0/9**. Genuine host/authority/presentation ownership review and the unresolved generic enabled-hold configuration are not cleared by this source patch. No compiler, runtime, procedure or activation acceptance is claimed.
