# Evening W0 — original static controls and shared form

## Source freeze

W0's six leased product files are frozen for independent rereview. This report was absence-checked before creation. This is a source implementation handoff, not a compiler, runtime, adoption or cutover acceptance claim.

| Leased source                                                     | Change                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/widgets/src/_inputs/static.ts`                          | New named-export-only barrel for the existing internal, text, switch, number, slider, select, multiSelect, multiText, timezoneList and dateTimeEventList components. No eager input registry or acquiring control import.                                                                          |
| `apps/nitro/src/features/widgets-editor/contracts.ts`             | Editor state derives from the existing shared form's actual `getValues` return type. Static options remain an extracted discriminated union of the original definitions.                                                                                                                           |
| `apps/nitro/src/features/widgets-editor/shared-controls.tsx`      | New discriminated delegation to the ten original components with original option, property, kind, initial options and board/item inputs. No copied rendering or form-shaped adapter.                                                                                                               |
| `apps/nitro/src/features/widgets-editor/widget-option-fields.tsx` | Replaces the parallel static field tree with that delegation. Retains custom configuration, release repositories, specialized bindings and the explicit unavailable alert. Static controls use an unstyled disabled/inert fieldset and interaction capture without changing their implementations. |
| `apps/nitro/src/features/widgets-editor/widget-editor.tsx`        | Uses the existing `useForm` and `FormProvider` as the sole options/integration-ID/advanced-options owner. Size, integration observations, specialized subdrafts and embedded editors retain their separate existing responsibilities.                                                              |
| `apps/nitro/src/features/widgets-editor/add-widget.tsx`           | Initializes advanced defaults through the existing source schema rather than a second literal definition.                                                                                                                                                                                          |

## Preserved behavior

- Original validation/refinements and per-path errors feed the real form, with source blur/change validation enabled. Initial options come from its captured initial snapshot; dirty checks use the source form baseline without resetting it during editing.
- Original multiText entry validation, uniqueness and PillsInput events; Select icons/checks; number units/settings; timezone limits/unsupported values; countdown recurrence and wall-time helpers stay in their unchanged owners.
- Existing Mantine components, CSS, labels, preview shell/resizing, switch grouping, advanced controls and keepMounted embedded tabs remain. No redesign or CSS changes.
- Ordinary form changes synchronously invalidate the existing preview generation. Admitted preview patches merge into current form options without retiring their own generation mid-patch.
- Stage reads one cloned current form submission before validation, preserves app-save then integration-save then draft-stage ordering, and retains actual draft/result validation. No absent-ref success was added.
- Static support now includes timezone/date-event lists. Dynamic, integration-bound and generic sortable controls are not added to local support; their unavailable bindings still block staging. Existing resource-dependent local branches are retained, not declared original-control parity.

## Interface handoff and remaining holds

The shared static controls require U's genuine theme, source translation, settings, date culture and host context. In particular, number units now come from the original `useSettings`, not from the target's duplicate renderer. Existing public `WidgetEditor`/`AddWidget` inputs remain structurally compatible; `WidgetOptionField` additionally requires the editor's real `canChange` interaction guard, supplied at its current sole source call site. This guard is not authenticated authority or native modal presentation ownership.

W1's captured host/presentation ownership, retained operations, resource-dependent original controls and rich repository workflows remain unallocated. W2's Docker renderer/resources and U's authenticated private mounting remain unallocated. The prior W report's producer contracts still apply; no H/U source was modified and no optional resource was substituted for a required owner.

## Verification boundary

Only the six leased product files and this optional handoff report were written. New source paths were absence-checked. The existing edit-state move, original static components, registry, definitions, defaults, schemas, CSS, manifests, lock, routers and coordinator files were not edited.

Context7 returned a monthly quota error. Library guidance was then read from official Mantine documentation (`https://mantine.dev/form/use-form/`) and installed form/fieldset source and declarations. Source rereads and targeted content searches were performed; no commands, lint/typecheck/compiler, tests, builds, installs, runtime/browser/native operations, data/environment/secrets/sealed captures, Git or delegation were executed.

Next gate: independent source rereview after all reached sources freeze, then coordinator-owned lint/typecheck and admitted integrated validation. Actual U mounting and disposable runtime/browser observations are still required before claiming adoption.
