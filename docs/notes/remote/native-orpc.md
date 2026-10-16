# Native oRPC worker API

The canonical application API now builds native oRPC v2.0.0-beta.44 procedures. It no longer constructs tRPC procedures or imports `@orpc/trpc`. The optional dashboard compatibility adapter belongs outside the worker dependency graph.

## Domain migration

- `packages/api/src/procedure.ts` owns request context, native errors, operation metadata, authorization and onboarding guards.
- Shared business definitions now import `createApiRouter`, `ApiError` and the native procedure builders from that module. Handler context is oRPC's `context` and middleware input is its second parameter.
- The small operation builder retains Homarr's query/mutation/subscription vocabulary and records the operation kind in native metadata. Each finalizer returns an actual native oRPC `DecoratedProcedure`; oRPC executes parsing, ordered middleware, output validation and streams.
- Native builder composition preserves chained input/output schemas and each middleware's schema position. The module does not emulate tRPC transport or execution.
- Routers are plain nested objects. Lazy routers use native `Lazy`; local calls use `createApiCaller`/`createCallerFactory`, backed by `createRouterClient`.
- The eager MCP catalog walks native procedure contracts. Its schemas, allowlist, effect annotations and dispatch continue to use the canonical authorization path.
- Callback subscription sources now have a small transport-independent event interface in `subscription.ts`. HTTP streams remain cancellable async iterables.

## Verification performed

Before editing the canonical routers, recorded all original procedure paths, operation kinds, input schema counts and output schema counts at `/tmp/homarr-native-baseline.json`. Recursively walked the native lazy router after conversion and compared the complete inventory: **346 procedures, no additions, omissions or kind/schema-count changes**. This checks registration parity; it does not mean every external integration was contacted.

`/tmp/homarr-native-core-check.mts` passed:

- Real `info` procedure with anonymous denial and authenticated access.
- Real administrative cron procedure denied without the required permission.
- Composed input schemas retain transformations/defaults and reject invalid values; composed middleware receives the proper context and runs in order.
- Output schemas strip extra fields and reject malformed output.
- Native MCP catalog exposes **133 tools** with no diagnostics; real info tool dispatch preserves authorization.

A focused checked-in regression file, `packages/api/src/test/native-rpc.spec.ts`, passed all four tests on the pinned Node runtime: guard ordering, composed schemas/context, output stripping/native errors, and subscription cancellation cleanup.

The official native oRPC engine supplies validation errors. Existing frontend-specific tRPC error envelopes are handled only by its isolated compatibility adapter.

For native REST path/method/schema and HTTP validation, see [native-rest.md](native-rest.md). The worker build must reject emitted runtime dependencies on `@trpc/*`, `@orpc/trpc`, Next.js, React and dashboard UI packages.

## Sources checked

- [oRPC Hono adapter](https://orpc.dev/docs/adapters/hono)
- [Native middleware](https://orpc.dev/docs/middleware)
- [Native routers and lazy loading](https://orpc.dev/docs/router)
- [Async iterator streaming](https://orpc.dev/docs/async-iterator-object)
- The installed beta.44 declarations and implementation were inspected for the exact native procedure metadata, schema ordering and lazy router API.
