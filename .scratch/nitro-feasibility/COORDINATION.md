# Same-worktree coordination

## Authority and sequence

This is an operational proposal, not implementation authorization. The approved scope is [Choose the experimental architecture and prototype scope](https://linear.app/ajnart/issue/AJN-492/choose-the-experimental-architecture-and-prototype-scope); the implementation root is [Prove a cached dashboard on Nitro v3](https://linear.app/ajnart/issue/AJN-498/prove-a-cached-dashboard-on-nitro-v3). Use `SPEC.md` and `TICKETS-DRAFT.md` here for approval. After publication, the canonical Linear spec and approved child tickets are execution truth; local ownership/handoff notes carry mechanics and evidence, not competing scope.

1. Coordinator obtains breakdown approval and publishes the approved children before implementation dispatch. Claim the foundation with one writer.
2. Foundation stabilizes interfaces, pre-registers capability exports, establishes safe placeholders, and writes its bounded completion note. Completion means every planned consumer has a named interface and an exclusive writable boundary, with any actual probe evidence separated from pending full validation.
3. Coordinator claims only dependency-ready tickets, transfers their owned stubs, and dispatches workers with exact ownership and read-only consumer pointers. Use `openai/gpt-6.1-sol` with high reasoning where that supported model/variant is available; verify actual dispatch selection. A ceiling of twelve is not a target: the proposed implementation frontier has at most four capability writers.
4. Coordinator consumes each note, reconciles central registrations, and releases newly ready work. Final integration takes exclusive ownership only after all modifying workers finish, then performs the deferred checks and observations.

## Proposed ownership paths

`apps/nitro-experiment/` is available in this checkout and already fits the root `apps/*` workspace pattern. Proposed workspace name: `@homarr/nitro-experiment`. Keep experiment-specific code there; a new shared package is unnecessary unless implementation finds a real reuse boundary. This plan creates no application scaffold.

The foundation may adjust these names once, before worker claims. Record the settled map in its note and roster. Every unlisted shared path remains coordinator-owned until assigned.

| Owner / ticket | Exclusive writable proposal | Read-only consumers / boundary |
| --- | --- | --- |
| Foundation, then coordinator | Root `package.json`, `bun.lock`, necessary shared tooling configuration; experimental `package.json`, `tsconfig.json`, `vite.config.ts`, `nitro.config.ts`; `src/contracts/**`, `src/server/context/**`, `src/server/database/**`, `src/server/api/root.ts`, `src/server/api/client.ts`, `src/app/router.tsx`, `src/app/root.tsx`, `src/app/slots.ts`, `src/entry-server.tsx`, `src/entry-client.tsx`, `server/routes/**`, `server/plugins/**` | Sole schema, manifest, lockfile, entrypoint and route/plugin registration writer. Existing shared config edits require an actual experimental need; current application source stays untouched. |
| Populated cached board | `src/features/viewer/**`, `src/server/render/**` | Contracts, request context, repository, fixed session/widget/editor slot interfaces and central entries are read-only. Export renderer/browser-hydration helpers to the already-wired entries. |
| Fixture identities/access | `src/features/session/**`, `src/server/session/**`, `src/server/access/**`, `src/server/api/session.ts` | Renderer, board repository and shared contracts are read-only. Export session procedures and common live authorization/mutation guards through foundation-defined imports. |
| Widget refresh | `src/features/widget/**`, `src/server/widget/**`, `src/server/api/widget.ts` | Own source/control handler implementations here; coordinator-owned routes delegate to them. Renderer, editor, contracts and auth guards are read-only. |
| Runtime board editing | `src/features/editor/**`, `src/server/board-edit/**`, `src/server/api/board-save.ts` | Repository's atomic commit, viewer slot, auth guard and schemas are read-only. Do not patch the widget component to edit its display label; pass committed configuration through the contract. |
| REST/OpenAPI sample | `src/features/api-docs/**`, `src/server/rest/**` | Contracts, board-read service and access guards are read-only. Export handlers/document generation for pre-registered central routes. |
| Container packaging | Experimental `Dockerfile`, `.dockerignore`, `compose.yaml`, `README.md`, `scripts/container/**` | Current Homarr Dockerfile/launchers/benchmarks, root and app manifests, configs and lockfile are read-only. Document only necessary experiment setup/run/isolation information. |
| Final integration | Coordinator-owned shared paths, plus relinquished capability paths as required; `.scratch/nitro-feasibility/results/**` | All editing workers must finish before complete-slice verification. If a worker resumes fixing code, pause that verification and reassign its exact files. Earlier bounded probes use the coordinated ownership policy below. |

Foundation creates the feature placeholders/interfaces before transferring their directories; it does not continue editing them after transfer. The initial widget component/snapshot adapter displays seeded values and metadata without polling, so the renderer has populated content before the live-source slice starts. Route wrappers explicitly import capability implementations so workers can complete behavior without route generation or registry writes. Shared schemas include all intended procedure inputs/outputs, projection variants, revision/generation, source controls, widget states and slot props before concurrency starts.

## Claims and interface changes

- Coordinator is the only writer of `.scratch/nitro-feasibility/ROSTER.md`. Proposed roster fields: ticket title; worker session; state (`waiting`, `claimed`, `editing-complete`, `blocked`, `integrated`, `verified`); satisfied blockers; owned paths; consumer interface version; note pointer. `editing-complete` does not imply full validation; its note can include bounded probe evidence and must identify pending outcomes.
- Claim only when named blockers are editing-complete and their required interfaces/registration handoffs are available. The worker prompt includes the canonical ticket/spec, exclusive paths, named consumer notes, and evidence pointers needed for that branch. Session creation does not establish ownership by itself.
- Workers edit only their claimed files. Shared uncommitted changes remain visible in this worktree. No worktree creation, branch change, switch, reset, force push, or overwriting another owner's changes is part of this workflow.
- When an interface is insufficient, stop at the boundary and report a concrete proposed change. The coordinator alone updates shared schemas/manifests/lockfile/registrations, versions the handoff, and identifies every affected consumer. Pause affected consumers until their contract is reconciled; do not make parallel speculative fixes.
- All package upgrades are permitted but have one owner. Prefer experimental package-local dependencies where sufficient; keep root catalog versions and existing application consumers unaffected rather than incidentally breaking Homarr through scaffold upgrades. Any genuinely necessary shared dependency change is explicit coordinator work. Check existing dependencies before adding a library, prefer existing tooling, and keep forbidden runtime graphs out of the experiment. Light reusable-package inspection is acceptable; importing a Next-dependent package to satisfy a reuse preference is not.
- Worker dispatches may write bounded feature modules concurrently, but installing or regenerating the lockfile is exclusive coordinator work. Existing appdata, root live environment files, and credentials are not inputs; the database and controlled source are disposable fixtures only.

## Worker completion notes

Each worker writes only its own `.scratch/nitro-feasibility/worker-notes/<ticket-slug>.md`. Keep it bounded and include:

1. Ticket title and editing outcome; actual owned/changed paths.
2. Consumed and exported interfaces, any agreed interface changes, and affected consumers.
3. Acceptance outcomes implemented, source evidence, any actual bounded smoke/build/runtime evidence with its scope and result, and exact complete-slice validation still pending. Mark unrun observations pending.
4. Blockers or missing behavior; retain explicit unavailable outcomes rather than implying success.
5. Exact next-consumption pointers: exported symbols, coordinator registration requests, relevant producer notes, and pending observation steps.

Foundation's note additionally records resolved stack/connector decisions, finite bounds, settled path ownership, and the safe behavior of unfinished hooks. Coordinator owns roster transitions and integration status; workers do not edit Linear.

## Focused probes and deferred full verification

During foundation/capability editing, run no lint or typecheck and add no new tests. Focused isolated dev/build/runtime probes are allowed when useful to make a slice runnable and demonstrate its composed behavior. Such evidence is bounded to the actual composition observed, not a full-integration pass.

Before a probe, the coordinator assigns one probe owner and reserves the required registrations, build outputs, ports, processes, and disposable fixture database/volume. Use settled dependency interfaces and pause conflicting writers for the observation window; avoid reading half-updated registrations or racing another build/server/install. Shared registrations/manifests remain exclusive coordinator paths and installs/lockfile regeneration remain exclusive coordinator work. Record the observed source/composition, result, and pending outcomes in the worker's own note; release probe resources when finished.

After all modifying tickets finish, final integration performs complete-slice validation: experimental package-local or explicitly scoped existing lint/typecheck, production build and container startup, HTTP/browser/API/restart smoke, and exploratory measurements from the spec. Only that ticket promises green checks and full acceptance evidence. Never use root full-repository typecheck or broad suites. Reuse relevant existing tools only where they fit the fresh stack; record actual commands rather than prescribing a stale CLI invocation here.

Read installed Turborepo's bundled guidance before changing task configuration or commands, as required by root instructions. Bun-first runtime/database and exact released Nitro exports remain implementation constraints; Context7 quota exhaustion is already recorded and is not a reason for renewed broad research.

## Evidence pointers by branch

- API/contracts/REST: `research_notes/Homarr Nitro v3 stack choices/orpc-elysia.md` for direct oRPC beta.43, output schemas, converters, and the distinction between handlers and generation. Its Elysia alternatives are excluded.
- Renderer/cache: `research_notes/Homarr Nitro v3 stack choices/tanstack-rendering.md` for the CSR example correction, manual SSR seams, package-version drift, and coherent artifacts.
- Database/lifetime: `research_notes/Homarr Nitro migration experiment/storage-background.md` for released database/connector and bounded-cache caveats only. Its Node-first retained-stack migration recommendation is historical, not this slice's plan.
- Packaging/verification: `research_notes/Homarr Nitro migration experiment/performance-packaging.md` for provenance, correctness gates and honest measurement units; its broad parity/runtime matrix is out of scope.
- Context only when needed: `reports/Homarr Nitro v3 stack choices.md` and `research_notes/Homarr Nitro v3 stack choices/AGENT-HANDOFF.md`. Their older proposed JSON state, optional frameworks, sequencing, and concurrency suggestions do not override approved Linear scope or these execution rules.

Preserve all existing reports/notes. The experiment produces new bounded evidence; it does not rewrite prior research to look retrospectively verified.
