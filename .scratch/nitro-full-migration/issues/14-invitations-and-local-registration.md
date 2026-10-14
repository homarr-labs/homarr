# 14: Invitations and local registration

**What to build:** Administrators issue/list/revoke bounded invitations and a guest consumes exactly one valid invitation to create a local user and reach branded login with recoverable localized feedback.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Issuance/list/revoke require admin and enabled credentials at the service as well as UI; list omits token and issuance reveals it once with inviter/expiry and a localized copy warning.
- [ ] Registration rejects existing sessions, missing/revoked/expired tokens and disabled credentials; username/password/confirmation normalization and validation match account creation without invented server complexity rules.
- [ ] User creation and invitation deletion occur atomically on both supported engines; zero-delete concurrent reuse, duplicate user and transaction failure roll back without consuming valid invitation content silently.
- [ ] Admin invitation list/create/revoke and public branded registration support direct links, loading/structured failure/retry and success→login rather than unapproved auto-login, with correct list/cache invalidation.
- [ ] Future focused expiry/competing-consumption/disabled-provider evidence uses disposable tokens and real target services, demonstrates persistence/reload and verifies hidden-control bypass denial without touching existing installations.

## Coverage

**ADMIN-02**, identity **I11**, `invites`, `invite.getAll/createInvite/deleteInvite` and `user.register`. Evidence: [core ADMIN-02](../drafts/core.md), [identity I11](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md), [endpoint invite/user census](../../../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md). Setup claim/studio is #109, not this registration flow.

## Required contracts

#01 guest/admin request contribution; #04 admin/guest guard; #09 provider-options/session-presence; #13 local account constructor; #02 atomic invite/user transaction; #17 public branding; #05/#08 localized form/notification and #22 login navigation. Each exact interface revision is reviewed independently; no need for all login/admin work complete to port the service.

## Decision holds

Credentials-disabled/LDAP-only registration eligibility needs consistent provider policy. Any intended auto-login or changed token expiry/delivery semantics needs approval; source success navigates to login. Q11 affects concrete SQL transactions; unrelated Q15 continuity does not hold a guest constructor by default.

## Ownership

Exclusive invitation/token-consumption/registration service and pages; reuse #13 credential constructor, #02 physical schema, COMPOSITION mounting. Dispatch needs applicable settled choices, accepted used contracts and exclusive allocation. Publication launches no registration or tests.
