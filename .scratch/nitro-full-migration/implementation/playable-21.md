# PLAYABLE-WAVE32 lane 21

## Reopened review repair: exact write enumeration before edits

Review `ses_ed470bb52ffe6KlTAGJJQCgP7u` authorizes only:

- `apps/nitro/src/source-ui/assistant/assistant-panel-controls.tsx`
- `apps/nitro/src/source-ui/assistant/assistant-widget-tool.tsx`
- `apps/nitro/src/source-ui/assistant/assistant-board-settings-tool.tsx`
- `apps/nitro/src/source-ui/assistant/assistant-runtime-provider.tsx`
- `apps/nitro/src/source-ui/assistant/bindings.tsx`
- This handoff.

All other47-tree files, original Next, CSS, P6, dependencies, exports/manifests and root composition remain frozen. Repairs cover every source suggestion send path, initiating tool/surface/conversation leases, rejected/obsolete retained reads, actual board identity, boundary-local focus registries and a genuine native Widget definition/options seam. Fresh physical-copy validation will retain raw stdout/stderr, exits and hashes; previous no-owned-diagnostic shorthand is not acceptance or substitute evidence.

## Reopened repair return — frozen candidate for independent review

Only the five enumerated source files and this handoff changed. Hash comparison against the original physical47-path snapshot verifies the other42 paths, including both CSS files and both barrels, unchanged. No P6/shared source, declaration, root, provider, backend, Widget runtime or Next source was written. No children, Git operations, tests, installs, builds, runtime launches, SQL or provider/native LLM calls occurred.

### Concrete corrections

- `assistant-panel-controls.tsx`: all eight suggestion controls use the same retained `ThreadPrimitive.Suggestion` wrapper. All four compact sends require a genuine available send action, a selected/non-loading provider, the original Homarr sign-in/quota check and no current pending human action. The click handler checks live action/AbortSignal and runtime pending-action state before the SDK callback can append. A newly held send prevents that callback and writes only the suggested draft; noncompact suggestions remain draft-only. Original buttons, prompts, icons, classes and native append/runConfig/queue behavior remain.
- `assistant-runtime-provider.tsx`: surface elements, last-focus element/time and queued focus restoration belong to a registry created for the actual `AssistantRuntimeProviderWithTools` boundary/runtime, not a module-global map/key. Original focus/scroll algorithm remains; cleanup clears retired surface/focus references and invalidates queued restoration. Tool-owner leases subscribe to the genuine runtime's main item/thread and check the initiating conversation, message, unresolved toolCallId, argument identity, surface lifetime and live scope signal. Retirement is sticky within that lease. Acquired callback guards capture a generation, so unmount, scope abort, conversation/tool retirement, resource/readiness changes or effect retirement cannot resurrect an old modal callback.
- `assistant-widget-tool.tsx`: editor and integration-modal continuations acquire the initiating lease, including the entire integration-to-editor chain. Late callbacks cannot add a result or open the next modal after retirement; duplicate successful callbacks are ignored. A newly created integration must still have actual use access and a supported kind. Auto-readiness and execution reject pending/error/unavailable or mismatched-owner retained integration data, and reject a definition adapter returned for another Widget kind.
- `assistant-board-settings-tool.tsx`: auto-readiness, execution and form callbacks require current non-pending/non-error/non-unavailable read evidence and the actual returned `settings.data.id === args.boardId`. Invalid/obsolete retained data is held instead of accepted. Form identity follows the initiating conversation/tool/board/proposal, avoiding retained form values across a different review. Original four-tab form and result-diff behavior remain.
- `bindings.tsx`: action getters consult the current action record and live AbortSignal/readOnly state. `AssistantSourceReadOwner` ties reads to the actual scope key/conversation/tool call; `isAssistantSourceReadCurrent` rejects absent/mismatched owner evidence, pending/error/unavailable reads, even when data is retained. `AssistantWidgetDefinition` now preserves required native `createOptions`. `bindAssistantWidgetDefinition<TDefinition>` captures the full genuine definition, passing that exact typed object to the native reducer/modal via bound operations; no reduced structural definition is passed back to the native manifest reducer, cast or substitute renderer.

### Binding/API changes and still-held joins

Read hooks now receive `options.owner: { scopeKey, conversationId, toolCallId }`. Their `AssistantSourceRead.owner` must identify the result's actual acquisition owner: never relabel retained/placeholder/obsolete data with the new caller's owner. Missing evidence renders held. Board data must also match the requested actual ID. These fields describe provenance, not authenticated authority or manually invented Query keys; genuine generated Query/resource bindings remain the integrator's responsibility.

Widget `resources.loadDefinition(kind)` now returns `Promise<AssistantWidgetDefinitionAdapter>`. Bind a frozen actual native definition using `bindAssistantWidgetDefinition(kind, definition, { reduceOptions, openWidgetModal })`; the supplied operations must be the original native reducer/modal, with the actual full definition type preserved. Global resource-level `reduceOptions`/`openWidgetModal` were replaced by these definition-bound operations. `openIntegrationModal` remains on available resources. If the genuine definition/reduction/modal seam is unavailable, supply `{ kind: "held", reason }`; do not activate a fake reducer or fallback editor.

The new adapter/read-owner helpers and their types are exported directly from `apps/nitro/src/source-ui/assistant/bindings.tsx`; tool-owner hooks are exported directly from `assistant-runtime-provider.tsx`. The frozen source barrel was **not** changed to re-export these additions. Existing direct rich entrypoints and props remain as described below;01 alone owns package declarations/exports and integration. Native full-definition/modal assignability in the eventual producer join has not been compiled here by importing active Widget/editor peers; that join remains held until the genuine frozen producer is bound and checked.

### Accepted P6 consumption, not shared-source repair

User steering releases only the exact source accepted by independent reviewer `ses_ed462b6ecffeN6AsyStSgovFSe`: `packages/ui/src/source-views/assistant-workshop/assistant-dot-matrix.tsx`, SHA256 `4519750cfdaa65bcccdc0a4c0db01700d8084d2ddfea878cc71af1e69340d312`. The new closure verifies and physically copies those bytes. Prior compiled/check snapshots were not patched. Existing copied P6 contracts/CSS and dependency fingerprints remain unchanged. The old TS2353 is historical and is absent in the new actual rich-source check; this does not admit the P6 public subpath or root/native/full Assistant composition.01 receives the existing subpath declaration request independently.

### Actual raw immutable checks

Final evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable21-review-repair-final/`.

`source/` is a new physical copy, read-only before either check, with no source/dependency symlinks. It contains all47 owned code/style paths, frozen common/definitions/validation/UI leaves, exact accepted P6 bytes and copied installed dependencies/tool executables. The check uses explicit Node24.18.0, TypeScript7.0.2 and oxlint1.73.0. Inherited environment is empty; only explicit PATH and sibling disposable HOME/TMPDIR are supplied. Every closure file's SHA is checked unchanged after execution, and all47 live owned hashes still match the checked snapshot. No emit/incremental cache or protected output is used.

| Check   | Actual exit/result                                                                                                | Raw stdout SHA256                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `lint`  | **0**,0 warnings/0 errors on all45 owned TS/TSX paths, including feature barrel                                   | `054bf7581812675d159c2a9e0d4cd47e540940391510f6b12d2e1a4e24bed5a3` |
| `types` | **0**, empty stdout/stderr for the entire direct rich source tree plus `rich.tsx` and its frozen consumed closure | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Actual raw files exist at that root: `lint.stdout.log`, `lint.stderr.log`, `lint.exit`, `types.stdout.log`, `types.stderr.log`, `types.exit`, `check-results.json`, `closure-before.json`, `artifact-hashes.json`. Both stderr logs are empty with the empty SHA above. Exit files contain `0` plus newline, SHA `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`. `check-results.json` records exact commands, environment, exits and log hashes (SHA `9d0dc6e3f37c0feea4908cbff9ad90249b226d753cd5b3da51e512842a3d3eaa`). `closure-before.json` records every physical file (SHA `432bbc2cf93f180a2036fd395cd666c7fd8d4b6d67cb653b04794d55feab5948`).

Type coverage is explicit: all43 source-ui TS/TSX leaves plus `features/assistant/rich.tsx`; two CSS files are copied and declarations resolve their imports. The unchanged `features/assistant/index.ts` is linted/hashed, but its untouched legacy private backend graph is **not** in this type closure. Whole-feature-barrel/native/full-app type acceptance remains held; the scoped exit0 is not a claim for that excluded graph.

Earlier actual attempts remain separately retained, not overwritten or called passing: sibling `playable21-review-repair-a` has lint exit1 (copied oxlint absent) and types exit1 (copied TypeScript native executable absent), both with raw stderr. `playable21-review-repair-b` physically adds the installed tools and records lint exit0 with **7 warnings**, types exit1 with exactly old frozen P6 TS2353. `playable21-review-repair-c` records corrected lint0/types0 and the accepted P6, then supplies the frozen read-only source for the final run. Every attempt retains its actual stdout/stderr/exit/hash metadata.

### Repaired source freeze hashes

Basenames below are under `apps/nitro/src/source-ui/assistant/`:

| File                                | SHA256                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `assistant-panel-controls.tsx`      | `6f949e6aa08035d1bd2336d62444e40570bb96b86d93c3d7ea3d44866c1ad33a` |
| `assistant-widget-tool.tsx`         | `e2a289fe5269e3718de5b251bb3f4a6c9c2acf3773f80b280207ef15bfc0e5b9` |
| `assistant-board-settings-tool.tsx` | `0f6ccbcdb2043c16a85ddc575e0a0cf682b4ba6d548f9d080bad0479cb691a0d` |
| `assistant-runtime-provider.tsx`    | `abdf8dce63f480f81191253199f464d2b412967bd094fa1e8a5e85e15cbe3ef8` |
| `bindings.tsx`                      | `a840002169aba596dcbe3ec457ed06426f7f24921fe699f30193765dd0d534e1` |

Final `source/owned-source-inventory.json` covers all47 paths (SHA `32ae6b34cd71e8d7b9db87709c5f4fae7e0df00eb41b08b489abbe0b4b77a39d`). `source/changed-source-hashes.json` records before/after for exactly five paths. Complete unnormalized `source/repair.diff` has SHA `6acb499f50455dac5ca015266a7664d3992897785a24cd57b34bfa17d39c925d`. No source edits follow this freeze. This is a source/static candidate for independent review, not demonstrated modal/race/focus behavior, native runtime/browser acceptance or authority to enable held actions.

## Enumerated writes before implementation

Only these paths are leased for this implementation:

- `apps/nitro/src/features/assistant/index.ts`
- `apps/nitro/src/features/assistant/rich.tsx`
- `apps/nitro/src/source-ui/assistant/index.ts`
- `apps/nitro/src/source-ui/assistant/bindings.tsx`
- `apps/nitro/src/source-ui/assistant/escape.ts`
- `apps/nitro/src/source-ui/assistant/assistant-board-settings.ts`
- `apps/nitro/src/source-ui/assistant/assistant-board-settings-tool.tsx`
- `apps/nitro/src/source-ui/assistant/assistant-widget-tool.tsx`
- `apps/nitro/src/source-ui/assistant/assistant-{activity-state,ask-user,auto-approval,automatic-action-progress,composer,composer-triggers,context,conversation-context,conversation-controls,conversation-export,directives,history,human-tools,human-tool-status,image,markdown,markdown-directives,markdown-image,message-content,message-grouping,message-metadata,panel,panel-controls,pending-action,preferences,provider-quota,question-portal,reasoning-state,runtime-controls,runtime-provider,tool-contracts,tool-label,tool-rendering,tool-result,tool-trace,trigger-scroll,url}.{ts,tsx}`: each exact matching original basename (not both extensions).
- `apps/nitro/src/source-ui/assistant/assistant-panel.module.css`
- `apps/nitro/src/source-ui/assistant/assistant-image.module.css`
- This handoff.

Original `apps/nextjs/src/components/assistant/` is read-only. Accepted P6 `AssistantDotMatrix` and its state contract are consumed; no re-extraction. No backend, providers lane25, Widget runtime lane20, routes or manifests are edited.

## Immediate dependency requests to 01

Rich source uses packages already declared by original Next, with installed versions verified: `@assistant-ui/react` 0.15.8, `@assistant-ui/react-lexical` 0.2.7, `@assistant-ui/react-markdown` 0.14.9, `ai` 7.0.56 (types only), `react-shiki` 0.11.0, `mermaid` 11.17.2, `remark-breaks` 4.0.0, `remark-directive` 3.0.1, `remark-gfm` 4.0.1. Admit these original-source declarations into Nitro before integrating the rich surface; no installs/manifests by 21.

Publish a narrow `@homarr/ui/source-views/assistant-workshop/assistant-dot-matrix` export to the accepted P6 leaf and `@homarr/ui/source-views/assistant-workshop/contracts` for types. No duplicate indicator source/CSS is planned. Human App configuration requires lane24's frozen original `AppForm`; until frozen, it is an injected original-form component, not an import of the active peer.

Additional narrow export: `@homarr/ui/inline-confirm-action` → existing `src/components/inline-confirm-action.tsx`. Board review retains the original schema and Mantine form: admit existing `@mantine/form` 9.6.0 and `react-error-boundary` 6.1.2 (installed pin must be rechecked). Board and Widget data/modal/definition joins are explicit injected bindings; no active lane19/20/24/25 imports.

## Implementation status

Frozen concrete implementation. Source transport/auth/navigation/notification dependencies are explicit injected bindings, never fake backend responses. The rich original assistant-ui runtime is supplied by the integrator; this lane makes no provider calls and does not create a new LLM transport. Missing actions render visibly unavailable.

### Historical producer blocker — superseded only for the accepted copied source

The original copied P6 `assistant-dot-matrix.tsx:223` failed installed TS7.0.2 with TS2353: `"--assistant-dot-matrix-hi"` was contextually checked against React SVG `style` (`CSSProperties`) despite inline `satisfies DotStyle`. The separately owned/reviewed typed-local repair is now copied by exact accepted SHA in the reopening above;21 never edited that leaf. Common's frozen `url.ts` has a type-only Next `ReadonlyHeaders` import; isolated checks require copied Next declarations, not a native runtime import. Public declarations/native composition remain held independently.

## Exact final files

`apps/nitro/src/source-ui/assistant/` contains these45 added files:

```text
assistant-activity-state.ts
assistant-ask-user.ts
assistant-auto-approval.tsx
assistant-automatic-action-progress.tsx
assistant-board-settings-tool.tsx
assistant-board-settings.ts
assistant-composer-triggers.tsx
assistant-composer.tsx
assistant-context.tsx
assistant-conversation-context.tsx
assistant-conversation-controls.ts
assistant-conversation-export.ts
assistant-directives.ts
assistant-history.tsx
assistant-human-tool-status.ts
assistant-human-tools.tsx
assistant-image.module.css
assistant-image.tsx
assistant-markdown-directives.ts
assistant-markdown-image.ts
assistant-markdown.ts
assistant-message-content.tsx
assistant-message-grouping.ts
assistant-message-metadata.ts
assistant-panel-controls.tsx
assistant-panel.module.css
assistant-panel.tsx
assistant-pending-action.ts
assistant-preferences.ts
assistant-provider-quota.ts
assistant-question-portal.tsx
assistant-reasoning-state.ts
assistant-runtime-controls.tsx
assistant-runtime-provider.tsx
assistant-tool-contracts.ts
assistant-tool-label.ts
assistant-tool-rendering.tsx
assistant-tool-result.ts
assistant-tool-trace.ts
assistant-trigger-scroll.ts
assistant-url.ts
assistant-widget-tool.tsx
bindings.tsx
escape.ts
index.ts
```

Additionally: new `apps/nitro/src/features/assistant/rich.tsx`, additive rich exports in existing `apps/nitro/src/features/assistant/index.ts`, and this handoff.47 code/style paths,48 including handoff. No original Next, P6, other feature controller, shared package body, route, manifest, backend or lock edits.

## Original source mapping and retained behavior

Every `assistant-*` basename above maps directly to the identical basename in read-only `apps/nextjs/src/components/assistant/`. `escape.ts` maps to `apps/nextjs/src/components/board/advanced-focus/escape.ts`. `bindings.tsx`, source `index.ts` and feature `rich.tsx` are the bounded framework/resource seams. `AssistantDotMatrix` and state types import only accepted P6 via its requested narrow export; its source/CSS are not copied again.

- Original assistant-ui primitives and Mantine/CSS trees retained: full floating dialog/activity bar, compact/full conversation surface, message grouping/reasoning, quotations and selection toolbar, branch navigation, edit/copy/regenerate/feedback/speech/message Markdown export, error retry and scroll-to-latest/reduced-motion behavior.
- Original Lexical editor, source @mention entities/category popovers, slash commands, attachments/paste/dropzone/previews, quote dismissal, grouped/searchable models, reasoning control, provider quota/usage/context views remain. The original SDK executes Enter directly through `aui.composer.send()`, bypassing form submission; source `submitMode` and capture gating now block pending-action/provider/access-unavailable sends as well as the original form/button gates. Shift+Enter drafting remains available.
- Original structured question options/Other, auto-approval tracker with two attempts and five-second retry, explicit approval/deny and source tool result collections/properties/icons/navigation/diagnostics remain. App form renders the injected frozen original `AppForm`, never a substitute. Board review retains original schema, all four tabs, color/background/general fields, CSS editor/warnings/copy/restore/reset, and differential result semantics. Underlying Mantine form/resolver is the same standard schema mechanism; optional injected original localized validator preserves localized error copy.
- Widget review retains source definition Suspense/error/reset branches, source integration-use filtering, requested/max integration selection, native options reduction callback, source editor/integration modal arguments, no-compatible-integration warning/skip and genuine human results. Definition loading, settings, principal permission and modal implementations are injected; missing resources show an explicit held Alert rather than loading/empty success. Modal callbacks/approval callbacks are abort-checked before adding a real result.
- Original searchable/compact history,72-character rename, native rename/delete primitives and frozen inline-confirm control remain. Conversation export reads only the supplied actual stored conversation, checks its ID, and preserves original redaction, parts/metadata/tool diagnostics, filenames, Blob download and URL revocation. Abort/unmount suppress stale exports/notifications/state updates.
- Original per-surface composer isolation, five attachment limit,12-entry inactive LRU, thread/composer subscriptions, draft/attachment/quote/runConfig carryover, cleanup/disposal, speech stop, paste errors and initiating-surface focus/scroll preservation remain. Unsafe assertions were replaced by checked structural assignments/typed collectors/actual union lookup; no `any`, new tests or code comments.
- Scope key remounts and abort subscription unmount the native surface on revocation. Action availability is read through a live AbortSignal getter, not a stale boolean closure. Read-only users retain declared export/refresh/quota reads; mutation/human-result/model/send/attachment actions stay disabled. A missing action declaration always means unavailable, never permission. Backend settlement/authentication/run cancellation still belong to the genuine supplied runtime/controller.

Source panel and image CSS are byte-identical to originals after final edits:

- Panel CSS SHA256 `a5dfa041111dc6a4b8928897022a49e9bd6705b01d5c87fe9d367cd57773e5b3`.
- Image CSS SHA256 `9b2183499fb65b067443055688affd517211c053d00ab8d6e470b208eb17cda9`.

## Mountable exports / props for01

Import `AssistantRichBoundary`, `AssistantRichConversation`, `AssistantRichPanel` from `apps/nitro/src/features/assistant/rich.tsx` (also additively exported by the existing feature barrel). Use the direct rich module to avoid eagerly admitting the old simplified feature graph. The existing `AssistantChat`/Drawer exports and their controllers are untouched and are **not** the rich migration target or a permitted fallback for the new mount.

`AssistantRichBoundary` takes `{ binding, children }`:

- `{ kind: "held", reason }` renders visibly unavailable without a runtime, query, session, fabricated message or provider call.
- `{ kind: "available", runtime: AssistantRuntime, toolkit: Toolkit, bindings: AssistantSourceBindings, preferences: AssistantPreferencesContextValue }` consumes an actual externally owned runtime. Toolkit registration is original `Tools({ toolkit })`; no model/client/LLM is created. Parent must bind the actual principal's scope key/signal/readOnly and revoke/cancel/settle its runtime on access loss. Never manufacture an authenticated identity or successful stream adapter to mount it.

`AssistantRichConversation` takes original `AssistantConversationSurfaceProps` plus required `surfaceId`. Those props retain `variant?: "widget" | "panel"`, real running/pending-action state, model/options/loading/reasoning, real refresh/model/reasoning callbacks, autofocus and optional expand/minimize/dismiss callbacks. `AssistantRichPanel` takes exact exported original `AssistantPanelProps` plus `surfaceId`: open/close/open-trigger/activity-dismissal/widget-presence, real unread/latest message/status/pending state and the same controls. Each wrapper adds the retained scoped composer provider/boundary. Scope lifetime includes the original conversation-derived auto-approval reset and one shared run-focus preserver.

Source barrel additionally exports original composer, source panel/surface, all four human tool renderers, tool result/approval renderer, browser tool schemas, pending-action detector, conversation/message Markdown builders/download/history, preferences context, runtime/lifetime adapters, and their named props/types. Native tool renderers are `AssistantAskUserTool`, `AssistantConfigureAppTool`, `AssistantConfigureBoardSettingsTool`, `AssistantConfigureWidgetTool`. Register them with original human/standalone toolkit entries; missing actions/resources are gated within each renderer.

Bindings require actual translations/locale/relative-time, Router-owned `push`/`prefetch`, frozen25 notifications, explicit action availability, real context entities, real generation telemetry/board/integration read hooks, and `{kind:"held",reason}` or actual Widget definition/options/settings/modal resources. Optional actual stored-conversation read and frozen24 AppForm renderer complete export/app review. The telemetry hook receives original six-read/1500ms polling bounds; use actual02 generated oRPC Query options/keys with principal-scoped signal, zero-retention/revocation semantics. No synthesized Query keys or fake read responses are implemented here. Hooks and resource binding identity must remain stable for a mounted scope; remount/revoke before changing principal or transport.

Routes are not installed by21. This release is mountable source for the global floating panel, a full Assistant conversation page and the accepted20 Assistant widget surface.01 owns earliest3210 admission; do not claim any of these live until they are actually mounted with accepted bindings. Missing backend stream/human action/provider/configuration grants stay held. Native navigation/media menu/refresh tool executors, upstream stream transport, mutation settlement and private auth/provider composition were not activated.

## Historical first-freeze validation — current raw results are above

Disposable check closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable21-check-a`. It contains physical copies of owned sources, frozen definitions/validation/common leaves, the exact P6/inline-confirm leaves and installed third-party dependencies; no source/dependency symlink/watch consumes active peers. No install, app build, provider/LLM call, tests, host process, credential/env-file read or protected output was used. Snapshot/config/hash inventories stay only there.

Node24.18.0 explicit executable and installed TypeScript7.0.2/oxlint1.73.0, `env -i`, private HOME/TMPDIR, `--noEmit --incremental false`. Focused lint includes all45 owned TS/TSX files, including the additive feature barrel: **0 warnings,0 errors**. Typecheck covers the rich source and its immutable consumed closure: **no owned diagnostics; one dependency diagnostic**, frozen P6 TS2353 above. Copied Next declarations resolved common's type-only `ReadonlyHeaders` edge. Full type-clean/integrated-runtime acceptance is therefore **held**, not claimed. The untouched legacy feature barrel's private backend graph was deliberately not expanded while peers own it; the new rich module/source exports themselves were checked.

That first freeze was subsequently reopened for exactly the five repairs above. Coordinator must admit the listed original-source declarations/exports, consume only the exact independently accepted P6 repair, bind only completed resource/navigation/provider returns, and perform integrated lint/types/browser/runtime/lifetime proof separately.
