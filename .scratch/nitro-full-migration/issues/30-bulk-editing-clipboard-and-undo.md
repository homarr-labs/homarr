# 30: Bulk editing, clipboard and undo

**What to build:** Reliably multi-select, copy/paste with fresh IDs, move/delete across sections and undo through the approved board command model without partial pastes or older failures erasing newer work.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Selection/toolbar/keyboard lifecycle works across edit entry/exit/Escape without hijacking input/contenteditable paste, text selection or unrelated shortcuts.
- [ ] Untrusted clipboard payloads validate supported durable item/options/integration/layout relationships, bounds and eligibility, generate fresh IDs and apply all-or-none local paste; malformed content leaves state unchanged and reports a useful error.
- [ ] Bulk move/delete/paste across nested sections/layouts uses actual authorized command services and deterministic geometry under #28's Q13-approved timing rather than an independent queue.
- [ ] Undo explicitly compensates an already committed write or restores an unsaved draft according to policy; newer unrelated edits survive undo/rollback, while permission/demo gates and notifications/sounds reflect actual success.
- [ ] Focused future copy → paste → move/delete → undo → save/reload, malformed clipboard and failed-write/newer-draft scenarios verify real persistence, not a clipboard-only UI demonstration.

## Coverage

BOARD-05: edit selection context/toolbar, validated clipboard encoding, fresh-ID paste, bulk delete/move/undo and sound/notification preference consumers. #28 owns ordering/persistence/save, #27 geometry, #29 operation/placement descriptors and #68 shared option validation. External format compatibility is not required, but supported durable content must remain deliberately convertible.

## Required contracts

#28's operation/queue/undo/result/effect interface; #27's geometry; #29's placement operation descriptors; #68's supported option validation; #02/#04's compound transaction/authorization and #08/#16's notification/preferences. Individual accepted revisions suffice; no whole producer completion is assumed.

## Decision holds

Q13 is unresolved for immediate/deferred timing, compensating undo and discard. Clipboard retention/eligibility/limits and source discrepancy dispositions need approval where changed; Q12 controls durable/serialized conversion. Remote conflicts and cached revocation require the agreed SSR/state policy, not presumed fanout.

## Ownership

One exclusive local writer owns bulk validation/domain contributions, selection/clipboard/undo clients and focused regressions, consuming the existing queue and geometry. #02 alone owns physical schema; #01 alone composes root SSR/providers/central routes/manifests. Any local route uses descriptive folder-based names, ignored helpers and proper layout/pathless/non-nested/dynamic semantics. No dispatch before accepted contracts, relevant decisions and file allocation.
