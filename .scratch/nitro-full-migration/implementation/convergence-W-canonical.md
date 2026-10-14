# Convergence W — canonical editor contract frozen

Only `apps/nitro/src/features/widgets-editor/contracts.ts` was changed. This new report was absence-checked before creation.

- Raw `WidgetDefinition` now comes from published `@homarr/widgets/definition`.
- `WidgetEditorDomain.loadWidgetDefinition` uses the actual bound instance method type `WidgetDefinitionManifest["loadWidgetDefinition"]` from published `@homarr/widgets/definition-manifest`, preserving its generic kind-to-canonical-definition inference.
- `reduceWidgetOptionsWithDefinition` uses `typeof` the actual source-exported reducer from that same entrypoint, retaining its original settings/current-value/default semantics.
- The original manifest import and relative original definition-type import were removed. All other interfaces, ownership/capture contracts, genuine form types and option inference remain unchanged. No static hold was released.

The published package exports and frozen SD producer were read before patching. Its resource bindings use the actual `status: "ready" | "held"` discriminator and exact factory-derived resource types; no proposed `kind` discriminator, resource construction or substitute signature was introduced.

ST owns runtime host/resource adoption. Those sources, SD sources, manifests, configuration and production mounting were not edited. Real owner-local manifest/resource construction and complete upstream/static-boundary review remain separate requirements; this type adoption does not establish activation or dependency-wide acceptance.

Source is frozen for rereview. No commands, compiler, lint/typecheck, checks/tests, installs/builds, runtime/browser/native/data/secret operations, Git or delegation were performed. Coordinator validation remains after all reached writers freeze.
