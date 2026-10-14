# RT — Timetable canonical definition

Frozen source changes:

- Added `packages/widgets/src/timetable/definition.ts` with required `DefinitionResources` and `createDefinition(resources)`. Station-search input and data derive from `NativeWidgetInputs` / `NativeWidgetOutputs`, whose browser contract derives from the genuine `createWidgetProcedures` factory. Translation observation is also required.
- Preserved the exact raw `timetable` config and option inference with `satisfies WidgetDefinition & { kind: "timetable" }`: both icons, advanced focus, BAD_REQUEST translation and hidden logs link, base URL default/validation/description, station option mapping, source pending/error behavior, and all dynamic-select arguments. Search forwards actual query, resolved option base URL, item ID and board ID; translations are acquired before the search hook, as originally.
- Updated `packages/widgets/src/timetable/index.ts` to supply the real original legacy query and translation wrappers. Both original exports (`definition`, `componentLoader`) and the exact `./component` loader remain.

The leaf imports no legacy client, root `RouterOutputs`, or component, and provides no default resources. The existing empty option reduction only applies to absent observed station data; it does not fabricate a successful observation. Shared registry, definition infrastructure, manifests, components and package declarations were not changed.

Remaining required owners: native target station-search observation and translation hooks in the target definition-resource owner; exhaustive canonical definition assembly and shared type adoption remain separate allocations. The existing native browser contract and its package export are present. The leaf's shared `WidgetDefinition` type still follows today's shared definition infrastructure until that separate adoption lands.

No commands, lint/type checks, tests, runtime execution or activation were performed. This is an unmounted source extraction, not compiler/runtime/procedure acceptance or release of Widget0/9 holds. Coordinator validation remains required after all writers freeze.
