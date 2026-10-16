# Frontend boundary extraction scratchpad

## Changes

- Next server components now call the backend over HTTP through the typed tRPC client. No runtime import of appRouter or createCaller remains in the RSC client.
- Existing browser tRPC hooks retain their protocol during extraction; All 26 existing Next API/discovery route handlers transparently stream requests to HOMARR_BACKEND_URL (default http://127.0.0.1:3002). The URL is read at request time so one frontend image can target a separate backend container. Only the same-origin discovery alias remains a Next rewrite.
- Board, user settings, server settings, assistant availability, invitation, onboarding setup, default groups, integration permissions, and proxy routing reads execute in backend procedures. Authorization and onboarding claim checks are enforced there.
- UI availability for credentials, database backups, Docker, Kubernetes, and group membership management uses backend runtime configuration.
- App and bookmark widget server prefetch now uses authenticated API queries instead of direct database reads.
- MCP consent presentation retrieves backend consent state over HTTP; ephemeral grant state remains in the backend process.
- Next instrumentation no longer starts cron tasks or a WebSocket server. Those belong to the backend runtime.
- Added an independent same-origin /rpc catchall proxy for oRPC clients.
- RSC authentication retrieves /api/auth/session over HTTP. Login provider metadata and logout configuration come from frontend.runtime, so the dashboard does not need database, encryption, Redis or provider credentials.
- The remaining use-server action revalidates a rendered Next page. It does not run a Homarr business mutation and is a presentation responsibility.

## Deliberate behavior change

The former dashboard RSC cross-request Redis snapshot persistence was removed. Integration response caching remains a backend responsibility, and server rendering still prefetches widget data over HTTP. First paint may wait for those backend queries rather than restoring a board snapshot in the frontend process. Preserving that optimization requires a backend-owned snapshot generator; exposing a frontend-submitted shared-cache writer would allow a browser to inject widget data for other viewers.

## Validation

- Next TypeScript check passed (`bun x tsc --noEmit --project apps/nextjs/tsconfig.json`). Auth package TypeScript and focused lint checks passed.
- Manual proxy checks passed streamed request bodies, request metadata and cookies, query forwarding, redirects, multiple response cookies, and SSE response streaming.
- Started the Next development process on localhost:13000 using an empty environment, preserving only PATH, HOMARR_BACKEND_URL=http://127.0.0.1:13002, NODE_ENV=development and NEXT_TELEMETRY_DISABLED=1. No DB, Redis, encryption, Auth.js or identity-provider secrets were provided.
- Through that frontend: /init, /auth/login, /api/health/ready, /api/trpc/frontend.routing, /.well-known/oauth-authorization-server and /rpc/frontend/routing all returned HTTP 200.
- No new tests were added. Updated the existing proxy test mocks to the backend HTTP boundary and ran only `apps/nextjs/src/proxy.spec.ts`: all 8 cases passed. Existing resource and MCP tests are maintained by their extraction owners.
- Development validation uses --hostname localhost. NextURL normalizes loopback addresses to localhost, while Next's router retains its bind address when deciding whether a rewrite is internal. Binding to 127.0.0.1 therefore caused internal locale rewrites to be fetched externally and repeatedly redirected.
- Production reproduced this after the deployment script changed the original bind address from 0.0.0.0 to 127.0.0.1. Restoring the original 0.0.0.0 bind in the full smoke container resolved the loop: root and /init returned 200, a DNS Host header returned 200, a French locale cookie rewrote internally to /fr/init, and the explicit /fr/init URL retained its canonical redirect to /init. The deployment owner is restoring the source default and rebuilding the image. No locale normalization workaround was added.
- A request now shares its onboarding/locale routing result, while concurrent cold starts still share the in-flight backend read. Failed reads clear their promise so the next request can recover.

## Remaining frontend responsibilities

Next renders routes, performs UI redirects and localization, manages its page cache, and proxies API requests. Its authorization-derived presentation checks use the backend session and backend capabilities. Actual persistence, integrations, mutations, authentication, cron scheduling, and transport servers belong to the backend.
