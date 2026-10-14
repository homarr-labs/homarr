# PLAYABLE-WAVE32 lane19 — pre-edit inventory

Exclusive source destinations, enumerated before edits:

- `apps/nitro/src/source-ui/widgets-editor/workbench-context.tsx`
- `apps/nitro/src/source-ui/widgets-editor/code-editor.tsx`
- `apps/nitro/src/source-ui/widgets-editor/form-utils.ts`
- `apps/nitro/src/source-ui/widgets-editor/source-dependencies.ts`
- `apps/nitro/src/source-ui/widgets-editor/rename-handlers.ts`
- `apps/nitro/src/source-ui/widgets-editor/form-analysis.ts`
- `apps/nitro/src/source-ui/widgets-editor/identifier-input.tsx`
- `apps/nitro/src/source-ui/widgets-editor/option-fields.tsx`
- `apps/nitro/src/source-ui/widgets-editor/options-editor.tsx`
- `apps/nitro/src/source-ui/widgets-editor/request-value-editors.tsx`
- `apps/nitro/src/source-ui/widgets-editor/requests-editor.tsx`
- `apps/nitro/src/source-ui/widgets-editor/source-field.tsx`
- `apps/nitro/src/source-ui/widgets-editor/sources-editor.tsx`
- `apps/nitro/src/source-ui/widgets-editor/integration-source-select.tsx`
- `apps/nitro/src/source-ui/widgets-editor/structured-workbench.tsx`
- `apps/nitro/src/source-ui/widgets-editor/index.ts`

Exclusive existing controller edits:

- `apps/nitro/src/features/widgets-editor/contracts.ts`
- `apps/nitro/src/features/widgets-editor/custom-widget-authoring.tsx`
- `apps/nitro/src/features/widgets-editor/custom-widget-preview.tsx`
- `apps/nitro/src/features/widgets-editor/widget-editor.tsx`
- `apps/nitro/src/features/widgets-editor/index.ts`

Read-only specification: `apps/nextjs/src/app/[locale]/manage/custom-widgets/` structured builder/controllers and `apps/nextjs/src/components/custom-widgets/{code-editor,integration-source-select}.tsx`; accepted P5 public `@homarr/ui/source-views/custom-workbench`; existing lane19 controllers/contracts. No runtime/schema rewrite, P5 duplicate, manifests/routes, package edits, tests, Git or children.

Implementation and frozen validation follow below.

Additional exact controller paths admitted before their edits, to remove remaining active raw-template fallback and gate unjoined writes:

- `apps/nitro/src/features/widgets-editor/custom-widget-template.tsx`
- `apps/nitro/src/features/widgets-editor/custom-widget-source-configuration.tsx`
- `apps/nitro/src/features/widgets-editor/custom-widget-definition-editor.tsx`
- `apps/nitro/src/features/widgets-editor/widget-secrets.tsx`
- `apps/nitro/src/features/widgets-editor/release-repositories.tsx`
- `apps/nitro/src/features/widgets-editor/save-options.tsx`
- `apps/nitro/src/features/widgets-editor/board-draft-apply.tsx`

Additional scoped check fixes, enumerated before edits:

- `apps/nitro/src/features/widgets-editor/layout-settings.tsx`
- `apps/nitro/src/features/widgets-editor/custom-widget-configuration.tsx`

Final query-consumer path admitted before edit: `apps/nitro/src/features/widgets-editor/add-widget.tsx`. Generated query utilities are supplied by the accepted host, not constructed with invented cache identities.

## Frozen implementation return

31 enumerated changed source paths: 16 new source-UI files and 15 existing feature files. The rest of the owned feature directory, including `validation.ts`, remains unchanged. No package, route, Next source, accepted P5 leaf, Widget renderer, board controller, shared collection, schema or runtime implementation was edited.

Frozen source digest: `bdd752f065fd347ab8fa60976a9b37eb0cb2afeaedbe784b51f361750e14ddbb`. SHA-256 input is the sorted enumerated changed paths, each encoded as `path + NUL + file bytes + NUL`. Source writes stop at this return.

### Concrete work

- Restored original structured source fields: HTTP/integration selection, permission-filtered integration type/items, URL policy feedback, preserved public/private/loopback scope, authentication choices, header/query names and separate password/username/API-key fields. Secrets never enter source JSON. Credential clearing remains unavailable without an explicit secure join; its configured marker changes only after the actual operation resolves.
- Restored original request builder: IDs, reference-preserving rename, query/action, HTTP method, source, trigger, permission, path, literal/option/manual-parameter query bindings, CodeMirror JSON bodies with reference insertion, confirmation, invalidation and authentication inheritance. Reorder/remove/add retain original behavior.
- Restored original option builder: controls, labels/descriptions, typed default editors, choices, numeric bounds/step, request-backed choice paths, advanced/group flags, reference-preserving rename and ordering.
- Retained actual shared CodeMirror editors, history, formatting, component insertion, starter template, completions, manifest/request/option schema references and JSX/request diagnostics. Invalid advanced drafts are displayed in editor diagnostics, not silently promoted to a valid manifest. Raw manifest editing is advanced/lazy, not a replacement for the structured controls.
- The source builder's getter-backed controlled form adapter preserves sequential source/request/secret updates without introducing a form/schema package clone. Draft parsing allows incomplete URL/name/header edits; unknown source entries are preserved when editing other sources rather than discarded.
- Existing authoring transport/generation controls remain responsible for native preview creation, four-way bounded load requests, stale response rejection, tested-preview persistence, errors, dirty baseline, secret clearing and discard. A real before-unload dirty guard was added. No preview session/result or persisted success is fabricated.
- Standard editors retain existing option fields, byte-unit conversion, integration selection and embedded-resource lifetime, sizes and advanced options. Custom configuration uses real CodeMirror for JSON again; icon/date/time consume explicit original-control bindings and remain visibly held when absent. Unjoined standard/board/options/template/secret/source saves are disabled and display an unavailable message.
- All server-backed reads changed here use supplied oRPC generated `queryOptions`/`queryKey`/`key`, including invalidation. The host must supply its real scoped `queryUtils`; this lane creates no principal/cache identity or transport client. The add-widget source-definition cache is local source-module loading, not an API request.

### Exact original source mapping

Base `N = apps/nextjs/src/app/[locale]/manage/custom-widgets/`:

| Destination under source-ui/widgets-editor | Read-only original                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `identifier-input.tsx`                     | `N/_custom-widget-identifier-input.tsx`: draft/blur/Enter/Escape lifetime                                                                                                                                                                                    |
| `option-fields.tsx`                        | `N/_custom-widget-option-fields.tsx`: default/choice/JSON editors and value coercion                                                                                                                                                                         |
| `options-editor.tsx`                       | `N/_custom-widget-options-editor.tsx`: original structured options tree and updates                                                                                                                                                                          |
| `request-value-editors.tsx`                | `N/_custom-widget-request-value-editors.tsx`: original literal/option/parameter controls and body insertion                                                                                                                                                  |
| `requests-editor.tsx`                      | `N/_custom-widget-requests-editor.tsx`: original request tree, action safety fields and ordering                                                                                                                                                             |
| `source-field.tsx`                         | `N/_custom-widget-source-field.tsx`: original source/auth/secret fields; runtime select and clear action become explicit bindings                                                                                                                            |
| `sources-editor.tsx`                       | `N/_custom-widget-sources-editor.tsx`: source updates/renames/auth filtering/dependent removal; original confirmation content in an owned Modal instead of Next modal glue                                                                                   |
| `source-dependencies.ts`                   | `N/_custom-widget-source-dependencies.ts`: unchanged dependency filtering algorithm                                                                                                                                                                          |
| `rename-handlers.ts`                       | `N/_custom-widget-rename-handlers.ts`: original canonical rename helpers/error paths                                                                                                                                                                         |
| `form-analysis.ts`                         | `N/_custom-widget-form-analysis.ts`: original completions/invalid-section projection                                                                                                                                                                         |
| `form-utils.ts`                            | `N/_custom-widget-form-utils.ts`: canonical build/apply/parse/auth-secret filtering; original unchecked cast replaced by draft-shape narrowing only                                                                                                          |
| `structured-workbench.tsx`                 | `N/_custom-widget-form-sections.tsx`, `_custom-widget-advanced-manifest.tsx`, `_custom-widget-form-references.ts`, `_custom-widget-form.tsx`: original structured sections, schema references, advanced manifest and pane selection                          |
| `code-editor.tsx`                          | `apps/nextjs/src/components/custom-widgets/code-editor.tsx`: original shared editor/message adapter; injected translator replaces Next translation context                                                                                                   |
| `integration-source-select.tsx`            | `apps/nextjs/src/components/custom-widgets/integration-source-select.tsx`: original type/item selection/full-access filtering; supplied observations replace tRPC hooks; installed Mantine v9 `renderOption` replaces the collection-specific select wrapper |
| `workbench-context.tsx`, `index.ts`        | Explicit local props/export glue for the above source bodies; no product/schema/runtime algorithms                                                                                                                                                           |

Standard reference reads: `packages/widgets/src/modals/widget-edit-modal.tsx`, `_inputs/widget-number-input.tsx`, `_inputs/widget-dynamic-select-input.tsx`, `_inputs/widget-custom-widget-configuration-input.tsx`; existing owned source controllers supply the rest. No original consumer was redirected or mutated.

Accepted P5 consumed through its admitted public export `@homarr/ui/source-views/custom-workbench`: `EditorSection`, `CustomWidgetSectionNavigation`, `LazyOnceAccordion`, `CustomWidgetSaveIssuesAlert`, `CustomWidgetPreviewSizeControl`. No P5 tree or stylesheet was copied again. Its SaveActions display leaf is not repurposed to imply secure save readiness.

## Mountable exports and host contracts

`apps/nitro/src/features/widgets-editor/index.ts` exports:

- `CustomWidgetAuthoring` + `CustomWidgetAuthoringProps`: real client, host `queryUtils`, original `domain`, `bindings`, resolved `t`, actual `isAdmin`, optional definition/initial values/integration observations/capabilities, recorded-success `onSaved` and dirty callback.
- `StructuredCustomWidgetWorkbench` + `StructuredCustomWidgetWorkbenchProps`: controlled `values`, `errors`, `onChange`, `onErrorsChange`, `onSectionSelect`, `disabled`, real shared `CodeEditor`, translator, supplied integration observations and optional secure clear/Picker. This presentation-only entry can mount without invoking transport.
- `CustomWidgetDefinitionEditor`, `CustomWidgetPreview`, `CustomWidgetTemplate`, `CustomWidgetSourceConfiguration` and their named `*Props` types; `WidgetEditor`/`WidgetEditorProps`, `AddWidget`, existing standard controls, and all contract types.
- `WidgetEditorQueryUtils = RouterUtils<WidgetEditorClient>`: supply the host's accepted principal/permission/board-scoped generated utility subtree. The owning QueryClient/provider must match the utility interceptors. Do not create a guessed identity to mount this feature.
- `WidgetEditorBindings` now admits original `IconPicker`, `DateInput`, `TimeInput` and `secretWritesAvailable` joins. Existing `SpecializedOption`, app/integration editors and native Preview remain explicit host joins, not locally replaced controls.

`apps/nitro/src/source-ui/widgets-editor/index.ts` additionally publishes structured source/request/option editors, shared CodeEditor adapter, default/choice/JSON controls, query/body controls, integration select and rename handlers, with the narrowed source-form contract.

`CustomWidgetEditorCapabilities` is host-supplied `{ preview, save, liveActions, clearSecret, unavailableReason }`; it is availability presentation, never authorization. All are unavailable when omitted. Set true only for an actually accepted secure service join, not merely because `isAdmin` is true. `saveAvailable`/`writesAvailable` similarly default off on standard template/options/secrets/source controllers. Original backend guards remain authoritative.

Route requests to01, no routes edited: Custom Widget create/edit workbench for `/manage/custom-widgets`, template/source dialogs, standard board add/configure widgets. Pure structured workbench can be composed now; native preview/persistence and standard specialized controls remain held until the corresponding frozen joins are accepted. No route is claimed mounted.

## Requests to01 and remaining joins

1. Resolve the concrete Zod mismatch: Nitro declares/installs `4.6.5`; existing workspace/widget schemas resolve catalog/installed `4.4.3`. Prefer the authoritative shared catalog version or coherently admit one version across the whole schema closure. This lane does not edit manifests/lock or cast incompatible schemas. `validation.ts` is untouched.
2. Continue using the already admitted P5 public export. If exact original workbench pane/action-bar CSS must be wired by the route host, publish `@homarr/ui/source-views/custom-workbench/styles` pointing at the frozen P5 CSS module, rather than copying it or deep-importing around exports. Current owned pane CSS is retained; exact original full-pane styling acceptance is not claimed.
3. Supply resolved Nitro unavailable-copy keys (or host fallback copy) and the actual source domain/settings/permissions. `nitro.widgetEditor.*` keys are existing controller requirements, not added translation catalog entries here.
4. Bind original IconPicker from completed24 and existing original date/time controls only after their frozen contracts are admitted. Optional direct date/time imports would require Nitro `@mantine/dates` catalog declaration; none was added or imported undeclared here. Other specialized standard option bindings remain held; no plain-text/textarea substitute was introduced.
5. Supply completed02 scoped generated query utilities/client and completed20 Preview/CustomJsxRenderer providers. This lane does not consume active02/20 implementations as accepted. Missing runtime/private secure joins remain visibly unavailable. Full original runtime/preview/provider parity is not claimed.

All newly used runtime libraries are already declared: React, Mantine core, Tabler, TanStack Query, oRPC TanStack utilities, Homarr common/definitions/custom-widgets/ui. Read package manifests and actual installed declarations: Mantine core9.6.0 Select controlled values/renderOption/absence of loading prop, Fieldset native disabled semantics; installed oRPC2.0.0-beta.43 generated option/key signatures; shared CustomWidgetCodeEditor props/source and existing workbench/core public exports. No Context7 quota request, install or dependency mutation.

## Focused immutable validation

Disposable closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane19-AUkL2D`. TypeScript import discovery captured 6,962 source/declaration/manifest reads into copied files; workspace export directories are physical copies, not links to active sources. Subsequent checks used this copied closure, refreshing only owned source before the final freeze. Captured unowned signatures are diagnostic observations, not acceptance of active peers.

- `env -i` with only HOME and `/usr/bin:/bin` PATH, explicit installed Node24.18.0; no dotenv, credentials, realdata, provider/network calls, listeners, Docker, builds, broad suites, new tests or Git actions.
- Focused installed oxlint1.73.0 `--deny-warnings` with copied repository config, both owned directories: **0 warnings, 0 errors, 34 files**.
- Installed TypeScript7.0.2 `--noEmit --incremental false`, strict copied config with owned includes: **not clean overall**. No diagnostic in any of the 31 changed paths or 16 new source views. The two owned diagnostics are unchanged `features/widgets-editor/validation.ts:14` TS2322/TS2345, specifically Zod4.6/4.4 internal-version incompatibility. Remaining copied dependency diagnostics concern unowned API/Widget/shared collection closures and snapshot-only root-manifest resolution. They were not repaired, hidden, treated as peer acceptance, or used to claim integrated type correctness.
- Complete diagnostic artifact: `lane19-AUkL2D/typecheck-final.txt` in the above disposable closure. Coordinator must rerun against its admitted coherent immutable closure after dependency/public-binding joins.

Disposition: concrete source implementation frozen and returned, lint clean; typecheck dependency-blocked, routes/native preview/persistence/integrated original parity held. No persisted success or production/runtime acceptance is claimed.

## P2 rereview — bounded reopening inventory

Reopened before edits only:

- `apps/nitro/src/source-ui/widgets-editor/form-utils.ts`
- `apps/nitro/src/source-ui/widgets-editor/sources-editor.tsx`
- This handoff.

The other 29 enumerated source paths remain frozen. Correct omitted HTTP authentication only in the presentation projection, preserve incomplete editable drafts/raw values, and choose add-source identifiers from raw source entries rather than the filtered display list. No schema/runtime/editor/P5/scoped-query/secure-hold changes are authorized by this reopening.

### P2 correction and frozen return

- `form-utils.ts`: `parseSources` projects omitted HTTP authentication as `none` before the existing editable-draft guard. Integration sources and explicitly supplied authentication remain unchanged. No schema parse is substituted for the draft guard; incomplete editable strings remain editable. The projection never writes form values; definition validation still consumes raw JSON.
- `sources-editor.tsx`: add-source captures `getSourceEntries()` once, selects identifiers and checks collisions against those raw entries, then retains every existing entry. `default` is selected only when the raw collection is empty, so an existing filtered-out `default` and its URL/network/auth values cannot be overwritten by the sample source.
- Structured P5 controls, source updates from raw entries, scoped query props and native hold guards are unchanged. No backend coercion, authorization override, runtime/schema redesign, tests, children or Git actions.

Isolated rereview closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane19-rereview-rh850g8a`. Physical copy of the previous immutable closure with only the two reopened sources refreshed; zero workspace symlinks. All 31 current source paths match the checked snapshot; the other 29 match the prior frozen baseline byte-for-byte. Unowned copied signatures remain diagnostic observations, not acceptance.

Checks ran with `env -i`, HOME and `/usr/bin:/bin` PATH only, explicit installed Node24.18.0 and the installed compiler/linter executables:

- oxlint1.73.0 `--deny-warnings -c .oxlintrc.json apps/nitro/src/source-ui/widgets-editor/form-utils.ts apps/nitro/src/source-ui/widgets-editor/sources-editor.tsx`: exit 0, **0 warnings, 0 errors, 2 files**. Complete raw output: `lint.raw.log` in the rereview closure.
- TypeScript7.0.2 `--noEmit --incremental false --project tsconfig.json`, copied strict config including both owned directories: exit 1, **123 diagnostics overall; none in either reopened file**. The only owned diagnostics remain unchanged `features/widgets-editor/validation.ts:14` TS2322/TS2345. Copied package manifests confirm Nitro Zod4.6.5 versus root/catalog Zod4.4.3. Remaining diagnostics are in copied unowned dependencies; no integrated typecheck success is claimed. Complete raw output: `types.raw.log` in the rereview closure.

SHA-256 evidence, source aggregate encoding remains sorted `path + NUL + file bytes + NUL`:

- All 31 frozen source paths: `a85be7482268dec34b9a3b35845245f9dc8f84afcdd7f3581568e6f6643da0c5`.
- Other 29 unchanged source paths: `f7a3594de839df5661763af4af006e58fccd8d6c65c02682a48025411aecba62`.
- Two reopened source paths: `62575f8c55a23bc8f34aa7b2ca2fefb99d77c75e66f2a30b91c4e7c7ccfad6cc`.
- `form-utils.ts`: `74d63fefaa3be9ae1a4723830fee551b7fd501daef1590cc0cb56d37514ccafe`.
- `sources-editor.tsx`: `3bd72dc90955f32f223b353c0bd23ec627ec32d7a34fc6369004cb96dee15e86`.
- `lint.raw.log`: `ff18ad041c0ad2a5f2d454d58b70dd07ccb0e3bd38e003186a41721d55381160`.
- `types.raw.log`: `3c0194648802fb6ae2ad5ecc0d5222aa84b04fa18a4eb965ed1419cbe2486c19`.

P2 source writes stopped and returned for rereview. Existing native persistence/runtime/provider/public-binding holds remain in force; coordinator must rerun integrated checks after admitting a coherent dependency closure.
