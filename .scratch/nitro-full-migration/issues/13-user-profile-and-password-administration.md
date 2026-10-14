# 13: User, profile and password administration

**What to build:** Users and administrators manage eligible accounts/profile/avatar/password with correct self/admin/provider/demo restrictions and approved session consequences; supply reusable credential services to offline recovery #119, not a second CLI entrypoint.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Preserve IDs/provider ownership/hash values and safe list/search/selectable/detail projections; credential-only name/email/password changes are server-enforced while external users retain bounded custom-avatar capability.
- [ ] Local create normalizes trim/lowercase, validates conflicts/password/confirmation and eligible groups; self password change requires the prior password even for admin, while resetting another user does not, with demo restrictions enforced on direct calls.
- [ ] Implement approved session/key survival/revocation and last-admin/lockout/recovery policy consistently between HTTP changes and #119's offline credential services, without claiming the source HTTP path already revokes sessions.
- [ ] Delete/cascade/owned-resource and avatar null/type/size/ownership outcomes are deliberate, with metadata-safe ACL selection and no plaintext credential or private media leak into bootstrap.
- [ ] Real list/create/general/security/profile flows support direct links, structured issues/loading/error/success and Query/loader invalidation, then demonstrate persistence/reload; future focused self/admin/provider/password-denial evidence uses disposable identities.

## Coverage

**ADMIN-01**, identity **I12**; `user.create/setProfileImage/getAll/selectable/search/getById/editProfile/delete/changePassword`, users identity/profile fields, account constructor and credential/recovery algorithms. `user.initUser` orchestration is #109-owned and consumes this constructor. Evidence: [core ADMIN-01](../drafts/core.md), [identity I12/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md), [endpoint user census](../../../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md).

## Required contracts

#01 request/contribution; #04 self/admin/demo/verifier; #09 session revocation/effects; #02 user/session transactions; #15 group assignment eligibility; #113 avatar input/media security; #05/#08 issues/forms and #22 list/navigation invalidation. #119 consumes credential/offline-recovery services; reviewed exact interfaces suffice, not completed peers.

## Decision holds

Password reset/change current/other-session revocation, key survival and last-admin/recovery rules remain explicit choices; deletion ownership/cascade discrepancies need disposition. Q15 affects selected session consequences; Q11 concrete repository adapter. No real installation recovery is authorized here.

## Ownership

Exclusive user/profile/credential service and UI modules; preferences #16, registration #14, setup orchestration #109, CLI entry #119, physical users schema #02. COMPOSITION publishes exports/executable. Dispatch requires exclusive allocation and accepted used revisions; no checks during publication.
