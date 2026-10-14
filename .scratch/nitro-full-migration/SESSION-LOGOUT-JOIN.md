# Bounded production logout join — Oracle allocation plan

## Decision and scope

Recommend a **private reader-owned factory in `sql-authority/authority.ts`**, constructing the real fixed SQL producer once on the same admitted runtime as the reader. Its private logout method owns the original lease association, exactly one native `revokeAsync` dispatch, completion/ambiguity recording, matching local lease invalidation and awaited drain. It never accepts a revoked result from its caller and never calls the old reader DELETE after producer DELETE.

This is a planning return, **not source approval, native execution approval, working authentication, response publication or mounting approval**. Publication remains fail-closed. The four concrete lane27 J2 sources belong to independent review `ses_ed44d84ceffe6lU80Id3HTVcWf`; no implementation body in those four files was read or reaudited here. Their establishment/renewal bodies are not reopened by this plan.

Only this new Markdown file was written. Its destination was absent on directory inspection, explicit read and final exact glob. A collision must stop work, not overwrite an existing plan. No commands, source evaluation, lint, typecheck, tests, new test files, native SQL, providers, browser, builds, installs, credentials, current application data, Git operations or child sessions were used.

## Observed facts, not hypothetical capabilities

Read-only source consumption:

- `packages/auth/nitro/sql-authority/{contracts,authority,lifetime,snapshots,index}.ts`.
- `packages/db/runtime-auth-session.ts`, `runtime-auth-session/{contracts,statements}.ts`, `runtime-authority/locks.ts`.
- Actual `packages/auth/package.json` and `packages/db/package.json` export/dependency declarations.
- Lane26 accepted handoff/review and lane27 handoff, principally `playable-27.md:13-45`. No independent lane27 review conclusion is assumed.

Concrete constraints:

1. Lane27 records logout rejection **before admission/native dispatch** (`playable-27.md:36`). Its private SQL owner already constructs one reader, producer and bounded repository on the same supplied runtime. Its real lease stays associated until native settlement and cleanup; it must not be released to avoid the join.
2. `createSqlAuthorityReader` retains genuine leases in a closure-local WeakMap and active Set (`authority.ts:57-58,143-145`). Private `OwnedReadLease` contains the credential snapshot, admitted deadline and lifetime owner. The public lease is not a credential witness exporter.
3. Existing `revokeCredentialAsync` (`authority.ts:210-249`) executes its **own** SQL DELETE, then invalidates exact matching witnesses. On native `TransactionCommitAmbiguousError` it invalidates and throws `REVOCATION_COMMIT_AMBIGUOUS`. It returns `revoked` only for count one and `not-current` for count zero. API-key revocation is unsupported. It is not a post-producer cleanup interface.
4. Matching invalidation currently calls each matching lease resource's `closeAsync` and awaits `Promise.all` (`148-157`); it does not itself delete the lease registrations. `releaseAsync` closes/drains and removes those registrations (`137-141`). Both functions belong to the same reader closure.
5. `createAuthorityLifetime.runAsync` registers work before its deferred execution, removes it in a finally, and `closeAsync` aborts then awaits the captured pending promises (`lifetime.ts:21-35`). Calling and awaiting a lease's close **from work still tracked by that same lease** would self-drain/deadlock. Calling reader close from its own tracked logout would likewise cycle.
6. Genuine exported DB factory: `createAuthSessionSqlRuntime(runtime: PersistenceRuntime, input: AuthSessionSqlConfiguration)` (`runtime-auth-session.ts:22`). Its `revokeAsync(operation, mutation)` dispatches `runtime.authSessionMutationAsync`, tracks its actual promise, and closes only its producer lifetime; it does not open/close a pool or replace the runtime.
7. Its fixed revoke (`statements.ts:161-315`) requires exact source user, optional account and session witnesses, bounded real group/membership/permission facts and native clock checks. It selects exactly one matching session and requires exactly one DELETE RETURNING row (`297-307`). **Zero rows throw `AuthSessionSqlPreconditionError`; there is no successful zero-row producer result.** Result creation inside SQL is not externally confirmed until the accepted native wrapper has returned after COMMIT/cleanup, as documented by lane26's accepted review. No native transaction/gate code was reaudited here.
8. DB's existing public export `./runtime-auth-session` is present. Auth already declares DB and definitions; DB already declares definitions, Drizzle and pg. Auth has no public sql-authority or production-sessions manifest entry. The existing private reader index exports only the old reader/interface, not a joined factory.

## Chosen seam and concrete proposed private interface

Add one private named export to existing `authority.ts`, provisionally `createSqlSessionAuthorityOwner`. This is a **proposed name**, not an existing capability. Its construction inputs are:

- A configuration whose `runtime` is the actual full `PersistenceRuntime`, not merely the old `SqlAuthorityRuntime` Pick; other reader fields remain the actual `SqlAuthorityConfiguration` fields.
- The actual `AuthSessionSqlConfiguration` described below, pinned once.

The implementation captures that one runtime object, constructs `createAuthSessionSqlRuntime(runtime, pinnedSqlConfiguration)` internally, and builds the existing reader using the same closure-owned lease registries. Share the implementation with `createSqlAuthorityReader`; do not instantiate a second reader or introduce a global authenticity registry. Do not accept an injected producer, SQL callback, success callback, arbitrary native result, provenance helper or configurable revoke strategy.

Proposed private returned interface:

- `reader`: the same genuine `SqlAuthorityReader` used for original admission.
- `producer`: a narrow projection of the **internally constructed genuine producer's** existing `establishAsync` and `renewAsync` methods. Preserve their actual method references and parameter/result types. Do not expose `revokeAsync` or a separately callable producer close through this projection.
- `revokeOwnedSessionAsync(lease: SqlAuthorityReadLease, operation: SqlAuthorityOperation, mutation: Extract<AuthSessionMutation, { kind: "revoke" }>)`: a private operation owning association, dispatch and drain. The mutation is an input plan, never completion evidence. It is accepted only from lane27's private proposal conversion, not RPC or transport DTOs.
- `closeAsync()`: joined reader/producer close that stops admission and awaits both actual owned lifetimes without closing the shared runtime.

The private logout result is an honest held-disposition union, not `AuthSessionSqlResult` supplied by a caller. It needs confirmed commit, confirmed commit with settlement/association failure, commit ambiguous, failure without confirmed commit and held without dispatch. Retain exact native evidence privately. Reuse lane27's recorded outcome vocabulary at the eventual consumer; any new private names/signature must be independently source-reviewed before adoption. No new public contract, capability, Principal or transport field is required.

Two alternatives are rejected:

- A completion-to-invalidation method accepting `AuthSessionSqlResult` is forgeable; structural typing or `readonly` does not establish call origin, runtime identity or COMMIT.
- Calling old reader revoke first or after the fixed producer either bypasses the chosen fixed native foundation or performs a second DELETE. Neither is a join. Passing a caller-owned producer into the reader also loses concrete factory provenance without buying useful leverage.

## Exact private operation binding and ordering

### 1. Prepare and claim, before the first suspension

After lane27 review has returned, its owner may prepare logout only through its existing origin/session-CSRF/request ownership gates, then retain the original actual reader lease and genuine repository-selected source facts. No caller boolean marks those gates passed.

At private dispatch entry, check joined owner/reader open state, operation signal and finite deadline, lookup of the exact lease in this reader's WeakMap, opaque-session type and the owned lease's current lifetime. Clamp the operation deadline to the original admitted deadline and witness host deadline, as the old reader does. An object with equivalent fields from another reader does not pass this lookup.

Capture a private one-shot claim **synchronously before any await or reentrant dispatch**. It binds:

- The actual lease object and its `OwnedReadLease`, this factory and this runtime object.
- Original reader credential witness, source user witness, optional genuine account witness, selected exact session witness and original policy identity.
- The privately associated prepared operation/scope through lane27's existing proposal ownership, plus effective signal/deadline/lifetimes.
- State transitions for claim, native dispatch, native settlement/evidence, matching invalidation and actual drain. No public caller can mark those transitions.

The original reader witness has `token`, `userId`, `provider`, `expiresAt`, `hostDeadlineAt`. Native input must use the genuine selected `AuthSessionWitness.sessionToken/userId/expires` and full `AuthUserWitness` below. Require token/user/expiry equality, source user ID/provider equality, and the private proposal's already-established reader identity association. Do not synthesize a full source user from `{ id, provider }`. Snapshot/capture mutable Dates/plans privately before deferred work; producer's genuine validation/structured clone remains in force.

Reject duplicate/overlapping claims, released/foreign leases and closure/reentrant calls before SQL. A claimed preparation cannot be retried or repersisted after failure/ambiguity. Lease release or owner close during an admitted operation aborts owned work; it does not erase an already-observed native commit or turn its evidence into rollback.

### 2. Fence local admissions and revocations

A one-time snapshot of `activeLeases` is insufficient: an admission read can start before DELETE and create its stale lease after invalidation. Keep a **reader-private token-scoped in-flight admission/fence ledger**, not another reader/cache/global capability:

- Register each opaque admission synchronously before its first read/await and remove it only on actual settlement.
- At claim, fence the original token and mark already-started matching admissions as unable to publish a lease. Admissions starting during that fence fail closed before SQL. Already-started admissions check the private invalidated record again after the read and immediately before `createLease`, with no suspension between that check and registration.
- Both old reader revocation and the new private revoke path must respect the same exclusive token revocation claim, so they cannot issue concurrent duplicate mutations for the same credential. Preserve the old method's own DELETE/count behavior outside overlapping claims; it is still not a certified participating production writer.
- Keep the fence until the marked admission promises and matching lease drain have settled. Once it is removed, only a new genuine DB read may admit a credential. Do not use a permanent token tombstone as a claim of cross-process revocation, ABA detection or SQL currentness.

Use bounded ownership: records exist only for tracked admissions/claims and are removed after settlement. An operation whose SQL/admission work never settles remains pending, not forcibly disposed. An abort listener or scalar clock callback may reenter synchronously; the claim/closing gate must already be recorded and such reentry must not start another dispatch. No callbacks are accepted for cleanup or authentication success.

### 3. Pre-dispatch currentness, exactly one native call

Await the actual original lease's `assertCurrentAsync` with the clamped operation. It compares `sameCredentialWitness` **and** `sameIdentity` against a genuine read on this runtime. Finish that lease-tracked currentness task before proceeding; a failed comparison is held without native dispatch.

Recheck claim/lifetime/open/deadline immediately before invocation. Invoke only the internally constructed producer's real `revokeAsync` once, with the bounded transaction operation carrying request signal, combined reader/lease/owner lifetimes and clamped deadline, and the captured discriminated native mutation. Record dispatch before entering native code and retain its exact promise. No SQL callback, compensation mutation, retry, second runtime or pool is introduced.

Track the native promise under the original lease's resource and the outer orchestration under the reader resource. **Await the lease-tracked native task until its finally/pending removal is complete before starting matching invalidation.** Do not put invalidation in that lease-tracked task. Do not await reader/owner close from the reader-tracked orchestration. Native settlement must be observed even if the request aborts meanwhile; abort is not evidence of rollback.

### 4. Record evidence before cleanup can fail

Only fulfillment of that exact native call can record confirmed commit. Validate its actual result kind `revoked`, exact token/user/expiry, actual source user ID/provider and original identity association. Compare actual returned group IDs and **expanded known** permission keys with the original reader identity using the existing definitions expansion semantics; raw native permission rows are not already expanded policy grants. Unknown permission keys or unrepresentable result facts hold, not cast or coerce.

A pre-read/currentness check does not lock grants through native COMMIT. A native grant/profile mismatch after a confirmed revoke must remain **confirmed commit with settlement/association failure**, not rollback, not revoked publication. The fixed producer has no original-grant-witness CAS parameter. Do not add one here or turn the unsupported reader COMMIT capability into supported. Reconcile/reprepare any eventual logout response only under separately approved publication work; private response facts may differ from native facts.

Native `TransactionCommitAmbiguousError` from this concrete call records ambiguity before any drain. Do not flatten it into ordinary unavailability or let a later release failure hide it. Other native failures have no confirmed-commit evidence; report that fact, not an unverified no-write/rollback claim. In particular, native `AuthSessionSqlPreconditionError` is not exclusively a zero-row code and does not prove the session was already deleted.

### 5. Invalidate and await real matching lease drain

After **confirmed** or **ambiguous** native completion, synchronously invalidate every currently registered lease with `sameCredentialWitness(originalWitness, leaseWitness)`, irrespective of grant identity. Different sessions and API keys remain unaffected. The admission fence covers late matching lease creation while this sweep/drain runs.

Await actual matching lifetime close/drain outside the completed native lease task, then genuine `releaseAsync` registration removal. Await every affected lease and marked admission even if another cleanup has failed; do not use early-reject `Promise.all` as evidence that all work drained. Reuse the reader closure's existing lifetime/release semantics, with explicit aggregate settlement as needed. The issuer's final original-lease release remains idempotent cleanup, not association preparation.

Do not assert original lease currentness **after deletion/invalidation**: successful revoke necessarily destroys it. Do not perform a fresh authenticated-session admission to prove logout; missing readback is neither necessary evidence of this exact commit nor a substitute for it. No second DELETE or public reader revoke is part of cleanup.

A close begins by synchronously stopping new claims/admissions, aborts reader/lease and producer lifetimes, and awaits their real pending settlement. Its promise is not awaited from within a task it is draining. A drain that remains pending means pending/unavailable, not successful cleanup. Exposed SQL/provider promises still cannot certify undisclosed physical transport disposal.

## Response/disposition policy, including conditional zero rows

| Observed path                                                                           | Private disposition and local action                                             | Public response                                       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| No genuine admitted lease, expired/foreign/released association, invalid gates or claim | Held without dispatch; settle owned preparation                                  | No logout success/cookie publication                  |
| Exact native call fulfills; facts match; matching drain succeeds                        | Confirmed commit; operation consumed                                             | Still held; publication is separately blocked         |
| Exact native call fulfills but result association/grants/cleanup fail                   | Confirmed commit with settlement failure; invalidate and await all matching work | Held; never claim rollback or unrevoked state         |
| Exact native call throws recognized COMMIT ambiguity                                    | Commit ambiguous; invalidate and await all matching work; no retry               | Held; no success or rollback assertion                |
| Native precondition failure, including SELECT/DELETE zero returned rows                 | Failure without confirmed commit; consume claim and release owned request lease  | Held; never reinterpret as successful already-revoked |
| Other failure without exact native confirmation                                         | Failure without confirmed commit, retaining any independently observed ambiguity | Held; no invented failure phase/rollback              |

The old reader's count-zero `not-current` remains its own conditional-delete policy. Do not copy it into the fixed producer by constructing a `kind: "revoked"` DTO or silently changing lane26 SQL. A desired idempotent HTTP signout response for anonymous/already-deleted sessions is a **separate intentional policy decision**; it is neither required for this join nor approved here. No error/cleanup branch releases a success Response or expires a cookie in this allocation.

## Actual configuration and witness signatures; missing proof

Actual `SqlAuthorityConfiguration`: `runtime: SqlAuthorityRuntime`, `lifetime: AbortSignal`, literal `credentialSqlLogging: "disabled-by-resource-owner"`, `maximumSnapshotRows: number`, `opaqueSessions: { type: "disabled" } | { type: "approved-stored-expiry-reader"; maximumAbsoluteClockSkewMs: number }`, and analogous disabled/approved-stored-bcrypt-reader API-key configuration. `SqlAuthorityRuntime` is only `Pick<PersistenceRuntime, "engine" | "boundedTransactionSync" | "boundedTransactionAsync">`.

Actual `AuthSessionSqlConfiguration`: `lifetime: AbortSignal`, `maximumSnapshotRows: number`, `sessionMaxAgeMs: number`, `maximumAbsoluteClockSkewMs: number`, `now: () => number`. Preserve lane27's recorded identical issuer/native clock function and exact `maxAgeSeconds * 1000`, explicit bounded rows/skew/lifetime, and no default numerical approval.

Actual revoke input: `{ kind: "revoke"; user: AuthUserWitness; account?: AuthAccountWitness; session: AuthSessionWitness }`. Actual user witness: `id: string`, `name/email/image/password: string | null`, `emailVerified: Date | null`, `provider: SupportedAuthProvider`. Actual session witness: `sessionToken: string`, `userId: string`, `expires: Date`. Optional account witness contains `userId`, exact `type`, provider/account ID and all original nullable token/expiry/scope/state fields; do not invent an absent or normalized account.

Actual reader snapshot supplies only identity plus its private credential witness, **not** the full user/account witness. Lane27 records a genuine selected-session/user repository and private source-witness association; this plan does not inspect its bodies or invent a selector method name. If accepted lane27 cannot provide the genuine full user/session witness at this seam, stop and request a separately enumerated repository extension; `repository.ts` is not allocated by default.

Neither runtime structural type, factory identity, configuration literal nor matching object references establishes **resource-owner admission before reads**. The actual authenticated pre-read disabled-SQL-logging receipt/interface is missing from the observed reader configuration; do not guess a signature or fabricate one. Actual compatible storage, resource readiness, demo restrictions, clock/skew/expiry policy, source origin/session-CSRF and all-writer participation remain external admission/publication holds. Lane26's write-time logger rejection does not prove earlier credential reads were safely admitted.

## Exact future write allocation — not authority to edit now

| Sequential allocation                              | Existing source paths, exact narrow purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | New source paths |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| A: reader-owned private join                       | `packages/auth/nitro/sql-authority/authority.ts`: private genuine factory, shared original registries, same-token admission/revocation claim fence, exact native revoke orchestration, evidence and matching awaited drain/close                                                                                                                                                                                                                                                                              | None             |
| B: consume reviewed A after accepted lane27 review | `packages/auth/nitro/production-sessions/sql-persistence.ts`: replace only reader/producer construction with reviewed same-owner factory, convert private logout witnesses, invoke private revoke and retain disposition; `packages/auth/nitro/production-sessions/service.ts`: reopen only stopped logout prepare branch and its genuine association/cleanup; `packages/auth/nitro/production-sessions/persistence.ts`: only private logout claim/evidence/settlement if existing ledger cannot represent it | None             |

`persistence.ts` is an explicit contingent allocation, not a reason to refactor the existing establish/renew ledger. The B writer must state whether it is needed before editing; if not needed it stays frozen. Exact default B inventory is the two named paths. `repository.ts`, establishment/renewal algorithms and all other J2 paths stay frozen except these explicitly allocated construction/claim seams.

Keep `sql-authority/contracts.ts`, `lifetime.ts`, `snapshots.ts`, `index.ts` read-only. Put the proposed factory/private result declarations in `authority.ts`; reuse existing types/helpers. If actual implementation needs any of those four paths, a separate new source file, repository changes or a broader producer change, **stop for a revised exact allocation**, do not silently widen A/B. No DB runtime/gate/contracts/statements/locks/schema edits.

No source/config/manifest/lock/context/Principal/frontend/backend/route/shared-authority-writer edits occur in this planning task. Future A/B authorization must be separately explicit. New scratch implementation/review handoffs, if requested, likewise need explicit exact destinations and collision checks; none is implicitly allocated by this plan.

### Minimal public declarations — coordinator01 only

- **None required for this private logout join.** `@homarr/db/runtime-auth-session` already exists in the actual DB manifest; do not request/re-add it or use undeclared package subpaths.
- Consume `authority.ts` through the existing Auth-private relative source seam. Do not add the factory to `sql-authority/index.ts` or publish sql-authority/production-sessions wholesale.
- If a later approved host genuinely needs a package entrypoint, coordinator01 must allocate its exact declaration separately after review. No public private-lease/witness accessor, global capability, dependency/catalog/lock/script change is justified here.

## Consumed freeze identities and verification limits

No hashes were recomputed under the no-command/no-source-evaluation constraint. The following are **recorded accepted freeze fingerprints**, not a claim of freshly verified current bytes:

| Path                                                         | Recorded SHA-256 / provenance                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/runtime-auth-session.ts`                        | `6337eda7301d10242bb341c9d6c781212b7256a6e4377460b6c0441fe8647de6` — lane26 final table                                             |
| `packages/db/runtime-auth-session/contracts.ts`              | `97f9a30beba8e441f8fcaeee6f5e81671851b6fc27a2a549d44bad7188ff06b2` — lane26 final table                                             |
| `packages/db/runtime-auth-session/statements.ts`             | `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` — corrected independently accepted freeze                        |
| `packages/db/runtime-authority/locks.ts`                     | `d12ed57b059b7fb903d0f5933149897ff80dce8da7363c34be74ffc0bf48dc21` — lane26 final table                                             |
| `packages/auth/nitro/sql-authority/contracts.ts`             | `8993d5b7b390429361968909289dbf33b9458cf17758b501d40fc6ab07d0c742` — lane26 recorded consumption                                    |
| `packages/auth/nitro/sql-authority/snapshots.ts`             | `519805a29008374558c0e16a1d292913639d68180e76dd291956d62e958a0260` — lane26 recorded consumption                                    |
| `packages/auth/nitro/production-sessions/persistence.ts`     | `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d` — lane27 handoff only; independent review owns source acceptance |
| `packages/auth/nitro/production-sessions/service.ts`         | `64a6a9f329392cd86506fd3e3d4a7baab8995976110ae9bc0cd1af7887eea083` — same                                                           |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `277296a53b7f3240f5cdf932fcb53b204d21f366a2510103d4b546480d1a7a1b` — same                                                           |
| `packages/auth/nitro/production-sessions/repository.ts`      | `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71` — same, remains read-only                                        |

Upstream runtime/gate freeze dependencies recorded by lane26 are `565edbf507067b3ef7373689c71715d99ad6a866be9e5f05a88978f7dabdd768` and `fcc02392e17a7162396422829be513e7951ea415a539394d72b2b6754b598c88`; they were not opened or reevaluated in this bounded plan. Existing schema freeze is recorded in lane26, not reopened here.

`authority.ts`, `lifetime.ts`, `index.ts` and both **current** package manifests have no freshly verified fingerprint in this plan. Lane26's old DB manifest fingerprint predates the now-present export and must not be treated as today's manifest hash. The future authorized writer must capture/check complete current old-path/dependency fingerprints before edits, reconcile them with the accepted freezes and stop on drift. This missing verification is an execution precondition, not invented proof or an implementation blocker solved by assertion.

Observed dependency reuse: Auth's already-declared DB/definitions, DB's existing native runtime and fixed exported producer, original reader lifetimes/witness/identity comparators and existing permission expansion. No new library, pool, SQL executor or provider is needed.

## Sequential ownership and acceptance stops

1. Oracle may consider this plan while lane27 review runs; no source writer receives the four J2 files yet. Resolve the independent review's actual return, including any corrections and final new hashes, before B. This plan does not substitute for that review or evaluate its establish/renew work.
2. After explicit Oracle allocation, assign A to **one exclusive reader owner** for `authority.ts` only. Capture fingerprints first; independently review its concrete factory provenance, one-operation association, native ambiguity preservation, fence, self-drain/close/reentry behavior and all-path awaited cleanup. Freeze its actual return. No same-file concurrent writer.
3. Only after accepted lane27 and accepted A, assign B to **one exclusive issuer owner**, with its exact two-path default/three-path contingent inventory declared before edits. Preserve accepted establishment/renewal bodies, source algorithms and unconditional publication rejection. Independently review the actual logout branch/private call and source facts before accepting source consumption.
4. If a verification/native tranche is later explicitly authorized, use the actual frozen issuer/factory closure. Existing lane32 native **4 + 7 PASS does not exercise this issuer** and cannot accept this join. This planning task authorizes no checks or native tranche.

Conserve original opaque token/session schema, source user/account witness fields, parameterized fixed revoke SQL, PostgreSQL table/parent/session lock protocol, synchronous SQLite native execution, accepted COMMIT/ambiguity semantics, origin and session-CSRF algorithms, exact deadline/skew bounds, source cookie attributes and unrelated credentials. Local fencing, private one-shot dispatch and the refusal to equate zero rows with success are explicit fail-closed join policies, not claimed equivalence to an idempotent public logout endpoint.

**Stop lines:** target collision; freeze drift; unreturned/failed lane27 or A review; missing genuine full source witness; missing real admitted runtime/pre-read logging proof; unexpected native completion shape; proposal to inject completion/provenance/callbacks; requirement for a second mutation/reader/runtime; cleanup that would await itself or claim unsettled work drained; expansion beyond enumerated paths; grant/currentness mismatch presented as rollback or success; or any attempt to clear publication/COMMIT/mount holds.

All-enabled writer compatibility, validity through dispatch, physical native settlement/quarantine, native ambiguity/race/restart proof, safe diagnostics with no credential/raw-error logging, source-origin/session-CSRF review and publication/delivery/reconciliation remain unproven prerequisites. `commitAuthority` and `resourceCommit` stay unsupported. The Bun/DOM body typing stop is separate work, not silently repaired or declared passed here. **Concrete allocation recommendation: A reader-only private owned factory first; independently accepted A plus lane27 review; then B's narrow issuer logout consumption. Keep every public response held throughout.**
