# Native worker frontend follow-up

Base: `2987562e8`. User follow-up, 16 October 2026.

## Scope

- Reproduce and repair the logs page disconnect/crash.
- Restore the normal grouped Homarr management navigation. Move “Your Homarr workers” from its floating modal into a management page; keep a compact header entry for switching workers.
- Let people join a worker-local organization by invitation and choose a native username/password, without a GitHub account. The worker stores accounts and membership; its administrator manages invites, accounts and sessions.
- Allow an explicitly configured browser to fetch public weather when a worker's internet access is disabled. Keep worker authorization and restrict this to fixed Open-Meteo endpoints.

## Implementation decisions

- Local organizations reuse native Homarr groups, users, password hashes, sessions and permissions. Hosted account organizations remain optional.
- `WORKER_ALLOW_BROWSER_WEATHER` defaults to false. The sample deployment enables it; arbitrary browser fetch forwarding is not introduced.
- Existing private setup links remain valid. Incoming credentials are captured in memory and removed from the address bar when opening the management page.

## Parallel work

- Management page and native navigation: GPT 6.1 Sol Medium.
- Logs diagnosis and repair: GPT 6.1 Sol Medium.
- Worker-local identity and invitations: GPT 6.1 Sol Medium.
- Browser weather adapter: GPT 6.1 Sol Medium.

## Validation

- Logs reproduction: `/boards` connected normally; navigating to `/manage/tools/logs` closed the worker connection with `Response credit window exceeded`. The browser now keeps each pull pending until data arrives. `/tmp/homarr-logs-credit-repro.ts` fails against the original source and passes with the fix; eight focused streaming/cancellation checks pass. Before screenshot: `/tmp/homarr-native-logs-before.png`.
- Browser weather adapter: 21 focused tests pass. Real Chromium cross-origin forecast and air-quality requests return readable CORS responses; shared normalizers parse both successfully.
- The local invitation/security case passes 30 assertions using a migrated SQLite database, a real worker and encrypted relay. It covers one-use invitation consumption, native password hashing, Everyone defaults/home board, returning login, native password-change invalidation, session revocation and local membership removal. PostgreSQL transaction branches typecheck; this follow-up's live account flow was exercised on SQLite.
- Source browser checks pass for joining and returning login from fresh browsers, native user administration, grouped navigation and a 360px layout without horizontal overflow. A placed native Weather widget displays real current weather and forecasts, with a direct browser request to the fixed official endpoint.
- Native browser QA caught the runtime opt-in returning a raw string when environment validation was skipped. The presentation contract now compares the exact environment literals and always returns a boolean.
- Next.js, API and worker typechecks pass. Changed-file formatting and lint pass; remaining lint warnings are existing warnings. The earlier full unit run is recorded in `test-audit.md`; this focused follow-up did not repeat it.
- Temporary source services on loopback ports 43106/43107 were stopped. Their task-only owner invitations and derived grants were revoked; original operator grants were preserved.

## Review

Parallel Standards and Spec reviews used Luna 6 Max and GPT 6.1 Sol Medium.

- Standards: native user labels were corrected to “user.” The separate worker navigation link list remains an accepted duplication suggestion; its current groups, labels and order match the native menu.
- Spec: registration now adds Everyone membership in the same SQLite/PostgreSQL transaction, preserving normal default permissions and home-board behavior. Local-user management links explicitly select their chosen worker before navigation. Both findings were re-reviewed and closed.
- The Spec reviewer also checked the logs pull/cancellation change and found no remaining confirmed issue in the reviewed changes.

## Demo images

- Frontend: `0626ad6257c79127623f19a62b79ec4a8bfc77c2d40341e4d4788b7bcb2bbd56`, 363,482,770 bytes (346.64 MiB).
- Worker: `2f828279d9bcebcce73de940d37aca38370a1fb2accb7dfbd7b68e425a8c1b8e`, 128,814,147 bytes (122.85 MiB).
- Both workers and the frontend were recreated with their existing persistent volumes; the account service and routing relay remain separate. Six services are healthy at the existing HTTPS demo address. The earlier 8443 demo is untouched.

## Final container acceptance

- Native management and the header switcher work in the rebuilt frontend.
- Weather displays real current conditions and forecasts through Chrome's direct Open-Meteo request.
- Logs stays connected with history and live events for more than 37 seconds, and still works after navigating away and back.
- A new local invitation, password signup and returning login from another fresh browser all work in the actual Bun worker container. The user appears in native Users management. Revoking sessions and removing local membership denies both browser connections on reload.
- The temporary QA user was deleted after confirming that it owned no boards or groups. Task-only owner invitations and derived grants were revoked. All task browser sessions were closed. An empty “Demo organization” remains for trying the local-user feature; existing users and owner keys were preserved.
- Screenshots beside this task's artifacts: `production-native-workers.png`, `production-native-weather.png`, `production-native-logs.png`, `production-native-logs-return.png`, and `native-workers-management-mobile.png`. Private browser evidence: `/tmp/homarr-native-production-browser-proof.md`.
