# E2 — frozen canonical definition extraction

Status: source tranche complete and frozen. No commands, checks, tests, builds, runtime execution, or compiler/procedure acceptance claimed.

## Exact writes

Each row adds `definition.ts` and updates only the existing `index.ts` under `packages/widgets/src/`:

| Module                          | Exact literal kind            |
| ------------------------------- | ----------------------------- |
| `notebook`                      | `notebook`                    |
| `iframe`                        | `iframe`                      |
| `video`                         | `video`                       |
| `dns-hole/summary`              | `dnsHoleSummary`              |
| `dns-hole/controls`             | `dnsHoleControls`             |
| `smart-home/entity-state`       | `smartHome-entityState`       |
| `smart-home/execute-automation` | `smartHome-executeAutomation` |
| `stocks`                        | `stockPrice`                  |
| `media-server`                  | `mediaServer`                 |
| `calendar`                      | `calendar`                    |

All ten leaves export the original raw configuration plus literal `kind`, checked using `satisfies WidgetDefinition & { kind: <exact literal> }`, without widening the inferred options. They retain the original options builders/defaults, metadata, integration configuration, query keys/matchers, refetch intervals, iframe action and error translations. No leaf acquires components or observations. Existing indexes consume their canonical leaf with the original `createWidgetDefinition` and `() => import("./component")` loader, retaining both original exports and the DNS `widgetKind` exports.

`packages/definitions/src/stock-price.ts` remains untouched. Both stock options still derive from its canonical tuples, and `stocks/index.ts` retains its existing canonical import and `stockPriceTimeFrames` re-export. The immediateLC stock extraction is preserved, not duplicated.

## Remaining dependencies

No extra source write or resource owner is indispensable for this E2 tranche. Notebook still consumes its unchanged `notebook/default-content.ts`; calendar still consumes the existing `radarrReleaseTypes` from `@homarr/integrations/types`. Existing dependency declarations already cover all retained imports.

Shared canonical registry/manifest assembly, `WidgetOptionsRecordOf` adoption and native consumer adoption remain separately owned prerequisites. These leaves retain the existing shared definition type and query-helper imports; E2 does not claim that the current shared type graph is already component-independent. No shared definitions, registry, components, helpers, aliases, package manifests, or native mounting were changed. Activation and overall acceptance remain held pending coordinator integration and focused validation.
