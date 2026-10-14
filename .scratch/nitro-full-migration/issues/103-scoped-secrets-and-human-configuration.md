# 103 — Scoped secrets and human configuration

## What to build
Deliver source/integration binding and secret set/clear, then an expiring human configuration request completed by exactly one authorized claimant without exposing secrets or ambiguous terminal state.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary CUSTOM-05 plus ConfigurationRequestStore. customWidget.secretSet, sourceConfigure, configurationRequestUser, secretClear (4); H18 token GET/POST and human token page, source editor/secret dialogs. basic/bearer/API-key-header/API-key-query; origin/network scope/complete auth binding, integration full-access resolution; ten-minute user-owned requests, pending/applying/completed and token one-applier claim/CAS/expiry. Behavior model customWidgetSecrets and scoped definition bindings; legacy retention remains #100, complete conversion #112.

## Required contracts
Initially unaccepted: #99 definition record; #04 admin/current-user/token/crypto/trusted-origin policy; #03 ownership/acquire/TTL/one-claimant atomics and clock; #40/#41 exact integration-source full-access-before-decrypt resolver; #104 runtime binding input; #120 typed errors and #01 native token Fetch contribution; #05–08 source forms. Accepted revisions need not imply whole issuer completion.

## Decision holds
Human-link origin/cookie/CSRF and request-restart/expiry policy; compatible secret retention disposition. Q11/Q12 concrete storage/conversion and Q15 session/revocation consequences remain held where required; external OAuth scope must not be inferred from local human configuration.

## Ownership
Own encrypted source/secret service, configuration store/state machine, token handlers and human UI; #03 supplies shared primitives, #04 crypto/policy, #112 cross-key conversion. COMPOSITION mounts central files. Real identity/store/runtime join is production acceptance, not a circular start barrier; #125 is final convergence.

## Acceptance criteria
- [ ] Authorization precedes decrypt/set/clear; source/configuration clients receive only safe configured metadata and typed redacted errors, never plaintext/ciphertext or secret-bearing diagnostics.
- [ ] Ordinary edits retain credentials only for compatible origin + network scope + complete auth binding; destination changes clear incompatible secrets and integration bindings never inherit local-source credentials.
- [ ] Expired/revoked/foreign tokens/users cannot read/apply; atomic pending→applying→completed allows one winner, idempotent terminal result and safe lease/failure recovery without duplicate mutation or returned secrets.
- [ ] Human/source screens explain origins/scopes/methods/permissions/actions and recover from validation/expiry errors; focused future origin-change, ownership, simultaneous apply and durable-secret mapping regressions feed #112 without touching real credentials.
