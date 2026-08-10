# Dashboard performance in Chrome

Measured on the busiest board of a restored real backup: 28 items, 16 widget kinds.

## Where the board's cost actually is

`scripts/benchmarks/measure-widget-cost.mts` attributes DOM nodes and React fibers to each widget by
walking the fiber subtree hanging off its DOM node. Totals do not tell you what to fix; this does.

Board totals: **9,293 DOM nodes, 8,165 event listeners, 86.3 MiB JS heap, 28 widgets.**

| nodes | each | fibers | each | n | widget kind |
| --- | --- | --- | --- | --- | --- |
| **2,951** | 2,951 | **8,387** | 8,387 | 1 | **mediaReleases** |
| 1,156 | 1,156 | 3,231 | 3,231 | 1 | beszelSystemStats |
| 451 | 451 | 1,286 | 1,286 | 1 | beszelSystemTable |
| 393 | 393 | 1,204 | 1,204 | 1 | mediaRequests-requestList |
| 313 | 313 | 669 | 669 | 1 | beszelSystemGrid |
| 265 | 265 | 900 | 900 | 1 | downloads |
| 251 | 251 | 1,195 | 1,195 | 1 | calendar |
| 177 | 177 | 390 | 390 | 1 | dockerContainers |
| 88 | 8 | 528 | 48 | 11 | app |
| 62 | 21 | 297 | 99 | 3 | umami |

**One widget is 44% of the board's DOM.** `mediaReleases` contains **1,935 Mantine `Box`
components** on its own.

## Why: it renders 13× more than the tile can show

Measured directly on that widget:

| | |
| --- | --- |
| tile height | **539 px** |
| content height | **7,206 px** |
| cards rendered | **80** |
| cards visible | **7** |
| nodes per card | 34 |
| `<img>` elements | 80 |
| `<svg>` / `<path>` | 160 / 560 |

The component is `releases.map(...)` with **no cap** — every release the integrations return becomes
a card. So 73 of 80 cards are entirely off-screen, costing ~2,480 DOM nodes, ~7,600 fibers, and a
poster plus a CSS backdrop image each. Decoded bitmaps are far larger in memory than their files, and
this is the expensive part.

### The fix

`content-visibility: auto` with `contain-intrinsic-size` on each card, plus `loading="lazy"` on the
poster. The browser then skips layout, paint, raster **and background-image fetch** for off-screen
cards. Nothing leaves the DOM, so scrolling and in-page search are unchanged; the intrinsic size stops
the scrollbar jumping.

Three repeats per side, identical restored data:

| metric | before | after | |
| --- | --- | --- | --- |
| image requests | 135, 135, 135 | **55, 55, 56** | **−59%** |
| image bytes (declared) | 12.27 MiB | **8.41 MiB** | −31% |
| layout objects | 8346, 7815, 7815 | **5117, 4696, 4636** | **−41%** |

**Not established, stated because a single run suggested otherwise:** JS heap did not clearly improve
— 46–88 MiB before against 74–86 MiB after, a 2× spread on the before side. This is expected, since
decoded image memory lives **outside** `JSHeapUsedSize`, so the saving from 81 avoided image fetches
is invisible to that metric. Task duration and time-to-settled overlap and support no conclusion.

## Idle churn is widget-driven, and legitimate

An idle board commits **73–96 times per minute**, which earlier rounds attributed to the App Router
re-rendering once a second. That was wrong — see the correction in
[REJECTED.md](./REJECTED.md#coalescing-beszel-subscription-updates--measured-exactly-zero) and
[METHODOLOGY.md](./METHODOLOGY.md).

| board | items | idle commits/min |
| --- | --- | --- |
| `hey` | 0 | **0.0** |
| `footbol` | 3 | **0.0** |
| `default` | 28 | **76.0** |

A 3-item board commits zero times per minute. Attributed by DOM mutation
(`measure-widget-churn.mts`), three Beszel widgets account for **82%** of it — but the real rate is
**1.22 React commits per second** for the whole board at **13.3 DOM mutations per commit**. That is
three live-monitoring widgets refreshing about once a second, which is what they are for. Not a
defect.

## Earlier client wins

| change | effect |
| --- | --- |
| one shared board context menu instead of one per item | **−23% listeners, −31% fibers** |
| `useTimeAgo` comparing before `setState` | correctness fix; idle commits unchanged, recorded as *not* a measured win |

## What remains on the client

- **`beszelSystemStats` at 1,156 nodes / 3,231 fibers** is the next largest single widget. Its cost is
  chart SVG (`<g>×317`, `<path>×98`), which is harder to reduce without changing what it draws.
- **`documents` reads 18–32** depending on the run. Not yet investigated; each document carries its
  own overhead.
- **The same map-everything pattern** appears in `mediaRequests-requestList` (393 nodes),
  `beszelSystemTable` (451) and `downloads` (265). Smaller instances of the widget fixed above.
