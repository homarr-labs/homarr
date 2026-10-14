# 32: Board presentation and settings

**What to build:** Save board branding/appearance/background/custom CSS/status and other settings with intentional dirty/discard/failure semantics and canonical identity, hosting layout/access panels through single-writer contributions.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Actual settings reads/writes preserve general metadata/logo/favicon, background/colors/opacity/radius/icon color/custom CSS and status options with modify/full distinctions, safe media delivery and domain validation rather than a title-only form.
- [ ] Live document/title/theme/favicon previews restore on discard/unmount and update after successful save; changing boards never silently overwrites a dirty form or leaves another board's head state.
- [ ] Dirty save/discard/leave/pending behavior follows approved Q13 and partial-settings/layout success versus atomic commit semantics. Failed portions remain recoverable; one successful concurrent request cannot declare the whole form saved.
- [ ] Canonical results update separate viewer/document/overview/route/render effects, preserve field-attached errors and mask revoked data before revalidation; real repositories/services/endpoints enforce policy independently of controls.
- [ ] One parent settings form hosts #33's layout and #34's ACL/danger contributions through agreed callbacks. Focused future failure → retry/discard and preview-restoration regressions join actual panels/media and persisted reload behavior without claiming partial-page parity.

## Coverage

BOARD-07: primary `board.getBoardSettings`, `savePartialBoardSettings`; settings route/scoped layout, appearance/general/status form and parent assembly. #33 owns layout commands/panel, #34 access/lifecycle panel, #26 scoped board identity/cache, #24 document descriptors, #107 reviewed CSS-import contribution. Old settings URLs need no aliases.

## Required contracts

#26's canonical state/effects; #02/#04's settings repository/validation/capabilities; #22/#28's dirty-navigation/ordered handoff; #24's preview/document port; #113/#115's media/icon selectors; #33/#34's panel/completion callbacks and #08's localized form issues. Require accepted narrow interfaces, not complete producer tickets.

## Decision holds

Q13 and partial settings/layout-save semantics remain unanswered; neither universal atomic save nor retained partial success is approved. CSS/render policy, detailed locale switch/unsaved-work and SSR/cache freshness need disposition where affected. Q12 preserves existing settings/assets/references through the approved importer/upgrade path.

## Ownership

One exclusive local writer owns settings command/projection, parent form/appearance and focused regressions. Layout/access/CSS owners supply local contributions without editing this parent concurrently. #02 alone writes schema; #01 alone owns root SSR/providers/central routing/manifests. Descriptive folder-based routes/ignored helpers use proper layout/pathless/non-nested/dynamic semantics. Dispatch requires decisions, accepted contracts and allocation.
