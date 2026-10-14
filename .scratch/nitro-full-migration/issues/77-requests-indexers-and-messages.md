# 77: Requests, indexers and messages

**What to build:** Save request/indexer/message placements, render their authorized data and moderate/test/delete only permitted targets with feedback and matching refresh.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All six direct options plus zero-option requestStats placement convert/save/reload; integration/type/cardinality checks preserve status/recent-days/link targets, counts/partial failures, message format/logos/details and supported advanced states.
- [ ] Request approval/denial and notification deletion check interact for the exact provider/target, show pending/error and invalidate matching consumers; unsupported notification deletion is explicit, not a fabricated success.
- [ ] Indexer links/new-tab and test-all runtime action respect permission/edit/demo predicates, show test feedback and clean registrations; no automatic indexer polling is invented.
- [ ] Request 60s backend stale fallback and effective family refresh bind actual filters/procedures/keys; partial/empty/source errors differ from forbidden, revoked data clears and preview/hydration never widens authority. Future focused moderation/deletion guards, zero-option reads and query-isolation/conversion evidence uses disposable fixtures at scoped target gates.

## Coverage

`mediaRequests-requestList` (3): `linksTargetNewTab`, `statusFilter`, `recentDays`; `mediaRequests-requestStats` (0); `indexerManager` (1): `openIndexerSiteInNewTab`; `notifications` (2): `hideLogos`, `messageFormat`. Inputs consumed `switch`, `multiSelect`, `number`, `select`. Primary leaves `widget.mediaRequests.getLatestRequests/getStats/answerRequest`, `widget.indexerManager.getIndexersStatus/testAllIndexers`, `widget.notifications.getNotifications/deleteNotification`. Request families `jellyseerr`, `seerr`, `overseerr`, `mock`; indexers `jackett`, `prowlarr`, `mock`; messages `nextcloud`, `ntfy`, `gotify`, `mock`. Native provider duties retained #52/#50/#54/#55, not conditionally merged here. Exact [family evidence](../drafts/widgets.md#widget-requests-notifications--request-decisions-indexer-tests-and-message-deletion).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); membership/types/defaults, policy-before-secret, actual query keys, client splits and cleanup apply.

## Required contracts

Initially unaccepted: #52 request/moderation, #50 indexer/test, #54/#55 notification/delete DTOs; #40 execution; #04 use/interact/preview/demo; #67 host/query/error; #68 option service; #03 stale cache; #07/#08 time/feedback; #114 authorized message images; #120 contribution DTO/keys. Final real native/action/UI acceptance joins need evidence, not every provider finished before start.

## Decision holds

Q11/Q12 option conversion, Q13 affected saves; action/test/delete exposure and preview rules, SSR/freshness/demo overrides, and Q15 session-clearing path require applicable settled choices.

## Ownership

#77 owns these widget service/endpoint/renderer/action contributions, not Assistant request tools or operational pages/native notification clients. #68 options, #29 placement and #114 opaque images remain separate. COMPOSITION owns central mount/exports/manifests; allocate exclusive local files before dispatch.
