# Convergence C1 — fixed credential readers and internal adoption statements

Frozen source scope: only new `packages/db/runtime-auth-credential/validation.ts`, new `packages/db/runtime-auth-credential/statements.ts`, and this new report. `contracts.ts` and C0 are unchanged/read-only. BP-approved ordinary-source implementation only; no activation, commands, checks, tests, native/SQL/data execution, migrations, manifest, schema, runtime, session, facade, credentials or sealed-evidence changes.

## Board/App frozen reader handoff

`statements.ts` now implements exactly the three C0 exports:

```ts
nativeCredentialPolicyStatements: NativeCredentialPolicyStatements;
readNativeCredentialPolicySync: ReadNativeCredentialPolicySync;
readNativeCredentialPolicyAsync: ReadNativeCredentialPolicyAsync;
```

The generator yields one fixed coherent joined SQL observation. Sync execution uses the existing scoped `HomarrDatabase.all<unknown>` generator loop; async execution uses the existing scoped `HomarrDatabasePostgresql.execute(...).rows` loop. Neither opens a database/transaction, manages COMMIT, returns a scoped handle, accepts caller permissions, or returns an authorizing receipt. Board/App must invoke it inside their genuine fixed native transaction and preserve their own resource authorization/masking rules.

The joined read includes the singleton's ready phase, namespace/head TEXT/storage type and total domain-row count; exact original credential locator/hash/expiry; both evidence TEXT/storage types; existing actor/user/provider; one materialized SQL clock; complete bounded memberships, actual group parents, and group-permission rows. Missing singleton/actor/credential, nonready/mismatched domain or evidence, invalid representation/storage, orphan membership, unknown grant, inconsistent repeated fields, expired session, invalid captured deadline, skew, or overflow throws `AuthCredentialPreconditionError`. Missing additive schema raises the actual SQL failure; there is no old-schema fallback or manufactured policy.

No captured-head equality is introduced. Current head is only a validated upper bound for `lifetime <= write <= head`. Key evidence retains exact stored verified hash; bcrypt is still outside SQL. Sessions compare exact token/user/provider/expiry and retain `hostDeadlineAt`; PostgreSQL additionally compares the original timestamp against the captured millisecond timestamp directly, so lossy millisecond conversion alone cannot conceal extra expiry precision. PostgreSQL SQL clocks are floored to integer milliseconds before safe-number validation. Configured clock and wall clock must both agree with the SQL observation within captured skew; checks repeat before returning policy. The native dispatcher must still clamp its bounded operation deadline before constructing its gate.

Left joins preserve empty memberships and memberships with no grants. The `maximumSnapshotRows + 1` overflow row causes rejection, never partial membership/grant authorization. Existing `groupPermissionKeys` validates raw grants; existing `getPermissionsWithChildren` expands them. Output contains only frozen detached `userId`, sorted complete frozen group IDs, and sorted deduplicated expanded frozen permission keys.

## Exact SQL names for D/K

| Object             | Required fixed names / representation                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Auth singleton     | `homarr_auth_credential_domain`: `id = 1`, `namespace`, `head_sequence`, `phase` (`initializing` / `ready`)        |
| Existing `session` | additive `auth_lifetime_sequence`, `auth_write_sequence`; original `session_token`, `user_id`, `expires` unchanged |
| Existing `apiKey`  | additive `auth_lifetime_sequence`, `auth_write_sequence`; original `id`, `api_key`, `user_id` unchanged            |
| Original authority | `user.id/provider`, `groupMember.user_id/group_id`, `group.id`, `groupPermission.group_id/permission`              |

No schema exists by implication of these fixed SQL names. D must add exactly the approved durable storage/constraints and compatible producer protocols; K must authenticate the separately accepted additive target while preserving original runtime anchors. No migration filename, tag, ID, count, snapshot or fingerprint was allocated here.

`head_sequence` stores SQLite INTEGER / PostgreSQL BIGINT; credential evidence uses the same engine storage types, with both fields NULL only before enrollment. Every sequence read is CAST AS TEXT. SQLite `typeof` must be `integer` for assigned values and `null` for unenrolled fields; PostgreSQL `pg_typeof` must be `bigint`, including NULL fields. Validation uses exact canonical decimal text, at most19 digits, checked signed64 BigInt and a round-trip equality check rejecting terminal whitespace as well as signs, leading zeros and exponents. Head accepts zero; admitted lifetime/write do not. Binds validate canonical TEXT then CAST AS INTEGER/BIGINT. Namespace must be a canonical lowercase UUIDv4. No sequence passes through a JS-number mapping.

## Internal D-only generator handoff

These are private statement composers in the DB source leaf, not package/facade exports, runtime methods, request endpoints, maintenance permits, provenance attestations, or settled receipts:

```ts
allocateAuthCredentialSequenceStatements(
  engine: "sqlite" | "postgresql",
  namespace: string,
): Generator<SQL, AuthCredentialDomain, readonly unknown[]>;

initializeAuthCredentialDomainStatements(
  engine: "sqlite" | "postgresql",
): Generator<SQL, AuthCredentialAdoptionResult, readonly unknown[]>;

authCredentialAdoptionStatements(
  engine: "sqlite" | "postgresql",
  namespace: string,
  maximumBatchRows: number,
): Generator<SQL, AuthCredentialAdoptionResult, readonly unknown[]>;
```

- Allocation rereads/locks the existing ready singleton (PostgreSQL `FOR UPDATE`), verifies exact namespace, checked-increments its head and one-row CASes ID/namespace/phase/exact old head. The returned domain's new `headSequence` is the one internally allocated value for D's same-transaction original credential DML. It cannot be exposed as a settled result before native settlement. Required allocation fails at signed64 maximum before credential DML; read-only/nonallocating policy operations are not turned into global logout at exhaustion.
- Explicit initialization generates its namespace internally with existing `node:crypto.randomUUID`, inserts exactly ID1/initializing/head0, validates the returned row, then rereads the exact singleton. There is no conflict-replace, existing-state reset, mode/provenance boolean, guessed namespace input, or missing-domain initialization path in ordinary reads/allocation/adoption.
- Adoption requires the existing initializing namespace and native singleton lock. Before any enrollment, it walks **all** original sessions then keys using deterministic binary/C-collated keyset pages, each bounded by `maximumBatchRows + 1`. It validates exact original locators, owner/FK/provider, key hash/session expiry storage/witness and both evidence fields. It retains only the first bounded NULL-pair candidate set; every later row is still visited/validated. Partial pairs, out-of-range/storage-malformed assignments and assignments above head reject rather than get repaired or reassigned.
- A fixed cross-family union of lifetime allocations and distinct write allocations rejects any shared allocated value across rows/families. Equal lifetime/write on the same credential is counted once. The `GROUP BY ... HAVING COUNT(*) > 1 LIMIT 1` query is an exhaustive existential duplicate check, not a truncated validation sample.
- Enrollment checked-increments/CASes the singleton and updates only each candidate's two evidence fields in the same native unit. Its full precondition includes exact original locator/user/hash or exact stored-expiry TEXT, actual provider binding, both fields still NULL, and the initializing namespace/new head. One returned row and exact newly assigned values are required. Sessions precede keys; no original token/hash/expiry/ID/user/account/profile/grant/FK value is rewritten.
- If a bounded batch is enrolled, the result remains `initializing` with that batch's `enrolledRows`; no admission is reopened. A subsequent invocation again performs complete validation. Only a fully validated scan with no unenrolled pair can one-row CAS phase to ready using exact namespace/initializing/head. Validation, enrollment and finalization decisions are generator-local, never a caller-supplied completion boolean/cursor or independent public step endpoint.

## Required owner joins and remaining holds

The SQL composers **cannot establish first-adoption provenance or exclusive maintenance from a namespace/string/database handle**. D must call explicit initialization only after its genuine verified fresh/first-adoption decision; absent metadata after prior activation remains loss, not permission to initialize. Initializing resume likewise requires D's retained authoritative adoption owner. This source does not invent such an owner or claim the current generic maintenance callback supplies one.

D must retain one actual runtime-owned workflow, close admission and drain incompatible work, use the captured native handle with a distinct tracked maintenance lifetime and native bounded operation, publish task identity before abort/reentry, suppress credential SQL logging, and abort/drain underlying work on close/quarantine. Internal initialization, each enrolled batch, and complete validation/finalization must execute in that owner's fixed native units. Complete validation is bounded in application memory and per query page, not by an artificial total-row cap; D's real finite native deadline/settlement machinery remains mandatory. Failure must roll back the current unit; previously committed assignments/head remain preserved. Ambiguous COMMIT is nonretryable and must never be interpreted as rollback/reallocation permission.

SQLite immediate transaction serialization is the first target. The async reader/composers do not clear PostgreSQL's unresolved fixed preamble/isolation/order and complete membership/global-grant/empty-set/Board-parent writer protection. In particular, D must acquire the singleton before original Auth table/user locks for credential writes. Schema/whole-target authentication, session evidence create/retain/renew/revoke, compatible writer closure, owned Auth dispatch, genuine host association, physical drain, and restore reconciliation remain required unimplemented joins outside C1. Phase ready alone does not activate anything.

Ordinary source review used only frozen contracts/reports, current manifests, real scoped generator execution precedents, original SQLite/PostgreSQL column names and existing definitions/provider/permission types. No compiler, lint, runtime, database or procedure acceptance is asserted. Coordinator owns focused checks after reached writers freeze.
