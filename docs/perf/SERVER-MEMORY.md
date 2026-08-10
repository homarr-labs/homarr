# Server memory: what the container's RAM is made of

Measured with `scripts/benchmarks/stress-restore.mts` on a restored real backup. See
[METHODOLOGY.md](./METHODOLOGY.md) for the tools and the measurement traps, and
[REJECTED.md](./REJECTED.md) for everything that was tried and abandoned.

## Metric choice

`memory.current` moved between **192 and 261 MiB for the same baseline image** across runs,
because cgroup v2 counts reclaimable page cache. At idle that split was 144 MiB anon vs
77 MiB page cache. Everything below therefore reports **anonymous memory**, which was
stable to ±2.5 MiB across repeated runs of the same image.

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

> **Correction.** The RSS figures in the table above were measured without forcing a GC
> between readings, so they include V8 growing its heap opportunistically rather than the real
> cost of the module. Re-measured with `global.gc()` before each reading, the two unused
> database drivers cost **21.4 MiB RSS / 4.1 MiB heap**, not the ~30 MiB the naive sum implied
> — and `drizzle-orm`'s 124.3 MiB was almost entirely this artefact. The ssh2 conclusion is
> unaffected: it was confirmed independently by the before/after external-memory drop.

### mysql2 and pg load on every SQLite install — and it was not worth fixing

`db/drivers/index.ts` statically imports all three driver wrappers and picks one at call time,
so importing the module executes all three. Confirmed at runtime: mysql2 (77 files) and pg
(13 files) are resident on a SQLite install. Re-measured properly, the prize is **21.4 MiB**.

Three attempts, each caught by testing the real image rather than by typecheck:

1. `createRequire(import.meta.url)` — this module is bundled into two entry points, and
   `db/migrations/<dialect>/migrate.cjs` is **CommonJS**, where `import.meta.url` compiles to
   `undefined`. `createRequire` threw `ERR_INVALID_ARG_VALUE` at load and took down migrations,
   and therefore startup, **for every dialect including SQLite**. Fixed by basing resolution on
   `process.cwd()`.
2. With that fixed, MySQL failed with `MODULE_NOT_FOUND` on
   `drizzle-orm/mysql2/index.cjs`. A dynamic `require` resolves through the package's `require`
   condition to a `.cjs` build, and Next's tracing only ever copied the ESM `index.js` into the
   standalone output.
3. Leaving drizzle's dialect as a static import defeats the purpose entirely:
   `drizzle-orm/mysql2` itself does `from "mysql2"`, so the client loads anyway. Verified — the
   built image still loaded all 77 mysql2 files.

That leaves two routes, and both are worse than the problem. Forcing drizzle's `.cjs` into the
image via `outputFileTracingIncludes` would load **a second copy of drizzle's core** next to
the ESM one for MySQL users, so class identities and `is()` checks would straddle two module
instances. Requiring the ESM file works under Node 24's `require(esm)` — but only via an
absolute path (`/app/node_modules/drizzle-orm/mysql2/index.js`); both bare specifiers fail,
so it would hardcode drizzle's internal file layout and a drizzle upgrade would break
*startup* for MySQL and Postgres users.

**Backed out.** 21.4 MiB is not worth a startup-failure class of risk on two dialects that
cannot be exercised in normal development. The blocker to record is structural: `createDb`
must stay synchronous because `packages/db/index.ts` does `export const db = createDb(schema)`
at module scope and `migrate.cjs` is CommonJS, so neither `await import()` nor top-level await
is available. Making the database handle async would unblock it.

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

1. **Next loads all 74 app route bundles at startup**, not on first request. ~~That is
   framework behaviour, not something this codebase sets.~~ **That was wrong** — see below.
2. **One subtree of 16.10 MiB / 460 files is reached by the tRPC/API routes *and* by
   `instrumentation`** — the cron tasks and websocket server. Exclusive attribution for
   instrumentation is therefore **0 bytes**: everything it touches, an API route touches
   too. Only 1.10 MiB / 119 files is common to *every* route, so this is not one universal
   barrel — it is specifically the API surface pulling in every integration and widget
   request handler.

That kills the obvious fix. Deferring `instrumentation` would free nothing, because Next
preloads `/api/[...trpc]` at boot and that route reaches the same graph. Cutting the shared
subtree itself requires the tRPC router to stop referencing every integration eagerly — the same
lever the integrations barrel diet started, with roughly 16 MiB of source still behind it.

### Correction: preloading *is* configurable, and turning it off is the largest idle win here

The claim above that route preloading is "framework behaviour, not something this codebase sets"
was wrong. Next documents `experimental.preloadEntriesOnStart: false` for exactly this, and the
guide describes it as preventing the server from preloading page modules into memory at startup.
Found by reading Next's own memory-usage guide rather than by inference — which is the lesson.

Deterministic per-stage measurements, identical across both runs on each side:

| stage | source loaded | files | heapUsed |
| --- | --- | --- | --- |
| boot idle | 24.0 → **10.6 MiB** | 1114 → **706** | 70.7 → **44.8 MiB** (−37%) |
| post-login | 27.9 → **19.3 MiB** | 1215 → **884** | 123.8 → **109.8 MiB** |
| board loaded | 29.0 → **21.7 MiB** | 1323 → **1006** | run-to-run noise |
| multi-tab | 29.2 → **22.9 MiB** | 1325 → **1015** | 139.7 → **127.8 MiB** |
| post-soak | 29.2 → **22.9 MiB** | 1325 → **1015** | 142.5 → **127.4 MiB** |

The last two rows are the important ones: **310 files and 6.3 MiB of source stay unloaded even
after a full multi-tab session**, so this is not merely deferred cost — routes a session never
visits are never paid for at all. Live heap is lower at every stage.

Peak node RSS does not move (350.3 → 346.1, spreads overlap), for the same reason the ssh2 chop
did not move it: V8 sizes its heap against available headroom, so a smaller live set does not
shrink peak RSS. Median board load is +3% with overlapping spreads, so the first-hit cost this
trades for did not show at this workload. Full E2E suite passes 8/8.

Also from that guide, and **not** applicable here: `webpackMemoryOptimizations`,
`serverSourceMaps`, `enablePrerenderSourceMaps` and disabling the Webpack cache all address
*build-time* memory, and this build uses Turbopack.

### `--jitless`: rejected, and the reason generalises

V8's `--jitless` removes the optimising compiler and all generated machine code. It applies
through `NODE_OPTIONS` and its effect on code memory is real and unambiguous: **code space
11.6 → 0.0 MiB**. The stress figures looked spectacular — peak node RSS −24%, peak container
−36%, CPU −14%, median board load 30% *faster*.

Three of those are impossible. The flag was applied to the **server**, so it cannot make the
browser lighter, and removing an optimising compiler does not make code faster. The client
metrics show what actually happened:

| | normal | jitless |
| --- | --- | --- |
| DOM nodes | 8,256 / 8,280 | **5,442 / 5,442** |
| JS event listeners | 7,781 / 7,784 | **1,570 / 1,570** |
| browser JS heap | 50.0 / 49.5 MiB | 28.1 / 28.2 MiB |
| widget controls available | 244 | 216 |

Boards still reported 28/28 widgets ready, so the coarse readiness check passed — but the page
carries **80% fewer event listeners**. Much of the UI never mounted. The memory "win" is an app
doing less work, and the CPU and latency "improvements" are the same artefact.

The generalisable tell: **when a server-side change moves a client-side metric, the workload
changed and the comparison is void.**

Flags that cannot be used this way at all: `--optimize-for-size`, `--no-opt` and `--lite-mode`
are rejected by Node with "not allowed in NODE_OPTIONS".

## Closing the last gap: what the native bucket at peak actually is

At peak the `smaps` bucket "other anonymous" holds **118.8 MiB** and was the least understood
part of the footprint. It is now mostly accounted for:

| component | MiB | how it was established |
| --- | --- | --- |
| V8 `large_object_space` | 34.5 | `heapTotal 188.0 − the 256 KiB pages 153.1 = 34.9`, matching the space report |
| `external` — Buffers/ArrayBuffers | 24.6 | `process.memoryUsage()` |
| freed-but-unreturned V8 zone memory | ~38 | `peak_malloced_memory` 4.6 → **42.2 MiB** at the board-loaded stage, while *current* `malloced_memory` stays at 1.0 MiB |
| unattributed native malloc | ~22 | remainder |

The zone figure is the interesting one. V8 mallocs ~38 MiB of parser/compiler zone memory while
compiling the board's modules, frees it back to malloc, and **musl never returns it to the
kernel** — so it stays resident as anonymous memory with nothing alive in it.

### A prediction that was wrong

The obvious inference — loading fewer files means less compiler zone memory, so "ship less
server JS" pays twice — **does not hold**. `peak_malloced_memory` measured across the
`preloadEntriesOnStart` A/B:

| stage | before ×2 | after ×2 |
| --- | --- | --- |
| boot idle | 4.5, 4.5 | 4.5, 4.5 |
| post-login | 4.5, 4.5 | 4.5, 4.5 |
| board loaded | 42.1, 42.3 | 42.1, 42.1 |

Identical, despite 310 fewer files being loaded. The 38 MiB spike is a **fixed cost incurred at
board load**, not a per-file one — one large parse or compile, not the sum of many. So the
"pays twice" claim is withdrawn; `preloadEntriesOnStart` saves retained source and live heap, and
does nothing for the native bucket.

### The zlib-orphan hypothesis: disproven here

Next's own source documents a real leak class: a zlib stream left open by a client disconnect is
pinned by its native handle, survives GC, and permanently retains ~256 KiB of deflate state.
`releaseCompressionStream`, the fix, is **not present** in this Next build, and a peak heap
snapshot showed 16 `Zlib` and 15 `Gzip` objects — 14 still there at idle, which looked exactly
like accumulation.

It is not. `process.getActiveResourcesInfo()` reports **Zlib=0**, both at baseline and after
**300 deliberately aborted gzip requests**, with RSS flat at 136.5 MiB. Those snapshot entries
are heap objects, not live handles — an important distinction, since a snapshot happily lists
objects with no live native resource behind them. nginx buffers the response from Next, so Next
never observes the mid-response client disconnect that creates an orphan in the first place.

Recorded because the initial reading of the snapshot was wrong in a way that would have shipped a
fix for a leak this deployment does not have.

## The 38 MiB of compiler zones: attributed, then found to be unaddressable

The largest single item in the peak breakdown that was never explained is now explained, and then
closed off.

**It is V8's optimising compiler.** `peak_malloced_memory` jumps from 4.5 MiB to 42.1 MiB the
moment a board's modules are compiled, while *current* `malloced_memory` stays at 1.0 MiB — memory
V8 takes for compilation, frees back to malloc, and that musl never returns to the kernel. Proven
by re-reading the `--jitless` runs, where the spike **never happens at all**:

| stage | normal | `--jitless` |
| --- | --- | --- |
| boot idle | 4.5 MiB | 4.5 MiB |
| **board loaded** | **42.1 MiB** | **4.5 MiB** |
| multi-tab | 42.7 MiB | 4.5 MiB |

`--jitless` itself is unusable (it leaves the page under-rendered — see above), but V8 can cap the
*tier* instead of removing code generation: `--max-opt=3` is the default Turbofan, `2` stops at
Maglev, `1` at Sparkplug. It is rejected by `NODE_OPTIONS` but accepted on the command line, so it
was wired behind `HOMARR_MAX_OPT` and A/B'd on one image.

**`--max-opt=2` is a null result for memory:**

| stage | full | capped at Maglev |
| --- | --- | --- |
| peak anon | 276.0 MiB | 282.8 MiB (+2%) |
| boot idle | 64.0 MiB | 72.3 MiB (+13%) |
| board loaded | 186.1 MiB | 179.2 MiB (−4%) |
| 4 tabs | 270.8 MiB | 238.5 MiB (−12%) |
| after soak | 199.0 MiB | 214.3 MiB (+8%) |
| CPU | 28.1 s | 27.8 s (unchanged) |

Render integrity was checked explicitly this time, because that is how `--jitless` was caught:
listeners were **7,784 in all four runs** and DOM nodes within 40 of each other, so unlike jitless
the page rendered fully and the comparison is valid. There is simply no consistent memory win —
some stages better, some worse, peak unchanged.

The mechanism says why, and it is worth recording as a closed door. Measured directly with the
probe under `--max-opt=2`:

```
01-boot-idle     peak_malloced=  4.5 MiB
03-post-login    peak_malloced=  4.5 MiB
04-board-loaded  peak_malloced= 42.1 MiB   <- identical to Turbofan
```

**Maglev's zone allocation is just as large as Turbofan's.** Capping the tier does not reduce zone
memory; only not compiling at all does, and that breaks the page. So this 38 MiB is not reachable
through V8 configuration — it is proportional to how much JavaScript V8 has to compile, which puts
it back under the one remaining server-side lever: ship less server code. Reverted.
