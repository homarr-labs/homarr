# Where this left off, and what to do next

Written as a handoff. The branch is green and everything below is measured except where explicitly
marked.

## 1. Verify the one unmeasured change

`c526dd2b7` applies the `content-visibility` treatment to `mediaRequests-requestList`. It is
typechecked but **not measured** — the session ended first. Every other performance claim on this
branch was A/B'd before commit; this one was not.

```bash
# restore two containers on identical data, one per image, then:
STRESS_BASE_URL=http://127.0.0.1:PORT STRESS_BOARD=default \
  node --experimental-strip-types scripts/benchmarks/measure-board-paint.mts
```

Expect **image requests to fall** (the measured effect on `mediaReleases` was 135 → 55). Do **not**
expect JS heap to move: decoded bitmaps live outside `JSHeapUsedSize`. Three repeats per side — a
single run wrongly suggested a −16% heap win on the first widget.

If it does not reduce image requests, revert it. Unmeasured complexity is exactly what this branch
has rejected everywhere else.

## 2. The one lever with real headroom left

**The tRPC router imports every integration eagerly.** A single **16.10 MiB subtree of 460 files** is
reached by every API route, and because Next preloads route bundles it is resident before the first
request. This pays twice:

- ~41 MiB of retained bundle source (28% of the live server heap) — V8 keeps a script's source alive
  while any function in it may still be lazily compiled
- ~38 MiB of V8 compiler zone memory, which is **proportional to how much JavaScript V8 compiles**
  and is not reachable by any V8 flag (`--max-opt` is a null result; only `--jitless` removes it, and
  that breaks rendering)

Nothing else has this profile. Every allocator and V8-level avenue is closed — see
[REJECTED.md](./REJECTED.md).

Start from `analyze-require-graph.mjs`, which showed the shared subtree, and
`[root-of-the-server]__0g06wx7._.js` as the chunk that reaches 460 files.

## 3. Known-good but deliberately deferred

| item | prize | why it was not done |
| --- | --- | --- |
| ASCII-escape server bundles | **9.45 MiB** | Proven mechanism (2.00 vs 1.00 bytes/char; one char above U+00FF doubles a whole source string). Needs a build-time rewrite of minified **vendor** output — deserves its own PR with its own safety argument |
| Lazy `mysql2` / `pg` | 21.4 MiB | Three implementations, all broken; see REJECTED.md. Blocked structurally because `createDb` must stay synchronous |
| `beszelSystemStats` at 1,156 nodes | unknown | Second-heaviest widget, but its cost is chart SVG (`<g>×317`), so reducing it changes what is drawn |
| `documents` reads 18–32 | unknown | Never investigated; each document carries overhead |

## 4. For the clean PR

The instruction was to close this experimental PR and open one with only the verified fixes, judged
on lines-of-code to performance ratio. On the evidence, that set is:

| change | size | measured effect |
| --- | --- | --- |
| `--max-semi-space-size=4` | **1 line** | −19% idle, −21% peak |
| `preloadEntriesOnStart: false` | **1 line** | −52% anon at idle; 310 fewer files even at full load |
| Umami: stop fetching 100k raw events per refresh | 1 file | −26% peak, −93% transient buffers, largest allocation 46.4 → 2.4 MiB |
| `serverExternalPackages` (mysql2/pg + 8 more) | 1 block | −21 MiB idle |
| `content-visibility` on media-release cards | 4 lines | −59% image requests, −41% layout objects |
| ssh2 WASM heap (docker-modem patch) | 1 patch | −15 to −18 MiB external at every stage |

Together these produce the headline: **−26% peak anon, −52% at idle**, no overlapping ranges at any
stage, for **+18% CPU**.

Two things to leave out or flag:

- **The gRPC patch** removes 112 files and 6 MiB from an isolated `require`, but is **not separately
  visible in a full run**. It is bundle hygiene, not a measured memory win.
- **Median board load reads +30%** but is **not established** — individual loads were
  [506, 383, 1233] and [848, 431, 574] before against [780, 808, 515] and [621, 579, 1004] after,
  heavily overlapping with no cold-then-warm pattern. If the latency trade matters, measure it
  properly with many more samples; the suspicion is that it is real and concentrated in
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
