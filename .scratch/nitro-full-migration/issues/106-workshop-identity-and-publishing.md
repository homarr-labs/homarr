# 106 — Workshop identity and publishing

## What to build
Deliver separate Workshop GitHub popup login/refresh/signout and reviewed publish/update with screenshots, vote/report and safe failure recovery using the existing remote service.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary WORKSHOP-02. Own Custom Widgets publish page, separate remote account controls and vote/report flows. PocketBase GitHub popup OAuth, LocalAuthStore changes/tab synchronization/refresh/signout, multipart File/Blob screenshots, publish/update ownership and local-definition/remote-submission revision relationship. Preserve actually consumed comment/moderation exports without inventing absent product pages. Homarr sessions and remote Workshop account identities remain distinct; Go callback/moderation runtime is excluded.

## Required contracts
Initially unaccepted: #105 remote schema/API/web/file configuration; #99 portable reviewed export; #01 browser/client-only and deployment URL/CSP contribution; #04 local publish authorization; #08 notification/errors and #22 navigation. Supply isolated account/token lifecycle to #108. Exact interface revisions allow peer-independent work.

## Decision holds
Actual remote OAuth/callback/origin/file contract and browser/SSR SDK coherence; deployment CSP and account-change policy. Q12 local/remote relationship conversion where formats change; detailed locale scope. This remote OAuth is not permission to choose #123 MCP consent/scope/revocation policy.

## Ownership
Own Homarr account/publish/interaction clients/services/UI, not Homarr login or Go callbacks/moderation. Keep authenticated server clients request-local. COMPOSITION owns central config/exports/dependencies. Real popup/remote publish and portable local export form the production join; #125 is separate convergence, and unavailable remote evidence remains held.

## Acceptance criteria
- [ ] Popup login/refresh/signout and tab/account changes work through the actual PocketBase contract without merging Homarr identity, putting tokens in SSR bootstrap or sharing authenticated server clients across users.
- [ ] Publish/update review serializes portable content and screenshot multipart fields correctly, checks new/update ownership and returns typed validation/auth/unavailable failures without false success.
- [ ] Vote/report reflects accepted remote outcomes and recoverable errors; account/token change invalidates only the intended remote-user state and aborts/clears incompatible requests.
- [ ] Local definition and remote submission/revision linkage survives intended updates/reload without modifying another definition; focused future popup-failure, client-isolation and invalid-publish regressions use disposable clients and leave excluded Go/Docs untouched.
