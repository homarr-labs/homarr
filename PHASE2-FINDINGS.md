# Phase 2 — where the memory actually goes

Measured with `scripts/benchmarks/stress-restore.mts` on a **populated** instance, not an
empty one: a real backup (4 boards, 51 widgets, 11 integrations) restored through the
onboarding restore UI, signed in, then the busiest board (28 items / 16 widget kinds,
28/28 widgets reaching `data-homarr-widget-ready`) opened, reloaded 4×, and soaked idle.

Images built locally from known commits so the comparison is not against a stale registry
tag: baseline = merge-base `06724cfeb`, branch = `abec79abe`.

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
