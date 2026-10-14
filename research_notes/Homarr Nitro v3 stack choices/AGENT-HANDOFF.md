# Nitro v3 rewrite: feasibility handoff

## Start at the decision frontier

1. Read [Find the route to a lightweight Nitro Homarr](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr) and [Choose the experimental architecture and prototype scope](https://linear.app/ajnart/issue/AJN-492/choose-the-experimental-architecture-and-prototype-scope). Completion: identify the bounded feasibility question, provisional choices, authorization and observable outcomes. Architecture is unblocked; seven completed research plus eight open decision/prototype tickets make 15 children. The map owns choices; the [current report](../../reports/Homarr%20Nitro%20v3%20stack%20choices.md) supplies proposals.
2. Load evidence by branch: API/contracts/OpenAPI/Elysia → [orpc-elysia.md](orpc-elysia.md); SSR/hydration/cache → [tanstack-rendering.md](tanstack-rendering.md); eventual capability/data/measurement → the relevant historical notes via [historical handoff](../Homarr%20Nitro%20migration%20experiment/AGENT-HANDOFF.md). Completion: separate source facts from unverified integration. Historical planning/approval gates are superseded by the current map and this report.
3. Agree bounded scope → later build a disposable same-worktree spike → use findings for final decisions → to-spec → to-tickets → adapted parallel build. Completion for scope: agreed question, fixture/auth/state defaults and omissions; no detailed migration spec or complete parity is needed first. Budget490/render495/state493/API494 decisions now block final route484 alongside prototypes485/491, not disposable scope. Container491 can compare before final budgets with explicit omissions.

## Prototype freely, protect real data

Every dependency and application interface can change. Suggested baseline: direct oRPC beta.43 on Nitro v3/Vite with Router React SSR; optional Elysia needs a concrete independent role. No tRPC/Redis/Drizzle retention is required or proposed as the baseline. Exact final stack, runtime and database remain undecided.

Suggested scope uses two synthetic identities, local-only fixture sessions, isolated file-backed JSON board revisions and bounded in-memory caches. Prove login/private access → typed read → populated SSR/matching bootstrap → widget update → rebuild-free edit → restart. Completion: record observed behavior and omitted providers/widgets/transports/jobs/production hardening. Use copied/disposable fixtures in dedicated paths; preserve real user data and live stores. Fixture auth and state are nonproduction, not final architecture.

## Claim, consume, hand off

Use one shared worktree. One writer stabilizes contracts/bootstrap first; only ready independent slices run concurrently. The coordinator owns manifests/lockfiles/shared registry/contracts and grants exclusive file ownership before edits. Interface changes block consumers until agreement. Shared uncommitted work stays in place: no branch switch, checkout/reset or overwriting another owner's files.

Each worker consumes its canonical scope/spec/ticket and named decision pointers, then writes its own bounded completion note with owned/changed files, interface changes, evidence/deferred checks, blockers and exact next consumption pointer. Completion: every scoped interface/outcome is accounted for, with missing execution evidence pending and omissions explicit. Final integration reconciles registrations; the full capability/data ledger belongs to the later rewrite.

Stock implement-spec requires separate worktrees and per-worker TDD; use an explicitly adapted orchestrator, not that workflow unchanged. Proposed concurrency is 2–3 workers, adjustable and unapproved. Prefer `openai/gpt-6.1-sol` high within medium-to-xhigh; resolve actual supported model/variant IDs before authorized dispatch.

## Preserve evidence and execution rules

Nitro v3/Vite, full-rewrite freedom, same worktree, Sol high and no GitHub Pages govern this experiment. Capability/data preservation remains the eventual migration goal, not full parity before the first proof. Resolve one human scope choice at a time; agents do not decide the final architecture for the user.

Pin the fresh stack for reproducibility. Named TanStack Nitro “SSR” is CSR; genuine React SSR still needs Router hydration. The optional oRPC Zod converter needs >=4.5: upgrade ordinarily, not an approval gate. Use one public-spec authority; Nitro metadata does not discover nested contracts. Elysia hosting does not replace oRPC types. No RAM reduction is measured. Load branch evidence for exact citations.

No lint/typecheck until full implementation completion; final checks target affected packages only, never full-repo typecheck. New tests require explicit user request. Research/doc edits require no code checks. Preserve all historical artifacts unchanged. This handoff itself authorizes no implementation, Linear mutation or dispatch.
