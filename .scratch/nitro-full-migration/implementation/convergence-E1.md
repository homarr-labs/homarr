# E1 — frozen ordinary definition extraction

Source edits are complete and frozen. No commands, checks, tests, builds, runtime execution, dependency changes or shared-source edits were performed. This is source preparation, not compiler/runtime/procedure acceptance or activation.

## Exact owned changes

For each module below, added `packages/widgets/src/<module>/definition.ts` and changed only its existing `index.ts`:

| Module               | Exact kind           |
| -------------------- | -------------------- |
| clock                | `clock`              |
| air-quality          | `airQuality`         |
| countdown            | `countdown`          |
| timer                | `timer`              |
| app                  | `app`                |
| assistant            | `assistant`          |
| archive-team-warrior | `archiveTeamWarrior` |
| anchor-note          | `anchorNote`         |

Each new leaf exports the original raw config plus literal `kind`, checked with `satisfies WidgetDefinition & { kind: <literal> }`. No widened definition annotation, component import, component loader, observation acquisition or substitute options was added to these leaves. Existing indexes pass the imported raw definition to their original `createWidgetDefinition` kind and preserve `withDynamicImport(() => import("./component"))`, `definition` and `componentLoader`. Assistant additionally preserves its `AssistantWidgetRendererProvider` re-export from `./context` only in the original index.

Original options builders, factory arguments, defaults, hide rules, validation, metadata, integration configuration, query keys/matchers and App `NOT_FOUND` error behavior remain unchanged. App's contextual settings parameter retains `enableStatusByDefault` and captured `forceDisableStatus` behavior. Clock retains module-time timezone option construction and per-call dayjs labels; Countdown retains per-call timezone option construction. No context actions existed in these eight configs, and none were invented.

## Actual remaining dependencies and extra source edge

- Clock and Countdown still require the existing `packages/widgets/src/clock/world-clock.ts` helper. It imports dayjs plugins and the `OptionTimezone` type from `../options`, not a widget component or an acquiring observation hook. Its implementation was neither copied nor edited.
- Every leaf still uses the existing shared `../options`; Clock and Air Quality also retain the genuine `widgetQueryInputMatches` helper from shared `../definition`. Shared `definition.ts` still reaches `WidgetImports` from the original registry until the allocated shared producer adopts canonical inference. This tranche does not close that graph by itself.
- **Additional concrete component-source edge:** `packages/widgets/src/options.ts:11–12` imports `DynamicSelectOption`, `SelectOption` and `inferSelectOptionValue` from `_inputs/widget-dynamic-select-input.tsx` and `_inputs/widget-select-input.tsx`. Those files contain the real Mantine input components and import `_inputs/common.tsx` and `_inputs/form.ts`. Type-only imports do not exclude those sources from TypeScript. A strictly component-independent transitive source graph therefore still needs a separately allocated non-acquiring option-type leaf and source-preserving type re-exports/import adoption for these shared files. E1 did not edit them, prune compiler roots or duplicate/widen their types.
- Exhaustive canonical registry/manifest assembly, shared type adoption, package exports and target consumers remain with their allocated owners/coordinator. No additional required native observation resource was found in these eight configs. Existing shared options' `app` and `anchorNote` factories remain unchanged rather than acquiring resources in an E1 leaf.

Only the sixteen allocated source paths and this new report were written. Original registry, shared definition/options, components, helpers, manifests, presentation and dependency declarations were left untouched. Coordinator validation remains required after all writers freeze; no activation hold is cleared here.
