# 101 — Revision-safe interactive preview

## What to build
Deliver interactive workbench editing/completion/diagnostics/response trees, cancellable preview queries, journal inspection and simulated or explicitly enabled/confirmed live actions with revision-bound evidence.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary CUSTOM-03 plus transferred PreviewSessionStore ownership. customWidget.previewCreate, previewReviseTemplate, previewGet, previewRefresh, previewQuery, setPreviewLiveActions, previewJournal, previewAction (8). Workbench ports preview, queryPreview, simulateAction, setLiveActions, readJournal; own preview page and new/edit workbench contributions. Own expiring encrypted sessions, revision CAS/evidence/journal and request-limit adapters, rate/concurrency bounds and restart/invalidation duties. Redis is removed, not an optional preview backend.

## Required contracts
Initially unaccepted: #03 CAS/TTL/clock/acquire/invalidation primitives with bounds/errors; #04 ownership/crypto; #99 definitions, #103 scoped sources and #104 secure executor; #102 final-evidence consumer; #01 client-only contribution, #120 errors and #05–08 editor/modal ports. Accept individual revisions rather than requiring complete circular peers.

## Decision holds
Evidence-backed Redis-free atomic/security-state lifetime and store bounds; browser editor/runtime dependency coherence. Q11/Q12 only if selected backing/conversion depends on SQL; Q15 applies to session invalidation. No expired/stale evidence or permissive live-action shortcut is approved.

## Ownership
Own preview store adapter/state machine, workbench service/UI and evidence producer. #03 owns common atomics, #104 executor, #102 preview-origin persistence; COMPOSITION installs dependencies/mounts. Real store/executor and evidence-save join for production; #125 final convergence remains separate.

## Acceptance criteria
- [ ] Actual workbench/new/edit/preview clients show coherent diagnostics/completion/tree/journals and cancellable queries through typed authorized ports; browser-only editor code never runs in SSR.
- [ ] Server enforces owner/session, encrypted state, expiry, rate/concurrency and atomic revision rejection; new revision invalidates old evidence/journal eligibility and restart follows an explicit retain/invalidate policy.
- [ ] Actions default simulated; live/destructive execution requires explicit enabling/confirmation plus current policy. Abort, expiry or upstream error yields safe typed failure, no credential leak or successful evidence.
- [ ] Final-revision query/action evidence is consumable only at that revision; focused future stale-CAS, expired-owner, limit, simulation/live and cancel/error regressions prove no unsafe save or automatic ambiguous action retry.
