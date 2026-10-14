# 98 — Shared runs across chat surfaces and widget

## What to build
Share one intended conversation/run/history across floating panel, sheet/other supported chat surfaces, multiple board Assistant widgets and Spotlight while preserving independent composers and exactly one run notification lifecycle.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary ASSISTANT-05 plus transferred WIDGET-EXTENDED-BRIDGES assistant scope. Primary widget kind assistant has zero direct options. Own its kind-local renderer/slot/placement bridge, saved placement eligibility, local schema/descriptor contribution and actual board host consumption. Shared messages/run/history; local draft/attachments/focus/selection per surface/conversation; inactive cache baseline 12; model/preferences, human-question portal, tool/source/Markdown/directive/image rendering, export/feedback/speech and waiting/completion/error signals. No second chat engine or history repository.

## Required contracts
Initially unaccepted: #95 history/branch interfaces, #96 run/attachment/abort, #97 tool/question/approval interface; #67 kind/renderer metadata, #68 common options, #29 placement/dialog and #26/#27 authorized item host; #37/#39 Spotlight registration; #01 client-only/root slot and #08 notifications. Exact accepted ports, not whole peer completion, gate start.

## Decision holds
AI SDK/assistant-ui composer version coherence and private-internals replacement evidence; Q13 only where saved placement command timing depends on it; Q15 principal/session transition; detailed locale/focus behavior where needed. No library replacement or mirrored-draft policy is invented.

## Ownership
Own Assistant surface adapters and primary assistant widget bridge transferred from the removed ticket. #67/#68 receive descriptors and retain their registries/common option service; #29 hosts placements; Spotlight owners mount local contributions. COMPOSITION alone edits root/providers/exports/dependencies. Real panel + widgets + Spotlight join for bounded acceptance; #125 is final convergence.

## Acceptance criteria
- [ ] Place/save/reload an authorized assistant widget through the actual board host and attach panel/Spotlight to the same run without a second execution/history authority; missing or denied placements fail safely.
- [ ] One surface's turn appears everywhere while other drafts/attachments stay independent; conversation/model/preference changes retain correct selection, focus/scroll and a bounded inactive composer cache.
- [ ] Pending approval/question ownership uses one portal; rendered tools/sources/directives/images, copy/download, feedback and speech start/stop work on applicable surfaces, with safe missing-speech fallback.
- [ ] One logical waiting/completion/error notification survives unmount/hydration/reconnect without replay or lost terminal state; focused future multisurface and saved-widget regressions cover duplicate runs, private state clearing and draft isolation.
