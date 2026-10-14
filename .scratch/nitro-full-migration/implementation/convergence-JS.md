# Convergence JS — Integration resource owner and guarded jobs SSE

## Decision and boundary

The near-term Integration change is **a saved-operation resource lease in the existing `createOwnedIntegrationBindings` owner**, not another client registry or pub/sub layer. Follow it with a thin main-host resource composition and a mandatory current-admin guard on the existing status iterator. These source changes can be prepared independently; authenticated enrollment cannot be declared ready merely because public main/epoch and read-only Auth source have been accepted.

Public main/epoch acceptance and accepted-but-unmounted Authreadonly are supplied convergence premises. This note does not reopen AH/BP's host, Auth, native SQL, epoch, revision or authority implementation. `packages/cron-jobs/src/runtime.ts` already rejects Analytics `failed`; do not allocate that correction again.

This lane writes only this new note. Source reads only: no product changes, checks, runtime/native/SQL execution, environment/secrets, real providers, external calls, sealed evidence or nested agents. Proposed interfaces below are not implemented or executable evidence.

## Concrete source to reuse

| Existing owner                                                                | Actual reusable seam                                                                                                                                                                                                                     | Missing join                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/integrations/src/base/creator.ts`                                   | Explicit lazy source creators and `IntegrationInstanceOfKind<TKind>`; current source includes the Stats provider creators such as `fileflows`, `trilium`, `miniflux`, `linkwarden`, `healthchecks`, `gatus`, `changedetection`, `caddy`. | Preserve the complete 89-identity registry and genuine return classes. A capability hold is not permission to remove a kind or replace its class.                                         |
| `packages/integrations/src/nitro-bindings/native.ts`                          | `createOwnedIntegrationBindings`, private `createResources`, saved policy, transport/session/cache construction, child lifetime pattern in `acquireResourcesAsync`.                                                                      | Its exported `testing.createIntegrationAsync` is bound to `testingInputs`; it is not a saved Widget factory. `acquireNativeClientAsync` intentionally returns only `testConnectionAsync`. |
| `packages/integrations/src/nitro-bindings/configuration.ts`                   | `captureConfigurationAsync`, `policy.authorizeAsync`, `policy.resolveSecretsAsync`, `assertCurrentAsync`; real saved row/app/secret fingerprint with durable revision and trust version.                                                 | BP must supply the revision/snapshot producer; JS must carry the actual operation and reauthorize, not accept decrypted input as permission.                                              |
| `packages/integrations/src/nitro-bindings/{lifetime,transport,sessions}.ts`   | Tracked work, idempotent owned releases, real dispatcher/node-agent retirement, encrypted session CAS with mandatory fence conditions.                                                                                                   | Give each saved acquisition a child lifetime and an awaited release. Keep all existing physical settlement and fence requirements.                                                        |
| `packages/request-handler/src/nitro-bindings/{index,factories,statistics}.ts` | One named request-handler/cache owner, optional single statistics instance, tracked upstream work and `stopAsync`.                                                                                                                       | Provider acquisition currently has neither operation authority nor a release. Cache-hit/current-delivery guards are also absent. Do not reconstruct these owners per HTTP request.        |
| `packages/cron-job-status/src/nitro-backing/consumer.ts`                      | `createJobStatusStateConsumer`: actual persisted latest status plus the existing local subscription owner.                                                                                                                               | Jobs and SSE must receive the **same object**, not two consumers over the same backing.                                                                                                   |
| `packages/api/src/nitro/routers/-cron-jobs/helpers.ts`                        | `createCronJobsStatusIterator`: registration promise, consumed/backpressure handshake, request disposal and awaited unsubscribe.                                                                                                         | Required current-admin authorization before subscribe/snapshot admission and immediately before every returned value.                                                                     |

`assertClassResources` currently admits native Stats kinds only. Existing `native-clients/{downloads,media,network-home,specialists,systems}/` family ports do not by themselves establish source-class delegation or SDK/WebSocket/image lifetime ownership. Leave their concrete holds in place; this tranche does not lift them wholesale. Caddy's Axios proxy incompatibility also remains an explicit hold, never a direct-network fallback.

## JS-1: saved-operation factory and teardown — independent source tranche

**Exact writepaths:**

1. `packages/integrations/src/nitro-bindings/native.ts` — additive saved acquisition and saved-bound factory inside the existing owner.
2. `packages/integrations/src/nitro-bindings/index.ts` — export the added public contract types.

No edits to `base/creator.ts`, family clients, SQL, Auth or the public host are needed for this bounded tranche. Keep the testing factory/test lease separate and compatible. Use the existing source factory internally; do not route saved operations through `testingInputs` or treat a management test as saved-operation authorization.

Proposed public contracts, using existing Integration types:

```ts
interface SavedIntegrationOperation<TPrincipal, TKind extends IntegrationKind> {
  readonly principal: TPrincipal;
  readonly integration: IntegrationConfiguration & { readonly kind: TKind };
  readonly authority: IntegrationAuthority;
  readonly signal: AbortSignal;
  readonly deadlineAt: number;
  assertCurrentAsync(): Promise<void>;
}

interface SavedIntegrationLease<TKind extends IntegrationKind> {
  readonly input: IntegrationInput & { readonly kind: TKind };
  readonly runtime: IntegrationRuntimeResources;
  readonly createIntegrationAsync: typeof sourceCreateIntegrationAsync;
  runAsync<T>(operation: () => Promise<T>): Promise<T>;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}
```

`sourceCreateIntegrationAsync` denotes the existing imported `base/creator.ts` function, not a new implementation. Add `acquireSavedOperationAsync<TKind>(operation): Promise<SavedIntegrationLease<TKind>>` to the returned owner. The factory keeps the original generic class return; the lease authorizes **only its captured integration** even though the function's type is generic. This is an internal resource seam for fixed named operations, not an RPC handing arbitrary clients or secrets to the browser.

Implementation obligations:

- Capture/freeze principal, configuration and action; reject expired/non-finite/out-of-range deadlines. Combine caller, parent and child lifetime signals and bound the deadline by the configured execution timeout. Reuse the actual acquisition/cleanup pattern rather than inventing a new resource framework.
- Guard = child/parent open + nonaborted deadline + `operation.assertCurrentAsync()` + `saved.policy.authorizeAsync(principal, configuration, authority, signal)` + `saved.assertCurrentAsync(configuration, signal)`. Repeat after awaits. AH's callback must be current request/session/grant authority, not the frozen `BackendPrincipal.user.permissions` array.
- Run the guard **before decrypt**, resolve secrets through `saved.policy.resolveSecretsAsync`, then guard again. Construct input from captured saved configuration and resolved secrets; caller-supplied plaintext is never authoritative.
- Build the runtime with the existing private `createResources(input, context, childOwner, guardedCurrentness)`. The transport currentness callback must include principal/action checks, not just configuration equality. Preserve the native Stats class gate.
- Bind the saved factory to the owner-created runtime/input using a separate private saved binding, including keyed input integrity and captured configuration/trust identity. Reject use outside its `runAsync` scope, another owner's resource, a changed input, closed lease or testing scope. Invoke the real `createIntegrationAsync`, then recheck currentness. Do not introduce ambient mutable principal state.
- `runAsync` uses existing `withIntegrationRuntimeAsync` and tracks the **real operation promise** in the child lifetime; recheck authority/currentness before returning a value. Named consumers choose the fixed permitted method: query for Stats/reads, interact for controls, full for credential-derived HTTP auth and connection tests. A query lease must not be reused to invoke a full/interact operation.
- Register child release in the parent before asynchronous acquisition can finish. On any failure, await child cleanup and preserve both construction and cleanup failures. Release is memoized, closes/aborts the child, drains real work and owned transports, clears timer/listeners and removes the saved binding. Parent close catches late acquisitions and aggregates release failures.
- A response timeout/abort is not physical completion. Never release or recycle a child while its actual upstream operation/transport retirement is unresolved. No retry permission follows ambiguous provider effects or cleanup failure.

**Independent ready subset:** native-Stats saved queries through this actual factory/lease, with real injected prerequisites. No response-cache, Widget, ping, Custom JSX, arbitrary SDK or all-family exposure claim. It can be implemented while AH/BP finalize producers because its required inputs already have typed source contracts; activation stays held until they are genuine. Existing `native.fetchStatsAsync` is also an available bounded execution seam, but does not replace the missing saved-bound generic resource lease.

## JS-2: mandatory current-admin SSE guard — independent of Integration families

**Exact writepaths:**

1. `packages/api/src/nitro/routers/-cron-jobs/resources.ts` — add required `assertCurrentAdminAsync(context: BackendContext): Promise<void>`.
2. `packages/api/src/nitro/routers/-cron-jobs/helpers.ts` — call it at admission and delivery, preserving the original iterator and cleanup owner.

Do not implement another Auth/admin reader here. AH supplies the required callback and an actual expiry/revocation/request-retirement signal on the context. Admission middleware in `packages/api/src/nitro/procedure.ts` checks permissions once and is insufficient for a long-lived stream.

- Check signal/current admin before `status.subscribeAsync` starts registration and its initial durable snapshot reads; recheck after registration resolves.
- In `next`, check again after waiting on `changed.promise` and immediately before converting/returning **each** pending record. This also covers a record held under backpressure while the user expires or loses admin.
- Keep the pending record's `consumed` handshake unresolved until authorized delivery or terminal disposal. Recheck stream state/signal after the asynchronous guard; do not return a captured record after concurrent abort/disposal. The existing status runtime serializes listeners; retain that ordering/coalescing.
- On guard refusal, fail the original iterator, release the pending handshake, wake waiters and await the existing registration/unsubscribe disposal. Do not await unsubscription from inside the producer callback while it is waiting for consumption; that can deadlock. Preserve cleanup failures through the existing error reporting/disposal owner.
- Empty/quiet streams still retire on AH's expiry/revocation signal. A delivery-only check without that signal can leave unauthorized subscriptions open indefinitely.
- Preserve `RuntimeTaskStatus` DTOs, source leaf identity and reconnect snapshot behavior. No status polling, SSE service/second listener, replayed job trigger, new fanout or synthetic status.

This source guard can land without any Integration provider or scheduler activation. Mounting requires current-admin authority, same-owner durable status and the admitted request-to-stream cleanup lifetime; accepted read-only Auth source alone does not provide that enrollment.

## JS-3: real composition modules, conditional same-owner enrollment

**New writepaths allocated to JS after JS-1/2 freeze:**

| Path / proposed export                                                                                | Inputs and outputs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/runtime-composition/integration-resources.ts` / `createIntegrationResources` | Required host admission signal, `IntegrationBindingResources<BackendPrincipal>` and actual current-request operations. Construct `createOwnedIntegrationBindings` once; expose its real saved/testing/native/cache capabilities and memoized awaited `closeAsync`. Do not create SQL connections, credentials or authority in this module. Validate each capability's required producers before declaring that capability available; preserve `IntegrationProducer` unbound/held outcomes for others.                                                                                                                                                                                     |
| `apps/backend/src/server/runtime-composition/jobs-resources.ts` / `createJobsResources`               | Borrow BP's **same** main PersistenceRuntime and captured initialized epoch, real state backing and separate backing lifetime; use `createRuntimeJobsSqlPort` → `createJobsSqlResources`, `createJobStatusStateConsumer` and `createHomarrJobsRuntime`. Require real settings codec, Analytics/ping/Icon job resources, enabled Auth-provider cleanup resources, clocks, IDs, logger, limits and readiness. Return `{ jobs, status, initializeAsync, startAsync, closeAsync }` where `status` is the one actual consumer, initialization delegates to jobs, start delegates to `startAllAsync`, and close drains jobs before disposing status. No automatic construction-time scheduling. |

Use factory parameter/return types from the public package exports for these modules rather than duplicating SQL or job-resource interfaces. `jobs` lifecycle receives **that same `status`** for repair/begin/finish, and cron procedure resources receive it for subscribe. Its `ownerId` is fresh per process owner; terminal statuses/history and the epoch survive ordinary restart. Interrupted other-owner running records use the existing repair, without rerunning their effects. This is normal single-owner self-hosting, not a distributed scheduler election.

**Prerequisites owned elsewhere, no JS implementation:**

- **AH:** mounted same-listener authenticated BackendContext with real request ownership, expiry/revocation, current admin and query/interact/full resource grants. Preserve the accepted anonymous/public-board policy; no fabricated principal or privilege inferred from a decrypted row.
- **BP:** main SQL snapshots and durable configuration/delete-recreate revisions including ABA, atomic session commit fences, existing state/history/jobs producers on the one captured epoch and lifetime. SQL remains authoritative for durable history/latest status/security fences. Any Nitro KV response cache, listener or temporary snapshot is disposable; it cannot establish grant/revision/session-fence/history truth.
- **Host owner:** actual persisted installation-key codec, serializer, current certificate CA/fingerprint-hostname/version, explicit proxy/DNS policy, diagnostics and physical transport retirement. No trust-all, proxy bypass or invented Q17/Q18 approval.
- **Effect owners:** real Icon resources, cancellation/trust-owned ping and URL/result backing, awaited Analytics sender/settlement and real runtime properties; no disabled/noop substitute for an enabled job. `createHomarrJobsRuntime.initializeAsync` also performs session cleanup/status repair, and `startAllAsync` includes run-on-start effects: neither is a read-only readiness probe.

**Coordinator/AH host consumption, not duplicate JS edits:** `apps/backend/src/server/runtime-composition/{runtime,assembly,join-slots}.ts` and the existing host/application route composition consume these modules only after prerequisites are accepted. Keep the existing Fetch/listener and configured base path. Source `defineBackendContribution` can enroll a deliberately selected subset of actual `createCronJobsProcedures` leaves; declare exactly the selected source paths. Read-only first subset is `cronJobs.getJobs` plus `cronJobs.subscribeToStatusUpdates`, with current-admin guards for both reads and delivery. Do not enroll the six controls merely because constructing the router produces them.

For `getJobs`, the follow-on exact path is `packages/api/src/nitro/routers/cron-jobs.ts`: guard the actual context before and after `jobs.getAllAsync`. The queued/native-COMMIT authority amendment for configuration controls remains BP/AH-owned and held. Trigger resolution is still not an effect-success receipt. Integration saved-Stats resource readiness likewise does not imply there is already a complete saved-Stats RPC leaf or full Widget lease to mount.

**Coordinator-only manifests:** publish `packages/integrations/package.json` `./nitro-bindings` and `packages/cron-job-status/package.json` `./nitro-backing` when frozen; verify accepted db runtime subpaths. `apps/backend/package.json` needs direct dependencies for the Integration/jobs/status/core/request/ping packages actually imported. `@homarr/request-handler/nitro-bindings` already exists. No install/manifest changes in this lane.

## Next concrete request-handler join — not a hidden ready claim

After JS-1 is accepted, allocate `packages/request-handler/src/nitro-bindings/{resources,factories,statistics}.ts` and `packages/request-handler/src/lib/integration-request-runtime.ts` together for the saved lease consumer. Replace authority-free `WidgetProviderResources.createResourcesAsync(integration, signal, deadlineAt)` with required saved-operation acquisition returning the above lease; factories/statistics must use its `runAsync` and await `releaseAsync` after actual physical settlement, including acquisition/operation failure. Keep generic source factory identity and the existing named handler/cache/statistics instances.

The remaining explicit interface prerequisite is per-caller operation delivery: the current named `handler(integration, options)` and statistics calls carry no principal/action/signal/current grant. Specify and propagate an explicit required operation argument through Integration handler input and named primitives before editing consumers; no optional production default, global authority or reusing a management snapshot. Exact further writepaths are `packages/request-handler/src/nitro-bindings/{primitive-contract,integration-requests,wazuh}.ts`, `packages/request-handler/src/stats-runtime.ts`, and the corresponding `packages/api/src/nitro/routers/-widgets/resources.ts` lease projection/actual Widget callers when that interface is allocated.

Guard each caller before cache lookup and after every cached/stale/deduplicated result, separately from the producing operation. Carry configuration/trust/durable revision identity in response identity; a shared generation or unchanged plaintext is not an ABA/grant fence. A surviving waiter cannot inherit the initiating caller's authority after it is revoked. Do not swallow authorization/staleness as an ordinary upstream error eligible for stale-on-error success. Statistics must guard cache reads, refresh admission and persistent publication, not just `fetchStatsAsync`. This is why changing only the provider callback cannot safely enroll cached Widgets.

Full `WidgetRequestLease` still requires real ping, Custom JSX HTTP/cache/limits, credential-derived connection, DNS, authorization snapshots and release; named request bindings alone do not satisfy it. Do not widen its ready subset with stubs to pass the type checker. Family source-class delegation remains a subsequent bounded allocation, preserving all 89 identities, existing behavior and real provider methods.

## Lifetime handoff and ready/held outcome

1. Stop external/manual admission and new schedules; retire request scopes and SSE, release consumption handshakes and await unsubscribe.
2. Drain `jobs.stopAsync` while status backing/SQL remains live for terminal `finishAsync`; do **not** abort the status backing signal together with the incoming-request signal.
3. Stop existing request-handler/statistics owners and close saved/testing Integration children; await their actual upstream and transport release. Preserve failed releases, rather than declaring reusable resources ready.
4. Dispose the one status consumer, then state/fanout/history users; only afterwards may BP close/rebind main SQL and the key owner erase copied codec material. Startup failure/late acquisitions follow the same ownership order.

**Implementable independently now:** JS-1 saved native-Stats resource/factory lease and JS-2 required SSE guard contract/iterator logic. **Conditionally composable next:** the two real app resource modules using accepted producers, then same-listener read-only jobs/status enrollment. **Held:** authenticated mounting before AH, any missing durable producer/fence before BP, enabled effects without owned transports, cached/full Widgets, client families without genuine class wiring, management test scope without principal binding, and manual durable controls without current commit authority.

Preserve normal self-hosted operation, all 89 Integration identities and Darwin-compatible ownership. No Cloudflare requirement, tunnel, second runtime listener, external cache authority, provider replay or replacement pub/sub framework is introduced or assumed. No new verification credit is claimed by this note.
