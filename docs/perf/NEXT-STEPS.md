# Where this left off, and what to do next

Written as a handoff. The branch is green and everything below is measured except where explicitly
marked.

## 1. Verify the unmeasured changes

Four commits apply the off-screen-row treatment beyond the one widget where it was measured. All are
typechecked and lint-clean, none are A/B'd — they are the only performance claims on this branch not
verified before commit.

| commit | widget | measured on this board? |
| --- | --- | --- |
| `7550766f6` | mediaReleases | **yes** — 135 → 55 image requests, 8346 → 5117 layout objects |
| `c526dd2b7` | mediaRequests-requestList | no — but overdraw confirmed: 1,512 px of cards in a 405 px tile, 60 images |
| `040f10594` | rssFeed, notifications, calendar event list | no — these do **not** overdraw on this board |

The last row needs care when reading a result. On the test backup rssFeed renders 7 nodes and the
calendar's 7 rows fit their tile, so a measurement will correctly show **no change**. That is not a
failure of the change — the benefit only exists for a user whose integrations return more rows than
the tile can show. To observe it, use a backup with a busier feed, or shrink the tile.

For `c526dd2b7`, which does overdraw here, a real effect is expected:

```bash
# restore two containers on identical data, one per image, then:
STRESS_BASE_URL=http://127.0.0.1:PORT STRESS_BOARD=default \
  node --experimental-strip-types scripts/benchmarks/measure-board-paint.mts
```

Expect **image requests to fall**. Do **not** expect JS heap to move: decoded bitmaps live outside
`JSHeapUsedSize`. Three repeats per side — a single run wrongly suggested a −16% heap win on the first
widget. If image requests do not fall, revert it.

## 1b. What was deliberately not changed

26 widgets use `ScrollArea`; the treatment was applied to five. `content-visibility` is not free — it
costs containment work, and on content that measures itself (charts, editors, the notebook) skipping
layout can be actively wrong. The rule used: apply it where list length is decided by remote data,
leave fixed-size and chart widgets alone.

`beszelSystemStats`, `beszelSystemTable` and `beszelSystemGrid` report large row counts in the
overdraw tool, but that is the tool misreading SVG groups as rows — their content fits their tiles.

## React `cache()` and memoisation — already in place

Recorded because it looks like a gap and is not.

React `cache()` is **server-only**: it dedupes within a single RSC render and does nothing for client
widget rendering. It is already applied where it belongs — `getBoardByNameAsync`, `getHomeBoardAsync`,
`getRscServerSettingsAsync` and `getQueryClient` are all wrapped, the last with a comment explaining
the dedup.

Client-side data is cached by tRPC/react-query, whose `gcTime` was already checked and found to be
5 minutes, not the 24 hours the original fix catalogue assumed. `React.memo` is already used in the
clock, calendar and releases widgets.

## 2. The one lever with real headroom left

**The tRPC router imports every integration eagerly.** A single **16.10 MiB subtree of 460 files** is
reached by every API route, and because Next preloads route bundles it is resident before the first
request. This pays twice:

- ~41 MiB of retained bundle source (28% of the live server heap) — V8 keeps a script's source alive
  while any function in it may still be lazily compiled
- ~38 MiB of V8 compiler zone memory, which is **proportional to how much JavaScript V8 compiles** and
  is not reachable by any V8 flag (`--max-opt` is a null result; only `--jitless` removes it, and that
  breaks rendering)

Nothing else has this profile. Every allocator and V8-level avenue is closed — see
[REJECTED.md](./REJECTED.md).

Start from `analyze-require-graph.mjs`, which found the shared subtree, and
`[root-of-the-server]__0g06wx7._.js` as the chunk reaching 460 files.

## 3. Known-good but deliberately deferred

| item | prize | why it was not done |
| --- | --- | --- |
| ASCII-escape server bundles | **9.45 MiB** | Proven mechanism — 2.00 vs 1.00 bytes/char; one char above U+00FF doubles a whole source string. Needs a build-time rewrite of minified **vendor** output, so it deserves its own PR and safety argument |
| Lazy `mysql2` / `pg` | 21.4 MiB | Three implementations, all broken; see REJECTED.md. Structurally blocked because `createDb` must stay synchronous |
| `beszelSystemStats` at 1,156 nodes | unknown | Second-heaviest widget, but its cost is chart SVG (`<g>×317`), so reducing it changes what is drawn |
| `documents` reads 18–32 | unknown | Never investigated; each document carries overhead |

## 4. For the clean PR

The instruction was to close this experimental PR and open one with only the verified fixes, judged on
lines-of-code to performance ratio. On the evidence, that set is:

| change | size | measured effect |
| --- | --- | --- |
| `--max-semi-space-size=4` | **1 line** | −19% idle, −21% peak |
| `preloadEntriesOnStart: false` | **1 line** | −52% anon at idle; 310 fewer files even at full load |
| Umami: stop fetching 100k raw events per refresh | 1 file | −26% peak, −93% transient buffers, largest allocation 46.4 → 2.4 MiB |
| `serverExternalPackages` (mysql2/pg + 8 more) | 1 block | −21 MiB idle |
| `content-visibility` on media-release cards | 4 lines | −59% image requests, −41% layout objects |
| ~~ssh2 WASM heap (docker-modem patch)~~ | ~~1 patch~~ | **dropped** — the gain was real (−15 to −18 MiB external) but patching a dependency breaks on every `dockerode`/`docker-modem` bump. Worth raising upstream instead: both packages require a module at file scope while using it in one already-guarded branch |
| Reuse the certificate agent instead of one per request | 1 file | 5.11 → 1.69 ms/request, 60 → 2 TLS handshakes over 60 requests |
| Stream proxied images instead of buffering | 2 files | −36% peak RSS on 30 concurrent 2 MiB images (116 → 74 MiB) |

Together the server changes produce the headline: **−26% peak anon, −52% at idle**, no overlapping
ranges at any stage, for **+18% CPU**.

Two notes for whoever cuts it:

- **Split the formatting out of `media-missing/component.tsx`.** Its 77-line diff is roughly 8 lines of
  semantic change plus **69 lines of pre-existing formatting debt** that `oxfmt` swept up when the file
  was touched. Every other file changed in this work was already `oxfmt`-clean, so this is the only one
  affected. Landing the reformat as its own commit keeps the perf change reviewable.
- The client changes worth carrying are `OverflowBadge`, the `calendar` day-cell `HoverCard`, the
  `beszelSystemTable` inline `PercentCell`, `content-visibility` on the data-driven lists, the two
  `keepMounted={false}` widgets, and the `placehold.co` removal. The last of those is a bug fix rather
  than an optimisation and should probably ship regardless.

Two things to leave out or flag:

- **The gRPC patch** removes 112 files and 6 MiB from an isolated `require`, but is **not separately
  visible in a full run**. Bundle hygiene, not a measured memory win.
- **Median board load reads +30%** but is **not established** — individual loads were
  [506, 383, 1233] and [848, 431, 574] before against [780, 808, 515] and [621, 579, 1004] after,
  heavily overlapping with no cold-then-warm pattern. If the latency trade matters, measure it properly
  with many more samples; the suspicion is that it is real and concentrated in
  `preloadEntriesOnStart`.

## 5. Read this before measuring anything

[METHODOLOGY.md](./METHODOLOGY.md). Every wrong number in this investigation came from an instrument,
not the application, and several were published before being caught. The short version:

- a heap snapshot **cannot** explain a peak — V8 GCs first and reports survivors only
- V8 truncates snapshot string contents to ~1 KiB
- snapshot objects are **not** live native handles
- measuring without a forced GC measures V8's growth, not a module's cost
- taking a CDP heap snapshot added **134 MiB to the process being measured**
- React per-component attribution silently returns **nothing** on a production build
- a fixed port can measure a **leftover container**
- **when a server-side change moves a client-side metric, the workload changed** — this is how
  `--jitless` was caught faking a 24% win by under-rendering the page
