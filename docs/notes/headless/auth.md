# Headless authentication migration

- Extracted the existing Auth.js adapter, provider configuration, database sessions, permission enrichment and sign-in group synchronization into framework-neutral modules.
- `@homarr/auth/http` accepts standard `Request` objects and returns `Response` objects, with `/api/auth` explicitly retained as the Auth.js base path.
- The root `@homarr/auth` export is framework-neutral; `createHandlersAsync` now lives in `@homarr/auth/next`, with the sole frontend consumer updated. Next adapters retain React request caching and dashboard login redirects. Their cookie bridge continues to use Next's request context.
- The backend preserves all configured cookie names, cookie security attributes, session expiry, custom certificate fetches, LDAP/basic credential authorization, OIDC account isolation, explicit account-linking safeguards and OIDC/LDAP group synchronization.
- Headless browser login uses a minimal HTML `/api/auth/signin` form that obtains its CSRF token/cookie from Auth.js and posts to Auth.js' provider endpoints. This avoids exposing Homarr's internal empty OAuth placeholder. `/api/auth/session`, `/csrf`, `/providers`, `/signout`, and provider callback routes are handled by the same Auth.js core.
- The auth response forwards both Auth.js' own `Set-Cookie` headers and Homarr's database-session/color-scheme cookies. Session endpoint renewal remains handled by Auth.js.
- Request-session lookup reads the existing database token and recomputes permissions; like the prior `@homarr/auth/server` token helper, this lookup does not renew expiry. Clients that want sliding expiry can use `/api/auth/session` and retain response cookies.
- `AUTH_URL`/`NEXTAUTH_URL`, `AUTH_SECRET`/`NEXTAUTH_SECRET`, existing forwarded origin handling and `AUTH_COOKIE_PREFIX` remain supported. Deploy behind a trusted reverse proxy when forwarding public origin headers, as before.
- Documentation used: Auth.js core reference (<https://authjs.dev/reference/core>) through Context7, then installed Auth.js 0.41.3 sources to verify the exact API and Next adapter defaults.

Validation:

- Focused `@homarr/auth` TypeScript check passes.
- An ephemeral migrated SQLite fixture under pinned Node 24.18.0 exercised the Hono-independent HTTP entrypoint: sign-in HTML includes username/password, the internal empty provider is hidden, missing CSRF is rejected without a session, valid credentials create the existing HttpOnly/SameSite=Lax cookie, request lookup finds the user, Auth.js `/session` forwards renewal cookies, and expired sessions are rejected.
- The same fixture now passes under pinned Bun 1.4.2 after the shared SQLite driver gained Bun-native SQLite support. Additional Bun checks passed for bad-password rejection, trusted HTTPS proxy cookie security, sign-out cookie clearing and database-session revocation.
- An isolated auth HTTP bundle has no runtime Next/React import; Auth.js core supplies the authentication protocol.
- Live LDAP and OIDC identity-provider round trips were not available in this fixture; their original authorization, profile mapping and group-sync implementations remain shared rather than rewritten.
- No test files were added.
