# 90: Systems and alert inventory

**What to build:** Save Beszel system table/grid metrics and alert history, reload layouts and open the same integration-qualified system's shared historical/live detail surface with guarded action handoffs.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 30 options convert/save/reload with placement/type/compatible selection checks; filters/sort/visibility/history bounds and qualified IDs persist, table hidden/order/width debounce flushes through #76/#68 without read-only writes.
- [ ] Table/grid CPU/memory/disk/GPU/load/network/temp/battery/services/uptime/agent values preserve units, absent sensors and per-integration failures; no advanced-focus flag is invented merely because table/grid can open detail modals.
- [ ] Row/tile detail opens the exact authorized system through #91's sole renderer and closes/aborts correctly; provider actions, if surfaced, require #64-owned interact/confirmation ports and truthful feedback rather than duplicated runtime or invented controls.
- [ ] Inventory/alerts refresh/status/recovery and selected request-local prefetch/hydration use exact integration/system/history keys and shared-query reuse; forbidden/session clearing and cleanup create no per-row background streams. Future focused qualified handoff, layout conversion, history limits and denied/close action evidence runs at scoped target gates.

## Coverage

`beszelSystemTable` (16): `statusFilter`, `sortBy`, `sortDirection`, `showCpu`, `showMemory`, `showDisk`, `showGpu`, `showLoadAvg`, `showNet`, `showTemp`, `showBattery`, `showServices`, `showUptime`, `showAgent`, `columnOrder`, `columnWidths`; `beszelSystemGrid` (12): `statusFilter`, `showCpu`, `showMemory`, `showDisk`, `showGpu`, `showLoadAvg`, `showNet`, `showTemp`, `showBattery`, `showServices`, `showUptime`, `showAgent`; `beszelAlerts` (2): `showHistory`, `maxHistoryItems`. Inputs consumed `select`, `switch`, `text`, `number`. Primary `widget.beszel.getSystems/getAlerts`; #91 also consumes discovery rather than becoming another getSystems owner. Families `beszel`, `mock`. Exact [inventory evidence](../drafts/widgets.md#widget-beszel-inventory--system-tablesgrids-and-alert-history-with-detail-handoff).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); saved/preview authority, exact query ownership, ordinary-stale versus forbidden clearing and browser/server splits apply.

## Required contracts

Initially unaccepted: #64 systems/alerts/auth/action DTOs; #91 qualified detail renderer/cancellation interface; #76 table debounce; #68 options; #40 execution; #04 use/interact/preview; #67 host/query/status; #03 cache; #07 units/time; #120 typed contributions. Inventory can start against accepted discovery/detail contracts; real shared historical/live drill-down is a later join, not #91 completion as a native blocker.

## Decision holds

Q11/Q12 qualified options/layout conversion, Q13 table save timing; Q14 only real live-detail host path, Q15 session transitions where relevant. Guarded action policy, SSR/selective prefetch and freshness/demo behavior require disposition.

## Ownership

#90 owns discovery/alert widget services/renderers and detail-entry wiring; #91 sole stats/detail/chart/live consumer, #64 upstream/auth/actions, #76 debounce and #68 options. COMPOSITION central mounts remain sole-writer; allocate local files exclusively before dispatch.
