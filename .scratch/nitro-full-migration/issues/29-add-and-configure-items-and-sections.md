# 29: Add and configure items and sections

**What to build:** Add/duplicate/configure/move/remove items, nested sections and containers through real persisted placements and route-independent app/integration/widget dialogs using the shared option editor.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] One-shot add UI state opens once and is consumed safely. Authorized add/duplicate generates fresh IDs, first-empty/collision-safe placements and canonical results, representing unavailable/disabled/legacy definitions and integration eligibility explicitly.
- [ ] Item options, advanced title/classes/border/integration and contextual actions consume #68's validated shared option service/editor and kind schemas; do not create another option get/save owner or rewrite renderers/providers.
- [ ] Section/container create/edit/remove and affected nested placements/layouts use validated authorized commands and approved atomic/timing semantics, confirmations, permitted undo and numeric/keyboard move/resize fallback.
- [ ] Nested app/integration create → selection → placement dialogs preserve pending/errors, close interceptors, cancel, focus/return-focus and recoverable drafts without forced management redirects or importing management pages.
- [ ] Deferred/immediate contextual operations follow #28's approved queue. Failed save/revocation never falsely succeeds or exposes private stale state; focused future add/configure/nesting and failed-completion regressions join real persistence and shared editors.

## Coverage

BOARD-04: primary `board.addItem`; add/duplicate/item/context menus, section/container nesting, placement completion, advanced options/integration-selection hosting and one-shot add trigger. #35 owns app pickers/forms; #41 integration forms; #68 owns `widget.options.getWidgetOptionSettings`/`saveItemOptions`; family schemas/inputs remain family-owned. #27 owns collapse, not this ticket.

## Required contracts

#28's ordered operation/draft interface after relevant Q13 decision; #27's geometry; #67's definition/host metadata; #68's option editor/save interface; #35/#41's canonical creation/selection callbacks; #08's modal ports and #04/#02's placement policy/transactions. Exact accepted revisions, not whole peer completion, control start readiness.

## Decision holds

Q13 gates operation timing, discard/undo and option-save joins. Partial settings/layout behavior matters only where consumed; source option validation, definition eligibility and unsafe/ambiguous actions require explicit intended-policy disposition. Q12 preserves stored placements/options through the chosen conversion.

## Ownership

One local writer owns board placement/domain command contributions, dialog hosts and focused regressions; never edits sibling picker/editor internals, geometry or queue. #02 alone writes physical schema; #01 alone owns root SSR/providers/central routing/manifests. Descriptive folder-based local routes use ignored helpers and proper layout/pathless/non-nested/dynamic semantics. Record exclusive allocation and accepted contracts before dispatch.
