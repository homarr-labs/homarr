# SQLite failure preservation and existing host join

## Retained source findings

The two complete ordinary development reports are `implementation/main-runtime-factory-development-review.md` and `implementation/main-runtime-backend-spine-development-review.md`. They establish concrete explicit factories and a retained native owner, not actual production enrollment or session/principal authority. `compose.ts` still mounts only foundation health. This is not formal source-capture/native acceptance.

## Phase A — one-file construction-error repair

Exclusive original DB owner may change only `packages/core/src/infrastructure/db/drivers/sqlite.ts`, in its construction-failure catch. Attempt the same strict synchronous close once. If close succeeds, rethrow the original value unchanged. If close fails, preserve both original and cleanup failures in order using the existing failure-preservation convention (a native AggregateError with the original as cause is sufficient). No logged SQL/error contents, automatic retry, async signature, transaction/body changes, or additional connection.

The author may reread this exact source, the existing core manifest and already-reviewed runtime failure conventions; no other protected owner/native/Auth/body acquisition. Existing dependencies suffice; no utility or library is needed. Capture the exact before/after catch in the source handoff. No comments, casts, tests or new product files. Source freeze and independent review precede separately released focused lint and existing backend/Nitro typechecks. No database or native-close scenario is executed.

## Phase B — disjoint existing public-consumer tracing

Exclusive backend analyst may read only these current source files to EOF (2,000 lines maximum per file):

- `apps/backend/src/server/runtime-composition/index.ts`
- `apps/backend/src/server/runtime-composition/public-settings.ts`
- `apps/backend/src/server/runtime-composition/public-culture.ts`
- `apps/backend/src/server/runtime-composition/public-rpc.ts`
- `apps/backend/src/server/runtime-composition/join-slots.ts`

Reuse prior backend-spine facts rather than rereading the seven bodies. Identify concrete consumer/context factories and whether a safe same-owner public host adaptation is source-ready. Enumerate actual source-backed indispensable session/principal/epoch producer paths without reading them. If these consumers require missing resources, retain that hold; do not widen anonymous RPC, fabricate settings/defaults/permissions, or mount incomplete production composition. Only one optional collision-checked report: `implementation/main-runtime-public-consumers-development-review.md`. No product edits or import-following.

## Deferred, not repaired by this phase

PG Drizzle-construction failure has no local cleanup, but concrete leakage and a contract-preserving awaited cleanup route remain unproved. Do not make its synchronous public factory async, detach pool.end, or create another owner. Static top-level schemas default to SQLite; fix only an actual PG consumer after identifying its boundary. Native DB completion, durable epoch/adoption, real principal/authority through COMMIT, restart/restore, runtime mounting and production cutover remain separately held. Procedure acceptance stays91/334.

## Execution bounds

A and B are disjoint and may run concurrently only after independent oracle approval. No commands, install, runtime, SQL/data/secret access, source capture/stat/hash/native inputs, Git mutation, browser or paused Darwin work. On incomplete source reads report partial and stop. Existing evidence and prior failures stay untouched. Optional A handoff: `implementation/sqlite-construction-failure-preservation.md`; coordinator owns this plan/roster. Exa/web search replaces exhausted Context7; no new external API behavior is required for the error-only change.
