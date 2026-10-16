# Native oRPC REST and RPC transport

## Implementation

- The Bun/Hono backend uses native `RPCHandler` for `/rpc/*` and native `OpenAPIHandler` for the existing `/api/*` REST URLs.
- The worker no longer mounts a tRPC transport. REST no longer imports `trpc-to-openapi`; native oRPC procedures supply both transports.
- REST exposure remains explicit: only procedures carrying the established `openapi` metadata enter the REST router. RPC-only administration procedures cannot acquire new REST URLs through oRPC's default routing.
- Existing methods, paths and operation IDs are preserved. `protect` becomes the native OpenAPI security declaration. REST still authenticates through an explicit API key and does not accept ambient browser session cookies.
- REST query values use oRPC's schema-aware coercion plugin, preserving numeric pagination and boolean query arguments. RPC uses POST only and retains the existing browser origin checks.
- OpenAPI generation is asynchronous and uses oRPC's Zod converter. The schema checker and its existing focused test now await it. Native oRPC error responses replace the tRPC error envelope.

## Sources

The user reported that Context7 was unavailable. The implementation was checked against the current official oRPC v2 documentation and installed beta package declarations:

- [OpenAPI routing](https://orpc.dev/docs/openapi/routing)
- [OpenAPI handler](https://orpc.dev/docs/openapi/handler)
- [OpenAPI specification](https://orpc.dev/docs/openapi/specification)
- [Zod converter](https://orpc.dev/docs/integrations/zod)
- [Smart coercion](https://orpc.dev/docs/plugins/smart-coercion)
- [Hono adapter](https://orpc.dev/docs/adapters/hono)

## Verification log

- A manual Hono smoke with a migrated, temporary SQLite database passed on the pinned Bun runtime. It exercised actual hashed API keys and database sessions, app create/read/update/delete, numeric query coercion, malformed-number rejection, anonymous private-app denial, session-backed native RPC, cross-origin cookie RPC rejection, retired tRPC URL rejection, and exclusion of RPC-only procedures from REST.
- The native specification preserves all 42 existing paths and all 52 method/path/operation-ID combinations. OpenAPI and Scalar endpoints return valid JSON; all 630 local schema references resolve. The generated schema was refreshed through `scripts/check-openapi-schema.mts --write`.
- The existing `packages/api/src/test/open-api.spec.ts` passes (one test) with the pinned Node 24.18.0. The system Node 25 could not load the existing SQLite binary; selecting the repository's pinned runtime resolved that environment mismatch without rebuilding dependencies.
- Native OpenAPI initially decoded zero-argument GET input as `{}`, which failed existing `z.void()` schemas. A REST-only native client interceptor now converts that HTTP representation to `undefined`; business schemas and native RPC inputs retain their contracts.
- REST documentation declares native error responses for 400, 401, 403, 404, 409 and 500. User-preference body refinements remain present, including rejection of an empty patch or a patch containing only `userId`.

The smoke script and its logs are temporary local validation artifacts under `/tmp/homarr-native-rest-*`; they are not committed tests. This focused evidence does not establish complete integration, browser or production acceptance of the overall worker.
