# Modal native reader runner — narrow primary-order correction

## Return: source-only correction candidate; M complete-source rereview required

**Added only a local catch that records the original source exception before the existing finally-close and rethrows the same exception. Full original/corrected text images, literal minimal diff and unchanged manifest control are retained. No commands, hashes, seals, setup, target observation, Node, child/signal execution or tests. P2 closure is NOT self-certified.**

Authority: explicit narrow correction lease after M reviewed full1029 runner/192 manifest/source57, HOLD one P2 with remaining scope accepted. Original source385–420 could unwind to close350–354 before recording the source failure; close hold could therefore become primary, with original error later relegated by outercatch957–958. No other finding or scope change is addressed here.

## Exact files and preservation order

Only existing file edited:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-reader-runner-source-20261012-R7c4Wn/runner.mjs
```

Fresh correction root collision-glob returned no matches before authoring:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-reader-runner-correction-20261012-Q4v8Ls
```

Only these four files were added there through patch:

| File                                  | Full retained content                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `original-runner.mjs.txt`             | Complete1029-line original runner, authored BEFORE the existing runner was edited                         |
| `corrected-runner.mjs.txt`            | Complete1032-line corrected runner                                                                        |
| `minimal.diff`                        | 12-line literal unified diff: one hunk, three added lines, no removed lines; not an executed diff command |
| `unchanged-operation-manifest.md.txt` | Complete192-line original operation-manifest control; original manifest itself never edited               |

Text images are literal patch transcriptions of dedicated source reads, not independently hashed/copied/sealed byte witnesses. Full actual original runner/manifest were read before preservation; full actual corrected runner was read back after the edit, with image/control final line counts and literal diff read separately. Independent reviewer must inspect all complete images against actual source/control, not treat this authoring statement or tail samples as cryptographic equivalence. Existing source handoff/manifest are preserved historical records, not rewritten to update line numbers. Sole new repository file is this handoff; its exact collision-glob was repeated immediately before creation and returned no match.

## Entire source delta and failure ordering

```diff
@@ -415,6 +415,9 @@
     );
     requireCondition(file.sha256 === null || observation.sha256 === file.sha256, "SOURCE_DIGEST_HOLD");
     observation.identityComplete = true;
+  } catch (error) {
+    hold("SOURCE_IDENTITY_HOLD", error);
+    throw error;
   } finally {
     close(handle);
   }
```

Corrected418–420 catch records the source exception with the existing bounded hold mechanism, then `throw error` propagates the SAME object, no wrapper/aggregate/replacement. Existing finally-close moves to421–423 without any content change. Existing close341–356, uncertainty states, ownership/admission guards and no-FD-retry behavior are untouched. If no earlier primary exists, source failure is recorded before any close failure; if an earlier primary exists, unchanged hold semantics keep it primary and record the source observation secondarily. A genuine close-only failure retains its existing treatment.

The unchanged outercatch960–961 observes the same rethrown source exception again as a bounded secondary `RUN_PRIMARY_HOLD` record. This is a repeated observation of the SAME source failure at the outer boundary, not another distinct source failure or a new cleanup wrapper. No deduper, framework, new state, refactor or suppression was added. A close failure still records independently as `DESCRIPTOR_CLOSE_HOLD`, after the original source observation. These are source-control-flow explanations, NOT executed failure cases or test results.

## Unchanged scope and next gate

Paths, imports, known Node/reader/contract pins, externally required first runner pin, every source/capture admission, sole fixed shellfalse Node-reader child, literal five-key replacement environment/cwd,120000ms child policy,64MiB stdout/1MiB stderr/1MiB receipt/4MiB line limits, receipt boundaries and proposed192-line operation manifest are unchanged. Approved reader/contract, previous handoffs/corrections/witnesses and all six old M packets were not edited or observed as target inputs. Active01 preparation/prelaunch, DB projector/prelaunch, F/Auth/Icons/native graph bodies were neither acquired nor written.

M must rereview the complete actual1032-line runner, complete original/corrected images, literal diff and full unchanged manifest/control before independently closing the P2 or approving source. No setup of the three future control directories, result/capture leaf creation, future host/runner/input identity witness, target-input lease, reader command, child signal or execution was allocated or performed here. Only read/glob/patch tools were submitted; no syntax/lint/typecheck/runtime tests, commands, hashes, seals, raw target/parent metadata/content, API/helper/schema/SQL/network/browser/PID/Git/worktree/protected-data action.

Future outer transport240000ms remains an explicit gate: exact direct argv, five-key replacement env, contract HOME cwd, complete raw supervisor stdout/stderr and actual status/signal/timeout/command receipts must be available. Unavailable or ambiguous transport means STOP, never a new wrapper/harness, retry or automatic continuation. Corrected source still needs independently accepted fresh pins/full text/four absences/exact setup/sole input witnesses and a separately issued ONE reader-command lease. Embedded metadata/native-source mapping and every semantic/type/native/host/J5/COMMIT/privateSSR/publication/91-of-334 clearance remain HELD. Hook-only correction return; independent P2 closure pending.
