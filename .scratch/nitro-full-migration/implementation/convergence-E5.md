# E5 — frozen canonical definition extraction

Seven raw definition leaves now export `definition` with exact literal `kind`, checked using `satisfies WidgetDefinition & { kind: <literal> }`. Each original index consumes its raw leaf through the unchanged `createWidgetDefinition` API and retains both original exports, `definition` and `componentLoader`, and its original `() => import("./component")` loader.

## Exact source changes

Both NEW `definition.ts` and existing `index.ts` under these module paths are the complete E5 source write set:

| Path under `packages/widgets/src/` | Exact kind           |
| ---------------------------------- | -------------------- |
| `immich/server-stats`              | `immich-serverStats` |
| `stats`                            | `stats`              |
| `paperless-ngx`                    | `paperlessNgx`       |
| `patchmon`                         | `patchmon`           |
| `tracearr`                         | `tracearr`           |
| `speedtest-tracker`                | `speedtestTracker`   |
| `uptime-kuma`                      | `uptimeKuma`         |

Original configuration bodies were moved intact: zero-argument `createOptions` methods, factory inference, defaults, labels/descriptions, integration config calls and spread order, advanced-focus metadata, refetch metadata, and error icons/translations. Stats retains its entries schema and custom refinement issue. Patchmon retains preset-backed thresholds, Zod validation, every conditional visibility rule, and `patchmonOptionsSuperRefine`. Speedtest retains conditional ping-graph visibility. Immich retains both query-key arrays and `matchesWidgetRuntimeQuery`. No context actions were present in these source definitions; none were added. Absent metadata remains absent.

Immich album-carousel belongs to RI and was not edited. No registry, shared definition, component, helper, manifest, dependency, compiler alias, resource observation, or test changes were made.

## Actual remaining edges

- Patchmon's raw leaf imports existing `patchmon/stat-colors.ts` for `PATCHMON_STAT_COLOR_PRESETS`. That helper imports shared `WidgetComponentProps` and derives `PatchMonColorOptions = WidgetComponentProps<"patchmon">["options"]` at line 34. Shared `definition.ts` currently derives options from the original `WidgetImports` registry; this is a real helper-to-registry type edge, not closed by extracting the index. `patchmon/threshold-validation.ts` also imports `ThresholdMode` from `stat-colors.ts`. Both helpers remain outside E5 ownership; canonical shared type adoption must account for this cycle without widening inferred options.
- Every leaf retains shared `WidgetDefinition` typing. Immich additionally retains the shared runtime query matcher value. Shared `definition.ts` still imports `WidgetImports` and derives `WidgetOptionsRecordOf` from it pending the allocated shared adoption.
- Shared `options.ts` imports select-option types from `_inputs/widget-dynamic-select-input.tsx` and `_inputs/widget-select-input.tsx`; those are actual input component source edges even though their imports in `options.ts` are type-only. Their input bodies and shared options source are outside this allocation. Stats also retains the existing component-independent `stats/config.ts` schema edge.

The coordinator still owns exhaustive canonical registry/manifest assembly, shared inferred-option adoption, target consumption, and focused lint/type validation. No command, check, test, build, or runtime was executed. This handoff does not claim compiler, runtime, procedure, or target activation acceptance.
