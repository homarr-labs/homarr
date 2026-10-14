# 26: Authorized board and home resolution

**What to build:** Open public/private/home boards by safe authorized projection and canonical identity, with one board-state/cache authority, an accessible switcher and denied/missing/deleted recovery.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Resolve names case-insensitively to immutable IDs and encoded dynamic targets without rebuilding on create/rename. Both home entry capabilities implement approved device-specific user → desktop fallback → ordered groups → everyone → instance precedence with live access checks.
- [ ] Board reads, existence/selection/group/public catalogs and previews expose only authorized projections, mask inaccessible existence and implement approved anonymous login-return versus authenticated missing/denied recovery through real server endpoints.
- [ ] One provider-scoped cache separates durable structure, personalization, capabilities, layout/viewport and widget freshness; simultaneous routes/previews remain isolated without module-global names or shared private bootstrap.
- [ ] Switcher keyboard/search/fresh-on-open, home/mobile badges and empty/setup guidance use actual permitted boards and #23's allowed affordances, not mandatory populated fixtures.
- [ ] Read/home/catalog/route/document/render/policy effects are declared separately for UI, API and Assistant mutations. Focused future home-precedence, direct private denial and stale-identity/revocation regressions join real durable services and the viewer rather than claiming fixture-only parity.

## Coverage

BOARD-01: primary `board.exists`, `getPublicBoards`, `getBoardsForGroup`, `getAllBoards`, `getHomeBoard`, `getBoardByName`; home/named entry and scoped layouts/not-found, switcher/previews, viewer shell/control slots and board provider/cache/updater. #31 owns home-setting orchestration; #16/#15/#17 own user/group/instance writes. #27 owns geometry, #28 editor commands.

## Required contracts

#04's board-view/existence-masking policy; #02's canonical board/references repository; #15/#16/#17's ordered/device defaults projections; #27's geometry/item-host and #67's widget-render descriptor; #22's targets; #03's generation/invalidation and #01's request-local bootstrap/effects. Accept only required revisions, not complete producers.

## Decision holds

Detailed SSR populated/placeholder first paint, staleness, personalized cache and remote-change/revocation semantics remain open. Target-user/public home policy, anonymous recovery and source discrepancies need explicit disposition. Q12 governs old-content/reference conversion; Q11 only concrete adapter choice, not assumed Drizzle/db0 approval.

## Ownership

One exclusive local writer owns board read/home/projection, provider/cache/updater and viewer entry/focused regressions; other writers consume slots/effect interfaces. #02 alone owns physical schema; #01 composes root SSR/providers/central routes/manifests. Local routes use descriptive folder-based names, ignored helpers and proper layout/pathless/non-nested/dynamic semantics. No old URL alias requirement; dispatch waits for accepted contracts and allocation.
