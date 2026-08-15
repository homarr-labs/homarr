# Widget-by-widget audit

Every widget in `packages/widgets/src`, worked through one at a time. 50 widgets, 22,726 lines.

`_inputs/` is excluded on purpose, not overlooked. Its 2,748 lines are widget *option* editors, reached
only from the edit modal and the custom-widget form; the one widget that imports from it,
`timetable/component.tsx`, uses `import type`, which is erased at build. None of it is on the board
render path. The one real finding there — a drag handle rebuilt every frame of a drag — was found and
fixed by the anti-pattern audit, which does cover the directory.

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

## The same cost in `Accordion`, which this sweep missed

Credit where it is due: this came from reading [PR #6582](https://github.com/homarr-labs/homarr/pull/6582),
which adds `keepMounted={false}` to the two coolify accordions. The sweep below checked `Tabs` and never
checked `Accordion`, so it missed the problem entirely on five sites.

**`Accordion` behaves exactly like `Tabs`: collapsed panels render their children.** Verified in the
installed version — with three marker children per panel, the default renders **3 of 3** children of the
*collapsed* panel, and `keepMounted={false}` renders **0**.

It matters more here than in `Tabs`, because collapsed is the *normal* state of an accordion section
rather than the exception:

| widget | collapsed panels were building | verdict |
| --- | --- | --- |
| `coolify` instance-card | three remote-data lists — servers, applications, services | **fixed** |
| `coolify` single-instance-layout | same three lists | **fixed** |
| `health-monitoring` cluster-health | per-node resource tables | **fixed** — beyond what #6582 did |
| `firewall` | interface rows | **fixed** — beyond what #6582 did |
| `_inputs/widget-multiReleasesRepositories-input` | repository picker | left mounted — it holds selection state, and it is edit-modal only, not on the board render path |

In every fixed case the open/closed state lives in the parent component, so unmounting a collapsed
panel discards nothing.

This also corrects three verdicts in the table below: `coolify` was recorded as "clean (bounded)" and
`firewall` and `health-monitoring` as triaged/fixed on other grounds. All three were carrying this cost.

### What else #6582 had, and what was declined

Mining the rest of that PR's perf-shaped hunks:

| their change | taken? |
| --- | --- |
| `keepMounted={false}` on 2 accordions | **taken, and extended to 4 sites** — above |
| `loading="lazy"` on the `iframe` widget | **taken** — an iframe is a whole browsing context, so one scrolled off a tall board is the most expensive thing a widget can load eagerly |
| `loading="lazy"` on media-releases and rssFeed | already done here |
| `dynamic()` for `BoardItemMenu` | **declined, and it does not work as written.** `BoardItemMenu` already early-returns `null` outside edit mode, so there is no overlay-per-item cost to begin with — but it is *rendered* unconditionally, and `dynamic()` fetches its chunk when the component renders, not when it returns something. So the chunk still loads on every board render. It would only pay off with the `isEditMode` guard hoisted to the call site, which is a board-rendering change worth measuring first |
| `loading="lazy"` on the immich carousel | declined — the carousel's image *is* the visible content, so there is nothing off-screen to defer |
| `memo()` on `item-content` / `grid-editor` | not extractable — entangled with that PR's new advanced-focus feature, portals and viewport hooks, not a standalone perf change |
| 5 `<Suspense>` boundaries | mostly in that PR's new components; not applicable here |

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

**The premise is verified, not inferred.** This started as a reading of Mantine's documentation, which
is a weak basis for a prop that trades a remount cost for a mount saving — if Mantine ever stopped
rendering inactive panels, the prop would be pure loss. `common/keep-mounted.spec.ts` pins the
behaviour in the installed version: with three marker children per panel, the default renders **3 of 3**
children of the *inactive* panel into the DOM, and `keepMounted={false}` renders **0**. If that ever
changes, the test fails and the prop should come back out.

What remains unmeasured is the *magnitude* on a live board — `media-missing` and `health-monitoring`
need reachable integrations to render data, so neither could go through the per-widget component-count
harness. The mechanism is confirmed; the size of the saving is not.

## Changes made

| widget | change | why |
| --- | --- | --- |
| `health-monitoring` | `keepMounted={false}` on `Tabs` | the hidden monitoring view was fully built |
| `media-missing` | `keepMounted={false}` on `Tabs` | both tabs built every card |
| `coolify` ×2, `health-monitoring` cluster, `firewall` | `keepMounted={false}` on `Accordion` | collapsed panels built their lists; collapsed is an accordion's normal state |
| `media-missing` | `offscreenRowStyle(CARD_HEIGHT[density])` | renders every card into a scrolling tile; the card height is fixed per density, so the intrinsic size is exact rather than a guess |
| `media-missing` | `loading="lazy"` on the poster | a poster per card, all fetched regardless of scroll position |
| `calendar` | inline SVG instead of `placehold.co` | a failed poster made a **third-party network request** from a self-hosted dashboard, once per failing event, to draw a grey square |
| `rssFeed` handler | logger instead of raw `console.debug` | logged the entire serialised feed entry per entry, unsuppressable by log level |

The `placehold.co` fallback is the one I would call a bug rather than a cost: it fails on any install
without internet access, which is a normal way to run Homarr.

## The checklist

Verdicts, and the evidence behind each — the distinction matters, because "I read it" and "its list
cannot get long" are different strengths of claim:

- **fixed** — changed here or in an earlier pass
- **clean (read)** — the component was read; nothing worth changing
- **clean (bounded)** — list length verified bounded by a widget option, by viewport width, or by the
  remote service (active streams, configured instances, physical disks), *and* the row is cheap:
  no image, no overlay. Not a line-by-line read
- **triaged** — a finding was examined and deliberately declined, reason recorded

| ✓ | # | widget | LOC | verdict | note |
| --- | --- | --- | --- | --- | --- |
| [x] | 1 | `downloads` | 1525 | clean (read) | top of the ranking, and the flag was wrong: it memoises data, sorting, columns, sizes and stats. Renders via `DataTable`; list is bounded by active downloads |
| [x] | 2 | `media-transcoding` | 521 | triaged | 2 overlays per row, both functional tooltips with real labels |
| [x] | 3 | `dns-hole` | 761 | triaged | icons render through `MaskedOrNormalImage`, whose default branch is a CSS mask, so `loading="lazy"` does not apply |
| [x] | 4 | `patchmon` | 1154 | triaged | per-row tooltip is functional |
| [x] | 5 | `beszel` | 1186 | fixed | disk-usage mounted a `HoverCard` per row for systems reporting no filesystems |
| [x] | 6 | `health-monitoring` | 1250 | **fixed** | hidden tab panel built its whole tree |
| [x] | 7 | `media-requests` | 542 | fixed | `content-visibility` + `loading="lazy"` on both images |
| [x] | 8 | `tracearr` | 445 | clean (read) | poster is a CSS background per stream card, and the list is active streams — a handful |
| [x] | 9 | `custom-api` | 1014 | triaged | 6 index keys, all safe: stateless read-only rows from user JSONPath data with no stable id |
| [x] | 10 | `firewall` | 334 | **fixed** | its `Accordion` built the interface rows while collapsed. The 4 inline-style-per-row findings stay declined: children are not memoised, so nothing is defeated |
| [x] | 11 | `releases` | 817 | fixed | `OverflowBadge` mounted a `Popover` per row even with nothing to overflow |
| [x] | 12 | `coolify` | 752 | **fixed** | its `Accordion` built all three resource lists while collapsed; the icon is a fixed constant URL, not per-row data |
| [x] | 13 | `notebook` | 1189 | clean (read) | rich-text editor. Deliberately **not** given `content-visibility`: it measures itself, and skipping its layout would be wrong |
| [x] | 14 | `umami` | 595 | clean (read) | the top-list is bounded by the widget's own `limit` option and each row is three `<Text>` — containment would cost more than it saves |
| [x] | 15 | `traefik` | 289 | clean (read) | already bounded: `.slice(0, getEntryPointLimit(width))` |
| [x] | 16 | `weather` | 481 | triaged | per-row overlay is a functional tooltip |
| [x] | 17 | `system-resources` | 568 | clean (read) | the 14 maps build chart data series, not DOM rows, and none of the six chart components is memoised — so memoising the arrays would defeat nothing. Its data changes every tick anyway |
| [x] | 18 | `app` | 356 | triaged | icon is a masked image; single icon per widget, not a list |
| [x] | 19 | `beszel-alerts` | 288 | clean (read) | fully memoised — input, name map, alerts and history — and history is sliced to `options.maxHistoryItems` |
| [x] | 20 | `beszel-system-stats` | 220 | clean (bounded) | one row per configured system |
| [x] | 21 | `media-missing` | 261 | **fixed** | tabs, lazy poster, off-screen cards |
| [x] | 22 | `media-server` | 457 | clean (read) | the flat session list is explicitly memoised on `currentStreams`, and is bounded by active streams |
| [x] | 23 | `bookmarks` | 545 | triaged | 5 image sites, all masked images |
| [x] | 24 | `immich` | 301 | clean (bounded) | carousel shows one photo at a time |
| [x] | 25 | `ups` | 271 | clean (bounded) | one row per UPS device |
| [x] | 26 | `docker` | 590 | fixed | uses `OverflowBadge` |
| [x] | 27 | `indexer-manager` | 150 | clean (bounded) | one row per configured indexer |
| [x] | 28 | `vpn` | 227 | clean (bounded) | one row per tunnel |
| [x] | 29 | `calendar` | 507 | **fixed** | `HoverCard` per day cell (126 of 171 components), lazy images, off-screen event rows, and the `placehold.co` fallback |
| [x] | 30 | `speedtest-tracker` | 707 | clean (bounded) | no list map in the component |
| [x] | 31 | `system-disks` | 196 | clean (bounded) | one row per physical disk |
| [x] | 32 | `minecraft` | 91 | clean (bounded) | one server icon |
| [x] | 33 | `paperless-ngx` | 255 | clean (bounded) | statistic rows, fixed set |
| [x] | 34 | `uptime-kuma` | 268 | clean (bounded) | one row per monitor |
| [x] | 35 | `iframe` | 148 | clean (bounded) | maps are over option lists, not remote data |
| [x] | 36 | `stocks` | 146 | clean (bounded) | one row per configured symbol |
| [x] | 37 | `beszel-system-grid` | 496 | clean (bounded) | already slices its input |
| [x] | 38 | `audio-stats` | 305 | clean (bounded) | no list map in the component |
| [x] | 39 | `bazarr` | 141 | clean (bounded) | one row per configured instance |
| [x] | 40 | `beszel-system-table` | 488 | fixed | declared `PercentCell` inside the render body, so three cell subtrees per system remounted every second |
| [x] | 41 | `clock` | 213 | clean (read) | re-renders once a second by design; no list |
| [x] | 42 | `media-releases` | 275 | fixed | 80 cards into a 539 px tile; `OverflowBadge`; lazy posters |
| [x] | 43 | `network-controller` | 231 | clean (bounded) | one row per device |
| [x] | 44 | `timetable` | 110 | clean (bounded) | one map over the configured schedule |
| [x] | 45 | `anchor-note` | 340 | clean (read) | editor content, no list; self-measuring like `notebook` |
| [x] | 46 | `notifications` | 113 | fixed | off-screen rows |
| [x] | 47 | `rssFeed` | 131 | fixed | off-screen rows; payload and handler checked |
| [x] | 48 | `smart-home` | 235 | clean (bounded) | one entity per widget |
| [x] | 49 | `archive-team-warrior` | 105 | clean (bounded) | no list map |
| [x] | 50 | `video` | 144 | clean (bounded) | a single video element |

**All 50 have a verdict.** 11 fixed, 8 triaged, 10 read and found clean, 21 verified bounded.

The four the ranking suggested were most likely to hide something all came back clean, and three of
them were *already* bounded before I looked: `traefik` slices to what its width can show, `umami` to
its own `limit` option, `beszel-alerts` to `options.maxHistoryItems`. `system-resources` was the
interesting one — its 14 unmemoised maps look bad until you notice none of the six chart components it
feeds is memoised, so there is nothing for a stable array identity to preserve.

The 21 "bounded" verdicts are the weakest claim here. They rest on the list length being fixed by
configuration or by physical reality — disks, tunnels, configured instances — plus a cheap row with no
image and no overlay. That is sound reasoning, not a reading, and a widget whose data source changes
shape could invalidate it.

## Checked against Vercel's React/Next performance rules

Sourced with the `skills` CLI — `npx skills find "react performance"`, then
`npx skills use affaan-m/ecc@react-performance`, which is an adaptation of
[Vercel Labs `react-best-practices`](https://github.com/vercel-labs/agent-skills): 70+ rules across
8 priority categories. Every rule that is mechanically checkable was run against the widgets.

| rule | category | result |
| --- | --- | --- |
| `content-visibility: auto` for long lists | rendering | **applied** — 6 widgets |
| Don't define components inside components | re-render | **2 found, both fixed** (`PercentCell`, drag handle) |
| Ternary over `&&` for conditional render | rendering | **passes** — only 2 `&&` renders exist and both operands are already boolean or string, so nothing can render a literal `0` |
| Passive listeners for scroll | client fetching | **N/A** — no widget registers a scroll listener |
| `Set`/`Map` for membership over `Array.includes` | JS micro-perf | **passes** — the nested scans that exist are over configured integrations and column accessors, single digits either way. `use-persisted-table-layout` already uses a `Set` for the hot half |
| Hoist RegExp out of loops | JS micro-perf | **passes** — the only user-supplied pattern, the release version filter, is compiled once by `compileVersionRegex` before the `.filter()` that uses it |
| Statically analyzable dynamic imports | bundle | **one exception, justified** — `translation/src/mapping.ts` builds `import(`./lang/${language}.json`)` for 36 languages, 6.8 MiB of JSON. The rule targets accidental over-inclusion; here every language is genuinely reachable because the user can switch at runtime, so the context module includes exactly what is needed. Rewriting it as 36 explicit entries would emit the same 36 lazy chunks |
| `React.cache()` for per-request dedup | server | **applied** — 4 functions |
| TanStack Query for dedup, not hand-rolled `useEffect` + `fetch` | client fetching | **passes** — used throughout |
| Direct imports, not barrels | bundle | **partial** — see below |
| Hoist default non-primitive props | re-render | **declined** — see below |
| `<Activity>` for show/hide instead of mount/unmount | rendering | **deliberately contradicted** — see below |

### The one rule this codebase deliberately contradicts

The skill says to prefer React 19's `<Activity>` over unmounting for tabs, because it avoids
remount cost. `keepMounted={false}`, which this pass added to two widgets, is exactly the opposite.

That is a considered trade, not an oversight. The rule optimises for **switching**; a dashboard
optimises for **mounting**. Every board load mounts every widget, while a user switches a widget's
inner tabs rarely or never — so paying to build a hidden monitoring view on every single page load, and
holding its DOM for the whole session, buys a faster tab switch nobody performs. Where state loss
would be user-visible — `custom-api`'s user JSX, the edit modal's forms — the panels stay mounted.

The cost is real and worth stating: switching tabs in `health-monitoring` or `media-missing` now
remounts the panel. react-query still has the data cached, so it repaints rather than reloads.

### Bundle: the rule does not apply here at all

The "direct imports, not barrels" rule, and the whole `optimizePackageImports` lever behind it, is
**inert in this repo** — measured, then explained.

Seven Mantine entry points were missing from `optimizePackageImports`: `dates` (13 files), `dropzone`
(12), `charts` (10), `spotlight` (7), `form` (4), `notifications` (3), `tiptap` (1). Adding all seven
and rebuilding produced a client bundle that was **byte-for-byte identical** — 482 files, 18050.7 KiB
in both arms, down to the individual chunk hashes.

Identical output including hashes looks like a cached build, especially with
`turbopackFileSystemCacheForBuild` enabled, so it was checked instead of reported. The Next.js docs
settle it: *"This is not needed when using Turbopack. Turbopack automatically analyzes and optimizes
imports without requiring this configuration."* This app builds with Turbopack — the build banner says
so — and the config is dead weight.

Which also disposes of the sub-question underneath it. `@homarr/ui` is the largest barrel in the repo
at 111 importers, and I had noted it as ineligible because Next's barrel optimiser only rewrites pure
re-export files while `packages/ui/src/index.ts` also defines a runtime `uiConfiguration`. True, and
irrelevant: Turbopack does not use that optimiser and tree-shakes the barrel regardless.

Measuring first-load JS per route was not possible the usual way, incidentally: Next 16 + Turbopack
prints no size columns in the route table and emits no `app-build-manifest.json`. Total bytes under
`.next/static/chunks` is the substitute.

### `data = []` defaults: declined, with the reasoning

The rule against fresh non-primitive defaults (`items ?? []` creating a new array identity per render)
matches **20+ sites**, all of the form `const { data = [] } = useQuery(...)`.

It is declined because the window is narrow: react-query returns a stable reference once data has
loaded, so the fresh `[]` only appears while `data` is `undefined` — initial load, error, or no
integration configured. Outside that window the default never evaluates and nothing is destabilised.
20 edits to improve the render path of the loading state, with no measurement, is the same churn as the
29 inline-style sites already declined.

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

That is the sixth time in this work that a measurement, rather than the application, was the thing at
fault — and this pass produced a seventh of a different kind: I reported that the `skills` CLI did not
exist on this machine after checking only `which` and the plugin directory. It does, and it is where
the Vercel rule set above came from. Both are recorded in [`METHODOLOGY.md`](./METHODOLOGY.md).
