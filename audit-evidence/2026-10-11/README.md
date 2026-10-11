# Homarr performance audit evidence

Baseline: `bab8e2a2dad837365a2237263b58b658d23abe69` (`dev`). Branch: `feat/measured-memory-audit`. This archive contains synthetic fixtures and measurements, not a whole-application benchmark or a release acceptance result.

Start with `method-and-coverage.md`, `baseline.json`, and the final decisions report. The final decisions supersede provisional source observations in worker reports.

- `inventory.json` inventories all 4,201 original tracked paths, including generated data and assets.
- `dispatch.md` assigns exact paths and direct-code overview responsibilities to 24 domain auditors and seven overview reviewers using GPT-6 Luna in waves.
- `coverage-manifest.json` and `coverage/` account for every assigned path with per-file review or exclusion evidence.
- `reports/` contains all 31 completed inspection reports; `finding-index.json` indexes provisional observations, not confirmed fixes.
- `baseline-source/` and `overview_a-before/` preserve pre-edit source snapshots and checksums for measured scenarios.
- `measurements/` contains harnesses, raw paired samples, summaries, behavior checks, discarded experiments and explicit measurement gaps.
- `production-analyzer-before/` and `production-analyzer-after/` preserve selected actual production Turbopack graph/module/chunk data with checksums. Their compressed figures are analyzer estimates.
- `rejected-prototypes/` contains reverted candidate diffs.
- `reviews/` contains independent read-only review conclusions and fixed source SHAs.
- `validation/` records focused existing checks, versions, exit codes and output.
- `documentation.md` records the prescribed documentation-tool failure and installed/current official source checks.

No potentially sensitive heap snapshots or live user data are included. Heap snapshots remain local under `/tmp`. Browser transports and LDAP/HTTP peers use synthetic data. ArrayBuffer bytes are included in external memory rather than added to it.

Evidence is committed once, then removed in a follow-up commit so the final PR diff contains retained production improvements only. Restore the directory from the archival commit documented in the PR.
