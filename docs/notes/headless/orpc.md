# oRPC transport migration

## Implementation

`packages/api/src/orpc.ts` exports the complete application router through the first-party `@orpc/trpc` adapter, pinned to `2.0.0-beta.44`. The exported `ORPCClient` type is available to another frontend through a type-only import. The adapter recursively supports Homarr's lazy routers and invokes the existing procedure validation, permission checks, onboarding restrictions, integration access checks, and demo-mode restrictions.

`apps/backend/src/routes/rpc.ts` mounts these independent Hono endpoints:

| Endpoint                                | Behavior                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /rpc/<namespace>/<procedure>`     | oRPC v2 HTTP transport, including streamed subscriptions                         |
| `/api/trpc/<namespace>.<procedure>`     | Existing tRPC transport for the dashboard and legacy clients                     |
| `GET /api/openapi`                      | Existing REST OpenAPI document; `?format=scalar` normalization remains available |
| `/api/*` after explicit resource routes | Existing REST contract through `trpc-to-openapi`                                 |

RPC supports API keys and existing database session cookies. REST continues to authenticate exclusively through the `ApiKey` header. A bad API key does not bypass cookie-origin checks. Backend RPC requests carry the existing device, base URL, onboarding claim cookie, database, and trusted proxy identity context.

Unsafe cookie-authenticated RPC requests reject an unrecognized `Origin`, or `Sec-Fetch-Site: cross-site` when no Origin is supplied. Recognized origins are the current request/public origin and the exact comma-separated `BACKEND_CORS_ORIGINS` list. Non-browser clients without an Origin remain compatible. Authenticated API-key clients do not depend on ambient cookies.

The new RPC endpoint explicitly accepts POST only. This matches the default oRPC client and prevents a GET request from invoking a mutation. Legacy tRPC retains its existing query/mutation HTTP-method rules. CORS is configured once by the Hono application.

## Subscriptions

The migration adapter recognizes async iterable outputs but does not recognize tRPC observables. `log.subscribe`, `cronJobs.subscribeToStatusUpdates`, and `docker.subscribeLogs` now return an async iterable from the existing callback implementation. `widget.beszel.subscribeSystemStats` already used an async generator.

The shared adapter closes a pending reader on request abort, forwards asynchronous errors, and executes source teardown on cancellation, error, and completion. The Docker callback now also closes a stream whose initialization finishes after the request has disconnected. The log history and live-message deduplication behavior is preserved.

## Example replacement frontend or service client

```ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ORPCClient } from "@homarr/api/orpc";

const client = createORPCClient<ORPCClient>(
  new RPCLink({
    url: "http://localhost:3002/rpc",
    headers: { ApiKey: process.env.HOMARR_API_KEY! },
  }),
);

const info = await client.info.getInfo();
```

For browser session authentication, use the backend's Auth.js routes and configure Fetch with `credentials: "include"`. Set `BACKEND_CORS_ORIGINS` when the frontend uses a separate origin. Keep service API keys on the server side of a frontend; do not publish them in a browser bundle.

## Deliberate compatibility boundaries

This change migrates the HTTP host and provides a new oRPC transport. The procedure definitions remain authored with tRPC builders, and legacy clients continue to use tRPC. It does not claim to remove the tRPC dependency or provide protobuf/gRPC.

The old REST metadata contract is retained through its existing adapter. It is not silently treated as oRPC OpenAPI metadata. The REST OpenAPI document continues to describe REST endpoints, rather than every new `/rpc` procedure.

The first-party bridge maps tRPC error codes/messages to oRPC errors. Homarr's custom tRPC `errorFormatter` fields remain available through `/api/trpc`; they are not automatically serialized into new oRPC error data. New frontend code should use oRPC error codes/messages unless a procedure explicitly introduces typed error data.

## Focused verification

- Backend TypeScript graph passed after the shared header-helper signature was generalized.
- Focused lint and formatting passed for the new transport and subscription code.
- A recursive runtime inventory resolved every lazy router and confirmed exact path parity for all 346 current procedures, including the new frontend context namespace. This confirms registration and successful imports; it does not claim every procedure was executed.
- A manual Bun fixture against isolated SQLite and Redis verified public and protected oRPC procedures, API-key and cookie authentication, a nested widget lazy router, legacy tRPC, REST key-only authorization, OpenAPI generation, cross-origin cookie rejection, GET mutation rejection, log history SSE, cron status SSE, and subscription cancellation.
- A direct subscription smoke verified event delivery, cancellation during a pending read, synchronous completion, asynchronous error forwarding, and exactly one source teardown per subscription.
- The existing log subscription regression check was adapted to consume the async iterable without changing its history/deduplication assertions. Only `packages/api/src/router/test/log.spec.ts` was run: one file and one check passed.

The temporary fixture is `/tmp/homarr-headless-orpc-check.mts`. It uses synthetic credentials only. Its Redis checks explicitly enable Redis because `DISABLE_REDIS_LOGS` disables all shared Redis connections, including subscription channels.

These checks do not exercise an external Docker daemon, every integration provider, or a replacement frontend. Image/runtime acceptance is recorded separately by the deployment and root workstreams.

## Sources

- [Hono integration](https://orpc.dev/docs/adapters/hono)
- [tRPC migration adapter](https://orpc.dev/docs/integrations/trpc)
- [Client API](https://orpc.dev/docs/client/client-side)
- [Published adapter version](https://registry.npmjs.org/@orpc/trpc/2.0.0-beta.44)
- [Hono on Bun](https://hono.dev/docs/getting-started/bun)
