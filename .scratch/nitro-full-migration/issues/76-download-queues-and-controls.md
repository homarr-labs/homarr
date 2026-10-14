# 76: Download queues and controls

**What to build:** Aggregate supported queue/history clients, save filters/table layouts and perform guarded pause/resume/deletion with truthful outcomes; supply the shared debounced table-layout primitive.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 15 options convert/save/reload, including hidden order/width/filter/sort/history/ratio/completion/limit values and the stored active threshold in KiB/s; board/item/kind/type validation prevents reinterpretation and unauthorized writes.
- [ ] SAB archived history/window, queues/status and partial/no-op/unsupported provider cases remain distinct; selection/clipboard/context menus work without presenting Slskd's nonexistent controls as upstream success.
- [ ] Bulk/item pause/resume and deletion check interact per actual integration before secrets; pending/error feedback and exact invalidation work, disk deletion needs explicit confirmation and ambiguous writes are not blindly retried.
- [ ] Own reusable 350ms layout debounce, flushing on unmount/key switch without read-only writes; Docker/Beszel consume it through #68's sole protected option-save wrapper. Filters/hidden/order/width survive reload without another options service.
- [ ] Exact 10s poll/stale consumer and hydration inputs include `includeArchivedHistory/historyWindowDays`; the old prefetch omission has an approved disposition. Same-kind queues isolate errors/refresh, forbidden/session data clears and cleanup cancels registrations; future focused destructive-action guard, debounce flush, units/conversion and archived-key evidence runs at scoped target gates.

## Coverage

`downloads` — 15: `columns`, `defaultSort`, `descendingDefaultSort`, `showCompletedUsenet`, `showCompletedTorrent`, `showCompletedHttp`, `includeArchivedHistory`, `historyWindowDays`, `activeTorrentThreshold`, `categoryFilter`, `filterIsWhitelist`, `applyFilterToRatio`, `limitPerIntegration`, `columnOrder`, `columnWidths`. Primary `multiSelect` input; consumes `select`, `switch`, `number`, `multiText`, `text`. Primary leaves `widget.downloads.getJobsAndStatuses/pause/pauseItem/resume/resumeItem/deleteItem`. Families `sabNzbd`, `nzbGet`, `deluge`, `transmission`, `qBittorrent`, `aria2`, `slskd`, `mock`; upstream execution stays #47/#48-owned. Exact [download evidence](../drafts/widgets.md#widget-downloads--multi-client-queuehistory-saved-table-and-safe-controls).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) under [DESIGN](../DESIGN.md), including saved/preview membership, ordinary-stale versus forbidden recovery and client/server splits.

## Required contracts

Initially unaccepted: #47/#48 queue/history/control/native-result and ambiguous-write ports; #40 execution; #04 use/interact/delete/demo policy; #68 authorized option get/save; #67 query/status/error host; #27/#28 layout/draft identity/effects; #03 history/cache; #07/#08 units/confirmation feedback; #120 DTO/keys. #78/#90 accept only the shared debounce revision. Final real queue/action/table evidence is a later join, not finished clients/all providers required to begin.

## Decision holds

Q11/Q12 options/history conversion, Q13 ordered table saves; archived-history prefetch discrepancy, Slskd unsupported/no-op presentation and action policy need explicit disposition. SSR/freshness/demo overrides remain genuine holds; Q15 applies to session transitions.

## Ownership

#76 owns download widget/action orchestration, multiSelect behavior and shared layout debounce only. #68 is common option-service primary; #78/#90 own endpoint/system-specific table semantics, #47/#48 native clients. COMPOSITION mounts contributions; record exclusive local files before dispatch.
