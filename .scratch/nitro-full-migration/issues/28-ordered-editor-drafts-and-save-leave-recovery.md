# 28: Ordered editor drafts and save/leave recovery

**What to build:** Enter a lazy authorized editor, move/resize items through one ordered command model and preserve failed/newer drafts through save/discard/conflict/navigation recovery under the approved timing policy.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Real permission/demo gates enforce editor URLs/controls/endpoints; validated layout/edit search activates authorized editing with server-safe viewing, lazy/prewarm/retry and truthful pressed/busy feedback.
- [ ] Scaled pointer and keyboard/numeric movement, collision/compaction, drag/resize preview and cross-section transactions retain atomic snapshots and associated layouts; cancellation leaves durable coordinates intact.
- [ ] Implement only the approved Q13 operation timing for deferred grid/item versus immediate contextual/bulk writes. Save/discard/cancel state what actually committed; do not silently promise universal undo or discard.
- [ ] One board-scoped queue orders header/contextual/bulk/external results and canonical output against latest drafts; failed optimistic writes or late completions cannot roll back over newer edits, and pending work survives or safely blocks route/session transitions.
- [ ] Dirty Back/Forward/unload/imperative navigation uses #22's blocker, with successful save/cancel bypass and save-before-return avoiding duplicate persistence or lost newer work; remote conflict and revocation obey explicit policy.
- [ ] Focused future real enter → move → save → reload and save-failure/newer-edit/revocation races verify durable authorized commands, not only a grid fixture.

## Coverage

BOARD-03: primary `board.saveBoard`, `board.updateItemLayout`; lazy grid/registry/portal editor, pointer/keyboard/resize/transfer transactions, board queue/draft session/save header, edit/layout/return URL contribution and leave recovery. #29 owns dialogs/placements, #30 bulk clients, #32 settings parent, #33 layout handoff. #68 owns option get/save rather than another editor service here.

## Required contracts

#26's board-state/effects; #27's geometry/pointer/host interfaces; #02/#04's content transaction/policy; #22's blocker/search targets; #08's overlays; #68's ordered option-command contribution. Accepted individual contracts suffice; complete-peer barriers are not native blockers.

## Decision holds

Q13 unified atomic draft versus retained mixed timing is unanswered and gates affected implementation. Partial settings/layout-save semantics and remote-conflict/SSR freshness need decisions; Q12 gates durable conversion, Q11 the concrete repository adapter. Recommendations are not approval.

## Ownership

One exclusive local writer owns queue/editor/session/commands/endpoints/UI/focused regressions. Other writers register operations, not a second persistence queue or geometry/cache implementation. #02 writes physical schema; #01 alone composes root SSR/providers/central routes/manifests. Descriptive folder-based routes and ignored helpers use proper layout/pathless/non-nested/dynamic semantics. Triage does not authorize dispatch before decisions/contracts/file allocation.
