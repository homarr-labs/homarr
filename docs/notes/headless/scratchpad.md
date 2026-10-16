# Headless backend migration scratchpad

## Active goal

Fully extract Homarr backend capabilities from Next.js into an independently runnable Hono server on Bun using oRPC v2 beta. Work in parallel, preserve existing client access, provide a Docker backend without a Next.js process, and document endpoint migration and deployment costs. Complete only when every backend endpoint and required runtime capability is migrated and headless operation is validated.

## Baseline

- Source base: `dc2662d9f` on local `dev`, 2026-10-16.
- Implementation branch: `feat/headless-hono-backend`.
- Isolated checkout: `/home/habs/.codex/worktrees/headless-hono/homarr`; preserve original checkout and untracked `.codex/`.
- Pinned toolchain: Bun 1.4.2 and Node 24.18.0 via mise. Shell defaults differ; use `mise exec --`.
- oRPC 2.0.0-beta.44, Hono 4.13.13 verified against npm registry and official sources.
- Context7 unavailable per user; use primary web documentation and Exa as needed.

## Parallel ownership

| Workstream         | Scope                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| auth               | Auth.js core, request sessions, headless browser sign-in                |
| http_routes        | Resource/backup/health/onboarding endpoints                             |
| mcp_assistant      | MCP transports, OAuth metadata/consent, assistant streaming             |
| frontend_boundary  | HTTP RSC clients, remove frontend DB/Redis/task ownership               |
| deployment         | Full and headless Docker targets, Bun runtime assembly                  |
| research_inventory | Full endpoint and coupling inventory, primary sources                   |
| orpc_transport     | oRPC v2, legacy HTTP/tRPC compatibility, subscriptions                  |
| bun_database       | Bun SQLite, Node migration compatibility, backup DB access              |
| root               | Hono app, startup/lifecycle, dependency integration, validation, report |

## Decisions and evidence

1. Reuse existing validated procedure logic through the first-party `@orpc/trpc` migration adapter; expose oRPC alongside legacy clients. This preserves business rules while removing the Next.js host. It does not remove tRPC source definitions.
2. Three observable subscriptions require async-iterator conversion for oRPC. Lazy routers are supported by the adapter.
3. Bun cannot rely on V8-only SQLite bindings; select Bun-native SQLite at runtime while retaining Node migrations.
4. Auth and MCP consent need backend-hosted pages for full headless browser login.
5. No new tests requested; use focused type/static checks and manual requests against isolated fixtures. Docker validation is relevant to this migration, rather than an unrelated broad check.

## Completion evidence

Implementation and local headless validation completed; final evidence below and in report.md. No published image/release or live external-provider acceptance claimed.

## Integration findings

- Bun-native SQLite migrations and Node/Bun file roundtrip pass. Actual runtime defaults differed: Bun disabled foreign keys and used zero busy timeout. Set foreign_keys=ON and busy_timeout=5000; verified cascades, SET NULL, orphan rejection, read-only opens and cross-process lock waiting.
- ssh2 optional native crypto crashed Bun at uv_version_string. Added exact-version patch to retain JavaScript crypto fallback under Bun; Node retains accelerator.
- Bun bundler emitted invalid namespace references for export-star from external modules. Deployment switches to esbuild ESM assembly while Bun remains the execution runtime.
- First packaged migrations needed /app/package.json for native binding root resolution. Added minimal metadata to headless image.
- Isolated artifact execution exposed nested undici version fallback that in-repo execution concealed. Retain root/nested external dependency versions and validate outside checkout.
- Auth and MCP consent now normalize HTTPS proxy protocol and secure cookies; source fixtures exercise real PKCE grant, MCP tool and assistant stream/error/cancel/recovery.
- All 346 current procedure paths have exact recursive oRPC parity. Existing resource, MCP, OAuth and log tests migrated to extracted owners; only these existing focused files run.
- Secretless frontend starts with only HOMARR_BACKEND_URL; local Next dev must bind localhost consistently to avoid a preexisting locale rewrite redirect loop.
- Final Response CORS headers need application after handler returns; raw Response resource endpoints otherwise drop prepared headers.

## Final integration gates

All three gates below are satisfied by the final acceptance evidence:

- Fresh headless Docker lifecycle and immutable image measurements.
- Full dashboard image build and split frontend/backend HTTP/browser checks.
- Final focused typechecks, formatting, import graph audit, source report and user runbook.

## Final local acceptance

- Fresh independent headless Docker image runs only Bun, Redis and Nginx after migrations; no Next app, server or React/Next packages.
- SQLite and PostgreSQL 17 fresh migrations/seed, health and oRPC reads/writes passed. PostgreSQL state survived app restart.
- Nonroot PUID/PGID 1000, graceful stop and SQLite volume reuse passed.
- Actual authenticated backup export/import passed with Docker restart policy `no`: Bun PID changed, Nginx/Redis PIDs and container start time did not; readiness and session recovered.
- Final full image built and served production onboarding; original HOSTNAME=0.0.0.0 retained to avoid locale rewrite loop.
- Secretless source frontend browser login, seeded dashboard, edit/save/reload passed without browser errors.
- All 346 procedures have oRPC path parity. Eight updated existing test files passed 109 cases. No new test cases/files.
- Final backend and Next TypeScript checks, focused package checks, source import audit (806 modules, no UI edges/client directives), lockfile parity, MDX/local links and whitespace checks pass.
- Headless image 353019421 bytes (336.7 MiB); full 545415132 bytes (520.1 MiB): 35.3% smaller uncompressed. Node binary remains 122.6 MiB; Bun 70.1 MiB.
- Detailed report: report.md. Runbook: ../../../apps/docs/docs/advanced/development/headless.mdx.
- Live external integration/identity-provider coverage and multiarchitecture publication remain outside the verified local acceptance.

- Final production browser completed fresh onboarding end to end: claim, credentials admin, authenticated defaults, empty integration selection, board setup and successful board construction; no browser errors.

- Task-only source servers, isolated Redis, browser sessions, Docker fixtures/volumes/network were stopped and removed after validation. Final local images and source/report artifacts are retained.
