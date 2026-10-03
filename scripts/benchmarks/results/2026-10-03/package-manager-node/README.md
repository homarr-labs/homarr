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
