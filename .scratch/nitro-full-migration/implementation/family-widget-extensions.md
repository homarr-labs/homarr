# Extensions presentation extraction

Lease: `FAMILY-PRODUCER-LEASES.md` amended Widget source views scope; frozen evidence: `stack-audit/A05.md`, `stack-audit/A13.md`. Presentation preparation only. Assistant and customApi remain held; no operational renderer or mounting claim.

## Exact writable paths enumerated before source edits

- `packages/widgets/src/assistant/component.tsx`
- `packages/widgets/src/assistant/native-view.tsx` (new)
- `packages/widgets/src/custom-api/component.tsx`
- `packages/widgets/src/custom-api/custom-jsx-display.tsx`
- `packages/widgets/src/custom-api/native-view.tsx` (new)
- `packages/widgets/src/custom-api/native-view-custom-jsx.tsx` (new)
- `packages/widgets/src/rendering/extensions.ts` (new)
- `.scratch/nitro-full-migration/implementation/family-widget-extensions.md` (new)

No existing kind-local descendants beyond the three leased source wrappers are writable in this implementation. Other helpers, definitions/options/schemas, providers, runtime, registry, manifests, package/source exports and `apps/nitro` Assistant feature remain read-only.

## Intended source cuts

- Assistant: move only the existing unavailable presentation from `assistant/component.tsx:17–31`; retain renderer-context lookup and localization in the original wrapper. This is unavailable UI, not Assistant support.
- Custom API: move `custom-api/component.tsx:106–133` unavailable/error layout into an adjacent view. Keep original navigation button creation and `zoomCompensatedSize(32)` in the wrapper; pass the exact action node and icon style. Preserve removal button behavior in the view. All data queries, permission-sensitive display decisions and refresh/retry policy remain in the wrapper.
- Custom JSX: move renderer presentation composition from `custom-api/custom-jsx-display.tsx:72–88`, including published data/status overlays, into an adjacent view. Require the original real `CustomJsxRenderer` as an explicit component input typed by the existing `CustomJsxRendererProps`; do not import runtime values into the pure leaf. Keep normalization, messages, components/bindings, identity scope/state publication and actual provider selection in the original wrapper.

## Validation constraints

No checks/lint/typecheck/build/install/tests/import execution, network/providers/SQL/browser, environment/credentials/appdata/listeners, Git mutations or nested agents. Context7 quota is exhausted; installed declarations and existing package source are the allowed API fallback. Final inventory, source origins, import closure and holds are frozen below.

## Frozen changed-file inventory and source origins

The eight writable paths above are the complete authored/changed inventory; there are no additional descendant edits or presentation type files.

| Changed path                                                               | Exact source origin and retained ownership                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/widgets/src/assistant/component.tsx`                             | Original lines 17–31 now delegate to the adjacent unavailable view. Original renderer lookup, translation scope and `<Renderer {...props} />` branch remain, now at lines 9–15.                                                                                                                                                                                                                         |
| `packages/widgets/src/assistant/native-view.tsx`                           | New lines 12–26 move original Assistant lines 17–31. Only localized title/description become props; exact Center/Stack/ThemeIcon/Text/IconRobot presentation is retained.                                                                                                                                                                                                                               |
| `packages/widgets/src/custom-api/component.tsx`                            | Original lines 1–105 retain Next dynamic loading (`ssr:false`), source Auth/tRPC/demo acquisition, data handling, translations, refresh/retry/error branching and local Unavailable arguments. Current lines 106–123 delegate presentation while retaining exact `zoomCompensatedSize(32)` and conditional Mantine Button/Link creation with `/manage/custom-widgets` supplied by the unchanged branch. |
| `packages/widgets/src/custom-api/native-view.tsx`                          | New lines 26–46 move original Custom API lines 106–133, except the original navigation button is passed as `action` and original zoom style as `iconStyle`. Center/Stack dimensions/gaps, alert color, messages, supplementary-message predicate, removal predicate/button styles and callback are unchanged.                                                                                           |
| `packages/widgets/src/custom-api/custom-jsx-display.tsx`                   | Original renderer composition at lines 72–88 now delegates at current lines 73–89. The same real source `CustomJsxRenderer`, template coercion, normalized base data/status/options, component map, SAFE_BINDINGS and message callbacks are supplied. All original identity/publication/provider logic and status comparison remain.                                                                    |
| `packages/widgets/src/custom-api/native-view-custom-jsx.tsx`               | New lines 25–35 move the renderer invocation and exact Object.entries/Object.fromEntries published data/status overlay expressions from original Custom JSX lines 73–88. Published values still override base values. No schema, interpreter, component map, provider, runtime port or execution substitute is defined.                                                                                 |
| `packages/widgets/src/rendering/extensions.ts`                             | New six-line source-only barrel exports the three presentation components and their prop types. No wrapper, provider, widget definition or runtime value export. No package export was added or accepted.                                                                                                                                                                                               |
| `.scratch/nitro-full-migration/implementation/family-widget-extensions.md` | New lease enumeration and this frozen handoff only.                                                                                                                                                                                                                                                                                                                                                     |

Line origins refer to the full source reads before this lease's edits, not a claimed Git commit identity. Original JSX was moved and wrappers reuse it; no second Assistant feature or Custom JSX interpreter was ported.

## Frozen pure import closure

Repository **runtime import** closure of `packages/widgets/src/rendering/extensions.ts`:

1. `assistant/native-view.tsx` → Mantine `Center`, `Stack`, `Text`, `ThemeIcon`; Tabler `IconRobot`; standard JSX runtime.
2. `custom-api/native-view.tsx` → Mantine `Button`, `Center`, `Stack`, `Text`; Tabler `IconAlertTriangle`; standard JSX runtime. React `CSSProperties`/`ReactNode` imports are type-only.
3. `custom-api/native-view-custom-jsx.tsx` → standard JSX runtime only. React `ComponentType` and `@homarr/custom-widgets/runtime` `CustomJsxRendererProps`/`CustomWidgetPublishedQueryState` imports are type-only. The runtime index's existing type exports resolve to `runtime/custom-jsx-renderer.tsx:15–29` and `runtime/types.ts:93–102`; their values are not imported by this leaf.

There is no repository runtime edge from this barrel to Next, tRPC/API, Auth, Boards, translation, UI navigation, definitions, shared query indicators, `jsx-components.ts`, `widget-definition-context.tsx`, Custom Widget runtime execution APIs or application features. Third-party Mantine/Tabler/React implementation internals were not recursively audited or executed; their existing theme/styles/runtime requirements are not claimed eliminated.

This is an **import-boundary** release, not proof that an arbitrary supplied subtree is pure. The required renderer prop in CustomJsxPresentation, optional action node and removal callback retain their external owners. In the actual original wrapper the renderer is exactly `@homarr/custom-widgets/runtime`'s real CustomJsxRenderer, not a new component or permissive provider. Its interpreter/error/input lifetime graph remains the original `packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx` and `src/jsx/runtime-components.tsx`, including genuine context-dependent request/action components. The real runtime and component-map closure is not relabelled as a service-free extension renderer.

## Actual effects and services remain owned by source

- Assistant wrapper still acquires `useAssistantWidgetRenderer` from `assistant/context.tsx` and localized unavailable messages. The source here contains no chat, stream or action renderer; unavailable presentation is not support.
- Custom API wrapper still owns `getData({ itemId: itemId ?? "" })`, definition/item enablement, finite refresh default and minimum interval, demo/terminal-error polling retirement, retry limit, session-derived admin display, migration/error distinctions, loading/null states and exact item/definition/edit-mode augmentation. Display flags and removal callbacks prove no authority.
- Custom JSX wrapper retains `parseRequestCapabilities`, memoized localized copy component creation, stable binding-conflict translation, all four identity strings and their `\u001f` query scope, stale-scope clearing, publication reconciliation/deletion/data/status equality, option normalization and the unchanged inactive-versus-active provider choice. `previewLiveActions`, `queriesDisabled`, edit mode, cache key, capabilities and `setQueryState` retain their original values and boundaries.
- The untouched `widget-definition-context.tsx` owns actual item/preview query dispatch and cancellation signal, confirmed actions, preview refresh/load-result publication, scoped Query invalidation, parent getData invalidation, confirmation modals and success/error notifications. Its existing INACTIVE_PORT remains an unavailable state only; no new port/provider or fallback execution was introduced.
- No CSS or layout element was added/removed. Assistant font-size icon, Custom API board-zoom-compensated icon style, button ordering/Link destination and original Custom JSX renderer's isolated/error/warning layout are retained. Theme, Mantine styles and board CSS variable provisioning remain external requirements; visual parity is not browser-verified.

## Verified API/dependency fallback

Read-only `packages/widgets/package.json` confirms existing React, Mantine core, Tabler icons and `@homarr/custom-widgets` dependencies. `packages/custom-widgets/package.json` confirms the existing public `/runtime` and `/jsx` entries. No declaration or manifest edit/install was performed.

Installed declarations read: `node_modules/@mantine/core/lib/components/{Button,Center,Stack,Text,ThemeIcon}/*.d.ts`, `lib/core/Box/style-props/style-props.types.d.ts`, `node_modules/@types/react/index.d.ts` (ComponentType/CSSProperties) and `node_modules/@tabler/icons-react/dist/tabler-icons-react.d.ts` (IconProps and the two icons). These verify the already-used dimensions, spacing, alignment, text/icon/button variants, compact size, polymorphic Button and SVG style/size props. Source `CustomJsxRendererProps` and `CustomWidgetPublishedQueryState` are reused without casts or invented data/schema contracts. No new comments, `any`, unsafe casts, tests or dependency APIs were added.

## Remaining explicit holds

- **Assistant:** missing accepted full widget renderer and its real stream/query/action/cancellation/authority producer. The separate `apps/nitro` Assistant feature was neither read as a dependency nor edited or ported. No operational Assistant renderer is released.
- **Custom API acquisition:** native equivalent of source getData enablement/polling/retry/error behavior, source migration classifier integration, real session/admin and demo policy, loading/error shared closure and browser-only lazy host remain separate producers.
- **Custom JSX rendering:** consumer must supply the original real renderer, canonical safe component map and bindings, genuine runtime provider/Query client, complete translations/theme/styles, scoped identities and publication lifecycle. The frozen `jsx-components.ts`/`jsx-icon-adapter.tsx` existing cast seams require their separate typed producer/review; this barrel deliberately does not import or export them. Required input registration, cleanup/reset, budget/error boundary behavior remains package-owned, not reimplemented here.
- **Execution/context resources:** missing accepted native bindings for item `queryRequest`, `executeAction`, `refresh`, getData invalidation and preview `previewQuery`, `previewAction`, `previewRefresh`, confirmation/notification and scoped Query invalidation/publication. Native configuration/preview management and secure token completion are not supplied by the presentation leaf.
- **Authority/physical producers:** retain A13 holds for current board/integration/user authority, transactional storage/codecs, PreviewSessionStore CAS/evidence/encrypted-secret lifetime, RequestLimitStore concurrency/rate admission/retirement, shared configuration-token lifecycle, trusted request/integration transport and Workshop resources. Capabilities, preview IDs, UI confirmations and edit-mode booleans are not grants; Q16/Q17/Q18 remain held.
- **Release:** independent review, central public export approval, actual native adapter composition, lint/typecheck and relevant native/runtime/browser validation remain pending after convergence. None were run under this lease. No frontend consumer/mount, acceptance-count change or two-operational-renderer claim.
