# Phase 2 — where the memory actually goes

Measured with `scripts/benchmarks/stress-restore.mts` on a **populated** instance, not an
empty one: a real backup (4 boards, 51 widgets, 11 integrations) restored through the
onboarding restore UI, signed in, then the busiest board (28 items / 16 widget kinds,
28/28 widgets reaching `data-homarr-widget-ready`) opened, reloaded 4×, and soaked idle.

Images built locally from known commits so the comparison is not against a stale registry
tag: baseline = merge-base `06724cfeb`, branch = `abec79abe`.

## Before / after

One instrument, one workload, alternated runs (2 before, 2 after) on the same restored
backup: **4 tabs across 2 boards**, 3 reloads each, widget interaction, 2 min idle soak.
`before` = merge-base `06724cfeb`, `after` = this branch. Server figures are cgroup
anonymous memory; `memory.current` is not used because page cache swings it by 60+ MiB.

### Server memory

| stage | before | after | change |
| --- | --- | --- | --- |
| boot idle | 141.9 MiB | **89.7 MiB** | **−37%** |
| after restore | 143.2 MiB | **98.8 MiB** | **−31%** |
| after sign-in | 248.7 MiB | **158.5 MiB** | **−36%** |
| dashboard loaded | 257.3 MiB | **173.0 MiB** | **−33%** |
| after 3 reloads × 4 tabs | 368.4 MiB | 364.3 MiB | **−1%** |
| after 2 min idle soak | 332.0 MiB | **232.5 MiB** | **−30%** |
| peak | 705.2 MiB | **568.4 MiB** | **−19%** |

**The honest caveat, and it matters:** under *sustained* multi-tab load the two builds
converge — 368 vs 364 MiB. The wins are at idle, at steady state, and at peak. That is
why hammering the app with five tabs did not feel 30% lighter: at that point the
footprint is dominated by live widget data and render churn, which this PR does not
change. Idle, first load and worst-case are materially better; saturation is not.

### Browser

| metric | before | after | change |
| --- | --- | --- | --- |
| JS event listeners | 10,126 | **7,774** | **−23%** |
| DOM nodes | 9,175 | **8,284** | **−10%** |
| React fibers (idle board) | 5,224 | **3,588** | **−31%** |
| browser JS heap | 55.2 MiB | **51.1 MiB** | **−7%** |

### Cost and neutral metrics

| metric | before | after | change |
| --- | --- | --- | --- |
| container CPU over the run | 22.8 s | 22.8 s | unchanged |
| median board load | 710 ms | 506 ms | faster, but ±200 ms run to run |
| image size | 410 MB | **398 MB** | −3% |

CPU is unchanged at this workload. An isolated measurement of the V8 young-generation
bound showed ~8% more CPU on a lighter single-tab run; it does not show up here.

### What produced each win

Measured in isolation, cumulatively from the merge-base image:

| change | size | effect |
| --- | --- | --- |
| `--max-semi-space-size=4` | **1 line** | −19% idle, −21% peak server |
| `serverExternalPackages` + `mysql2`/`pg` | **1 line** | −21 MiB idle server |
| `serverExternalPackages` + 8 more server-only deps | 1 block | −18 MiB loaded server |
| one shared board context menu | 3 files | **−23% listeners, −31% fibers** |
| integrations barrel diet | ~10 files | −40 MiB under load, 0 at idle |
| jsdom → linkedom | 3 files | image size + XSS hardening |
| V8 heap cap | 1 line | 0 — a drift ceiling, not a reduction |
| cache-invalidation layer + `next-cache-handler` | ~30 files | **0 — deleted** |

## Metric choice

`memory.current` moved between **192 and 261 MiB for the same baseline image** across runs,
because cgroup v2 counts reclaimable page cache. At idle that split was 144 MiB anon vs
77 MiB page cache. Everything below therefore reports **anonymous memory**, which was
stable to ±2.5 MiB across repeated runs of the same image.

## Aggregate: branch vs merge-base

| stage | baseline | branch | delta |
| --- | --- | --- | --- |
| boot idle | 139.2 / 144.1 | 115.2 / 99.0 | **−24%** |
| board loaded (28 widgets) | 255.2 / 260.4 | 228.1 / 230.2 | **−11%** |
| after 4 board reloads | 401.4 / 384.0 | 358.8 / 362.6 | **−8%** |
| image size | 410 MB | 388 MB | −5% |

## Attribution — this is the part that matters

Built cumulatively from the baseline image, one change at a time:

| config | boot idle anon | verdict |
| --- | --- | --- |
| baseline | 139.2 | — |
| + integrations barrel diet | 139.5 | **no idle effect** |
| + Redis clients 6 → 2 | 139.3 | **no idle effect** |
| + `serverExternalPackages: mysql2, pg` | **118.6** | **−21 MiB — the entire idle win** |
| branch (everything) | 115.2 / 99.0 | no further gain beyond the above |

| change | diff size | idle | under load |
| --- | --- | --- | --- |
| `serverExternalPackages` + `mysql2`/`pg` | **1 line** | **−21 MiB** | −25 MiB |
| integrations barrel diet | ~10 files, +119 lines | ~0 | −40 MiB (±25 noise) |
| Redis clients 6 → 2 | 4 files | ~0 | ~0 |
| V8 heap cap (`HOMARR_MAX_OLD_SPACE_SIZE=512`) | 1 line | ~0 | ~0 |
| cache invalidation + `next-cache-handler` | ~30 files, 66 call sites, ~290 lines | **0** | **0** |

### Why one config line beats the whole module-graph refactor

`packages/core/src/infrastructure/db/drivers/index.ts` statically imports all three
drivers, so `mysql2` and `pg` are in the graph even when `DB_DRIVER=better-sqlite3`.
Bundled, their full transitive graphs are inlined into the boot-loaded server chunks;
marked external they become a `require()` that the sqlite path never reaches. Verified
inside the images:

| image | server chunks | `mysql2` in `node_modules` |
| --- | --- | --- |
| baseline | 108,336 KB | no — it was inlined into the chunks |
| + external pkgs | 94,936 KB | yes — traced, loaded only on demand |
| branch | 98,084 KB | yes |

This is fix-catalog **F6 ("load only the configured DB driver")** achieved by one config
line, after the dynamic-`import()` attempt was reverted for breaking Vitest.

### The V8 heap cap is a safety ceiling, not a reduction

`branch-cap4096` (cap effectively removed) matched `branch` at every stage — idle 99.0 vs
115.2, board loaded 230.2 vs 228.1, after stress 362.6 vs 358.8. The workload never
approaches a 512 MB old space, so the cap cannot reduce steady-state usage. It is still
worth keeping as one line: baseline's soak hit a 543.8 MiB anon sample, and capped
baseline topped out at 347.5 MiB, which is exactly the unbounded-drift protection
issue #5301 needs. It should not be described as a memory saving.

### The cache layer is provably dead code

On the current branch state there are **0** `"use cache"` directives, **0** `cacheTag()`,
**0** `cacheLife()`, **0** `unstable_cache`, and no tagged `fetch` in application source —
and `cacheHandlers`/`cacheComponents` have both been removed from `next.config.ts`.
`packages/next-cache-handler` is referenced only by a `package.json` dependency line;
nothing imports it. The 66 remaining `invalidate*` call sites call `revalidateTag` on tags
nothing ever registers, with no handler to receive them, inside a `try/catch` that
swallows the resulting out-of-scope error. Zero functional effect, ~30 files of churn.

## Verification after trimming

The three zero-effect changes were removed (`next-cache-handler`, cache-tags/
cache-invalidation and its 66 call sites, Redis 6 → 2 — keeping the
`pubSub:last:*` TTL). Re-measured to confirm nothing regressed:

| stage | baseline | branch before trim | after trim |
| --- | --- | --- | --- |
| boot idle | 139.2 / 144.1 | 115.2 / 99.0 | **120.0** |
| board loaded | 255.2 / 260.4 | 228.1 / 230.2 | **229.5** |
| after 4 reloads | 401.4 / 384.0 | 358.8 / 362.6 | **357.0** |
| peak | 684.8 / 710 | 679.8 / 673 | **599.5** |
| image | 410 MB | 388 MB | **388 MB** |

Identical within run-to-run noise at every stage, lowest peak of any config, and
28/28 widgets rendered — so **−883 lines and −18 files cost nothing**. Diff against
the merge-base went from 100 files / 3,336 insertions to 82 files / 2,484.

## Round 2 — GC tuning and wider unbundling

Re-run on the second backup, where the demo account is already an admin whose home
board is the 28-item board, so the harness modifies nothing (`fixture changes: none`).
Every run now also proves the session instead of inferring it (see below) and records
CPU seconds plus board-load latency, because every remaining lever trades memory for CPU.

| config | idle | board loaded | under load | peak | CPU s | median load |
| --- | --- | --- | --- | --- | --- | --- |
| round-1 result | 120.0 | 209.6 | 353.9 | 710.6 | 15.8 | 594 ms |
| `--max-semi-space-size=2` | 97.1 | 183.5 | 340.5 | 581.6 | 17.3 | 598 ms |
| **`--max-semi-space-size=4`** | **97.2** | **183.0** | **306.6** | **560.2** | 17.1 | 570 ms |
| **+ wider `serverExternalPackages`** | **90.3** | **164.6** | **302.5** | 594.2 | 16.3 | 549 ms |

`--max-old-space-size` only bounds the old generation. V8 sizes the *young* generation
generously too (16 MB per semi-space by default) and that slack is resident memory.
Bounding it to 4 MB is the single biggest remaining win: **−19% idle, −21% peak**. It is
not free — GC runs more often, costing ~8% CPU (15.8 → 17.1 CPU-seconds) — but board-load
latency did not regress. 2 MB was not better than 4 MB and cost slightly more CPU.

Externalising the remaining server-only packages (winston, drizzle-orm, ical.js, jszip,
ldapts, node-unifi, @kubernetes/client-node, linkedom) took another **−18 MiB at
board-loaded** with slightly *lower* CPU and latency. The cost is **image size: 388 → 401
MB**, since those packages now ship in `node_modules` rather than being tree-shaken into
chunks. Worth it here — RAM is the constrained resource on a self-hosted box — but it is
a real trade, not a free win.

**Cumulative vs merge-base: idle 141.7 → 90.3 MiB (−36%), board loaded 257.8 → 164.6 MiB
(−36%), under load 392.7 → 302.5 MiB (−23%).**

## Final A/B, with repetitions

Everything above is one sample per configuration, which is fine for ranking changes but
not for a headline. This is the merge-base image against the PR's end state, alternated,
on the same backup — 2 runs before, 3 after:

| run | idle | board loaded | under load | after soak | peak |
| --- | --- | --- | --- | --- | --- |
| before #1 | 144.2 | 249.0 | 392.8 | 529.6 | 753.0 |
| before #2 | 142.3 | 268.2 | 385.1 | 538.5 | 626.1 |
| after #1 | 100.5 | 176.8 | 311.1 | 204.3 | 590.9 |
| after #2 | 91.1 | 163.5 | 319.9 | 212.7 | 568.0 |
| after #3 | 90.3 | 164.6 | 302.5 | 206.4 | 594.2 |

| metric | before (mean) | after (mean) | change |
| --- | --- | --- | --- |
| boot idle | 143.3 | **94.0** | **−34%** |
| board loaded | 258.6 | **168.3** | **−35%** |
| under load | 389.0 | **311.2** | **−20%** |
| after idle soak | 534.1 | **207.8** | **−61%** |
| peak | 689.6 | **584.4** | −15% |

The two groups do not overlap on any stage. The before-side idle samples land within
1.9 MiB of each other, which is what justifies treating a ~50 MiB gap as real rather than
noise. Earlier single-sample rounds suggested −36%; the repeated figure is **−34%**, and
that is the number used in the PR.

## Round 3 — tried, and reported as not a memory win

`@scalar/api-reference-react` (a docs SPA behind one admin tab) moved to
`next/dynamic` with `ssr: false`, and `@modelcontextprotocol/sdk` to
`serverExternalPackages`.

| metric | previous build | with round 3 |
| --- | --- | --- |
| idle | 90.3 / 91.1 / 100.5 | 89.4 |
| board loaded | 163.5 / 164.6 / 176.8 | 161.5 |
| peak | 568.0 / 590.9 / 594.2 | 563.9 |
| image | 401 MB | **398 MB** |
| CPU s | 17.0 | 17.5 |

Every memory figure lands **inside** the previous build's spread. At the better end of
it, but inside — so on one sample this is not a demonstrated reduction and is not counted
in the headline. Kept anyway for the deterministic −3 MB image and because a
documentation SPA should not be compiled for an SSR pass that discards its output.

Recording it here rather than quietly folding it into the total: the whole point of the
harness is to stop plausible-sounding changes from being credited with wins they did not
produce.

## Getting a build React DevTools will profile

```bash
pnpm docker:profiling      # builds homarr:performance and verifies it
```

`docker build . -t homarr:performance` on its own produces a **normal** build — the
profiling renderer is opt-in, so DevTools will keep reporting "Profiling not supported".

Three separate things have to line up, and each fails silently on its own:

1. `reactProductionProfiling` in `next.config.ts` is read **only by the webpack path**.
2. Under Turbopack the equivalent is `next build --profile`, which
   `apps/nextjs/package.json` passes when `HOMARR_PROFILING=true`.
3. Turbo strips any env var not declared in the task's `env`, so `HOMARR_PROFILING`
   had to be added to `turbo.json`.

Even with all three, the build was still not a profiling one: Next applies the React
swap through a **webpack alias** (`getReactProfilingInProduction` →
`'react-dom/client$': 'react-dom/profiling'`) that Turbopack never sees, and a
Turbopack `resolveAlias` does not catch it either because the vendored entry requires
`./cjs/react-dom-client.production.js` relatively. The Dockerfile now performs that
same swap directly on the vendored entry, guarded so it fails loudly if React's
layout changes.

Verify with `scripts/benchmarks/verify-react-profiling.mts <image>`: 2 client chunks
carry the profiling renderer with the flag, 0 without.

**A caveat worth stating**: this is verified at the *bundle* level, not by driving the
real DevTools extension. A Playwright probe that injects a synthetic
`__REACT_DEVTOOLS_GLOBAL_HOOK__` cannot settle it — React sends a reduced inject
payload to a stub hook that is byte-identical for profiling and production builds, so
that probe returns a false negative for both. Confirm the Profiler tab with the real
extension.

## Where the re-render churn actually comes from

`scripts/benchmarks/measure-rerenders.mts` counts React commits on a board nobody is
touching, and attributes each commit to the shallowest component that re-rendered — the
point where the update entered the tree.

**An idle board commits 73–96 times per minute**, and in 60 s `@mantine/core/Box`
re-renders over 30,000 times. That is the churn behind the 650 MB peak: it is transient
allocation, not retention.

Roughly 80% of those commits enter at the *same place*: an anonymous provider at depth 2
whose props are `[value, children]` and whose value is `{appDir}` — Next.js's internal
`HeadManagerContext`. Its value is a fresh object literal on every App Router render, so
each one re-renders the entire application below it. The remainder enter around
`__next_metadata_boundary__` / `<title>`, which points the same way.

So the dominant cost is the **App Router root re-rendering about once a second**, not any
individual widget. No polling `router.refresh()` exists in application code, so the
trigger is inside Next's own router/metadata handling and is not fixed by anything in
this PR. That is the next thing to chase, and it is worth more than any further
component-level tuning: everything else is downstream of it.

`useTimeAgo` was calling `setState` every second even when the rendered label was
unchanged ("3 minutes ago" holds for a minute), so it now compares before setting. This
is a correctness fix — idle commits stayed within their 73–96 range afterwards, because
the app-root churn dominates and this hook is not what drives it. Recorded as *not* a
measured win.


## What is actually hogging the memory

Tested directly against the hypothesis that cached base64 images were bloating
TanStack Query / Redis. **They are not** — measured on a loaded 4-tab session:

| suspect | measured | verdict |
| --- | --- | --- |
| base64 data-URLs in server heap | **0.01 MiB** (2 strings) | not a factor |
| base64 blobs in browser heap | **0.01 MiB** (7 strings) | not a factor |
| Redis total | **2.17 MB** | not a factor |
| image bytes in Redis | **none** — `image-proxy` stores only URL + headers | not a factor |
| React Query `gcTime` | already 5 min, not 24 h | already addressed |

What the server heap is actually made of (141 MiB used, 259 MiB RSS):

| bucket | size | share of heap |
| --- | --- | --- |
| **bundled JS source retained as strings** | **41.4 MiB** | **~29%** |
| other strings (translations, ids, misc) | 10.3 MiB | 7% |
| URLs | 2.0 MiB | 1% |
| everything else (objects, code, maps) | ~87 MiB | 62% |

**The memory is the code, not cached data.** That is why every cache-tuning idea in the
fix catalog measured at zero, and why `serverExternalPackages` — which removes code from
the boot-loaded bundle — was the only lever that moved idle memory.

> **Correction (later round).** An earlier version of this section claimed "7.86 MiB is
> literal duplicate copies" of identical chunk sources. That figure was wrong. It came from
> grouping heap-snapshot strings by content, but **V8 truncates string contents to ~1 KiB
> when serialising a snapshot**, so the comparison only ever saw each string's first
> kilobyte and reported near-identical chunks as identical. Hashing the real files found
> **zero byte-identical duplicates among all 3,055 `.next/server/**/*.js` files (77.6 MiB)**.
> The chunks that looked like copies are distinct files that happen to begin with the same
> vendored module. The real doubling has a different cause — see "Why the source costs
> twice what it should" below.

`@ioredis/commands` is now external, which removes it from all 10 chunks. Recorded as
**bundle hygiene, not a memory win**: idle went 89.7 → 89.4 MiB, inside noise, and
board-loaded/peak differences were smaller than the run-to-run spread (one "before" run
read 220.6 MiB against 169–173 for identical code).

`got` and `@octokit/request-error` were deliberately **not** externalised. They are only
transitive dependencies here, and a check inside the image confirmed `got` is **not
traced** into `node_modules` — externalising it would have turned a bundled module into a
runtime `require` that resolves to nothing, trading zero measured gain for a possible
`MODULE_NOT_FOUND` on a code path the benchmarks never hit.

### Where the remaining headroom is

Nothing further is available from caches, Redis, or process trimming. The two real levers
left are both large:

1. **Ship less server JavaScript.** ~29% of the heap is retained bundle source. Every
   package moved out of the boot graph pays twice — smaller chunks and less retained
   source. This is the same lever that produced the −37% idle result.
2. **Stop the App Router re-rendering every second** (see above). That governs the
   browser side, which is where the 650 MB peak lives.

## Full attribution — every megabyte, top to bottom

Everything above measured *totals*. This section measures *composition*: each layer is
reconciled against the one above it, so nothing hides in a rounding gap. Tooling:
`scripts/benchmarks/attribute-memory.mts` (cgroup → processes → mappings → V8 spaces →
loaded code) with `scripts/benchmarks/memory-probe.cjs` injected as a `--require` preload.

The probe is diagnostics-only and is never in a shipped image: the harness mounts
`scripts/benchmarks` at `/probe` and sets `NODE_OPTIONS=--require /probe/memory-probe.cjs`.

### Layer 1 — the container is one process

| process | RSS at steady state |
| --- | --- |
| **next-server** | **188.1 MiB (95%)** |
| redis-server | 4.8 MiB |
| nginx (2 procs) | 3.7 MiB |
| shells | 1.3 MiB |

Redis and nginx are rounding errors. Every question about Homarr's memory is a question
about one Node process.

### Layer 2 — where that process's RSS lives

Measured from `/proc/<pid>/smaps`. Anonymous mappings cannot be told apart by size, so they
are classified by signature: V8 allocates its heap in **256 KiB pages** (`kRegularPageSize`),
and pthread reserves ~8 MiB per thread stack.

At boot idle (139 MiB RSS):

| region | RSS | what it is |
| --- | --- | --- |
| **node binary (code)** | **54.3 MiB** | the Node runtime's own text pages — **file-backed and shared**, so it counts in RSS but *not* in cgroup `anon` |
| V8 heap pages (256 KiB each) | 47.8 MiB | the JS heap |
| native malloc / small V8 spaces | 28.2 MiB | musl arenas, Buffers |
| V8 code range / trusted space | 4.8 MiB | |
| JIT code (anonymous executable) | 1.8 MiB | machine code V8 compiled |
| better_sqlite3.node | 2.0 MiB | the only native addon that matters |
| thread stacks | 0.1 MiB resident | 48 MiB *reserved*, essentially untouched |

**This explains the single most confusing number in the whole exercise:** RSS 139 MiB but
cgroup `anon` only 89 MiB. The 54 MiB gap is the Node binary itself. It is reclaimable page
cache shared with every other Node process on the host, so it is real RSS but not a real
cost — which is exactly why `anon` is the metric this PR reports.

Address space reserved but not committed: **16.8 GiB**. V8 claims its cage up front. It is
not memory.

### Layer 3 — inside the JS heap

| V8 space | boot idle | after real use |
| --- | --- | --- |
| old_space | 42.0 MiB | **97.2 MiB** |
| large_object_space | 22.7 MiB | 27.3 MiB |
| code_space + code_large | 1.9 MiB | 10.9 MiB |
| trusted_space | 3.9 MiB | 8.1 MiB |
| new_space | 0.0 MiB | 0.2 MiB |
| external (Buffers) | 4.1 MiB | 22.0 MiB |

### Layer 4 — what those objects *are*

From a post-GC heap snapshot at steady state (143.8 MiB heapUsed, 1.39M nodes):

| bucket | size | share of heap |
| --- | --- | --- |
| **bundled JS source retained as strings** | **41.0 MiB** | **28%** |
| ArrayBuffer backing stores | 17.6 MiB | 12% |
| object property/element arrays | 16.4 MiB | 11% |
| other strings (translations, ids) | 10.3 MiB | 7% |
| closures | 5.7 MiB | 4% |
| plain objects | 4.5 MiB | 3% |
| shapes/maps/descriptors | 6.6 MiB | 5% |
| compiled code metadata | ~12 MiB | 8% |

Confirmed again, with a dominator-tree analysis this time
(`scripts/benchmarks/analyze-heap-dominators.mjs`, real retained sizes rather than shallow
histograms): the largest single retainers are `code:` nodes named after chunk files, each
holding **0.5–1.4 MiB**, i.e. the Script objects keeping their own source alive. V8 retains
a script's source string for as long as any function in it might still be lazily compiled.

**The memory is the code, not cached data.**

### Why the source costs twice what it should

`.next/server` chunks loaded at boot are 21.7 MiB on disk, but the heap holds 32.4 MiB of
source strings. The gap is not duplication — it is character width.

A V8 string is either one byte per character (Latin-1) or two. **One character above U+00FF
anywhere in a file forces the entire source string to two bytes.**

| loaded JS | files | on disk | heap cost |
| --- | --- | --- | --- |
| pure Latin-1 | 1,025 | 12.25 MiB | 12.25 MiB |
| contains ≥1 char > U+00FF | **80** | 9.45 MiB | **18.91 MiB** |

Predicted total 31.16 MiB against 32.43 MiB measured — within 4%.

Proven directly rather than inferred, by reading one chunk as shipped and again with its
non-Latin-1 characters replaced (identical length):

```
_049nb9n._.js  538,519 chars, 2 of them non-Latin-1
  as shipped      : 1053 KiB per copy -> 2.00 bytes/char
  ascii variant   :  526 KiB per copy -> 1.00 bytes/char
```

**Two characters cost 527 KiB.** The offenders are almost all trivia in dependencies:

| chunk | non-ASCII chars | the actual characters |
| --- | --- | --- |
| `_049nb9n._.js` (+2 siblings) | 2 | `process.versions.icu?"✅":"Y "` |
| `[root-of-the-server]__1ipwvlq._.js` | 13,141 | Next's log symbols `○ ⨯ ⚠` |
| `_1ew9xg8._.js` (+ssr twin) | 70,175 | a UTF-8 self-test containing `💩` |
| zod chunks ×4 | 13,137 | `✖ ${i.message}` |
| `app-page-turbo.runtime.prod.js` | 13 | an ellipsis `…` |
| `[root-of-the-server]__1xyzm2f._.js` | 13 | **an em-dash in Homarr's own MCP instructions** |

Total recoverable: **~9.45 MiB of heap** (≈10% of idle `anon`), by emitting server bundles
with `\uXXXX` escapes instead of raw characters. Not implemented here — it means rewriting
minified vendor output at build time, and the safety argument needs to be made properly
before that ships. Recorded as a measured, mechanistically understood opportunity.

## The peak: one integration was allocating 46 MiB per refresh

The steady state above is ~237 MiB RSS. The *peak* during a 4-tab session was 429 MiB RSS /
539 MiB container, and that peak is a completely different phenomenon.

Per-stage V8 accounting (`scripts/benchmarks/analyze-probe-stages.mjs`):

| stage | rss | old_space | external | **arrayBuffers** |
| --- | --- | --- | --- | --- |
| boot idle | 138.6 | 42.0 | 4.1 | 0.3 |
| board loaded | 254.9 | 95.3 | 22.9 | 3.0 |
| nav ×3 | 361.9 | 122.5 | 24.7 | 4.8 |
| **4 tabs, 2 boards** | **429.3** | **152.6** | **114.3** | **94.3** |
| after 90 s idle | 237.0 | 97.2 | 22.0 | **2.0** |

`arrayBuffers` goes **0.3 → 94.3 → 2.0**. It is entirely transient — which is precisely why
the app appears to "oscillate between 835 MB and 400 MB" and never settles at the high mark.
Soak growth was **−102 MiB/hour**: there is no leak.

Tracking large `Buffer` allocations by stack (`HOMARR_PROBE_TRACK_BUFFERS`) put **48.3 MiB
in 16 allocations at one site, with a single allocation of 46.3 MiB**:

```
T (/app/apps/nextjs/.next/server/chunks/_1q3xovl._.js:92:32374)
process.processTicksAndRejections
```

That function is undici's `fullyReadBody` — the machinery behind `Response.json()`:

```js
async function T(A,e,t){ let r=[],s=0; for(;;){ let{done:i,value:o}=await A.read();
  if(i) return void e(Buffer.concat(r,s)); r.push(o), s+=o.length } }
```

It holds the chunk list *and* the joined copy at the same moment, so a body of size N costs
~2N at the instant it completes. Capturing the bytes identified the response immediately:

```
46.3 MiB assembled from 3,946 socket chunks
{"data":[{"id":"1251f6db…","websiteId":"f133f10c…","sessionId":"9e02d227…","createdAt":"2026-08-09T…
```

**Umami.** And the cause was in plain source — two call sites requesting
`pageSize: "100000"`, i.e. up to 100,000 raw event records:

1. `getEventNamesAsync` downloaded every raw event of the last 30 days **to collect a
   handful of distinct event name strings**.
2. `getWebsiteEventTimeSeriesAsync` downloaded them to bucket them into a time series.
3. `getMultiEventTimeSeriesAsync` ran (2) for **every tracked event name concurrently** via
   `Promise.all`, multiplying the resident pages by the number of events.

A board with 3 Umami widgets and several tracked events therefore had several ~46 MiB bodies
in flight at once, each briefly doubled, plus ~100k parsed objects per response landing in
old_space. That is the 500–880 MB.

### The fix

| call site | before | after |
| --- | --- | --- |
| `getEventNamesAsync` | list 100k raw events, collect distinct names | aggregated `/metrics?type=event`, one row per name |
| `getWebsiteEventTimeSeriesAsync` | one page of up to 100k records | pages of 1,000, folded into buckets and released |
| `getMultiEventTimeSeriesAsync` | `Promise.all` over all event names | sequential |

The paging path keeps the existing dual-shape handling: instances that return aggregated
`{x,y}` buckets still answer in one request, and an instance that accepts `pageSize` but
ignores `page` is detected (repeated first record id) and stopped rather than double-counted.
Hitting the page ceiling logs a warning instead of silently undercounting.

Covered by `packages/integrations/src/umami/test/umami-integration.spec.ts` (6 tests, new —
there were none).

### Result

Alternated runs, 2 before and 2 after, same harness and workload, `before` = branch HEAD
`f707f6433`, `after` = HEAD + this change. Per-run values are given because the harness's
own spread is what decides whether a difference means anything.

| metric | before | after | change | before spread / after spread |
| --- | --- | --- | --- | --- |
| **peak container** | 498.9 MiB | **398.5 MiB** | **−20%** | [461.6, 536.3] / [387.0, 410.0] |
| **peak node RSS** | 452.4 MiB | **353.3 MiB** | **−22%** | [432.7, 472.2] / [355.6, 350.9] |
| **peak during 4 tabs** | 498.5 MiB | **356.3 MiB** | **−29%** | [460.8, 536.3] / [341.8, 370.8] |
| **peak arrayBuffers** | 95.8 MiB | **6.6 MiB** | **−93%** | [95.7, 95.8] / [6.4, 6.7] |
| largest single allocation | 46.4 MiB | **2.4 MiB** | −95% | identical in both runs |
| post-soak steady state | 324.2 MiB | 322.5 MiB | −1% | [337.7, 310.7] / [280.7, 364.4] |
| boot idle | 119.4 MiB | 125.8 MiB | +5% | [130.0, 108.8] / [152.8, 98.8] |
| median board load | 526 ms | 523 ms | −1% | [389, 663] / [401, 645] |
| CPU over the run | 19.5 s | 20.4 s | +4% | [19.6, 19.4] / [20.3, 20.4] |

Every peak metric separates cleanly — the two sides' ranges do not overlap. Two rows do
**not** support a claim and are listed so they are not read as one:

- **post-soak steady state is inconclusive.** One "after" run finished at 364.4 MiB, above
  a "before" run at 310.7. This change targets a transient spike, so a steady-state effect
  was not expected.
- **boot idle is noise.** The spread is ±20 MiB on *identical* code (before: 130.0 vs
  108.8), which is wider than the apparent difference. Umami's code is not even loaded at
  boot; it arrives when a board containing the widget renders.

The cost is **+4% CPU**, from turning one large request into several smaller ones. Board
load latency did not regress.

A prediction worth recording, because it confirms the mechanism rather than just the
outcome: at `pageSize=1000` the largest allocation measured 0.7 MiB, and at 5,000 it
measured 2.4 MiB — 5× the page size, 3.4× the bytes, exactly as a per-page bound implies.

### What the real instance revealed

Widget readiness is identical before and after — 28/28 on the board carrying the three
Umami widgets, and the same single pre-existing error on the other board — so nothing broke.
But the container log from the "after" runs contains something the "before" runs could not
have produced:

```
warn: Event time series hit the page ceiling, counts are a lower bound
      module="umami-integration" eventName="Add app" maxRecords="100000"
```

That site really does have more than 100,000 events for one event name in the window. **The
old code had exactly the same ceiling** — `pageSize=100000` is 100k records — and the 46.3 MiB
body it received was that ceiling being hit. The difference is that it truncated in silence
and reported the undercount as fact. The ceiling is unchanged; it is now visible.

This is also the worst case for the round-trip trade-off: that one event name costs 20
sequential requests. It did not show up in board load latency (523 ms vs 526 ms median),
because the widget fetches after the board renders, and total CPU rose 4%.

## Dissecting the peak, not the idle

Everything above measures a drained process — boot idle, or post-soak. That is the wrong
moment: users complain about the high-water mark. Measuring it needs different instruments,
because the obvious one cannot work.

**A heap snapshot can never explain a peak.** V8 runs a full GC before serialising one, so by
construction it reports what survived. The 94 MiB of ArrayBuffers that drove this container to
500 MB was invisible in every snapshot taken. Three instruments were added instead:

| instrument | what it sees | blind to |
| --- | --- | --- |
| `HeapProfiler.startSampling` (in-process `inspector.Session`) | every V8-heap allocation, survivor or garbage, with a stack | anything outside the V8 heap |
| wrapped `Buffer.alloc`/`concat` | external buffer allocations, with a stack | V8-heap objects |
| `/proc/<pid>/smaps` at every stage | JS heap vs JIT vs native vs file-backed | anything below page granularity |

Together they cover the whole address space. Neither of the first two alone would have found
the Umami bug: the sampling profiler cannot see `Buffer` backing stores, which is precisely
where those 46 MiB lived.

### An observer effect worth recording

The first attempt took the peak snapshot over CDP, which delivers it as JS string chunks. For
a ~135 MB snapshot that added **~134 MiB of ArrayBuffers to the process being measured**, and
the stage right after it read 693.7 MiB. That is an artefact, not an application problem —
and it is exactly the kind of number that gets reported as a finding. Switching to
`v8.writeHeapSnapshot`, which streams from C++, removed it. The probe now reports its own
`observerCostMiB` so the cost of looking is visible rather than assumed to be zero.

### What the peak is actually made of

Peak here is `nav-01`, not the multi-tab stage — a GC lands during multi-tab and pulls RSS
*down*, so "most tabs open" is not the same as "most memory". Node RSS 357.8 MiB:

| component | MiB | notes |
| --- | --- | --- |
| live JS objects (`heapUsed`) | 175.7 | of which ~41 MiB is retained bundle source |
| node binary text | 65.7 | file-backed and shared; not in cgroup `anon` |
| native malloc | ~59 | see below |
| external buffers | 24.6 | |
| V8 committed but free | 12.3 | heapTotal − heapUsed |
| JIT code | 10.1 | grew from 1.9 MiB at boot |

Cross-checked rather than assumed: `heapTotal 188.0 − V8's 256 KiB pages 153.1 = 34.9 MiB`,
which matches `large_object_space` at 34.5 MiB. So the handful of very large anonymous
mappings (31.6, 20.7, 8.4 MiB) are V8's large-object space and external buffers — **not** the
runaway native allocator that their shape first suggested.

**The retained heap at peak is the same as at rest.** A post-GC snapshot at peak has 160.7 MiB
of shallow size against 157.7 MiB after the soak; strings 51.1 vs 50.1 MiB. Nothing
accumulates. The peak is transient churn plus pages V8 and malloc have not returned — which is
why memory "oscillates" and why soak growth is negative.

And the churn is small now: total V8-heap allocation across the entire run is **125 MiB**, 40%
of it node's own module loader reading source files. After the Umami fix the multi-tab burst
allocates **3.3 MiB**. There is no longer a churn problem on the JS side.

## The 16 MiB nobody was using: ssh2

The largest single retainer in every snapshot — at boot, at peak, and after the soak — was one
`system / Context` holding **16.03 MiB**. Expanding it through the dominator tree (a plain
graph walk escapes via `__proto__` and reports the whole heap) named it immediately:

```
=== inside the largest retainer (object:system / Context, 16.03 MiB) ===
     16.00 MiB  (indirect) -> object:ArrayBuffer
      0.00 MiB  POLY1305_WASM_MODULE -> object:Object
      0.00 MiB  ChaChaPolyCipherNative -> closure:ChaChaPolyCipherNative
      0.00 MiB  AESGCMCipherNative -> closure:AESGCMCipherNative
```

`ssh2`. Its crypto module instantiates a WebAssembly memory for ChaCha20-Poly1305 the moment
it is required. Homarr has no SSH feature and does not depend on ssh2; the chain is
`dockerode → docker-modem → ssh2`, and `docker-modem/lib/modem.js` requires `./ssh` at module
scope while using it in exactly one place, already guarded by `protocol === 'ssh'`.

Measured directly inside the image — requiring ssh2 and nothing else:

```
heapUsed  +2.6 MiB     external  +0.9 MiB     rss  +14.0 MiB
```

Fixed with a pnpm patch moving that one require inside the branch that uses it. SSH-based
Docker hosts still work — `require` is cached, so they pay it once — and socket-based installs,
which is everyone else, never load it.

### The same question asked of every dependency

Since one package was hiding 14 MiB behind a require, all 173 were measured the same way: each
required in a fresh process, RSS delta recorded. Packages costing more than 2 MiB, cross-checked
against whether the server actually loads them:

| package | RSS to require | loaded at runtime? |
| --- | --- | --- |
| drizzle-orm | 124.3 MiB | only via subpaths — the root import loads every dialect, so this figure overstates it |
| @kubernetes/client-node | 66.9 MiB | **no** — correctly lazy |
| dockerode | 28.8 MiB | yes (includes docker-modem 16.1 and ssh2 14.3) |
| **mysql2** | **20.9 MiB** | **yes — 77 files, on a SQLite install** |
| sharp | 20.4 MiB | no |
| openid-client / jose | 16.1 / 15.5 MiB | no |
| @grpc/grpc-js | 14.6 MiB | yes, 61 files (via dockerode) |
| **pg** | **9.4 MiB** | **yes — 13 files, on a SQLite install** |

These are not additive — dockerode's figure contains ssh2's — but the ranking is what matters.

**mysql2 and pg are loaded on every SQLite install.** `db/drivers/index.ts` statically imports
all three driver wrappers and picks one at call time, so importing the module executes all
three. Not yet fixed: `packages/db/index.ts` does `export const db = createDb(schema)` at
module scope, so `createDb` must stay synchronous and cannot use `await import()`. The viable
route is deferring the external `require` inside each wrapper. Both dialects have testcontainer
migration tests, so it is verifiable — it is queued, not dismissed.

## Why 24 MiB of code is resident before the first request

The module cache is a flat list with no parentage, so "what pulled this in" needed the
require graph recorded as the loader resolves it (`HOMARR_PROBE_TRACK_REQUIRES=1`, analysed
by `scripts/benchmarks/analyze-require-graph.mjs`). At boot idle, having served only
`/api/health/ready`: **2,004 edges over 1,121 nodes, 23.97 MiB of source**.

| importer | subtree |
| --- | --- |
| `apps/nextjs/server.js` (everything) | 23.83 MiB / 1,087 files |
| `next/dist/server/load-components.js` | 21.75 MiB / 796 files |
| **`[root-of-the-server]__0g06wx7._.js`** | **16.10 MiB / 460 files** |
| next's own framework code, exclusively | 2.16 MiB / 315 files |

Two things follow, and the second is the one that matters:

1. **Next loads all 74 app route bundles at startup**, not on first request. That is
   framework behaviour, not something this codebase sets.
2. **One subtree of 16.10 MiB / 460 files is reached by the tRPC/API routes *and* by
   `instrumentation`** — the cron tasks and websocket server. Exclusive attribution for
   instrumentation is therefore **0 bytes**: everything it touches, an API route touches
   too. Only 1.10 MiB / 119 files is common to *every* route, so this is not one universal
   barrel — it is specifically the API surface pulling in every integration and widget
   request handler.

That kills the obvious fix. Deferring `instrumentation` would free nothing, because Next
preloads `/api/[...trpc]` at boot and that route reaches the same graph. Cutting this
requires the tRPC router to stop referencing every integration eagerly — the same lever the
integrations barrel diet started, with roughly 16 MiB of source still behind it. Recorded
as measured and understood, not attempted here.

## Measured but not pursued


| lever | measured cost | why not pursued |
| --- | --- | --- |
| in-image Redis (F12) | **8.1 MiB RSS** (6.3 PSS) | The catalog estimated 10–40 MB; the real figure is 8. Removing it means replacing the pub/sub bus for single-instance — real risk for ~5% of the footprint. |
| in-image nginx (F13) | **9.2 MiB RSS** (3.1 PSS) | Two processes, but PSS is 3 MiB. It terminates TLS and proxies; not worth the deployment change at this size. |
| locale subset (F19) | ~12 MB image | Reduces languages a user can pick — a product decision, not an optimisation, and it does not move RAM. |

`next-server` is **225.8 MiB RSS of the ~236 MiB total** at board-loaded, so process-level
trimming has little left to give. Further wins have to come out of that one heap.

## Is the measurement actually behind a login?

Worth stating explicitly, because "28 widgets rendered" would be meaningless if the board
were public. Each run now asserts all three:

1. `access fixture changes: none` — the harness modified nothing in the restored data.
2. `control: anonymous access to /boards/default denied (landed on /auth/login)` — a
   cookie-less context cannot render the board, so it is genuinely permission-gated.
3. `signed in as demo (session cookie "homarr.session-token" present)` — Auth.js issued a
   session; leaving `/auth/login` alone is not accepted as proof.

Earlier rounds were correct but only *inferred* this from the private board rendering; the
assertions now fail the run instead of quietly measuring an anonymous page.

## Round 4 — the client, which the container numbers never showed

A real session reached ~880 MB server and a **650 MB browser heap**. The harness had
been measuring one tab on one board with no interaction, so it saw none of this.

### What the 650 MB actually is

From the captured `.heapsnapshot` (4M nodes, 18.2M edges):

- **71,596 live React Fibers** (~35k components). Identified structurally, not by name:
  the retainer edges are `alternate`, `return`, `child` and `__reactFiber$…`.
- ~7,900 SVG element fibers (charts and icons), 1,726 `<td>`, ~88k event listeners.
- **Retained heap is only 181 MiB** against a 650 MB peak. Snapshots are taken after a
  forced GC, so the rest is transient allocation churn from re-rendering — not
  retention. The trace agrees: **71,850 `UpdateLayer` events**, 41 s in `v8.callFunction`.

So the client cost is render volume and re-render churn. Tuning `gcTime` would not
have touched it.

### The most-mounted component

`@mantine/core/Box` (513 of 3,918 fibers on a 28-widget board). It is Mantine's
universal primitive — every Mantine component renders through it — so it is a symptom
of how many components are mounted, not a bug in itself. Matching proportions
(13% here, 17% in the 650 MB snapshot) make it near-certain that the minified `y` in
that snapshot is `Box`.

The genuinely suspicious finding was **71 `Menu` → `Popover` → `PopoverDropdown`
triplets** mounted on a board that shows 28 widgets. A controlled experiment using the
existing `enableRightClickOnWidgets` user flag isolates the cost:

| board state | fibers |
| --- | --- |
| per-item context menus on | 3,918 |
| per-item context menus off | 3,554 |

**364 fibers, 9%, for menus that are almost never opened** — and it scales with item
count. The dropdown *contents* are already lazy; the `Menu`/`Popover`/`PopoverDropdown`
wrappers are not.

### The fix: one board-level menu (shipped)

`WidgetContextMenuProvider` mounts a single menu for the whole board, anchored to the
cursor. Items keep only a `contextmenu`/long-press listener. The dropdown takes the
section's gridstack ref as a prop, because the shared menu lives outside any
`SectionContext` — reading it from context there crashed the board.

Verified with `scripts/benchmarks/verify-context-menu.mts`, run against both builds:

| | per-item menus | shared menu |
| --- | --- | --- |
| menu opens on right-click | PASS | PASS |
| menu shows actions | PASS (5) | PASS (5) |
| Escape closes it | PASS | PASS |
| re-opens on a second widget | PASS | PASS |
| idle fibers | 18,670 | **16,278 (−12.8%)** |
| fibers added by using the menu | +4,191 | **+4** |

Memory, two runs each, four tabs across two boards:

| metric | per-item (mean) | shared (mean) | change |
| --- | --- | --- | --- |
| JS event listeners | 10,128 | **7,774** | **−23%** |
| DOM nodes | 9,189 | **8,287** | **−10%** |
| browser JS heap | 54.1 MiB | 52.7 MiB | −2.5% |
| median board load | 520 ms | 479 ms | faster |
| container CPU | 20.4 s | 20.0 s | unchanged |

Server memory is unchanged, as expected for a client-only change. One `after-stress`
sample read 362 MiB against ~267 for its pair and for both controls — GC timing on a
single sample, not a regression.

The listener reduction is the one that matters most: the 650 MB session had ~88k
listeners, and this removes a per-widget source of them.

### Two earlier attempts, and a broken test

A first attempt deferred each item's `Menu` until the first right-click. It was reverted
after the gate failed it — but **that verdict was wrong**: the gate used Playwright's
`click({ button: "right" })`, which does not emit a `contextmenu` event here, so it
failed *shipped code* identically. The "fiber explosion" attributed to that change showed
up on the control too.

The gate now dispatches a real `contextmenu` event and is validated by passing against
unmodified code first. Any optimisation gate that has never been run against the
un-optimised build is not evidence — it can only tell you something changed, not that it
still works.

### A measurement flaw worth recording

The `demo` account in the backup had `completed_board_tour = 0`, so every run before
this round was measuring the **first-time-user path with the onboarding tour mounted**.
Completing the tour changed the tree by only 38 fibers, so the earlier numbers stand —
but the harness was not measuring steady state, and that was luck rather than design.

### Server side

A server heap snapshot pulled from a live container: **37 of 70 MiB is strings**
(71,287 of them), consistent with the memoised translation payload. Unexplored.

## Recommendation

**Keep** — carries the measured win:

1. `--max-semi-space-size=4` — 1 line, the biggest single lever (−19% idle, −21% peak)
2. `serverExternalPackages` — the DB drivers alone were −21 MiB idle; the wider set
   another −18 MiB at board-loaded, at +13 MB image
3. integrations barrel diet — the under-load win
4. V8 heap cap — 1 line, bounds the pathological drift (label it as a ceiling)
5. jsdom → linkedom — image size + a genuine XSS hardening; a `jsdom` import costs
   ~136 MiB RSS whenever the SVG path is hit
6. dead `/api/about` routes + runtime `package.json` glob removal

**Drop** — measured at zero, and it is most of the diff:

1. `packages/next-cache-handler` (~290 lines, orphaned)
2. `cache-invalidation.ts`, `cache-tags.ts` and all 66 call sites across ~30 routers
3. Redis 6 → 2 consolidation is defensible hygiene but bought nothing measurable —
   low priority, not worth the churn on its own

Dropping 1 and 2 removes the bulk of the file churn while keeping 100% of the measured
memory improvement.

## Reproducing

```bash
STRESS_IMAGE=homarr-bench:branch \
STRESS_BACKUP_ZIP=~/Downloads/your-backup.zip \
node --experimental-strip-types scripts/benchmarks/stress-restore.mts
```

The backup is read from that path and never copied into the repo — it contains real
integration secrets and the instance's encryption key.

## What has not been verified

Stating these plainly, because an unqualified "tested" would be wrong:

- **No long-duration soak.** The reports behind #5301 are about growth over *days*; the
  longest run here is 2 minutes of idle. Nothing here demonstrates the multi-GB drift is
  fixed — the V8 heap cap bounds it by construction, but that is an argument, not a
  measurement.
- **Single user, single browser.** No concurrent users, no multi-instance
  (`REDIS_IS_EXTERNAL=true`) deployment, no non-SQLite database. The DB-driver
  unbundling in particular is only exercised on the SQLite path.
- **The React DevTools Profiler tab itself.** The profiling build is verified at the
  bundle level; a synthetic devtools hook cannot confirm the tab, so that last step needs
  the real extension.
- **The dominant client cost is unfixed.** The App Router root re-renders ~1×/second and
  that drives most of the churn. Everything shipped here is downstream of it.
- **Only the board path is covered end-to-end.** Manage pages, onboarding and integration
  flows are covered by CI's E2E suite, not by these benchmarks.
- **Two tests are flaky in CI** (`pi-hole`, backup ZIP) and both pass in isolation
  locally. They are pre-existing and unrelated to these changes, but they mean a green
  run is not automatic.
