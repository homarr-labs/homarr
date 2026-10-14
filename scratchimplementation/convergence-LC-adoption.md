# LC — public integration type adoption frozen

Read `.scratch/nitro-full-migration/WRITER-RULES.md` and the existing root `scratchimplementation/convergence-LC-residual.md`. The report-location deviation remains unchanged. Coordinator's Definitions public export was confirmed before adoption; no manifest was edited.

## Exact changes

- NEW `packages/definitions/src/widget-integration-contracts.ts`: exports `inferSupportedIntegrations<TKind extends WidgetKind>` through the approved tuple-wrapped conditional, using only type imports from existing `./widget` and `./widget-integration-map`. Supported kinds/unions derive from the existing domain map; mixed or unsupported unions retain the `string` fallback, and `never` remains `never`. No duplicated catalog, Widget/canonical imports, runtime values or new casts.
- `packages/db/queries/item.ts`: replaced only the original relative Widgets-root type import with `@homarr/definitions/widget-integration-contracts`. The entire query body, existing casts, result mapping and outputs remain unchanged.

The demonstrated DB query barrel → original Widgets root/registry edge is removed at its actual consumer. Original aliases, all 69 Widget index/component loaders, canonical leaves and legacy callers were not edited. Only these two source paths and this new report were written.

## Remaining dependencies

Coordinator performs focused lint/type validation after reached writers freeze. This patch does not claim compiler PASS, complete graph closure, runtime/procedure acceptance or full private adoption. Genuine private renderer, manifest/resource, modal presentation and operation owners remain separate admitted-consumer prerequisites; activation holds are unchanged.

No commands, checks, tests, builds, runtime/native/SQL execution, data/secrets, nested agents, staging or commits. Source is frozen for coordinator review.
