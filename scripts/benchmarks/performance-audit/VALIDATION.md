# Focused validation

All 62 findings have a final disposition and before/after evidence: 101 scenarios passed their supplied checks; 88 contain nine paired timing trials and 13 report structural, query, keyboard or accessibility outcomes without invented CPU timings. The strict report generator validates coverage, raw-pair completeness and recovered-artifact integrity.

| Final check | Result |
| --- | --- |
| Baseline/current source, selected spans, fixtures and harness hashes | 101 scenarios; 1,030 source records and 1,475 spans match |
| Bundled-input report replay | Passed without temporary worker files |
| Next.js typecheck | Passed with `--noEmit --incremental false` on pinned Node 24.18.0 |
| CLI and cron-jobs typechecks | Passed |
| Formatting | 83 changed/new source and benchmark files; passed |
| Scoped lint | 83 files; zero errors, 46 warnings including existing code and benchmark fixture warnings |
| `git diff --check` | Passed |

Focused existing tests ran in the relevant implementation lanes. These are historical lane checks; final source-backed benchmark assertions cover the subsequent source/fixture corrections.

| Existing test scope | Result |
| --- | --- |
| Custom-widget schema, JSX policy and workbench | 180 passed; schema alone rerun after oversized-case refinement, 57 passed |
| RSS and integration-query permissions | 13 + 13 passed; permissions used a temporary Node configuration because the default DOM project reads a server environment variable before collection |
| Assistant message metadata | 10 passed |
| Kuma, Speedtest and Tracearr aggregates | 9 passed |
| Umami integration | 8 passed; existing expectations updated for bounded concurrency |
| Custom-widget preview panel and Docker reconciliation inbox | 5 passed before the final journal freshness adjustment; final mounted query fixture checks entry/re-entry freshness |
| Custom-widget architecture check | Passed across 196 production modules |

No new unit-test files were added. No broad suite, production application build, Docker build, E2E suite or live integration suite was run. PostgreSQL query generation was checked; the relational fixtures execute SQLite. Browser accessibility cases inspect actual source in Chromium with presentation stubs; screen-reader speech was not measured.

[Machine-readable final checks and measured-artifact hashes](validation.json). [Full methodology, recovery history and raw evidence](REPORT.md). Lane-specific checks and their limitations remain under `sourceLaneValidation` in [report-data.json](report-data.json).
