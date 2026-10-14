# Lane26 corrected producer — independent bounded review

## Decision

**PASS for the three recorded P1 source corrections. No remaining finding in this bounded review. Lane27 may consume the corrected producer SOURCE**, subject to the existing real-export/coordinator-approved private-binding condition in `playable-26.md`. This is not native authentication, participating-writer, media, reader/resource COMMIT, response-publication, or production mounting approval.

Reviewed the complete current `playable-26.md`, its recorded prior P1 findings, all six producer source files, relevant frozen schema/authority-reader source, installed Drizzle/pg implementations, and the actual isolated validation artifacts. No standalone earlier review message was supplied; prior findings are taken from the handoff's P1 reopen record.

The corrected statement identity recorded in both the handoff and final `source-closure.json` is:

`232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`

The final closure records the same other-five source fingerprints and both schema fingerprints as the handoff. Under the no-command constraint, this review did not independently recompute live filesystem hashes; it inspected current source and the copied corrected helpers as well as the recorded fingerprints. This PASS applies to that corrected source freeze, not later changes.

## P1 corrections

1. **PostgreSQL raw timestamp decoding: PASS.** Installed `node_modules/drizzle-orm/node-postgres/session.js:21-55,100-115` preserves raw TIMESTAMP strings and returns native rows without schema mapping for this `.execute` path. `packages/db/schema/postgresql.ts:66-70` declares nullable `emailVerified: timestamp()`. The installed column codec appends `+0000` for timestamp-without-time-zone strings (`timestamp.js:30-36,77-82`). Corrected `statements.ts:51-59` calls that actual column decoder, preserves null, and rejects invalid/nonfinite/nonintegral decoded values. Exact witness checking and final profile construction both use it (`103-127`). SQLite's numeric/Date handling remains intact.

2. **PostgreSQL timestamp parameters/CAS: PASS.** `statements.ts:61-65` sends ISO strings for PostgreSQL, matching the installed schema encoder, and retains SQLite milliseconds. User timestamp CAS, user creation/profile timestamp writes, existing-session expiry CAS, session creation and renewal all use this helper (`75-83,192-194,256-257,293-307`). Thus these parameters do not enter pg's process-local Date serialization branch (`node_modules/pg/lib/utils.js:44-69,85-116`), including under a non-UTC process timezone. This is source reasoning, not an executed non-UTC native proof.

3. **SQL clock versus G host clock: PASS.** Both initial and final checks call the same corrected generator (`statements.ts:140-159,163,311`), comparing actual SQL time directly with `Date.now()`, which G uses (`transaction-gate.ts:79-93`). They no longer reconstruct expected SQL time from the configured clock. The separate configured-clock/host admission check remains in `contracts.ts:194-197`; it cannot extend the SQL/host allowance to two skews. The original expiry-minus-one-skew deadlines and actual SQL expiry refusal remain (`contracts.ts:250,269`; `statements.ts:158`).

## Preserved boundaries

- Ordinary PostgreSQL transactions still use `BEGIN`; snapshots still use `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` (`transaction-gate.ts:254-255,430-435`). The private fixed-operation path alone selects auth admission.
- Auth admission checks actual READ COMMITTED and takes fixed SHARE ROW EXCLUSIVE table locks in user/account/group/groupMember order before facts/parent locks, refreshing native deadlines (`341-366`). Caller control-SQL remains rejected (`144-150`). Compatible-writer participation remains a mounting prerequisite, not an established deployment fact.
- SQLite's fixed generator loop is wholly synchronous (`statements.ts:318-325`) within existing bounded BEGIN IMMEDIATE/COMMIT/cleanup (`transaction-gate.ts:162-251`). No provider or async work was introduced inside it.
- Structured cloned discriminated plans, exact witness/selection checks, bounded group locks, conditional mutations, token constraints, max-age/expiry fences, and final clock checks remain. No changes were made by this reviewer to any of the six source paths.
- Runtime readiness, active/drain accounting, aborts, maintenance and quarantine remain; producer close awaits started mutations without closing the shared resource (`runtime.ts`; `runtime-auth-session.ts:22-65`).
- Results remain internal until COMMIT and cleanup succeed. Captured failures, scoped settlement, pre-COMMIT rollback, post-dispatch ambiguity/no-retry and cleanup quarantine are retained (`transaction-gate.ts:49-76,220-251,367-427`). No correction bypasses these paths.

## Actual isolated validation evidence

Read these final raw files directly, not just the handoff's green label:

- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-final-i76RRY/lint.raw.log`
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable26-p1-final-i76RRY/types.raw.log`
- The same directory's complete `source-closure.json` and copied corrected statement helpers.

Final lint raw output:

```text
exit=0
stdout:
Found 0 warnings and 0 errors.
Finished in 20ms on 6 files with 197 rules using 16 threads.

stderr:
```

Final typecheck raw output:

```text
TypeScript 7.0.2; Node 24.18.0; env -i; no emit/cache; cached immutable closure 126 sources
[]
Typecheck diagnostics: 0
```

Also read the retained first-attempt `playable26-p1-check-z58v3o/types.raw.log`: it reports TS2322, `Type 'unknown' is not assignable to type '{} | undefined'.`, with one diagnostic. Current source and the final copied helper explicitly type `decoded: unknown` and validate it before use. The final green run supersedes, rather than erases, that failed attempt. These artifacts evidence reported isolated lint/typecheck results; no checker was rerun by this reviewer.

## Limits

No native SQL, authentication/provider call, command, test, build, Git action, child agent, or source write was performed. The only review write is this canonical report. Native issuance/restart/rollback/COMMIT-ambiguity/concurrency proof remains unexecuted and held. Lane32 copied regression labels are not acceptance evidence. Lane27 source consumption does not clear any native execution, authentication, writer, media, COMMIT capability, or mounting hold.
