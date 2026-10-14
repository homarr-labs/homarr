# 33: Canonical layouts and settings/editor handoff

**What to build:** Create/select/edit/reset responsive layouts and move settings → editor → settings through canonical IDs/coordinates without partial-save races or competing geometry ownership.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Layout role/breakpoint/columns/gutters/resize-source/add/delete/reset round-trip through real authorized services and preserve durable nested placements/preview scale; approved mobile normalization and invalid/cyclic sources fail safely.
- [ ] Backend results supply canonical layout IDs and coordinate projections. Browser clients consume #27's geometry and never independently implement persistence projection or retain temporary IDs after success.
- [ ] Save-before-edit waits for the canonical successful result before entering the chosen layout; failure stays in settings with its draft, not a false successful editor handoff.
- [ ] Editor save/cancel returns to the agreed settings panel/focus/state using #22's validated layout/edit/return search. Explicitly decide an anchored panel/tab or retirement of unconsumed source tab state rather than assuming it already worked.
- [ ] Delete/reset reconciles active overrides/previews/drafts and dependent widget inputs through #28's ordered effects under approved partial-failure/concurrent-newer-edit policy; focused future real settings → editor → settings and failed-save regressions prove durability and recovery.

## Coverage

BOARD-08: primary `board.saveLayouts`, `resetLayout`; layout panel/preview/selection, roles/breakpoints/columns/gutters/resize sources, canonical command projection and settings/editor return. #27 owns geometry, #28 queue, #32 parent settings form. Preserve all durable layout relationships through explicit conversion, not required old URL/query aliases.

## Required contracts

#27's geometry/resize-source interface; #02/#04's canonical layout transaction/policy/result; #26's identity/effects; #28's save/cancel/ordered handoff; #32's panel/dirty callbacks; #22's return normalization and #68's affected option-input invalidation. Only exact accepted revisions gate readiness.

## Decision holds

Q13 and partial-settings/layout commit/failure semantics are open. Source generated-but-unconsumed tab state, mobile gutter normalization and invalid-source behavior require disposition. Q12 governs layout/reference conversion; detailed SSR previews and locale/direction policy remain held where consumed.

## Ownership

One local writer owns canonical layout services/endpoints/panel/handoff/focused regressions; no edits to geometry, queue or settings parent. #02 writes physical schema; #01 alone composes root SSR/providers/central routes/manifests. Local routes use descriptive names/folders, ignored helpers and proper layout/pathless/non-nested/dynamic semantics. Accepted contracts, decisions and exclusive allocation precede dispatch.
