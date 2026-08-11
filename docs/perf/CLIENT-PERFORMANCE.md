# Dashboard performance in Chrome

Measured on the busiest board of a restored real backup: 28 items, 16 widget kinds.

## A systemic Mantine cost, found in five places

**Mantine overlay components mount their full machinery regardless of `disabled`.** A `Tooltip`,
`HoverCard` or `Popover` that can never open still creates a `Popover`, a `PopoverTarget` and a
`PopoverDropdown`. `disabled` suppresses *display*, not *cost* — so avoiding it means deciding before
rendering, not passing a prop.

That single fact accounts for five separate findings, three of them measured:

| widget | before | after |
| --- | --- | --- |
| **mediaReleases** | 340 components / 8,387 fibers | **170 / 8,057** (−50% components) |
| **calendar** | 171 components / 1,195 fibers | **75 / 907** (−56% components, −24% fibers) |
| **beszelSystemTable** | 36 components / 1,286 fibers | **18 / 1,230** (−50% components) |
| downloads, mediaRequests, app | unchanged | unchanged — their overlays are functional |

- **calendar** mounted a `HoverCard` per day cell. A month grid is ~42 cells and `disabled` is
  `isEditMode || eventsForDate.length === 0`, so most days — and in edit mode *every* day — mounted
  three components for a card that can never open. 126 of its 171 components, in a widget with only
  251 DOM nodes.
- **OverflowBadge** (shared UI in `packages/ui`) mounted a `Popover` and `Popover.Dropdown` even when
  nothing overflowed, which is the common case. Used by media-releases, releases, the docker table and
  the widget inputs, so it repeated per row wherever a list renders it. This is where the entire
  media-releases win came from.
- **beszel disk-usage** mounted a `HoverCard` per table row for systems reporting no filesystems —
  it already fell back to a plain bar inside its own target, so the overlay existed to render nothing.

### Two remount bugs

A component declared inside a render body is a **new type every render**, so React unmounts and
remounts its subtree instead of updating it.

- `beszelSystemTable` declared `PercentCell` inline and used it for three columns, while the widget
  re-renders ~1×/second from its live subscription — three cell subtrees per system rebuilt every
  second. Hoisted and memoised.
- A drag handle was passed to a child as `handle={Handle}` while its parent re-renders every frame of
  a drag, so the handle was rebuilt continuously mid-drag. Stabilised with `useMemo`.

### The audit that found them

`scripts/benchmarks/audit-widget-render.mjs` scans every widget and ranks findings by whether they sit
inside a `.map()`, since those multiply by row count. All 54 findings were triaged:

| count | pattern | outcome |
| --- | --- | --- |
| 12 | overlay-per-row | **5 fixed**; the other 7 are functional tooltips with real labels — nothing is disabled to skip, and swapping them for native `title` would change UX, not just cost |
| 11 | index-key | **all safe.** Either static text splits (`description.split("\n")`) or stateless read-only rows from user-configured JSONPath data with no stable id, where an index key is correct and avoids remounts |
| 2 | nested-component | **both fixed** |
| 29 | inline-style-per-row | **left alone.** A fresh object per row only defeats memoisation if the child is memoised, and these are not. 29 edits without a measurement is churn |

### Off-screen rendering

`mediaReleases` rendered **80 cards into a 539 px tile whose content is 7,206 px** — 7 visible, 73
off-screen, each still fetching and decoding a poster and a full-tile backdrop. Decoded bitmaps are
far larger in memory than their files, which is what made this expensive.

Fixed with `content-visibility: auto` + `contain-intrinsic-size`, plus `loading="lazy"`. Three repeats
per side:

| metric | before | after |
| --- | --- | --- |
| image requests | 135, 135, 135 | **55, 55, 56** (−59%) |
| image bytes | 12.27 MiB | **8.41 MiB** (−31%) |
| layout objects | 8346, 7815, 7815 | **5117, 4696, 4636** (−41%) |

Extracted to `offscreenRowStyle()` and applied to the other data-driven lists (rssFeed, notifications,
calendar events, media-requests). Applied to 5 of 26 `ScrollArea` widgets deliberately:
`content-visibility` costs containment work and can be wrong on self-measuring content like charts.

### Two metrics that cannot be used, and one claim withdrawn

**Chrome's board-level `JSEventListeners` is unusable here.** Across six runs of identical code it read
7905, 8000, 8166, 8179, 10360 and 17114. Its `Nodes` counter has the same problem — 23,072 on one run
against ~8,850 on the others — because it counts detached nodes awaiting collection, while
"elements under body" stayed at 6,691–6,726 throughout. Only per-widget component and fiber counts are
stable enough to compare, so those are what is reported above.

**The media-releases tooltip fix measured zero**, and is reported as such. Every release on the test
board has a description and the option is on, so all 80 tooltips are legitimately enabled and none are
skipped. The mechanism is correct; this board is not the case it helps. The −50% for that widget came
entirely from OverflowBadge.

### Idle churn is legitimate, and an earlier claim here was wrong

This description previously said ~80% of idle React commits entered at Next's `HeadManagerContext` and
that the App Router re-rendered once a second. **Both were false.** A 3-item board commits **0.0**
times per minute against 76.0 for the 28-item board — if the router re-rendered on a timer, every board
would churn. The original attribution was a tooling artefact: `fiber.actualDuration` is only populated
by a React *profiling* build, so on production every fiber fails the "did it re-render" test and the
tables come back empty, which reads as "nothing" rather than "this build cannot tell you".

Attributed properly, three Beszel widgets are 82% of idle churn — but the real rate is **1.22 commits
per second** for the whole board at **13.3 DOM mutations per commit**. That is three live-monitoring
widgets refreshing about once a second, which is what they are for. A coalescing fix measured *exactly
zero* (55 commits both sides) and was reverted.

