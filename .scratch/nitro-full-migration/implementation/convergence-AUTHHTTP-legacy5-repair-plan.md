# Auth5 — bounded repair plan

## Recorded findings and validation

Both Auth5 reviewers are terminal. Native publication holds for fresh-lease deadline clamping and restoration of the authorization-check stage after finite output. Core/HTTP authority review confirms the same deadline defect and additionally holds the credentials/LDAP callback origin exemption. Core's string-return credentials seam, internal placeholder, typed negatives and explicit public Session DTO otherwise match the accepted plan.

Fresh `D2-AUTHHTTP-LEGACY5-1` receipts remain preserved: backend/nitro/owners each1, with four shared service diagnostics at405/543/572/782; lint1 with unsafe-finally errors at runtime378 and service845/847. D's iterator-local cleanup-helper follow-up is now independently source-accepted; do not edit D again. All product authors/reviewers are terminal and source is frozen. No native/application/adoption or data operation follows from this plan.

## Exact prospective ownership

Only `packages/auth/nitro/production-sessions/service.ts` and `sql-persistence.ts`, plus append-only disposition in the existing legacy5 publication report. Keep the other three Auth5 files, Native6, D2, K4, manifests, exports, assets, fixtures, gates, Backend and prior evidence unchanged. No tests, comments, casts, dependencies or new framework.

### Service corrections

1. Remove only `&& !credentials` from the ordinary POST same-origin condition. The verified OIDC callback exception remains; Core CSRF and original request forms/headers are unchanged. Origin validation still precedes scope allocation, body/Core/native work.
2. Remove the redundant expiry-margin check immediately after `observeIssuerSessionAsync`; the actual owner seam already throws before returning a margin observation. For signout retain the missing-observation rejection, removing only the impossible margin comparison. Do not widen Native6 types or admit margin as absence.
3. Preserve the existing managed OIDC fetch body, ledger/scope/task ownership and combined signals. Attach a fail-closed `preconnect` method with `Object.assign`, using a local synchronous denial function that throws `IssuerStagingError` without calling ambient fetch/preconnect or performing network work. Explicitly type the managed fetch arguments with `Parameters<typeof fetch>[0]` and optional `Parameters<typeof fetch>[1]`, since wrapping a function with `Object.assign` removes contextual parameter typing. The internal placeholder fetch remains an async denial and receives the same denied preconnect property. Do not edit the OIDC interface or copy untracked ambient fetch methods.
4. Move the existing unretained settlement body into one local async helper declared before the preparation try, capturing the same owner, scope, ledger, response and network-response set. Call it at the same `finally` site only when not retained. Preserve `Promise.allSettled`, all physical response/scope/ledger drains, the exact network-fault-before-preparation-fault priority, error values and retained/unretained distinction. Do not move cleanup after finally, suppress failures or change ledger sealing.

### Native-publication corrections

1. After genuine fresh admission in the legacy login/renew branch, derive a bounded fresh operation with the same admission signal and deadline `Math.min(originalDeadline, current.validity.hostDeadlineAt)` for stored-session leases; otherwise retain the original bound. Decrease `publication` through its existing clamp. Use that bounded operation for both `assertFreshResult` calls and both `current.assertCurrentAsync` calls. Preserve original proposal/scope/native operation bounds, confirmation-before-mapping, old renewal deadlines and the distinct Core/browser/stored expiry meanings. Never extend a deadline or reread native state to fabricate admission.
2. Set `publication.stage = "auth-check"` immediately after awaited finite legacy output returns, before the subsequent fresh-current, credential/profile/currentness checks. Keep output task settlement, confirmation and cleanup unchanged.

## Gates

Both independent plan decisions are terminal APPROVE: Core/wire/type reviewer `ses_ece04cd30ffenH0qfet0WLe9YW` and native-publication/physical-cleanup reviewer `ses_ecde97a6bffeX8t16q9PVdb2uy`. The coordinator now releases the exact two-file source repair and existing-publication append. No additional ownership, tests, checks, mounting or runtime/data authority is released by either plan decision.

Independent Core/wire and native-publication plan decisions precede the two-file source lease. Freeze and review the resulting delta before advancing; run fresh backend/nitro/owner typechecks plus focused lint only after all reached writers freeze, preserving earlier red receipts. Backend4 remains dormant and unallocated until Auth5 source/check acceptance. MAIN mounting, runtime validation, K-validator, file adoption, real restore and production cutover remain held.
