# Bun migration measurements, 2026-10-03

Draft [PR #6978](https://github.com/homarr-labs/homarr/pull/6978) contains the complete comparison report. Every dataset uses the pinned revisions disclosed in its metadata. Measurements on local and GitHub hosts are separate.

- `package-managers.json` / `.md`: initial local installs, cache, tools, conflict harness and retention controls. Its initial typechecks are declared-script diagnostics; both used Node.
- `local-workspaces/`: 258 final explicit-runtime typechecks, docs/operational CLI builds and root command measurements.
- `hosted-package/`: corrected 416-command hosted package comparison.
- `local-production/` and `hosted-production/`: balanced builds and three independent production containers per image, with portable manifests and summaries.
- `hosted-production-capture/`: original complete production capture, including the old comparator rejection. `hosted-production/` contains the successful artifact-only recheck; measurements were not rerun.
- `hosted-initial-package/` and `hosted-initial-production/`: earlier hosted attempts, preserved separately and excluded from final claims where they failed.
- `image-transfer/`: image, layer, application/runtime footprint, local export/compression and warm import results. Bulky tar/zstd archives are not committed.
- `workspace-sharing/`: compatible dependency sharing across all 38 workspaces.
- `smol-control/`: one complete `--smol` diagnostic and its exact source changes as a zero-context patch (`git apply --unidiff-zero`).
- `budget-512/`: one extra 512 MiB functional probe per image, without settling.
- `github-cache.json`: observed dependency-cache archives and restoration timestamps, one separate runner per manager.
- `diagnostics/`, `excluded-attempts.json`, and `validation.json`: failure controls, negative comparison checks, resolved reviews and final local CI evidence.

Per-directory archive provenance records original JSON SHA-256 hashes and formatted archive hashes. Production manifest paths are made relative. Formatting changes whitespace only. Failure HTML, screenshots, credentials and bulky archives are omitted. Original command failures remain visible; failed commands are not included in speed medians. See the [benchmark README](../../README.md) for reproduction.
