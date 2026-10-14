# Convergence WG — select type authority consumption

Frozen narrow source amendment:

- `packages/widgets/src/_inputs/widget-select-input.tsx` imports `SelectOption` from `./select-contracts` and backward-compatibly re-exports `SelectOption` and `inferSelectOptionValue`. Removed the duplicate declarations and their now-unused `stringOrTranslation` and `TablerIcon` imports. All existing WG1 dropdown/gesture and component bodies remain unchanged.
- `packages/widgets/src/_inputs/widget-dynamic-select-input.tsx` imports and backward-compatibly re-exports `DynamicSelectOption` from `./select-contracts`. Removed only its duplicate declaration; the original component body and component export remain unchanged. No dynamic-select guards were added.

SH's frozen `packages/widgets/src/_inputs/select-contracts.ts` is the single declaration authority, already consumed by shared options. Its report remains at the approved location deviation `implementation/convergence-SH.md`; neither was edited.

Only the two allocated source files and this new scratch report were written. No commands, checks, lint/typecheck, tests, builds, runtime execution or nested agents were performed. Independent WG1 review and coordinator verification remain required; this handoff does not establish compiler/runtime acceptance, release any holds or authorize activation. Release remains 0/9.
