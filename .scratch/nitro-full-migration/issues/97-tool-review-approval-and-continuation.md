# 97 — Tool review, approval and continuation

## What to build
Deliver curated native/browser/research/authoring tool discovery, human review/ask-user, approve/deny and bounded continuation, with authorized domain changes and refreshed context visible in a real turn.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary ASSISTANT-04. Lazy curated tool groups, shared MCP ToolCatalog/Executor, browser allowlist, ask-user, app creation/review, board settings/widget review, same-origin navigation, integration research, docs index/Markdown research, Custom JSX authoring-controller consumer and redacted traces. Generic integration HTTP execution is #42, not this ticket or #104. Excluded Docs must continue the actual llms.txt and docs Markdown contracts; no remote rewrite or new docs product is assigned.

## Required contracts
Initially unaccepted: #122 curated discovery/execution/approval/error descriptors; #04 principal/resource/approval-key references; #96 turn continuation/cancellation; #35 app review/commands, #29/#32 board/widget commands, #42 generic request results and #102 authoring/evidence interfaces only for their tools; #22 navigation/invalidation. Contracts permit start before whole MCP/OAuth/provider tickets finish.

## Decision holds
Approval authority/key binding, browser allowlist and deployed docs/external-connection policy need explicit dispositions. Genuine AI SDK/version coherence remains held; external OAuth scope/consent/revocation choices apply only to those clients. No security recommendation is human approval.

## Ownership
Own Assistant-side review, executor consumer and continuation, not native mutations, remote Docs or Custom JSX persistence. COMPOSITION mounts; domain owners retain services. Production joins real policy/domain/evidence and actual turn behavior; #125 separately reconciles the product.

## Acceptance criteria
- [ ] Default autoapproval is off; key-derived or explicitly reviewed approval material binds the right conversation/request, and denied/expired/cancelled continuations neither mutate nor retry secretly.
- [ ] Current resource/admin/integration/placement checks run after approval through the same curated executor; internal/extracted paths cannot bypass authorization or duplicate a native mutation.
- [ ] Ask-user and native review, lazy discovery and same-origin navigation produce typed sanitized errors and correct domain/cache refresh; foreign-origin or unallowlisted browser tools are rejected.
- [ ] Actual remote docs index/Markdown consumption respects NO_EXTERNAL_CONNECTION, no redirects, bounded fetches and at most two searches; authoring enforces 40 steps/two retries/32,768 output tokens/600-second total/240-second step/90-second tool limits or explicit replacements.
- [ ] Focused future denied/expired approval, cancelled native tool, stale authoring evidence and disabled docs-search regressions verify no side effects using disposable services, not broad/live paid matrices.
