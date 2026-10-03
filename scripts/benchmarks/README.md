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
`--phase install`, `workspaces`, `conflicts`, `commands`, and `tools` runs resume the same results.
The manual **Package manager benchmarks** workflow runs this harness and uploads
measurements and logs, including failures. It does not publish images or modify PRs.

Cold installs clear the isolated package cache and module directories; they do
not flush the host's filesystem cache. Warm installs recreate modules using that
cache. Offline installs verify a restored tar/zstd cache. Local extraction timing
excludes GitHub upload/download latency. Each install mode has three trials.

Workspace memory means GNU time's maximum process RSS for the existing typecheck
command: one first run and two incremental runs. This is neither an additive
memory budget nor the production memory of a library. Libraries share their app's
process. Failed commands remain in the JSON and cannot support speedup claims.
Standalone converter/showreel installs compare their original npm locks with Bun,
and include CLI startup and showreel build measurements. The complete migration changes the dependency graph, so these measurements do
not isolate package-manager implementation performance.

The conflict harness uses the repository's real manifests, catalogs, patches,
and locks in disposable Git repositories. It measures different-workspace
additions, same-workspace additions, and competing versions. Its explicit policy
merges both additions, chooses the right-hand competing version, regenerates
from the left lock, and validates with a frozen install. Conflict hunk counts and
regeneration time measure this procedure; they do not measure human effort.

Use `benchmark:build:docker` and `benchmark:docker` for production image builds
and dashboard runtime workloads. Preserve image revision/fingerprint labels and
metric eligibility flags; an ineligible metric cannot support a performance claim.
