# 63: TrueNAS connections

**What to build:** Configure/test TrueNAS and consume full storage/system/network/reporting health through pooled upstream connections with correct protocol fallback, bounded reconnect and safe disposal.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kind `truenas`: U/P or K native login/check, ws JSON-RPC-first/legacy fallback; system/pool/dataset/reporting/network native results and reporting variants. Projected cpu (percent),memoryUsed,memoryAvailable (bytes),uptime (seconds). Generic HTTP is unavailable. Preserve five-second request timer, IDs/auth/error/timeout and test eviction. Exact evidence: original INTEGRATION-025/research §§2.2–2.3/4–5. Upstream sockets are not a new public transport requirement or NAS administration license.

## Required contracts

Accept #40 revision-keyed connection/snapshot/query/trust/operation/result ports, #03 acquire/release/invalidate/drain primitives, #41 forms, #83 health consumption and #21 shutdown/lifecycle revisions plus #04 policy. Only relevant revisions gate dispatch; real state/secrets/policy/socket runtime and managed native health joins are release requirements. No all-provider or whole transport completion dependency is added.

## Decision holds

Exact socket/runtime/library/protocol support needs bounded evidence; singleton and Redis removal are already settled. Q11/Q12 apply to concrete persistence/conversion, Q15 applicable continuity; auth/pool/session restart lifetime and native URL/trust change handling remain qualified. Live API generations/auth/access/reconnect effects require later explicit approval, not arbitrary production probes.

## Ownership

Own TrueNAS client/wire protocols/provider pool-lease adapter and native composition/fixtures. #40/#03 retain shared connection/backing primitives, #21 COMPOSITION shutdown/assembly, #83 widget UI and #41 forms. Record exclusive files and no cross-owner socket closure; central manifests/exports are composition-only.

- [ ] U/P and K complete configure/test/masked edit/mode/remove/delete and authorized full native/Stats health UI consumption; enforce no generic HTTP and no broad NAS administration expansion.
- [ ] Focused fixtures preserve JSON-RPC-first/fallback protocols, reporting variants, request IDs/login/errors/five-second timeout/test eviction and exact projected units, with truthful empty/partial/unsupported results.
- [ ] Replace ID-only pool ownership with accepted revision/config/trust-aware acquire/release/invalidate/drain; a caller cannot close another caller's lease. Bound reconnect/pending requests and retain unsettled work until settlement.
- [ ] Query policy resolves before decrypt; config/edit/delete/trust/test failure fences old pooled auth/responses and safe diagnostics. Aborted operations release owned resources and shutdown drains owned sockets; missing source global disposal is not claimed already solved.
- [ ] Demonstrate actual target management/system-health and singleton lifecycle joins. Later explicitly approved live generation/auth/reconnect/credential/trust/repeated-open-close/shutdown evidence uses bounded reads/minimum rights; unknown compatibility remains held, not an automatic all-88 live pass.
