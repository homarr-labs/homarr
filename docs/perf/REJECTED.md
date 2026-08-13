# Ideas measured and abandoned

Each of these was implemented or configured, built, and measured. They are recorded with their
numbers so nobody repeats them, and because several looked like wins until the measurement came in.

## `optimizePackageImports` — inert, because this app builds with Turbopack

Seven Mantine entry points were absent from `experimental.optimizePackageImports` while
`@mantine/core`, `@mantine/hooks` and `@tabler/icons-react` were listed: `charts`, `dates`,
`dropzone`, `form`, `notifications`, `spotlight`, `tiptap`. Adding all seven and rebuilding:

| | baseline | all seven added |
| --- | --- | --- |
| client chunk files | 482 | 482 |
| client chunk bytes | 18050.7 KiB | 18050.7 KiB |
| largest chunk | 2341.5 KiB | 2341.5 KiB |

**Byte-for-byte identical, down to the chunk hashes.** That pattern normally means a cached build — and
`turbopackFileSystemCacheForBuild` is enabled here — so it was checked rather than written up as a null
result. The Next.js documentation is explicit: *"This is not needed when using Turbopack. Turbopack
automatically analyzes and optimizes imports without requiring this configuration."* The build banner
reads `Next.js 16.3.0-preview.9 (Turbopack)`.

So the existing three-entry list is also dead config. It is left in place as a fallback should the app
ever build with webpack again, with a comment saying not to expect anything from it.

This retires the entire "barrel imports / bundle optimization" line of enquiry for this repo, including
the sub-question of whether `@homarr/ui` — the biggest barrel at 111 importers — could be optimised.
It cannot be by that mechanism, and does not need to be.

Two measurement notes for anyone revisiting this: Next 16 with Turbopack prints **no size columns** in
its route table and emits no `app-build-manifest.json`, so per-route first-load JS is not available
from the build output. Total bytes under `.next/static/chunks` is what these numbers are.

## `--jitless` — looked like the biggest win of the entire investigation, and was fake

V8's `--jitless` removes the optimising compiler and all generated machine code. Its effect on code
memory is real and unambiguous: **code space 11.6 → 0.0 MiB**. The stress figures looked
spectacular: peak node RSS −24%, peak container −36%, CPU −14%, median board load **30% faster**.

Three of those are impossible. The flag was applied to the **server**, so it cannot make the browser
lighter, and removing an optimising compiler does not make code faster.

| | normal | jitless |
| --- | --- | --- |
| DOM nodes | 8,256 / 8,280 | **5,442 / 5,442** |
| JS event listeners | 7,781 / 7,784 | **1,570 / 1,570** |
| browser JS heap | 50.0 / 49.5 MiB | 28.1 / 28.2 MiB |

Boards still reported 28/28 widgets ready, so the coarse check passed — but the page carries **80%
fewer event listeners**. Much of the UI never mounted. The memory "win" is an application doing less
work, and the CPU and latency "improvements" are the same artefact.

## `--max-opt=2` (cap V8 at Maglev) — null result, and it closes the door

Since full jitless is unusable, capping the *tier* while still generating code was the obvious next
try. `--max-opt` is rejected by `NODE_OPTIONS` and accepted on the command line.

| stage | full | Maglev-capped |
| --- | --- | --- |
| peak anon | 276.0 MiB | 282.8 MiB (+2%) |
| boot idle | 64.0 MiB | 72.3 MiB (+13%) |
| dashboard loaded | 186.1 MiB | 179.2 MiB (−4%) |
| 4 tabs | 270.8 MiB | 238.5 MiB (−12%) |
| after soak | 199.0 MiB | 214.3 MiB (+8%) |
| CPU | 28.1 s | 27.8 s |

Render integrity was verified explicitly this time: listeners **7,784 in all four runs**, DOM nodes
within 40. So unlike jitless the page rendered fully and the comparison is valid — there is simply no
consistent win.

The mechanism closes it permanently. Measured under `--max-opt=2`, `peak_malloced_memory` at board
load is **42.1 MiB, identical to Turbofan**. Maglev's zones are just as large. Capping the tier does
not reduce zone memory; only not compiling does, and that breaks the page.

## jemalloc — the hypothesis was backwards

~38 MiB of V8 compiler zone memory is freed back to malloc and never returned to the kernel by musl,
so an allocator that decays unused spans back to the OS looked like the answer. Tested on the
**byte-identical image** with only `HOMARR_MALLOC` differing, asserting the "Using jemalloc" log
line.

| stage | musl | jemalloc |
| --- | --- | --- |
| boot idle | 62.4 MiB | **80.3 MiB (+29%)** |
| after sign-in | 144.9 MiB | **170.6 MiB (+18%)** |
| dashboard loaded | 214.8 MiB | 184.4 MiB (−14%) |
| 4 tabs | 259.9 MiB | **319.6 MiB (+23%)** |
| after soak | 215.5 MiB | **279.6 MiB (+30%)** |
| **CPU** | 28.0 s | **24.5 s (−13%)** |

jemalloc does not release freed spans sooner; it deliberately retains more of them (thread-local
caches, time-based dirty-page decay) and spends that memory on speed. **musl is already the frugal
choice**, so "swap the allocator" is not a RAM direction. If CPU ever becomes the binding
constraint, this is a measured 13% for two lines.

## Lazy-loading mysql2 and pg — 21.4 MiB, three broken attempts

Both load on every SQLite install, because `db/drivers/index.ts` imports all three driver wrappers
statically and picks one at call time. The prize is 21.4 MiB. Three attempts, each caught only by
booting the real image:

1. `createRequire(import.meta.url)` is `undefined` in the CommonJS `migrate.cjs` bundle. It threw at
   load and broke startup **for every dialect, including SQLite**.
2. With that fixed, MySQL failed with `MODULE_NOT_FOUND` on `drizzle-orm/mysql2/index.cjs` — a
   dynamic require resolves through the package's `require` condition to a `.cjs` build that Next's
   tracing never copies into the standalone output.
3. Leaving drizzle's dialect static defeats the purpose: `drizzle-orm/mysql2` imports `mysql2`
   itself, so the client loads anyway. Verified — the built image still loaded all 77 mysql2 files.

The remaining routes are worse than the problem: forcing drizzle's `.cjs` into the image loads a
**second copy of drizzle's core** beside the ESM one (straddled class identities), and the
`require(esm)` route works only via a hardcoded absolute path, so a drizzle upgrade would break
*startup* on two dialects. Structural blocker: `createDb` must stay synchronous because
`packages/db/index.ts` does `export const db = createDb(schema)` at module scope and `migrate.cjs` is
CommonJS.

## Coalescing Beszel subscription updates — measured exactly zero

Three Beszel widgets account for 82% of idle DOM churn, so batching their per-record `setState` calls
looked like an easy win. Implemented, built, measured:

| | before | after |
| --- | --- | --- |
| DOM mutations / 45 s | 733 | 748 |
| React commits / 45 s | **55** | **55** |

Identical. Beszel emits roughly one record per second and the flush interval was also one second, so
each flush batched exactly one record — arithmetic that should have come before the implementation.

It also exposed a unit error: **DOM mutations are not re-renders**. The real rates are **1.22 React
commits per second** for the whole board and **13.3 DOM mutations per commit**. So the stats widget's
"10.4 mutations/second" is about 0.8 *renders* per second: three live-monitoring widgets each
refreshing about once a second, which is what they exist to do. **73 commits/min is the feature
working, not a defect.**

## Next's image optimiser — 18.5 MiB shipped, 0 MiB of RAM

sharp plus `@img` is 18.5 MiB in the image and costs **+9.1 MiB RSS** once `/_next/image` is hit. But
`shouldUseNextImage={true}` appears nowhere, so the logo always renders a plain `<img>`, and across
three full 4-tab stress runs sharp **never loads**. `images: { unoptimized: true }` would save no RAM
at all. The 9.1 MiB is conditional on visiting the About or Kubernetes pages; the 18.5 MiB is an
image-size observation, not a memory one.

## Smaller null results

| idea | measured | verdict |
| --- | --- | --- |
| base64 images in cache / TanStack Query / Redis | **0.01 MiB** (2 data-URLs), Redis totals 2.17 MB, `image-proxy` stores URL + headers only | the theory that started this — not a factor |
| orphaned zlib streams | `Zlib=0` handles before and after 300 aborted gzip requests | Next's leak class does not occur here; nginx buffers the response so Next never sees the disconnect |
| V8 native contexts (2 → 10 under load) | **0.25 MiB each**, ~2.0 MiB total | too small to chase; sized before investigating |
| Redis 6 → 2 client consolidation | 139.3 vs 139.2 MiB idle | inside noise, reverted. The `pubSub:last:*` TTL was kept as a real unbounded-growth fix |
| V8 old-space cap | removing it entirely matched the capped build at every stage | a drift ceiling, not a reduction. Kept as one line |
| `--max-semi-space-size=2` (vs 4) | no improvement | 4 is the sweet spot |
| `--optimize-for-size`, `--no-opt`, `--lite-mode` | rejected by Node in `NODE_OPTIONS` | not available as a runtime knob |
| in-image Redis / nginx removal | 8.1 / 9.2 MiB RSS (3.1 PSS for nginx) | real but small, and both are load-bearing |
| ASCII-escaping server bundles | **9.45 MiB** — one char above U+00FF forces a whole source string to 2 bytes/char, proven at 2.00 vs 1.00 bytes/char | genuine, but it means rewriting minified **vendor** output at build time; deserves its own PR |
