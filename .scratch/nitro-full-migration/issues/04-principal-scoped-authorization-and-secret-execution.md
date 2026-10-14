# 04: Principal-scoped authorization and secret execution

**What to build:** Public board reads and correctly delegated operations work for the actual caller, while unrelated grants, unsafe setup/admin actions and secret reads fail before data or decryption. This is the named policy/crypto expansion, verified through bounded real board/integration and setup/demo consumers.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Preserve selected global grants, inheritance/implication matrix and Viewer/Editor/Admin presets without a new role table; app-modify implies create, not independently granted use-all, and admin does not bypass demo/step/secret-destination restrictions.
- [ ] Board view/modify/full uses creator/public/current-user/group evidence with intended NOT_FOUND masking; integration query/use, interact and full remain distinct, including visible public-board query access without arbitrary upstream or management authority.
- [ ] Every selected integration's ACL evidence is filtered to the current principal/groups before native single/bulk execution; unrelated/foreign grants and missing/foreign-kind selections cannot authorize a caller, including anonymous callers.
- [ ] Authorize the same principal/resource/action before decrypting; explicit public fields, private-null/retain/clear semantics and destination/source/origin/network binding prevent generic plaintext secret maps or cross-destination reuse.
- [ ] Setup capability checks no-users/admin/claim/step independently and cannot become general admin access; self/admin app/search/media/Assistant/Custom JSX ownership guards and current capability hints agree with direct service calls.
- [ ] Future focused anonymous/user/group/admin/setup/demo and hidden-control-bypass evidence exercises real peer calls, denial/error mapping and policy/cache invalidation; production crypto rejects zero-key fallback and preserves ciphertext conversion obligations.

## Coverage

**AUTH-05**; identity ledger **I14–I17, I22, I27**, inheritance/matrix, board/integration constructors, self/admin/demo/setup guards, PasswordVerifier and SecretStore projection/codec boundaries. Evidence: [core AUTH-05](../drafts/core.md), [identity ledger/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md). #109 owns claim storage/step orchestration, #112 all-family conversion, and feature owners their domain actions/ACL UI.

## Required contracts

#01 immutable principal/setup/effects; #09 actual session identity; #02 exact resource/grant/secret repositories; #26 board and #40 integration principal-filtered projection/execution interfaces; #109 claim validation; #120–124 typed denial and invalidation contribution contracts only where used. Review consumer-specific revisions, not an entire auth or transport area.

## Decision holds

Disputed foreign-grant/source discrepancy, setup/demo exceptions, bulk/denial mapping, target-home rules and ongoing cached/stream reauthorization latency need recorded policy dispositions before affected exposure; unsafe undecided surfaces remain unavailable. Q12 affects crypto conversion, not unrelated matrix extraction. Approval to publish is not approval of every proposed bug correction.

## Ownership

Exclusive local policy/crypto writer; no session-cookie host, repository command/UI, shared schema, feature state store or transport ownership. COMPOSITION alone mounts contributions. Dispatch requires accepted used interfaces, applicable settled policy and exclusive allocation; publication runs no security checks.
