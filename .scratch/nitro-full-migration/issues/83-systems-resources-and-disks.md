# 83: Systems, resources and disks

**What to build:** Save capability-aware system/cluster/volume sections and render meaningful resource/disk charts with preserved temperature, storage and historical units.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 17 options convert/save/reload: temperature/CPU/memory/GPU/uptime/filesystem, volume/cluster sections/default tabs, charts/shadow/labels and disk temperature/display/background controls retain their original type/unit/refinement meanings.
- [ ] Server compatibility/cardinality/capability checks choose system or cluster correctly; Proxmox never enters system-only resource/disk reads, unavailable sensors/volumes differ from zero/empty and selected qualified volume IDs remain durable.
- [ ] Actual authorized storage selector and health/cluster results support partial providers/history/advanced layouts and share upstream health data without issuing unsupported methods or creating a second connection/history owner.
- [ ] Effective 10s refresh uses actual integration-set/volume/query identities; stale/retry/forbidden handling, approved request-local hydration/client charts and focus cleanup preserve histories without duplicate calls. Future focused unsupported-capability, volume conversion, units and exact-key/revocation evidence runs at scoped target gates.

## Coverage

`healthMonitoring` (10): `fahrenheit`, `cpu`, `memory`, `gpu`, `showUptime`, `fileSystem`, `visibleStorageVolumes`, `visibleClusterSections`, `defaultTab`, `sectionIndicatorRequirement`; `systemResources` (3): `hasShadow`, `visibleCharts`, `labelDisplayMode`; `systemDisks` (4): `showTemperatureIfAvailable`, `displayMode`, `showBackgroundBar`, `visibleStorageVolumes`. Primary `integrationMultiSelect` input/shared health-query/volume consumer; consumes `switch`, `multiSelect`, `select`. Primary `widget.healthMonitoring.getSystemHealthStatus/listStorageVolumes/getClusterHealthStatus`; consumes `integration.byIds` (#41). Health `openmediavault`, `dashDot`, `truenas`, `unraid`, `glances`, `synology`, `proxmox`, `mock`; resources same excluding `proxmox`; disks `dashDot`, `openmediavault`, `truenas`, `unraid`, `synology`, `mock`. Source-only listStorageVolumes retains authorized consumer/disposition. Exact [health evidence](../drafts/widgets.md#widget-health--capability-aware-system-cluster-and-disk-dashboards).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); placement/kind/default/nullish validation and current use-before-secret/preview policy apply.

## Required contracts

Initially unaccepted: #57 host/storage/history, #58 Proxmox cluster, #63 TrueNAS connection/result capabilities; #41 integration projections; #40 execution; #03 history/cache; #04 read/use/preview; #67 host/query; #68 options; #07 units/time; #120 typed contribution. Real TrueNAS/DashDot/history/widget joins are required only where consumed and later than narrow start-contract acceptance, never all 89 providers.

## Decision holds

Q11/Q12 stored volume/options conversion, Q13 affected saves; preserved sensor/volume repair behavior, SSR/client chart policy and freshness/demo overrides remain held. Q15 affects sensitive session transitions only.

## Ownership

#83 owns three widget reads/renderers, shared health consumer and volume input; providers own native histories/connections. #68 options, #29 placement, #03 backing and COMPOSITION central assembly stay exclusive; record local allocations before dispatch.
