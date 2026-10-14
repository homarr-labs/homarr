# 109 — Setup claim, account/group and completion

## What to build
Own bounded first-run claim/current-step transitions and initial identity orchestration from welcome/account-or-group recovery through sign-in/setup/finish/home, consuming one exported restore panel rather than implementing another.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary DATA-01 plus transferred SQL onboarding claim/step orchestration. Leaves onboard.currentStep, nextStep; user.initUser and group.createInitialExternalGroup setup orchestration consume #13/#15 canonical constructors. H26 onboarding claim POST; own onboarding entry/parent, welcome→user/group→setup→finish, safe environment projection, sound/confetti and navigation. Behavior onboarding previous/current step and bounded claim hashes/expiry; no ordinary admin identity is fabricated. Parent consumes #112's single restore panel and #110 studio.

## Required contracts
Initially unaccepted: #02 conditional onboarding transaction/CAS/errors; #03 clock/expiry primitives; #04 scoped setup policy/claim crypto/trusted-origin context; #13 initial local account, #15 external-group constructor, #09/#10/#11 real sign-in ports; #110 setup-plan result; #112 exported restore panel/result and #22/#05–08 navigation/locale. Exact contracts, not complete circular peers, gate start.

## Decision holds
Q11/Q12 concrete state/conversion; Q15 login/session continuity; approved origin/cookie/CSRF, claim expiry/recovery and external-group setup policy. Auth.js Core bridge evidence is not assumed. Restore option waits for its applicable #112 policy only, not every optional feature.

## Ownership
Own SQL claim feature adapter, step orchestration/handlers and onboarding parent. #13/#15 retain account/group algorithms, #04 crypto/policy, #112 restore UI/apply and #110 setup planner. #02 alone writes physical schema; COMPOSITION mounts. Real claims/auth/setup-or-restore/finish is production acceptance; #125 is final convergence.

## Acceptance criteria
- [ ] Two clients racing for initial claim have one current authorized owner; cross-site, expired/revoked/foreign claim, wrong step and completed installation cannot mutate or reopen setup, with typed safe outcomes.
- [ ] Claim remains narrow setup capability with no ordinary admin grant; safe initial HTML/environment projection contains no credentials, claim token or secret state, and durable current/previous steps convert correctly.
- [ ] Both local account and external-group recovery use canonical identity services, real sign-in and recoverable failures; refresh/deep-link/finish/home transitions work without Next revalidation or fake identity.
- [ ] Onboarding parent hosts exactly #112's exported restore panel and #110 studio, handling completion/cancellation/readiness without a competing restore implementation; focused future claim-race, finished-state denial and both identity-to-finish regressions use disposable installations.
