# 95 — Conversations, branches and diagnostics

## What to build
Deliver owned thread creation/rename/model selection → persisted branch navigation → feedback, telemetry and bounded diagnostic copy/download. Retain rich history through explicit conversion rather than flattening messages.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary ASSISTANT-02. Leaves: assistant.listThreads, createThread, updateThreadModel, getThread, getGenerationTelemetry, renameThread, deleteThread, appendMessage, submitFeedback, deleteMessages (10). Own history/branch/detail/model/feedback/export flows. Behavior models assistantThreads and assistantMessages include parent relationships, IDs, timestamps, rich parts, stored codec, telemetry and feedback. Existing ai-sdk/v6 content is a conversion input; Markdown export is diagnostic, not an import/restore format or guaranteed confidential-text sanitizer.

## Required contracts
Initially unaccepted: #02 owned thread/message repository and transaction/reference errors; #04 ownership/demo policy; #94 usable model projection; #96 turn/message codec and incremental persistence interface; #120 client/errors; #22 navigation/invalidation; #05–08 localized feedback ports. Accept codec revisions without requiring peer completion.

## Decision holds
AI SDK/assistant-ui/history codec version coherence; Q11/Q12 concrete storage/content conversion; Q15 history/session cache consequences where applicable. Demo conversation mutation and redaction bounds require explicit policy disposition; detailed locale behavior is not inferred.

## Ownership
Own history commands/codecs and local branch/export/telemetry UI, not generation or shared composers. #02 writes schema, #112 joins archive conversion, COMPOSITION assembles central files. Real saved turns join #96 later; #125 owns final convergence.

## Acceptance criteria
- [ ] Converted ai-sdk/v6 histories retain branches/parent ordering, rich tool/source/approval parts, IDs or explicit remaps, timestamps, owner and chosen model; restart and actual history client reconstruct them.
- [ ] Foreign IDs cannot read, rename, append, delete, report feedback or inspect telemetry; demo permission does not broaden administrative authority, and typed denied/not-found errors leak no private content.
- [ ] Thread lifecycle, partial append/update/delete and model switches invalidate only the intended principal/thread; failed writes stay recoverable without duplicate content or branch loss.
- [ ] Copy/download includes bounded branch/tool/source/approval diagnostics with sensitive-key/token/URL-credential/data-URL redaction and an honest confidentiality warning; focused future old-history, ownership and export regressions exercise the target client/repository path.
