# AW3 — approved bounded source enrollment

## Allocation and freeze

Implemented the exact 115-line `convergence-AW3-enrollment-plan.md` allocation under the supplied independent Oracle `ses_ece3cd9cfffe7rIaSiiBNyequG` APPROVE/no-amendments decision. The product-writer delta is frozen to:

- `apps/backend/src/server/runtime-composition/runtime.ts`
- `apps/backend/src/server/runtime-composition/assembly.ts`

This NEW report is the sole additional write. No producer, contract, Auth, MAIN, adapter, API, manifest, AH, startup/compose, generated family, test, shared slot, client, cache key or DB source was changed. Pre-AW3 artifact0 remains an immutable historical candidate under its separate review; this report neither rewrites it nor attributes the new source enrollment to it.

## Runtime consumption

Inside the existing authenticated-read branch, after actual MAIN Auth construction, runtime calls that same persistence owner's retained `createFixedWriteRpc` exactly once. Inputs are captured `hostPath(configuration, "/rpc")`, captured `configuration.baseUrl`, the existing authenticated `createId`, issuer `bodyBudget.maximumBytes` and existing `maximumResponseBytes`.

The constructor's actual frozen collection is passed unchanged as required `fixedWrites` beside the same `requests` and unchanged authenticated read RPC construction. The public RPC authentication retains those same requests and budgets. No new issuer, native owner, context, scope, tracking callback, wrapper or public configuration switch is introduced. Public-only construction calls neither Auth nor the fixed constructor. Rejection follows the existing construction catch and awaited MAIN disposal; there is no empty fallback or downgrade.

## Assembly enrollment

The internal authenticated-read input requires `fixedWrites: readonly FetchContribution[]`. Explicit zero remains available only for independent read-only assembly; runtime supplies the genuine constructor's three contributions and never substitutes zero on failure.

For nonzero collections, assembly requires exactly three unique paths and resources with complete one-to-one membership in `app.create`, `board.saveUserBoardPermissions` and `board.saveGroupBoardPermissions`. Each must be RPC phase, exact captured-base-path route, `descendants === false`, protected write access, matching resource and callable handler. It rejects unknown identities, duplicates, path/resource mismatches, non-write classification and exact collisions with the eleven enrolled reads, foundation health or locale route. The public descendant RPC prefix remains an intentional non-exact overlap.

The existing eleven-read validation is unchanged. Assembly retains the actual Auth principal/authorization services and settings setup resolver, assigns the actual fixed collection without copying or wrapping its descriptors, and mounts its original handlers in order: eleven reads, three fixed writes, public RPC prefix, locale commit, then original held fallbacks. Foundation health remains separate.

## Preserved ownership and policy

The frozen adapter's original request-local source-policy validation still precedes bounded input handling and dispatch. No original request/context/principal/association/signal identity, publication guard, source-policy proof, read/write scope ownership or retained native settlement is replaced by enrollment validation.

Construction cleanup, native MAIN disposal, outer application publication guards and the existing single-owner drain are unchanged. No handler awaits outer body consumption or disposal, no additional disposer or publication waiter is introduced, and native fulfillment/ambiguity/quarantine semantics remain intact. Existing protected-route 401/403 behavior, POST/405 behavior and sanitized genuine failures remain; no unsupported-200 response is added.

## Source surface, not activation evidence

- Public-only: exactly two anonymous source RPC leaves, `serverSettings.getCulture` and `serverSettings.getBranding`.
- Configured-auth source composition: the existing eleven authenticated read leaves plus three exact fixed-write routes.
- Foundation health and guest locale remain separate; private/unknown namespaces retain their existing holds.

These are source-configured route counts, not demonstrated successful construction, usable credentials, authenticated HTTP, private SSR/UI, supported-provider availability or production readiness. No broad-family acceptance or all-writer-ready claim follows.

All file-backed first-adoption, existing-file/restart/restore provenance, fresh native ownership, K/D physical/whole-target authority, generic COMMIT/plain credential DELETE, all-enabled writer conservation, full Auth HTTP/provider/login publication, private SSR/UI, PostgreSQL writes, production origin/base-path/startup and protected-data activation holds remain unchanged. Auth issuer publication remains held; no login/renew/logout/provider callbacks are enrolled.

## Handoff

No commands, checks, tests, builds, native/SQL execution, import evaluation, environment/data/secret inspection or nested agents were used. This freeze is a source implementation handoff, not compiler acceptance, physical proof or runtime PASS. Coordinator checks occur only after all product writers freeze, followed by independent review; neither is claimed here.
