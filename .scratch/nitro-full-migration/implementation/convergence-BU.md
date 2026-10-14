# Convergence BU — board widget owner producer and dormant composition

## Frozen scope

Changed only `apps/nitro/src/features/boards/contracts.ts`, `apps/nitro/src/features/boards/editor.tsx`, new `apps/nitro/src/features/boards/widget-composition.tsx`, and this report. Implements the BU allocation in convergence-WG 47–51 and 116. No commands, lint, typecheck, tests, runtime, provider access, publication, or release acceptance. Static-control release remains **0/9**.

## Producer

- `BoardWidgetEditorInput` now requires `isCurrentOwner()` and `captureChangeOwner()`, plus the captured upstream request/query/authority/presentation lifetime. None has an optional or default-true fallback.
- `BoardWidgetEditorComposition` requires a genuine upstream producer and renderer together. `BoardEditorProps.widgetEditorComposition` replaces the old ownerless `renderWidgetEditor` callback. Absence means no widget editor, not an owner synthesized from ordinary query status, permission, or modal `opened`.
- A widget session captures the upstream owners before admission and retains its real widget/edit generations, baseline, existing item or source-generated reserved ID, and composition binding. Admission is checked again after ID reservation. Currentness joins the exact `activeWidgetEditor` session, irreversible session retirement, generations, baseline, item identity, mounted/live `canUpdate`, and all four captured upstream owners.
- Capturing a denied session returns a permanently denied capture. Old captures never fetch a replacement session or capture today's upstream owner. A failed currentness check retires the session irreversibly; committed permission, composition, baseline, or upstream lifetime loss also retires it.
- Replacement, close, finish, discard presentation, baseline cleanup, and unmount retire synchronously. A fresh actual opening creates a distinct session. Restored permission does not reactivate a retired one. Upstream producers must independently retire their captures at actual lifetime loss, including loss/restoration without a board render; this tranche does not fabricate those producers.
- `onApply` retains reserved-ID, existence/collision, administrator, validation, and original local-draft behavior, and now rechecks the same session inside the reducer continuation. Its void return is not a staging acknowledgement.

## Dormant widget composition

`createBoardWidgetEditorComposition` requires the real upstream owner and a real request assembler. `BoardWidgetComposition` forwards the board session's owner methods unchanged, captured `requestLifetime`, and `reservedItemId` to the actual AddWidget/WidgetEditor components. It preserves supplied request/client/query/definition/value/settings/integration/permission/binding/translation/presentation inputs, writer, and staging callback; it creates no client, query authority, writer, success result, or form baseline. Board/item/kind mismatches do not mount a consumer. Actual close retires the board session before forwarding the supplied close continuation.

`RequiredBoardWidgetEditorOwner` is the REQUIRED W-consumer interface exported from the new seam:

```ts
interface RequiredBoardWidgetEditorOwner {
  isCurrentOwner(): boolean;
  captureChangeOwner(): { isCurrent(): boolean };
  readonly requestLifetime: BoardWidgetEditorUpstreamCapture;
  readonly reservedItemId: string;
}
```

W owns its consumer files; none was changed here. The interface and forwarding do not prove that those consumers enforce the contract. AddWidget must preserve the reserved create ID rather than treating it as an existing configure item, join its actual definition/destination selection lifetime, and forward genuine owner/request captures. WidgetEditor must consume the owner, retain its actual value/definition/client/query/presentation binding, and enforce separately allocated static/resource/staging/integration boundaries.

## Activation dependencies and holds

The inspected board workspace uses ordinary `useQuery` and provides no genuine upstream capture or actual composition caller. It is unchanged. The new seam is unmounted and **DORMANT**; `boardWidgetCompositionHold` explicitly states the missing request/query/authority/presentation ownership and composition producer. No global capture or owner derived from query status was added.

Activation still requires an allocated, reviewed producer with irreversible request/query/authority/presentation retirement; a concrete caller assembling stable real request lifetimes; W's required consumer join and reserved-ID handling; and a genuine acknowledged local staging bridge. Existing `onApply` cannot be promoted to successful staging. Consumer-only committed permission observation cannot substitute for producer retirement across unrendered loss/restoration.

Board geometry, responsive layouts, local drafts, undo/redo, pristine baselines, validation, existing staging/saving holds, Mantine UI, and CSS remain in their original owners. Widget forms, translation behavior, and consumer UI were not rewritten. The existing whole-draft atomic persistence hold remains unchanged. No route, backend, authentication, DB, definition, shared manifest, or PU producer source was changed or used to invent authority.
