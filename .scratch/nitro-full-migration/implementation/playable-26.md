# PLAYABLE-WAVE32 lane26 — fixed SQL session foundation

## Pre-edit inventory and freeze

Exact exclusive changed paths:

- `packages/db/runtime.ts` — additive fixed auth-session operation dispatch only.
- `packages/db/transaction-gate.ts` — additive private fixed PostgreSQL establishment admission within the existing bounded engine.
- `packages/db/runtime-auth-session.ts` — concrete private producer/factory.
- `packages/db/runtime-auth-session/contracts.ts` — fixed plans, configuration, results and errors.
- `packages/db/runtime-auth-session/statements.ts` — concrete synchronous/async native effects.
- `packages/db/runtime-authority/locks.ts` — fixed row-lock SQL/protocol.
- `.scratch/nitro-full-migration/implementation/playable-26.md` — this handoff.

All four new source destinations were absent. No schema/migration/copy/test/manifest changes. No mounting, Git, children, new tests, real data or provider calls.

Consumed SHA-256 fingerprints before source edits:

| Path                                                   | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/db/runtime.ts`                               | `5adce380abbb3ab614b6dbe352bc0e52643a3c1ea54a0df75ccc0952fe34fa66` |
| `packages/db/transaction-gate.ts`                      | `b5a3639faf69ba116a95d6ffa0d57f5bf6c7517a87a1d392d27afda573f325a9` |
| `packages/db/schema/sqlite.ts`                         | `5d4cd3295f4154e27e981f9f9c749cf90a770143fb267f2d5a04a598d434b5dd` |
| `packages/db/schema/postgresql.ts`                     | `d936a9c1d397d6b4c65c2bfd848d46b0c54ff6f081390ccc3e124e13a45b9119` |
| `packages/db/driver.ts`                                | `df58ae6e03a2c874958432809543d5647351726de74135288bf79baebcc4c5b0` |
| `packages/core/src/infrastructure/db/scope.ts`         | `3ad2a7c13b3905700f02b7c05947772b4be3a9065d7625014ad3599de81bd3fc` |
| `packages/core/src/infrastructure/db/drivers/index.ts` | `3c37b56737f8dab72bf31648b5298e1625b559ea03430427ab8973410f3b9463` |
| `packages/core/src/infrastructure/db/constants.ts`     | `49b3091b67a78babf0957a6a7e247beae40dd45200afdd55f099460dc600fe63` |
| `packages/auth/nitro/verifiers/contracts.ts`           | `a2e42d94df92cddbeb9fcd9152384fe29009e7a8045433935aa7b97327427de3` |
| `packages/auth/nitro/sql-authority/contracts.ts`       | `8993d5b7b390429361968909289dbf33b9458cf17758b501d40fc6ab07d0c742` |
| `packages/auth/nitro/session-primitives/index.ts`      | `8fc36c010d37a6956b9a7f3a9b01d4b7e653b9fbebb8efbeb93d252066764131` |
| `packages/auth/adapter.ts`                             | `d683dc4439a561253ca50d4c43cfdc35766fcd130f0ff96ee9a419ecf7207928` |
| `packages/auth/events.ts`                              | `a86cb8af16e0cd0251303e1df26403706b8395fdc5c9f3250942d74d8c8210f5` |
| `packages/definitions/src/auth.ts`                     | `c5eb1085f59863737bb2f1fce3a1df87a8f7ddb3692828bb9ebce362e092cc1a` |
| `packages/definitions/src/group.ts`                    | `48c93c90f0b9a11e2ac4f950d28ffaad261faf458dc68048ae36a7e264c1258b` |
| `packages/db/package.json`                             | `a92b850d2bc0ceecc63e754fbd69f91154e8d516cee44363df8972e566602230` |
| `node_modules/drizzle-orm/package.json`                | `9fd30ce718965c19178ac6936462b77017f1fffe56865124d0cfe55850de09ff` |
| `node_modules/pg/package.json`                         | `bab5faf4410151a463078fffa326d10979150bfc330f0a29bd08948378ed3421` |
| `node_modules/drizzle-orm/bun-sqlite/session.d.ts`     | `91a3a761ef4ca95fa023b15f71c31f1015c5d3f665ed2bec2244d9ba1d5bf4f5` |
| `node_modules/drizzle-orm/node-postgres/session.d.ts`  | `45a7a6658917b9178eaf4288b8a22757dba3bc24676e166f28a3c2a4e858c4e0` |
| `node_modules/drizzle-orm/sql/sql.d.ts`                | `5a2cf4cd852a58131b320da62269b2143850920ce27e8fdec41fed5c2c54ec95` |

Consumed interfaces: `PersistenceRuntime` ready/admission/drain/quarantine lifecycle; `BoundedTransactionOperation` signal/lifetime/deadline; existing bounded SQLite immediate and PostgreSQL checked-out transaction/failure capture/COMMIT ambiguity; actual snake_case column casing; existing user/account/session/group/member/permission schema and cascades. User names/emails/provider selectors are nonunique; account compound PK and group unique name are preserved. Existing bcrypt/password/token formats, authority reader COMMIT hold, media guard, grant writers, setup and restore remain unchanged/held.

Declared `drizzle-orm` 0.45.2 and `pg` 8.22.0 verified from installed package/source declarations without import evaluation. SQLite `.all` and PostgreSQL `.execute` are the installed execution APIs. No undeclared dependency introduced. Context7 exhaustion/installed-source fallback is authoritative in the parent plan.

## Frozen implementation return

The initial six-source return below was subsequently reopened for the three P1 findings recorded at the end of this handoff. Only `runtime-auth-session/statements.ts` and this existing handoff are allocated for that correction; the other five source files stay frozen. Lane27 durable binding must await independent review of the corrected freeze, not the earlier green lint/typecheck or lane32's copied candidate regression label.

Concrete producer: `createAuthSessionSqlRuntime(runtime: PersistenceRuntime, configuration: AuthSessionSqlConfiguration): AuthSessionSqlRuntime`, from `packages/db/runtime-auth-session.ts`.

```ts
interface AuthSessionSqlConfiguration {
  readonly lifetime: AbortSignal;
  readonly maximumSnapshotRows: number;
  readonly sessionMaxAgeMs: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly now: () => number;
}

interface AuthSessionSqlRuntime {
  establishAsync(
    operation: BoundedTransactionOperation,
    mutation: Extract<AuthSessionMutation, { kind: "establish" }>,
  ): Promise<AuthSessionSqlResult>;
  renewAsync(
    operation: BoundedTransactionOperation,
    mutation: Extract<AuthSessionMutation, { kind: "renew" }>,
  ): Promise<AuthSessionSqlResult>;
  revokeAsync(
    operation: BoundedTransactionOperation,
    mutation: Extract<AuthSessionMutation, { kind: "revoke" }>,
  ): Promise<AuthSessionSqlResult>;
  closeAsync(): Promise<void>;
}
```

The entrypoint reexports `AuthUserWitness`, `AuthAccountWitness`, `AuthSessionWitness`, `AuthIdentitySelection`, `AuthLoginIdentity`, `AuthLoginEffects`, `AuthSessionMutation`, `AuthSessionSqlConfiguration`, `AuthSessionSqlResult`, and `AuthSessionSqlPreconditionError`. The exact complete discriminated plans are in `runtime-auth-session/contracts.ts`, not a caller-supplied SQL/callback interface.

**Declaration request to01:** add only `"./runtime-auth-session": "./runtime-auth-session.ts"` to `packages/db/package.json` exports when joining this frozen return. No new dependency/catalog pin/lock/script is requested. Lane27 must wait for the real export or use its explicitly coordinator-approved private source binding; do not fabricate a persistence adapter.

### Durable operations and source bindings

- `establish`: existing exact user witness or staged new LDAP/OIDC row; exact provider-scoped name/email selector witnesses (including absence and optional credentials fallback); exact existing account witness or compound-PK-absent account link; fresh opaque SQL session or exact existing session; profile and group effects, all in the same native transaction.
- `renew`: exact user/password/provider/profile/account witness and exact token/user/expiry CAS; expiry can only advance within the pinned configured maxAge. No upsert, recreated session or implicit renewal.
- `revoke`: exact user/account/session witnesses and conditional deletion with exactly one returned row. Deleted/replaced/mismatched facts refuse; unrelated sessions and API keys are never touched.
- Plans are structured-cloned before G entry. Configuration/lifetime are pinned by the producer. Actual native DB clock/skew is checked before facts and again before return; new/current-session/renewal G deadlines are conservatively clamped to the exact stored/proposed expiry minus configured skew. No numerical lifetime/skew/row bound is invented.
- Source effects follow `packages/auth/events.ts`: only existing external-name groups are joined, nonexternal non-Everyone memberships removed only when external synchronization was actually requested, existing Everyone membership inserted if needed, no group creation/default grant; name/profile updates and the primary-OIDC/non-data-URI-image rule are preserved. Source selection/verification and whether sync/linking are allowed remain AUTH-owned.
- Existing database defaults, stored password hashes, account token fields, old session tokens and exact timestamp codecs are retained. New sessions require the existing 48-byte lower-hex primitive's 96-character token. No JWT, rehash, copied security store, schema or migration change.
- Result is produced inside SQL but exposed only after root COMMIT and accepted cleanup succeed: `kind`, safe user/profile/colorScheme, exact session, actual group IDs and raw permission rows. These rows are not a reader lease, global permission expansion, issuer critical-event ledger or media/resource COMMIT capability. AUTH must settle its own supported-Core ledger and publish cookies/Response only after this confirmed result.
- Resource logger must actually be absent on the admitted `PersistenceRuntime`; attempts to run this path with a configured logger fail before SQL. No advisory caller claim substitutes for the native disabled logger. Native errors retain existing G failure/ambiguity semantics; AUTH's diagnostic sink must not log raw errors/parameters/secrets.

### Exact native admission / compatibility protocol

PostgreSQL still issues ordinary `BEGIN`. The additive, private factory mode checks actual `transaction_isolation = read committed` and refuses unsuitable configurations; it does not change isolation or the ordinary/default/snapshot entrypoints. Native server statement/lock deadlines are refreshed for every fixed admission query. Before user/account/group/member facts or row locks, it acquires SHARE ROW EXCLUSIVE table admission in the exact order:

1. `user`
2. `account`
3. `group`
4. `groupMember`

Only the new fixed operation wrapper can select this mode. The private implementation then executes its fixed SQL plan; callers receive neither a SQL transaction callback nor raw client/control-SQL access. The existing scoped statement whitelist still rejects caller `LOCK TABLE`, `SET TRANSACTION` and root transaction controls.

After table admission: exact existing user parent FOR UPDATE; account witness/PK locks or insertion; group parents FOR UPDATE in canonical ID order (bounded); reread actual user memberships/global permission rows; conditional profile/group/session effects and final clock check. Session row lock follows group parents and is held through actual G COMMIT. New users use the prior table admission and genuine PK absence; no imaginary absent-row user lock. SQLite runs the same fixed plan entirely synchronously through the unchanged bounded `BEGIN IMMEDIATE`, scope/gate/failure capture/COMMIT/cleanup path, with no await/provider/init work inside SQLite.

Every enabled identity/account/membership/parent-cascade writer must take compatible table admission before its user/group row locks; group-permission writers additionally take the corresponding canonical group parent before grant changes. Domain/resource ACL/placement/restore/key/setup writers have **not** joined this protocol and stay unmounted/held. Existing reader revocation is not certified as a compatible participating production writer by this return. No media guard, reader COMMIT hold, grant writer or host mounting changed. No all-writer or ABA/revision claim: exact identical delete/reinsert cannot be distinguished by a schema without an authoritative revision.

The existing resource active/drain/maintenance/close admission, lifetime abort, monotonic/host deadline checks, failure capture, scoped pending settlement, pre-dispatch rollback, post-COMMIT ambiguity/no-retry and quarantine behavior are reused unchanged. Producer close aborts its own lifetime and awaits every started mutation's settlement; it does not close/replace the shared main runtime.

### Initial validation — not P1 acceptance

- Node24.18.0, clean `env -i`, owned copied six-file oxlint: **0 warnings, 0 errors**; no mutable peer source/check graph used.
- Installed TypeScript7.0.2 public `unstable/sync` API declarations were inspected. Typecheck used an explicit no-emit/no-incremental configuration, cached immutable filesystem/program snapshot of the six roots and their126-file frozen source closure, declared native Bun/Node typeRoots, and refused any fixture or unclassified peer source. Semantic checks began only after source loading was frozen. **0 diagnostics**.
- The first check wrapper assumed the removed pre-v7 Compiler API and did not reach typechecking; the next temporary-config attempt lacked explicit typeRoots. Both were corrected, not hidden as source failures. Final clean typecheck has no diagnostics.
- Final artifacts: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-check-qt4lgk` (owned copied lint); `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-types-J0SyCi` (`source-closure.json`, `diagnostics.json`). No protected output/cache, env file, fixture, test, runtime DB, provider or listener was accessed/executed.
- Native issuance/restart/rollback/ambiguity/PG concurrency proof remains unexecuted and requires the separately authorized frozen native closure. Lane32 retains its existing fixtures; no new test/check file was created here.

Additional read-only consumed source comparison: `packages/auth/nitro/sql-authority/snapshots.ts` SHA-256 `519805a29008374558c0e16a1d292913639d68180e76dd291956d62e958a0260` (actual DB clock/conservative expiry/source revocation). Installed checker manifest SHA-256 `3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e`.

### Final source fingerprints

| Frozen path                                      | SHA-256                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/db/runtime.ts`                         | `565edbf507067b3ef7373689c71715d99ad6a866be9e5f05a88978f7dabdd768` |
| `packages/db/transaction-gate.ts`                | `fcc02392e17a7162396422829be513e7951ea415a539394d72b2b6754b598c88` |
| `packages/db/runtime-auth-session.ts`            | `6337eda7301d10242bb341c9d6c781212b7256a6e4377460b6c0441fe8647de6` |
| `packages/db/runtime-auth-session/contracts.ts`  | `97f9a30beba8e441f8fcaeee6f5e81671851b6fc27a2a549d44bad7188ff06b2` |
| `packages/db/runtime-auth-session/statements.ts` | `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` |
| `packages/db/runtime-authority/locks.ts`         | `d12ed57b059b7fb903d0f5933149897ff80dce8da7363c34be74ffc0bf48dc21` |

Both consumed schema hashes remain identical to the pre-edit inventory. The corrected statement hash above supersedes the initial hash recorded in the P1 pre-edit inventory below. Downstream durable binding remains held pending independent review; neither source freeze nor lint/types is production or native acceptance.

## P1 reopen — pre-edit inventory

Exclusive correction writes: `packages/db/runtime-auth-session/statements.ts` and this existing handoff only. The statement pre-edit SHA-256 is `2c5040dec605f3aa826ae8e5d102522d727747f4799b23476dda4b0f9be7c141`; the other five source hashes still match the table above.

Consumed installed/accepted read-only fingerprints:

- `node_modules/drizzle-orm/pg-core/columns/timestamp.js`: `d903316b96274428378ee2d475171f9df2f6011cb28d8bb82c6d0a18a89ed602` — actual timestamp-without-time-zone decoder appends `+0000` and encoder uses `Date.toISOString()`.
- `node_modules/drizzle-orm/node-postgres/session.js`: `cfcc5e8c5a4a8c02603905e8fad619981af13a42e3221b58e2878be0a4058855` — raw `.execute` preserves TIMESTAMP strings, with no schema-field result mapper.
- `packages/auth/nitro/sql-authority/snapshots.ts`: `519805a29008374558c0e16a1d292913639d68180e76dd291956d62e958a0260` — accepted SQL-clock check compares directly against host `Date.now()`; its expiry fence subtracts the one accepted skew.
- The frozen PostgreSQL `users.emailVerified` column is `timestamp()` with the installed public `mapFromDriverValue(Date | string): Date` and `mapToDriverValue(Date): string` interfaces. Both schema hashes remain those in the original inventory.

Corrections: decode PG timestamp strings using the actual schema UTC column codec, encode PG date parameters as ISO strings (SQLite unchanged), and compare SQL clock directly against G's host clock instead of adding configured-clock skew a second time. Configured-time validation, deadlines, final SQL-clock check, result-after-COMMIT behavior, locks/admission and every gate/config/ordinary/snapshot source remain untouched. No native SQL/provider/test execution or lane32 copied-source access is authorized or performed.

## Corrected freeze — independent review required

All three P1 corrections are implemented in the sole reopened source file:

1. `timestamp(engine, value)` decodes PostgreSQL raw timestamp strings through the existing `postgresqlUsers.emailVerified.mapFromDriverValue` column. This is the actual `timestamp()` UTC codec from the frozen schema, not ambient `Date` parsing of a timezone-free string. Nullable fields remain null; invalid/nonfinite/nonintegral decoded values still refuse. SQLite accepts its existing numeric/Date representation unchanged. Exact user witness comparison and final profile result use this decoder.
2. `date("postgresql", value)` returns `value.toISOString()` for every nonnull write/CAS timestamp parameter, matching the schema encoder. Native pg never receives a `Date` for these parameters, so its process-local `dateToString` cannot shift timestamp-without-time-zone writes or CAS. SQLite millisecond parameters are unchanged.
3. Both initial/final SQL-clock checks compare the genuine SQL observation directly with `Date.now()`, the host clock used by G, exactly as the frozen authority reader does. The separate configured-time check stays in the unchanged contracts file; accepted configured-clock/host skew cannot be compounded into a two-skew SQL allowance. Existing expiry-minus-one-skew G deadlines, native expiry checks and final COMMIT/cleanup publication remain intact.

Additional inspected installed fingerprints: `timestamp.d.ts` SHA-256 `0291865a9ce360953eaa52512c9ffab4c7c3cfc69a3f022b303601a502455670` (public schema decoder/encoder signatures); `node_modules/pg/lib/utils.js` SHA-256 `97fb5d56e301d00412e85ce91d796a61c79493dc03ae5adc05995ed8a0ed7936` (native Date local-calendar serialization). No new imports outside existing declared dependencies or new manifest requirement.

Corrected source SHA-256: **`232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`**. The other five source hashes and both schema hashes were checked unchanged before and after validation. All published producer/plan/config/result signatures remain unchanged.

### Fresh actual isolated checks and raw logs

Node24.18.0 / TypeScript7.0.2, clean `env -i`, owned six-file copied lint, no emit/incremental/protected caches. Typecheck uses the actual native compiler API with a cached126-file immutable source closure, excluding fixtures and unrelated mutable lane sources; it stops filesystem source loading before semantic checks. No lane32 source/fixture/candidate output was consumed.

Final actual raw output:

```text
exit=0
stdout:
Found 0 warnings and 0 errors.
Finished in 20ms on 6 files with 197 rules using 16 threads.

stderr:

TypeScript 7.0.2; Node 24.18.0; env -i; no emit/cache; cached immutable closure 126 sources
[]
Typecheck diagnostics: 0

Frozen five verified unchanged.
Corrected statements SHA-256: 232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa
```

Raw final logs and complete source fingerprints:

- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-final-i76RRY/lint.raw.log`
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-final-i76RRY/types.raw.log`
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-final-i76RRY/source-closure.json`

The first correction check found a real TS2322 on a narrowed inferred local variable: the schema table's public column decoder returns `unknown` at that type boundary. The local decoded value is now explicitly `unknown` and validated before use, with no assertion/any. That failed attempt's unmodified raw logs remain under `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-check-z58v3o/`; only the subsequent corrected run is green.

**Frozen for independent review, not accepted. Lane27 durable issuer binding WAITs for that review pass.** No gate, control-SQL admission, competing-writer permission, configuration, ordinary/snapshot path, other source file, schema/migration/test/manifest, Git, child agent, provider, native SQL or production mounting changed. This lane does not accept lane32's copied regression labels as proof.
