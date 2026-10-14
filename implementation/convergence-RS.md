# RS — storage definition extraction

Frozen source-only handoff. No commands, lint, typecheck, tests, builds, runtime calls or provider execution were performed; no compiler, runtime or procedure acceptance is claimed.

## Exact changes

- Added `packages/widgets/src/health-monitoring/definition.ts` and `packages/widgets/src/system-disks/definition.ts`. Each exports required `DefinitionResources` and `createDefinition(resources)`, returning its raw literal-kind config checked with `satisfies WidgetDefinition & { kind: <exact literal> }`. Original option inference, defaults, translations, hide rules, integration metadata, query keys, refetch interval, advanced focus and health-monitoring error presentation are retained.
- Updated the two original `index.ts` files to supply genuine legacy `clientApi.useQueries` observation wrappers. Each still exports `definition` and `componentLoader` and retains `withDynamicImport(() => import("./component"))` unchanged.
- Updated `packages/widgets/src/storage-volume-options.ts` to require `StorageVolumeObservationHook`. Its data type derives directly from `NativeWidgetOutputs["healthMonitoring"]["listStorageVolumes"]`; the helper no longer imports or acquires `clientApi`.

## Preserved reduction contract

The required hook receives the original `integrationIds: string[]` argument and must return one observation per requested integration in that same order. Legacy wrappers retain the original per-integration `{ integrationId }` query arguments. The helper retains index-based integration scoping, absent-data reduction, missing-ID skip, labels, `toScopedStorageVolumeValue`, Map deduplication, `some(isPending)` and `every(isError) && uniqueOptions.length === 0`. This includes the original empty-input error result and stale-data behavior. Empty default selection remains an option default, not fabricated successful observations.

## Remaining required dependencies

Shared canonical assembly must consume each factory with required resources and retain complete registry coverage and source-derived option types. Target editor resource ownership must supply real native `healthMonitoring.listStorageVolumes` observations in requested integration order, preserving pending/error/stale-data states and genuine query ownership. No native resource adapter, store, fallback resource, registry, shared definition, manifest, component or mount was added or changed here. Native activation remains held until those owners exist and coordinator validation completes.
