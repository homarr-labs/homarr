# Convergence AW — six-file Auth source freeze

## Resume and scope

The earlier attempt was interrupted by the terminal provider `ENOTFOUND` failure reported by the coordinator. It did not complete a handoff: the six partial Auth edits were present, but this report was absent. Resumed by reading and reconciling those actual edits, preserving earlier handoffs and the existing work. No rollback, staging, commit, commands, checks, tests, import evaluation, runtime/native/SQL/data execution, live calls, secrets or nested agents were performed here.

Source freeze for this allocated lease only, not compiler, runtime, producer recertification or product acceptance. The coordinator's repaired D diagnostic/source acceptance and DB facade/export acceptance are premises, not results of this writer's validation. Prior completed W/SD/BK/JS/AS/LC reviews were not repeated or amended.

Only these six product paths were edited:

- `packages/auth/nitro/sql-authority/contracts.ts`
- `packages/auth/nitro/sql-authority/snapshots.ts`
- `packages/auth/nitro/sql-authority/authority.ts`
- `packages/auth/nitro/production-sessions/sql-persistence.ts`
- `packages/auth/nitro/production-sessions/service.ts`
- `packages/auth/nitro/production-sessions/index.ts`

This new report is the sole additional write. Backend/API, D/C1/B/P/K bodies, manifests, providers, repository/staging adapters, SQL schemas, migrations, sealed evidence, private SSR/UI and mounts were not edited.

## Frozen contracts and evidence provenance

`SqlAuthorityConfiguration` now requires `now: () => number` and `maximumAbsoluteClockSkewMs: number`. Authority freezes captured configuration before validation. The production SQL owner supplies its actual captured issuer clock and skew; session-owner construction requires identical clock functions, row bounds and skew, including the existing opaque-session skew. There is no clock fallback or optional owner.

The coherent credential observation is rooted in a domain-count relation independent of credential existence. It projects domain ID/head and credential lifetime/write as explicit SQL TEXT, actual integer/bigint storage types, namespace, phase, total domain-row count, original locator/user/provider/hash/expiry, group-parent and permission-parent existence, and one materialized SQL clock. `maximumSnapshotRows + 1` detects overflow; admission does not truncate grants into a smaller authority set.

The decoder requires exactly one singleton at ID `1`, phase `ready`, canonical lowercase UUIDv4, canonical signed64 decimal TEXT and native integer/bigint storage, with `0 <= head` and `1 <= lifetime <= write <= head`. Missing/nonready/malformed domain or missing additive schema is unavailable, not anonymous readiness or adoption. Only an actually absent credential under a valid ready domain returns null. Cross-row domain/credential/clock/expiry invariants and complete bounded original memberships/grants are validated. Head is an upper bound within an observation, not part of credential equality between observations.

SQLite expiry must have INTEGER storage and exact millisecond TEXT. PostgreSQL expiry must have timestamp-without-time-zone storage, equal its millisecond-truncated original timestamp, and have exact SQL millisecond TEXT equal to the checked numeric projection; original timestamp TEXT is retained and compared on rereads. PostgreSQL SQL clocks are floored integral milliseconds. SQL, configured and wall clocks must agree within the retained skew; expiry/host deadlines remain integral and bounded.

Frozen detached `NativeCredentialEvidence` is retained only in the authority's original lease WeakMap. It binds namespace, both sequences, actor/provider, and either token/exact expiry/host deadline or key ID/exact stored hash. Witness equality includes all those bindings, never domain head. API-key bcrypt remains outside SQL, followed by a second current-row observation matching the original namespace/pair/actor/provider/ID/hash before a lease is issued.

The non-barrel-exported session owner has the internal method:

```ts
captureOwnedCredential(lease: SqlAuthorityReadLease, operation: SqlAuthorityOperation): NativeCredentialEvidence;
```

It requires that owner's original live, unreleased and uninvalidated lease, original identity/type/lifetime, identical captured signal and a non-extending finite deadline, plus the actual issuer clock checks. It does not require the operation object itself to be the original object. Neither the public lease nor the public reader exposes evidence or a commit permit.

Projected request registration retains original request signal/deadline, the actual admission signal/deadline, exact lease identity and privately captured evidence. Issuer preparation resolves its original scope, owner, scope lease and admission operation; proposal signal/lifetime and deadline must remain within that scope and lease. Copies of issuers/leases/principals, serialized evidence or business inputs cannot supply authority.

## Three mandatory session joins and native settlement

`logoutMutationFor` fills revoke `credential`; `mutationFor` fills renew `credential` and existing-establishment `session.credential`. Each comes from the original owned scope lease and matches original user/provider/token/expiry/host bounds. Original account selectors/witnesses, profile policies, external/everyone-existing-only grant effects and renewal grant-consistency rules remain in place. Creation still receives its real credential from D, not from an Auth placeholder.

The private `mapNativeAuthSessionSqlResult(result, mutation, configuration)` validates and copies the real returned discriminator, original profile/session/grants and credential. Established/renewed results require the actual returned opaque evidence matching token/user/provider/expiry, canonical namespace/pair and host bounds. Retaining an existing session preserves the pair and host bound; renewal preserves namespace/lifetime and requires an increased write sequence and the real renewed expiry. Revoked results require `credential === null`. Fresh-result validation compares a genuinely re-admitted lease's private evidence and original complete groups/expanded permissions, not a profile DTO.

For establishment/renewal, actual producer-promise fulfillment sets `confirmed-commit` and stores the raw native result in the private committed map **before** mapping, fresh admission, currentness or cleanup. Later failure becomes `confirmed-commit-settlement-failed`; it never becomes rollback or replay permission. Native ambiguity is recorded before the existing issuer ledger can sanitize rejection. Primary and cleanup errors are retained privately, including actual errors before ledger flattening.

Owned revoke records the physical promise/result/ambiguity before result validation and lease/fence cleanup; it validates the original revoked result and null credential. Its private claim retains native failures and settled cleanup failures. Generic `reader.revokeCredentialAsync` now rejects with `COMMIT_AUTHORITY_JOIN_REQUIRED`; the old unjoined plain DELETE helpers were removed. Generic COMMIT remains unsupported. D's expired-exact-revoke/no-head-allocation behavior was not changed; this live-lease bridge does not invent an expired-session admission owner.

## Frozen fixed-dispatch handoff

The production-sessions facade adds exactly these two fixed functions, retaining existing exports:

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

Dispatch resolves `productionSqlIssuers` -> `owners` -> exact projected request lease -> original private authority evidence. It uses the retained runtime, issuer clock/skew/row bounds, original request signal and owner/admission/lease lifetimes. Deadlines cannot extend original request or opaque host bounds. Detached frozen business input is captured before scheduling; Board keeps replace-user/replace-group only and App keeps create-only with the original empty-ping normalization and actual native result.

`requestWrites` prepublishes the completion promise before deferred native invocation. Its private settlement discriminants distinguish not-dispatched, invoked, pending, fulfilled, rejected and ambiguous, retaining the actual underlying promise/value/error. No post-fulfillment currentness check overwrites physical settlement. Native Board/App errors, including the actual nonretryable `TransactionCommitAmbiguousError`, propagate unchanged; dispatch does not pass through MAIN/read wrappers or the issuer ledger. No retry or new generated ID is supplied by this tranche.

SQL-owner close captures pending issuer operations, request reads and request writes before abort, then drains them together with original authority/scope cleanup. Abort notification is not physical settlement. Primary/cleanup failures are preserved rather than replacing them with a fabricated success. A later backend request-release adapter must separately retain/drain its fixed dispatch promises; public lease release alone is not a replacement for that association-owned drain.

## Coordinator-owned facades observed, not edited

- `@homarr/db/runtime-auth-credential`: types `NativeCredentialEvidence`, `NativeCredentialPolicyConfiguration` only.
- `@homarr/db/runtime-board`: types `BoardPermissionReplacement`, `BoardPermissionsMutation`; value `BoardPermissionsMutationError`.
- `@homarr/db/runtime-app`: types `AppInsertValues`, `AppMutation`, `AppMutationResult`; values `AppMutationPreconditionError`, `AppMutationPermissionError`.
- Existing package export keys point to those exact root facade files. Auth already depends on DB and definitions; no dependency was added.

No private validator/reader/allocator/adoption/native callback/raw database was imported through a new public seam. No cast, compatibility credential, default authority, authorizing receipt or schema fallback was added.

## Remaining real holds and next owner

1. Coordinator performs focused lint/typecheck only after reached writers freeze, on genuine original roots. No compiler PASS or absence of diagnostics is claimed. Any out-of-lane `SqlAuthorityConfiguration` consumer must provide its actual required clock/skew explicitly, not a fallback or cast.
2. K additive migrations/catalog/whole-target authentication remain absent/pending. No domain initialization/adoption or whole-target readiness follows from this Auth source.
3. D file/existing-resource adoption, restore/restart and genuine pre-append provenance remain held; native verified-memory-only prerequisites were not broadened or recertified.
4. Complete enabled credential/actor/provider/account/membership/global-grant/Board-parent writer closure, other writes and PostgreSQL activation remain held. Fixed producers are not generic COMMIT authority.
5. Local/LDAP/OIDC login, renew and logout HTTP success remain held. Every issuer persistence outcome still has `publication: "held"`; the existing publisher still throws. Renew-not-due remains held-without-dispatch, not an HTTP-success loophole.
6. Backend/API final factory-created context association, exact three write adapters, native/handler/publication settlement and response disposal require the separately allocated disjoint next lease in `convergence-AW-plan.md`. Do not authorize a middleware context copy, use MAIN's flattening/postcheck read wrapper for native writes, or replay after fulfilled/ambiguous settlement.
7. Routes, private SSR/UI, normal host startup and production activation remain unmounted/unapproved by this lease. Source freeze is not a working-login or product-completion claim.
