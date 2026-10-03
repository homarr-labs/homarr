# Turbo and Cloudflare cache verification

Source: `0924884348c3304e3309c10a27be17d8182b1661`, Node 24.18.0,
Bun 1.4.2, Turbo 2.11.7. [Hosted capture](https://github.com/homarr-labs/homarr/actions/runs/37129817813).

| Full build / restoration                   |     Wall time | Trials |
| ------------------------------------------ | ------------: | -----: |
| Cold build and signed uploads              |      219.60 s |      1 |
| Local restoration, outputs deleted         |        3.96 s |      1 |
| Signed remote restoration, outputs deleted | 5.76 s median |      3 |
| First remote restoration                   |        8.90 s |      1 |

Each trial covers both Next.js sites, CLI and database migration bundles.
Every remote trial uses `--cache=remote:r`, verifies five REMOTE hits and checks
identical output bytes. No local artifact reads or compilation occur on remote
hits. The uncached standalone assembly takes about 1.7–1.8 seconds on restore
and is included in the timings. It keeps build IDs, server action keys and
compiled chunks consistent across independently uploaded cache entries.

The benchmark uses the existing signed Cloudflare service with an isolated
per-run team namespace, avoiding concurrent CI writes to the same artifact keys.
The first transfer starts without those artifacts in the worker's edge cache;
subsequent transfers can benefit from it. OS caches are not purged. The timings
exclude dependency setup, output hashing and unrelated workflow checks. Changed
inputs require compilation; these measurements describe cache hits.

Main artifacts are 91.88 MB and 25.82 MB; docs are 75.56 MB. The combined app
archive previously reached 135.83 MB and received HTTP 413. Splitting the app's
compiled outputs and standalone dependencies keeps each upload below the observed limit.
Compiled files are excluded from the dependency archive and assembled after cache restoration.

`local/` contains 25 input/environment invalidation controls and byte-identical
CLI/migration restoration. `coherence-controls.json` verifies repairs for a
foreign build ID, foreign action key, missing/foreign chunks and a missing middleware entrypoint.
Build hashes distinguish CPU architecture, libc and Node version; Next compiler
caches are persisted separately from Turbo artifacts in Actions and BuildKit.
Docs tests and repository prose do not invalidate a build, while MDX, blog,
shared definitions, motion assets and build environment changes do.

Failures are retained: the initial harness used incompatible `--force`/`--cache`
flags; the unsplit app upload failed with HTTP 413; another run restored all five
remote artifacts but its docs bytes came from a concurrent upload. These runs
are excluded from the successful timing comparison. An intermediate assembly omitted middleware and failed container login; another mutated an archived directory during asynchronous upload. Both were fixed before this capture.

Configuration follows [Turbo caching](https://turborepo.com/docs/crafting-your-repository/caching),
[environment inputs](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)
and [signed remote caching](https://turborepo.com/docs/core-concepts/remote-caching).
The installed 2.11.7 docs and the existing
[Cloudflare worker implementation](https://github.com/homarr-labs/turborepo-remote-cache-ajnart)
were also inspected.

Reproduce in a disposable installed checkout with all four TURBO credentials:

```sh
cp .env.example .env
python3 scripts/benchmarks/turbo-remote-cache.py --output benchmark-results/turbo-remote-cache
```

`local-act.json` records the final successful local container workflow. The first
attempt hit a host-port collision and is retained separately.
[Hosted validation](https://github.com/homarr-labs/homarr/actions/runs/37129820272)
passed database checks, the fast gate and converted-data boot/auth/restart.

Or dispatch CI with `operation=benchmark`, `benchmark_turbo=true` and
`benchmark_packages=false`. A separate `operation=validate` checks the container
and converted-data boot/auth/restart without publishing it.
