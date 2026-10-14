# SH — Pure PatchMon presets and select contracts

Frozen source changes:

- Added `packages/widgets/src/patchmon/stat-color-presets.ts`: moved the existing domain types, stat lists and preset record unchanged, with no imports or component inference.
- `packages/widgets/src/patchmon/stat-colors.ts` imports and re-exports that single preset authority. Color algorithms and option-key maps remain intact. Its private options contract requires the two existing switches and all five existing mode/warning/critical triples, without `WidgetComponentProps` or definition/registry inference; indexed threshold reads no longer need assertions.
- `packages/widgets/src/patchmon/threshold-validation.ts` reads `ThresholdMode` from the pure leaf; `packages/widgets/src/patchmon/definition.ts` reads canonical presets from that leaf. Validation, defaults, labels, visibility and definition bodies are unchanged.
- Added `packages/widgets/src/_inputs/select-contracts.ts` with the exact existing `DynamicSelectOption`, `SelectOption` and `inferSelectOptionValue` declarations, retaining the existing translation and icon type dependencies. `packages/widgets/src/options.ts` imports them directly; factory defaults and inference are unchanged.

Required WG handoff: after its active writer freeze, WG alone must replace the local declarations in `packages/widgets/src/_inputs/widget-select-input.tsx` and `packages/widgets/src/_inputs/widget-dynamic-select-input.tsx` with type imports and compatibility re-exports from `./select-contracts`. Those files were not edited here. The temporary duplicate declarations must not survive final convergence as competing authority.

No component, styles, registry, core definition, manifest, Wazuh shared options or Stats config edits. No commands, lint/typecheck, tests, builds or runtime/procedure execution performed; coordinator validation and WG consumption remain required. No compiler/runtime acceptance or target activation is claimed.
