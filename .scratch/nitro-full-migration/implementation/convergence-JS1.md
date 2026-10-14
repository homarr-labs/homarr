# Convergence JS1 — frozen saved-operation source tranche

## Outcome

Added an unmounted saved-operation lease to the existing Integration owner. Only these allocated sources changed:

- `packages/integrations/src/nitro-bindings/native.ts`
- `packages/integrations/src/nitro-bindings/configuration.ts`
- `packages/integrations/src/nitro-bindings/index.ts`

This new report is the only additional write. Read `WRITER-RULES.md` and `convergence-JS.md:25–69` before implementation. No commands, lint/types/tests, runtime/native/SQL execution, environment/secrets, external calls, manifests, host/Auth/schema changes or nested agents. No compiler, procedure, runtime or production acceptance is claimed.

## Actual interfaces

`createOwnedIntegrationBindings(resources)` now additionally returns:

`acquireSavedOperationAsync<TKind>(operation: SavedIntegrationOperation<TPrincipal, TKind>): Promise<SavedIntegrationLease<TKind>>`

Required operation fields are the actual principal, captured saved `IntegrationConfiguration` with kind, fixed `query | interact | full` authority, caller signal, deadline and `assertCurrentAsync`. The returned lease exposes resolved `input`, owned `runtime`, captured `authority`, the original generic-shaped `createIntegrationAsync`, `runAsync`, `assertCurrentAsync` and memoized `releaseAsync`.

`index.ts` exports `SavedIntegrationOperation`, `SavedIntegrationLease` and `SavedIntegrationSecretGuard`.

`createSavedIntegrationBindings(resources).resolveSecretsAsync(configuration, signal, guard)` is additive and requires `SavedIntegrationSecretGuard`; there is no optional/default saved guard. It shares the existing resolver and SQL reader. The existing two-argument `policy.resolveSecretsAsync` deliberately retains its legacy native contract through an explicit separate native resolution mode. JS1 does not claim that legacy entry has gained principal-bound pre-decryption authorization.

## Binding and authority

- Principal **reference identity**, action, caller signal, currentness callback, configuration and requested deadline are captured synchronously before tracked acquisition. Configuration is frozen; the principal is not cloned or replaced. Guards reject replacement of the supplied principal reference or action. AH must supply its actual immutable owner-bound principal and currentness obligation, not a reconstructed/lookalike identity.
- A checked future safe-integer deadline is bounded by `executionTimeoutMs`; caller, parent and child signals are forwarded to the owned operation signal. Every guard checks parent/child admission, cancellation/deadline and captured identity/action around awaited currentness, exact-principal/action authorization and saved configuration/trust currentness. Authorization is repeated after the saved-currentness awaits.
- The required saved resolver guard runs **after row/revision/trust/snapshot awaits and snapshot release, immediately before synchronous decryption**, and again after the post-decryption currentness read. Acquisition also guards before calling that resolver and after it returns. No second SQL reader or caller-plaintext permission path was introduced.
- The saved resource transport receives the same principal/action/currentness guard. Its saved wrapper binds testing transport input to the captured configuration and resolved secret fingerprint, and requires full authority for connection testing.
- The genuine existing source factory is still called, with its original generic return-class type and frozen, keyed-integrity-checked input. No Integration creators or identity definitions changed; `assertClassResources` still admits native Stats kinds only.
- Testing remains separate: the preexisting `testingInputs`, testing factory, test acquisition and management-test projection are unchanged. Saved acquisition does not register itself in testing authority.

## Scope and fixed methods

Each acquisition has its own private weakly keyed run-scope tokens, using the existing Integration runtime context rather than new ambient principal storage. `runAsync` opens a fresh scoped runtime; it deletes/closes that token after completion. The saved factory rejects raw-runtime use, testing/other-owner scopes, closed scopes and changed inputs.

A guard proxy delegates to the **real factory-created instance**, preserving its class/prototype and generic type rather than supplying an alternate implementation. This closes the transport-free HTTP-auth method gap: public asynchronous methods also require an active saved scope and current authority before/after the genuine method promise. `getStatsAsync` requires the captured query action; `testConnectionAsync` and `getHttpAuthenticationAsync` require the captured full action. Other callable methods remain refused under the unchanged native Stats gate; no interact-family methods are invented. Factory and method promises are tracked in the child lifetime even if a consumer does not await them correctly.

Only one `runAsync` may be active per lease; overlapping/nested runs are refused rather than allowing failure cleanup to await its own enclosing run. Consumers await their fixed named operation inside `runAsync`, then release outside that callback. This internal server resource seam is not a browser client/secret exposure or a sandbox for arbitrary provider code.

## Settlement and errors

- Parent-owned child cleanup is registered before acquisition's first asynchronous guard/snapshot work. Acquisition itself is child-tracked, and the parent tracks its whole result/failure cleanup.
- Run, factory, method and existing physical transport work remain real tracked promises; no response-timeout race substitutes for settlement. Failure cleanup runs after the tracked acquisition/run has settled, aborts the child and awaits existing dispatcher/node-agent/owned-lease retirement and remaining work.
- Explicit release stops admission synchronously and returns the same parent-owned cleanup promise on repeat calls. Parent close retains the registered child and catches late acquisitions, abort/drain and release failures through the existing lifetime owner. Timers/listeners are removed after child closure settles, including failure.
- Acquisition/run failure plus failed child cleanup becomes an `AggregateError` retaining the primary cause. The existing configuration snapshot reader now also aggregates primary read failure plus failed snapshot release instead of losing the primary error.
- Existing transport settlement and session fence implementations are reused unchanged. No provider replay, retries, fake successful cleanup or ambiguous-write recovery was added.

## Required remaining producers / holds

Activation remains held for real saved SQL snapshots and durable ABA-aware configuration revisions; actual installation-key codec; AH current request/session/grant ownership and exact principal/action authorization; current trust/version plus approved proxy/DNS and diagnostics; physical transport retirement; and actual session serialization/atomic fence backing whenever used. The saved lease's principal reference is not itself an authority producer.

Package publication of `./nitro-bindings`, host resource composition, current-admin SSE, all cached/full Widget operation propagation and family-specific SDK/WebSocket/image joins are outside JS1. Existing native/testing/management paths must not be advertised as upgraded saved leases. Caddy's existing Axios proxy hold remains, with no bypass. No SQL/history authority was moved to KV; no registry identities were pruned. All 89 identities and normal self-hosted/Darwin behavior remain in the unchanged source registry; no Cloudflare/tunnel requirement was introduced.

Frozen for coordinator source review and focused validation after writer freeze. Required producers and actual mounting remain separate acceptance decisions.
