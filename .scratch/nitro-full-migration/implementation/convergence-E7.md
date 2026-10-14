# E7 — frozen canonical definitions

## Exact writes

Added `packages/widgets/src/<module>/definition.ts` and updated only the existing `index.ts` for:

| Module        | Exact kind   |
| ------------- | ------------ |
| weather       | weather      |
| wud           | wud          |
| llama-cpp     | llamacpp     |
| wazuh-agents  | wazuhAgents  |
| wazuh-alerts  | wazuhAlerts  |
| wazuh-summary | wazuhSummary |

Each raw `definition` retains the original configuration and uses `satisfies WidgetDefinition & { kind: <exact literal> }`. Original zero-argument `createOptions` signatures, inferred option creators, defaults, metadata, integration spreads, Weather query matching and Wazuh error translations are retained. No context actions existed in these six source definitions. Each original index retains its exported `definition` and `componentLoader` through the existing `createWidgetDefinition` and unchanged `() => import("./component")` loader. No other original index exports existed.

## Remaining dependencies

- Shared canonical registry/type/manifest assembly and native adoption remain coordinator-owned. These leaves directly acquire no components or observations, but shared `definition.ts` still derives option types through the original registry until its separately allocated adoption lands. Weather also retains its existing runtime `widgetQueryInputMatches` import from that shared module.
- Wazuh Summary retains the existing pure `../wazuh/_shared/options` helper; no helper extraction is needed for this leaf.
- All six retain the existing `optionsBuilder` dependency. Its existing type imports reach input modules; this lane does not change shared option infrastructure or claim transitive compiler closure.
- Weather `format.ts` is untouched and already uses the separately frozen native browser-contract leaf. No additional E7 resource owner or helper move was identified.

No shared definition, registry, component, helper, alias, manifest, dependency or Weather format file was written. No commands, lint, typecheck, tests, build, runtime or procedure checks were run. Source is frozen for coordinator validation; this report does not establish compiler/runtime/procedure acceptance or release activation holds.
