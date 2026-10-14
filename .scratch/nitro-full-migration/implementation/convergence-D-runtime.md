# Convergence D — retained native credential runtime

Frozen ordinary source in exactly `packages/db/runtime.ts`, `packages/db/transaction-gate.ts`, `packages/db/runtime-auth-session.ts`, `packages/db/runtime-auth-session/contracts.ts`, `packages/db/runtime-auth-session/statements.ts`, `packages/db/schema/sqlite.ts`, and `packages/db/schema/postgresql.ts`, plus this new report. C0/C1, Board/App leaves, AH/backend, root facades/exports, catalog, migrations, journals and snapshots are unchanged. No commands, checks, tests, native/SQL/application execution, providers, credentials, data, environment, Git actions or nested agents were used. Coordinator checks and independent review remain required; nothing is mounted or activated by this source.

## Actual fixed runtime calls

The existing single `createPersistenceRuntime` retains the actual connection. New methods expose neither a native handle nor an authorization/SQL callback:

```ts
boardPermissionsMutationAsync(
  operation: BoundedTransactionOperation,
  mutation: BoardPermissionsMutation,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
): Promise<void>;

appMutationAsync(
  operation: BoundedTransactionOperation,
  mutation: AppMutation,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
): Promise<AppMutationResult>;

adoptAuthCredentialsAsync(
  operation: BoundedTransactionOperation,
  maximumBatchRows: number,
): Promise<AuthCredentialAdoptionResult>;
```

Board/App methods reject PostgreSQL and configured resource SQL logging. They capture exact evidence/configuration and original mutation normalization before SQL, clamp the absolute deadline to both captured session host deadline and expiry minus captured skew before gate construction, and call the frozen concrete B/P body inside the existing retained `boundedSqliteTransaction`. C1 rereads domain/evidence/actor/provider/complete bounded memberships/expanded grants on the identical scoped database between actual `BEGIN IMMEDIATE` and COMMIT. Original Board NOT_FOUND masking, grant families, duplicate/FK/native failures, empty replacement and App empty-ping normalization remain in the unchanged bodies. Returned unit values escape only after gate settlement; there is no error flattening or retry.

## Private adoption authority and lifetime

`CredentialAdoptionOwner` is module-private: exact retained SQLite `Connection`, distinct `AbortController`, and the last **settled** C1 domain/batch result. It is not returned, accepted from a caller, exported, constructed from a namespace, or derived from a maintenance callback.

Only genuinely fresh SQLite ownership is implemented. `openAsync` requires the existing fresh exclusive file creation (or a new in-memory native resource), verifies the created regular file was empty and retains/checks its device/inode against the opened path, then verifies the actual captured native database has no application schema before migration. The runtime retains that exact connection identity privately. Config primitives are copied/frozen on runtime creation. A caller `mode`, empty singleton, initializing row, supported ledger alone, namespace, or absent evidence cannot mint this proof. Proof is consumed into one private adoption scope, not renewed after completion.

There is **no authenticated pre-append adoption provenance producer in this scope**: the new auth migration/catalog identity has not been allocated/authenticated. Existing resources and cross-restart initializing resources therefore fail with first-adoption provenance unavailable. No guessed migration length/ID/hash or caller boolean substitutes for that missing owner. A later allocated coordinator join must authenticate the actual pre-append state before appending and privately retain its same authoritative native scope; it must not make an existing initializing row self-authorizing.

Adoption changes phase to maintenance, publishes both its distinct task identity and the ordinary maintenance drain task **before** aborting the old bounded lifetime, closes every ordinary admission, then drains all actual active work. It uses only the captured handle and its separate maintenance lifetime; it never runs under the intentionally aborted ordinary lifetime. Initialization, each C1 batch and complete validation/finalization each execute in a fixed native immediate unit using the original finite operation deadline. Admission remains closed across committed batches and microtask yields. C1 performs full original-row validation, cross-family allocation duplicate detection and bounded candidate CAS itself; D supplies no completion boolean/cursor or repaired assignments.

A definite pre-COMMIT failure leaves admission closed and retains the same private authoritative scope plus prior settled namespace/head. A new bounded invocation may explicitly resume that same scope; no failed batch is automatically retried. Already committed evidence/head remain untouched. Any ambiguous COMMIT quarantines/aborts the resource and owner and is nonretryable; initialization ambiguity is never replayed or reseeded. Close/quarantine aborts the maintenance lifetime, and close waits the prepublished task and actual active work before native connection closure. Maintenance and native close failures are preserved, including aggregation rather than silent replacement. Generic maintenance and close also publish their task before synchronous abort reentry.

SQLite is synchronous: gate checks bracket native execution and each statement, but this source does not claim hard preemption of an already running synchronous SQLite statement. Drain means its actual return/cleanup, not that an abort notification proves physical completion. No cross-process writer-closure or restore/reconciliation acceptance is claimed.

## Session evidence and allocator join

The original session witness fields remain exact `sessionToken`, `userId`, `expires`. The new internal leaf alias is:

```ts
type AuthSessionCredential = Extract<
  NativeCredentialEvidence,
  { type: "opaque-session" }
>;
```

Existing-session establishment additionally requires `mutation.session.credential`; renew/revoke additionally require `mutation.credential`. They are mandatory, not optional legacy fallback. Preparation detached-captures the mutation, configuration and original operation; validates the exact evidence token/user/provider/expiry against the original witnesses; joins the captured producer lifetime; and clamps live retain/renew deadlines before gate construction. Revocation retains the original ability to delete an expired session rather than incorrectly requiring a live read-policy lease.

`AuthSessionSqlResult` now discriminates established/renewed with a required exact `credential: AuthSessionCredential`, and revoked with `credential: null`. Revocation does not publish a fabricated surviving assignment. Existing result user/profile/session/group/permission fields remain. Retain preserves any stricter captured host deadline; renewal binds the new expiry deadline.

Private `authCredentialDomainLockStatements(engine)` and `lockAuthCredentialDomainAsync(database)` are in the owned statements leaf, not package/facade exports. They validate the actual ready singleton via canonical TEXT/storage decoding. PostgreSQL's existing generic Auth-establishment preamble now obtains this singleton lock **before** the original user/account/group/groupMember table locks and user-parent locks, while retaining its READ COMMITTED assertion and original protocol. This is not a new PostgreSQL Board/App activation.

The concrete session generator locks/rereads domain first, rechecks exact old evidence and original session expiry (including PostgreSQL timestamp equality), and retains original user/account/profile/group/grant logic. In the same native unit, C1 allocates/CASes one sequence: creation binds it to both lifetime/write, retain and renewal preserve lifetime and CAS old pair while advancing write, and revoke CAS-deletes the original pair while advancing the enduring head. Allocator exhaustion fails before credential DML; nothing is reseeded. All sequence reads are CAST AS TEXT and binds are checked canonical decimal TEXT CAST AS INTEGER/BIGINT. Existing tokens/hashes/accounts/encrypted fields are neither transformed nor logged. The original four-table reset is untouched and does not gain permission to delete/reset the enduring domain.

Auth producer pending work and disposal promises are prepublished before deferred dispatch/abort, with mutation and operation detached before scheduling and physical task drain on close. Actual SQL/native errors remain errors. `TransactionCommitAmbiguousError` retains its code and now explicitly has `retryable = false`; post-dispatch failures quarantine the native resource rather than leaving it available for replay.

## Exact schema and coordinator migration requirements

Both engine schemas add only:

| Object                          | Exact physical columns and constraints                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `homarr_auth_credential_domain` | `id` INTEGER, NOT NULL, primary key, CHECK `id = 1`; `namespace` TEXT NOT NULL UNIQUE; `head_sequence` SQLite INTEGER / PostgreSQL BIGINT NOT NULL, no default, nonnegative; `phase` TEXT NOT NULL, CHECK initializing/ready, no default |
| `session`                       | Nullable `auth_lifetime_sequence`, `auth_write_sequence`, SQLite INTEGER / PostgreSQL BIGINT, no defaults/generated assignments                                                                                                          |
| `apiKey`                        | Same nullable pair; original `id`, `api_key`, `user_id` and FK retained                                                                                                                                                                  |

Check names: `homarr_auth_credential_domain_singleton`, `homarr_auth_credential_domain_head`, `homarr_auth_credential_domain_phase`, `session_auth_evidence`, `apiKey_auth_evidence`. Evidence is either both NULL or both assigned, positive lifetime and write >= lifetime; SQLite additionally requires actual INTEGER storage for both and for head. PostgreSQL types provide exact signed64 storage. Head is enduring across credential deletes/reset and is never derived from live row count. C1 canonical UUIDv4 namespace and signed64/head bounds are still required native validation, not implied by a favorable row phase.

Schema sequence columns use an exact string custom mapping with C1 checked BigInt canonical validation; no number mapper or assignment default exists. New native reads always explicitly CAST AS TEXT. An implicit SQLite ORM projection of assigned sequence columns supplies a native number and is deliberately rejected by this mapping, not silently accepted after precision loss. Existing AH/session readers must obtain exact TEXT evidence in their later allocated owner join; do not fix that by relaxing the mapper or changing AH in this lease.

Coordinator must append/authenticate an additive migration for these exact objects/types/checks while preserving **all** original columns, PK/FK/index/collation/data and the existing runtime-state/history anchors. Existing evidence starts as the NULL pair; migration must not assign/reseed evidence or auto-insert an initializing/ready singleton. Durable initialization is the owner-only C1 native operation. SQLite table-check installation may require a faithful table rebuild; no original schema/data/constraints may be dropped to simplify it. Update the actual generated SQL/journal/snapshot/catalog fingerprints and whole-target authentication after independently accepted allocation; no filenames, IDs, tags, timestamps, snapshot IDs or counts were guessed here. Restore must preserve/reconcile domain and both credential evidence families as one authoritative state and remains held.

## Remaining joins and activation holds

- Coordinator owns root facades/exports, K target/catalog/migration identities, and focused lint/type checks after freeze.
- Existing Auth builders in `packages/auth/nitro/production-sessions/sql-persistence.ts` (existing retain, renew and revoke) need genuine issuer-owned exact evidence; the required new fields intentionally have no optional or invented compatibility fallback. The relevant old authority read/proposal/lease bridge must be joined in its own exclusive scope, not repaired with caller DTOs.
- Owned Auth dispatch, exact original request/principal/host lease association, response publication, enabled credential/actor/membership/global-grant/Board-parent writer closure, first existing-resource pre-append provenance, restart ownership and restore reconciliation remain required and unimplemented here.
- All new methods remain unmounted. Existing AH is unchanged and remains the sole backend spine. Generic COMMIT dispatch remains unsupported; no main generic registration, authorized success from currentness booleans, API error-flatten wrapper, provider/host activation or PostgreSQL Board/App writer acceptance was added.

Frozen handoff: seven source files plus this report; real retained fixed-unit source join landed, schema/migration/Auth ownership and independent static/physical acceptance remain held.
