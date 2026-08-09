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
