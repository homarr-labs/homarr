# AW Lease 2 — complete five-source freeze

Both source stages are now frozen for independent review. This completes the allocated five-source implementation, not compiler/runtime/procedure acceptance, physical native proof, enrollment or product readiness. Stage-1 handoff `convergence-AW2-foundations.md` is preserved unchanged. No commands, checks, tests, builds, import execution, native/SQL/data execution, environment/secrets, network research or nested agents were used. No dependencies, tests, comments, casts, suppressions or public credential/native/SQL seams were added.

## Exact source allocation and stage-2 delta

The complete allocation is:

1. `apps/backend/src/server/runtime-composition/contracts.ts`
2. `apps/backend/src/server/runtime-composition/auth.ts`
3. `apps/backend/src/server/runtime-composition/native-main-persistence.ts`
4. `packages/api/src/nitro/assembly/fixed-writes.ts`
5. NEW `apps/backend/src/server/runtime-composition/fixed-write-rpc.ts`

Stage 2 changes only contracts, native MAIN and the new adapter. Auth's frozen binding/dispatch foundations and the API factory remain unchanged. Ordinary reads confirmed the coordinator-published exact export `./nitro/assembly/fixed-writes` → `./src/nitro/assembly/fixed-writes.ts`; this writer did not edit a manifest. API resources remain `Parameters<typeof createFixedWriteAssembly>[1]`, and only the factory is exported from that API file.

`runtime.ts`/`assembly.ts` enrollment, AH/application/public transport, startup/host, shared middleware/context/errors, old App/Board routers, Auth's six AW files, DB/facades, K/D, frontend and tests were not edited. BK/PACK3 independent source ACCEPT is a supplied premise, not revalidation here.

## Required constructor and import direction

MAIN now returns the real `createFixedWriteRpc(input: FixedWriteRpcConstructionInput): readonly FetchContribution[]`. It requires current MAIN, the already retained exact issuer/runtime/Auth resources, the actual successfully fulfilled Auth-construction resource result, SQLite ownership and absence of started Auth cleanup. Missing, pending or failed prerequisites reject; nothing creates a second issuer/runtime or fabricates readiness. Captured owner-reference/lifetime checks remain in the actual request/setup construction closures.

Runtime direction is MAIN → local adapter → published API factory and existing AH helpers. The adapter never imports or constructs the MAIN owner. Required Backend-private contracts are explicit, and fixed input/results still derive from AW's type-only function imports. There is no whole-MAIN ReturnType inference cycle or synthesized admission DTO.

The sole minimal stage-2 resource amendment is required private `runRequestAsync(handle: () => Promise<Response>): Promise<Response>`. MAIN implements it through its existing separate fixed-task registration, classified as request work. This tracks the **actual finite route promise**, including preparation, post-scope currentness and failure cancellation, before deferred invocation. It prevents MAIN cleanup from racing cancellation after a native setup-scope cleanup failure. It is not a SQL callback, native settlement channel, public host option, publication receipt or future-disposal obligation. Private `runSetupScopeAsync(signal, handle)` still supplies only the genuine captured runtime's ordinary setup admission.

## Three exact adapters and final-context join

The adapter returns exactly three phase-`rpc`, non-descendant, protected `action: "write"` routes under the captured `/rpc` base, including an existing host base-path prefix when supplied:

- `/app/create` → `app.create`
- `/board/saveUserBoardPermissions` → `board.saveUserBoardPermissions`
- `/board/saveGroupBoardPermissions` → `board.saveGroupBoardPermissions`

Each accepts POST only; other methods return 405 with `Allow: POST`. Origin, canonical path/base, positive finite budgets and required ID source are checked. Request reuse is rejected before another preparation/handler. No route is classified as a read, wildcard or descendant fallback.

Each request prepares once through unchanged AH, retaining its real lease/current user/deadline/timer/joined signal and **single original publication guard**. Within MAIN's genuine setup scope, `createSetupBackedContext` receives the original Request, actual preparation principal/signal, captured demo/origin, real database/schema, existing `eq` and issuer clock. Auth binds the actual returned frozen context before any RPC handler. Its original outer Principal/quartet and final-context WeakMaps remain distinct, with one association binding, one handler and at most one selected-leaf dispatch. Original current profile/provider/complete expanded permissions and preparation bounds are checked. The copied native principal is not substituted for outer authority.

The request-local factory receives the real binding closures directly. Its complete contribution is validated for exact revision/ID/three unique leaves, explicit routes without lazy nodes, mutation/demo descriptors and original App permission/Board protected access. Only the finite bounded Request reaches `RPCHandler`; its pathname must match the selected literal leaf. Matched output is captured immediately before any post-handler check, so later failure still owns and cancels it.

## Physical acknowledgment, diagnostics and finite settlement

Frozen MAIN/Auth dispatch continues to pass the **original association lease and operation, including original operation.signal**, to AW through the same retained issuer. MAIN and Auth prepublish completion/retained entries before invocation, store actual underlying promises and record actual fulfillment/value/original rejection or real `TransactionCommitAmbiguousError` before settling the forwarded result. Dispatch is never forwarded through `registerOperation`, guarded/read `runAsync`, `trackRead` or `runActiveRequest`. Removing pending entries does not erase settlement. Forwarding is not proof of native invocation/COMMIT, and ordinary rejection is not independent rollback evidence.

The unchanged factory preserves original schemas, demo/auth/permission admission, exact App metadata, six fields, one generated ID and unchanged output intersection. It parses the actual native result without defaults/readback. Its explicit output-parse Error privately retains the actual Zod diagnostic as cause; it cannot be misclassified as naked input Zod BAD_REQUEST. Known Board codes and App permission behavior remain sanitized originals; unknown/native/precondition failures remain internal.

The adapter supplies a real private `reportError` callback on the genuine context. It retains each actual oRPC-sanitized handler diagnostic and its original cause, including that output-parse cause. It checks reported faults both before and after finite response consumption, covering diagnostics arising during serialization. Diagnostic faults withhold output and cancel it; raw diagnostics/SQL never enter the returned failure payload. Route failure emits only a sanitized internal message. Physical acknowledgment in MAIN/Auth remains unchanged.

Private adapter records distinguish registered/not-invoked/pending/fulfilled/rejected transport scope, handler and finite-output tasks, retained diagnostics, first primary fault, independent fence fault, actual cancellation tasks and cleanup failures. Actual underlying task outcomes are recorded before forwarded transport completion. Failure discriminants and array membership preserve falsy thrown values; no truthiness test turns them into success. Uninvoked task completions are explicitly settled on failure rather than left dangling.

The real matched body is read only through unchanged `readFiniteRpcResponseAsync`; its actual reader, pending reads, cancellation and closed obligations settle before it returns/rejects. On failure the adapter prepublishes and awaits actual cancellation of owned matched/finite bodies, retains cancellation failures independently and reuses retained cancellation tasks rather than launching duplicate cancellation. Callback/finite-reader cancellation occurs before binding/active setup scope exits. Post-scope cleanup/currentness failure additionally cancels finite output while MAIN's actual request obligation is still active. No detached abort race stands in for physical settlement.

Native fulfillment is acknowledged privately even when output parsing, serialization, scope cleanup, currentness or later publication fails. No retry, ID regeneration, rollback claim, fabricated client receipt or ambiguity inferred from HTTP/body loss is introduced. Actual native ambiguity stays nonretryable and quarantine is not cleared.

## Acyclic drain and publication fences

MAIN closes admission/aborts its lifetime first, then drains registered request/setup/fixed work and existing producer obligations. Request work includes handler/finite-read/cancellation and final pre-return checks; Auth cleanup follows, then issuer/helper/native cleanup. Native physical records and primary/cleanup fault records remain separate.

Auth release closes binding/dispatch admission first, drains actual handler/write/read obligations, then releases the original lease and retires bindings. `runHandlerAsync` finishes after the finite handler/reader/cancellation task and its actual write completion, not future outer response consumption or request disposal. Neither the handler, setup nor request task awaits MAIN close, association release, an onDispose completion or outer-body termination. Binding retirement remains on original `outerContext.onDispose`; route return does not retire the binding.

The route rechecks actual preparation currentness before returning its finite Response. Publication state records only withheld or **delegated to the original outer guard**, never delivery/receipt success. The unchanged application retains and executes AH's original guard before header finalization/return and every owned body pull, with its original timer, context/lease currentness, cancellation and disposal. The adapter observes actual joined-signal abort faults without replacing that guard or adding another one; its observer is retired by original outer disposal. Outer body consumption/cancellation and resulting lease cleanup remain owned by the existing application, after the finite route task can return.

## Remaining holds and review boundary

The five sources are ready for independent source review and subsequent coordinator-authorized focused validation. No validation result is claimed here. All three adapters are callable **unmounted** producers; `runtime.ts`/`assembly.ts` remain reserved for explicit enrollment.

K physical source remains **WITHHELD**; actual native Schema metadata experiment controls are being prepared independently and are not evidence supplied by this writer. Whole-target/schema authentication, D fresh-file/existing/restart/restore provenance, Auth HTTP success/cookies, all-enabled writer closure, PostgreSQL writes, private SSR/UI, normal startup and activation remain held. Generic COMMIT and generic plain credential DELETE gain no authority. Required upstream provenance/credential/physical producer prerequisites remain real and required, never replaced by this source freeze.
