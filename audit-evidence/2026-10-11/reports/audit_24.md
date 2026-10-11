# Audit 24 — Build configuration, scripts, deployment, and runtime configuration

## Scope and confidence

The assignment lists 54 files. All listed files were reviewed except the generated minified dependency patch `patches/mantine-datatable@9.3.1.patch`, which is explicitly marked `excluded` in `coverage/audit_24.json`; its 225 KB distribution-bundle replacement is not practical to review linewise for source-level allocation behavior. `git apply --numstat` confirms the patch replaces only `dist/index.js` and `dist/index.mjs`. The installed package surface and Homarr DataTable caller were checked; no finding is drawn from the excluded artifact. No production files were changed. No tests, builds, Docker compilation, benchmarks, or runtime measurements were run.

## Findings

No actionable build, startup, production-runtime, deployment, or configuration memory finding was established in this assignment.

The main production image uses a multi-stage build. Compiler tools, Bun, the workspace install, and Turbo/Next build outputs remain in the builder. The runner copies Next's standalone traced output, the bundled CLI, migrations, and the required `better-sqlite3` native binding. BuildKit caches Next compiler and Turbo artifacts; the runtime image does not copy those caches. This supports a smaller deployed filesystem footprint, but this audit did not measure image layers, build peak memory, runtime heap/RSS, startup CPU, bundle transfer, or package tracing completeness.

Startup waits for migrations to finish before launching services. It starts one Next.js process and waits for an exited child before restarting it. On non-root startup, recursive ownership changes are limited to writable app data, the Next cache, and nginx directories; it does not recursively traverse the standalone application tree. `run.sh` sets `--max-semi-space-size=4`, which constrains the V8 young-generation semi-space. This does not establish an overall heap or container-memory ceiling, and no production measurements or deployment limits were available to assess one.

CI uses Node 24.18.0 and Bun 1.4.2. The setup action runs install scripts serially and scopes cached compiler/Turbo state by platform and lockfile. The installed Turbo version is 2.11.7. `turbo.json` declares build dependencies and outputs and excludes `.next/cache` and `.next/dev` from Turbo build artifacts. CI runs an explicit Next build before checking the custom-widget route payload; the checker processes JS chunks one at a time and reports compressed/raw size against a fixed budget. Neither workflow settings nor source inspection provides actual build-peak memory, chunk transfer, browser parse, or deployed RSS data.

The remaining actions and scripts are CI, release, or scheduled maintenance paths. Most either use bounded static inputs (OpenAPI serialization, README table generation, release output capped at 1 MiB) or materialize external contributor/member lists whose practical size was not measured. No production call path or evidence established material retention there. Deployment workflow concurrency/timeouts and independent architecture runners control CI execution, but runner memory data was unavailable.

## Evidence gaps

A production analyzer is being run by the coordinating audit. This report adds no substitute measurements. To assess any resource concern raised by that analyzer, capture separate builder peak RSS/time, final image size and traced dependency contents, startup duration/CPU, and steady/peak application RSS/heap under representative load. Distinguish build time, startup, production memory, compressed transfer, and browser parse costs; none were measured in this sub-audit.
