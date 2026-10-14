# PLAYABLE-WAVE32 lane02 — independent bounded review

## Scope and provenance

Reviewed `implementation/playable-02.md:3–17` against `PLAYABLE-WAVE32.md:7–16,25,59–72` and the frozen Query contracts. The supplied baseline identifies nine absent/new product paths and one permitted barrel extension; the head is the completed, declared-frozen lane02 source read in this session. No Git comparison was performed under this review's execution restriction: this is an inventory-bounded source review, not a branch-wide unchanged-body certificate.

All ten product paths were read:

- `apps/nitro/src/client/rpc-link.ts`
- `apps/nitro/src/client/expansion.ts`
- `apps/nitro/src/client/public-integration.ts`
- `apps/nitro/src/client/index.ts`
- `apps/nitro/src/query/browser.ts`
- `apps/nitro/src/query/provider.tsx`
- `apps/nitro/src/query/public-integration.ts`
- `apps/nitro/src/query/index.ts`
- `packages/api/src/nitro/assembly/public-integration.ts`
- `packages/api/src/nitro/browser-contracts/public-integration.ts`

Read-only dependency evidence: frozen `apps/nitro/src/query/{scope,types}.ts`; `packages/api/src/nitro/assembly/{client,index,resources}.ts`; catalog construction/handler in `routers/integration.ts:70–87`; its public projection and `nitro/procedure.ts`; accepted `implementation/stack-query-adapter.md`. Resource re-export edges were inspected, but actively edited peer resource implementations were not consumed as accepted contracts.

Verified installed `node_modules/@orpc/client` and `@orpc/tanstack-query` declarations/manifests at **2.0.0-beta.43**, including fetch adapter, StandardUrl codec options, createORPCClient, RouterUtils/options/interceptors, and actual fetch/Query implementations. Also read installed `@standard-server/core` StandardUrl and TanStack cancellation/provider source. Earlier reads of lane02's immutable disposable external-package copies corroborated these APIs; no synthetic declarations were created. Global/repository AGENTS rules and authoritative amendments supplied the Standards lens; no CODING_STANDARDS.md or CONTRIBUTING.md was found.

## Findings

No findings after the correction: the validated absolute URL is now fetched independently of document base. Slash StandardUrl, POST, body/headers/signal/duplex spread, credentials/redirect policy and endpoint credential/query/hash guards are preserved.

### Resolved historical P2 - fetch the validated absolute URL

`apps/nitro/src/client/rpc-link.ts:19–22` — With a cross-origin document base URL (for example `<base href="https://assets.example/">`), the adapter supplies `/rpc/integration/getKinds`, the guard resolves it against the captured window origin and accepts it, but `fetch(request, ...)` resolves the relative string against the document base URL and sends it to the other origin. This breaks the required same-origin transport and can transmit private RPC bodies outside the application; `credentials: "same-origin"` controls cookies, not the destination or body. Severity depends on such a base URL being present; no current host base configuration was claimed or executed. Keep the slash-prefixed StandardUrl in RPCLink, but pass `new URL(request, url.origin)` (or its href) to fetch, preserving the existing init spread, credentials and redirect policy.

## Bounded checks

- Full inference genuinely uses `RouterClient<ReturnType<typeof createExpansionApiAssembly>>`; the public getKinds leaf is indexed from it, not a widened widget client or fabricated method interface.
- The public assembly selects only accepted getKinds. It fabricates no resources/context, mounts nothing, and exposes neither byIds nor protected procedures. Eventual hosting still requires genuine IntegrationManagementResources ownership, valid BackendContext and an actual mounted endpoint; existing public-settings admission is not a substitute.
- StandardUrl is correctly slash-prefixed and origin-free at the codec boundary. POST, redirect rejection and preservation of adapter headers/body/signal/duplex are otherwise present. The installed Query adapter forwards its cancellation signal to client/fetch.
- Query producers use actual generated options/keys and preserve the supplied QueryClient. The provider checks currentness and rejects a nested replacement QueryClient.
- Private activation captures only the six supplied identity fields, serializes transitions, retires before replacement, retains equal active identities, rejects disposal and propagates activation/retirement failures rather than publishing success. No identity is derived from auth/UI state. Dispose is serialized and idempotent.
- Public WeakMap reuse preserves an active endpoint/QueryClient binding, blocks replacement during retirement, and removes only its generated public prefix. Installed cancelQueries consumes asynchronous cancellation rejection; no hypothetical rejection-only failure was manufactured as a finding. The public prefix is not offered as private authority.
- No additional actionable Standards/over-engineering finding. No tRPC tunnel, invented private namespace, unsafe cast, replacement assembly body, or unauthorized private mount was identified in the bounded additions.

## Validation limitations

No source/manifests were modified; no build/install/runtime/Git/tests, child agents or application-code evaluation was performed. Only this report was written via patch. Lane02 reports copied-file lint and a transport-only typecheck pass; this review did not rerun or independently certify them. **Complete binding/API typecheck remains pending the genuinely frozen dependency closure**, as do endpoint/resource/context integration and runtime/cancellation/race proof. Static tracing is not host acceptance or private authentication evidence.

## P2 correction rereview evidence

Scope was only returned `client/rpc-link.ts`, updated `playable-02.md:76–93`, and retained `p2-recheck` artifacts in the previously recorded disposable directory. The source copy was read and matches the corrected source text. Retained `source.sha256` and `validation.json` both record `d0335c1cd7722d75c6ac35b5f08cfab2344b0953ae708550da1c76aa565a64db`; this review did not recompute hashes or certify unrelated sources unchanged.

Read actual `lint.stdout.log` (0 warnings/errors on one file), empty `lint.stderr.log`, and empty `types.stdout.log`/`types.stderr.log`. Retained `validation.json` records exit 0 for each invocation, isolated HOME/PATH, the one-file lint target, and strict no-emit/no-incremental transport-only TypeScript invocation against copied installed external declarations. No validation command was rerun. This is retained scoped static evidence, not a full recursive binding/API pass or runtime proof.

## Verdict

Correct — bounded P2 fix passes source rereview, with no new finding. Full recursive binding/API types, private scopes/host/resource/context ownership and actual endpoint integration remain held; no runtime acceptance is implied.

**Not flagged:** Missing host/export/private joins are explicit owner01 obligations and security holds, not lane02 regressions; untouched frozen/peer code was not promoted to acceptance.
