# LC — approved five-path tranche complete and frozen

Coordinator's two package exports were confirmed present before applying consumer imports. The earlier partial handoff remains unchanged as historical evidence.

## Exact completed product scope

- `packages/definitions/src/stock-price.ts`: canonical original range/interval tuples, exact values/order/literal types. Unchanged during this continuation.
- `packages/widgets/src/stocks/index.ts`: imports/re-exports that canonical value instead of declaring a duplicate; original options, definition and `withDynamicImport(() => import("./component"))` retained unchanged.
- `packages/api/src/nitro/routers/-widgets/resources.ts`: required `stockPriceTimeFrames` property derives from published `@homarr/definitions/stock-price`, no longer a Widget UI module.
- `packages/api/src/nitro/browser-contracts/widgets.ts`: actual factory-derived `NativeWidgetInputs`/`NativeWidgetOutputs`; unchanged during this continuation.
- `packages/widgets/src/weather/format.ts`: imports the published native output leaf and retains `WeatherData = NonNullable<NativeWidgetOutputs["weather"]["atLocation"]>`. Daily/hourly types, formatting bodies and all source views preserved.

Existing manifests declare API/Widgets → Definitions, Widgets → API and API → oRPC; no install or new dependency. Coordinator owns and published `./stock-price` and `./nitro/browser-contracts/widgets`; this lane made no manifest edits.

**All five product paths are frozen; the canonical-extractor owner may take over Stocks.** The native resource-to-Stocks UI edge and Weather's root-router type edge are removed at source. Full registry closure remains the separate canonical-extractor allocation; no legacy callers, registry entries, compiler roots or aliases changed.

No commands/checks/tests/build/runtime/services or data/secret access. No lint/typecheck, runtime/procedure acceptance or activation claimed; coordinator validates after reached writers freeze.
