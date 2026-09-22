# v2 standards / high-risk boundary audit

Pinned revision: b90a704b22467d4aba681ff5f03c3a8a0d359d40. Comparison: origin/dev 0887bddb8642b5e697b800724b42f6608e74e464, three-dot diff. Read-only source review; no tests, builds, browser probes or exploits run. These are code-confirmed paths, not runtime reproduction claims. This is a focused review of high-risk seams, not proof that every line or scenario is correct.

## Confirmed current-release defects

### P1: Manual Custom Widget sources omit response credential redaction

Primary location: `packages/api/src/router/custom-widget/source-resolver.ts:72-76`.

For a manual source, `getSecrets()` becomes `auth.secrets`, but the returned connection has no `redactSecrets`. In `packages/custom-widgets/src/server/request-executor.ts:138`, the only redaction input is `input.redactSecrets ?? []`; no fallback to `input.auth.secrets` exists. The saved-integration branch supplies this field, so the two source types have different security behavior.

Concrete path: `packages/api/src/router/widgets/custom-api.ts:161-174` decrypts stored source credentials and spreads this connection into the executor; `getData` returns its data to board viewers. `packages/api/src/router/custom-widget/preview-query-procedures.ts` follows the same resolver and returns the data through MCP. An upstream diagnostic/error endpoint that returns the received API key or Authorization value exposes it to the viewer or AI model, despite credentials being stored separately and the documented non-return guarantee.

Safe reproduction recipe for a later authorized focused check: use a local echo server and a fake credential of at least 12 characters; configure a manual `apiKeyHeader` source and query an endpoint returning that header in JSON. Both preview and dashboard responses currently contain the fake credential instead of `[REDACTED]`. No real credential is required.

Fix: supply redaction values for manual sources consistently (including derived Basic-auth forms handled by the shared redactor), and retain the redaction at the common response boundary.

### P2: Saved integrations on 100.64.0.0/10 cannot use the new proxy or Custom Widget sources

Primary location: `packages/custom-widgets/src/server/network-policy.ts:36`; caller: `packages/api/src/router/integration/integration-http.ts:99`.

The entire shared-address range is unconditionally classified `blocked`. `resolveAndValidateHost` refuses blocked addresses even for the broadest `loopback` scope used by saved integrations. Consequently a saved HTTP integration at e.g. `http://100.100.100.100:8989` always fails before its endpoint is requested through `integration_request` or an integration-backed Custom Widget. A DNS name resolving into that range fails identically. This matters for self-hosted tailnet installations; native integrations do not share this new executor restriction.

Fix: distinguish administrator-selected private/shared overlay destinations from globally forbidden metadata/special addresses, using an explicit scope/allowlist policy if required. Do not simply remove all SSRF checks.

## Inherited release security blocker (not introduced by this diff)

### P1: MCP OAuth grants a third-party client a persistent API key without consent

Primary location: `apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts:120-135`; token creation: `apps/nextjs/src/app/api/mcp/oauth/token/route.ts:129`.

Unauthenticated dynamic registration accepts an arbitrary HTTP(S) callback. On an authenticated GET, authorize immediately creates a code for that client and redirects there; there is no approval screen or stored user grant. An attacker can register their callback and chosen PKCE challenge, then have a logged-in user follow the resulting authorization URL. The callback receives a code the attacker can exchange using their own verifier. Token exchange inserts an ordinary user API key, with no expiration or resource scope stored in that row. PKCE proves possession by the client that initiated the request; it does not supply user consent.

This branch modifies resource/base-URL handling but inherited the automatic-grant behavior from origin/dev. Keep this in the release audit, not the new-regression count. Fix with an explicit authenticated consent step bound to client, callback, PKCE and requested scope before issuing the code; assess token lifetime and revocation UX separately.

## Reviewed controls that look deliberate in source

- Arbitrary integration HTTP access requires full integration permission before decrypting secrets, including reads; names/types select a deterministic full-access match.
- Proxy endpoint rejects absolute URLs, credential-bearing URLs, cross-origin paths, traversal and excessive encoding; authentication headers override static headers; redirect-following is disabled for proxy requests.
- Shared executor pins validated DNS addresses, bounds bodies/responses/decompression, imposes request deadlines, and avoids logging upstream body/credential errors.
- Custom Widget dashboard reads validate item kind, actual board binding, board view access, definition enabled state and per-request board permission before execution.
- Preview sessions are user-scoped, live actions default to simulation, destructive requests require confirmation, and request limits are applied to preview/dashboard execution.
- Transfer flows export secret metadata rather than decrypted values; legacy migration retains compatible credentials only under matching source origin/auth contract.
- Assistant chat checks session and thread ownership, hides Custom Widget tools from non-admins, uses the authorized tRPC caller, and configures mutation approval separately from tool descriptions.
- Workshop collection rules constrain ownership/admin fields; submission optimistic concurrency is enforced by a SQLite compare-and-swap trigger, not merely the hook's minimum-revision check. Email and social metadata helpers escape untrusted text.

## Unverified / remaining acceptance work

No end-to-end proof of OAuth flow, native Assistant approval/denial, quota enforcement under concurrency, Workshop OAuth migration or email delivery, exact integration-provider authentication behavior, interpreter sandbox resistance or every widget component's visual behavior. No automatic style/tooling gate was run. These limitations should remain explicit in the overall report; test file presence is not passing evidence.
