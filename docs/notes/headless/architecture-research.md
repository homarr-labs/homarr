# Headless backend architecture research

Research date: 2026-10-16. This note records verified upstream APIs and migration constraints. It is research, not a claim that deployment or endpoint acceptance has passed. The accompanying [inventory](inventory.md) records the original Homarr backend at commit `dc2662d9f2eaabf9b7ba14693f8ddda8a56aeeff`.

## Decision

Use Bun as the HTTP runtime, Hono as the request router, and oRPC v2 beta as the new typed RPC transport. Reuse Homarr's existing domain implementations and authorization boundaries. Move HTTP handlers out of the Next application into shared server packages, then mount them individually in Hono. Retain existing HTTP/tRPC contracts while the current dashboard is adapted.

This separation is feasible because Homarr already keeps integration clients, database access, cron jobs, Redis, permission checks, and most domain procedures in workspace packages. The difficult work is the remaining request context, authentication, streaming, deployment lifecycle, and frontend server dependencies; merely adding another listener does not finish the extraction. See [inventory](inventory.md).

## Verified oRPC version and integration

The npm registry reported `2.0.0-beta.44` for the `beta` tag of `@orpc/server`, `@orpc/client`, `@orpc/openapi`, and `@orpc/trpc`. `@orpc/server`'s stable `latest` tag remained `1.15.7`. Use exact matching beta versions and the lockfile so a later beta does not silently change the API. `@orpc/trpc` declares `@trpc/server >=11.4.2`; Homarr's baseline catalog has `11.18.0`. [`@orpc/server` metadata](https://registry.npmjs.org/@orpc/server/2.0.0-beta.44), [`@orpc/trpc` metadata](https://registry.npmjs.org/@orpc/trpc/2.0.0-beta.44).

The documented Hono integration uses `RPCHandler` from `@orpc/server/fetch`. Mount it as Hono middleware, pass `c.req.raw` to `handle`, supply the URL prefix and request context, and return its response when matched. Avoid reading the body in earlier middleware: the adapter requires an available Fetch request body. Use dedicated mounts before a legacy REST catch-all. [oRPC Hono adapter](https://orpc.dev/docs/adapters/hono).

Hono's Bun entrypoint accepts the application's Fetch handler. Bun is therefore the server runtime rather than an additional proxy to a Next backend. [Hono Bun guide](https://hono.dev/docs/getting-started/bun).

## Incremental tRPC bridge

The first-party `toORPCRouter` export from `@orpc/trpc` converts a tRPC router into an oRPC router. It allows existing procedures to become available through oRPC before rewriting their definitions. The documentation distinguishes this integration from a complete source migration to oRPC builders. [tRPC integration](https://orpc.dev/docs/integrations/trpc), [full migration guide](https://orpc.dev/docs/migrations/from-trpc).

Inspection of the published `2.0.0-beta.44` adapter establishes the following implementation facts:

- It visits the tRPC record and separately wraps lazy router entries with `ORPC.Lazy`; the baseline Homarr lazy namespaces are supported.
- The converted handler invokes the original tRPC procedure with the supplied context, path, signal, type, and raw input. Existing validation and authorization middleware still execute.
- It copies procedure metadata, exposes Standard Schema inputs and outputs, and avoids performing validation twice.
- It wraps async iterators, including tracked events; other output types pass through.
- It converts `TRPCError` to `ORPCError`. Homarr's `errorFormatter` additions do not automatically survive.
- Its tRPC `batchIndex` is fixed to zero. Do not assume original batch-index behavior from the bridge.

These are facts about the inspected release, not guarantees for future betas. [Published adapter source](https://registry.npmjs.org/@orpc/trpc/-/trpc-2.0.0-beta.44.tgz).

Use a server type such as `RouterClient<typeof orpcRouter>` from `@orpc/server`, with a remote client created by `createORPCClient` from `@orpc/client`. The published declaration includes lazy router inference. Keep runtime backend imports out of a frontend's client bundle by importing only the exported type. [Client documentation](https://orpc.dev/docs/client/client-side), [published server declarations](https://registry.npmjs.org/@orpc/server/-/server-2.0.0-beta.44.tgz).

### Compatibility gaps to handle explicitly

1. Three baseline subscriptions return tRPC observables: `log.subscribe`, `cronJobs.subscribeToStatusUpdates`, and `docker.subscribeLogs`. The inspected adapter only recognizes async iterable output. Convert these to async iterators with bounded queues and cancellation cleanup, or adapt them before exposing them through oRPC. Returning the observable object as JSON is not a successful migration. `widget.beszel.subscribeSystemStats` already uses an async generator. [Baseline subscription source](../../../packages/api/src/router/log.ts), [cron status](../../../packages/api/src/router/cron-jobs.ts), [Docker logs](../../../packages/api/src/router/docker/docker-router.ts), [Beszel](../../../packages/api/src/router/widgets/beszel.ts).
2. Existing `trpc-to-openapi` metadata is a different metadata contract from oRPC v2's OpenAPI plugins. Keeping the old REST handler preserves the old contract; moving its REST paths to `OpenAPIHandler` requires deliberate metadata conversion and schema comparison. The bridge offers `toTRPCMeta` for oRPC metadata, but that alone does not translate already-authored Homarr metadata. [Metadata integration](https://orpc.dev/docs/integrations/trpc).
3. Homarr frontend code reads formatted validation/domain error details. Preserve the existing tRPC error shape on its compatibility endpoint; define explicit error data for new oRPC clients. [Baseline formatter](../../../packages/api/src/trpc.ts).
4. The bridge still depends on tRPC source and runtime. It completes hosting extraction only when every procedure is served by the independent backend. A claim that tRPC itself has been fully removed would require rewriting builders, clients, MCP extraction, and schema generation too. [Migration guide](https://orpc.dev/docs/migrations/from-trpc).

## RPC, REST, MCP, and gRPC

| Interface              | Intended consumer                              | Migration position                                                  |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Existing `/api/trpc`   | Current TypeScript dashboard                   | Keep compatible while extracting hosting and SSR boundaries         |
| New oRPC HTTP endpoint | A replacement frontend or typed service client | New typed transport, same authorization and domain behavior         |
| Existing REST/OpenAPI  | curl, scripts, non-TypeScript clients          | Keep routes, API-key requirements, schemas, and status codes        |
| MCP                    | Agents and assistants                          | Keep discovery, resources, tools, OAuth, permissions, and streaming |
| gRPC                   | Clients requiring gRPC service contracts       | Separate optional adapter and schema effort                         |

oRPC is not gRPC. gRPC commonly defines service methods and messages in `.proto` files and generates clients/server interfaces. Adding it would require a corresponding service contract and transport integration. The headless design should keep domain services reusable so this remains possible, without claiming that an oRPC endpoint is a gRPC server. [gRPC introduction](https://grpc.io/docs/what-is-grpc/introduction/).

oRPC's comparison page is useful for capability differences, not a prediction of Homarr savings. Its benchmark uses minimal handlers; Homarr's SDKs, polling, caches, parsing, database, and Redis dominate a different workload. No framework benchmark establishes this project's container size or idle memory. [oRPC comparison](https://orpc.dev/docs/comparison).

## Deployment boundaries

Support two explicit process compositions using the same backend implementation:

- Headless: Bun/Hono backend, scheduled jobs, subscriptions, database, and Redis connectivity, without a Next server or dashboard assets.
- Full: the same backend plus the existing dashboard server behind a common origin. Route backend traffic directly to Hono; let Next render the dashboard during the transition.

Keep `apps/workshop` external. It is a separate Go/PocketBase service, not a dependency that should be embedded just to make integration brokering, widget data, or MCP work. Retain the Homarr-side Workshop client and operations so a configured service remains usable. [Workshop architecture](../../../apps/workshop), [Homarr client package](../../../packages/workshop).

The container must own migrations, data directories, certificate trust, Redis selection, user IDs, secret-file loading, signal propagation, readiness, and restore-triggered restart. Preserve these behaviors when changing the HTTP runtime. The current restore handler intentionally exits after swapping SQLite files, so an independent backend also needs an effective restart policy. [Run script](../../../scripts/run.sh), [entrypoint](../../../scripts/entrypoint.sh), [backup import](../../../packages/backend-handlers/src/backup/import.ts).

## Resource measurement plan

Measure the current full container, the migrated full container, and the standalone backend with the same database copy, integrations, cron configuration, target architecture, cache state, and sampling window.

| Question                          | Evidence needed                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| What consumes image space?        | Per-layer size plus runtime-file breakdown: Bun/Node, app JS, native modules, SDKs, translations, authoring metadata, migrations, optional assets |
| What consumes idle RAM?           | Container total and each process RSS/PSS after startup settles; distinguish embedded Redis from external Redis                                    |
| What does dashboard removal save? | Equivalent full/headless idle and representative request workloads, with the frontend stopped                                                     |
| What remains expensive?           | CPU/RSS under integration refresh, widget data, MCP discovery/tools, assistant streams, and bounded backup operations                             |
| Is cold start improved?           | Process start to listener, migration completion, subscription readiness, scheduler readiness, and first useful integration response               |
| Does bundling stay independent?   | Inspect shipped import graph for `next/*`, frontend rendering modules, and accidental editor/UI dependencies                                      |

Bun documents a Node compatibility surface, but compatibility is not a substitute for exercising Homarr's native modules and network clients on the actual image platforms. Track `better-sqlite3`, bcrypt, `ws`, Dockerode, LDAP/TLS, jsdom/DOMPurify, and migration/backup filesystem paths specifically. [Bun compatibility](https://bun.sh/docs/runtime/nodejs-compat).

## Research provenance

Context7 was attempted first as requested. Running `npx` inside this repository failed on its package override syntax before accessing documentation; running the library resolver from `/tmp` then returned a monthly quota error. No Context7 result was used. The task owner authorized the primary-source fallback; upstream documentation and published npm metadata/source were retrieved directly. Context7's suggested recovery is `npx ctx7@latest login` or a configured `CONTEXT7_API_KEY` for higher limits.

This research performed no builds, containers, tests, provider logins, or production changes.
