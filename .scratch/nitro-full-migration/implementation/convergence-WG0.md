# Convergence WG0 — frozen source owner seam

## Exact writes

- NEW `packages/widgets/src/_inputs/static-owner.tsx`.
- `packages/widgets/src/_inputs/static.ts`, exports only; all ten original input exports retained.
- `packages/widgets/src/modals/widget-edit-modal.tsx`.
- `apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx`, real action type import only; existing action forwarding unchanged.
- This new report.

## Frozen public contract

`CapturedStaticWidgetInputOwner` has `isCurrent(): boolean`. `StaticWidgetInputOwnerProviderProps` requires an already captured `owner` and `children`. `StaticWidgetInputOwnerProvider` and `useStaticWidgetInputOwner(kind, property)` are exported through the existing static entrypoint, including both public types.

The required context throws when absent. The hook owns only a field/mount lease, not form values, defaults, dirty state, list copies, resource observers or submission state. Committed kind/property/provider-owner replacement and effect cleanup retire the old lease permanently. Reconnect allocates a different lease and requests publication by state update. A preceding render captures null or its own old lease; it cannot adopt the subsequently published lease. Failed upstream currentness also permanently retires that local lease. No old `active` flag is restored.

## Source host join

The unchanged genuine form/provider remains the form owner. The source modal publishes a distinct captured static owner after its committed native presentation capture is admitted. Its binding includes kind, definition, initial value identity, board/item/app, settings and observed session/status/principal/permissions, not live form values or the fresh Mantine form/options object.

Committed binding/configure changes, native presentation retirement and mount cleanup retire the old local owner. Mount reconnect produces a fresh mount lease and fresh publication. Configure-denied static fields receive a denied owner; existing advanced-option submission and cancellation remain separate from that static configure gate.

Submission retains the rendered lease's native presentation and an exact mount/binding capture. Static input retirement and the synchronous submit lock precede the original form submit/validation dispatch. Embedded save continuations, final edit dispatch and close check the retained submission capture. Invalid or completed submission can subsequently publish a fresh input activation, never restore its predecessor.

Cancel retains a render-time native presentation/mount capture and retires static inputs before actual close. The existing native close-interceptor hook retires them before native close requests proceed. Opening the existing integration modal also retires them before dispatch. Preview option writes reject a retired static capture.

The lazy wrapper imports the existing `ModalActions` declaration and continues passing the existing actions unchanged. The declaration is not exported by `@homarr/modals`' current public barrel, so the type-only import names the actual source file through a relative path. No barrel or manifest was widened under this allocation. A public export, if desired, requires its own producer allocation/review.

## Required holds and handoff

All nine original-control holds remain. WG simple/list writers must use this frozen required hook/type at their actual callback and retained-interaction boundaries; this report grants no release.

Both source and target host joins require independent review, together with the actual U/A upstream producer. `useSession` is an observation, not an irreversible authenticated authority producer. No auth epoch, deadline, permission producer or request/query authority has been fabricated. Authenticated retirement without a consumer render is still an explicit missing-producer hold. Native modal capture is genuine presentation ownership only.

Target WidgetEditor/AddWidget and Board producer changes remain their separately allocated writers' work. Resource-backed integration creation/save continuations, advanced-field callbacks, complete private SSR/hydration, mounting, native/procedure acceptance and publication remain outside this static seam. In particular, the existing integration-created callback's form update is not claimed as a newly certified resource continuation.

No `_inputs/form.ts`, common input props, input registry, option definitions, CSS, manifest, lockfile, board source or other writer-owned source was edited. No commands, lint/typecheck, tests, builds, runtime/native/SQL execution, installations, nested agents, Git mutations, credentials or data access were performed. Coordinator-owned focused lint/types and independent source review remain required; no compiler/runtime acceptance is asserted.
