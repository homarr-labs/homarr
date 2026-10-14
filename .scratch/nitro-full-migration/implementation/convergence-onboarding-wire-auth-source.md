# Onboarding wire Auth phase A — source-producer gap / stopped

## Outcome

**Stopped before product edits under the explicit extra-source-producer stop condition. Phase A is not authored or accepted.** The approved A/B co-location amendment closes the receipt-handler ownership issue, but an actual validated native expiry producer is still missing for the publication-only handle required by phase A. No stub, guessed expiry, caller expiry setter, fake root or partial interface-only implementation was added.

Coordinator supplies accepted Auth4, closed MAIN5/current types 3, lint/format 0, approved A/B amended plan and approved C–F/publication plan. Those supplied statuses are preserved; they are not new checks performed here. The controlling plan and its original 210 lines/amendment are unchanged.

## Exact protected-source gap

For stored-claim authorization of nextStep/initUser/initialExternalGroup, the real native transaction validates claim expiry internally, but Auth cannot obtain that actual witness through the current public fixed dispatch interface:

| Actual source                                                                    | Evidence                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/db/runtime-onboarding/contracts.ts:32–34`                              | Stored-claim authority contains the token only, not validated expiry.                                                                                                                                                    |
| `packages/db/runtime-onboarding/contracts.ts:83–93`                              | Claim issuance returns actual expiry; the other three command results are `void`.                                                                                                                                        |
| `packages/db/runtime-onboarding/statements.ts:222–228,320–333`                   | The real stored claim is matched and its expiry yielded as a validated witness, including the second-read observation. The generator's final result remains the command result.                                          |
| `packages/db/transaction-gate.ts:523–579`                                        | The transaction gate retains expiry witnesses privately, tightening its own wall/monotonic deadlines from the original clock pair. It does not tighten or publish the Auth request state's deadlines.                    |
| `packages/db/transaction-gate.ts:691–757`                                        | SQLite/PostgreSQL runners feed witnesses to that gate and return only the generator's final value.                                                                                                                       |
| `packages/db/runtime.ts:510–534`                                                 | The public fixed three-write overloads return `Promise<void>`; there is no witness output in those signatures.                                                                                                           |
| `packages/auth/nitro/production-sessions/sql-persistence.ts:1715–1747,1974–2028` | Auth stores token-only claim authority, dispatches the existing fixed native command and receives void. Session authority can tighten from actual credential evidence, but that does not provide a stored-claim witness. |

The original capture, validated CSRF expiry and commit-time gate are genuine; none proves that the **claim's** validated deadline survives into Auth's post-retirement physical response publication. Publication may occur after the transaction's tighter claim deadline but before Auth's original/CSRF deadline. Returning void or retaining a confirmed-commit boolean cannot recover the lost witness.

The approved plan explicitly requires genuine CSRF/session/claim expiry where applicable and identifies a missing real stored-expiry publication witness as a concrete held port. A caller-provided timestamp would contradict the current source request's prohibition on expiry setters/plain-data provenance. A new claim-setting SQL read/parser would be a different producer, not retention of the native transaction's actual observed witness; it is not silently substituted here. Auth must not derive claim expiry from a token, assume a new four-hour validity window, recapture the clock/budget, repeat the native command or replace its accepted void source output.

## Required additional producer decision

A separate precise source release/plan is needed for retaining the actual native transaction's validated expiry evidence through the fixed runtime boundary, correlated to the actual original operation/runtime and native settlement. Candidate required paths are:

1. `packages/db/runtime-onboarding/contracts.ts` — a dependency-safe, explicit evidence type without changing the three public void source results into fabricated output.
2. `packages/db/transaction-gate.ts` — concrete retention of the gate's actual observed/tightened expiry evidence through transaction settlement, preserving ambiguity/quarantine and known-commit classification.
3. `packages/db/runtime.ts` — a narrow concrete producer/read port tying that retained evidence to the real same-runtime invocation/original operation, not a callback, arbitrary evidence registrar or all-mutation framework.

These paths are **outside the four-file lease** and were not edited. This is a gap statement, not authorization or an approved design for changing repaired DB4. The extra producer must preserve original clocks, single native dispatch, current void API outputs, bounded physical retention/cleanup, and must not expose caller SQL/auth predicates or accept manufactured expiry witnesses. Its exact signatures need review; none is presented as already implemented.

Phase A can resume after that producer decision, or after an explicit approved scope change separating the unavailable stored-claim publication part. Merely adding the planned API input producer in phase B does not solve this native evidence gap. C/D cannot safely register an unknown timestamp as a substitute.

## Four-file byte preservation

The only executed commands were the authorized bounded pure Python `-I -S -B` before/after file/hash/diff captures. The private capture directory was created with mode 0700; artifacts were created with `O_EXCL` and mode 0600:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-auth-source-5cf293ff18fdadb7d16fcbd7`

It contains four before/after images, four empty diffs, `before.json` and `after.json`. Every before/after pair is byte-identical:

| Path under `packages/auth/nitro/production-sessions/` | Bytes / lines | SHA-256 before = after                                             |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| `onboarding.ts`                                       | 25593 / 656   | `d92d703cace8a038fed232b6f57806a192834e6366b1bcbf1222d35af3045fac` |
| `sql-persistence.ts`                                  | 152302 / 3665 | `099805f727d35c50398c600cc7c12bed5fc193c32694e1c53e96ab90c26b0d6b` |
| `service.ts`                                          | 67312 / 1507  | `e29b43325c7814bad371f13df68541b525a331f51df919aa7e456e54ed27e10a` |
| `index.ts`                                            | 1534 / 44     | `1118ff1cf7a48f161c97a134bbc9aaf05b8cc8e5f01d45a1f1edae362d198d4b` |

This records unchanged accepted source, not a new authored four-file freeze or a phase-A PASS. **No new final port signatures/exports exist.** Existing canonical four preparation/dispatch routes, bcrypt/schema/ID/provider/email semantics and repaired retirement/cleanup remain untouched. The requested new cache/frame/ticket/from-codec/GET/publication ports are not claimed as implemented.

## Continuing holds

Phase A awaits the exact producer decision above. Phase B's actual API co-located registry/schema handlers/SDK controller and C–F's genuine MAIN factory, final-context registration, response publication, enrollment and CSRF/generated client joins remain future work, not activation. completeSetup remains entirely deferred.

Only this new report was written. No product/shared-ledger/bounded-body/DB/schema/manifest/control/counter/old source or evidence was modified. No compiler, lint, format, checks, evaluation/import execution, tests, browser, network, SQL execution, Engine, private configuration/data or nested agents were used. MAIN source/static closure and the disjoint live staticcopy executor outputs were not read. Old child-native/historical fifth-command artifacts remain historical and are not current acceptance evidence.
