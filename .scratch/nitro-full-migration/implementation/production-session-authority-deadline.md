# A P2 — reject raw nonfinite revocation deadlines before clamping

## Narrow return; independent rereview required

The renewed allocation changes only `packages/auth/nitro/sql-authority/authority.ts`, in the two deadline-capture/clamp expressions identified by the Spec/security review. This is the sole new canonical handoff; its exact destination was absent at both collision checks. No other product source, contract, lifetime, snapshot, index, DB, manifest, lock or test was edited. No comments, casts, suppressions or `any` were added.

The original broad A return is closed historical work. `production-session-authority-owner.md` remains byte-identical at SHA-256 `a5ea0b9ca4d34cd3b349ac8a4d4683f25f56a6205f36e6c6ce8098e6df6c1779`. Original A capture, tooling driver, raw logs and prior failure evidence were read-only and never overwritten. This return does not self-approve A or authorize B/J5.

| Product source          | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Required/current before | `35a9daca6c343606315195fea10cb80ec7b10658b7199a423006eaaf8df186ab` |
| Corrected frozen after  | `eada1e706797a3b21e97a85767389a1fb6d518504e99daee698a694cd984fb5a` |

## Exact correction

Both paths now capture `operation.deadlineAt` once **after synchronous claim/fencing**, reject the captured raw value using `Number.isFinite`, and only then apply the unchanged finite deadline clamp. This rejects Infinity, negative Infinity and NaN without a new clock read, default or timeout. Mutable caller getters cannot move the raw deadline check ahead of claim/fencing or change the value between validation and clamping.

```diff
@@ private owned revoke
       if (witness.type !== "opaque-session") throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
+      const deadlineAt = operation.deadlineAt;
+      if (!Number.isFinite(deadlineAt)) throw new SqlAuthorityError("INVALID_OPERATION");
       const boundedOperation = Object.freeze({
         signal: operation.signal,
-        deadlineAt: Math.min(operation.deadlineAt, capturedClaim.owned.deadlineAt, witness.hostDeadlineAt),
+        deadlineAt: Math.min(deadlineAt, capturedClaim.owned.deadlineAt, witness.hostDeadlineAt),
@@ legacy revoke
       const { owned, fence } = claimTokenRevocation(lease);
       try {
+        const deadlineAt = operation.deadlineAt;
+        if (!Number.isFinite(deadlineAt)) throw new SqlAuthorityError("INVALID_OPERATION");
         const boundedOperation = {
           signal: operation.signal,
-          deadlineAt: Math.min(owned.deadlineAt, operation.deadlineAt),
+          deadlineAt: Math.min(owned.deadlineAt, deadlineAt),
```

The full actual two-hunk unified diff is retained in `authority.diff`; a byte-level inverse/substitution check verified no additional source change.

Private rejection enters its existing outer catch before mutation clone, currentness read or producer dispatch. Existing all-settled claim/lease/fence cleanup finishes before the honest `held-without-dispatch` result. Legacy rejection throws the original `SqlAuthorityError("INVALID_OPERATION")` through its unchanged catch, which schedules genuine `finishFenceAsync`; its fence persists until marked admissions settle. No new DELETE, SQL read, producer invocation, retry or compensation is introduced for invalid deadlines. These are source control-flow observations, not new runtime/race proof.

Finite clamps, unrelated admission validation, concrete producer/reference association, source witnesses/identity, native ordering/evidence, all-settled drain, close, legacy row-count policy and unconditional publication holds are unchanged.

## Current pins, derivation and exclusions

Before writing, the actual source SHA matched the required previous freeze. All 2085 logical files in the accepted A auth closure were checked against their current actual bytes; every file matched, with no missing input or unexplained drift. Extra recorded current prerequisite/neighbor pins also matched, including Auth declaration `cd12ffefe4db1e6be2e7424b119c0e246d07345cc59744d4fbe9bfcc940089d9`, Backend declaration `ba18938b343a955d44f58d5dd13ea160f42fdbc5b383644b4455bfaec0bd2841`, lock `01e0b188910079fc351f02c7fef6463a8d4e2a7a4c37f0b9d3c78cba403c4554`, accepted lane26 statements `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa`, all four accepted J2 sources and the corrected body `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b`. Complete path/hash pins are in the new `before-pins.json` and `after-pins.json`.

The new independently materialized immutable closure derives transparently from `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-authority-A-final-4ew13as9/`, substituting **only** corrected authority.ts. All 2084 neighbors remain exactly identical. Every captured file is a regular read-only distinct-inode single-link physical copy, not a live-source symlink or fallback. Current/copy/prerequisite hashes were verified again after checks. The original handoff and historical root evidence/log hashes were also rechecked unchanged.

The auth closure contains no paths under forms-collection, modals or modals-collection. Mutable F/M sources were not read, hashed or compiled. This proves only this bounded frozen auth closure and its explicit prerequisites, **not current whole-workspace state**; no roots were pruned to evade another lane.

## Fresh static evidence

New directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-authority-A-P2-bx97sfiw/`.

The accepted A TypeScript 7 snapshot-API driver was copied unchanged into this new directory and executed afresh against its own complete physical mapping. Actual roots, options and entire ordered source-file inventories match accepted A; no fake declarations, emitter, incremental cache or live file fallback. Existing `skipLibCheck` was retained, not changed or used to claim dependency checking. Unknown mapped reads do not fall back to the checkout.

Each process had an explicit tool-only clean environment, disposable HOME/TMP under the new directory, fixed PATH/locale and no env loading. Actual Node 24.18.0 and Bun 1.4.2 versions were freshly checked; installed TypeScript 7.0.2 and oxlint 1.73.0 tool hashes match the accepted A tooling and remained stable. Bun was invoked only for its no-env-file version check; both actual Node+DOM and Bun+DOM declaration profiles were compiled using the same genuine TypeScript API under Node. No product module was evaluated.

| Fresh check                              | Complete inputs    | Result                                                       |
| ---------------------------------------- | ------------------ | ------------------------------------------------------------ |
| Node+DOM                                 | 1930               | Config/program/global/syntax/bind/semantic all 0; raw exit 0 |
| Bun+DOM                                  | 1958               | Config/program/global/syntax/bind/semantic all 0; raw exit 0 |
| Focused authority.ts lint, deny warnings | 1 file / 197 rules | 0 warnings, 0 errors; raw exit 0                             |

No check failed in this P2 tranche; all raw commands, statuses, stdout/stderr, complete profiles/roots/input inventories, driver/config/tool pins, before/after closure and full diff are retained in the new directory. Both type stdout logs contain the complete diagnostic JSON `[]`; all three final check stderr logs are empty. The old broad A failed lint logs remain immutable historical evidence, not rerun or relabeled.

| New frozen artifact   | SHA-256                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `before-closure.json` | `80becf3171f062497d32236bc4042c7b740a98ba5bbe4ebe4adef897842e3c26` |
| `closure.json`        | `6a236e5ba26746a324431a2bffaddd3fce86e303c4f3057f54a29eb5b2d8170f` |
| `authority.diff`      | `0fa8896c4598f51878ea8a7a95c17382783ae262f6377fb6d28d51f2a8f78dc2` |
| `raw-statuses.json`   | `6e2cee2df3c8d6c51aa2d83eb05aefe233d60e63e416b5d7a48eb4b3a3238715` |
| `path-map.json`       | `7bd1f69d562d7018b551f52ddcb486cdce62b32648b4134383a95c62c3ca19fe` |
| `after-pins.json`     | `f977a136a997e355c06e53a9d5bc7c787f9628c2f872a1c1df39d48dbbc51465` |
| `validate.mjs`        | `e23016236f331a241ae982d152a8fc2c3ab810ccd4f1a0bb15e39e036fb82d58` |
| `node-inputs.json`    | `b902bbdde59bd59d5258560be5081c63da53654ef514ef5c3fd9f5da6ee9c887` |
| `bun-inputs.json`     | `c064c3aac3b8550c8b86fd7bc7ff9973f15ba5ba0efb728b7937f83ab2919471` |
| Each type stdout log  | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `lint.stdout.log`     | `13424f056cf6fa5955e39abaacab895e5f3561462acc9ba1034d6a09de4c374d` |
| `verification.json`   | `cff7e28c6f339a5ac20a9dcbf8976593bb832d3ab6c2584f37e8df1317df240d` |

`verification.json` carries the remaining full artifact/config/profile/tool/historical evidence hashes. The new handoff's final SHA is frozen externally in the return, not self-embedded.

## Holds unchanged

Return for independent P2 rereview and unchanged safety/standards confirmation; **no self-approval or B/J5 consumption**. Pre-read logging, all enabled writers, authority through COMMIT, native/physical/provider/race/restart/privateSSR/host/delivery/publication and Central 91-of-334 holds remain unchanged. COMMIT capability remains unsupported. No runtime/source evaluation, native SQL, tests/new unit tests, providers, browser, listener, build, install, Git/worktree/child operation, env/credential/appdata or protected-output access occurred. Only the exact allocated product file, this new handoff and owned new static evidence were written.
