# 108 — Hosted Assistant identity and quota

## What to build
Connect separate Workshop identity to hosted model/quota controls and an eligible real Assistant turn, with exact-destination token forwarding and recoverable account/quota failure.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary WORKSHOP-04. Actual excluded-service OpenAI-compatible /api/ai/v1/models and /api/ai/v1/chat/completions, quota /api/ai/usage and X-Homarr-Provider-Token header; separate Workshop account, hosted configuration/quota/model/chat controls. These are external protocol obligations, not renamed Homarr RPC/MCP/operational stream contracts. Generic provider config and turn persistence remain #94/#96/#95.

## Required contracts
Initially unaccepted: #106 isolated account/token/signout; #105 deployment-resolved API URL; #94 provider/base-URL/capability projection; #96 request-header/abort/native stream interface; #04 principal/redaction and #08 typed quota/error notifications. Hosted join does not block generic/custom provider work or require entire peers complete.

## Decision holds
Actual remote token/quota/model schema and deployment origin/path contract; coherent AI SDK/stream client versions; signout/in-flight token behavior. No guessed quota, cost or remote OAuth scope is approved, and #123 external-access scope/consent/revocation choices remain separate. Relevant locale behavior is held where unknown.

## Ownership
Own Homarr hosted token/quota adapter and consumer controls; Go identity/provider/quota runtime and Docs are excluded. #94 owns generic configuration, #96 turns, COMPOSITION mounts/configures central resources. Actual account→quota→hosted turn is production acceptance; unavailable service remains unverified and #125 is final convergence.

## Acceptance criteria
- [ ] Actual account/model/quota clients show current user/signout/eligible states through validated remote results and typed unavailable/auth/quota errors, never invented balance or fake success.
- [ ] Token forwarding occurs only when configured base URL exactly equals deployment-resolved Workshop /api/ai/v1 origin/path; near-match/custom/local destinations, redirects and spoofed URLs never receive the token.
- [ ] Real hosted turn preserves #96 semantic stream/history and abort behavior; quota/auth failure retains stored configuration/conversation and never automatically repeats paid requests.
- [ ] Provider/account changes clear incompatible token/quota state and cancel in-flight work; focused future exact-versus-near-match and signout/abort regressions validate both browser controls and server forwarding without touching Go or real credentials.
