# E6 — canonical definition extraction

Status: frozen source handoff. No commands, checks, tests, builds, runtime execution, staging, commits, or nested agents. No compiler, runtime, procedure, or activation acceptance claimed.

## Exact owned changes

For each path below, added `packages/widgets/src/<path>/definition.ts` and changed only its existing `index.ts` to consume the raw canonical definition through the unchanged `createWidgetDefinition(kind, definition).withDynamicImport(() => import("./component"))` API.

| Module path         | Exact kind        |
| ------------------- | ----------------- |
| audio-stats         | audioStats        |
| umami               | umami             |
| vpn                 | vpn               |
| ups                 | ups               |
| beszel-system-table | beszelSystemTable |
| beszel-system-grid  | beszelSystemGrid  |
| beszel-alerts       | beszelAlerts      |
| traefik             | traefik           |
| custom-api          | customApi         |

Every raw leaf exports `definition` checked with `satisfies WidgetDefinition & { kind: <exact literal> }`, without a widened definition annotation or component acquisition. The original option creator bodies and parameter lists, defaults, validation, integration metadata, focus flags, query keys/matchers, visibility rules, and error mappings were retained. These original configurations contain no context actions or resource-observation hooks; none were invented.

Every original index retains its `definition` and `componentLoader` exports and exact `./component` dynamic loader. Umami's `timeFrameValues` tuple moved unchanged into its canonical leaf and remains re-exported by its original index. Beszel's shared status options remain the existing shared value. Beszel table's sort-option contextual check now uses the existing `WidgetOptionOfType<"select">["options"]` element contract rather than importing the component-defined `SelectOption` type directly; values, ordering, translation functions, mutable inferred array, and option creator remain unchanged.

`beszel-system-stats` is excluded and untouched. No shared definition, registry, component, helper, source alias, observer, manifest, package manifest, or dependency edits were made.

## Remaining actual dependency edges

- All nine leaves still require the shared `packages/widgets/src/definition.ts` type contract. At the ordinary source read for this handoff, that file still imports `WidgetImports` from `./registry` and derives `WidgetOptionsRecordOf` from it. The coordinator's complete canonical type adoption remains necessary; extraction alone does not establish a component-independent compiler graph.
- All nine leaves reuse `packages/widgets/src/options.ts`. Its existing type imports reach `_inputs/widget-select-input.tsx` (`SelectOption`, `inferSelectOptionValue`) and `_inputs/widget-dynamic-select-input.tsx` (`DynamicSelectOption`), which are real acquiring input components. Their shared type separation is an additional required dependency if the target compiler graph must exclude all input component sources. This lane did not move those shared types or modify their owners.
- The existing `options.ts` runtime edge to `stats/config.ts` is a Zod-only schema leaf, and its `ReleasesRepository` type edge reaches a non-acquiring interface leaf. No extra extraction was needed for those inspected edges.
- Beszel table/grid depend on the existing non-acquiring `beszel/_shared/options.ts` value. No resource hook, API-root output type, or component import is directly present in these nine new leaves.
- Shared exhaustive definition registry/manifest assembly, public package exports, target adoption, and coordinator-run focused lint/type checks remain outside E6 ownership. No required resource was made optional, and no native resource owner or observer fallback was fabricated.

Evidence is ordinary source inspection only. All owned source files are frozen for the coordinator's checks after the other writers freeze.
