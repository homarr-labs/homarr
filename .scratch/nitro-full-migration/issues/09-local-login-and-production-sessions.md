# 09: Local login and production sessions

**What to build:** Prove the bounded Auth.js Core Fetch credentials/LDAP session bridge, then deliver real local sign-in/sign-out, session reading/renewal and browser recovery with one request-local authority. If the candidate fails, return evidence for a decision instead of substituting fixture auth or an unapproved platform.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Disposable Core Fetch credentials/LDAP bridge evidence covers database-strategy constraints, request-local session creation/token/cookie effects, concurrent login, multiple Set-Cookie headers and late-failure cleanup; placeholder assertion bypass is not proof.
- [ ] Local lookup is lowercase/provider-scoped, preserves bcrypt hashes and configured lifetime, rejects invalid credentials generically and exposes only enabled provider options; LDAP-only direct local-login behavior follows the approved policy without invented complexity requirements.
- [ ] Every session reader enforces expiry/renewal/revocation consistently across render/direct calls/browser/live consumers, handling renewed timers and old-session conversion or approved one-time re-login rather than accepting expired rows.
- [ ] Trusted-origin/proxy/secure-cookie/CSRF and safe relative-return rules are service-enforced; branded login preserves loading/error/recovery and no-auto-loop behavior, with secrets absent from public options/bootstrap.
- [ ] Logout clears or masks private data before external redirect; focus/tab/identity/resource-policy changes refresh or cancel Query/render/live consumers without stale private replay or competing navigation.
- [ ] Future focused bridge/expiry/origin/login/logout evidence uses real target persistence and disposable identities, records failed candidate evidence honestly and demonstrates cold login, refresh and reload before protected exposure.

## Coverage

**AUTH-01**, identity **I01/I02/I06–I08/I10/I28**: `sessions`, `verificationTokens` behavior, credentials verifier/session creation, provider options, cookie/effect/origin exports and browser lifecycle. Evidence: [core AUTH-01](../drafts/core.md), [identity §§1/3/5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md). #10/#11 own LDAP/OIDC algorithms, #13 credential writes, #02 physical schema.

## Required contracts

#01 immutable request/principal/response effects; #04 verifier/policy; #02 identity/session transactions; #05/#08 login messages/issues; #10 LDAP verifier for the bounded bridge; selected #120/#124 and board consumers' identity-change/cancellation interfaces. Review only exact consumed revisions. Publish bounded bridge evidence separately from session interface acceptance; neither implies all providers complete.

## Decision holds

**Q15** old-session continuity versus intentional re-login is unresolved. Core-first is an investigation, not a proven production bridge; failure needs a new approved choice. LDAP-only local login, trusted proxy/origin/cookies, renewal/revocation and ongoing-stream reauthorization latency need dispositions; Q11 affects concrete SQL and Q14 the live consumer join, not isolated verifier work.

## Ownership

Sole local session/cookie/effect reader/verifier owner; #04 policy/crypto, #12 external-key authority and feature consumers their invalidation. COMPOSITION mounts the host/providers. Dispatch waits on applicable choices, accepted used revisions and exclusive allocation; publication performs no auth probes.
