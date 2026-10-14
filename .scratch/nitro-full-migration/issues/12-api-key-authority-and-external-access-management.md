# 12: API-key authority and external-access management

**What to build:** Administrators create/reveal once/copy/revoke keys and use accurate target API/MCP setup instructions; external consumers receive explicit per-surface identity and approved token authority. Embed or link the sole #121 explorer rather than creating another specification or explorer owner.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Preserve historical key IDs/token bytes/bcrypt hashes/creator references through explicit conversion, reject malformed/missing/mismatched tokens, resolve creator's current permissions, list without hashes and revoke immediately; a synthetic one-day session projection is not stored token expiry.
- [ ] Manual creation is admin-only, reveals plaintext once and supports explicit copy; revoke/list/error UI refreshes without retaining secrets in settings/bootstrap or logs, including denied direct calls.
- [ ] Browser/render/RPC, external REST, MCP and live identity modes apply approved invalid-key fallback and key/Bearer precedence without accidentally granting ambient-cookie authority to REST/MCP.
- [ ] Shared issuer supports non-admin OAuth exchange only through #123's approved authority, not admin-create bypass; stored scope/audience/client/lifetime/consent/revocation behavior matches the chosen policy rather than pretending `mcp:tools` metadata already enforces it.
- [ ] API/MCP setup and optional onboarding consume actual origin/protocol/auth descriptors and #121's single explorer, demonstrate representative allowed/denied requests and recover disabled/unavailable states without exposing the internal procedure tree.
- [ ] Future focused reveal/revoke/current-grant/identity-precedence evidence joins actual #122/#123 dispatch; tool discovery never substitutes for per-call authorization, and private resources/prompts/actions remain gated.

## Coverage

Merged **AUTH-04 + OPS-07**, identity **I18–I21**; `apiKeys.getAll/create/delete`, key issuer/verifier, tools screen, one-time clipboard UX and API/MCP instructions/onboarding contribution. Evidence: [core AUTH-04](../drafts/core.md), [extended OPS-07](../drafts/extended.md), [identity ledger/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md). #121 owns public specification, sole explorer component and guarded standalone reference route; #123 owns OAuth flow/state/discovery/rate limits.

## Required contracts

#01 surface/request effects; #04 issuer/current grants/denial; #02 key repository; #09 login-resume/current session only where used; #121 embeddable explorer/specification/origin descriptor, #122 curated MCP connection descriptor and #123 exchange→issuer authority. #08 copy/confirm/notify primitives. Review specific revisions, not whole transport/OAuth completion.

## Decision holds

Token lifetime/audience/scope/client isolation, consent, invalid-key fallback/precedence, grant-change revocation latency and old-key conversion need decisions. OAuth secret-advertisement mismatch and absent consent are holds, not approved bugs. #123 must decide bounded store restart/expiry policy; Q15 affects login-resume integration only, Q11 schema additions only where chosen.

## Ownership

Exclusive key authority and external-access management owner; never duplicate #121 explorer or #123 OAuth implementation. #04 policy, #09 cookies, COMPOSITION central mounts. Dispatch needs accepted used revisions, applicable settled decisions and exclusive allocation; publication changes no tracker or credentials.
