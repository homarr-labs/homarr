# MCP and assistant HTTP migration

## Scope and implementation

- Extracted existing MCP transport, protocol, resources/prompts, tool discovery,
  OAuth registration/authorization/token handlers, grant validation, cookie binding,
  and in-memory stores into `packages/api/src/http/mcp`.
- Extracted the complete assistant streaming handler and helper modules into
  `packages/api/src/http/assistant`; browser tool contracts and stream metadata now
  live with their server consumer and remain reexported for the dashboard.
- Original Next helper paths retain compatibility reexports of extracted
  behavior. Next route entrypoints now forward to the backend through the common
  frontend adapter. Their implementations no longer belong to the dashboard.
- Added thin Hono route groups in `apps/backend/src/routes/{mcp,assistant}.ts`.
  Routes retain raw Fetch request/response bodies, status codes, protocol headers,
  response streaming, request cancellation, tool policy, and existing limits.
- Added backend-owned `/auth/mcp` consent and `/auth/mcp/error` pages. The consent
  form preserves browser/session binding, explicit allow/deny, account/client and
  callback display, effective permissions, administrator warning, persistent
  credential lifetime warning, POST origin checks, and consent token validation.
  Native sign-in uses `/api/auth/signin`; the Next compatibility handler defaults
  to its existing `/auth/login` path.
- Added backend consent-state JSON at `/api/mcp/oauth/consent` for the paired
  dashboard. It derives browser binding and user session from the HTTP request,
  so the dashboard never owns OAuth pending state.
- Added discovery routes for `/.well-known/*`, `/well-known/*`, and the existing
  MCP transport discovery alias. CORS and metadata values preserve the previous
  route behavior.
- Centralized the existing application environment schema in API HTTP ownership.
  Added a dependency-light translation entrypoint for plain HTTP strings with
  existing locale JSON and English fallback; it requires no Next request context.

## Preserved boundaries

- MCP authenticates an existing scoped API key or OAuth-issued bearer credential.
  Assistant uses the existing database browser session. No new tools or permission
  grants are introduced.
- Tool errors retain existing sanitization. Existing request limits, authentication
  rate limits, registration/token limits, PKCE S256, one-time authorization codes,
  callback validation, consent cookies, duplicate field rejection and no-store
  responses remain in the same extracted implementation.
- OAuth registrations and pending grants remain process-local and expire/restart
  as before. Horizontal replicas would need a shared grant store and coordination;
  extraction does not silently change this behavior.
- Assistant provider behavior, approval signing, cancellation, timeouts, metadata,
  document research and Custom Widget lifecycle policy are retained.

## Validation log

- Source scan: extracted MCP/assistant HTTP code contains no `next/*`,
  `next-intl/server`, application aliases or `server-only` imports.
- Formatting applied to changed files. No new tests or test cases added. Existing MCP/OAuth route specs now import the extracted owner rather than
  the frontend proxy; no cases were added.
- Focused API typecheck initially found only unrelated auth/log migration
  integration errors, subsequently fixed by their owners. Backend typecheck passes.
- Focused lint passes for extracted MCP/assistant HTTP code, Hono route groups,
  and the neutral translation entrypoint/mapping.
- Pinned Bun 1.4.2 with isolated migrated SQLite and Redis: 22 manual checks pass
  for MCP unauthorized challenge, removed legacy SSE, OAuth discovery and alias,
  CORS/OPTIONS, registration/security headers, backend native sign-in and CSRF,
  browser/session consent resumption, HTML escaping and administrator warning,
  CSP, dashboard consent state, cross-origin rejection, explicit approval and
  callback state, PKCE token issuance, code replay rejection, real bearer-auth
  MCP initialize/list/call (board query), and assistant auth/body/provider gates.
- A separate migrated SQLite file and loopback-only compatible model endpoint
  verify seven assistant streaming properties: UI-message SSE, provider request,
  text/finish/telemetry, persisted thread metadata, sanitized upstream failures,
  cancellation closing the stream and aborting provider fetch, and a successful
  subsequent response. No external provider requests were made.
- Temporary manual scripts: `/tmp/homarr-headless-validation/mcp-smoke.ts` and
  `/tmp/homarr-headless-validation/assistant-stream-smoke.ts`. Synthetic shared
  fixture users, sessions and issued API keys are removed after execution.
- Live LDAP/OIDC callbacks and real external AI providers were not exercised.
  Their implementations are preserved behind the framework-neutral Auth.js and
  assistant provider layers; the loopback model is transport proof only.

## Final focused checks

- Existing MCP transport route spec: 18/18 passed. Existing OAuth flow integration
  spec: 53/53 passed, including strict Host validation, forged forwarding origin
  rejection, installed Next request adapter compatibility, PKCE and binding cases.
- The OAuth suite was repeated after correcting HTTPS reverse-proxy protocol
  resolution. Consent origin validation and Secure binding-cookie attributes now
  agree on BASE_URL, otherwise normalized X-Forwarded-Proto, otherwise the request
  URL protocol. Host remains authoritative; X-Forwarded-Host cannot substitute for
  the validated consent authority.
- A second full manual flow using an internal HTTP URL, public HTTPS Host and
  X-Forwarded-Proto with BASE_URL absent passes 23 checks, explicitly including
  Secure binding cookies and same-origin approval. Script:
  `/tmp/homarr-headless-validation/mcp-proxy-smoke.ts`.
- Neutral translation package typecheck passes. Literal locale import mapping
  lets Bun include locale chunks without Next dynamic-import context handling.
