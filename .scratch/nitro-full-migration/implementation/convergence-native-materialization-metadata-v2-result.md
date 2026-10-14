# Metadata-v2 execution: returned ready; exact-source association HOLD

## Actual outcome and mandatory hold

**One v2 invocation returned `metadata-ready-static-only`, parent numeric0,29 reads/760732 bytes/elapsed5ms, zero tracked file descriptors/directory scans and no failure code.** It created the three authorized C/control directories0700 and changed all five authenticated author leaves0600→0400, retaining their bytes/hash/device/inode/ownership/nlink/size/mtime. No copy/native operation ran.

**Do not treat this as exact-envelope acceptance:** I transposed two post-mkdir lines in the requested tool command. The approved literal records syscall return before validating the newly created directory; the actual requested command validated the directory before recording syscall return. The full requested text therefore is not byte-identical to the approved literal. This executor deviation is preserved explicitly, not hidden by parent0 or the ready headline. The actual result remains **HOLD for independent exact-source/deviation/result review**; no replay, correction invocation, rollback or next-copy release follows.

Approved sequence:

```python
os.mkdir(path, 0o700)
operation["state"] = "syscall-returned"
row["after"] = directory(path, [])
```

Actual requested sequence:

```python
os.mkdir(path, 0o700)
row["after"] = directory(path, [])
operation["state"] = "syscall-returned"
```

All three actual mkdir validations succeeded, and the returned operation rows record `syscall-returned`. That does not erase the source-binding discrepancy or establish policy equivalence in a failed-validation case. No unauthorized extra C/H mutation coordinate was used, but exact-literal admission compliance is **not** claimed.

## Coordinator authority, preflight and first v2 invocation

The authority is the distinct **coordinator-scoped corrected STATIC METADATA-V2 continuation grant** at `.slim/deepwork/nitro-full-migration.md:29`, not a standalone user metadata answer, native release or retry of the consumed v1 mode-HOLD. The old v1 result/parent1/zero-operations reports, failed stages/evidence/annotation erratum remain unchanged. Source-product assembly/wire-plan scopes remained disjoint; no compiler/style/test/app/native work was performed.

Before admission, fresh isolated stdlib FD reads authenticated:

- Metadata-v2 report26189/`774b98043f3d2c34980da83144859e63c8dae960a777e219cb258b319d586a0b`.
- Approved complete literal17544/`7a6803adf82638a2572b96171070b13c53e297d649b590aa7ea96f7dc63be42c`.
- Shell-decoded Python16893/`154ed2ce864ed9094bc6055b61c5773d14ccdc1290228998bfd9202f81f2cc54`, including its leading newline, using exact POSIX shlex/whitespace_split/commenters-empty/one-c-token decoding without stripping.
- The exact metadata row in `TEMP/nitro-materialization-v2-envelope-checks-lpjqi16c/records/final-result.json`, associated with independently accepted v2 source and retained AST/compile-without-evaluation/zsh0. Those checks were not rerun or treated as execution evidence. Its separately accepted staticcopy row was not invoked.
- Current canonical Python/env/zsh byte pins, ownership/modes and postflight identities; all four C/H source-reference leaves0600; exact static-bindings6174/`4fa59a0e4b81473b55035434759f4cfa27d8643b8a9fbd0aa28e408ca8e64708`/0644/501:20/nlink1 under canonical501:20/0700 runner-control stage; all five author byte pins with actual preflight0600 modes; canonical C/H private directories, exact author memberships and current control/static/runtime admission gates.

The whole asset authority0644 belongs to future copy only and was **not read**. No broad0644 allowance, original evidence chmod, source evaluation or dynamic probe was used. Preflight succeeded with4882692 explicit read bytes, below the separate8MiB limit, with report/source/tool unchanged FD postflight receipts and closed writers. The actual-source transposition occurred when submitting the tool request, after approved-source preflight; preflight approval cannot authenticate that later deviation.

New evidence root:

`TEMP/nitro-native-metadata-v2-execution-479e3d6b0375c591`

`TEMP=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

The new root/home/tmp/records were exclusively allocated canonical501:20/0700. Exact approved selected-command, coordinator release, planned literal/options and preflight receipts were frozen before the first v2 invocation. They remain **planned** source associations, not proof that the later requested payload or unseen harness argv equaled them.

The actual tool request was a direct `functions.shell` zsh command with absolute `C=TEMP/nitro-native-runtime-caller-o_s9lpod` cwd, `background:false`, `timeout:35000`, env-i/canonical Python-I-S-B-c, no file launcher/helper/substitution/heredoc/wrapper/extra environment. Requested payload transcription17544/`333decb220f544fdbc0d01497af572d6bfb9d9bfbc6eee559ecdf0ffc3577d48` preserves the two-line deviation. That digest identifies the recorded visible-request transcription, **not independently recovered raw harness argv**. No second v2 invocation was made.

## Actual five-author and three-directory facts

All five returned before/immediate-before/after receipts are physically closed,501:20/nlink1. Each before/immediate mode is0600, each after0400, operation `fchmod-returned`, `descriptorClosed:true`, `bytesUnchanged:true`. The hashes below are the actual equal before/after hashes, joined to the retained pins; identity and mtime remain equal, ctime changed as the authorized mode operation permits.

| Exact leaf                     | Bytes | Device / inode      | Before→after mode | Actual unchanged SHA256                                            |
| ------------------------------ | ----: | ------------------- | ----------------- | ------------------------------------------------------------------ |
| `C/author/own-supervisor.py`   | 34989 | 16777232 /527511241 | 0600→0400         | `fa49c5d87b614294354b5c8ae33f6995f9ba8564b3459ba80d31ae65c52fc209` |
| `C/author/call-supervisor.mjs` |  5867 | 16777232 /527511240 | 0600→0400         | `e4c5ac0d47e8f270778cb58e755591c18b32ff850fead7087b25abe61d59a8dd` |
| `H/author/driver.mts`          | 15707 | 16777232 /527484675 | 0600→0400         | `9166d9eb74bce28798d9b03f69e3f8bc3ef79b7c22630b779f1a271ba8e2e70c` |
| `H/author/host-launch.mjs`     | 53584 | 16777232 /527485046 | 0600→0400         | `f2ff277fe458634d51b0e6e834028e043b8ca91e1280c3e723848cad18892694` |
| `H/author/tsconfig.json`       |  1173 | 16777232 /527484676 | 0600→0400         | `eeeefd53ec5fa0fda8bcd2532ad68b76467aa4dc20cb44e35a321c07aa946cea` |

`H=TEMP/nitro-native-runtime-driver-t_05t8qe`. Complete before/after ctime and unchanged mtime nanoseconds remain losslessly in the frozen returned JSON; no inferred current timestamp/mode is substituted.

| Created directory | Actual device / inode | State                                  |
| ----------------- | --------------------- | -------------------------------------- |
| `C/control`       | 16777232 /528755328   | 0700/501:20, exact home/tmp membership |
| `C/control/home`  | 16777232 /528755329   | 0700/501:20, empty                     |
| `C/control/tmp`   | 16777232 /528755330   | 0700/501:20, empty                     |

All three initial before rows were null/absent, then `mkdir-returned-validated`. Eight returned operation rows are exactly three mkdir0700 plus five fchmod0400, each syscall-returned. Every author was authenticated before allocation/mode change and reopened/rehashed on the same descriptor before fchmod; independent after rereads and final identity checks completed. No extra C/H mode observer or mutating action followed.

Returned `absencePostflightConfirmed:true` covers exactly seven later coordinates: C/control/coordinator-approval, C/records/caller-claim, H/records/native-release, C/records/caller-checkpoint, H/records/attempt-claim, H/output/child-result and outer-result. Four static destinations remain absent: H/input, H/output, C/records/native-materialization-static.json and native-envelope-candidate.txt. The requested literal's unchanged canonical private-stage/static-binding postflight predicates completed; no original evidence mode was changed.

The returned frame retains `runtimeAuthorized:false` and `candidateExecuted:false`; the latter refers to target/native execution, not the actual metadata-v2 invocation count, which is1. Read count29/760732 bytes/5ms and zero tracked files/scans are actual returned facts, not generic expected success values.

## Complete visible protocol and frozen external records

The received result was one complete `NITRO_NATIVE_METADATA_RESULT_v2` JSON line followed by:

```text
NITRO_NATIVE_METADATA_TERMINAL_v2 {"version":1,"shellPid":97778,"status":0}
```

No additional output, stderr text, timeout, cancellation or truncation was displayed. A separate numeric raw tool-exit field was **not displayed** and is not invented; only the actual parent numeric0 is asserted. Raw stdout/stderr separation, real harness argv, shell implementation and timestamped35s transport guarantees remain unavailable. Frozen protocol is a transcription of the complete visible return, assembled using its explicit returned values and exactly matching frozen preflight before/reference/tool receipts, not an independently obtained raw-channel file. JSON was decoded strictly with duplicate/nonfinite rejection and lossless integers; parent/result sizes are within32768/512 and final newlines retained.

All following leaves are under the new stage's `records/`, exclusively written0600→fsync→0400→fsync→physical close→independent read/hash; each actual leaf0400/501:20/nlink1:

| Leaf                                  | Bytes | Actual SHA256                                                      |
| ------------------------------------- | ----: | ------------------------------------------------------------------ |
| `selected-command.txt`                | 17544 | `7a6803adf82638a2572b96171070b13c53e297d649b590aa7ea96f7dc63be42c` |
| `coordinator-execution-release.json`  |  2844 | `57498bf4e07cd842b8b9a42b64d36fe62193b8b1fd74a87d5fc732fb5d0a10db` |
| `planned-invocation.json`             | 28123 | `acf814e65a363a3bb682962db1a0b20a6a80cd47ca1249d14eabcd7eda1a14d1` |
| `preflight-result.json`               | 22136 | `13db659ae15161503a7860558bfd0bb4f439bf9ad5ba39946f4964802bd54d5c` |
| `requested-command-transcription.txt` | 17544 | `333decb220f544fdbc0d01497af572d6bfb9d9bfbc6eee559ecdf0ffc3577d48` |
| `candidate-visible-tool-protocol.txt` | 14546 | `df65300badcfe3cede8687c4b29f8de2e081641d55b4e7044dcae891e06d6d29` |
| `returned-metadata-result.json`       | 14438 | `b2f7e50b6f1890d52e8c6f89a9bc1b34680e531ea391f1ae58f247bd862b2037` |
| `invocation-source-association.json`  |  1905 | `808c0c88a2112a185ba6b69ace8cd1a4364af640d8e57f8581061dc2567dc6ab` |
| `reconciliation-result.json`          |  4664 | `39105b3d168027c9a8812fb8e6dced2c100771533461ae3bd7a70082d033e84a` |

The preflight and collector returned their actual frozen close/reread receipts, including each final JSON after physical writer close. Own JSON contents do not self-attest their future close. Extra preflight/capture reads4882692+120900=5003592 bytes remain below the separately granted8MiB; candidate29/760732 is separate. No optional post-invocation C/H/body observer was run, so later association comes from the actual returned candidate facts and ordinary coordinator-exclusive leases, not a new sampling claim.

## Held disposition and unchanged downstream gates

Preserve the created0700 controls and five0400 author leaves as found. Coordinator retains leases and owns the exact-source-association recovery/result review; do not replay the corrected command, undo/reapply modes, clear/reset/unlink/rename roots, rewrite evidence or infer acceptance from ordinary success alone. The new approved source report/literal remains unchanged; the requested-payload deviation is stored separately and explicitly **not passed** as source equality.

Only three authorized C/control mkdirs, five authorized scratch-author mode changes, new external evidence records/directories and this new report were written. C/H source bytes/references/approval/runtime files, old failed stages/evidence, P/compiler history/closure, tools, Main/product/config/schema, protected data/artifacts and oldB were not edited. No asset-authority payload read, static104 copy, SQL/native/Engine/CREATE/START/exec/network/app/data/compiler/style/test/dynamic evaluation or nested agent occurred.

Ordinary physical FD closure, original30s monotonic checks/foreground35s and private enclosing-stage guards are not hostile-filesystem/same-UID/admin protection, storage power-failure durability, universal stalled-I/O termination, timestamped final transport or actual argv attestation. Same-UID/admin writers are excluded by leases, not disproved by modes. The actual result is ready metadata facts plus **HOLD exact-source association**, not migration/runtime acceptance. Independent actual result/deviation review must precede any separate copier release; accepted staticcopy-v2 remains **not invoked**, with no next-copy grant from this result.
