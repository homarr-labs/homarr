# Test pipeline audit — 2026-09-10

Audited the workflow definitions, Docker build targets, package test scripts, Vitest project inclusion/exclusion rules, and E2E entry points at release/v2 commit `3358b6337`. Test-file pruning targets inspected source-string assertions and unconditionally skipped scenarios; this is not a claim that every retained assertion has been individually reviewed or that no test has ever caught a regression.

## Measured baseline

Latest successful release/v2 runs: [CI](https://github.com/homarr-labs/homarr/actions/runs/34498613147) and [Workshop](https://github.com/homarr-labs/homarr/actions/runs/34498613171).

| Work                            | Observed time                                              | Decision                                                                                       |
| ------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fast gate                       | 10m41s total; 6m47s in `pnpm test`                         | Remove automatic suite execution                                                               |
| Container and E2E               | 2m55s total; 1m35s executing E2E                           | Remove test job setup, image pull, browsers, tests, and artifacts; retain fallback image build |
| Workshop validation             | 4m29s total; 1m57s integration script + 1m27s image script | Remove both automatic scripts and duplicate Node install/typechecks                            |
| Custom Widget bundle validation | 25s including a direct Next.js build                       | Keep the checker; use the Turbo build task so the preceding affected build can be reused       |
| Homarr image builds             | 5m55s amd64, 4m33s arm64                                   | Keep both architecture builds and manifest verification                                        |

The container job started at 16:44:44 UTC after the amd64 build completed at 16:10:21 UTC: a 34m23s scheduling/dependency gap in this run. Publication no longer waits for that job. These observed durations do not predict the next run's duration or prove that all delays came from tests.

## Pipeline decisions

| Entry point                                                     | Final behavior                                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main CI: PR, push, merge queue, manual validate/publish         | Lint, typecheck, affected builds, workspace checks, OpenAPI, Custom Widget architecture/bundle validation; no unit/integration/E2E execution                |
| Homarr preview publication                                      | Fast gate plus both image digests; no browser gate                                                                                                          |
| Container fallback / local Act docker mode                      | Build amd64 only when no preview digest is available; do not rerun a failed preview build                                                                   |
| Workshop PR/push workflow                                       | Filter on all current Docker COPY inputs, root dependency/build configuration, and workflow changes; validate Compose; retain branch-only image publication |
| Formatting                                                      | Keep changed-file formatting; no test phase                                                                                                                 |
| Renovate / prebuilt Debian validators                           | Keep existing path-scoped config/native-artifact checks; no general test suite                                                                              |
| Release / docs deployments                                      | Keep release validation, builds, extraction, and publication; no hidden unit/E2E invocation found                                                           |
| Bot / translation / contributor / OpenAPI maintenance workflows | No test runner invocation found                                                                                                                             |
| `pnpm test`, `pnpm test:ui`                                     | Unit and contract projects only; exclude Docker integration, E2E, and screenshots; no automatic retries or coverage                                         |
| `pnpm test:coverage`                                            | Explicit unit/contract coverage                                                                                                                             |
| `pnpm test:integration`                                         | Ten Docker service/database files, bounded to two workers                                                                                                   |
| `pnpm test:e2e`                                                 | Explicit E2E project, run once with two workers, no screenshot generator                                                                                    |
| `pnpm test:docs-screenshots`                                    | Explicit documentation asset generation                                                                                                                     |
| Workshop integration/image/live-provider scripts                | Retain as manual tools; no automatic CI execution                                                                                                           |
| Custom Widget AI / Assistant / reference-API scripts            | Retain existing opt-in tools; no automatic CI invocation                                                                                                    |
| Developer CLI Go tests / benchmark specs                        | Retain manual behavioral coverage; no automatic CI invocation found                                                                                         |

Workshop path filters cover `apps/workshop`, `apps/docs`, `packages/custom-widgets`, `packages/definitions`, `packages/workshop`, `tooling/typescript`, patches, package/lock/workspace/Turbo/npm configuration, and the workflow itself. Revisit these filters whenever the Workshop Dockerfile adds a build input. Fast gate still validates the TypeScript workspaces.

## Test decisions

- Delete source-string UI tests for breadcrumbs and legacy Custom Widget migration, and the source-string portions of Workshop install, Copy AI prompt, and preview-panel suites. Keep actual URL resolution, prompt-size, rendering, and error-isolation checks.
- Delete translation tests pinning exact English copy or the absence of removed modal keys. Remove prose/style assertions from authoring resources while retaining bundle synchronization, payload budgets, catalog lookup, and JSX validation.
- Trim Workshop's static contract script to its real HTML rendering/escaping assertions. Remove regex/string checks for Go/JS source shape, deleted artifacts, and an assertion that prohibited path-filtering the workflow.
- Delete the home-page status-200 smoke test. Retained browser flows exercise navigation, and container startup already waits for readiness.
- Delete the unconditionally skipped Custom JSX workbench scenario and its unused mock server, plus the skipped onboarding restore scenario and its archive builder. They supplied no running coverage. Backup API and database migration suites remain.
- Retain active E2E onboarding/auth/access checks, LDAP, health endpoints including external Redis, lazy-widget hydration/navigation, management layouts, media layouts, and Assistant management as explicit manual scenarios. Their behavioral assertions can detect failures; lack of historical regression evidence is not proof they are useless.
- Retain authorization, secrets/redaction, MCP/API access, migration/rollback, persistence, request policy, widget runtime, layout algorithms, and mocked integration contract tests. Remove them from mandatory CI, not from developer tooling.
- Move seven live-service suites and MySQL/PostgreSQL migration suites out of default unit discovery. Add the previously uncollected `packages/db/proxy-reader.integration.spec.ts` to integration discovery. Keep in-memory SQLite contract tests in the default unit projects.

## Validation scope

Validate workflow syntax and dependencies with actionlint; check formatting and focused lint; enumerate project files without starting containers; run only the four modified unit test files and the trimmed standalone Workshop contract script. Full unit suites, Docker builds, browser scenarios, and live-provider tests are intentionally outside this audit's local validation. New CI timings must be measured after the PR runs.

Validation completed: actionlint and focused oxlint passed; all changed files passed formatting; 12 tests passed across the four changed unit files; the trimmed Workshop rendering script passed. File discovery returned 423 unique files with no cross-project duplicates: 405 unit/contract files, 10 Docker integration files, seven E2E files, and one screenshot generator.
