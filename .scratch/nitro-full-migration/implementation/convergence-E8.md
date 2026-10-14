# E8 — Wazuh canonical definition extraction

Status: source frozen. No commands, checks, tests, builds, runtime execution, installs, branch changes or nested agents were performed. This is extraction only, not compiler/runtime/procedure acceptance or target activation.

## Exact changes

Added `definition.ts` and amended only the existing `index.ts` in these five `packages/widgets/src/` modules:

| Module                  | Literal kind           | Preserved options and defaults                                                                   |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `wazuh-timeline`        | `wazuhTimeline`        | range `24h`, interval `auto`, chartType `area`, yScale `linear`, minLevel `0`, showLegend `true` |
| `wazuh-top-list`        | `wazuhTopList`         | kind `rules`, range `24h`, limit `8`, minLevel `0`, showBars `true`                              |
| `wazuh-vulnerabilities` | `wazuhVulnerabilities` | cveOrder `score`, minSeverity `all`, cveLimit `8`, agentLimit `5`, showAgents `true`             |
| `wazuh-fim`             | `wazuhFim`             | range `24h`, event `all`, limit `20`, includeRegistry `true`                                     |
| `wazuh-auth-failures`   | `wazuhAuthFailures`    | hours `24`, limit `6`, showSourceIps `true`                                                      |

Each leaf exports the raw `definition` with its literal `kind`, checked using `satisfies WidgetDefinition & { kind: <exact literal> }`. Original `createOptions()` method signatures, option-builder inference, option order/labels, validators, numeric steps, timeline yScale description, icons, integration metadata and translated INTERNAL_SERVER_ERROR behavior are unchanged. These originals contained no explicit context actions, query matchers, query keys, refetch intervals or advanced-focus configuration; none were invented.

Every original index still exports `definition` and `componentLoader` through `createWidgetDefinition(originalKind, canonicalDefinition).withDynamicImport(() => import("./component"))`. There were no additional original index exports. No component, shared definition, registry, manifest, helper, schema, package export or dependency file was edited.

## Required remaining dependencies and extra edges

- Timeline, top-list and FIM retain the real value dependency on `packages/widgets/src/wazuh/_shared/options.ts`. This is a dependency-only constant leaf containing the exact four time-range choices, with no acquisition or component imports; no extra extraction is needed for that helper.
- All five retain `optionsBuilder` from `packages/widgets/src/options.ts`. Its existing runtime dependency on `stats/config.ts` is a Zod schema leaf, but its type dependencies on `_inputs/widget-dynamic-select-input.tsx` and `_inputs/widget-select-input.tsx` still reach existing component bodies and their `_inputs/common.tsx`/`form.ts` dependencies. Removing these shared type-to-component edges needs separately allocated shared ownership; E8 did not move helpers, duplicate option types or introduce aliases.
- All five use a type-only `WidgetDefinition` import from `packages/widgets/src/definition.ts`. At inspection, that shared module still derives `WidgetOptionsRecordOf` from `WidgetImports` in the original full `registry.ts`; a type-only import does not establish TypeScript source-graph closure. The approved shared canonical type/registry adoption remains required outside E8.
- `getWidgetIntegrationConfig` remains the original Definitions authority: each kind supports `wazuh` and `mock`, with `maxIntegrations: 1`; no optional-integration flag or new permission was introduced. Icons, Zod and Definitions are already declared in the Widgets manifest.
- No E8 leaf requires injected observations or creates an acquisition. Exhaustive canonical registry/manifest assembly, package entrypoint publication, target consumer adoption and coordinator validation remain separate prerequisites. Target activation stays held; preserved legacy loaders are not native adoption.

Verification was limited to ordinary source reads and comparison with the five original indexes. Focused lint/type checks remain the coordinator's responsibility after writers freeze.
