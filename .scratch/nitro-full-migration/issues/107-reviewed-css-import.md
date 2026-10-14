# 107 — Reviewed CSS import

## What to build
Deliver Workshop CSS/theme browse/review → selected board/settings draft → preview → explicit save or discard, preserving existing durable CSS and failure semantics.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary WORKSHOP-03. Actual remote CSS/theme read/review contracts and import control in board/settings draft flows. Durable custom CSS remains boards/serverSettings behavior owned by #32/#17, not a new storage model. Old Homarr URLs may change; excluded Workshop remote content contract remains supported. No preview-authoring or publishing prerequisite.

## Required contracts
Initially unaccepted: #105 remote read/config/error revision; #32 board draft/save/invalidation and #17 instance settings draft authority for supported consumers; #28 draft/leave semantics where shared; #04 resource policy; #01 safe document/CSS contribution; #05–08 localized review/forms. Record exact consumer contracts rather than finished owners.

## Decision holds
Q13 where imported CSS enters the board draft; explicit CSS rendering/CSP and discard/dirty policy; Q12 durable CSS conversion and relevant detailed locale scope. No arbitrary execution path or automatic remote-content approval is implied.

## Ownership
Own Homarr remote CSS/review/import adapter, not settings parent page, durable save engine or document emitter. Board/settings owners host exported control; COMPOSITION assembles. Real draft→save/discard→reload is the production join; #125 closes final convergence.

## Acceptance criteria
- [ ] Actual remote selection/review client validates CSS/theme payloads and reports typed remote/review failure without replacing the existing draft or durable CSS.
- [ ] Accepted reviewed CSS updates only the chosen authorized draft and preview; close/discard/leave follows the approved dirty policy and leaves durable settings unchanged.
- [ ] Explicit authorized save persists converted CSS and refreshes the correct board/theme/document consumer after reload; import cannot bypass board/settings permissions or serialize remote tokens.
- [ ] Safe CSS rendering uses the selected application policy, not new executable content; focused future import→discard, import→save, denied-target and failed-read regressions cover real draft/service clients without modifying remote Workshop.
