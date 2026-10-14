# Telemetry source-view extraction

## Writable inventory recorded before source edits

Existing presentation files, relative to `packages/widgets/src/`:

- `system-resources/component.tsx`
- `system-resources/chart/common-chart.tsx`
- `system-resources/chart/cpu-chart.tsx`
- `system-resources/chart/gpu-chart.tsx`
- `system-resources/chart/memory-chart.tsx`
- `system-resources/chart/network-traffic.tsx`
- `system-resources/chart/combined-network-traffic.tsx`
- `system-disks/component.tsx`
- `health-monitoring/component.tsx`
- `health-monitoring/system-health.tsx`
- `health-monitoring/cluster/cluster-health.tsx`
- `health-monitoring/rings/cpu-ring.tsx`
- `health-monitoring/rings/cpu-temp-ring.tsx`
- `health-monitoring/rings/gpu-ring.tsx`
- `health-monitoring/rings/memory-ring.tsx`
- `beszel-system-table/component.tsx`
- `beszel-system-grid/component.tsx`
- `beszel-alerts/component.tsx`
- `beszel-system-stats/component.tsx`
- `speedtest-tracker/component.tsx`
- `speedtest-tracker/averages.tsx`
- `speedtest-tracker/latest-result.tsx`
- `speedtest-tracker/recent-results.tsx`
- `speedtest-tracker/speed-stat-card.tsx`
- `umami/component.tsx`
- `umami/umami-content.tsx`
- `umami/umami-top-list.tsx`
- `umami/umami-events-content.tsx`
- `stats/component.tsx`

New files, relative to `packages/widgets/src/`:

- `system-resources/native-view.tsx`
- `system-resources/native-view-types.ts`
- `system-disks/native-view.tsx`
- `health-monitoring/native-view.tsx`
- `health-monitoring/native-view-system.tsx`
- `health-monitoring/native-view-cluster.tsx`
- `beszel-system-table/native-view.tsx`
- `beszel-system-grid/native-view.tsx`
- `beszel-alerts/native-view.tsx`
- `beszel-system-stats/native-view.tsx`
- `speedtest-tracker/native-view.tsx`
- `umami/native-view.tsx`
- `umami/native-view-types.ts`
- `stats/native-view.tsx`
- `rendering/telemetry.ts`

This handoff is the only scratch output owned by this lane. Shared Beszel/Common, existing business TS helpers, definitions/options/providers/context/schema/registry/manifest/package exports and all frontend adapters are excluded. No tests, comments, casts, new dependencies or nested agents are planned. Installed official declarations and existing source call sites are the API fallback because Context7 is unavailable. No checks or runtime/mount claims are made in this source-only lease; final convergence validation remains a coordinator obligation.

## Freeze

Frozen source-only return, 2026-10-11. The exact changed-file inventory is the complete inventory above: **29 existing presentation TSX files, 15 new source files, and this handoff (45 paths)**. No listed path was omitted, and no other path was edited. File moves used during extraction restore the original component path as its acquisition wrapper; no original entrypoint was deleted. This is an owned-file inventory, not a repository-wide Git status claim.

The barrel has **14 named presentation exports in 12 new TSX modules**: ten kind-facing seams, two additional Health system/cluster views, and two additional Umami top-list/no-website views. Health's kind-facing seam is a composition layout; Beszel System Stats is a **selection/layout shell only**, not its still-fetching historical/live chart renderer. Umami's no-website view is the original empty configuration state, not replacement content counted as support. There is no ten-kind support, native compatibility, closed graph, mounted renderer, runtime verification, or acceptance increment claim. Existing **23 candidates / 95 Widget bindings** remain unchanged, as do Stats **30 native candidates / 59 legacy physical holds**.

### Exact source origins

Ranges refer to the complete original files read before edits, not post-extraction line numbers. All paths in this table are relative to `packages/widgets/src/`.

| New view                                    | Original presentation moved                                                                                                                                                                            | Acquisition/effect owner retained                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system-resources/native-view.tsx`          | `system-resources/component.tsx:19-86,134-325`: chart history conversion/visibility, compact/advanced panels, title and chart layout                                                                   | Original `component.tsx`: health query, usable-data filtering, integration-key reset and dataUpdatedAt-driven bounded history. The original duplicated initial point/seed behavior remains; it was not generalized to Beszel.                                                                                  |
| `system-disks/native-view.tsx`              | `system-disks/component.tsx:20-231,261-278,288-328`: layout breakpoints, disk text/card, overflow measurement/tooltip, SMART/temperature/progress presentation                                         | Original `component.tsx`: health query, storage filtering/SMART matching, no-filesystem failure versus empty/partial-error decisions. Radius and byte-pair formatter are supplied from original services.                                                                                                      |
| `health-monitoring/native-view.tsx`         | `health-monitoring/component.tsx:32-92`: system-only, cluster-only, stacked/two-column advanced and compact tabs                                                                                       | Original `component.tsx`: integration metadata discovery, pending gate and original partition helper. Render callbacks construct original query children; keyed list children versus unkeyed single-cluster children are preserved.                                                                            |
| `health-monitoring/native-view-system.tsx`  | `health-monitoring/system-health.tsx:77,81-514`: local information-modal state, gauges, information list, disks, original uptime/file-size/SMART presentation calculations                             | Original `system-health.tsx`: system query/filtering, board radius and byte formatters. Existing exported helpers are re-exported there for existing consumers; all four rings import the pure source module, not the fetching wrapper.                                                                        |
| `health-monitoring/native-view-cluster.tsx` | `health-monitoring/cluster/cluster-health.tsx:20-36,63-241`: running counts, weighted CPU/memory totals, uptime, summary rings, resource accordion/table                                               | Original `cluster/cluster-health.tsx`: cluster query, session identity, exact durable accordion key/scope/default/filtering and local-storage updates. Accordion values/change callback are passed to presentation.                                                                                            |
| `beszel-system-table/native-view.tsx`       | `beszel-system-table/component.tsx:44-110,134-139,170-429,439-467`: size, sort state/effect, actual columns/metrics/cells, persisted-layout use and table                                              | Original `component.tsx`: system query/filter/name provenance, current source board/session permission check, save mutation/error notification, table persistence callback and real modal action. Presentation callbacks are not authority.                                                                    |
| `beszel-system-grid/native-view.tsx`        | `beszel-system-grid/component.tsx:42-442,460-538`: metric rows/cards, source metadata, metric admission by options/size, empty state and responsive grid                                               | Original `component.tsx`: query/filter/name provenance, board radius, byte formatters and real system-stats modal action.                                                                                                                                                                                      |
| `beszel-alerts/native-view.tsx`             | `beszel-alerts/component.tsx:24-39,69-299`: exact alert/history flattening/order/limits, triggered/OK sections, relative times, threshold/status descriptions                                          | Original `component.tsx`: original query-input helper, alerts query, exact runtime query registration, usable results and original byte-rate formatter. Bandwidth retains `value * 1024 ** 2` (MiB conversion), and status alerts retain duration wording.                                                     |
| `beszel-system-stats/native-view.tsx`       | `beszel-system-stats/component.tsx:41,62-82,150-335`: selection resolution, measured viewport, source controls/empty/not-found branches, exact responsive shell and StatsView presentation inputs      | Original `component.tsx`: system query/choices, source permission check, save pending/ref/rollback/settlement, historical runtime query registration and unchanged shared `BeszelStatsView` acquisition through a render callback. No shared live/history algorithm was copied.                                |
| `speedtest-tracker/native-view.tsx`         | `speedtest-tracker/component.tsx:28-84`: existing successful-source/combined-dashboard helpers, 12-hour cutoff and original sections/layout                                                            | Original `component.tsx`: dashboard query, usable results and error indicator. All four local section/chart/card descendants now receive original board radius. Existing `helpers.ts` remains untouched, including weighted averages and latest-result selection.                                              |
| `umami/native-view.tsx`                     | `umami/umami-content.tsx:49-50,52,70-276`, `umami/umami-top-list.tsx:46-81`, `umami/component.tsx:99-108`: visitor/event charts, stats, responsive surfaces, top lists and original unconfigured state | Original `component.tsx`: conditional runtime keys and responsive dimensions; `umami-content.tsx`: visitors/active/multi-event queries; `umami-top-list.tsx`: exact conditional mounted top-page/referrer queries. Frozen helper formatters/colors are passed, not copied or imported at runtime by the views. |
| `stats/native-view.tsx`                     | `stats/component.tsx:58-59,166-486`: settings/details popover state, exact metric formatting/status/loading, table/card layouts, source CSS scales and local controls                                  | Original `component.tsx`: options entries parsing/order/visibility, per-integration observers, all refresh/cache/runtime behavior, local rows/plain/table/compact/hidden/order state. Existing table/details/loading/format/config files remain untouched.                                                     |

### Preserved transport, state and layout ownership

- System Resources retains 15 compact / 60 advanced points, the integration-key reset, GPU averaging, null-network exclusion, total-memory byte domain, CPU/GPU 0-100 domains, network 20% headroom/combined domain, tooltip cursor index, measured-height gates, opacity/radius and exact pixel-height/grid behavior. `common-chart.tsx` now takes typed presentation props and `Record<string, unknown>[]`; it no longer acquires Boards.
- System Disks retains source error admission, filters, byte-pair formatters, clamping, SMART fallback, Celsius, tooltip overflow measurement and `ResizeObserver` cleanup. The old offsetParent assertion was unnecessary and removed without changing the measured Element.
- Health retains original gauges/disks/information modal, weighted running-node aggregates, source uptime/size formatting, durable session-scoped accordion state and tiny/advanced breakpoints. The untouched cluster resource popover still needs the real Settings formatter provider; it is not replaced with a fabricated context.
- Beszel table/grid retain original status/metric visibility, source names, CPU/memory/disk/GPU/load/network/temp/battery/services/uptime/agent values, sizes and styles, column persistence, modal inputs and edit-mode display behavior. The table's existing arbitrary accessor lookup and string/numeric comparator remain, expressed without a key cast; column filtering uses a type predicate instead of an assertion. Canonical asc/desc and six source time periods are expressed without type casts; canonical option typing must still pass convergence typechecking.
- Beszel historical/live acquisition stays exclusively in the excluded shared graph. This lane does not change visibility gating, iterator teardown, 60-record window or historical/includeDocker query implementation, and creates no synthetic live samples. The shell forwards the same chart visibility, system/integration identity, period, columns, measured available height and switch-to-1h callback.
- Speedtest retains the existing weighted helper, latest source choice, bits/second versus ms units, 12-hour strict cutoff, download-positive filtering, real timestamps, two-hour/midnight/top-date ticks, axis rounding/domains, legends and tooltips. Tooltip functions now use installed Recharts contextual types instead of explicit any/assertions; card measurement and chart measurable-size gates remain.
- Umami retains conditional website/selected-events/top-view/advanced acquisition, sorted event names, existing helper's 60-second/demo-disabled query policy, current active visitor data path, visitors/events values and multi-event totals, source empty states, date labels, chart style/type/overlay and CSS. Runtime `umami-utils.ts` acquisition is not in the new view closure: formatting functions/colors are explicit inputs, and its types are imported type-only. A separate producer must supply those genuine functions to a native consumer rather than copy the mixed helper.
- Stats retains one catalog observer for each deduplicated integration (`staleTime: 60_000`, no retry) and one snapshot observer for each visible source, or each integration in advanced mode (`staleTime: 30_000`, 60-second polling, no background polling, demo/focus policy and no retry). The view receives those same ordered result arrays and has no query observer, source-state publication or registry. Source pending/retry maps remain in the original wrapper; success still performs mutate → await scoped cancel → set snapshot → cooldown; failure still records prior timestamp → cooldown → await scoped invalidate; finally still clears pending/decrements refreshing. Forced refresh, shared-source recovery, source failure/loading/unavailable precedence, cache-at-invocation runtime status and minimum timestamp remain unchanged.

### Remaining closure blockers and holds

1. **Beszel full StatsView producer is missing from this lane.** `beszel/_shared/stats-view.tsx`, `use-live-stats.ts` and `system-stats-modal.tsx` are excluded. Historical fetching, live iterator/visibility/60-record lifecycle and modal chart content require that separately reviewed producer. `NativeBeszelSystemStatsView.renderStats` is a real source render dependency, not a fake hook or browser-safe label for the shared fetching renderer.
2. **Shared Common/UI/Settings/i18n graph remains independently held.** Source views still reuse frozen `common/{empty-state,query-state-indicator,homarr-data-table,use-persisted-table-layout}` and Beszel `colors/format/disk-usage`, plus the existing UI size/theme barrel, translation hooks and Health cluster resource table/popover. Local extraction removes direct Next/tRPC/Auth/Board acquisition from the new view modules and their edited local descendants, but this is not a transitive graph acceptance of shared barrels or current mutable peer producers. The source Settings formatter requirement in the untouched cluster popover and source relative-time/Day.js setup still need actual providers. A native host must supply genuine error/modal/persistence/formatter/translation/style lifetimes; no fake providers were added.
3. **Native DTO/options compatibility is unverified.** Type-only source `RouterOutputs`, `WidgetComponentProps`, Integration/Beszel row types, Stats catalog/snapshot types and shared StatsView props are retained instead of nominal casts or a competing contract. Actual native-output compatibility, canonical options/time-period inference and every untouched definition/option-provider/manifest closure require independent review/typechecking; they are not established by this source move.
4. **No adapter or central composition exists here.** The new named barrel is source-only. No package exports, bindings, registry, loader, host, native query registration, frontend renderer factory, public provider, source algorithm helper or acceptance ledger was changed. Current authorization/admission/retirement, table option persistence and modal services stay with their owners; presentation visibility never authorizes access.
5. **All existing execution holds persist.** Stats 30/59 physical/trust/lease/settlement guards, Q16/Q17/Q18, provider availability, forbidden-data retirement, production composition and native/runtime/browser proof remain held. No frontend-specific observer registry was added and no existing 23 renderer port was repeated.

### Verification limits

Direct dependencies were checked in the frozen `packages/widgets/package.json`. API fallback reads used official installed `@mantine/core` 9.6.0 package metadata, `@mantine/charts/lib/AreaChart/AreaChart.d.ts`, `ChartTooltip/ChartTooltip.d.ts`, and `recharts/types/component/Tooltip.d.ts`, alongside the original declared-library source call sites. No library was added or installed; Context7 was not called because the quota was already exhausted. Impeccable product guidance was read for identity preservation; there was no redesign, CSS edit, contrast/UX acceptance or browser claim.

Only source reads/searches, owned-file patching and the explicitly requested session-directory move were used. No shell/check commands, lint/typecheck/build/install/test, application import/evaluation, live network/provider/SQL/browser, environment/credential/current-data outputs, listeners, Git mutations or nested agents were performed. Mandatory final lint/typecheck and targeted native/runtime/browser validation must happen after convergence under a separately authorized lease, not be inferred from this freeze.
