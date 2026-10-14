# Convergence AW — next genuine Auth evidence and fixed-dispatch source leases

Planning freeze only. This new report is the sole write. No product edits, commands, checks, tests, import evaluation, native/SQL/data execution, credentials, provider/network calls, old sealed-evidence changes or nested agents. Read `WRITER-RULES.md`, frozen D-runtime and C1/B/P reports, K-plan, and ordinary source. C1/B/P source acceptance and AH12 read-mount acceptance are coordinator premises; D7 remains under review, and this report does not recertify its body. Nothing here activates adoption, writes, Auth HTTP success or readiness.

## Current concrete seams and blockers

- `packages/auth/nitro/sql-authority/snapshots.ts:55–152` currently selects original actor/provider/expiry/hash/membership/grants, but no domain or credential sequence evidence. Its witness comparison cannot detect delete/recreate with the same original bearer fields. This is the first producer to join, not a reason to weaken D's mandatory credential fields.
- `authority.ts` owns the original lease in `leases: WeakMap<SqlAuthorityReadLease, OwnedReadLease>`. API-key admission already does stored-hash bcrypt outside SQL, then rereads before lease issuance. Keep that protocol; an ID/header or a successful bcrypt result without the matching current row is not evidence.
- `production-sessions/sql-persistence.ts` owns `owners`, scope membership, projected request registrations and committed results. The three missing required fields are precisely `logoutMutationFor`'s `mutation.credential`, renew in `mutationFor`'s `credential`, and existing establishment's `session.credential`. Creation has no caller credential: D allocates it internally.
- `service.ts:92,644–699` retains `productionSqlIssuers: WeakMap<object, ProductionSessionSqlOwner>`. Dispatch must traverse this exact map and `owners`, not call a runtime obtained from a BackendContext or recognize an object by its `kind`.
- No `mapNativeAuthSessionSqlResult` definition/reference was found in the inspected ordinary `packages/` or `apps/` source. If that name is needed for the next bridge, implement it as a private real-result validator/copy in `sql-persistence.ts`; do not describe a nonexistent existing adapter or manufacture `credential` to satisfy its return type.
- `apps/backend/src/server/runtime-composition/auth.ts:212–225` already verifies the original outer Principal WeakMap key and exact request/requestId/signal/onDispose. AH's finite parsing/output and publication guard are accepted source premises. Preserve them; they are read/publication fences, not native write authority.
- `native-main-persistence.ts:107–135`'s `registerOperation` replaces rejection with `MAIN_PERSISTENCE_OPERATION_FAILED` and applies `assertCurrent()` after fulfillment. Neither behavior can classify fixed native mutation settlement. `authenticated-rpc.ts:260–320` also wraps handler execution in ordinary `runtime.runAsync` and performs later read-current checks. Do not put fixed writes through those read wrappers.
- `createSetupBackedContext` returns the final frozen `BackendContext` via `createBackendContext`, which copies/freeze-captures its native principal. `authenticatedProcedure` subsequently passes a principal override to `next`. Do not assume a middleware context copy is the original outer Auth Principal or a privately registered BackendContext.

## Lease 1 — exact SQL evidence, session bridge, Auth-owned fixed dispatch

Allocate only this finite source set, then freeze its exported types before Lease 2 starts:

| Path                                                         | Exclusive change                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/auth/nitro/sql-authority/contracts.ts`             | Required captured reader clock/skew configuration if used by the decoder; keep public lease/identity subject and policy shapes, and unsupported generic COMMIT.                    |
| `packages/auth/nitro/sql-authority/snapshots.ts`             | Exact native TEXT domain/pair projections, bounded coherent decoder and witness equality. Private Auth helpers only.                                                               |
| `packages/auth/nitro/sql-authority/authority.ts`             | Private lease evidence ownership, bcrypt/current-row joining, private evidence lookup for its session owner, exact revoke/result binding; hold the old generic plain-delete route. |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | Join required retain/renew/revoke credential witnesses and settled result validation; tracked issuer-owned Board/App dispatch and physical drain.                                  |
| `packages/auth/nitro/production-sessions/service.ts`         | Two fixed issuer/lease mutation entrypoints through `productionSqlIssuers`, not an evidence getter.                                                                                |
| `packages/auth/nitro/production-sessions/index.ts`           | Export only those two fixed entrypoints in addition to current exports.                                                                                                            |
| NEW `packages/db/runtime-auth-credential.ts`                 | Type-only facade below.                                                                                                                                                            |
| NEW `packages/db/runtime-board.ts`                           | Fixed input types and sanitized errors only.                                                                                                                                       |
| NEW `packages/db/runtime-app.ts`                             | Fixed input/result types and sanitized errors only.                                                                                                                                |
| `packages/db/package.json`                                   | Coordinator-only addition of exactly these three subpaths after facade/type freeze.                                                                                                |

No edits to D's seven files, C1/B/P leaves, Auth repository/staging adapter, providers, policy, lifetime implementation, API, backend, DB index, schema, migrations or catalog in this lease. If an indispensable new dependency or extra source path appears, stop for allocation rather than deep-importing another package's private leaf or silently widening scope. The existing Auth dependency on DB and definitions is present; no new dependency is proposed.

### 1. Exact evidence read, not whole-ORM projection

Retain the actual signatures `credentialSnapshotStatement(engine, selector, maximumRows)` and `decodeCredentialSnapshot(values, selector, configuration)`; expand their private result/witness types, not public read identity. The single coherent observation must explicitly project:

- Domain `CAST(d.id AS TEXT) AS domain_id`, namespace, phase, `CAST(d.head_sequence AS TEXT) AS head_sequence`, actual storage (`typeof` / `CAST(pg_typeof AS TEXT)`), and exact total domain-row count as TEXT.
- `CAST(c.auth_lifetime_sequence AS TEXT)` and `CAST(c.auth_write_sequence AS TEXT)` with their actual storage types, original credential locator/user ID, actor/provider and original hash/expiry witness.
- Original complete bounded memberships/grants, actual group-parent existence, and one materialized SQL clock. Use the existing `maximumRows + 1` overflow rejection, not partial permission sets. Preserve grant validation and `getPermissionsWithChildren` expansion.

Root the observation so domain absence/nonready/invalidity cannot be confused with a nonexistent credential. Validate the singleton first; only a genuinely absent selected credential under a valid ready domain may return anonymous/null. Missing additive schema is an actual unavailable SQL failure, not old-schema fallback. Ordinary admission never inserts, initializes, enrolls, repairs or advances anything.

Validate canonical lowercase UUIDv4 and canonical decimal TEXT with checked BigInt signed64 bounds and round-trip equality: `0 <= head`, `1 <= lifetime <= write <= head`. Reject NULL pairs at admission, partial pairs, storage mismatch, signs/leading zeros/exponents/whitespace and overflow. Head is an upper bound, not a captured equality: unrelated allocation must not invalidate otherwise unchanged credentials. Reuse C1's rules without exporting its private validator/reader/allocator; implement only the narrow Auth decoding needed here, or obtain a separately allocated private sharing seam if duplication is unacceptable.

Keep SQLite INTEGER expiry storage and PostgreSQL exact original timestamp equality, not just lossy epoch-millisecond equality. PostgreSQL observed clocks must be integral floored milliseconds. Check captured configured clock and wall clock against SQL within the actual retained skew; the SQL owner already has the authoritative `AuthSessionSqlConfiguration.now` and `maximumAbsoluteClockSkewMs`. If these are made required top-level `SqlAuthorityConfiguration` members, change its sole located ordinary construction in `createProductionSessionSqlOwner` in this same lease, snapshot them in authority construction, and require consistency with the existing opaque-session skew. Do not make required clock provenance optional or silently substitute `Date.now` for the issuer clock. Synthetic/out-of-lane callers remain coordinator-owned compatibility work, not casts.

Existing original profile and account queries already select explicit fields. Do not turn them into whole `session`/`apiKey` ORM reads, call their new custom string mapper with a native number, relax that mapper, or add sequence fields to `AdapterSession`/public DTOs. Existing `apiKeys.getAll` uses explicit safe columns; keep credential hashes/evidence out of read payloads.

### 2. Private immutable evidence and exact original lease

Extend private `CredentialWitness` with namespace/lifetime/write and narrow provider to the validated `SupportedAuthProvider`. Freeze detached witness/snapshot objects. Preserve original token/user/provider/expiry/hostDeadline and key ID/exact stored hash. `sameCredentialWitness` must compare namespace and both sequence values as well as every original binding; no captured-head equality.

At lease issuance retain a detached `NativeCredentialEvidence` inside the existing private authority lease registration, after ready-domain/current-row validation. For keys, retain it only after bcrypt matches and the second observation matches the original candidate's exact domain, pair, actor/provider, ID and stored hash. Public `SqlAuthorityReadLease` remains immutable and does not expose that evidence. Structural copies, forged identity objects, new deadlines or copied tokens cannot recover it.

The private `createSqlSessionAuthorityOwner` result may add this internal, non-barrel-exported method:

```ts
captureOwnedCredential(
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
): NativeCredentialEvidence;
```

It must resolve that owner's existing lease WeakMap, require unreleased/uninvalidated original lease/lifetime and original captured deadline, and return only frozen owned evidence internally to `sql-persistence.ts`. It is not a standalone export, public reader method, callback receipt or commit permit. The projected request path must additionally resolve `requestLeases.get(lease)` and exact identity/type/operation; the issuer preparation path must resolve `scope.lease === lease`. Neither path accepts a caller-supplied evidence object.

Use `Extract<NativeCredentialEvidence, { type: "opaque-session" }>` after a real discriminant check. Match it to every original session/user/provider/expiry witness before filling the three required D fields. Keep existing account selector/account witness checks, login identity selections, external group synchronization, everyone-existing-only effects, profile and renewal grant-consistency policies. Do not append authority fields to staged Auth.js sessions or recover evidence from a serialized proposal.

`mapNativeAuthSessionSqlResult(result: AuthSessionSqlResult): AuthSessionSqlResult`, if introduced, must preserve the result discriminator: established/renewed require the actual native `credential`, validated against result session token/user/provider/expires; revoked requires `credential === null`. Copy Dates and original profile/group/grant fields correctly, freeze detached scalar evidence, and preserve result provenance in the private committed map. No placeholder namespace/sequence/hash, fabricated surviving revoke evidence or fresh lease minted from result data. `assertFreshResult` additionally compares a genuinely re-admitted lease's privately owned evidence to the native result; a returned profile alone is not proof.

The existing generic `reader.revokeCredentialAsync` plain DELETE bypasses D's enduring allocator/CAS protocol. Do not leave it as an enabled alternate writer after the new bridge: keep generic authority unsupported and reject that unjoined path, while prepared issuer logout uses the concrete owned revoke producer with exact evidence. Preserve D's ability to revoke expired credentials inside its original witness protocol; do not claim that current live-request logout admission already supplies a separate expired-session owner. Its HTTP success stays held.

### 3. Frozen outward signatures and ownership

Add these concrete functions to `service.ts`/its existing facade; names below are proposed, not presently implemented:

```ts
dispatchProductionBoardPermissionsAsync(
  issuer: ProductionSqlSessionIssuer,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: BoardPermissionsMutation,
): Promise<void>;

dispatchProductionAppCreateAsync(
  issuer: ProductionSqlSessionIssuer,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: AppMutation,
): Promise<AppMutationResult>;
```

Resolve `productionSqlIssuers` → `owners` → that owner's exact request lease → private authority evidence. Reject issuer/lease mismatch before dispatch. Use the owner's captured runtime/configuration and original projected request operation; join original request signal, SQL-owner lifetime and lease lifetime, and clamp the deadline to all original bounds/opaque host expiry. Copy business input before scheduling. Dispatch exactly `runtime.boardPermissionsMutationAsync(nativeOperation, mutation, evidence, policyConfiguration)` or `runtime.appMutationAsync(...)`. B/P/C1 still perform actual transaction-local authorization; prior currentness or a backend permission DTO does not replace it.

Add a separate tracked `requestWrites: Set<Promise<unknown>>` to `OwnedSql`. Publish each task before deferred invocation and include it in owner close/drain. Physical native fulfillment/rejection determines settlement; retain primary and cleanup errors and propagate the actual `TransactionCommitAmbiguousError` (`retryable = false`) rather than replacing it with `IssuerStagingError`. Preserve fulfilled settlement even if a later owner/response-currentness check fails. No retry, generated-ID regeneration, result-as-authority receipt, or native callback/raw database export. Existing read wrappers can continue sanitizing reads; fixed dispatch must not reuse a wrapper that loses its native outcome.

These methods alone do not enable a route or satisfy all-enabled writer closure. `commitAuthority.type === "unsupported"` and `requireCommitAuthority(): never` remain unchanged.

### 4. Exact root facade allowlist

New public DB surfaces are only:

- `runtime-auth-credential.ts`: `export type { NativeCredentialEvidence, NativeCredentialPolicyConfiguration }` from the existing contracts leaf.
- `runtime-board.ts`: types `BoardPermissionReplacement`, `BoardPermissionsMutation`; value `BoardPermissionsMutationError`.
- `runtime-app.ts`: types `AppInsertValues`, `AppMutation`, `AppMutationResult`; values `AppMutationPreconditionError`, `AppMutationPermissionError`.
- Package export keys `./runtime-auth-credential`, `./runtime-board`, `./runtime-app`, each mapping exactly to its new root facade.

NONE of the new facades exports a reader, statement/generator, allocator, initialization/adoption function, evidence getter, raw DB/native handle, authorizing receipt or arbitrary callback. Do not add wildcard exports. Existing fixed methods stay on the actual `PersistenceRuntime`; use the established `@homarr/db/runtime` and `@homarr/db/runtime-auth-session` paths. The session credential alias can be derived from the evidence union; no D-leaf edit is needed merely to export that alias.

## Lease 2 — final backend association and three-leaf fixed source adapter

Start only after Lease 1 types/facades freeze and D review supplies an accepted physical producer dependency. These paths are disjoint from Lease 1:

| Path                                                                     | Exclusive change                                                                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/runtime-composition/auth.ts`                    | Exact outer association → request-bound fixed dispatch closures; track dispatch separately from read error wrappers and drain it on release/close. |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts` | Private physical task registration preserving fixed native outcome; existing sole runtime/issuer ownership and disposal retained.                  |
| NEW `apps/backend/src/server/runtime-composition/fixed-write-rpc.ts`     | Three exact POST adapters, final context binding, bounded parsing/output and separate publication settlement.                                      |
| `apps/backend/src/server/runtime-composition/contracts.ts`               | Required private fixed-construction/dispatch types derived from frozen Auth signatures; no secret in public host configuration.                    |
| `apps/backend/src/server/runtime-composition/runtime.ts`                 | Construct the real source adapter from the existing retained owner; no second runtime or read-wrapper dispatch.                                    |
| `apps/backend/src/server/runtime-composition/assembly.ts`                | Exact route/access/leaf validation if separately approved for enrollment; retain all read-route policies and ordering.                             |
| NEW `packages/api/src/nitro/assembly/fixed-writes.ts`                    | Concrete request-bound Board replacement/App create procedure factory, exactly three leaves.                                                       |
| `packages/api/package.json`                                              | Coordinator-only export `./nitro/assembly/fixed-writes` for that one new factory after type freeze.                                                |

No changes to `application.ts`, accepted `authenticated-rpc.ts`/`public-rpc.ts`, BackendContext/Principal public types, shared procedure middleware, existing broad App/Board router bodies, frontend, startup loader, host listener, join-slot readiness or K/D/C1/B/P bodies. A needed additional path requires a new allocation. Keep existing Board candidates held and unmounted; the narrow factory must not instantiate the whole candidate family just to select two methods.

### 1. Genuine final-context binding, without structural authority

Add a method on the real Auth request adapter that calls existing `associationFor(originalOuterContext)` and returns only request-bound fixed dispatch closures, not lease/evidence DTOs. Capture the actual lease/operation and original outer Principal/reference quartet. Before each dispatch re-resolve that original association, enforce original demo mutation rules, verify no release/close, and pass that exact lease to the frozen Auth entrypoint. Register actual pending native work before invoking it; release waits physical settlement, not abort notification.

Construct the native backend through the actual same-owner `createSetupBackedContext(input, admission, resources)` inside its admitted scope, and privately bind the **returned final context** to the outer association/lease before handing it to RPC. Its request must be the original request, its joined signal the captured signal, and its frozen native user must correspond to the actual admitted user. The mapping is host-private, not an optional field/brand that callers can add to BackendContext.

Use a per-request narrow procedure factory closing over this registered final context and the issuer-bound dispatch closures. Its operations take business input only. Thus oRPC's authenticated middleware context copy is neither an Auth WeakMap key nor an authority source; do not try to authorize the copy by shape or cast it back to the original. The handler uses ordinary middleware for demo/auth/input/output/error behavior, while its dispatch closure looks up the privately retained original association. Retire the binding only after actual handler/native settlement and owned response cleanup; do not release it immediately after yielding an HTTP Response whose body remains owned.

Proposed narrow factory resources:

```ts
interface FixedWriteAssemblyResources {
  readonly createId: () => string;
  saveBoardPermissionsAsync(mutation: BoardPermissionsMutation): Promise<void>;
  createAppAsync(mutation: AppMutation): Promise<AppMutationResult>;
}

createFixedWriteAssembly(resources: FixedWriteAssemblyResources);
```

Return the existing `defineBackendContribution` shape with literal leaves `board.saveUserBoardPermissions`, `board.saveGroupBoardPermissions`, `app.create`. Import the original `boardSavePermissionsSchema`, `appManageSchema`, and `selectAppSchema` from their existing package entrypoints. No generalized write registry or new context framework. Preserve the original descriptors: Board protected/mutation/demo-guarded; App permission `app-create`/mutation/demo-guarded, with its original output. Board maps `entityId` to `boardId` and selects only replace-user/replace-group; App generates exactly one ID after original middleware/input validation, captures the six original insert fields and empty-ping normalization, and returns the actual D/P result. Do not call the old preauthorization+generic-DML bodies or introduce duplicate/FK suppression.

The current original App output is `z.object({ appId: z.string() }).and(selectAppSchema)`. Check it against the actual fixed P result before accepting the factory: if the actual schema requires further fields, resolve the real producer/output contract under a newly allocated leaf lease. Do not cast, invent defaults or weaken the schema merely for compilation.

### 2. Native settlement is not response publication

Implement a separate private MAIN registration helper for the two fixed calls. Prepublish its tracked promise, capture actual underlying work before any reentrant close path, reject admission before native invocation when MAIN is no longer current, and forward fulfillment/rejection without post-fulfillment authority checks or error flattening. It invokes the Auth-owned entrypoints through the existing private issuer; no public caller can supply a native runtime or SQL callback. Include its tasks in existing owner disposal before native close.

Do not enclose fixed native dispatch in generic `MAIN.runAsync`/`registerOperation`, `runActiveRequest`, or a read-current wrapper. A same-owner ordinary scope may supply setup/context resources, but it must not overwrite the separately captured fixed native outcome when its own later settlement fails. Keep a private outcome discriminant: not-dispatched, pending, fulfilled, rejected, ambiguous; its source is the actual native promise/error, not currentness booleans or transport status. Once fulfilled or ambiguous, later handler/output/currentness failure cannot reset it to a replayable pre-dispatch state.

The three selected routes are exact/non-descendant/POST-only under the existing `/rpc` base, protected with action `write` and their exact source leaf identity. They do not reuse `AuthenticatedReadAccess` or masquerade as `action: "read"`. Extend only the adapter's fixed access handling for these literal leaves; outer authorization is admission, and transaction-local B/P authorization still decides the mutation.

Use AH's existing finite request/response helpers and accepted application publication guard. Preserve private outcome classification **before** oRPC's `toBackendError` can turn native errors into sanitized transport errors. Board NOT_FOUND masking and App FORBIDDEN permission behavior stay original; raw SQL/native details never enter a response. Ambiguous dispatch remains nonretryable even if transport sanitizes it. After confirmed native settlement, expired/revoked association or body-publication failure cancels/drains output and withholds further publication, but never retries the mutation or claims rollback. Database commit and client receipt are not atomic.

Do not register a second private response guard or replace the accepted outer Principal. Disposal drains native work, handler work, bounded body readers/cancellation and retained publication checks; primary/cleanup failures remain distinct internally. Abort does not prove synchronous SQLite preemption.

## Dependencies that remain real holds

1. K's additive SQL/journals/snapshots/whole-target catalog are pending. Exact new generated identities and original constraint/data preservation are required; this plan assigns no filenames, hashes, timestamps or counts. No absent singleton means ready or permission to adopt.
2. D's report implements only genuine fresh-owner adoption and retains an explicit unavailable pre-append provenance path for existing resources. Do not enable existing-resource adoption/restart/restore using caller mode, schema phase, empty singleton or a maintenance callback. Existing authenticated pre-append ownership needs its own genuine source lease.
3. Complete enabled credential/actor/provider/account/membership/global-grant/Board-parent writer closure is not supplied by these two leaves. Keep other writes and PostgreSQL activation held. A ready domain and two real producers do not clear generic COMMIT.
4. Local/LDAP/OIDC login, renewal and logout **HTTP success** are a separate later lease. Keep `IssuerPersistenceOutcome.publication: "held"`, staged responses/cookies private, and `publishPreparedIssuerOperation` throwing until full writer closure and actual owner-private publication settlement exist. A renew-not-due path returning no mutation is not new success authority or a no-op publication loophole.
5. Normal host startup/private UI/SSR/onboarding availability is separate. Do not change fresh-only startup, activate an unbacked sign-in button or mark read enrollment a working fresh-login flow. A compilable unmounted source tranche is progress, not a finished working product.

## Freeze and next coordinator validation

Lease 1 handoff must list actual facade exports, exact SQL TEXT projections, private lease provenance and required mutation/result fields, fixed signatures, tracked drain and remaining holds. Lease 2 must show the final factory-created context binding, exact three route identities and separate native/transport/publication outcomes. Neither may claim compiler or runtime acceptance without coordinator checks.

After reached writers freeze, coordinator runs focused lint/typecheck on genuine original roots and updates required out-of-lane callers explicitly; no casts/suppressions/pruned roots/default owners. Use relevant existing isolated checks only under separate authorization, with no speculative test creation or live data/providers. If a diagnostic names a missing credential/result/resource contract, resolve its authentic producer/consumer contract first. Static success cannot clear K/D provenance, physical-settlement or all-enabled-writer holds; product completion requires those joins and the separate real Auth HTTP publication tranche.
