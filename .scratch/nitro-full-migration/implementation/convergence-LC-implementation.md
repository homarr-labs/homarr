# LC implementation — producer leaves ready, imports blocked

Read `WRITER-RULES.md`. Only two approved new product leaves and this new report were written; no commands, checks, installs, tests, builds, services or data/secret access. Other workers' sources and manifests remain unchanged.

## Written and frozen

- `packages/definitions/src/stock-price.ts`: exact existing `stockPriceTimeFrames` range/interval tuples, order and literal types retained.
- `packages/api/src/nitro/browser-contracts/widgets.ts`: `NativeWidgetInputs` and `NativeWidgetOutputs` inferred from the actual `createWidgetProcedures` return type with declared `@orpc/server` inference utilities. Type-only imports; no fabricated DTO or legacy router.

API and Widgets already declare Definitions; Widgets already declares API; API already declares `@orpc/server`. Installed oRPC declarations and the existing native Docker client confirm the inference pattern. No dependency installation or manifest edit performed.

## Required coordinator prerequisite

Both package exports were absent on the latest source read:

- `packages/definitions/package.json`: publish `./stock-price` → `./src/stock-price.ts`.
- `packages/api/package.json`: publish `./nitro/browser-contracts/widgets` → `./src/nitro/browser-contracts/widgets.ts`.

The allocation explicitly requires publication before consumer imports. Therefore these three approved edits remain **pending**, not silently applied against unavailable subpaths:

1. `packages/widgets/src/stocks/index.ts`: import/re-export the canonical value and remove the old inline value; preserve definition/component loader verbatim.
2. `packages/api/src/nitro/routers/-widgets/resources.ts`: required `stockPriceTimeFrames` type becomes `typeof import("@homarr/definitions/stock-price").stockPriceTimeFrames`.
3. `packages/widgets/src/weather/format.ts`: replace root `RouterOutputs` import with `NativeWidgetOutputs` from the published native leaf; preserve `WeatherData = NonNullable<NativeWidgetOutputs["weather"]["atLocation"]>` and every formatting body/source view.

**Stocks consumer is not yet frozen for canonical-extractor handoff.** Resume the three edits after both exports are published. The temporarily duplicated tuple is preparation for the approved move, not completed canonical adoption. No legacy caller, registry, root alias or source view was changed. Full registry closure, compilation, runtime/procedure acceptance and activation remain unclaimed.
