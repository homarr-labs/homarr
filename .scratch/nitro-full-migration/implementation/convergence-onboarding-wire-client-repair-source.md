# F4 — sole-file cleanup/type repair source freeze

## Outcome / authority

**The approved combined repair is authored and frozen for coordinator checks and original two-axis source rereview. Not SOURCE ACCEPT, an executed stream regression, installation or activation.** Only `apps/nitro/src/features/onboarding/claim.ts` changed, under `convergence-onboarding-wire-client-cleanup-repair-plan.md` and the separately approved type-repair plan.

Coordinator supplied original lifecycle plan approval and original SDK reviewer approval of the two type annotations. Original F4 freeze `ab297b68…` / claim `5fab4da5…`, SDK/security SOURCE ACCEPT, and old Nitro TS7022/TS7023 plus lint/format-zero at `l61ka8cc` remain historical/prerequisite associations, not repaired-generation checks. CORE/bootstrap authoring remains separate and was not consumed.

## Actual repaired proof birth

- The existing `track` primitive still publishes each owner/local task before deferred work; its implementation is unchanged. No new timeout, task framework, native observation port or public facts surface was introduced.
- `readFiniteBody:232–249,274–280` retains reader-local discriminated direct read/closed/cancel observations. Read rejection is recorded only by the rejection continuation attached to **the actual promise returned by reader.read()**, before forwarding its unchanged error to the outer catch. Synchronous invocation failure, validation/overflow, abort checks and outer primary do not mint this witness.
- `257–266` captures the already-observed read outcome **at actual reader.cancel invocation**, inside that published task. The existing single cancellation promise is retained; an earlier abort-started cancellation is not replaced or retroactively granted a later read witness. Actual cancellation-promise rejection is observed separately.
- `291–317` waits the real closed/cancel terminal tasks. Closed rejection is body replay only when its actual direct rejection equals the actual read rejection by Object.is. Cancel exemption additionally requires the read witness at cancellation birth, actual closed rejection and actual cancel rejection, with every actual task/rejection value matching that same error. Closed fulfillment, missing direct observation, early cancellation without the witness or a distinct cause keeps cancellation failure genuine.

No exception name/message/code, outer-primary equality, AggregateError/cause traversal, mock stream, platform probe or simulated state establishes replay. The existing reader.closed access supplies its actual promise, not a stream-state predicate.

## Actual causes, cleanup and outward outcome

- `156–160` replaces the boolean with one **owner-local first genuine cleanup cause** latch, discriminated none/failed with unknown error. `assertCurrent` consults that latch. It is not cleared by reset or a later matching primary and creates no history/log/Query cache.
- `cancelBody:210–218` records its actual direct rejection in that latch before rethrowing. It does not borrow the finite-reader replay exemption.
- `readFiniteBody:252–256,295–337` separately retains body-first primary and at most three direct local cleanup observations: closed, cancel and release, each classified once and identity-deduplicated. The three noteCleanup call sites are the bound; no global/unbounded error array exists.
- All actual terminal tasks settle before tracked release is attempted. **Release failure always records genuine cleanup**, even when its error is Object.is-equal to the primary. Classification precedes outward deduplication, so equality cannot clear the owner failure.
- The fresh signal check runs after cleanup/release and before byte output; it supplies a primary only when no earlier body primary exists and never creates a native read witness.
- Outward errors are assembled after these observations: unchanged body primary first, followed by distinct closed/cancel/release causes. One value is thrown directly with original identity. Multiple values produce AggregateError with the first/original-primary value preserved as cause. Existing aggregate objects are treated atomically; no nested errors graph is inspected.
- `finishRetirement:541–544` still drains genuine pending work first, then throws the retained first cleanup cause directly instead of manufacturing a generic replacement error. Repeated reset/disposal retains its existing actual completion semantics.

Consequences established by these source branches, **not execution evidence**: read E / closed E / cancel E with the required cancellation-birth proof and successful release returns original E without a cleanup latch; read E plus distinct cancel C returns E then C and retains C as cleanup; release R is genuine regardless of primary identity. Overflow/abort without direct read-rejection proof cannot claim replay. An unresolved local read/closed/cancel/release task still holds the drain/replacement barrier.

The original task publication/drain implementation, byte bound/copy, cancellation attempts, abort-hook removal, enclosing GET/POST/SDK finalizers, private client-context association, token generation/reservations and no-refresh exclusion are unchanged. No broader caller refactor was required for the approved finite-reader outcome cut.

## Exact type-only annotations

At `546`, the existing owner initializer now explicitly has **OnboardingCsrfOwner** type, retaining its Object.freeze generic. At `556`, the existing resetAsync method explicitly returns **Promise<void>**. No cast, suppression, new public signature or runtime expression was used to address recursive inference. Fresh compiler acceptance remains coordinator-owned.

## Immutable private source evidence

Directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-client-repair-source-33dc1bf678e44da68186a8c6`.

Created mode 0700; manifests, before/after source images, diffs and legacy-function images created exclusive mode 0600. Authorized bounded Python `-I -S -B` source/hash/difflib I/O matched the approved claim baseline before authoring, recorded the sole-file change and **70 protected unchanged associations**: the other three F product files plus the original 67 frontend/backend/Auth/API/DB joins. Their diffs are empty. No product patch follows the after capture.

| Sole source              | SHA-256                                                            | Bytes / lines |
| ------------------------ | ------------------------------------------------------------------ | ------------- |
| Before claim.ts          | `5fab4da56f5c879da12b2be0ed1ddc0f40de03923ada88ee5003e8a8fe29e37b` | 18293 / 558   |
| Frozen repaired claim.ts | `d90d4e92fcc008704e3d6725c1363e24a1b0b90a68036d12665ba9df9aaf6dd0` | 21190 / 626   |

The old **claimOnboarding(signal) function body is byte-preserved**, with identical before/after function-image hash `22d9b4a700bb787bbcdf26c0bc00a90fccce0e2627c6c5dd5d6a00be31f189b2`. Frozen uninstalled studio still uses that callable; the new owner-bound claim factory is not silently installed. Complete pins/images/diffs and the legacy equality association are in before.json/after.json, not a rewritten original F freeze or active report.

## Retained holds / next gates

Server/socket/native UNKNOWN evidence, three generated leaves, claim HTTP mapping, SDK json/none decoding, local-settlement-only replacement policy, stable no-secret mutation keys, no retry/resend/implicit claim reacquisition, raw source intents, email/provider semantics and typed navigation remain unchanged. Stream replay classification establishes no native rollback/COMMIT or physical server ACK. Later new explicit non-mutating CSRF refresh still waits actual local drain, not unobservable server acknowledgement.

Coordinator owns fresh focused Nitro type/lint/format checks against this repaired generation; original SDK/security and lifecycle reviewers rereview these exact bytes. No self-clearance of source holds or relabelling of old checks. Root/studio injection, refcounted installer, read/environment/source-export/bootstrap/route/Query owner joins, Welcome action, completeSetup, UI and all browser/server/runtime/native/transport/data grants remain held.

Only the sole-file patch, two authorized private source-capture commands and this NEW report were written. No comments/tests/casts/any/non-null assertions/suppressions, dependency/helper file/public port changes, compiler/lint/formatter/project checks, application evaluation/imports/tests, SQL/native/Engine, network/Context7, private configuration/data, nested agents, commit/push or browser/runtime operation occurred.
