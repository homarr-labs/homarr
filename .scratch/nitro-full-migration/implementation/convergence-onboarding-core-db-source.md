# Onboarding CORE DB3 — frozen source handoff

**Implemented and frozen; not SOURCE ACCEPT or runtime proof.** Exactly NEW `packages/db/runtime-onboarding-read.ts`, additive `packages/db/runtime.ts` and additive `packages/db/transaction-gate.ts`. Controlling plans are `convergence-onboarding-core-projection-plan.md` and its independently approved `convergence-onboarding-core-bootstrap-amendment.md`. No Auth/API/Backend/F/SSR/manifest/asset product file was edited.

## Actual port / source birth

The returned `createPersistenceRuntime` object now actually implements:

```ts
readOnboardingCoreAsync(
  operation: OnboardingOperation,
  selection: OnboardingCoreReadSelection,
  authority: OnboardingCoreReadAuthority,
  configuration: OnboardingCoreReadConfiguration,
): Promise<OnboardingCoreReadResult>
```

Types and `OnboardingCoreReadError` are reexported through existing `@homarr/db/runtime`. Internal capture/clock/body/native reader/ledger fence and gate helpers are **not** reexported there; no manifest or broad module export was added. Dependencies are existing declared Drizzle, Bun SQLite types, Node built-ins and Homarr definitions; installed SQLite dialect/native declarations were read, not executed.

- Fixed selections are `current-step` and `environment`, not caller columns/SQL/readers/fact registrars/exclusions. Authority is explicit anonymous original claim token or presented existing `NativeCredentialEvidence`; a presented-credential failure cannot enter the anonymous branch.
- Operation/config/authority are copied and frozen from own-data properties. Signals and original wall/monotonic starts/budget/expiry/deadline are retained; configuration requires actual finite version/provider/origin/enablement/resolved Workshop URL inputs and the existing policy clock/limits. Missing inputs are not defaults. No runtime configuration was read during authorship.
- Result is one deeply frozen detached discriminated envelope: bounded raw current/previous pair; environment only for that selection; finite tightened `bounds` for the future server owner. Bounds are not authority or write/publication facts. No function, signal, runtime/Connection/native client, token, claim hash, credential, encrypted setting, media or error graph is returned. No opaque observation or public facts getter was introduced.
- Raw missing-row step/null and bounded unknown/legacy strings are returned without a copied normalizer. Future API uses the existing pure normalization and falsey-previous semantics. This is not yet a normalized Studio prop/client or enrolled RPC.

## Native body / admission / COMMIT

Actual runtime admission registers the physical completion task and activity **before** scheduling, retains the actual SQLite Connection/owner lifetime, rejects PostgreSQL and logged resources, and uses the original starts for target timing. No fresh readiness/connection timer or30s observation is invoked.

The new internal `boundedSqliteOnboardingCoreRead` delegates to unchanged private `runBoundedSqliteTransaction` with CORE clock check and a real pre-COMMIT callback, no onboarding write observation argument. Existing BEGIN IMMEDIATE, scope revocation, actual COMMIT dispatch/ack, rollback/busy restoration, ambiguous classification and quarantine remain byte-identical.

Inside that same unit:

1. Capture/authenticate the actual root's SQLite51 bundle. Scalar ledger hash/created_at storage/length checks and LIMIT52 overflow witness precede first unchanged K history transfer. K remains exact history/physical authority; the fence does not accept an undersized ledger or claim a universal catalog-metadata cap.
2. Native clock sampling and actual initialized runtime epoch are universal. **Anonymous reads do not select/initialize/adopt a credential domain or native key.** Presented credentials run the real existing `nativeCredentialPolicyStatements` generator/decoder with same-unit stored domain/namespace/signed64 INTEGER sequence/session/provider/grant verification. Its fixed SQL is compiled with the installed dialect, metadata-preflighted, physically read and fed back to that existing algorithm; no profile/lease flag is used as native proof. The later Auth owner must supply its genuine registered credential evidence; DB does not perform or fabricate that missing request admission.
3. Actual users EXISTS and original stored claim hash/expiry/no-users decide anonymous setup access. Claim hashes use existing SHA-256/timing-safe semantics; temporary hash buffers are erased. Missing/unmatched/expired claim is deny; malformed storage/JSON/clock/overflow is failure, not successful redaction. Presented non-admin remains a real native non-admin, never claim fallback.
4. Metadata/count/aggregate/framing/JSON escrow for the entire selected application payload finishes before step/home/board payload queries. Allowed environment reads only Everyone home and board id/name/colors; denied environment does not read those tables and applies only original deny redaction. Matching home→sole→null and exact available id/name values are retained. No optional service/network work or business DML occurs.
5. Immediately before COMMIT, unchanged K/root checks plus CORE final observation revalidate actual epoch, stored raw step/users/claim/home/boards and the full stored credential-policy witness (clock field excluded from equality, independently validated). Private streaming digests cover bounded actual rows, not a caller expected hash/count/permission substitute. Original native/host/configured clocks and tightened expiry are checked at the existing COMMIT gate.

After the native unit/cleanup returns, runtime verifies transaction-closed current resource, actual epoch/native clock, root identity and original bounds before detachment. The completion continuation rechecks the retained tightened clock/current Connection while activity remains held, then releases activity with one final clock check before resolving. Post-unit guard failure withholds output and follows the existing ambiguous/quarantine convention; it is not rollback or retry permission.

## Fixed policy / physical cleanup

- 4096 boards, metadata LIMIT4097; singleton LIMIT2/one EXISTS scalar. Board id/home/name255 code units/1020 UTF-8 bytes; colors7/28; raw step/previous64/256. Scalar native typeof/BLOB-cast byte lengths precede payload; actual detached text/code-unit/UTF-8 validation follows. Actual PRAGMA encoding is sampled; non-UTF-8 uses conservative3×raw accounting and may reject otherwise-valid data. No truncation/filtering/overflow-as-empty/start.

- CORE selected raw2MiB, charged detached framing4MiB, serialized8MiB min supplied host response cap;6×byte plus fixed per-field/key framing and64KiB escrow is charged before payload. Too-small host budget is explicit overflow, not an override of A's4096 write-response cap. A bounded plain-envelope JSON measurement is an additional fence, not proof of later SDK/HTML/header serialization. Version256 bytes and URL/origin/MCP strings4096; explicit safe skew0–1000 and original budget≤10000ms. Claim token512/stored claim4096; existing credential policy maximumSnapshotRows+1 and validation remain unchanged, outside public projection accounting.
- The clock checks wall/configured skew, wall/monotonic/native nonregression, original signals/lifetime and decreasing original remainder. Session host/native expiry and accepted native claim expiry minus configured skew tighten only the original deadline/monotonic mapping. No new TTL is allocated.
- Every CORE-owned prepared statement/iterator has before/after checks and unconditional return/finalize attempts. Actual yielded step.value is retained before its post-step check; all original Uint8Array own-data views are erased in finally without an abort/budget gate, including unprocessed views. Primary precedes distinct cleanup causes; erasure failures continue other discoverable cells, native cleanup still runs and actual resource failures quarantine. Private witness buffers are retired on success/failure; no GC/RSS deletion or hidden-engine allocation erasure is claimed.

## Frozen byte receipts

Private0700/exclusive0600 receipt root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-core-db-source-d9525yh8/`. `pins/before.json` records new-file absence and475 current source images; `after/`, `diffs/`, `pins/after.json` record the real three-file result.473 protected images stayed byte-identical, including preservation/shared K/onboarding contracts/statements, Auth/API/F/E/C/D joins, SQL/assets/Core entry/manifests. Runtime/gate line diffs are insertions only. Source-image spans prove unchanged shared SQLite unit, ordinary createGate, onboarding gate/K cleanup and runtime target machinery; this is byte evidence, not execution/check evidence.

| Frozen file                              | SHA-256                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/runtime-onboarding-read.ts` | `fe5a72f74795d69258944335636b7cc0c2bd433ae936946059a78ad5a24773ab` |
| `packages/db/runtime.ts`                 | `b06291b1e70a113403bbcc301983f548b3bebf108c5f3a622d224121185701c5` |
| `packages/db/transaction-gate.ts`        | `64f5a2205d08f16b67b5910a621fb311f6fa585bddbfe3c2fd307e5ab4242ac0` |

## Holds / next owner

Coordinator must allocate fresh exact-byte affected compiler/lint/format checks and both-axis reviews. No such command, product evaluation/import/test/native SQL/Engine/network/private configuration/data access, nested agent, commit or push occurred. Only the released source patches, this NEW handoff and bounded isolated Python source/hash/diff IO were performed; no tests/comments/casts/suppressions/new dependency/helper product file were added.

Auth3 must consume this actual runtime method from its retained OwnedSql/evidence/projected-request lineage; API/helper normalization, genuine Backend configuration/Workshop resolver, read binding, document/SSR/enrollment and installer remain separate. Cookie16384/query2048/header65536/128-fields/response16384/64-fields and final SDK/script/document bytes belong those future consumers, not falsely implemented DB HTTP guards. The private result bounds must be used under their original request/publication supervision; this return is not publication approval.

F4 source/static acceptance at `p7onm9gh` and other accepted source joins remain coordinator premises, not rerun results. Auth9/12read/3write/5wire and adoption/domain/epoch/writer/preservation semantics remain unchanged. PostgreSQL, initialization/fixtures/FS/real data/native/browser/socket/restart/restore/cutover and full125/completeSetup acceptance stay held. No current-app or preservation proof is claimed.
