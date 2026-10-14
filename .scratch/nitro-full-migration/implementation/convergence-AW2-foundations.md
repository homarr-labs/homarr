# AW Lease 2 — stage-1 foundations frozen

Stage 1 only of the approved atomic five-source allocation. This is a source freeze for coordinator publication, not completion of the five-source lease, compiler/runtime acceptance, enrollment or product readiness. Read the lease2 plan, its oracle amendments, AW implementation/ping/plan, WRITER-RULES and ordinary source/manifests. No commands, checks, tests, builds, import evaluation, native/SQL/data execution, environment/secrets, network research or nested agents were used. No tests, dependencies, comments, casts or suppressions were added.

## Exact stage-1 product writes

- `apps/backend/src/server/runtime-composition/contracts.ts`
- `apps/backend/src/server/runtime-composition/auth.ts`
- `apps/backend/src/server/runtime-composition/native-main-persistence.ts`
- NEW `packages/api/src/nitro/assembly/fixed-writes.ts`

NEW `apps/backend/src/server/runtime-composition/fixed-write-rpc.ts` is deliberately absent pending stage 2. MAIN does not import an absent adapter and does not yet implement or return `createFixedWriteRpc`. The required constructor interface is a staged contract, not a claim of an available constructor. `packages/api/package.json`, `runtime.ts`, `assembly.ts`, AH/application/public transport, Auth's six AW files, shared context/procedure/errors, old App/Board families, DB/facades, K/D and frontend were not changed.

## Backend producer foundations

`MainFixedWriteDispatch` derives its lease/operation/mutation arguments and Promise results directly from the two frozen AW exports, using type-only imports. Auth construction requires that dispatch; the sole MAIN production construction captures its already acquired exact issuer and passes required real closures. No optional owner, second issuer, caller evidence, native handle or permission DTO authority is introduced.

MAIN's private `fixedWork.registerFixedDispatch` uses separately prepublished fixed completion/retained records, not `registerOperation` or guarded `runAsync`. It captures AW's actual promise and records original fulfillment/value/rejection or actual `TransactionCommitAmbiguousError` before settling the forwarded completion. Removing pending tasks does not remove retained records; failed pre-forward admission remains separate from physical settlement. There is no fulfillment postcheck or rejection flattening in this channel.

The private, not-returned `fixedWork.runSetupScopeAsync` is a concrete staged mechanism for the later constructor. It prepublishes a separately classified setup obligation, captures the actual retained runtime, and calls its ordinary `runAsync` only to supply real database/schema with an active admission fence. Its callback stays active until actual handler/finite-consumption completion and is revoked in `finally`. No adapter currently calls it. MAIN closes admission/aborts its lifetime before draining initializations, existing operations and registered fixed/setup obligations; Auth, issuer and helper/native cleanup follow. Fixed settlement is not rewritten by cleanup failures.

Auth retains its original outer-Principal association and exact Request/requestId/signal/onDispose lookup. A distinct WeakMap uses the actual final frozen BackendContext as key, with a distinct copied/frozen native principal/user. Binding checks the actual preparation signal/deadline bounds, original request, captured origin/demo, original admitted user ID and current profile/provider/complete expanded permissions against both preparation and final context. Duplicate/replacement registration is rejected, with a single binding claim per association and a retained final-context registration after retirement.

Each binding exposes exactly `saveBoardPermissionsAsync`, `createAppAsync` and `runHandlerAsync`. One handler and at most one selected-leaf dispatch may be claimed. Before forwarding, Auth re-resolves the original outer association and final-context registration, checks active handler/current preparation/original mutation policy, copies detached business fields, and passes **the original `association.lease` and `association.operation`**, including its original operation signal, to MAIN. Preparation/final-context joined signals never replace the AW operation signal.

Association-owned write and handler completions are prepublished before deferred invocation. Actual forwarded fulfillment/rejection/ambiguity is retained before API error/output handling. Handler settlement drains its actual write obligation and completes after the supplied finite handler/reader/cancellation task, never after future outer-body publication, `onDispose`, association release or MAIN close. Retirement is registered on original `outerContext.onDispose`; route return does not retire the binding. Release closes association admission first, drains handlers/writes/reads, then releases the actual lease and retires bindings; cleanup faults are separate.

Auth recognizes only the literal protected write requirements `app.create`, `board.saveUserBoardPermissions` and `board.saveGroupBoardPermissions`, with original demo/auth mutation admission and App `app-create`. Existing configured read policies and read behavior are preserved. Read tracking remains only an admission/read mechanism; no fixed dispatch/result is forwarded through it. Board ownership/full access and App transaction-local permission authority remain B/P's responsibility.

## Exact factory export and resources

The new API file exports only:

```ts
createFixedWriteAssembly(finalContext: BackendContext, resources: {
  readonly createId: () => string;
  saveBoardPermissionsAsync(mutation: BoardPermissionsMutation): Promise<void>;
  createAppAsync(mutation: AppMutation): Promise<AppMutationResult>;
});
```

Its resource interface is deliberately not exported; infer with `Parameters<typeof createFixedWriteAssembly>[1]`. The contribution revision is `homarr.backend.source-port.v2`, ID `homarr.fixed-writes.source-port.v2`, and its only leaves are the exact three names above. It uses original `sourceProcedure` descriptors without authenticated context-copy middleware and requires `context === finalContext` before each business handler.

Board uses unchanged `boardSavePermissionsSchema`, detached principalId/permission mapping and actual void results for literal replace-user/replace-group. Only known Board domain codes are mapped to sanitized original NOT_FOUND/BAD_REQUEST/PRECONDITION_FAILED behavior; unknown native failures are internal. App uses unchanged `appManageSchema`, exact original OpenAPI/MCP metadata without activating any projection, and unchanged `z.object({ appId: z.string() }).and(selectAppSchema)` output. It generates one ID after admission/input validation, copies the actual six insert fields, preserves empty ping to null, parses the **actual fulfilled native result**, and returns parsed data without fill/default/readback. Explicit output parse failure is an ordinary internal Error retaining its real Zod diagnostic as private cause, not a naked ZodError that shared middleware would classify as input BAD_REQUEST. App's known permission error remains FORBIDDEN/"Permission denied"; all other producer errors are sanitized internal faults.

## Coordinator gate and stage 2

Sole coordinator must now publish exactly:

```json
"./nitro/assembly/fixed-writes": "./src/nitro/assembly/fixed-writes.ts"
```

in `packages/api/package.json`, then resume this writer for the remaining local adapter and actual MAIN constructor. Stage-2 adapter input is the required Backend-private `FixedWriteRpcResources`: construction path/baseUrl/createId/request/response budgets, retained `requests`, `assertCurrent`, and private `runSetupScopeAsync(signal, handle)` supplying `SetupReadAdmission`. Constructor return is explicit `readonly FetchContribution[]`; neither adapter nor contracts infer the whole MAIN ReturnType or import the MAIN owner at runtime.

Stage 2 must retain AH's one preparation/publication guard and finite helpers; construct the genuine final context inside this owner's private setup scope; bind before handling; validate the exact three request-local descriptors/routes; execute and cancel/drain finite output within `runHandlerAsync`; separately retain actual handler/output diagnostics, scope, publication and cleanup faults; and recheck actual preparation currentness without changing recorded physical settlement. The adapter must provide the private `reportError` observation for errors sanitized inside oRPC, including the retained output-parse diagnostic. These transport/publication joins are **not claimed complete by stage 1**. The real constructor must require already retained Auth resources/issuer and current MAIN; no placeholder or fabricated readiness is permitted.

No enrollment/source projection is enabled. K physical source remains WITHHELD pending history reconciliation; whole-target/schema authentication, D fresh-file/existing/restart/restore provenance, Auth HTTP success/cookies, all-enabled writer closure, PostgreSQL writes, private SSR/UI, normal startup and activation remain held. Generic COMMIT and generic plain credential DELETE gain no authority. Fulfillment is private physical acknowledgment, not client receipt; later output/publication loss does not become new COMMIT ambiguity or retry permission.
