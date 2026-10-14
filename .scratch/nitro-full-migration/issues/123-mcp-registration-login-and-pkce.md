# 123: MCP registration, login and PKCE

**What to build:** An MCP client registers, discovers Homarr's authorization server/protected resource, continues through real login, exchanges an owned single-use S256 PKCE code, and invokes a tool using a durable hashed Bearer credential under approved scope/consent/revocation policy.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Own OAuth/discovery Fetch adapters and client/code/pending/rate-limit state machines: source H07 registration POST, H08 authorize GET, H09 token POST, H10 discovery GET/OPTIONS and D-OAUTH-DISCOVERY/challenge behavior. [Protocol ledger](../drafts/transports.md#http-registration-ledger--26-source-files-38-method-rows) identities are source checks, not required target paths or legacy discovery aliases. Login/session/providers and durable key records remain #09–12 domain work; no extra application procedure ownership is created.

## Required contracts

- #01 supplies effects/abort/contribution interfaces and the accepted trusted forwarded-origin/preset contract. #09 supplies real Auth.js Core Fetch session/login continuation/effects; #04 supplies policy/crypto; #12/#02 supply durable hashed credential issuance/revocation/repository interfaces.
- #03 supplies reviewed atomic consume/acquire/expiry/clock/bounds/lifecycle primitives. OAuth owns its store-specific client/code/pending/rate-limit semantics and backend classification. Redis is removed; suitable KV, SQL or singleton memory must prove required duties rather than promise generic persistence/atomicity.
- #122 supplies Bearer verification/challenge and one real curated tool host. Narrow accepted interfaces enable local store/service/DTO construction before entire peer completion. #09's bounded real Core Fetch credentials/LDAP bridge evidence is required for chosen login-resume integration and real end-to-end acceptance, not all local construction.

## Decision holds

Token scopes/authority/lifetimes, consent, registration durability, expiry/revocation, pending ownership, allowed origins and forwarded-origin trust require explicit policy. Q11 affects concrete SQL adapters; Q12 affects credential conversion; Q15 selects intentional re-login versus continuity. Freshly classify each state family's confidentiality, atomic single-use, TTL, bounds, restart and shutdown guarantees. Singleton and Redis removal do not settle them. No automatic durable-registration choice, refreshed authority or replacement auth platform is approved.

## Ownership and release joins

The OAuth owner exclusively owns local protocol and state adapters; #09–12 retain identity/provider/key services. COMPOSITION alone mounts canonical routes/discovery/challenges and changes central registries/manifests/exports/lock/build across #01/#21/#125. Real Core Fetch bridge, durable issue/revoke and client registration→login→exchange→tool are acceptance joins, not native blockers beyond #01. #125 also joins applicable LDAP/OIDC session lifecycle evidence. Fixture authentication cannot close production acceptance.

## Acceptance criteria

- [ ] Public registration validates bounded HTTP(S) redirect lists and approved IP-sensitive rate limits without an accidental admin/session prerequisite, unnecessary identifier retention or unsafe logging.
- [ ] Real authorize/login continuation uses proven Core Fetch effects and owned pending state, exact registered redirects, intended resource and S256; canonical and forwarded origins follow approved trust rather than arbitrary headers.
- [ ] Atomic single-use code exchange validates PKCE/redirect/resource/expiry, survives race/replay cases and never auto-retries ambiguous issuance; durable hashed tokens enforce approved authority/consent/lifetime/revocation without token/code/secret logging.
- [ ] Authorization-server/protected-resource discovery, challenges, CORS/preflight and failure/retry signals interoperate with the real client's new canonical routes; legacy aliases are not required for compatibility.
- [ ] Each ephemeral/durable state family has tested approved TTL/bounds/restart/drain behavior against disposable state, and focused mismatch/replay/expiry/privacy evidence plus real login→token→tool invocation is recorded. Unproven bridge/backend or unresolved policy keeps affected acceptance held.
