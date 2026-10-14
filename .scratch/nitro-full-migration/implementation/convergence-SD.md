# SD — canonical definition producer frozen

## Exact source scope

- NEW `packages/widgets/src/definition-registry.ts`: all 69 literal kind-to-canonical-leaf imports match the original registry's paths and insertion order. The exhaustive `satisfies` check requires each raw definition or factory return to carry its exact matching kind while retaining the inferred module type. `CanonicalDefinitions` derives ordinary values directly and resource definitions through actual factory `ReturnType`; resources derive through factory `Parameters`.
- NEW `packages/widgets/src/definition-manifest.ts`: required owner-local resources/currentness, per-kind promise cache, ordered all-kind promise cache, matching-rejection eviction, held-resource rejection, captured bindings, and disposal checks before late delivery. Cached promises are returned directly, not async-wrapped. Disposal clears both caches without releasing borrowed hooks/clients. Exported kinds are separate from the owner's captured full declared-kind order.
- `packages/widgets/src/definition.ts`: only the `WidgetOptionsRecordOf` producer and its type import now use `CanonicalDefinitions`; all runtime/component contracts and `createWidgetDefinition` behavior remain unchanged.

The separate default reducer retains the original signature and `currentValue[key] ?? option.defaultValue` behavior. The original `registry.ts`, `manifest.ts`, every extracted leaf/index, target WG/W paths, helper writers, and package manifests were not edited.

## Frozen adoption contract

`WidgetDefinitionFor<K>`, `DefinitionResourcesFor<K>`, and `ResourceWidgetKind` are exported by the registry and re-exported by the manifest. The resource-kind union is exactly `bookmarks`, `healthMonitoring`, `dockerContainers`, `systemDisks`, `timetable`, `immich-albumCarousel`, and `beszelSystemStats` from the seven actual factory exports.

`DefinitionResourceBindings` requires every resource kind, with its exact factory parameter type, as either `{ status: "ready", resources }` or `{ status: "held", reason: string }`. Construction captures the binding and a shallow copy of its resource hook/view fields. A held binding cannot become ready by mutating the caller's object; a new admitted owner constructs a new manifest.

`createWidgetDefinitionManifest({ resources, assertCurrent })` returns `WidgetDefinitionManifest` with:

- `loadWidgetDefinition<K extends WidgetKind>(kind: K): Promise<WidgetDefinitionFor<K>>`
- `loadAllWidgetDefinitions(): Promise<Map<WidgetKind, CanonicalDefinitions[WidgetKind]>>`
- `dispose(): void`

Currentness is checked at construction, before cache access/acquisition, after asynchronous acquisition, and before/after resource binding. Held resources reject both individual and all-kind loads rather than skip entries or invent successful observations. Only the rejected promise still occupying its cache entry is evicted; underlying import failures can be retried. Disposal rejects delivery when pending acquisition finishes, without pretending to cancel the physical import.

## Required remaining dependencies

Coordinator must publish `@homarr/widgets/definition-registry` and `@homarr/widgets/definition-manifest`. Serialized WG/W target adoption must provide real observation/view owners or explicit held reasons for all seven resource kinds and use the frozen instance contract. Separate PatchMon/helper and select-contract writers retain their source ownership. This producer is unmounted and does not release native Widget/editor/runtime activation or any other acceptance gate.

Only ordinary source reads and patches were used. No commands, compiler, lint, checks, tests, builds, services, native/SQL execution, provider access, staging, or commits. Coordinator performs focused validation after reached writers freeze; no compiler/runtime/procedure acceptance is claimed.
