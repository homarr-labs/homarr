# Onboarding owned request — Auth2 repair source freeze

## Outcome and scope

The independently approved two-file repair and mechanical handle annotation are **authored and source-frozen** for coordinator rereview. This is source evidence only: not SOURCE ACCEPT, a fresh compiler/lint/format PASS, native settlement proof, MAIN integration, generated-client compatibility or application activation.

Exactly two product paths changed:

- `packages/auth/nitro/production-sessions/onboarding.ts`
- `packages/auth/nitro/production-sessions/sql-persistence.ts`

Coordinator-supplied approval covers `convergence-onboarding-owned-request-repair-plan.md` and its controlling terminal-replay/projected-admission amendment, plus the five exact handle factory annotations. This author did not repeat that independent review. `service.ts`, `index.ts`, repaired DB4, shared `persistence.ts` and `bounded-body.ts` are byte-unchanged in this capture. No additional product file, comment, test, cast, `any`, dependency, manifest, suppression or generic history/owner framework was added.

## Actual repaired bodies

### Primary failure is not cleanup failure

`sql-persistence.ts` now has a private cached retirement result: `settled` versus `cleanup-failed`, retaining the final actual primary/native outcome separately from the genuine nonempty cleanup-failure tuple. The promise is registered in private task metadata and owner pending accounting before deferred retirement work. Automatic request retirement does not consume the public disposal rejection or guess cleanup from an error code/class.

Retirement attempts request detach/abort, awaits actual request tasks, drains the existing ledger and releases the actual lease. Task/ledger rejection is retained as primary if no primary was already recorded, not appended as owner cleanup history. Actual detach/abort/lease-release failures supply phase/caught-cause facts. It reads final request/native outcomes after those waits. Only the typed cleanup-failed branch aborts the shared owner; ordinary invalid payload/credential/body interruption/bcrypt cancellation with successful cleanup does not.

The separate cached public disposal adapter still returns `Promise<void>`. A physically clean retirement with an original request error rejects **that identical recorded object**, preserving its cause/nonretryable classification. Genuine cleanup failure aggregates its actual causes with the original primary, preserving native ambiguity or confirmed-commit settlement failure. It never converts the failed source request into successful source output or safe rollback/retry.

Prepared operation map deletion/private value clearing and enumerable active-request removal follow actual task/body/hash/native/ledger/lease settlement attempts. The weak request registration remains for idempotent disposal; no owner-strong retired request collection is created. The existing native invocation/promise/result/error evidence and runtime quarantine remain unchanged.

### Terminal read-error replay has exact temporal provenance

`onboarding.ts` contains the narrow local owned body reader needed to retain cleanup facts without changing the shared reader. It retains byte caps/growth, original Request, actual pending reader/cancellation/closed promises, held reader lock, UTF-8/JSON/schema boundaries and original decreasing clock controller. The shared reader constructor still validates the captured body budget; this local path uses its actual `maximumBytes`.

The direct read-await catch records the raw terminal error and genuine reader **before** outward primary wrapping/finally cancellation. First cancellation snapshots that observation before invoking the actual reader method. Only a returned cancellation rejection replaying that same pre-observed cause on the same reader is excluded from cleanup facts. A synchronous cancel throw, different cause, or cancellation begun before terminal observation remains genuine caught cleanup provenance—even if a later read error has equal identity. No code/instanceof heuristic decides cleanup.

All branches wait the real pending read/cancellation/closed settlement and attempt reader release, timer cleanup and listener detach. Actual cancel/release/timer/detach causes are retained at those operations. A proven terminal replay stays primary with cleanup count +0 when remaining cleanup succeeds; real subsequent release failure still produces cleanup-failed. The lock is not released before this classification.

### Projected admission is tagged before its own publication

The onboarding caller weakly associates its actual frozen `state.bounds()` operation object with its genuine owned record before the existing public reader call. The private projected admission function resolves/consumes that exact association before copying the operation, validates owner/live preparing registration/original signal/decreasing bounds and passes the optional record only to the private projected-read producer.

For this associated branch, the independently tracked projected admission completion is tagged **before** entering owner `requestReads`/record tasks and before scheduling its deferred body. It remains tracked through actual admission and admission-catch release. The unchanged public reader wrappers retain all original token/API-key validation and signatures; the unassociated private read branch retains its previous scheduling and task/error behavior.

An actual admission-catch `lease.releaseAsync()` failure is recorded at that catch as `admission-release` before throwing the same existing primary/cleanup aggregate. This fact survives even when no lease reaches `admitOwnedOnboardingAsync` and `record.lease` remains null. Tagging an onboarding promise does not erase its release failure. The exact operation association is also removed in the caller's finally path for wrapper validation failures.

Preparation, dispatch and retirement completions are likewise tagged before their respective task-set publication. Owner close awaits all actual tasks/retirements, recognizes only its genuine onboarding task associations, routes ordinary onboarding primary errors to their private outcome and reports bounded genuine cleanup facts. Existing non-onboarding close rejection handling is retained.

### Bounded owner state and exact mode predicate

The unbounded strong `onboardingFailures` list is removed. Owner state retains only the first genuine cleanup phase/cause, distinct failed-retirement count and exact/saturated status. Update occurs once in the first completed cleanup-failed producer, never at repeated disposal/catch observation. Multiple causes in one retirement increment once; ordinary primary failures increment zero. Count reaches 2,147,483,647 exactly, then a subsequent occurrence marks saturation without wrap/reset. Close reports the first cause and scalar count/status through one local cleanup-summary contribution, not all historical request error graphs.

The capture predicate is now exactly `demoEnabled && readOnly`, matching accepted DB/source demo mutation policy. Immutable constructor policy, actual origin/CSRF/private request, canonical schema/hash/IDs/email behavior, original clock pair/budget/lifetimes, authority signals and four fixed single-use native calls are otherwise retained. No global DB-readonly bit or writable default is introduced.

All five existing handle factories now use `Object.freeze<EXACT respective handle type>` contextual annotations. Literal true and command values, runtime objects and weak identity checks are unchanged; no cast or fabricated authority was added.

## Fresh source evidence

Private evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-owned-request-repair-source-49ef074ac1e620792a101097`

Directory mode is 0700. `before.json`, `after.json`, both before/after images and diffs were created O_EXCL/mode 0600 with bounded pure Python `-I -S -B` standard-library file/hash/difflib handling. Both retained diffs were read as source evidence. No product write follows this after-capture freeze.

| Source               | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines | Images/diff                                  |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| `onboarding.ts`      | `239524acd16a9637a36a9712c1ee8d42eb905aa122d83d602352e9441a6ef3a9` | `d92d703cace8a038fed232b6f57806a192834e6366b1bcbf1222d35af3045fac` | 25593 / 656       | `0-before.ts`, `0-after.ts`, `0-repair.diff` |
| `sql-persistence.ts` | `6298270f2603fe28c5b219e2ea3ae6d319c825c16a3b62aa39fe0b17f2ad1d75` | `099805f727d35c50398c600cc7c12bed5fc193c32694e1c53e96ab90c26b0d6b` | 152302 / 3665     | `1-before.ts`, `1-after.ts`, `1-repair.diff` |

| Unchanged source association                              | Identical before/after SHA-256                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/service.ts`      | `e29b43325c7814bad371f13df68541b525a331f51df919aa7e456e54ed27e10a` |
| `packages/auth/nitro/production-sessions/index.ts`        | `1118ff1cf7a48f161c97a134bbc9aaf05b8cc8e5f01d45a1f1edae362d198d4b` |
| `packages/auth/nitro/production-sessions/persistence.ts`  | `cc394f8f3ff84ae0426ee549d769187898e120b75906cf1171b2625aacf6911f` |
| `packages/auth/nitro/production-sessions/bounded-body.ts` | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |
| `packages/db/runtime-onboarding/contracts.ts`             | `508549140e2386f4fa009974389b6ce9f26768732df034250e570d4377f30987` |
| `packages/db/runtime-onboarding/statements.ts`            | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` |
| `packages/db/runtime.ts`                                  | `87e8754f8323dbe33f8789dfe73323903ba7e5a7b39cafd9746dff1dc79c56a6` |
| `packages/db/transaction-gate.ts`                         | `31c2bf210de2e11aff4d077945d794a58bc3bf0628fed38a99364466dedad6cd` |

## Continuing holds and diagnostics

Independent repair source rereview and fresh coordinator checks remain due after all reached writers freeze. Supplied diagnostic stage `nitro-auth-ui-source-diagnostics-wfxrjc3k` is terminal with types 10/14, lint 0 and format 0 on the **unrepaired** source; it is retained unchanged, not these bytes' PASS. No compiler is claimed still running. Original 37/37 and all failed/source evidence retain their historical status.

No compiler/lint/format command, test, application/module evaluation, native SQL, Engine/network/private configuration/data or nested-agent action was performed here; the only commands were the authorized pure source captures. Accepted Bun measurement does not grant native/app/runtime authority and was not rerun by this author.

MAIN constructor policy, genuine first-request four-path integration/assembly forwarding, real transport/parent-body/final-context/API publication and enrollment remain held. completeSetup is absent/deferred; no registration, native initialization/adoption, runtime or wire permission was exercised. UI/schema-normalization work and legacy three UI paths are disjoint and untouched. Counters, epochs/domain/sequence controls, descriptors, prior artifacts/controls, 142 migration assets, data and protected ports remain outside this cut. This new report does not rewrite Auth4 evidence or claim full phase completion.
