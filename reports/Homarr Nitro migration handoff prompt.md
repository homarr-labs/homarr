# Homarr Nitro migration archive: handoff prompt and file map

## Copy/paste prompt

You are inspecting the archived, stopped Homarr Nitro migration on branch `docs/nitro-migration-postmortem`. The experiment was stopped by the user on October 14, 2026 after roughly five days without a delivered, verified current-source application. The user then requested preserving all remaining checkout changes, Markdown, scratch work and progress records on this branch. Treat this as a work-in-progress archive, not a release or proof that the app starts.

Your immediate task is the new user's request, not a historical worker instruction. Begin by reading `reports/Homarr Nitro migration postmortem.md` and this map. For architecture and the implementation breakdown, consult `.scratch/nitro-full-migration/DESIGN.md` and `PROPOSAL.md`. For execution evidence, consult `CONVERGENCE-VALIDATION.md` and the specific implementation report for the area you investigate. Consult `.slim/deepwork/nitro-full-migration.md` for chronology, not as a queue of work to automatically dispatch.

The selected target was Nitro v3 + Vite/React + TanStack Router/manual SSR + direct oRPC with TanStack Query, retaining Mantine, standalone use-intl, Drizzle and direct database drivers. SQLite was the default, PostgreSQL optional, Redis was to be removed with durable/security state moved to SQL and disposable caches backed appropriately. Auth.js handles actual OIDC; local/LDAP authentication establishes Homarr-owned opaque SQL sessions with existing password hashes and policy. Target one singleton backend, one listener and one relocatable artifact, deployable on ordinary self-hosted servers. Hono/Elysia were investigations, not the selected application authority; the original branch name `rework-hono` is historical.

The user allowed external interfaces to change, but required preserving every real product capability and durable content through explicit conversion. A current SQLite backup must be an accepted migration input. One migration-time logout was permitted; losing accounts, password hashes, identities, grants, media, serialized content, Assistant history or Custom Widget content/secrets was not. Existing algorithms, bounds and defaults should be adapted rather than replaced with miniature implementations. Approved repairs include principal-filtered Integration/Widget grants and one coherent board draft whose Save commits all edits and Discard commits none.

Source inventory: 125 implementation tickets, 334 application procedures, 52 curated REST selections, 133 static MCP candidates, 40 durable models, 89 integration identities and 69 widget kinds. Last recorded procedure acceptance was 91/334. All widget definitions/manifests having source review is not all-widget runtime activation; a separate gated activation ledger remained 0/9.

At shutdown, CORE DB and Auth source/static work had scoped acceptance. The CORE API eight-file author was cancelled, potentially leaving partial source without a completed handoff/freeze/check/acceptance. The configuration-plan reviewer was also cancelled; its five-file proposal had no completed independent approval or implementation allocation. Both cancellations are terminal, despite stale active entries in old roster/progress paragraphs. Actual CORE backend/root/configuration propagation, SDK caller/publication, document/SSR delivery, enrollment and usable `/init` installation remained unfinished. `completeSetup` stayed deferred.

The ordinary Vite startup path was not a verified way to launch this snapshot. Packaged startup requires `server/index.mjs` and exactly one `--homarr-host-config=` argument. Dev targets port 3200 and enables route generation. An earlier fixture on port 3100 had genuine narrow HTTP/browser evidence, but is not the replacement application and is not known to be currently available. Never substitute that fixture or original Next.js silently when asked to start the migration.

Historical passes belong to their original source generations. There was an accepted empty-memory native run, not a current full-application, populated migration, file-backed restart, PostgreSQL or Node parity proof. The historical native attempt `native-runtime-driver-t_05t8qe-matplan01` is consumed and must not be replayed or re-observed automatically. The previously approved Bun acquisition is also consumed. Temporary evidence paths in reports can be absent on another machine; a report citation is not the cited artifact.

Keep the stopped state unless the user explicitly asks for new implementation or execution. Preserve archived source and failures. Protect original installations, credentials, the port-3100 fixture and port-3200 output. Real restore/cutover, live provider effects and new native/acquisition work need their own authorization. Committing this archive was not that authorization.

For a new investigation, inspect the actual registering caller, configuration, context and UI consumer, not merely exported factory/type names. Distinguish planned, authored, reviewed, compiled, mounted and runtime-proven states. If explicitly asked to resume implementation, prioritize a small isolated current-source development launch and one real vertical user flow; do not recreate the previous recursive planning/review bottleneck. End with the exact files examined or changed, actual command results, the current working URL if one was verified, and concrete remaining blockers.

## Read order by question

| Question                                           | Start here                                                                        | Then inspect                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| What happened, and why was it stopped?             | `reports/Homarr Nitro migration postmortem.md`                                    | `.slim/deepwork/nitro-full-migration.md`, `.scratch/nitro-full-migration/ROSTER.md`                |
| What architecture did the user actually choose?    | `.scratch/nitro-full-migration/DESIGN.md`                                         | `PROPOSAL.md`; newer decisions override unanswered-question clauses in old drafts.                 |
| What did the full product need to preserve?        | `research_notes/Homarr full Nitro migration/`                                     | `.scratch/nitro-full-migration/COVERAGE-LEDGER.md`, `COVERAGE-AUDIT.md`, `issues/`, `TICKETS.json` |
| Which checks really passed or failed?              | `.scratch/nitro-full-migration/CONVERGENCE-VALIDATION.md`                         | The named report under `implementation/` and any available referenced receipt.                     |
| What is blocking startup/onboarding?               | `apps/backend/src/server/startup-configuration.ts`                                | CORE plans below, actual runtime composition, frontend installer/route and cancelled API files.    |
| What was the small working fixture?                | `.scratch/nitro-feasibility/worker-notes/integration.md`                          | `apps/nitro-experiment/` and `.scratch/nitro-feasibility/results/`                                 |
| Why not stock Auth.js Credentials/database or db0? | `.scratch/nitro-full-migration/spikes/auth/EVIDENCE.md`, `spikes/sql/EVIDENCE.md` | Exact installed-version limitations and production-session/direct-driver source.                   |
| Where are retained unfinished feature notes?       | `.scratch/nitro-full-migration/implementation/`                                   | Top-level `implementation/`, `scratchimplementation/`, and area-specific source.                   |

## Planning, history and evidence directories

### `reports/` and `research_notes/`

- `reports/Homarr Nitro migration postmortem.md`: consolidated architecture, chronology, technical lessons, execution failures, evidence boundaries and shutdown state.
- `reports/Homarr Nitro migration handoff prompt.md`: this copy/paste prompt and navigation map.
- `reports/Homarr Nitro migration experiment.md`: original October 10 hosting/state/rendering/performance research synthesis. Its provisional architecture is historical.
- `reports/Homarr Nitro v3 stack choices.md`: the fresh-stack/manual-SSR/oRPC synthesis and bounded-prototype proposal.
- `research_notes/Homarr Nitro migration experiment/`: five original investigations covering runtime, dashboard rendering, state/background work, API/auth, and performance/packaging, plus the old agent handoff.
- `research_notes/Homarr Nitro v3 stack choices/`: exact oRPC/Elysia and TanStack rendering investigations, plus an old agent handoff.
- `research_notes/Homarr full Nitro migration/`: eight exhaustive domain inventories: dashboard/navigation, endpoints/transports, identity/admin, integrations, widgets, persistence/background, localization/UI and extended features.
- `reports/nitro-archive-validation/`: fresh non-runtime lint/typecheck receipts for the archival snapshot. A failed check is retained evidence, not an instruction to repair or hide it. These checks are not application acceptance.

### `.scratch/nitro-full-migration/`

- `DESIGN.md`: numbered user choices and their chronological resolutions; includes selected direct SQL drivers, copied-data migration, split auth, SSE, coherent drafts and principal-scoped policy repairs.
- `PROPOSAL.md`: reconciled 125-ticket breakdown, dependency semantics, scope transfers and source counts.
- `issues/` and `TICKETS.json`: locally published implementation tickets and numbered metadata. These are not newly created Linear identifiers.
- `drafts/`, `GRAPH-AUDIT.md`, `COVERAGE-AUDIT.md`, `COVERAGE-LEDGER.md`, `RESEARCH-RECONCILIATION.md`: earlier drafts and reconciliation of overlaps, missing responsibilities and source-to-ticket coverage.
- `EXECUTION.md`, `ROSTER.md`, `WRITER-RULES.md`, `PUBLISHING.md`: historical dispatch, ownership, publication and workflow records. They include superseded instructions and stale live-state text.
- `CONVERGENCE-VALIDATION.md`: compiler, lint/format, build/static and bounded native observations with source-generation and failure limits. Read this before claiming a green current snapshot.
- `implementation/`: the bulk of worker reports, narrow designs, repair plans, source reviews, compatibility results, packaging/native capture reports and unimplemented consumer joins. Find the report by feature or prefix, rather than reading the whole directory.
- `checks/`: scoped compiler configurations and check support; not a production application entry.
- `spikes/auth/`, `spikes/sql/`, `spikes/i18n/`: bounded compatibility harnesses and retained reports/results. Their small synthetic fixtures are not full product tests.
- `stack-audit/` and `STACK-*`, `CURRENT-COMPILER-LAYOUT.md`: source/dependency/entrypoint audit and compiler-scope history.
- `playable23-check-*`, `playable23-final-*`, `playable23-frozen-*`, `playable23-return-*`: retained frozen source copies. They are historical material, not automatically the source to edit or a known working preview artifact.
- Top-level `MAIN-*`, `AUTH-*`, `PUBLIC-*`, `SESSION-*`, `SQL-*`, `STAGE-*`, `RESTORE-*`, `WIDGET-*`, `PROXY-*` and wave documents: area-specific historical contracts, source scopes and readiness/ownership proposals. Presence of a plan is not completion.

### Other retained working-note locations

- `.scratch/nitro-feasibility/`: the earlier small fixture's specification, coordination, tickets, worker notes, acceptance reconciliation and results. `results/` includes safe historical HTML/headers/screenshots and logs; the logs were explicitly included despite the normal Git ignore rule.
- `.scratch/implementation/convergence-linux-bun-acquisition-result.md`: the earlier acquisition result, not fresh acquisition permission.
- `.slim/deepwork/nitro-feasibility.md` and `nitro-full-migration.md`: chronological session progress. These normally ignored Markdown files were explicitly included in this archive.
- `implementation/`: residual top-level notes for certificate/media/backup/Kubernetes UI, PostCSS, Day.js and convergence groups.
- `scratchimplementation/`: additional proxy/lifecycle/adoption residual reports. Preserve this separately named directory; it is not a typo to normalize away.

## Actual code map

### Application ownership and startup

| Path                                                                      | Responsibility                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/nitro.config.ts`, `apps/backend/server/`                    | Nitro server/build configuration and server entry/plugin surface.                                                                                                                                                                             |
| `apps/backend/src/server/startup-configuration.ts`                        | Canonical packaged-entry initialization, bounded explicit host JSON, listener/origin/auth/persistence/culture schemas and path separation.                                                                                                    |
| `apps/backend/src/server/public-origin-ingress.ts`                        | Trusted public URL/Host ingress boundary; forwarded headers are not blanket authority.                                                                                                                                                        |
| `apps/backend/src/server/{host,compose,application}.ts`                   | Retained host, configuration-to-runtime composition, request/root lifetime, route dispatch, rendering and publication hooks.                                                                                                                  |
| `apps/backend/src/server/runtime-composition/`                            | Genuine native persistence owner, public/authenticated/fixed-write/onboarding/Auth HTTP assembly and resources. Inspect `runtime.ts`, `assembly.ts`, `native-main-persistence.ts`, `auth.ts` and `contracts.ts` together when tracing a join. |
| `apps/nitro/vite.config.ts`                                               | Vite/Nitro build, isolated artifact paths, suppressed dotenv, route generation, SSR externalization and shared-library deduplication.                                                                                                         |
| `apps/nitro/src/{entry-server,entry-client}.tsx`, `src/app/`              | Server/client entry, Router/Query/provider setup, public/private shell and preview presentation.                                                                                                                                              |
| `apps/nitro/src/routes/`, `src/route-tree.gen.ts`                         | File routes and generated tree. Dev regenerates the tree; old route files are not proof every feature is mounted.                                                                                                                             |
| `apps/nitro/src/{client,features,navigation,query,source-ui,ssr,styles}/` | Browser adapters, feature/UI preparations, typed navigation/query state, extracted real views, SSR and styling.                                                                                                                               |
| `apps/nitro-experiment/`                                                  | Separate earlier feasibility fixture, including its synthetic auth/board/widget services and dedicated packaging. Not the full application.                                                                                                   |
| `apps/nextjs/`                                                            | Original Homarr behavior/reference and remaining legacy callers. Some shared-caller repairs are part of this archived snapshot; tracked removals/moves in `apps/nitro` were preserved as found.                                               |

### Domain and shared packages

| Path                                                                                                      | What to look for                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/nitro/`                                                                                 | Ported routers, `procedure.ts`/`errors.ts`, context/contribution types, resource ports and explicit surface maps.                                                                                           |
| `packages/api/src/nitro/assembly/`                                                                        | Real SDK constructions for public/authenticated reads, fixed writes and onboarding. `onboarding-core.ts` exists in the cancelled partial-work area; verify it rather than treating existence as acceptance. |
| `packages/api/src/nitro/browser-contracts/`, `protocol-assembly/`                                         | Browser-safe contracts and separate HTTP/protocol composition. Not all exports imply a mounted route.                                                                                                       |
| `packages/api/src/{backup-runtime,media-runtime}/`                                                        | Backup/archive/restore preparation, Nitro joins and media HTTP boundaries.                                                                                                                                  |
| `packages/auth/nitro/production-sessions/`                                                                | SQL session issuer, adapter/repository, original body ownership, origin/CSRF, OIDC and onboarding/Core controllers. Key final CORE files: `sql-persistence.ts`, `service.ts`, `index.ts`.                   |
| `packages/auth/nitro/{sql-authority,critical-writers,policy,session-primitives,verifiers}/`               | Authority/currentness, critical effect ownership, policy, session primitives and retained verification behavior. Public profile DTOs are not native authority.                                              |
| `packages/db/runtime.ts`, `transaction-gate.ts`                                                           | Direct runtime and owned transaction/COMMIT/quarantine/cleanup boundaries.                                                                                                                                  |
| `packages/db/runtime-*` and `schema/runtime/`                                                             | Domain reads/writes for accounts, boards, apps, state, jobs, history, media, onboarding and credential/session authority.                                                                                   |
| `packages/db/runtime-onboarding-read.ts`, `runtime-preservation.ts`                                       | CORE bounded native projection and exact-record preservation observer; source acceptance does not establish executed file/decoder/data continuity.                                                          |
| `packages/db/migrations/`, `configs/runtime-*.config.ts`, `*runtime-catalog.ts`, `main-target-catalog.ts` | Original and added dialect assets/journals, generation configs and runtime target/history catalogs. New tails include SQLite `0050` and PostgreSQL `0018`; historical anchor mismatches remain important.   |
| `packages/contracts/`                                                                                     | Framework-neutral contribution/request/provider/render contracts shared by backend and frontend.                                                                                                            |
| `packages/core/src/infrastructure/http/`, `certificates/checks/`, `logs/runtime/`                         | Owned transport, TLS/proxy/cancellation/native clients, focused checks and log backing.                                                                                                                     |
| `packages/integrations/src/{runtime,nitro-bindings,native-clients}/`                                      | Adapted provider execution, ownership and actual client seams. The original integration classes remain the source of behavior.                                                                              |
| `packages/request-handler/src/` and `packages/redis/src/{cache,state}/`                                   | Bounded refresh, snapshots, epochs/state and Redis-removal backing preparations. The package name alone does not prove a running Redis dependency.                                                          |
| `packages/cron-jobs*` and `cron-job-status/`                                                              | Three registered jobs, schedules/status/startup cleanup and runtime/SQL/live backing.                                                                                                                       |
| `packages/widgets/src/`                                                                                   | Split definitions/manifests/registry, `native-view*` preparations, rendering/input/edit-state/query behavior and all 69 kinds. Definition extraction is not renderer activation.                            |
| `packages/{ui,forms-collection,modals,modals-collection,onboarding,spotlight,settings}/`                  | Shared real presentation/interaction extraction, browser services and remaining legacy adapter seams.                                                                                                       |
| `packages/translation/src/standalone/`                                                                    | Explicit standalone messages/culture/Day.js and request-safe localization preparation.                                                                                                                      |
| `packages/icons/src/`                                                                                     | Repository adapters, synchronization/search, SQL/native reads and owned resources; consume from real picker/cron callers.                                                                                   |
| `packages/cli/`, `scripts/`, `Dockerfile`, `deployments/nitro/`                                           | CLI/harness, candidate build/entry/migrate/run scripts, shipping assembly and isolated deployment proposal. They are not a verified startup instruction for this snapshot.                                  |
| `.github/workflows/nitro-candidate.yml`                                                                   | Manually dispatched candidate build preparation. It does not automatically publish or start a server.                                                                                                       |

## Exact final CORE frontier

Use these three plans together; their early “pending” premises can be superseded by later acceptance/cancellation records:

1. `.scratch/nitro-full-migration/implementation/convergence-onboarding-core-api-compatibility-plan.md`: approved eight-file API scope, including the shared `procedure.ts` and `errors.ts` type seams; the author was subsequently cancelled.
2. `.scratch/nitro-full-migration/implementation/convergence-onboarding-core-original-birth-plan.md`: fixed Auth handles and real original-request/root/backend context/configuration ownership; Auth source progressed, later Application/Backend/root joins did not.
3. `.scratch/nitro-full-migration/implementation/convergence-onboarding-core-configuration-plan.md`: five-file capture/dependency/caller proposal, genuine build/environment/Workshop inputs and a separate actual backend consumer; its independent review was cancelled.

Related controlling material:

- `convergence-onboarding-wire-producer-plan.md`: A–F write/claim/SDK/publication/browser preparation and receipt design.
- `convergence-native-preservation-observer-plan.md`: exact-record observer, baseline and sealed-file installer proposal; the later consumers/runtime proof were incomplete.
- `convergence-native-memory-execution-renewed-result.md`: one consumed historical native result and its limitations. Independent acceptance was recorded later in progress history.
- `convergence-onboarding-wire-transport-capability-plan.md`: inspected Bun transport lacked verified writer/finish hooks; the conditional Node bridge remained separate and unapproved.

The minimum CORE was `onboard.currentStep` and a nonsecret environment projection. Optional Docker/capability/icon probes and secret-bearing `testIntegration` mutation were deferred; `completeSetup` was also deferred. Presented invalid credentials must not fall back to anonymous bootstrap, while genuinely absent credentials can follow the approved same-unit claim/no-users path without adopting a credential domain.

## What this archive includes and excludes

Includes all pending tracked edits/removals and ordinary untracked experiment files, all retained `.scratch` contents, the two normally ignored `.slim/deepwork` records, remaining historical Markdown handoffs, fresh archive check receipts and this prompt. `.scratch` includes historical frozen copies, reports, logs, JSON, HTML and screenshots; preserve them as evidence, not application code to execute.

`.gitattributes` disables text normalization under `.scratch` so Git preserves original receipt/source-copy bytes, including HTTP header CRLF. Historical logs and failure transcripts contain trailing whitespace; those findings are retained rather than rewriting evidence. Fresh backend/Nitro lint and typecheck commands all exited 0 for this archival snapshot; they do not establish runtime acceptance.

It does not force-add dependency trees, ordinary ignored build outputs/caches, local environment/private-key files or unrelated personal agent configuration. It also does not copy private temporary-directory artifacts, containers or volumes into Git. Absolute `/private/var/folders/.../T/opencode/...` paths in reports refer to the original machine and can be unavailable in a fresh clone. No live service or native fixture was replayed to fill those gaps.

The archival credential-pattern check examined candidate checkout files without printing matched values; its only hits were interpolated usernames/passwords in synthetic proxy URL test templates, not literal real credentials. This is a bounded check, not a guarantee that every possible secret encoding is detectable. Test identities/secrets in explicitly synthetic compatibility fixtures are not production setup instructions.

## Completion criteria for an archive inspection

Report the selected architecture, concrete implementation frontier, actual evidence scope, missing external artifacts and the smallest next step relevant to the new request. Link claims to the actual source/report, and distinguish historical observations from current execution. A useful answer should tell the human where to look without making them replay all 125 tickets or read the entire roster.
