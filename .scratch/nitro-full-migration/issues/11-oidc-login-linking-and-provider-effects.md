# 11: OIDC login, linking and provider effects

**What to build:** Complete maintained-library OIDC login/callback/logout with safe account linking, provider-owned profile/group effects, trusted origins and recoverable failures, using a disposable protocol provider rather than real credentials.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Issuer discovery, verified ID-token/userinfo, compound account→user identity, configured client/scope/token method/proxy/forced-userinfo and display/auto-login work; token fields remain server-only and PKCE/state/nonce behavior is evidenced rather than inferred from cookie names.
- [ ] Opt-in credentials-email linking requires strict verified nonempty email, denies unverified/cross-provider merging by default and preserves credentials-owned password/profile/groups/boards/keys.
- [ ] Nested name/groups, preferred-username/email/picture fallback and required subject/name extraction preserve intended source behavior; the non-401 www-authenticate workaround and trusted Fetch/CA/callback origins are validated where needed.
- [ ] Actual array claims reconcile only existing allowed same-name groups unless approved local management applies; missing claim invents no removals, primary OIDC users receive permitted name/picture updates, custom data avatars remain, and theme effects are request-local.
- [ ] Existing/new/link/deny/missing-groups/failure/logout flows exercise real session/browser recovery with a disposable provider and future focused protocol/linking evidence; no handwritten verifier, arbitrary claim-derived grants or fake callback acceptance.

## Coverage

**AUTH-03**, identity **I04/I05 + primary I09**, `accounts` domain behavior, OIDC profile/provider/linking/post-login effects. Evidence: [core AUTH-03](../drafts/core.md), [identity ledger/§3/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md). LDAP effects remain #10's consumer of #15.

## Required contracts

#09 session/effects/origin/current provider configuration; #15 reconciliation; #18 trusted Fetch/CA invalidation; #02 accounts/user transactions; #04 current policy; #13 profile/avatar preservation and #05/#08 localized recovery. Reviewed interface revisions suffice for local work; real session/trust/provider joins are later acceptance, not reciprocal native blockers.

## Decision holds

Linking opt-ins, local-management/missing-claim/group/profile rules and trusted proxy/callback policy need explicit disposition. **Q15** affects session continuity and Q11 concrete persistence; selected maintained Core integration remains evidence-dependent. Auth OIDC login is separate from #123 MCP authorization.

## Ownership

Exclusive local OIDC accounts/linking/provider-effects owner; no session-cookie writer, trust-storage edits or central mounting. COMPOSITION owns host registration. Dispatch requires applicable decisions, accepted consumed revisions and exclusive allocation; publication executes no provider calls.
