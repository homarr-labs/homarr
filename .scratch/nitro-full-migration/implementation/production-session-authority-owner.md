# A — private same-reader SQL session authority owner

## Frozen return and scope

**Source implementation and focused static checks complete; independent review required before any B/J5 consumption.** The sole product edit is `packages/auth/nitro/sql-authority/authority.ts`. This is the sole new canonical handoff; its exact destination was absent at initial and final glob checks. No other source, contract, index, lifetime, snapshot, DB, manifest, lock, route or ownership file was edited. All older allocations remain closed.

| Sole edited source | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Before             | `ec780e9a3beedac59b6cd842648a27ab355bb0078cf27dd3ae53f705c0dfa1fa` |
| After              | `35a9daca6c343606315195fea10cb80ec7b10658b7199a423006eaaf8df186ab` |

The complete non-Git before/after diff is `authority.diff`, SHA-256 `ff68e8a6d94192a05a1f5375858e972ccfe59ac1f4c7de65943a38e526849668`, in the final evidence directory below. Exact before bytes are retained as `authority.before.ts`. No commit, staging, branch or worktree action occurred; the checkout remains the supplied `rework-hono` directory.

## Concrete factory and private contract

`createSqlSessionAuthorityOwner(configuration, sessionConfiguration)` is a named **Auth-private source export in authority.ts only**, not a new package/index export. `configuration.runtime` is the full existing `PersistenceRuntime`; the second argument is the actual `AuthSessionSqlConfiguration`. It captures the main runtime, checks the producer runtime reference is identical, pins SQL configuration fields/real clock function, validates identical explicit reader/native snapshot and skew limits, and joins actual reader/SQL/owner lifetimes. It constructs `createAuthSessionSqlRuntime` internally once.

One private construction implementation owns the original reader WeakMap/active Set and the genuine producer. The original `createSqlAuthorityReader` delegates to it and still returns only the existing `SqlAuthorityReader`. The new owner returns:

- `reader`: that same genuine original reader and registry.
- `producer`: a frozen projection containing the actual unchanged `establishAsync` and `renewAsync` method references of the internally constructed producer. It does not expose fixed revoke or producer close.
- `revokeOwnedSessionAsync(lease, operation, mutation)`: private genuine-lease logout orchestration, where mutation is the existing discriminated fixed revoke input, not completion evidence.
- `closeAsync`: the exact shared reader close method, joined with the genuine producer lifetime. It never closes the supplied main runtime/pool.

There is no injected producer, completion/provenance callback, configurable SQL strategy, new runtime/pool, global authenticity registry, supplied success DTO, new grant or response/cookie operation. No establishment/renewal algorithm or DB mutation implementation is changed.

Private revoke returns only `{ kind: "revoke", publication: "held", state }`, using the five states `confirmed-commit`, `confirmed-commit-settlement-failed`, `commit-ambiguous`, `failed-without-confirmed-commit`, and `held-without-dispatch`. These are private native/settlement dispositions, not public logout success. Exact native promise/result/error evidence and cleanup settlements stay in this owner's private one-shot claim ledger, not returned fields.

### A's association boundary versus B

A looks up the actual opaque-session lease in its own registry. It captures its actual token/user/provider/expiry/host deadline, original immutable policy identity and owned lifetime. It synchronously records a one-shot claim and exclusive same-token fence before cloning mutable mutation/Date input, checking caller bounds, invoking a clock/native call, suspension or abort/reentry. It clamps to the original admitted deadline and verified host expiry, captures the actual operation signal, and combines reader/lease/SQL lifetimes.

The selected session token/user/Date expiry must match the genuine lease witness; full supplied source user fields must be present/representable and ID/provider must match, with any supplied account owned by that user. The real fixed producer still validates the complete user/account/session source witnesses in its actual SQL operation; A does not manufacture full witnesses from a reader ID/provider pair.

**A cannot certify lane27's private prepared-operation/scope association from these three supplied arguments.** B must genuinely claim its existing prepared operation, retain the same reader lease/scope, obtain/convert the actual selected full repository witnesses, and prevent proposal replay. A's registry lookup and native witness validation do not replace B's private origin/session-CSRF/request/proposal ownership. No public capability or fake provenance proof is added. No B source is changed or leased by this return.

## Same-token fencing and existing behavior

Opaque admission is registered synchronously before deferred read work, including before mutable operation input is captured. A token-scoped in-flight ledger records actual admission settlement. Original conditional reader revoke and new owned revoke use the **same exclusive token fence**. Both reject overlapping claims, including other leases for the same token. Claiming marks already-started token admissions unable to publish; new token admissions reject before SQL, and marked reads check again after their native read and immediately before lease publication/registration. No suspension separates that final check from registration.

The fence lasts through actual marked admission settlement and affected lease drain. Fence records are removed only at completion; there is no permanent token tombstone, cross-process notification, historical/ABA guarantee or invented SQL revision. Different session tokens and API keys are unaffected by token fencing.

Outside these deliberate fences/bookkeeping, the old reader retains its own existing credential validation, stored expiry/skew, bcrypt behavior, permission expansion, conditional DELETE, count-one `revoked`, count-zero `not-current`, and unsupported API-key deletion policy. Its conditional revoke is not called by new owned revoke and is not promoted to a certified production authority writer. Its recognized ambiguous commit is not overwritten by invalidation failure. The unchanged `commitAuthority` remains unsupported and `requireCommitAuthority()` still always rejects.

## Native call, evidence and settlement ordering

The original lease's actual `assertCurrentAsync` finishes first, comparing a genuine new credential and expanded-identity snapshot. Its lease-tracked pending-removal completes before native invocation. The claim/open/lifetime/deadline/fence are checked again before the native task and inside its deferred lease-tracked entry.

Exactly one internal `producer.revokeAsync` invocation follows. Invocation is recorded before entering that concrete method; its exact returned promise is retained. The native task is tracked under the original lease, while orchestration is tracked under the reader. Only fulfillment of that exact native promise records confirmed commit. Recognized `TransactionCommitAmbiguousError` is separately retained before cleanup. Other failures record no confirmed commit and do not claim a known rollback/no-write phase. Fixed producer precondition/zero-row failure is never mapped to successful already-revoked logout. No retry, compensation, second DELETE or readback-authentication assertion occurs.

After the native lease task has finished its actual pending-removal, returned kind/token/user/expiry/source-profile facts and native membership/grants are checked against the captured witnesses/identity. Known permission rows are expanded using existing `getPermissionsWithChildren`; unknown keys, foreign grant groups, duplicates/unrepresentable membership or mismatched facts hold. A confirmed native revoke with later association/grant mismatch remains **confirmed commit with settlement failure**, not rollback. The fixed producer has no original-grant CAS parameter; currentness before dispatch does not establish all-writer authority through COMMIT.

Confirmed or ambiguous completion first marks all currently registered exact matching credential witnesses invalidated, independent of grant identity. Each actual matching lease is released/drained; the original lease release is idempotent. Marked admissions are also awaited before fence removal. Cleanup uses `Promise.allSettled`, retaining every individual settlement privately rather than stopping at the first rejection. Cleanup failure cannot replace confirmed commit or ambiguity. A deferred reader admission rejection before orchestration starts also settles its owned claim/fence; it cannot strand the closing owner.

No task awaits its own lease/reader close: native tracking ends before matching release; root orchestration never awaits owner/reader close. Matching invalidation never asserts currentness after deletion. Caller final release remains cleanup, not association preparation.

Shared reader/owner close publishes its promise and closing gate **before** abort. It marks registered leases and captures all closing leases/fences before reentrant abort callbacks, rejects new admissions/claims, aborts the real owner lifetime, and awaits reader, producer, lease and fence settlement with all-settled aggregation. Lease release and claim cleanup likewise publish shared promises before their abort/reentrant actions. Reentrant closes reuse those published promises. A genuinely unsettled native/admission task remains pending; there is no timeout standing in for disposal.

## Before-currentness reconciliation and frozen prerequisites

`SESSION-LOGOUT-JOIN.md` was read fully; current ROSTER/deepwork authority and nearest AGENTS/codebase-context were consulted. Before edits, all 2085 files in the previously accepted Node/Bun closure were recaptured from their current actual logical files; none was missing. Every source/dependency input matched its previous accepted capture except the independently accepted Auth manifest leaf export. Its full current SHA matched the accepted declaration; removing precisely `./nitro/sql-authority` reproduced the previous parsed manifest. No unexplained drift was waived. The extra actual Backend/lock/root/config/neighbor pins were independently captured before editing and checked unchanged after final validation.

| Unchanged current prerequisite | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| Auth manifest                  | `cd12ffefe4db1e6be2e7424b119c0e246d07345cc59744d4fbe9bfcc940089d9` |
| Backend manifest               | `ba18938b343a955d44f58d5dd13ea160f42fdbc5b383644b4455bfaec0bd2841` |
| Lock                           | `01e0b188910079fc351f02c7fef6463a8d4e2a7a4c37f0b9d3c78cba403c4554` |
| DB manifest                    | `82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b` |
| Reader contracts               | `8993d5b7b390429361968909289dbf33b9458cf17758b501d40fc6ab07d0c742` |
| Reader lifetime                | `fc1945f4995d6b7c3b0b778d8292604d5af2067046bd450437de76446c425234` |
| Reader snapshots               | `519805a29008374558c0e16a1d292913639d68180e76dd291956d62e958a0260` |
| Reader index                   | `cc0e39213c868f5a94cf6acf41e3d2d2c7a472d4e5e56a9792e9bd4e7b9bf7d7` |
| Fixed DB producer              | `6337eda7301d10242bb341c9d6c781212b7256a6e4377460b6c0441fe8647de6` |
| Fixed DB contracts             | `97f9a30beba8e441f8fcaeee6f5e81671851b6fc27a2a549d44bad7188ff06b2` |
| Fixed DB statements            | `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` |
| DB authority locks             | `d12ed57b059b7fb903d0f5933149897ff80dce8da7363c34be74ffc0bf48dc21` |
| Main runtime                   | `565edbf507067b3ef7373689c71715d99ad6a866be9e5f05a88978f7dabdd768` |
| Native gate                    | `fcc02392e17a7162396422829be513e7951ea415a539394d72b2b6754b598c88` |
| J2 persistence                 | `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d` |
| J2 service                     | `64a6a9f329392cd86506fd3e3d4a7baab8995976110ae9bc0cd1af7887eea083` |
| J2 SQL persistence             | `277296a53b7f3240f5cdf932fcb53b204d21f366a2510103d4b546480d1a7a1b` |
| J2 repository                  | `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71` |
| Accepted body                  | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |

Auth already declares DB/definitions/bcrypt; the actual DB producer subpath is already exported. No dependency or install was required. Genuine fixed source signatures and current installed TypeScript/Promise types were consumed. The common utility source/exports were checked for settlement/deferred utilities before using built-in promises and local domain-bound ownership routines; no new general utility/module was introduced. No casts, suppressions, comments, fake declarations or permissive principal were added.

## New immutable static evidence

Final directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-authority-A-final-4ew13as9/`.

This is a **new current capture/check**, not inheritance of lane27's pass: 2085 independently materialized regular read-only physical files, distinct source/copy inodes and single links, with exact content/logical/physical paths/hashes in `closure.json`. All 2084 non-owned captured files are unchanged from the before-current capture; only authority.ts differs. Canonical/copy hashes were rechecked after execution. The initial before inventory and accepted-pin/inverse-manifest reconciliation are retained too.

The transparently reused TypeScript 7 snapshot-API approach maps actual logical paths to those frozen physical bytes, recognizes normalized directory names and refuses uncaptured file reads; unknown directories enumerate empty. Every actual compiler input is verified present in the captured map. No live fallback, fake dependency/module, emitter, incremental cache, root pruning or source evaluation is used. Existing accepted configs and their complete roots/options remain unchanged: strict/noUncheckedIndexedAccess/noEmit, incremental false, existing skipLibCheck. The genuine Node+DOM profile includes actual installed SQLite declarations; the Bun+DOM profile adds genuine installed Bun globals.

Fresh explicit tool processes used Node **24.18.0**, installed TypeScript **7.0.2**, oxlint **1.73.0**, and verified Bun **1.4.2** by version invocation only. Each process received an explicit credential-free environment, disposable HOME/TMP inside the final directory, fixed tool PATH and locale. `raw-statuses.json` preserves complete commands, working directory, exact tool-only environment and raw exit statuses. Tool file hashes were checked unchanged before/after. Tools import only compiler/linter implementation, never product modules or env-loading configuration.

| Final genuine check                        | Complete inputs    | Raw diagnostics/status                                           |
| ------------------------------------------ | ------------------ | ---------------------------------------------------------------- |
| Node+DOM                                   | 1930               | Config/program/global/syntax/bind/semantic all 0; process exit 0 |
| Bun+DOM                                    | 1958               | Config/program/global/syntax/bind/semantic all 0; process exit 0 |
| Focused authority.ts oxlint, deny warnings | 1 file / 197 rules | 0 warnings, 0 errors; process exit 0                             |

Both compiler stdout logs contain the complete unfiltered diagnostic JSON `[]`; stderr logs are empty. Profile metadata includes exact roots/options/complete input inventories/read observations. This does not repair or certify unrelated full-workspace/current-layout diagnostics, native fixtures, libraries skipped by the existing profile or runtime behavior.

Initial evidence is preserved at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-authority-A-qfkzt7_d/`: both first type profiles passed, the first lint invocation exited 1 because a physical-path assumption selected zero files, and corrected-path lint exited 1 with four real warnings. Those logs/statuses were not overwritten or relabeled. The final source moves only the new domain predicate to its proper outer scope, uses nonmutating sorting, and captures close targets explicitly before abort/reentry; a new complete physical capture and all checks were then run.

| Final artifact              | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `closure.json`              | `80becf3171f062497d32236bc4042c7b740a98ba5bbe4ebe4adef897842e3c26` |
| `before-closure.json`       | `877b6f08d499bd439f1e88aafe4783538ba9917b0029ae481e473fa9e0422270` |
| `path-map.json`             | `f7ef281d80831f6fd1c9dc90f1dcef8d9d6681ca5cb7648da5c1022282d75d94` |
| `authority.diff`            | `ff68e8a6d94192a05a1f5375858e972ccfe59ac1f4c7de65943a38e526849668` |
| `raw-statuses.json`         | `7798651f3100e808a52f241dd0ba9452b9e3646b2444b558e08ee0894e143f1c` |
| `validate.mjs`              | `e23016236f331a241ae982d152a8fc2c3ab810ccd4f1a0bb15e39e036fb82d58` |
| `after-pins.json`           | `a6e014a029a6423616a5b1b734ec9b79a4dc1eb18776c9d56b04373ee77040cf` |
| `node-inputs.json`          | `b902bbdde59bd59d5258560be5081c63da53654ef514ef5c3fd9f5da6ee9c887` |
| `bun-inputs.json`           | `c064c3aac3b8550c8b86fd7bc7ff9973f15ba5ba0efb728b7937f83ab2919471` |
| `types.node.stdout.log`     | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `types.bun.stdout.log`      | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `lint.stdout.log`           | `5cd2400fa331bfa694265f2895ccb5ea65168af01a9e0a65365deb12b3737dc1` |
| All three final stderr logs | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## Holds and next owner

Pre-read credential-SQL-logging/resource admission remains an **activation HOLD**: the existing configuration literal and actual factory provenance are not a receipt that the resource owner admitted safe credential reads. No success/provenance callback or logging waiver fills it. All enabled-writer compatibility, current authority/validity through COMMIT, native/provider/race/restart/physical settlement, delivery/privateSSR/reconciliation, mounting and public response/cookie publication gates remain held. Existing lane32 native results do not exercise or accept this owner. Central 91/334 and policy decisions are unchanged.

Independent A review must inspect the exact source, complete diff and raw evidence before B can consume it. B then needs its own exact two/contingent-three-path allocation, genuine private preparation claim/conversion and independent review. J5 remains unleased: A review → separate B → B review → separately approved same-owner read-only reader projection/server leaf with explicit request API-key admission. This A return neither creates that projection nor changes admission policy/index exports. Request teardown releases leases; only the shared owner closes the reader.

No children/agents, Git/commits/worktrees, installs, servers/listeners, builds/browser, native SQL/tests, new unit tests, provider calls, product module evaluation, env/credentials/current appdata or protected3100/3200/live3210 snapshots were accessed or executed. Only the authorized product file, this handoff and owned approved-temp static evidence were written. **Frozen for independent review; no consumption or activation is granted by this handoff.**
