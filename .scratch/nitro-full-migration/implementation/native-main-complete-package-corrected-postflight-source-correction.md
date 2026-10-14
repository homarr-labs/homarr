# Native main — SOURCE-ONLY two-P2 correction: PARTIAL

## Outcome: corrected pair NOT authored; no execution or approval

The complete original source cannot be copied verbatim through patch within this turn's remaining capacity. This uses the lease's explicit source-only partial fallback; no copy tool, transformation, command or executable workaround was used. Only this new repository handoff was written via patch. No corrected executable or operation manifest exists from this worker's activity, and neither correction has been applied.

Authority: coordinator's exact two-P2 source-only correction allocation under the user's goal, following B's full1646-source/110-manifest/72-handoff review: INCORRECT, exactly two P2 findings and no others; ROSTER512/514 are retained references, not edited here.

Original source reference remains `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-corrected-postflight-source-20261012-author01/postflight.mjs` (original1646). Original adjacent110-line `operation-manifest.md` and original72-line `.scratch/nitro-full-migration/implementation/native-main-complete-package-corrected-postflight-source-plan.md` remain untouched. No original-author-packet edits, retrospective notes or diff files were written there. Preservation here means no writes by this worker, not a newly measured checksum or continuous preservation claim.

The uncreated corrected destination remains `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-corrected-postflight-correction-20261012-author01/{postflight.mjs,operation-manifest.md}`. Exact directory/file collision globs returned no matches initially and again before this handoff. This handoff's exact filename glob also returned no matches initially and immediately before creation. Glob results are not stat, identity, mode, pin or physical prelaunch admission evidence.

## Exact proposed P2#1 hunk — original437–440

Before, as read from the original source:

```js
  for (const [file, expected] of files) {
    const size = Number(expected.size);
    admit(file, size, expected, expected.sha256);
    read(file);
```

After, proposed only; NOT applied:

```js
  for (const [file, expected] of files) {
    const size = Number(expected.size);
    requireFact(typeof expected.sha256 === "string" && /^[a-f0-9]{64}$/.test(expected.sha256), "PIN_GRAMMAR");
    admit(file, size, expected, expected.sha256);
    read(file);
```

This reuses the existing `requireFact`, SHA256 grammar and `PIN_GRAMMAR` error idiom at original198–201. Every retained inventory FILE row must have a valid64-character SHA256 before admission; missing, null or invalid values must STOP rather than reach null-pin admission, skipped hash comparison or candidate current-equality. Explicit unpinned bootstrap control reads remain unchanged. This does not fabricate missing historical controls or convert UNAVAILABLE before evidence into equality.

## Exact proposed P2#2 hunk — original1636–1641

Before, as read from the original source:

```js
  } catch (sinkError) {
    borrowedStdout = "uncertain";
    recordSecondary("terminal-stdout", sinkError);
    process.exitCode = 1;
    try {
      terminal({ kind: "terminal-sink-error", primary, secondary, borrowedStdout, activeOwnedCount: active.size }, 2);
```

After, proposed only; NOT applied:

```js
  } catch (sinkError) {
    remember(sinkError);
    borrowedStdout = "uncertain";
    recordSecondary("terminal-stdout", sinkError);
    process.exitCode = 1;
    try {
      terminal({ kind: "terminal-sink-error", primary, secondary, borrowedStdout, activeOwnedCount: active.size }, 2);
```

Existing `remember` at original103–105 retains only the first primary. Calling it before secondary/fallback reporting makes a first terminal stdout sink failure primary while preserving any earlier primary. Single-attempt owned-close behavior, borrowed-stream ownership, uncertainty retention and secondary bounds are unchanged by this proposed hunk.

## Comparison scope and pending gates

Only the two original hunk ranges above were compared for these proposals, with the existing validator/error idiom and first-primary behavior read as context. No full corrected1648-line source was materialized or compared; prospective line shifts are not actual corrected-file coordinates. No full-file checksum, first source pin, current mode/identity, syntax validity or independent acceptance is claimed. The original1646 reference remains the source of truth, not a corrected candidate.

No new manifest was authored. A future complete corrected pair must retain the original110-line manifest except necessary source-coordinate/provenance/corrected-line/delta references, with the same proposed Q root `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-corrected-postflight-result-20261012-evidence01`, fixed caps and closed builtin closure. No launch entry is allocated by this partial handoff.

No unrelated style/type changes, opaque Dir FD changes, ceiling changes, historical repairs or invented before-controls are proposed. Those retained limitations remain admission/acceptance holds, not additional B bug findings. Original prepared F, historical packets, failed frozen partial, witnesses, preparation author packet,40pins, product data and immutable preview were not modified.

Full corrected-source authoring remains incomplete. Complete independent B rereview must precede separately leased focused lint/type-or-applicable-JS validation, first pin/prelaunch and ONE postflight execution; none is PASS. No command/stat/hash/Node/helper/sourceContext/syntax/lint/typecheck/SQL/network/Git/PID/copy-tool/agent/physical validation occurred. No reviewer dispatch or polling occurred.

Active32 suffix/main sealed-package static completion remains disjoint. All native/main-owner complete-types/RuntimeContribution/Contracts augmented baseline/six actual arrays/host/J5/COMMIT/privateSSR/restore/publication91of334 holds remain unchanged. Hook-only.
