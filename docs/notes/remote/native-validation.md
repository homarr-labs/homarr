# Native oRPC validation

Updated 2026-10-16. This is local source validation in the isolated `feat/headless-hono-backend` worktree, not deployed service or external-provider acceptance.

## Existing coverage preserved

Migrated 35 existing API spec files to native `createCallerFactory`, `createApiRouter`, and `ApiError`. No cases were deleted or skipped. No new cases were added in this validation port. The separate native execution regression file is owned by the canonical API migration.

- The MCP reviewed inventory now reads native procedure metadata using `walkProcedureContractsSync`; its explicit query/mutation/secret allowlist remains intact.
- Unsupported MCP parser coverage uses a custom Standard Schema parser so it exercises the native schema boundary.
- REST/MCP integration-request parity uses native `OpenAPIHandler`, exercising the actual public HTTP route and authentication rejection.
- Old checks for uppercase codes in error messages now assert the native error `code` directly. Input validation checks retain the specific Zod issue and translated password mismatch key in native `data.issues`.
- The existing log subscription test consumes the native async iterator and still verifies retained history before buffered live messages, deduplication, and cleanup.

## Results

The final exact selection passed **35 files / 515 tests**, in **15.16 seconds**. This includes board access and mutations, users, groups, invitations, onboarding, API keys, integration permissions and cache invalidation, widget data isolation and partial failures, custom-widget persistence/authoring/privacy, Docker permissions and lifecycle targeting, log streaming, MCP inventory/schema/authorization, and OpenAPI/REST behavior.

Focused `oxlint` on the same 35 files completed with **zero errors**; existing warnings remain. `oxfmt` was applied only to those existing spec files.

The first invocation used the host's Node 25 default and could not collect because the existing better-sqlite3 binding was built for Node 24. The verified invocation uses the repository-pinned Node 24.18.0 without rebuilding shared dependencies. Integration update/delete checks need Redis; a dedicated disposable Redis server on 127.0.0.1:16389 provided real invalidation behavior without touching another developer service.

A separate exact-file run passed **23 / 23 additional existing tests**: 17 MCP HTTP protocol and argument-dispatch checks in `apps/nextjs/src/app/api/mcp/_protocol.spec.ts`, plus six integration failure/redaction checks in `packages/api/src/test/settle-integrations.spec.ts`. The protocol fixtures now execute native callers, retaining both modern and 2025 protocol modes, transformations, defaults, chained constraints, normalization, and caller isolation.

Independently compared the migration owner's `/tmp/homarr-native-baseline.json` and `/tmp/homarr-native-after.json`: **346 entries in each, exact equality**, including procedure paths, operation types, and input/output schema counts.

An additional exact-file run passed **13 / 13 existing Assistant safe-error tests** in `apps/nextjs/src/app/api/assistant/chat/assistant-tool-error.spec.ts`, using native `ORPCError` fixtures. Credential and URL redaction, safe custom-widget paths, authorization messages, retry guidance, and failure classification remain covered. The total existing-test evidence from these exact selections is **551 tests across 38 files**.

**API package typecheck passed**, exit code 0: `bunx tsc --noEmit --project packages/api/tsconfig.json`. All API specs remained included; no exclusions or error suppressions were added. The earlier `StateClient.ltrim` error was resolved by the state-backend owner. Focused lint on both additional migrated HTTP/Assistant spec files also passed with zero errors.

## Worker request session boundary

After the worker session seam moved to `@homarr/auth/request-session`, updated only three affected existing resource-test mocks (backup import and Custom Widget admin/configuration requests). Updated the MCP route fixture to native caller/context APIs.

A focused run passed **44 tests across four files**, including three new security regressions in `apps/nextjs/src/app/api/mcp/[transport]/route.spec.ts`:

- An authenticated server transport can bind a session to the exact Request and reach MCP without an API key.
- Forged worker-session/user-ID HTTP headers and a forged session cookie do not create trust or reach procedure execution.
- Copying a trusted Request, even with identical HTTP contents, does not copy its WeakMap session binding.

These regressions use the real `bindWorkerRequestSession`/`getTrustedWorkerRequestSession` implementations and native oRPC test procedures. The public MCP handler only reads the server-owned binding. Source audit found the only production binder call in `apps/worker/src/api.ts`; its caller in `control.ts` requires an owner grant first, and it strips inbound auth/session headers before binding. Focused lint passed with zero errors. The full Next.js typecheck passed with all tests included: `bunx tsc --noEmit --project apps/nextjs/tsconfig.json`, exit code 0.

## Reproduce the exact existing-file selection

Start a disposable Redis instance on the selected port, then run:

```bash
REDIS_IS_EXTERNAL=true REDIS_HOST=127.0.0.1 REDIS_PORT=16389 \
PATH=/home/habs/.local/share/mise/installs/node/24.18.0/bin:$PATH \
bunx vitest run --project api-node \
  packages/api/src/router/test/apiKeys.spec.ts \
  packages/api/src/router/test/app.spec.ts \
  packages/api/src/router/test/assistant.spec.ts \
  packages/api/src/router/test/board-add-item.spec.ts \
  packages/api/src/router/test/board.spec.ts \
  packages/api/src/router/test/custom-widget/definition-persistence.spec.ts \
  packages/api/src/router/test/custom-widget/preview-authoring.spec.ts \
  packages/api/src/router/test/custom-widget/workshop-error-privacy.spec.ts \
  packages/api/src/router/test/docker/docker-operation-results.spec.ts \
  packages/api/src/router/test/docker/docker-router.spec.ts \
  packages/api/src/router/test/group-onboarding.spec.ts \
  packages/api/src/router/test/group.spec.ts \
  packages/api/src/router/test/icons.spec.ts \
  packages/api/src/router/test/integration/integration-router.spec.ts \
  packages/api/src/router/test/integration/integration-test-stored-connection.spec.ts \
  packages/api/src/router/test/invite.spec.ts \
  packages/api/src/router/test/location.spec.ts \
  packages/api/src/router/test/log.spec.ts \
  packages/api/src/router/test/onboard.spec.ts \
  packages/api/src/router/test/section.spec.ts \
  packages/api/src/router/test/serverSettings.spec.ts \
  packages/api/src/router/test/update-checker.spec.ts \
  packages/api/src/router/test/user.spec.ts \
  packages/api/src/router/test/widgets/app.spec.ts \
  packages/api/src/router/test/widgets/calendar.spec.ts \
  packages/api/src/router/test/widgets/custom-api-v2.spec.ts \
  packages/api/src/router/test/widgets/immich.spec.ts \
  packages/api/src/router/test/widgets/options.spec.ts \
  packages/api/src/router/test/widgets/partial-integration-failures.spec.ts \
  packages/api/src/router/test/widgets/patchmon.spec.ts \
  packages/api/src/router/test/widgets/rssFeed.spec.ts \
  packages/api/src/router/test/widgets/timetable.spec.ts \
  packages/api/src/test/integration-request.spec.ts \
  packages/api/src/test/mcp.spec.ts \
  packages/api/src/test/open-api.spec.ts
```

These checks establish preservation of the covered local API behavior. They do not establish every real upstream integration/provider, multi-architecture image, public relay deployment, or hosted platform behavior.
