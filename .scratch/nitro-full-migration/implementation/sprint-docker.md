# Docker router sprint — frozen source preparation

## Outcome and exclusive files

Eleven native oRPC handler drafts in `createDockerProcedures`; zero mounted or accepted Docker leaves. No shared registration, contribution, context, procedure, error, port-map, legacy source, manifest, lock or accepted-334 ledger edits.

- `packages/api/src/nitro/routers/docker.ts`
- `packages/api/src/nitro/routers/-docker/resources.ts`
- `packages/api/src/nitro/routers/-docker/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-docker.md`

## Exact source leaf inventory

All leaves retain `admin`, guarded demo behavior and Docker-enabled-or-demo availability, in that order. Every identity is implemented as an unmounted draft and remains dependency-held for host authority/configuration and owned Docker resources.

| Identity                   | Kind         | Source body and additional binding                                                                                                                             |
| -------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker.reconcileServices` | query        | Concurrent cached inventory, physical integration/item/secret-kind reads and app reads; exact reconciliation projection. Inventory runtime binding held.       |
| `docker.getServiceHealth`  | query        | Exact endpoint and seven-layer discovered-service health projections from reconciliation. Inventory runtime binding held.                                      |
| `docker.refreshInventory`  | mutation     | Singleton reset, then inventory cache invalidation. Shared owned client/cache reset and invalidation effects held.                                             |
| `docker.getContainers`     | query        | Optional endpoint filtering; omitted/empty maps to `{}`; exact containers/endpoints/timestamp result. Inventory runtime binding held.                          |
| `docker.getEndpoints`      | query        | Actual source endpoint-status primitive, without invented endpoint projections. Owned endpoint service binding held.                                           |
| `docker.startAll`          | mutation     | Parallel per-target `lifecycle` capability check, actual container lookup and `start()`. Owned action client binding held.                                     |
| `docker.stopAll`           | mutation     | Parallel per-target `lifecycle` capability check, actual container lookup and `stop()`. Owned action client binding held.                                      |
| `docker.restartAll`        | mutation     | Parallel per-target `lifecycle` capability check, actual container lookup and `restart()`. Owned action client binding held.                                   |
| `docker.removeAll`         | mutation     | Parallel per-target `remove` capability check, actual container lookup and `remove()`. Owned action client binding held.                                       |
| `docker.logs`              | query        | `logs` capability; source log read primitive; tail fallback 200; falsy logs remain NOT_FOUND. Owned log client binding held.                                   |
| `docker.subscribeLogs`     | subscription | Native async iterator over actual source callback log stream; tail fallback 200 and source error distinctions. Stream/client/transport lifecycle binding held. |

The current router has no image, volume or network leaves. `image` remains the source container field; no new operations or projections were invented. The container shape retains endpointId, endpointName, resourceId, name, id, host, state, image, ports, iconUrl, cpuUsage and memoryUsage unchanged.

## Source-equivalence comparison

Read the actual Docker router, middleware, reconciliation helper, request-handler service, log decoding/stream processor, widget request runtime, Docker singleton/descriptors/env schema and definitions' service discovery helpers. No separate shared Docker validation schema exists in `packages/validation`; the inline schemas were copied.

Read-only source comparison found identical leaf identities/order, identical ten MCP descriptions/order, identical target schemas/inventory normalization, and identical reconciliation/health and action orchestration bodies after explicit resource substitution and whitespace normalization. Neither source nor draft declares runtime output schemas; the source string subscription becomes an inferred string async iterator without adding output validation.

Endpoint target strings still use min(1); target arrays retain min(1)/max(100); endpoint filter arrays retain max(100); tails retain min(1)/max(1000)/optional without an invented integer constraint. Batch results retain input order, individual failure messages and success-discriminated results; cache invalidation still happens once only when at least one action succeeds. Refresh returns void and retains reset-before-invalidation order. No read/action permission was substituted for source admin; endpoint capabilities remain distinct.

Resource contracts use type-only references to the actual exported request-handler primitives and DockerSingleton.reset, not router/controller callbacks or generic execute hooks. Handler bodies retain orchestration and actual container.start/stop/restart/remove calls. Runtime imports do not initialize the Docker singleton, environment, Redis request handler or Next runtime. Definitions' existing pure discovery helpers are reused.

Declared dependencies checked in `packages/api/package.json`: @orpc/server 2.0.0-beta.43, zod, @homarr/db, @homarr/definitions, @homarr/docker and @homarr/request-handler. Public package exports and installed oRPC beta.43 AsyncIteratorClass declarations/implementation were read; its sequential next, return/throw cleanup and async disposal support the native stream draft. Existing sourceProcedure/authenticatedProcedure/BackendContext patterns are reused. No dependency changes or external documentation/network calls.

## Genuine holds, not accepted bindings

1. Current server-owned principal/admin authority and Docker/demo configuration must supply BackendContext and enableDocker. Passing a candidate interface is not evidence of credential authority or permission freshness.
2. The concrete lookup/capability/log/endpoint functions and singleton reset must share the same owned configured Docker service, endpoint descriptors and client lifecycle. Socket defaults, TLS credential reads and client creation remain outside this lane; the original ambient singleton is not assembled here.
3. The concrete inventory request handler must retain source demo behavior, hidden-label filtering, timeouts, degraded endpoints, icon reads, CPU counter baselines, Redis/shared cache and mutation invalidation. Its source-exact type is injected; no ambient source runtime import or replacement inventory implementation is installed. These are domain-service bindings, not claimed completed backend ownership.
4. The log primitive owns Docker frame decoding, its 1 MiB per-message check, listener removal and stream.destroy. The draft adds BackendContext abort/onDispose and iterator-return cancellation bridges while retaining callback-error INTERNAL_SERVER_ERROR versus initialization-throw NOT_FOUND messages and suppression after unsubscribe. Transport consumption/backpressure, late client initialization and host disposal must be reviewed together. In particular, the source assigns cleanup only after asynchronous startup; cancellation or a callback error before that assignment can miss late cleanup. That inherited gap is deliberately not silently repaired or called safe. The queued callback-to-iterator bridge is not accepted lifecycle proof; subscribeLogs must stay unmounted.

## Deferred validation and freeze

Only source comparison was performed. No lint, typecheck, build, test, formatting command, installation or new test. No actual Docker socket access, container operation, daemon restart, provider/network call, environment/credential/current-data read, listener, browser, nested agent or Git operation. Coordinator validation, source review and lifecycle/authority acceptance remain outstanding. Draft count is not an accepted/live feature count; central ledger remains unchanged. This lane is frozen on return.
