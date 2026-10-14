# RI — Immich album-carousel canonical definition

Frozen source changes:

- Added `packages/widgets/src/immich/album-carousel/definition.ts`: required `DefinitionResources.useAlbums` uses the actual native Widget factory's `NativeWidgetInputs`/`NativeWidgetOutputs` album types. `createDefinition(resources)` returns the raw literal-kind configuration checked with `satisfies`, preserving inferred options, metadata, query matching and context actions. No legacy client, root RouterOutputs, component import or default resource.
- Updated `packages/widgets/src/immich/album-carousel/index.ts`: supplies the genuine original legacy albums query wrapper and retains the original exported `definition`, `componentLoader` and component import.
- Preserved first-integration selection, empty integration ID fallback, integration-count enabled condition, 15-minute stale time, no album limit, translated all-photos choice, original absent-data fallback and exact pending/error forwarding. All option defaults and validation remain unchanged; no error metadata was present or invented.

Remaining required dependencies: shared canonical registry/type adoption and a genuine native albums observation owner supplied by the target editor's `definition-resources.tsx`. This extraction does not mount the target or supply authority/resources on its behalf. Existing shared `definition.ts` still reaches the original registry until its allocated owner completes adoption.

No commands, checks, tests, builds or runtime/procedure execution were performed. Compiler/runtime/procedure acceptance remains unclaimed; coordinator performs focused validation after writers freeze.
