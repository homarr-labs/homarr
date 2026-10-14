# Convergence JS types cleanup — frozen

## Exact writes

- `packages/integrations/src/nitro-bindings/native.ts`: the saved factory's tracked callback explicitly returns `Promise<IntegrationInstanceOfKind<TClientKind>>`; its frozen captured input explicitly retains `TClientKind`, and the genuine source factory is called as `createIntegrationAsync<TClientKind>(capturedInput)`. The existing factory-derived `Awaited<ReturnType<IntegrationCreators[TKind]>>` alias remains unchanged. No replacement client, cast or suppression was introduced.
- `packages/integrations/src/nitro-bindings/configuration.ts`: snapshot reads record a discriminated success/failure outcome. Snapshot release is awaited outside `finally`, after physical read settlement. Only after cleanup settles does the reader return its original configuration/secrets, throw the original primary or release failure, or throw an ordered `[primary, release]` `AggregateError` with the primary as its cause. Encrypted secret types come from the existing SQL schema, not a widened or fabricated value.
- This new report; no other files were written.

## Preserved boundaries

Saved-operation leases, genuine private lifetime tracking, principal reference identity, current authority, request signals/deadlines, fixed method parameters, clocks, scoped runtime admission and pre-decryption guards remain unchanged. No owner is released before the physical read settles. No callback authority, resource, revision, trust version or successful cleanup is fabricated. Native/testing/management paths remain distinct; no mounting or producer composition was added.

## Evidence and unresolved holds

Read `WRITER-RULES.md`, frozen `convergence-JS1.md` and `convergence-JS2.md`, and the supplied `nitro-convergence-next-1tPGwLQS/owners.stdout` and `lint.stdout`. The supplied evidence identifies the saved factory diagnostic at `native.ts:410` and both unsafe-finally diagnostics at `configuration.ts:123,127`; this source cleanup targets those findings without claiming a post-change check result.

**Proxy diagnostics remain unresolved:** the supplied owners log reports missing required `ProxyEnv.NODE_ENV` at `transport.ts:109,110`. `transport.ts` is unallocated and untouched. No invented `NODE_ENV`, ambient environment spread, unsafe cast, suppression or dropped proxy isolation was used. A separately allocated real proxy-environment type fix and coordinator validation are still required.

All JS1/JS2 activation prerequisites remain held: genuine saved SQL/revision/codec/trust/proxy producers, current request/session/grant ownership and exact authorization, physical transport retirement, required current-admin callback and actual expiry/revocation/request cancellation, durable status/jobs owners and same-listener lifetime joins. This cleanup supplies none of those producers or mounting decisions.

Frozen for coordinator review and focused validation. No commands, checks, tests, builds, runtime/native/SQL execution, external/provider calls, secrets, branch/staging/commit operations or nested agents were used. No compiler, lint, runtime, procedure or production acceptance is claimed.
