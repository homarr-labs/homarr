# pnpm and Bun comparison

The current target uses Bun for package management and Node for application,
compiler, migration, and operational CLI runtimes. Archived full Bun runtime
measurements describe a rejected configuration, not the current target.

Captured reports and logs are preserved in
[archive commit 8f7d3bcd1](https://github.com/homarr-labs/homarr/tree/8f7d3bcd14109bfb13fa664d31710b88d820ad66/scripts/benchmarks/results).
Keep new captures in ignored `benchmark-results/` or Actions artifacts.

Run from the repository root with Node 24.18.0, pnpm 11.15.1, Bun 1.4.2,
Python 3, GNU time, tar, and zstd. Install pnpm outside the Bun checkout:

```sh
npm install --prefix /tmp/benchmark-tools --ignore-scripts --no-audit --no-fund pnpm@11.15.1
python3 scripts/benchmarks/package-managers.py \
  --base origin/dev --head HEAD \
  --node /path/to/node --bun /path/to/bun \
  --pnpm /tmp/benchmark-tools/node_modules/pnpm/bin/pnpm.cjs \
  --work-dir /tmp/homarr-package-comparison \
  --output benchmark-results/bun-migration
```

Use a fresh work directory and output directory for each revision pair. Individual
`--phase install`, `workspaces`, `conflicts`, `commands`, `tools`, and `builds` runs resume the same results.
The manual **Package manager benchmarks** workflow runs this harness and uploads
measurements and logs, including failures. It does not publish images or modify PRs.
Candidate command failures fail the benchmark gate. Baseline failures remain
visible and cannot support a performance comparison for that command.
The existing CI workflow also exposes `operation=benchmark`, `ref` for the
candidate, `benchmark_baseline`, and `benchmark_production`, so branch benchmarks
can run before the new standalone workflow reaches the default branch.
Set `benchmark_packages=false` for a production-only run. Benchmark concurrency
is scoped to the pinned candidate and selected phases.
Set `benchmark_compare_run` to a completed capture run ID to recheck its uploaded
production artifacts. This validates the same pinned revisions and every existing
source/cache/workload gate without repeating or inventing measurements. It needs
only read access to Actions artifacts. Preserve the original capture run link.

Cold installs clear the isolated package cache and module directories; they do
not flush the host's filesystem or native prebuild/toolchain caches. Warm installs
recreate modules using that cache. Offline package-manager flags verify a restored
tar/zstd package cache; lifecycle scripts may use other caches or network access.
Local extraction timing
excludes GitHub upload/download latency. Each install mode has three trials.

Workspace memory means GNU time's maximum process RSS for the existing typecheck
command: one first run and two incremental runs. This is neither an additive
memory budget nor the production memory of a library. Libraries share their app's
process. Failed commands remain in the JSON and cannot support speedup claims.
The sharing inventory resolves every declared external dependency from every
JavaScript workspace, grouping installed paths/inodes by name and version. The
current inventory uses Node resolution for both dependency layouts.
Standalone converter/showreel installs compare their original npm locks with Bun,
and include CLI startup and showreel build measurements. The complete migration changes the dependency graph, so these measurements do
not isolate package-manager implementation performance. Docs and CLI builds use
their existing build scripts: one first build and two repeats, with earlier
typecheck artifacts retained. The first docs build clears Next output/cache.

The conflict harness uses the repository's real manifests, catalogs, patches,
and locks in disposable Git repositories. It measures different-workspace
additions, same-workspace additions, and competing versions. Its explicit policy
merges both additions, chooses the right-hand competing version, regenerates
from the left lock, and validates with a frozen install. Conflict hunk counts and
regeneration time measure this procedure; they do not measure human effort.

Use `benchmark:build:docker` and `benchmark:docker` for production image builds
and dashboard runtime workloads. Preserve image revision/fingerprint labels and
metric eligibility flags; an ineligible metric cannot support a performance claim.

For the complete production comparison, create clean Git worktrees at the two
pinned revisions, then run:

```sh
python3 scripts/benchmarks/production-migration.py \
  --baseline /tmp/homarr-baseline --candidate /tmp/homarr-candidate \
  --bun /path/to/bun --output benchmark-results/production-migration
```

This uses dedicated builders without changing the active Docker builder or
pruning shared caches. Build trials follow the existing comparator's cold
warmups and two balanced warm source changes per revision. Runtime trials use
the unchanged warmup images, three runs per revision, 20 dashboard loads, seven
interactions, and a ten-minute settle period. Use `--phase build` or `runtime`
to resume, or `--phase compare` to recheck captured results; preserve the exact
worktrees and image IDs. Remove the task-owned
builders after retaining their measurements.

The migration driver uses a seeded, normalized board fixture with clocks,
countdown, downloads, health monitoring, notebook, system resources/disks, and
bookmarks. External traffic is denied for both variants. It does not measure
live provider latency. Each image runs as UID/GID 1000 with two CPUs and 1 GiB;
PSS is collected as the same UID. Both variants use the baseline image for
the excluded TCP ingress proxy, keeping its runtime constant. A hydrated search control is required before
timing its first click. Failed attempts and eligibility reasons are preserved.
Cancelled browser requests must be recovered by an exact successful response or
the mounted query provider's successful data for the exact procedure and input.
The latter accounts for streamed server hydration; it does not mutate the cache
or accept transport failures. Cache recoveries are retained in the page samples.
The default package-manager comparison requires matching Node/V8 runtimes while
accepting different pinned source revisions. Use `--comparison runtime-migration`
only to compare Node against Bun's JavaScriptCore. Both modes retain image identity,
cache continuity, workload, browser and isolation checks. Existing Spotlight
comparisons keep their original rules.

## Development

After preparing the two checkouts with `--phase install`, provide a seeded demo
SQLite database normalized to the production driver's eight-widget fixture and
an isolated Redis service:

```sh
python3 scripts/benchmarks/dev-package-managers.py \
  --work-dir /tmp/homarr-package-comparison \
  --fixture /tmp/seeded-eight-widget-demo.sqlite --redis-port 6387 \
  --package-results benchmark-results/bun-migration/package-managers.json \
  --node /path/to/node --bun /path/to/bun \
  --pnpm /tmp/benchmark-tools/node_modules/pnpm/bin/pnpm.cjs \
  --output benchmark-results/package-manager-dev
```

Three alternating trials per manager measure cold development launch, the first
hydrated login page, authenticated dashboard readiness, five browser-confirmed
HMR edits, and a restart retaining Next's development cache. Temporary source
edits are restored. Memory sums proportional set size across the entire launch
process group, including package-manager wrappers; the browser and Redis are
excluded. Settled memory uses the last 30 seconds of a 60-second idle period.
Keep timed local workloads sequential. Production memory uses the separate
container harness and its longer settle period.

## Image transfer

After runtime measurements, compare image size, layer bytes, single-thread zstd
compression, and local imports:

```sh
python3 scripts/benchmarks/image-transfer.py \
  benchmark-results/production-migration/production-migration.json \
  --output benchmark-results/image-transfer
```

Local imports reuse the existing Docker layer store. They measure warm local
import work, not a cold pull or registry/network transfer. The script never
prunes shared images or data. Its exported archives are local scratch artifacts.
