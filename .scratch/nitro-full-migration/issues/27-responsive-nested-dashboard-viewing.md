# 27: Responsive nested dashboard viewing

**What to build:** Render stored responsive/nested/collapsed sections and widget hosts at supported sizes, with durable collapse commands, stable focus and safe app launching.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Preserve usable durable geometry: 212×212 logical tracks, uniform canvas scale, scale-compensated 10 px visual inset, viewport-height root lanes and nested inner-width/row-pitch behavior, including mobile gutters/roles, breakpoints, resize sources and valid forced layouts.
- [ ] Nested/empty/collapsed sections reflow deterministically with correct reading order/landmarks/headings/sizing; publish pointer-coordinate and keyboard-placement geometry without replacing nesting with a flat grid.
- [ ] Own the authorized `section.changeCollapsed` service, endpoint and UI: authenticated preferences persist, anonymous preferences restore after hydration, failed writes roll back only while current, and temporary editor expansion never overwrites durable collapse state.
- [ ] Item hosts pass IDs/options/integrations/dimensions/scale/edit/ref/status, offer suspense/retry/unavailable recovery and preserve widget state across focus/portal movement without duplicate players/polling/streams.
- [ ] Focus/Escape/reduced-motion/preferences and recursive bulk-app opening respect active-layout membership, unique authorized app IDs and safe links, with truthful blocked-popup recovery; scoped placed-app descriptors unregister on board/identity change.
- [ ] Focused future nested geometry/collapse rollback/focus and safe bulk-launch regressions join actual stored boards, real collapse authorization, app lookup and widget hosts before claiming viewer completion.

## Coverage

BOARD-02: read-only geometry, layouts/lanes/breakpoints/scale/nested sections, preview sizing, focus/accessibility, item-host lifecycle, recursive section app opening and primary `section.changeCollapsed`. All 69 widget internals remain family-owned; common options belong #68. #38 consumes placed-app registration descriptors; #28 consumes geometry without another writer.

## Required contracts

#26's authorized projection/context/effects; #67's renderer/query/status/ref descriptor; #35's authorized app lookup/safe launch; #04/#02's collapse-policy/repository commands; #06's direction snapshot and #01's SSR host. Require individual accepted revisions, not completion of viewer/editor/widgets peers.

## Decision holds

SSR first-paint/personalized collapse/freshness and detailed RTL policy remain open. Anonymous-versus-authenticated collapse and popup-recovery choices need disposition; Q12 preserves stored geometry/preferences through approved conversion. No editor timing policy is assumed from Q13.

## Ownership

One local writer owns geometry/section renderer, collapse service/endpoint, hosts and focused regressions. Widget families own renderers; #26 cache, #28 queue, #68 option service remain separate. #01 alone owns root SSR/providers/central route/manifests. Descriptive folder-based routes/ignored helpers respect layout/pathless/non-nested/dynamic semantics; exclusive files and accepted interfaces precede dispatch.
