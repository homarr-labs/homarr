# Full migration ticket drafting contract

This is planning, not permission to implement or publish. User requested `to-tickets` and `grill-with-docs`. The coordinator will present one reconciled numbered graph for approval before publication. Linear is at its free issue limit; local publication requires one file per approved ticket, never a single combined ticket.

## Confirmed policy

- Nitro v3 + Vite/React + TanStack Router + direct oRPC; all packages/libraries may change.
- Nitro is the sole application build gate. Do not require the old Next app to remain buildable, or introduce compatibility adapters just to preserve it.
- User explicitly permits external API, URL, CLI and format breaks: “You can break everything. Complete re-write.” Preserve application capabilities and durable content, not obsolete transport signatures. Data conversion remains required; no authorization to delete data or touch real installations.
- Focused new regressions for security, data migration and critical flows are authorized. No speculative unit tests, broad suites, intermediate checks or full-repository typecheck.
- Same worktree, no branch switching. Playable container remains untouched. At implementation time up to twelve exclusive-owner workers may run; planning must expose genuine dependency readiness rather than serialize all feature work behind full infrastructure.
- Later interview answers in `DESIGN.md` override stale open-decision statements in returned drafts: singleton, both SQL dialects, Mantine, standalone use-intl, bounded Auth.js Core Fetch-first spike, named folder-based TanStack file routes and Redis removal are settled. Exact ORM/driver choice, copied-data importer, editor draft unification, HTTP/SSE realtime and one-time re-login remain unresolved. Do not present those latter recommendations as approved.

## Drafting rules

Read `to-tickets`, the completed assigned inventories and `.scratch/nitro-full-migration/DESIGN.md`. Source facts are evidence, not approved architecture. Do not duplicate the still-running endpoint research.

1. Use stable provisional keys by area, not final issue numbers. Each proposed ticket has title, user-visible end-to-end delivery, actual blockers, exclusive ownership domain, specific covered capabilities/kinds/procedures/models, and 3–6 concrete acceptance obligations. Avoid stale file paths/code snippets in ticket bodies; coverage ledgers may cite the research separately.
2. Each feature ticket is a tracer bullet through persistence/service, authorized endpoint, UI and relevant verification. Do not split a feature into “API then UI then tests” tickets. Necessary wide/shared runtime expansion and eventual contraction are explicit exceptions, with a verifiable runnable outcome.
3. Size batches for one fresh implementation context. Group providers/widgets only by demonstrated common seams and similar acceptance work. List every covered kind explicitly; do not hide feature loss in “remaining providers” or “other widgets.” Keep sensitive server actions and browser/UI behavior in the same capability slice or name their cross-owner edge.
4. Distinguish **implementation start prerequisites** from **integration/release gates**. Consuming an agreed interface should not depend on every peer's final implementation. Mark decision dependencies by name, not fictitious code tickets. Shared composition, manifests, exports and lockfile each have one writer.
5. Include a coverage ledger mapping each assigned source capability to exactly one primary ticket; name cross-area consumers instead of duplicate owners. Identify gaps, disputed ownership and suspected oversized batches.
6. Tickets preserve intended capabilities, not automatic preservation of bugs. Specific source discrepancies/security fixes remain explicit decisions or acceptance obligations, not silently assumed product agreement.

## Reserved seams for cross-area references

`FOUNDATION`: runnable target shell/request context/feature registration and principal/policy/secret interfaces; does not mean all production login/providers are complete.

`PERSISTENCE`: durable repository/transaction/lifecycle implementation; `COORDINATION`: bounded state/cache/refresh/fanout services; `IDENTITY`: real authentication/session/provider lifecycle; `LOCALIZATION`: request-local catalog/formatting/provider facade; `BOARD-RUNTIME`: authorized board/grid/editor model and feature registration; `INTEGRATION-RUNTIME`: server integration execution/management/credentials and capability registry; `WIDGET-RUNTIME`: typed widget/option registry and Query/refresh/hydration interfaces; `ASSETS`: safe media/icon/proxy contracts; `TRANSPORTS`: shared Fetch/oRPC/stream/MCP hosts.

These are seam names, not instructions to create horizontal mega-tickets. Propose minimal runnable expansions where required and let the coordinator reconcile them to actual slices.

## Safety and output

Write only the assigned draft under `.scratch/nitro-full-migration/drafts/`. All application source, manifests, research notes, trackers, shared coordination files, data, containers and browser sessions are read-only. No checks/install/builds/tests/runtime probes or extra agents. Return your draft path, ticket count, reconciled coverage and unresolved decisions. Do not mark any draft ready-for-agent or dispatch implementation.
