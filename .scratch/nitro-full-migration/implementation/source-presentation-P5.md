# P5 — Custom Widget workbench presentation extraction

## Authority and disposition

Task authorization: Oracle-approved producer-first, NEW-file-only P5 amendment to `FRONTEND-PRESENTATION-LEASES.md` P5. The plan's original-consumer release is not exercised. Only the nine named new UI files and this handoff were added. No exports, barrel, manifest, declaration, original wrapper, controller, existing Widgets-editor file, specialized input, Custom runtime, definition, schema, or six-kind Widget writer file was changed.

Disposition: presentation bodies extracted; export admission, original delegation, structured workbench resource joins, native preview/save authority, and runtime acceptance remain held. This is not whole-workbench parity or a mounted feature.

## Pre-write absence and source inventory

Before writing, `packages/ui/src/source-views` was absent. An exact nine-path glob also returned no matches. The handoff glob returned no `source-presentation-P5.md`. These observations preceded the add-only patch; they are not a later repository-wide change audit.

All new UI paths are beneath `packages/ui/src/source-views/custom-workbench/`:

| New absent path                 | Read-only source body/type origin                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts.ts`                  | Presentation arguments from the source symbols below; navigation IDs from layout lines 29–36; preview outcome from status line 7. Issue path/message is a render projection, not the parser's DTO. |
| `editor-section.tsx`            | `_custom-widget-form-layout.tsx` lines 38–64: `EditorSection`.                                                                                                                                     |
| `save-actions-view.tsx`         | `_custom-widget-form-layout.tsx` lines 66–112: `SaveActions`, excluding form-analysis wrappers.                                                                                                    |
| `section-navigation-view.tsx`   | `_custom-widget-form-layout.tsx` lines 29–36 and 114–143: exact ordered links and `CustomWidgetSectionNavigation` render.                                                                          |
| `custom-widget-form.module.css` | Complete `_custom-widget-form.module.css`, all 115 lines, read before writing.                                                                                                                     |
| `preview-status-view.tsx`       | `_custom-widget-preview-status.tsx` lines 7–43: `PreviewOutcome`, `PreviewResult`, `PreviewStatusDot`; summary helper excluded.                                                                    |
| `preview-size-control.tsx`      | `_custom-widget-preview-size-control.tsx` lines 8–56: actual content and memoized export.                                                                                                          |
| `save-issues-view.tsx`          | `_custom-widget-save-issues-alert.tsx` lines 10–37: actual issue formatting/alert/copy body.                                                                                                       |
| `lazy-once-accordion.tsx`       | `_lazy-once-accordion.tsx` lines 7–44: actual lifetime, control/panel IDs and render.                                                                                                              |

Source prefix for every original above: `apps/nextjs/src/app/[locale]/manage/custom-widgets/`. Original files remain read-only and retain their existing consumers.

## Exact presentation contracts and copy joins

- `EditorSectionProps`: source `id: string`, title, Tabler `Icon`, React children. It remains a real section Card with its existing heading/icon tree and class; no editor is implemented or substituted.
- `CustomWidgetSectionId`: exact `general | sources | requests | options | jsx | preview`. Navigation accepts `ReadonlySet<CustomWidgetSectionId>` and the source `onSelect(section)` action. Link order and icons remain Settings/API/Database/Braces/Code/Eye; real `href="#id"` anchors retain default browser navigation, with no prevented click or router substitute.
- Navigation copy: `sectionNavigation` ← workbench `sectionNavigation`; `invalid` ← `status.invalid`; `sections[id]` ← `section.general`, `section.sources`, `section.requests`, `section.options`, `section.jsx`, `section.preview`, respectively.
- `SaveActionsProps`: actual dirty/savePending/previewPending/invalid display state, `create | edit`, and `onPreview()`. Copy status keys map to workbench `status.invalid/unsaved/ready`; action preview keys map to workbench `action.previewLoading/preview`; create/save map to common `action.create/save`. No guessed principal, resource readiness, save callback, or form type is published.
- `PreviewOutcome`: exact `idle | loading | success | error`; result receives outcome/title/description and dot receives outcome/label. These are supplied observations, not a new preview result model. No outcome is synthesized or promoted internally.
- Size control retains source `value: string` and `onChange(value: string)` with fixed compact/standard/wide options. Copy maps to preview `size.compact/standard/wide`; short visual labels remain S/M/L and full labels remain in both title and `VisuallyHidden`.
- Issues receive a readonly list of `{ path: string; message: string }` display projections and saveError `title/description/errors/copied/copy` labels. An empty path omits the prefix. The new type does not import, reproduce, execute or replace the save-error parser; the caller must project real recorded issues.
- Lazy accordion receives source React label/children only. No editor package, form state, or renderer type enters the contract.

Original translation hooks become required resolved copy props. No translations or catalog files are changed. Public export paths and adapter compatibility are not assumed.

## Render and effect preservation

| Leaf               | Preserved behavior                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Editor section     | `component="section"`, bordered `p="lg"` Card, source Stack/Group/icon/title tree; CSS scroll margin remains 5rem.                                                                                                                                                                                                                               |
| Save actions       | Invalid takes precedence over dirty, then local ready label; original red/green icons, wrapping groups, preview `type="button"` and save `type="submit"`. Preview is disabled for invalid/savePending; submit is disabled for invalid/previewPending. Loading states and create/edit copy are unchanged.                                         |
| Navigation         | Sticky horizontal source nav, real anchors, source keys/order, 14px icons, red invalid link and 13px accessible warning icon; caller supplies the actual invalid set.                                                                                                                                                                            |
| Preview result/dot | Idle result returns null; error/success/loading alert colors stay red/green/yellow. Dot remains an 8px circular nonshrinking `output` inside Tooltip with gray/yellow/green/red mapping and accessible supplied label.                                                                                                                           |
| Size control       | Source SegmentedControl size xs, exact three values, accessible labels and `memo` around the content component.                                                                                                                                                                                                                                  |
| Save issues        | Empty list returns null; source path/message newline formatting, read-only autosizing error Textarea (2–10 rows), red Alert, compact copy action; Mantine CopyButton retains 2,000ms feedback and copied color/icon/copy switch. This Textarea displays errors only, never substitutes a JSON editor.                                            |
| Lazy accordion     | `useId` control/panel association, initially null value/false first-open state; first content open latches `hasOpened` permanently. Later collapse applies native `hidden` without unmounting children, preserving editor effects/history. Source panel/content classes and explicit region role remain. No Mantine Panel/Activity substitution. |

Only genuine source-local state and Mantine clipboard feedback are retained. There are no network, query, navigation-resource, authorization, persistence, upload, listener, or backend effects. Original explanatory/lint-suppression comments were not added to the new source, per the no-comments constraint. The retained explicit `div role="region"` may require coordinator lint review of the source's `jsx-a11y/prefer-tag-over-role` exception; no tag redesign or suppression is introduced here.

## Frozen stylesheet relocation artifact

`custom-widget-form.module.css` reproduces the complete source stylesheet without restyling, selector omission, breakpoint flattening, or added rules. Its required invariant is byte identity with the read-only original; it is a frozen relocation artifact, not an editable fork. No automated byte comparison was run under this task's no-checks restriction.

Preserved selectors: form, sectionNav (including direct anchor rule), editorSection, previewCanvas, workbench, paneSwitcher, configuration, previewPane, actionBar and mobileSaveBar. Future pane selectors remain even though P5 does not extract pane controllers. The 74.9375em mobile boundary retains native pane hiding and 3.5rem nav offset; 75em retains pane-switch/mobile-save hiding, 1fr/1fr layout and 5rem sticky panes/actions; 100em retains 0.9fr/1.1fr columns. All native color-mix/backdrop-filter/custom-property declarations remain as source.

The two new CSS consumers use the sibling stylesheet only. Existing Next consumers still use the original frozen path. Coordinator must separately review explicit CSS publication, exact existing-consumer import joins, stylesheet typing/host handling, byte identity, and source retirement before making this the sole wired stylesheet. Neither copy may be independently restyled during that interval.

## Purity and dependency evidence

Read `packages/ui/package.json` before code creation: React, Mantine core/hooks, and Tabler are already declared; `@types/css-modules` is already declared. Read `packages/ui/tsconfig.json`: its include covers src. No dependency or typing was installed or added.

Installed official declarations were read, not evaluated: Mantine `Accordion.d.ts` confirms controlled single value/onChange and panel/content class names; `CopyButton.d.ts` confirms string value, copied/copy child payload and millisecond timeout; `SegmentedControl.d.ts` confirms controlled value/onChange and React labels. No live documentation request was made under the supplied current-API/quota constraint.

New runtime imports are limited to React, `@mantine/core`, `@tabler/icons-react`, and the sibling CSS module. Type imports are React/Tabler and the sibling types-only contract. No `@homarr/ui` root barrel, Next, API, tRPC, auth, DB, custom-widgets, form, editor runtime, feature contract, or backend-private helper is imported. No casts, `any`, comments, new tests, fake preview, or resource-proof callbacks were added.

## Held joins and acceptance

- `status.ready` is local candidate validity/display copy only. It is not native preview readiness, permission, atomic-save authorization, or evidence that a resource exists. The extracted buttons retain source display rules; their surrounding form and native action authorization remain with the existing owner.
- `CustomWidgetSaveActions`, `CustomWidgetUnsavedChangesGuard`, `CustomWidgetOptionsSnapshotSync`, `getPreviewSummary`, form-state helpers, save-error parsing, controllers and editor types stay in the originals. No excluded helper is copied into UI.
- Real structured CustomFormValues, PreviewCreated and WidgetEditorBindings publication/projection belongs to the Widgets-editor contract owner. Existing contracts are not edited or duplicated here.
- Source/request/option reference-preserving changes, structured form parsers, specialized inputs, advanced manifest, CodeEditor, CustomJsxRenderer, AI diagnostics/sample responses, draft/resource lifetime, token recipient, publish/Workshop behavior and native atomic save remain separate held obligations. No JSON-textarea replacement or whole-editor approximation is supplied.
- Live versus simulated preview evidence must come from the original native resource join. Supplying an outcome string or `onPreview` callback does not prove transport, authorization, rendering, safety, settlement or publication readiness.
- Review source-body/type/CSS preservation and purity first. Explicit package exports/barrels, CSS imports, original thin delegation and native bindings require a separate coordinator release. No deep-import workaround or route mounting is authorized by this handoff.

Manual review compared the patch's render trees and local state transitions to the read source bodies. No checks, lint, typecheck, build, install, tests, import evaluation, live network/provider/SQL/browser, environment/credentials/data reads, listeners, Git operations, or nested agents were used. No runtime, compiler, lint, CSS-byte-verification or whole-workbench acceptance is claimed.
