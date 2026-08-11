# Widget-by-widget audit

Every widget in `packages/widgets/src`, worked through one at a time. 50 widgets, 22,726 lines.

The point of doing this exhaustively rather than opportunistically: the two largest client wins so far
(`OverflowBadge`, `content-visibility` on media-releases) were both found in widgets nobody suspected,
and both turned out to be *shared* problems that repeated across many widgets. A sweep finds the
pattern; a spot-check finds the instance.

## How the list is built

`scripts/benchmarks/widget-inventory.mjs` reads every widget and records the signals that predict a
render problem — rows multiplied by `.map()`, overlays, image sites, whether a scrolling list renders
lazily, memoisation, live subscriptions, refetch interval — then ranks by a weighted score that
prefers repetition over size. A per-row overlay in a scrolling list outranks a large file that renders
once.

Every column is a **signal, not a defect**. A widget with 6 maps and no memoisation is perfectly fine
if it renders three rows. The ranking decides reading order; the verdict comes from reading the code.

Two companion scripts: `audit-widget-render.mjs` finds specific anti-patterns and ranks them by
whether they sit inside a `.map()`, and `measure-widget-cost.mts` counts components and fibers per
widget on a real board.

## The systemic finding this pass: inactive tab panels render in full

**Mantine's `Tabs` keeps inactive panels mounted by default.** In Mantine 9 on React 19 that is
implemented with `<Activity>`, which preserves state and unmounts effects but *still builds the entire
subtree*. So a widget with two tabs pays for both, forever, while showing one.

Four widgets use `Tabs`. Two were costing real work and are now `keepMounted={false}`; two must keep
their panels mounted and are left alone:

| widget | panels | verdict |
| --- | --- | --- |
| `health-monitoring` | system view + cluster view | **fixed** — two live monitoring views were both built; only one is ever visible |
| `media-missing` | missing + queued media cards | **fixed** — both tabs built their full card list, each card with a poster and a blurred backdrop |
| `custom-api` | user-authored JSX | left mounted — panels can hold user component state, which unmounting would discard |
| `widget-edit-modal` | form sections | left mounted — unmounting would reset half-filled form fields |

`health-monitoring` is the worse of the two: its panels are the system and cluster monitors, so a
board showing one was building the other's whole tree as well.

## Changes made

| widget | change | why |
| --- | --- | --- |
| `health-monitoring` | `keepMounted={false}` | the hidden monitoring view was fully built |
| `media-missing` | `keepMounted={false}` | both tabs built every card |
| `media-missing` | `offscreenRowStyle(CARD_HEIGHT[density])` | renders every card into a scrolling tile; the card height is fixed per density, so the intrinsic size is exact rather than a guess |
| `media-missing` | `loading="lazy"` on the poster | a poster per card, all fetched regardless of scroll position |
| `calendar` | inline SVG instead of `placehold.co` | a failed poster made a **third-party network request** from a self-hosted dashboard, once per failing event, to draw a grey square |
| `rssFeed` handler | logger instead of raw `console.debug` | logged the entire serialised feed entry per entry, unsuppressable by log level |

The `placehold.co` fallback is the one I would call a bug rather than a cost: it fails on any install
without internet access, which is a normal way to run Homarr.

## The checklist

Verdicts: **fixed** — changed here or in earlier passes · **clean** — read, nothing worth changing ·
**triaged** — findings examined and deliberately declined, reason recorded · **signals** — signals are
benign, not read line by line.

| ✓ | # | widget | LOC | verdict | note |
| --- | --- | --- | --- | --- | --- |
| [x] | 1 | `downloads` | 1525 | clean | top of the ranking, and the flag was wrong: it memoises data, sorting, columns, sizes and stats. Renders via `DataTable`; list is bounded by active downloads |
| [x] | 2 | `media-transcoding` | 521 | triaged | 2 overlays per row, both functional tooltips with real labels |
| [x] | 3 | `dns-hole` | 761 | triaged | icons render through `MaskedOrNormalImage`, whose default branch is a CSS mask, so `loading="lazy"` does not apply |
| [x] | 4 | `patchmon` | 1154 | triaged | per-row tooltip is functional |
| [x] | 5 | `beszel` | 1186 | fixed | disk-usage mounted a `HoverCard` per row for systems reporting no filesystems |
| [x] | 6 | `health-monitoring` | 1250 | **fixed** | hidden tab panel built its whole tree |
| [x] | 7 | `media-requests` | 542 | fixed | `content-visibility` + `loading="lazy"` on both images |
| [x] | 8 | `tracearr` | 445 | clean | poster is a CSS background per stream card, and the list is active streams — a handful |
| [x] | 9 | `custom-api` | 1014 | triaged | 6 index keys, all safe: stateless read-only rows from user JSONPath data with no stable id |
| [x] | 10 | `firewall` | 334 | triaged | 4 inline-style-per-row, children not memoised so nothing is defeated |
| [x] | 11 | `releases` | 817 | fixed | `OverflowBadge` mounted a `Popover` per row even with nothing to overflow |
| [ ] | 12 | `coolify` | 752 | signals | scrolls without lazy; icon is a fixed constant URL, not per-row data |
| [ ] | 13 | `notebook` | 1189 | signals | rich-text editor — self-measuring content, where `content-visibility` is actively wrong |
| [ ] | 14 | `umami` | 595 | signals | top-list could be long; worth a closer look |
| [ ] | 15 | `traefik` | 289 | signals | router/service list could be long |
| [x] | 16 | `weather` | 481 | triaged | per-row overlay is a functional tooltip |
| [ ] | 17 | `system-resources` | 568 | signals | 14 maps, no memoisation |
| [x] | 18 | `app` | 356 | triaged | icon is a masked image; single icon per widget, not a list |
| [ ] | 19 | `beszel-alerts` | 288 | signals | alert list could be long |
| [ ] | 20 | `beszel-system-stats` | 220 | signals | — |
| [x] | 21 | `media-missing` | 261 | **fixed** | tabs, lazy poster, off-screen cards |
| [ ] | 22 | `media-server` | 457 | signals | 5s refetch |
| [x] | 23 | `bookmarks` | 545 | triaged | 5 image sites, all masked images |
| [ ] | 24 | `immich` | 301 | signals | carousel shows one photo at a time |
| [ ] | 25 | `ups` | 271 | signals | one device |
| [x] | 26 | `docker` | 590 | fixed | uses `OverflowBadge` |
| [ ] | 27 | `indexer-manager` | 150 | signals | — |
| [ ] | 28 | `vpn` | 227 | signals | — |
| [x] | 29 | `calendar` | 507 | **fixed** | `HoverCard` per day cell (126 of 171 components), lazy images, off-screen event rows, and the `placehold.co` fallback |
| [ ] | 30 | `speedtest-tracker` | 707 | signals | — |
| [ ] | 31 | `system-disks` | 196 | signals | — |
| [ ] | 32 | `minecraft` | 91 | signals | one server icon |
| [ ] | 33 | `paperless-ngx` | 255 | signals | — |
| [ ] | 34 | `uptime-kuma` | 268 | signals | — |
| [ ] | 35 | `iframe` | 148 | signals | — |
| [ ] | 36 | `stocks` | 146 | signals | — |
| [ ] | 37 | `beszel-system-grid` | 496 | signals | — |
| [ ] | 38 | `audio-stats` | 305 | signals | — |
| [ ] | 39 | `bazarr` | 141 | signals | — |
| [x] | 40 | `beszel-system-table` | 488 | fixed | declared `PercentCell` inside the render body, so three cell subtrees per system remounted every second |
| [ ] | 41 | `clock` | 213 | signals | ticks, but that is what it is for |
| [x] | 42 | `media-releases` | 275 | fixed | 80 cards into a 539 px tile; `OverflowBadge`; lazy posters |
| [ ] | 43 | `network-controller` | 231 | signals | — |
| [ ] | 44 | `timetable` | 110 | signals | — |
| [ ] | 45 | `anchor-note` | 340 | signals | editor content |
| [x] | 46 | `notifications` | 113 | fixed | off-screen rows |
| [x] | 47 | `rssFeed` | 131 | fixed | off-screen rows; payload and handler checked |
| [ ] | 48 | `smart-home` | 235 | signals | — |
| [ ] | 49 | `archive-team-warrior` | 105 | signals | — |
| [ ] | 50 | `video` | 144 | signals | — |

**22 of 50 read in depth. 26 remain at signal level** — their signals are benign, but that is a
prediction, not a reading. The unread ones with a real chance of something are `umami` (long top
lists), `traefik` and `beszel-alerts` (list length driven by remote data), and `system-resources`
(14 maps).

## Investigated and declined, with reasons

**Lazy-loading the shared `MaskedOrNormalImage`.** This looked like one change covering `releases`,
`bookmarks`, `dns-hole` and `app` at once. It is not: `hasColor` defaults to `true`, so the default
branch renders a CSS `mask-image`, not an `<img>`, and `loading="lazy"` has nothing to attach to. Only
the minority `hasColor={false}` branch would benefit. The row-level lever for masked icons is
`content-visibility`, not lazy loading.

**RSS payload size.** Feed entries looked like a likely over-fetch, since RSS `description` is often a
whole article. `@extractus/feed-extractor` truncates it at `descriptionMaxLen`, default **250**
characters, so the payload is already bounded. The router also limits entries twice — `count` at the
handler and `.slice(0, maximumAmountPosts)` after merging. No finding.

**Widget routers without result limits.** Only 4 of 39 widget routers limit their results, which reads
alarming, but the rest return data whose length is set by the remote service (containers, interfaces,
active downloads) rather than by anything unbounded. Not a defect on its own.

**Per-row inline styles (29 sites).** A fresh object per row only defeats memoisation if the child is
memoised, and these children are not. 29 edits with no measurement behind them is churn.

**Index keys (11 sites).** All safe — static text splits, or stateless read-only rows from
user-configured JSONPath data with no stable id, where an index key is correct and avoids remounts.

## One instrument corrected

The inventory first reported `downloads` — the top-ranked widget — as "12 maps, no memo", because it
counted `memo(` and not `useMemo(`. `downloads` is in fact one of the better-memoised widgets in the
codebase. Fixed to count either form before the ranking was used for anything.

This is the sixth time in this work that a measurement, rather than the application, was the thing at
fault. See [`METHODOLOGY.md`](./METHODOLOGY.md).
