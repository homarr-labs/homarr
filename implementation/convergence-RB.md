# RB — Beszel system stats canonical definition

Frozen source changes:

- Added `packages/widgets/src/beszel-system-stats/definition.ts` with required `DefinitionResources.useSystems` and raw exact-literal `createDefinition(resources)` checked with `satisfies WidgetDefinition & { kind: "beszelSystemStats" }`.
- Systems observation data and integration input derive from the genuine native Widget factory's `NativeWidgetOutputs`/`NativeWidgetInputs` contract. Period typing derives from native `beszel.getSystemStats.timePeriod`, not the chart component.
- Preserved system-choice mapping, integration order and IDs, enabled predicate, undefined-data reduction, pending/error flags, both query keys and full runtime/stored-selection/Docker query matching. All options, defaults, integration metadata, icon and translated server error remain intact; no actions were added.
- Original `index.ts` supplies the genuine legacy query hook and retains exported `definition`, `componentLoader` and the unchanged `() => import("./component")` loader.

Required remaining dependencies: native target resources must supply the real scoped `useSystems` observation, preserving the input and enabled flag; canonical assembly must consume this resource factory without a fallback owner. No native mounting or registry/manifest changes were made.

Additional reached edges outside RB ownership: shared `../definition` still derives option types from the legacy component registry until its allocated canonical adoption; `../options` retains shared input-component type edges. The native browser contract intentionally reaches `createWidgetProcedures` for inference. These were not widened, aliased or repaired here. Existing `./selection` helpers were reused unchanged.

No commands, checks, tests, builds or runtime/procedure execution were performed. Source inspection only; compiler/runtime acceptance and target activation remain held.
