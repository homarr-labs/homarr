# B P2 — reject closing owner before irreversible proposal claim

## Exact correction candidate

**Frozen for independent Spec plus correction Standards/raw-evidence rereview; not B acceptance or activation.** Latest coordinator ROSTER records original B Standards/evidence acceptance and one Spec/security P2: synchronous abort-listener reentry could consume/register a second genuine logout preparation after shared close captured its pending set. Aborted bounds prevented native dispatch but did not satisfy the no-new-claim/no-post-snapshot-work boundary.

Sole product write: `packages/auth/nitro/production-sessions/sql-persistence.ts`. Sole new handoff: this file, absent at initial/pre-capture/final creation checks. No third source, helper, ledger, test, dependency, comment, cast, suppression or public API change was needed. Same supplied `rework-hono` checkout; all old broad allocations remain closed.

| Source identity         | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Required/current before | `d4b423a7825564f3f403b81d58891f486d4c4f72db3f2973ba4e3ab7b69afed8` |
| Corrected frozen after  | `397bcd543f0189bdbfa77fb2e085220f564f559a72813f98abeb12570fcfc1c1` |

```diff
 ): Promise<IssuerPersistenceOutcome> {
   const value = owned(owner);
+  if (value.closing !== undefined) throw new IssuerStagingError();
   const proposal = claimPreparedIssuerProposal(prepared, owner);
```

The guard is synchronous and immediately after owner lookup, before irreversible proposal consumption or any logout helper/task registration. A closing owner uses the existing generic synchronous `IssuerStagingError` rejection; there is no new result/throw vocabulary. Open-owner genuine claims and already-admitted work retain their original registration-before-clock/await/native ordering. The exact one-line inverse reproduces every before byte; no delayed helper guard substitutes for this entry boundary.

The existing close already publishes `value.closing` before capturing pending operations and aborting. Its synchronous abort-listener reentry now encounters the published gate before claim/scheduling. This is a source control-flow correction, not an executed reentry/race test or native proof.

## Before-current capture and unchanged prerequisites

Before editing, recaptured every actual logical file in the retained original B **2085-file auth closure**, with all hashes matching and no missing/drifted input. Checked the complete candidate path inventory for Icons and T/modal paths **before reading, hashing or copying any current source**; none is reached. Forms/modal collections are absent too. No global source scan, active Icons/T consumption or root pruning occurred.

New closure changes only SQL persistence; **2084 captured neighbors** remain identical. Unchanged pins include:

| Frozen prerequisite | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `service.ts`        | `7ddf76baaf6804a5947a28c71a924050926a764789c9b2ccc446235a22940587` |
| A `authority.ts`    | `eada1e706797a3b21e97a85767389a1fb6d518504e99daee698a694cd984fb5a` |
| `persistence.ts`    | `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d` |
| `repository.ts`     | `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71` |
| Accepted body       | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |
| Auth manifest       | `cd12ffefe4db1e6be2e7424b119c0e246d07345cc59744d4fbe9bfcc940089d9` |
| DB manifest         | `82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b` |
| Lane26 statements   | `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` |

Full actual manifest contents, producer/contracts/runtime/gate/locks, reader, provider/adapter/origin/index/exports, Backend declaration, lock/root and all historical handoff pins remain in `before-closure.json`, `before-pins.json`, `after-pins.json` and `history-pins.json`. Existing declared dependencies and genuine installed declarations are unchanged; no library API was added or guessed.

Original `production-session-logout-join.md` remains `029aba2d8928cb0378c852225d17b95bce14dc3b01bdef227944d38e31f6c370`; original B `verification.json` remains `1a6b18504c3b189be0771a18d447e4a5ed9ceb6853dfe697bd3760e5e08b9947`. Their complete recorded historical artifact hashes were checked unchanged. Original handoff/receipt copies are retained in this new packet; no original history, failure log or compiler evidence was rewritten.

## New complete static evidence

Final directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-logout-closing-final-ZcBdiY/`.

Before-current directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/session-logout-closing-before-Wgswdz/`.

This is a new independently materialized **2085-file regular read-only single-link physical closure**, with distinct canonical/copy inodes and verified current/copy bytes. The prior accepted TypeScript snapshot driver was copied **unchanged** and rerun against the new physical mapping, not a previous receipt. The actual logical ancestry, complete ordered input inventories, config roots/options and genuine Node/DOM/SQLite/Bun declarations match original B. Unknown mapped reads cannot fall back to live source. No fake exports/declarations, root pruning, emitter or incremental cache exists; configured strict/noUncheckedIndexedAccess/noEmit/nonincremental and existing skipLibCheck remain unchanged. This does not assert semantic checking of skipped declarations or whole-workspace types.

Actual tool processes used explicit clean tool-only environments, disposable HOME/TMP under the new directory, fixed PATH/locale and no env loading. Node **24.18.0**, installed TypeScript **7.0.2**, oxlint **1.73.0**, Bun **1.4.2** metadata and unchanged tool hashes are recorded. Bun ran only `--no-env-file --version`; both complete declaration profiles ran under Node, without product-module evaluation.

| New check                                            | Complete inputs   | Full diagnostics                                 | Raw exit |
| ---------------------------------------------------- | ----------------- | ------------------------------------------------ | -------- |
| Node+DOM with genuine SQLite declarations            | 1930              | config/program/global/syntax/bind/semantic all 0 | 0        |
| Bun+DOM with genuine installed Bun globals           | 1958              | config/program/global/syntax/bind/semantic all 0 | 0        |
| Allocated SQL-persistence-only oxlint, deny warnings | 1 file, 197 rules | 0 warnings / 0 errors                            | 0        |

Separate complete diagnostic stdout/stderr, raw commands/statuses/tool environments, roots/options/inputs/read inventories, tool pins, before/after source bytes and full non-Git unified diff are retained. Both type stdout logs are unfiltered `[]`; all final check stderr logs are empty. No static check failed in this correction tranche. Diff exit 1 records the expected sole added line, not a validation failure. `inverse.json` records exact forward/inverse byte equality.

| New artifact                      | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `before-closure.json`             | `7262fe0ff7908f84ceeee9ca748edf74650249bffd2d866d536f7861c71612ad` |
| `closure.json`                    | `768b5a3a4142059e0d4eef7c3065a6228705e2d8f8d74e6f13f968ce65df3f55` |
| `sql-persistence.diff.stdout.log` | `a4ff005d6eb1434fdbb698eadd69d33204945c100cf1e406037cf76cc84ea0db` |
| `inverse.json`                    | `4e4e2f16e9ab7a0be1754bb59bbc06209c848664c7f85e612283414f536a099f` |
| `raw-statuses.json`               | `4ce9062474b0d2087dbd2166a02d729b87c724db67ee8128f51210154f0957e5` |
| Unchanged `validate.mjs`          | `e23016236f331a241ae982d152a8fc2c3ab810ccd4f1a0bb15e39e036fb82d58` |
| Each type stdout log              | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `lint.stdout.log`                 | `5cd2400fa331bfa694265f2895ccb5ea65168af01a9e0a65365deb12b3737dc1` |

`verification.json` carries the complete new evidence hash inventory and limits. Final new handoff/receipt hashes are sealed externally in the return rather than self-embedded.

## Acceptance stop and unchanged holds

Independent Spec and correction Standards/raw-evidence rereview must accept this exact source and packet before B consumption. Original Standards acceptance does not clear the P2 on new bytes; this candidate does not self-close it. Shared-reader projection/public leaf/API-key source, J5/privateSSR, native/provider/all-writer/through-COMMIT/race/restart/physical settlement, logging/resource admission, host/delivery/reconciliation and publication remain held. `publishPreparedIssuerOperation` still always rejects; reader/resource COMMIT remains unsupported. No 91-of-334 or other count/activation clearance follows.

No test/reentry test/body probe, native SQL, provider, product-module evaluation, browser/listener/PID, env/credential/appdata, install/build, Git/worktree/child-agent or protected3100/3200/3210/`-g` output action occurred. Repository writes are only the allocated SQL source and this new handoff; all new static tools/evidence stay in approved temp storage. **Frozen correction candidate; coordinator completion notification is the return hook, not polling.**
