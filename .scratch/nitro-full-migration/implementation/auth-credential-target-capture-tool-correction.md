# Auth credential target — two-P2 capture-tool correction

## Disposition

**TOOL-SOURCE CORRECTION AUTHORED; NOT EXECUTED; ORACLE COMPLETE-SOURCE REREVIEW REQUIRED.** Authority: `ROSTER.md:348` and `.slim/deepwork/nitro-full-migration.md:189`. The independent HOLD findings concern original `capture.mjs:264–284` bounded reads and `1022–1038` failure-receipt descriptor evidence. This return does not self-close either finding.

The exact sole new repository report collision-glob was repeated immediately before this patch and returned no files. The existing111-line `auth-credential-target-capture-tool.md`, existing320-line `allowlist.json`, pins, paths, argv/environment and proposed capture-output scope were not edited. Original P1/P2/P3 histories/images, stopped packets and accepted metadata receipts remain unchanged by this work.

## Complete source and control records

The sole existing edited file retains its exact approved coordinate:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-author-20261011-316/capture.mjs`

Complete original preservation was authored by patch **before** correction. New TEMP evidence paths:

- Original1043-line source: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-correction-20261011-source-only/capture.before.image`.
- Corrected1071-line source: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-correction-20261011-source-only/capture.after.image`.
- Full hand-authored unified delta: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-correction-20261011-source-only/capture.raw.diff`.
- Complete untouched allowlist transcript: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-correction-20261011-source-only/allowlist.control.image`.
- Exact write-set, source-delta and limits record: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-correction-20261011-source-only/scope-proof.md`.

These are patch-authored text images, not executed copy/hash/seal evidence. No new digest, readonly mode, command-generated diff or hostile-race-safe allocation result is claimed. Actual existing allowlist remains at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-author-20261011-316/allowlist.json`.

## P2 #1 — descriptor byte bound

Corrected source7 imports builtin `readSync` instead of `readFileSync`. Corrected281–296 replaces only the read callback: allocate one buffer equal to the already admitted observed size, then request at most the remaining observed bytes and remaining existing maximum. Explicit descriptor positions advance only by actual returned byte counts. Positive short reads continue; only an actual zero read returns the filled subarray. There is no sentinel read, concatenation, arbitrary-growth allocation or maximum-sized allocation for a smaller leaf.

Every actual bounded read retains the existing descriptor/path fence and adds its operation receipt with offset, requested length and actual returned count. Existing outer read receipt/full-byte digest remains. Unchanged post-read `fstat` and path identity checks run before the added exact-size `premature-file-eof` gate at305. Shrinkage that changes endpoint identity retains the original `source-changed-during-read` failure; a short result with otherwise matching endpoints cannot become a successful read or a zero-filled image. Source descriptor registration, close evidence, pin-before-copy, independent image verification, source-after-copy and final fullhash/identity gates remain unchanged.

The original130MiB Node/source-image,32MiB ordinary-leaf and128MiB owned-receipt limits remain unchanged. Admission precedes buffer allocation. Reads do not consume growth beyond that observed extent; legitimate observed growth/shrinkage fails the existing endpoint checks. This is bounded endpoint verification, **not hostile-filesystem atomicity** or continuous monitoring.

## P2 #2 — post-receipt failure evidence

Corrected1038–1071 retains the initial descriptor snapshot with `descriptorSnapshotPhase: BEFORE_FAILURE_RECEIPT_ATTEMPT`. If output was genuinely created, the single existing receipt attempt receives stage `failure-receipt-write` and its own path/status. The original primary failure and stage remain in `failure.error`/`failure.stage`; existing primary close-failure evidence and partial rows/artifacts/history/operations remain preserved.

`receiptWriteFailure` now also retains `receiptError.descriptorCloseFailure`. After the attempt, or after skipping it when output was never created, final stderr's `openDescriptors` is rebuilt from the actual existing registry with its recorded identities and labeled `AFTER_FAILURE_RECEIPT_ATTEMPT_OR_SKIP_BEFORE_FINAL_STDERR`. No guessed descriptor, close sweep, retry, suppression or cleanup is introduced.

Disk `failure.json` may honestly retain the earlier snapshot and `started` receipt-attempt status. Final stderr alone carries the post-attempt registry and outcome. A failed receipt write/close is recorded as failed, never a successful disk refresh. No rewrite of `failure.json` is attempted; its own artifact/operation evidence remains available alongside the original failure. An unsuccessful close leaves the descriptor in the unchanged registry.

## Frozen scope and validation limits

Only the two fixes and dependent import/EOF/error assembly changed: manually recorded30 added /2 removed lines, net28. Complete before/after images and the literal delta permit independent review of all remaining source, not just the selected snippets. No comments, tests, imports beyond the original builtin modules, dependency changes or broad refactor were added.

The181 source pins,22 bootstrap identities,138 individually named history leaves, full216 control map, current-vs-P2 stage distinctions, original50/18 histories and40-model conservation gates remain frozen. Source admission/exclusions, link handling, output fencing, export/custom/history guards, exact source/manifest coordinates, proposed output and command/environment remain unchanged. No Auth51/19 asset, descriptor, producer or adoption primitive was authored.

No Node/script/shell/version/system metadata/hash/diff command, lint, typecheck, test, capture, module evaluation, SQL/migrator/generation, install, Git/worktree, children, provider/network/browser/listener/PID or protected-preview action occurred. Product/history metadata/content/hash acquisition did not resume. Current F/M/Auth/Icons/Contracts/native-candidate graphs, StringDecoder identity work and M's Go references were not consumed. Proposed capture-output existence was not probed.

Oracle must rereview the complete actual corrected source, complete unchanged manifest/control transcript, before/after/delta and failure-evidence semantics before independently deciding closure. No automatic execution follows source acceptance: unchanged runner/tool/manifest witnesses, exact new-output absence/allocation and literal command/environment lease are still separate prerequisites.

All current capture, integrated types, schema/marker-ledger atomicity, adoption/producer, native/host/J5/profile/writer-COMMIT/privateSSR/restore/publication/integrated product and91/334 holds remain. **Hook-only return; no user policy poll or follow-on execution.**
