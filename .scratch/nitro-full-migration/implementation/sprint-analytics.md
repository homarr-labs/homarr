# Analytics router sprint — frozen unmounted source

## Exclusive files

- `packages/api/src/nitro/routers/analytics.ts`
- `packages/api/src/nitro/routers/-analytics/resources.ts`
- `packages/api/src/nitro/routers/-analytics/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-analytics.md`

No shared registration, context, procedure, error mapping, manifest, legacy source, DB, Core, Auth, analytics package, cron package, host, or other router was edited. No mounting is supplied.

## Source identity and implemented bodies

The complete legacy router inventory is one leaf: `analytics.sendAnalytics`, mutation, authenticated admin permission, guarded demo behavior. There are no public analytics leaves, input/output validators, defaults on the procedure, OpenAPI/MCP projection metadata, subscriptions, cookies, or headers to add.

`createAnalyticsProcedures` implements the leaf with `authenticatedProcedure`, which retains the existing `sourceProcedure`/`BackendContext` boundary. Ordering remains demo mutation guard → authentication → admin permission → `PRECONDITION_FAILED` / `External connections are disabled` → snapshot service → `{ status }`. No input/output validators or additional authorization policy were introduced.

`createAnalyticsSnapshotService` contains the actual source snapshot body, not a collection callback or tRPC forwarding adapter. It uses the procedure's `context.db` and injected genuine `getSchemaForDatabase`, Drizzle `and`/`eq`/`count`/`countDistinct`, and SuperJSON codec primitives. Its owned bodies are `readSettings`, `updateAnalyticsSettings`, `getOrCreateInstanceId`, `sendSnapshotAsync`, the coalesced `sendServerAnalyticsAsync`, and local copies of the source due/bucket/UUID/group-sum logic.

Source behavior conserved:

- Stopwatch construction precedes the internal external-connections check. Initial analytics settings read, disabled log, clock read, and due check remain outside the catch, so their failures still reject rather than becoming `failed`.
- Missing settings reads return the real exported defaults; stored settings shallow-merge those defaults with SuperJSON-decoded fields. No consent, usage, database counts, runtime properties, or empty successful snapshots are fabricated.
- Instance-ID allocation retains truthiness checks, a single proposed ID per invocation, concurrent winner preservation, and the original nullish fallback.
- Analytics settings updates perform at most five read/merge/reducer/serialize/CAS attempts. The predicate matches both `setting_key = analytics` and the exact previous serialized `value`, with `returning(settingKey)`. Missing rows and exhausted contention retain `Analytics server settings are missing` and `Analytics server settings changed too often to update`. No insertion, broad write, decoding-based equality, extra merge after the reducer, retry of provider effects, or fallback write is added.
- All parallel physical counts, projections, groupings, distinct board counts, joins, status filtering, board-size buckets, zero-count omission, and property names remain as source. Counts are computed from actual admitted SQL, not injected analytics aggregates.
- Seven-day freshness, deterministic SHA-256 period UUID, credentials/oidc/ldap provider order, platform/architecture/version, Docker/Kubernetes flags, and floored uptime remain unchanged.
- Latest analytics settings are read again after collection; `enableGeneral` and the external-connections gate are rechecked before client construction. The original time-of-check boundary is preserved, not promoted to an atomic provider consent guarantee.
- Provider sequence remains synchronous `capture` → awaited `flush` → serialized settings CAS for the original timestamp → elapsed success log → `sent`. Capture/flush/CAS/post-success-log failures inside the catch produce the original warning and `failed`; a throwing warning still rejects. The event retains `disableGeoip: true` and `$process_person_profile: false`.
- `sent | skipped | disabled | failed` is the exact result union. One service instance coalesces concurrent callers onto the identical pending promise and resets it in `finally`; there is no request-signal cancellation, retry, timeout, or new lifecycle policy in the source body.

## Conserved read-only source paths

- `packages/api/src/router/analytics.ts`
- `packages/api/src/trpc.ts`
- `packages/analytics/index.ts`
- `packages/analytics/src/index.ts`
- `packages/analytics/src/send-server-analytics.ts`
- `packages/analytics/src/snapshot-properties.ts`
- `packages/analytics/src/client.ts`
- `packages/db/queries/server-setting.ts`
- `packages/server-settings/src/index.ts`
- `packages/db/schema/index.ts`
- `packages/db/driver.ts`
- `packages/db/collection.ts`
- `packages/auth/server.ts`
- `packages/auth/providers/check-provider.ts`
- `packages/common/src/stopwatch.ts`
- `packages/cron-jobs/src/jobs/analytics.ts`
- `packages/cron-jobs/src/jobs/runtime-bodies.ts`
- `packages/cron-jobs/src/runtime.ts`
- `packages/cron-jobs/src/sql.ts`

## Exact binding holds

The procedure body is implemented; `analyticsPendingPaths` is empty. The sole identity remains dependency-held and unmounted, explicitly exported as `analyticsBindingHeldPaths = [analytics.sendAnalytics]`.

1. Physical persistence: host must supply the real admitted `BackendContext.db`, corresponding `getSchemaForDatabase`, matching operators, and canonical SuperJSON parse/stringify. The same database authority must back settings reads, counts, and CAS. No storage migration, authority proof, provider assembly, or actual SQL execution is delivered here.
2. Domain/runtime producers: bind genuine `createId`, `Stopwatch`, wall-clock `Date`, logger, root package version, actual database-dialect detection, platform/architecture, process uptime, enabled auth-provider predicate, and Docker/Kubernetes/external-connection policy. The procedure and snapshot service must use the same external-connections policy producer; no caller-supplied environment or statistics can stand in for these.
3. Provider effect: bind the real source-equivalent PostHog client constructor/configuration, synchronous capture and awaited flush. There is deliberately no default, fake sender, credential, provider import, or live provider action in this lane. Provider failure must preserve the source catch and settings-write behavior; it must never be acknowledged as sent without the awaited flush and CAS.
4. Lifecycle/coalescing: construct one `createAnalyticsSnapshotService` per source database authority and share that exact instance between this router and the analytics cron producer. Preserve the cron source's weekly/run-on-start, hidden, no-manual/no-custom-interval policy and its separate external-connections no-op. Host admission and stop/drain must own every admitted snapshot until it settles before SQL/provider disposal. Per-request construction or sharing this instance across unrelated databases would violate the source singleton behavior. No runtime binding is made here.
5. Existing prepared jobs candidates are read-only references, not interchangeable completed bindings. `createAnalyticsJobService` currently introduces abort checks, uses different empty-ID handling and success logging, and owns a separate pending promise. `createHomarrJobsRuntime` closes over that service. Binding this new router directly to those candidates without reconciling the exact shared source body/lifecycle is held for the relevant owner; this lane did not change their contracts or bodies.

## Source comparison and deferred validation

Dependencies and exports were read from `packages/api/package.json`, `packages/analytics/package.json`, `packages/cron-jobs/package.json`, and `packages/db/package.json`. Installed `@orpc/server` is `2.0.0-beta.43`; its builder handler/context declarations and implementation, ORPCError constructor declaration, SuperJSON generic parse/stringify declarations, Drizzle aggregate declarations, and PostHog capture/flush declarations were inspected locally. PostHog is owned by the analytics package, not directly imported into API code.

A read-only Python whitespace-normalized source comparison reported MATCH for the complete parallel SQL/query-order block, conditional status/group properties and board buckets, serialized CAS update statement, seven-day due function, bucket boundaries, and pending-promise coalescing/reset. The remaining permission, enablement/readback, error, UUID, capture/flush/write/log, and resource substitutions were compared directly against the read source. This is source-comparison evidence only, not runtime/type validation.

Per sprint instructions, no lint, typecheck, build, test, format, install, new tests, nested agents, Git, network, providers, actual SQL, environment/current data access, listeners, browser, containers, or preserved-port actions were performed. Required lint/typecheck and binding review remain deferred to the coordinator. Source is frozen on return; no acceptance or mounting is claimed.
