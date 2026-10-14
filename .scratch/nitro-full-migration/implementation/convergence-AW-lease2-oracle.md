# AW Lease 2 oracle — bounded source allocation

## Decision

**APPROVE with the staging and settlement amendments below.** This approves the bounded source plan, not implementation acceptance, full Auth/application PASS, runtime activation or a working sign-in flow. Accepted AW6, the ping repair and coordinator types0 are supplied premises; none was reproduced here. The actual fixed dispatch bodies exist at `packages/auth/nitro/production-sessions/service.ts:709–729` and `sql-persistence.ts:442–531`.

Only this new report was written. Ordinary source and the named AW reports/WRITER-RULES were read. No commands, checks, tests, product edits, evaluation, native/SQL/data execution, environment/secrets, network research or nested agents. K4's allocation remains untouched.

## Minimal allocation amendment

The three-producer-first freeze is incomplete **if it includes the concrete constructor required at lease2 lines 81–89**: `native-main-persistence.ts` would import/call NEW `fixed-write-rpc.ts`, whose body is currently absent. That adapter in turn needs NEW API `fixed-writes.ts` and its unpublished package subpath. This is a staging gate, not a reason to insert a throwing placeholder, optional owner, callback injection or private API deep import.

Prefer one explicitly approved **atomic five-source lease**, retaining a three-producer interface freeze followed by two-consumer completion inside it:

| Allocation               | Exact path                                                               |
| ------------------------ | ------------------------------------------------------------------------ |
| Producer                 | `apps/backend/src/server/runtime-composition/contracts.ts`               |
| Producer                 | `apps/backend/src/server/runtime-composition/auth.ts`                    |
| Producer                 | `apps/backend/src/server/runtime-composition/native-main-persistence.ts` |
| API consumer/factory     | NEW `packages/api/src/nitro/assembly/fixed-writes.ts`                    |
| Backend consumer/adapter | NEW `apps/backend/src/server/runtime-composition/fixed-write-rpc.ts`     |

1. Freeze required AW-derived dispatch/binding/construction contracts and the three Backend producer mechanisms first. Do not claim the MAIN constructor is complete while its adapter body is absent.
2. Implement/freeze the API factory against those contracts and actual original schemas/metadata. **Sole coordinator** then publishes exactly `./nitro/assembly/fixed-writes` → `./src/nitro/assembly/fixed-writes.ts` in `packages/api/package.json`, before Backend consumption. This manifest write is a separate coordinator operation, not a sixth writer source allocation. Export only the factory; infer its resources with `Parameters`.
3. Complete the Backend adapter and MAIN's real constructor, then freeze all five sources together. The constructor requires retained, already constructed Auth resources/issuer and the captured MAIN runtime; absent prerequisites fail closed. It is callable but unmounted, with no fabricated readiness.

If only three files are materially approved, freeze **dispatch/binding/drain foundations only**, explicitly deferring the constructor/import until a later approved allocation that includes its concrete adapter. That is not completion of the constructor promised by the present plan. Do not start either material scope without coordinator approval.

Keep `runtime.ts` and `assembly.ts` registration **unchanged and unallocated** until the next explicit enrollment. No changes to accepted AH/public transport/application, shared middleware/context, old App/Board families, AW6, DB producers/facades, K/D or other named holds.

## Import and type boundary

The intended runtime edge is MAIN producer → local fixed adapter → published API factory/existing AH helpers. There must be no reverse runtime edge that constructs/imports the MAIN owner from the new adapter. The existing `authenticated-rpc.ts:12–17` MAIN reference is type-only; that does not itself create a runtime import cycle.

Use explicit required Backend-private contracts for adapter inputs and constructor return (`readonly FetchContribution[]`), deriving fixed arguments/results from the frozen AW functions. The adapter receives retained resources and the private setup closure, not a `ReturnType` of the whole MAIN factory that recursively infers the new constructor. Auth's reference to the actual `Awaited<ReturnType<typeof prepareAuthenticatedRpcRequestAsync>>` must remain type-only. Do not solve inference/staging with a synthesized admission DTO, new context framework, casts, optional required members or a second issuer.

## Required implementation invariants

### 1. Original authority and single-use final context

`sql-persistence.ts:247–277` requires the exact originally registered operation signal. Pass the retained **original `association.lease` and `association.operation`**; neither preparation's joined signal nor `finalBackend.signal` replaces `operation.signal`. AW captures private evidence and joins its own owner/admission/lease lifetimes; no Backend evidence getter, allocator, native handle, arbitrary SQL callback or permission DTO authority is needed.

`auth.ts:212–225` resolves the original outer Principal and exact Request/requestId/signal/onDispose quartet. Keep that lookup separate from a new WeakMap keyed by the **actual final frozen context returned by same-owner `createSetupBackedContext`**. Its native Principal is a copied object (`context.ts:50–61`); authenticated middleware may copy context again (`procedure.ts:87–95`). Neither is the outer authority key.

Bind once before handling, reject duplicate/replacement registration of that final context, compare the actual admitted/current user profile/provider/expanded permissions, request and preparation signal/bounds, and retain the exact outer association. Use `sourceProcedure` without its authenticated context-copy helper and require `context === finalContext` before the business handler. One literal selected leaf, one handler invocation and at most one dispatch claim per binding; claim/prepublish before invoking. Detached business inputs are not authority.

Auth recognizes only the three literal protected `write` resources. Preserve the eleven configured read rules and their behavior. Apply original mutation/demo/auth admission and App `app-create` permission; Board full/ownership decisions and App transaction-local permissions remain B/P's authority. No wildcard registry or read-classified mutation.

### 2. Physical records precede consumer faults

Add separate MAIN fixed registration and association-owned write/handler records. Prepublish completion and retained entry **before deferred invocation or reentrant close**, capture the underlying AW promise, and record its original fulfillment/value/rejection/actual `TransactionCommitAmbiguousError` **before resolving/rejecting the forwarded completion**. Then API sanitization, App output validation and setup/publication postchecks cannot race ahead of physical recording. Pending-set removal must not erase retained settlement.

Do not use MAIN `registerOperation` (`native-main-persistence.ts:107–135`), guarded `runAsync`, Auth `trackRead`, `runActiveRequest` or a read-current wrapper as the fixed-result channel. Those wrappers flatten errors or postcheck fulfillment. Retain distinct not-forwarded/pending/fulfilled/rejected/ambiguous, handler/output, scope, publication and cleanup outcomes. Forwarding AW does not prove native invocation or COMMIT; ordinary rejection does not independently prove rollback.

Keep actual fulfillment acknowledged internally even when later serialization/currentness/scope/body/publication fails. Withhold success output, cancel/drain output, and do not retry or regenerate the App ID. A lost receipt after fulfillment is not newly ambiguous COMMIT. Actual native ambiguity remains nonretryable and does not clear quarantine.

### 3. Drain without a lifetime cycle

MAIN closes admission/aborts its owned lifetime before draining prepublished setup/handler/fixed work, then cleans up Auth requests, issuer, helper/native resources. Auth release first closes binding/dispatch admission, drains actual handler/write/read and cancellation obligations, then releases the lease and retires bindings. Preserve primary and cleanup faults independently of fixed settlement.

The setup scope uses only the captured native runtime's ordinary `runAsync` to supply real database/schema and stays active through the handler and finite serialization; it is not a mutation transaction or settlement channel. Its own completion/cleanup is tracked separately.

`binding.runHandlerAsync` completes after handler/finite reader/cancellation settlement, **not after outer response consumption or request disposal**. Register retirement on original `outerContext.onDispose`, not the setup-fenced context callback after scope exit. Do not await MAIN close, association release, an onDispose completion or application's outer-body termination from a task that those operations themselves drain. Keep binding registration alive after route return; unchanged application disposal is triggered by owned consumption/cancellation (`application.ts:100–118,296–388`). The route does not wait for that future event before returning its finite response.

### 4. Exact App/Board contracts and output-fault mapping

Original App create (`routers/app.ts:217–257`) is a demo-guarded `app-create` mutation with `appManageSchema`, unchanged `z.object({ appId: z.string() }).and(selectAppSchema)`, and original OpenAPI/MCP projection metadata. Preserve that metadata without enabling a projection transport. Generate exactly one ID after admission/input validation; copy id/name/description/iconUrl/href/pingUrl, preserving empty ping → null.

Both native App table declarations have exactly those six columns with nullable description/href/ping (`schema/sqlite.ts:480–487`, `schema/postgresql.ts:483–490`). `validation/src/app.ts:11–29` requires explicit nullable description/ping; P returns `{ appId, ...insertValues }` (`runtime-app/statements.ts:17–22`). Thus parse the **actual fulfilled result** with the unchanged output intersection and return parsed data: no fake fill/default, cast, weakening or readback despite the wider optional insert-shaped result type.

**Small error-mapping amendment:** an explicit output parse failure must be classified as an internal handler/output fault, not thrown naked as a `ZodError`. Existing `errors.ts:38–43` maps naked Zod errors to input `BAD_REQUEST`; use a sanitized internal output failure while retaining its actual diagnostic privately. Physical fulfillment remains recorded first. A genuine producer/output incompatibility holds this leaf for explicitly allocated repair.

Board originals (`board-mutations.ts:1242–1317`) retain their exact replacement input and actual void result, protected/demo descriptors, detached principalId/permission mapping and literal replace-user/replace-group kind. Do not instantiate the held family or execute its preauthorization/generic DML. Known Board NOT_FOUND remains masked `NOT_FOUND`/"Board not found"; BAD_REQUEST/PRECONDITION_FAILED retain codes. App's known permission error remains `FORBIDDEN`/"Permission denied"; unknown/native/precondition errors are sanitized internal faults, without SQL detail or duplicate/FK suppression.

## Freeze handoff and remaining holds

The final source handoff needs only the exact five paths, coordinator leaf publication, required import/constructor dependencies, original AW signal/lease flow, final-context WeakMap/single-use policy, pre-sanitization physical records, actual App output parse, separate fault records and acyclic drain order. Existing manifests already contain relevant libraries/packages; no new dependencies, tests, comments or casts. Coordinator checks are subsequent work, not performed or authorized by this oracle.

No unresolved P0–P3 source-design blocker requires broad research once these bounded amendments/gates are observed. K whole-target/schema authentication, D native file/existing/restart/restore provenance, Auth HTTP publication/cookies, all-enabled writer closure, PostgreSQL writes, private UI/SSR/normal startup and runtime activation remain held. Generic COMMIT and generic plain credential DELETE gain no authority. Required upstream prerequisites may remain unavailable while this source-only unmounted producer lands; they stay required, never fabricated.
