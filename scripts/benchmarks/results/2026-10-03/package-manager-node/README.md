# Bun package management with Node runtimes

The concise PR list links to the complete measurements here. `workspaces.md`
contains all 38 compiler time/RSS comparisons; `dev/` contains all 12 development
trials, memory samples and browser results. Both use Node 24.18.

`local-packages/package-managers.json` records three paired local install/cache
trials and package sharing. `hosted-packages/` records the full install, workspace,
retention, command, tool, build and lockfile-conflict suite on a separate runner.
The JSON includes every command, exit status, timing and peak RSS. Full command
stdout/time files are available in the
[hosted workflow artifact](https://github.com/homarr-labs/homarr/actions/runs/37113811518).

The package graph at hosted revision `4eac5762b` matches image revision `8a12ea1e4`;
the intervening change only restores SQLite's native binding in Docker.

Cold installs clear task-owned package caches/modules; OS and native prebuild
caches remain warm. Offline package-manager flags do not restrict lifecycle
script network access. Baseline formatting failures are preserved in the JSON
and excluded from speed claims. Failed dev preflights are excluded; the successful
trials use normal environment validation and reset isolated Redis between cold
trials. Warm restarts retain the corresponding dev cache.

The first production capture at `4eac5762b` exposed the missing SQLite binding and
failed. The corrected image and capture are identified separately; do not treat
that failed run as production acceptance.

`hosted-production/` contains the corrected image's balanced builds and six
independent Node container trials, captured in
[run 37114393994](https://github.com/homarr-labs/homarr/actions/runs/37114393994).
Its original comparison still required a Bun runtime and rejected the Node
candidate after all workloads passed. The package-manager-specific checker
revalidated those same measurements in
[run 37119529946](https://github.com/homarr-labs/homarr/actions/runs/37119529946).
`validation/` preserves that rejection and controls rejecting Bun, Node version
drift and source drift. The original runtime comparison still requires Bun.

Production RAM uses cgroup totals, anonymous memory and file cache. Candidate
process PSS was unreadable under the container's permissions and is omitted from
the summary; captured zero fallback values do not mean zero process memory.
The independent development PSS measurements remain available.

`local-production/` preserves six successful runtime trials and their descriptive
memory levels. Its combined comparison rejects build order: baseline builds were
reused after the native-binding repair, and earlier build timing overlapped act.
Local build timing is excluded; hosted build timing uses the valid balanced series.
All three local paired checks reject only that build chronology.

`image-transfer/` measures immutable image exports, compression and warm imports;
`turbo/` records the earlier 12 invalidation controls and compiled-artifact restoration.
`github-cache.json` preserves separate-run, single-observation cache restoration
sizes/timestamps; it does not establish a paired transfer speedup.

Performance measurements precede the final three nested `brace-expansion` lock
entry updates. Their original revision pins remain authoritative. Final frozen
installation and CI validate the updated graph; `validation/` records 66 matching
dependency override checks, their three earlier mismatches and the corrected result.

`turbo-cloudflare/` records the final cache integration: 25 invalidation controls,
coherence repair, split artifacts, and three signed remote restorations for both
Next.js sites and the CLI/migration bundles. These measurements use the later
implementation and include the final security lock updates.
