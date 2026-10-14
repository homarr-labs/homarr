# Ten-owner backend procedure sprint

User explicitly requests at least ten concurrent GPT-6.1 Sol high backend workers, each owning a small tRPC-router-to-oRPC port. Prior domain-plan approval permits unmounted source preparation; this wave does not authorize private production exposure or fabricated authority. Current HEAD is c009cba62. Existing COMPOSITION declarations and proxy source discovery retain disjoint leases; completed pure AUTH preparation is frozen. Ten router workers plus those two existing owners fit the twelve-worker cap.

## Exclusive source scopes

All destinations are below `packages/api/src/nitro/routers/`. Each worker owns at most three code files: the router, its resource types and an optional local helper. Legacy sources are read-only.

| Lane           | Legacy source                                   | Router              | Other allowed code files                                     |
| -------------- | ----------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| Widget         | `router/widgets/index.ts` and source subrouters | `widgets.ts`        | `-widgets/resources.ts`, `-widgets/helpers.ts`               |
| Section        | `router/section/section-router.ts`              | `section.ts`        | `-sections/resources.ts`, `-sections/helpers.ts`             |
| Location       | `router/location.ts`                            | `location.ts`       | `-locations/resources.ts`, `-locations/helpers.ts`           |
| Docker         | `router/docker/docker-router.ts`                | `docker.ts`         | `-docker/resources.ts`, `-docker/helpers.ts`                 |
| Kubernetes     | `router/kubernetes/router/kubernetes-router.ts` | `kubernetes.ts`     | `-kubernetes/resources.ts`, `-kubernetes/helpers.ts`         |
| Custom Widget  | `router/custom-widget/custom-widget-router.ts`  | `custom-widget.ts`  | `-custom-widgets/resources.ts`, `-custom-widgets/helpers.ts` |
| Assistant      | `router/assistant.ts`                           | `assistant.ts`      | `-assistant/resources.ts`, `-assistant/helpers.ts`           |
| Cron Jobs      | `router/cron-jobs.ts`                           | `cron-jobs.ts`      | `-cron-jobs/resources.ts`, `-cron-jobs/helpers.ts`           |
| Analytics      | `router/analytics.ts`                           | `analytics.ts`      | `-analytics/resources.ts`, `-analytics/helpers.ts`           |
| Update Checker | `router/update-checker.ts`                      | `update-checker.ts` | `-update-checker/resources.ts`, `-update-checker/helpers.ts` |

Each owner writes only its named code and `.scratch/nitro-full-migration/implementation/sprint-<lane>.md`. No worker changes shared context/procedure/errors/contribution/map/index, old accepted routers, manifests, lock, DB/Core/Auth, host/provider assembly or another lane's files. Coordinator alone integrates metadata and registration after returns.

## Execution contract

- Read actual source router and called domain helpers; preserve every leaf's input/output schemas, intersections/defaults, permissions/demo ordering, errors, pagination, SQL/projections/effects, subscriptions and source metadata. Do not fix perceived legacy bugs or simplify behavior.
- Use existing `sourceProcedure`, `authenticatedProcedure`, metadata and genuine `BackendContext` patterns. Implement actual source business logic using injected physical schema/operators and concrete owned domain-resource primitives. No tRPC tunnel, ambient Next/Redis/env initialization, synthetic principal, constant controller result, generic execute/atomicApply callback or provider calls during preparation.
- Real credential authority, atomic board drafts, media policy-to-COMMIT, physically backed state/jobs/history and lifecycle resources retain their current gates. Port unmounted handlers and honest candidate contracts; do not call missing bindings complete. Do not modify G3 or create migrations.
- Verify libraries exist in package dependencies; use installed pinned implementations to check API details. Current oRPC docs were fetched via Context7 for context/input/output/handler/middleware/error/metadata syntax; installed beta APIs and existing local base are authoritative. Documentation references: https://github.com/dinwwwh/orpc/blob/main/apps/content/docs/procedure.mdx and https://github.com/dinwwwh/orpc/blob/main/apps/content/docs/migrations/from-trpc.mdx.
- User requests deferred lint/typecheck during this drafting wave. Workers do source comparison only: no lint/typecheck/build/test/format/install commands or new tests now. Do not claim validation or acceptance. Required final verification is still outstanding.
- No nested agents, Git mutation, credentials/environment/current-data access, network/provider calls, listeners/browser/containers or preserved 3100/3200 changes. Prefer unknown/discriminated unions; no any, comments, unsafe casts or speculative utility frameworks.
- Return source leaf inventory, implemented versus dependency-held identities, exact file list and concise source-equivalence/missing-resource notes. Freeze on return. Central accepted 91/334 count stays unchanged until coordinator reconciliation and review; new drafts are not live features.

## Scheduling

The first Section and Location drafts returned frozen; their owners immediately continue with Log and remaining Board procedures to sustain ten concurrent backend lanes. Log owns only `log.ts`, `-logs/resources.ts`, `-logs/helpers.ts`; remaining Board owns only `board-mutations.ts`, `-board-mutations/resources.ts`, `-board-mutations/helpers.ts`. The nine previously accepted Board query candidates and all existing board/helper files remain frozen. Same shared safety/source-comparison/deferred-validation contract applies; previous Section/Location files are not reopened.

Oracle approved the ten disjoint lanes and shared contract before dispatch. All ten have been launched; session IDs and exact active scopes are in ROSTER.md. No worker waits for another lane or opens a shared source lease. Bounded defects/dependency requests are returned to the coordinator, not repaired outside scope. All ten use verified `openai/gpt-6.1-sol#high`.
