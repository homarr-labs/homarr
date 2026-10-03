# pnpm and Bun comparison

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
The existing CI workflow also exposes `operation=benchmark`, `ref` for the
candidate, `benchmark_baseline`, and `benchmark_production`, so branch benchmarks
can run before the new standalone workflow reaches the default branch.
Set `benchmark_packages=false` for a production-only run. Benchmark concurrency
is scoped to the pinned candidate and selected phases.

Cold installs clear the isolated package cache and module directories; they do
not flush the host's filesystem cache. Warm installs recreate modules using that
cache. Offline installs verify a restored tar/zstd cache. Local extraction timing
excludes GitHub upload/download latency. Each install mode has three trials.

Workspace memory means GNU time's maximum process RSS for the existing typecheck
command: one first run and two incremental runs. This is neither an additive
memory budget nor the production memory of a library. Libraries share their app's
process. Failed commands remain in the JSON and cannot support speedup claims.
The sharing inventory resolves every declared external dependency from every
JavaScript workspace, grouping installed paths/inodes by name and version. Bun
runtime built-ins are reported separately from installed packages.
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
to resume; preserve the exact worktrees and image IDs. Remove the task-owned
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
The comparison mode accepts different pinned source revisions and JavaScript
engines while retaining image identity, cache continuity, workload, browser,
and isolation checks. Existing Spotlight comparisons keep their original rules.

The archived initial workspace measurements exposed a Node shebang fallback
when Bun was invoked from a workspace directory. Workspace typecheck and
dotenv scripts now invoke Bun explicitly. Keep the initial measurements labeled
as declared-script results; use the final forced-Bun runs for runtime comparisons.

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
