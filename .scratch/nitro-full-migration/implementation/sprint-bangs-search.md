# Bangs search: frozen unmounted candidate

## Exact files and identity

- `packages/api/src/nitro/routers/bangs-search.ts`
- `packages/api/src/nitro/routers/-bangs-search/resources.ts`
- `packages/api/src/nitro/routers/-bangs-search/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-bangs-search.md`

The only leaf inventory is `bangs.search`, query, source `packages/api/src/router/bangs/bangs-router.ts`. `createBangsSearchProcedures(resources)` returns its actual local body; `bangsSearchDraftPaths` records that draft identity only. Exposure remains HOLD. The old `routers/bangs.ts` pending disposition and `routers/-apps-search/bangs.ts` accepted search implementation are unchanged. Cron Jobs remains frozen. The central accepted 91/334 accounting is unchanged.

No shared context/procedure/errors/map/index, contribution, manifest/lock, DB/Core/Auth, host, legacy router, other router or previously frozen helper was written. No registration or package export was added.

## Schema, policy and metadata

The native factory uses the existing `sourceProcedure` and inferred current `BackendContext`, with exact `path: "bangs.search"`, `kind: "query"`, `access: { kind: "public" }`, `demo: "guarded"`. This source query requires neither authentication nor a management permission; read-only demo mutation denial does not deny it.

The unchanged `bangsSearchInputSchema` is reused from the frozen native bangs module: object `query: z.string()`, `limit: z.number().int().min(1).max(50).default(20)`. There is no new input intersection, trimming transform, query-length cap, coercion or default. Source has no output validator or REST/MCP metadata, so none is introduced. Output remains `DuckDuckGoBang[]`, not a cache/timestamp envelope.

## Prepared business body

The handler calls the existing accepted `searchDuckDuckGoBangsAsync(input, dataset, context.signal)`. That helper remains the sole prefix algorithm: lowercase/trim normalization, empty-prefix short circuit, localeCompare lower bound, contiguous `startsWith` iteration and stop at the supplied limit. Its request-signal admission/completion checks remain unchanged. `lowerBound` is reused transitively, not copied or altered.

The new helper owns the source dataset load/parse/normalize/sort and the exercised local-cache branch; it does not delegate the whole business operation to `loadDataset`, a controller callback or a legacy caller:

1. On refresh, source external-connection opt-out returns the source empty dataset without fetch. Cached entries are checked before this refresh-only policy branch, as in source; changing policy does not invent eager cache invalidation.
2. Start trusted fetch to exactly `https://duckduckgo.com/bang.js`, with exactly `accept: "application/json,text/plain,*/*"`. The injected operation supplies the real Undici response promise plus separately owned physical settlement. A 10,000 ms controller timer is canceled when the response promise settles, reproducing the source fetch-only timeout scope. This timer is not unref'ed in source and is not unref'ed here.
3. Reject a non-ok response with the injected actual source `ResponseError` constructor, before reading JSON. Preserve JSON rejection and asynchronous schema parsing rejection; no stale fallback, retries or successful-error result is supplied.
4. Parse the entire array with the source object fields: required string `t`, `s`, `u`; optional string `d`, `c`, `sc`; optional number `r`. Default object parsing strips unknown properties as in source. No coercion, per-entry skipping, rank weighting, deduplication or invented URL validation is added.
5. Normalize only `t` using the accepted `normalizeBangToken`, remove empty normalized tokens, and sort ascending with `left.t.localeCompare(right.t)`. Duplicate-token stability and optional fields remain source behavior. The cache receives the actual resulting dataset, not fabricated search results.

## Source cache/concurrency specialization

Read the complete source `request-handler.ts` and shared-cache helpers. DuckDuckGo passes only `requestAsync`; it does not configure a shared cache, custom key, custom duration or stale fallback. The new helper therefore specializes the real local branch instead of introducing shared-cache generation/refresh locks or copying unreachable shared-cache logic.

- Preserve source cache identity `local:{}` from local generation plus `JSON.stringify({})`, and inflight identity `${generation}:local:{}`.
- Consult the current-generation inflight promise before the memory cache. Repeated reads of that generation coalesce onto the actual refresh promise.
- Touch cached rows to Map insertion-order recency; a cache hit requires `now < expiresAt`. Expiry is tested with `now >= staleUntil`, then removal/rescheduling occurs before overload checks.
- Store a real completion timestamp `new Date(completedAt)`, `expiresAt = completedAt + 10_000`, `staleUntil = expiresAt`. No stale-if-error window is configured or synthesized.
- Keep the source 1,000-entry capacity, expired-entry scan, oldest-entry removal and earliest-expiry timer/rescheduling. The normal bangs source has a single dataset key; limits are not reinterpreted as a public search-result cap.
- Preserve the 100-inflight/upstream concurrency limits and unsettled-key rejection. Timeout and overload retain the source class names/messages: `RequestHandlerTimeoutError` / `Request handler deadline exceeded`, `RequestHandlerOverloadedError` / `Request handler concurrency limit exceeded`.
- Preserve the 60,000 ms outer request deadline with source abort/result race and the separate source upstream-processing settlement marker. A timed-out refresh stays coalesced until its settlement cleanup/grace, and a remaining upstream marker still prevents another request with that same key.
- Retain generation fencing: invalidation clears entries/expiry state, increments generation and prevents an older refresh from repopulating cache. It does not cancel or erase earlier inflight/upstream work, nor change its result for an already waiting caller.
- Stop aborts source handler lifetime, invalidates memory/timers and awaits upstream-processing settlement with the source 60,000 ms grace. No idempotence, retry, extra cancellation timeout or success-after-error policy is invented.

The source DuckDuckGo `requestAsync(_)` does not consume the request-handler's outer abort signal. This draft deliberately preserves that distinction: the trusted fetch receives its own 10-second signal, not the outer 60-second controller or one searching caller's signal. A searching caller does not cancel another caller's coalesced dataset refresh. The timer ends at response arrival rather than spanning JSON/parse/sort; this limitation is not silently repaired. Source handler settlement/grace is not proof of transport/body settlement.

## Concrete candidate bindings and holds

`BangsSearchProcedureResources` exposes particular dataset primitives, not a generic execution callback:

- `cache.entries`, `cache.inflight`, `cache.upstreamSettlements` are precisely typed native Maps of the source dataset entry/promise shapes. No global cache, Redis state, SQL, fixture cache or fabricated successful provider is installed. A genuine host-owned/exclusively leased empty cache instance and its reuse/disposal/invalidation policy remain HOLD; structural Maps are not accepted production cache ownership.
- `clock.now()` is epoch milliseconds; `clock.setTimeout()` supplies native-compatible cancel/unref timer handles. Real clock/timer ownership remains an unbound host primitive. This source preparation invokes no clock or timer itself.
- `policy.noExternalConnection` must be the genuine native source policy. No environment reader or manufactured policy authority is supplied.
- `trustedFetch.startFetchWithTrustedCertificates()` is restricted to the exact source URL/header/signal operation. It must use current genuine certificate/proxy policy and return actual Undici response behavior. It is a candidate primitive, not a claim that a reviewed public native producer already returns this signature.
- `BangsTrustedFetchOperation.settledAsync` and `lifetime.trackTransportSettlement()` must own the real request/body resource from before admission through actual completion, including fetch failure, non-ok rejection and JSON/parse failure. The raw existing trusted-fetch promise resolves at response headers and cannot by itself prove physical settlement. The helper tracks that supplied physical promise separately and does not replace source coalescence markers with it or pretend a grace timeout means physical cleanup completed. The genuine transport settlement producer remains HOLD.
- `lifetime.signal`/`onDispose()` are dataset-service lifetime primitives, separate from each searching request's lifetime. The host must retain and actually settle physical transport ownership even when the source bounded stop grace expires. No host lifecycle proof is delivered.
- `ResponseError` is the exact source constructor signature via type-only `@homarr/common/server`; its real value producer must be injected. No error stand-in is implemented and no Common server/Next barrel is loaded at runtime.

All such joins, native policy/cache acceptance, routing composition and required verification remain unmounted candidate holds. No supplied structural type establishes trust, current authority, physical backing or capability delivery.

## Dependency/API inspection and source-only verification

Verified API already declares Zod, `@orpc/server`, Undici, Common and request-handler. Verified Common's current public leaf exports and request-handler's declared source subpaths. Request-handler dataset/cache types and Common's source error constructor are imported **type-only**; no runtime import of the environment/trusted-fetch legacy dataset module, Redis/cache roots, Common request/Next leaf or Core ambient HTTP bootstrap is added.

Read installed Zod **4.4.3** asynchronous parse/default/integer declarations, oRPC server **2.0.0-beta.43** input/handler declarations and current frozen `sourceProcedure`, and Undici **7.29.1** `Response.json(): Promise<unknown>` declarations. New runtime dependencies are only the already-declared Zod entrypoint and unchanged local native helpers/spine.

Source comparison covers the actual router, legacy search service, dataset parser/fetcher, full local/shared-cache request-handler logic, trusted-fetch/timeout/request-signal helpers, source `ResponseError`, accepted prefix helper/schema and current context/procedure. This is static correspondence, not executed correctness, acceptance or production-readiness evidence. No lint/typecheck/build/test/format/install/new tests, Git operation, nested agent, network/provider/SQL/dataset/cache call, environment/credentials/current-data read, job/service start, listener/browser/container or 3100/3200 action occurred. Frozen for coordinator review; no further edits without a renewed exclusive lease.
