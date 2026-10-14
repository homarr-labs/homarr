# 78: Container cards and operational modals

**What to build:** Select permitted Docker endpoints, persist filtered/sorted container cards/table and hand off inspect/log/control/add-app operations to their sole runtime owners.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 11 options convert/save/reload; authorized endpoint selector, row/default sorting, whitelist/case/wildcard filters and hidden/order/width state follow endpoint changes without accepting integration IDs or another board's placement.
- [ ] Inspect/log/control modals enforce endpoint-specific permission/confirmation/pending/error and bounded stream disposal through #116; add-app completes the real #35 resource form, not a mock button.
- [ ] Supporting endpoint/container inventory uses effective 30s refresh and mutation invalidation; actual endpoint set/filter keys isolate pending/partial/stale/error, and forbidden/session changes clear affected inventory and subscriptions.
- [ ] #76 debounce flush/read-only suppression through #68 options, focus/geometry and approved hydration/client modal boundaries avoid duplicate operational subscriptions. Future focused denied endpoint/action, table conversion and close/abort/add-app recovery evidence uses disposable endpoints at scoped target gates.

## Coverage

`dockerContainers` — 11: `endpointIds`, `columns`, `enableRowSorting`, `defaultSort`, `descendingDefaultSort`, `containerFilter`, `filterIsWhitelist`, `filterCaseSensitive`, `filterAllowWildcards`, `columnOrder`, `columnWidths`. Primary `dynamicMultiSelect` input; consumes `multiSelect`, `switch`, `select`, `multiText`, `text`. Consumes #116-owned `docker.getContainers/getEndpoints/refreshInventory` and action/log modal ports; #35 app forms. Docker is its endpoint domain, not one of the 89 IntegrationKinds. Exact [Docker widget evidence](../drafts/widgets.md#widget-docker--endpoint-scoped-containers-persisted-layout-and-operational-modals).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); saved-placement/kind/option validation, current authority, exact-key recovery and server/client separation apply.

## Required contracts

Initially unaccepted: #116 endpoint/inventory/action/log lifecycle; #35 app-create handoff; #04 endpoint/preview policy; #67 host/query/error; #68 option get/save; #76 debounce; #27/#28 geometry/draft effects; #08 confirmation/feedback; #120 query contracts, #124 event framing if log consumer needs it. Real Docker/service/modal evidence is a later join; no all-integrations barrier.

## Decision holds

Q11/Q12 saved options, Q13 table/draft timing; Q14 only actual log-host handoff, Q15 session continuity where relevant. Endpoint action/preview policy, SSR and freshness/demo behavior remain scoped holds.

## Ownership

#78 owns widget selector/table/operational-modal invocation and invalidation, #116 real Docker runtime/actions/log producer, #35 app resources, #76 debounce and #68 options. COMPOSITION mounts central routes/streams/dependencies; exclusive local allocation precedes dispatch.
