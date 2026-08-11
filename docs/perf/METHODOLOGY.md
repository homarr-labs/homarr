# Methodology, and the traps that produced wrong answers

Every wrong number in this investigation came from an instrument, not from the application. They are
recorded here because each one looked plausible at the time, and several survived long enough to be
published before being caught.

## The harness

`scripts/benchmarks/stress-restore.mts` boots a fresh container, restores a supplied backup
**through the onboarding restore UI** (including typing "I understand"), signs in, opens boards
across several tabs, clicks into widgets, reloads, then soaks idle — sampling memory, CPU, browser
heap, DOM nodes and listeners at each stage.

Each run proves it is actually behind a login rather than reading a public page: it asserts a
cookie-less request to the private board is **denied**, requires the Auth.js session cookie after
sign-in, and reports whether it modified the restored data at all.

The backup is passed by path via `STRESS_BACKUP_ZIP` and never enters the repository — it carries
real integration secrets. `.gitignore` also refuses `homarr-backup*.zip` and loose `*.sqlite`.

## Tools

| tool | answers |
| --- | --- |
| `attribute-memory.mts` | cgroup → processes → address-space mappings → V8 spaces → loaded code, each layer reconciled against the one above |
| `memory-probe.cjs` | injected `--require` preload: V8 spaces, module cache, buffer/fetch allocation sites, require graph, smaps, handles. Diagnostics only, never shipped |
| `analyze-heap-dominators.mjs` | real retained sizes via a dominator tree, and expansion of the largest retainer |
| `analyze-allocations.mjs` | allocation volume by site, diffable between two stages |
| `analyze-smaps-stages.mjs` | RSS split into JS heap, JIT, native and file-backed, per stage |
| `analyze-require-graph.mjs` | what pulled each module in |
| `compare-stress-runs.mjs` | alternated runs, medians **and per-run spread** |
| `measure-widget-cost.mts` | per-widget DOM nodes, fibers, heaviest components |
| `measure-board-paint.mts` | image requests, bytes, style/layout/task time, layout objects |
| `measure-widget-churn.mts` | idle churn attributed to a widget via DOM mutations |

## Metric choice

**cgroup `anon`** is the server-memory figure. It is non-reclaimable and is what a container limit
acts on.

**`memory.current` is not used for comparisons.** It includes page cache and swung **192–261 MiB
for the same image**, and 60+ MiB between runs of a byte-identical build.

**`heapUsed` is not server memory.** It is one component. An early version of this work reported a
`heapUsed` improvement as though it were the whole result.

## The traps

**"The tool does not exist" is a claim that needs the same rigour as a measurement.** Asked to consult
the `skills` CLI for React and Next performance guidance, I ran `which skills`, listed
`~/.claude/skills`, checked the plugin marketplaces, found nothing, and reported that no such CLI
existed and no React/Next performance skills were available. Both halves were false. `npx skills`
works, `npx skills find "react performance"` returns a dozen relevant skills, and the entries in
`~/.claude/skills` were **symlinks** into `~/.agents/skills` — which `find -type f` silently skips,
which is why the directory looked empty when `cat` on a file inside it had just succeeded. Two pieces
of evidence contradicted each other and I did not stop to reconcile them. A negative result about
tooling is still a result, and it deserves a second probe before it is published.

**A heap snapshot cannot explain a peak.** V8 runs a full GC before serialising one, so it reports
survivors only. The 94 MiB of transient ArrayBuffers that drove this container past 500 MB never
appeared in a single snapshot. Peaks need an allocation profiler and wrapped allocators.

**V8 truncates snapshot string contents to ~1 KiB.** Grouping snapshot strings by content therefore
compares only each string's first kilobyte. This produced a published claim of "7.86 MiB of literal
duplicate chunk sources"; hashing the real files found **zero** byte-identical duplicates among all
3,055 server JS files.

**Snapshot objects are not live native handles.** A snapshot showed 15 `Gzip` objects still present
at idle, which read as leaked zlib streams pinned by native handles — a real leak class that Next
documents. `process.getActiveResourcesInfo()` reported **Zlib=0**, before and after 300 deliberately
aborted gzip requests.

**Measuring memory without forcing a GC measures V8's growth, not the module's cost.** A
require-cost sweep reported `drizzle-orm` at 124.3 MiB; with `global.gc()` before each reading the
same measurement was a fraction of that. Two database drivers measured 21.4 MiB, not the ~30 MiB the
naive sum implied.

**The act of measuring can dominate the measurement.** Taking a heap snapshot over CDP delivers it
as JS string chunks: for a ~135 MB snapshot that added **~134 MiB of ArrayBuffers to the process
being measured**, and the next stage read 693.7 MiB. `v8.writeHeapSnapshot` streams from C++
instead, and the probe now reports its own `observerCostMiB`.

**Per-component React attribution requires a profiling build.** `fiber.actualDuration` is only
populated by one, so on a production build every fiber fails the "did it re-render" test and the
attribution tables come back **empty** — which reads as "nothing re-rendered" rather than "this
build cannot tell you". This produced a published claim that the App Router re-rendered once a
second. The tool now says which case it is.

**When a server-side change moves a client-side metric, the workload changed.** `--jitless` looked
like −24% peak RSS, −14% CPU and 30% *faster* board loads. Three of those are impossible for a
server flag. The client had **80% fewer event listeners**: the page had simply under-rendered.

**A fixed port can silently measure the wrong container.** A readiness check passed against a
leftover container on the same port while the container under test had not started. Ephemeral ports
and asserting the container's own identity are the fix.

**A completed build is not a built image.** A `docker builder prune` running concurrently killed a
BuildKit session; the build failed and the next step ran against a stale tag. Verify the tag exists.

**Boards differ, so measure the right one.** Peak memory is at `nav-01`, not the multi-tab stage — a
GC lands during multi-tab and pulls RSS down. Measuring the obvious stage understates peak by
37 MiB.

## Reproducing

```bash
STRESS_IMAGE=<image> \
STRESS_BACKUP_ZIP=~/Downloads/<backup>.zip \
STRESS_BOARDS="default,defaultv2" STRESS_TABS_PER_BOARD=2 \
STRESS_NAV_ITERATIONS=3 STRESS_SOAK_MS=120000 \
node --experimental-strip-types scripts/benchmarks/stress-restore.mts

node scripts/benchmarks/compare-stress-runs.mjs .bench/stress <before-prefix> <after-prefix>
```

For attribution, add the probe:

```bash
STRESS_MOUNT="$PWD/scripts/benchmarks:/probe:ro" \
STRESS_ENV="HOMARR_PROBE_PORT=9333,HOMARR_PROBE_TRACK_BUFFERS=32768" \
STRESS_NODE_OPTIONS="--require /probe/memory-probe.cjs"
```
