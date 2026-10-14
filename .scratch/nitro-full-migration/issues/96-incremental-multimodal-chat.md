# 96 — Incremental multimodal chat

## What to build
Deliver a usable authenticated panel/composer with text and supported attachments, semantic incremental turns, stop/error recovery and durable history reload through one coherent client/server protocol.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary ASSISTANT-03. H04 chat POST capability; AI UI-message SSE text/reasoning/source/file/tool/approval/step/error/abort, terminal marker and usage/timing/context metadata. Source protocol uses x-vercel-ai-ui-message-stream: v1 and [DONE]; a replacement may change spelling but must preserve semantics and convert histories. This is not oRPC iterator text or #124's operational stream framing. Own panel/composer/message/attachment adapters; assistantMessages persistence is through #95.

## Required contracts
Initially unaccepted: #94 provider/model/secret capability interface; #95 owned history/codec persistence; #97 curated executor/approval continuation; #01 signal-aware native Fetch contribution and client-only slot; #04 real principal/thread policy; #120 errors; #05–08 UI ports. #108 supplies hosted token forwarding only on the hosted path.

## Decision holds
Exact AI SDK and assistant-ui adapter compatibility, installed/catalog mismatch, and browser/SSR boundaries need bounded evidence. Q11/Q12 hold concrete history conversion; Q15 holds session continuity/revocation effects. Stream ingress/runtime deadlines require observed evidence; OAuth scope is not silently selected for external tool consumers.

## Ownership
Own turn orchestration, native handler descriptor and primary panel client, consuming rather than duplicating history/tools. COMPOSITION mounts and owns dependency/publication edits; #98 owns multisurface/widget bridge. Real policy, history, tools and shipping ingress join for production; #125 is separate final convergence.

## Acceptance criteria
- [ ] Actual client observes separately arriving semantic events rather than buffered final text; final/partial messages and reasoning/sources/usage/timing/context metadata persist and reload with correct ownership.
- [ ] Service and client enforce 12,000,000-byte body, 200 messages/parts, 16 browser tools, five attachments, 1,000,000-byte image and 350,000-byte text/JSON ceilings or explicitly reviewed replacements; images require model support and text attachments remain tagged.
- [ ] Stop/disconnect, slow readers and early/late upstream errors cancel resources and yield typed interrupted/error state; ambiguous failures never automatically repeat a paid turn or tool mutation.
- [ ] Application step/deadline enforcement survives actual native Fetch/client framing and shipping ingress; focused future incremental, abort, oversize and foreign-thread regressions use controlled disposable providers without real paid calls.
