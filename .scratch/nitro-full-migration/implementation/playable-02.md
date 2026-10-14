# PLAYABLE-WAVE32 lane02

## Exact write inventory, recorded before implementation

- `apps/nitro/src/client/rpc-link.ts` (absent)
- `apps/nitro/src/client/expansion.ts` (absent)
- `apps/nitro/src/client/public-integration.ts` (absent)
- `apps/nitro/src/client/index.ts` (absent)
- `apps/nitro/src/query/browser.ts` (absent)
- `apps/nitro/src/query/provider.tsx` (absent)
- `apps/nitro/src/query/public-integration.ts` (absent)
- `apps/nitro/src/query/index.ts` (existing permitted barrel only)
- `packages/api/src/nitro/assembly/public-integration.ts` (absent)
- `packages/api/src/nitro/browser-contracts/public-integration.ts` (absent)
- `.scratch/nitro-full-migration/implementation/playable-02.md` (this handoff)

Frozen `query/scope.ts`, `query/types.ts`, and existing assembly files are read-only. No feature, route, root composition, manifest, lock, build, test, or private resource edits.

## Immediate owner01 requests

- Add API export `./nitro/assembly/public-integration` → `./src/nitro/assembly/public-integration.ts` (server-only factory).
- Optional API export `./nitro/browser-contracts/public-integration` → `./src/nitro/browser-contracts/public-integration.ts` (type-only public contract). Frontend consumes only the already-declared assembly/client entry, with actual indexed `getKinds` inference; it imports no undeclared entry.
- No dependency addition: frontend already declares installed `@orpc/client` and `@orpc/tanstack-query` beta.43, React Query 5.101.2, React 19.2.7; API declares beta.43 server and definitions/common.
- Public server factory consumes an actual `IntegrationManagementResources` supplied by composition and selects only accepted `getKinds`; it neither fabricates resources nor executes storage/provider methods. Mounting and endpoint URL are owner01's work. `/rpc` currently has only foundation `health`, not this catalog.
- Private full assembly transport is supplied independently of scope identity. Private Query binding accepts only an externally established `ExpansionQueryCacheIdentity`; Q16/Q18/J5 holds remain. No private mount requested.

## Status — frozen handoff

Ten product files implemented; the inventory above remains exact. This is a usable transport, Query producer/provider, and genuine public generated-query hook, not a feature migration or mounted-route claim. No peer writes, private mounts, authenticated cache identity invention, tRPC tunneling, dependencies, lock, application builds, tests, credentials, listeners, or child agents.

Disposable validation artifacts are confined to `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-lane02-20261011/`: copied owned files at the same relative paths, copied lint configuration, copied installed external packages, and an empty `home/`. Installed packages were copied, not installed or symlinked. No mutable workspace dependency was copied/compiled.

## Actual installed API correction

The initial isolated transport typecheck caught an important beta.43 difference: `RPCLink.url` is `StandardUrl`, a slash-prefixed path, not an absolute `URL.href` string. This lane passes a template-literal pathname and deliberately omits `origin`; the adapter's relative request is resolved against the captured browser origin, checked, and fetched using that validated absolute URL. The existing widget-only feature transport's absolute-string construction is not edited here; owner20 should consume the new factory rather than copying that incompatible line.

## Immediately consumable exports and props

Frontend exports require no new package declaration; all API references use existing type-only `@homarr/api/nitro/assembly/client`.

- `client/index.ts`: `resolveBrowserRpcEndpoint(endpoint: string | URL): URL`, `createBrowserRpcLink(endpoint)`, `createExpansionBrowserClient(endpoint): ExpansionApiAssemblyClient`, `createPublicIntegrationBrowserClient(endpoint)`, and its inferred `PublicIntegrationCatalogClient` type.
- The full client uses genuine `createORPCClient<ExpansionApiAssemblyClient>` and `RPCLink`, not a widget-only client widened by casts. Namespace/method signatures come from the actual accepted assembly. The public client is an exact indexed `integration.getKinds` projection, not a second fabricated method interface.
- Transport validates same origin, rejects embedded credentials/query/fragment, preserves all adapter `RequestInit` fields including body/headers/signal/duplex, adds same-origin credentials, uses POST, and rejects redirects. No bearer-token configuration, headers, browser principal, or direct request path inventory.
- `query/browser.ts`: `createExpansionBrowserQueryBinding({ endpoint, queryClient })`, `ExpansionBrowserQueryBindingOptions`, and `ExpansionBrowserQueryBinding`. It returns the real `client`, exact supplied `queryClient`, current `scope | undefined`, `activate(identity): Promise<ExpansionQueryScope>`, and idempotent `dispose(): Promise<void>`.
- `activate` captures only the six actual source-provided fields, serializes transitions, retains an unchanged active identity, retires the preceding scope before acquiring/publishing its replacement, and rejects disposed bindings. A retired identity is not reusable; no fields are generated or derived from auth/session/UI state. Construct one stable binding for a QueryClient/lifetime, not one per hook/render. Its frozen scope owner still governs keys, no-retry writes, cancellation, finite SSR restrictions, and retirement.
- `query/provider.tsx`: `ExpansionQueryScopeProvider({ scope, children })`, `ExpansionQueryScopeProviderProps`, and `useExpansionQueryScope(): ExpansionQueryScope`. The provider uses `scope.queryClient`, and the hook rejects nested QueryClient replacement and stale scopes. No root/provider/route mount is made.
- `query/public-integration.ts`: `createPublicIntegrationQueryBinding({ endpoint, queryClient })`, `PublicIntegrationQueryBindingOptions`, `PublicIntegrationQueryBinding`, and `usePublicIntegrationKinds(binding, enabled = true)`. The actual hook calls `useQuery` with generated `getKinds.queryOptions` and the exact supplied QueryClient. It keeps the raw accepted catalog shape `{ kind, name, category, requiredSecrets }[]`, without fabricated defaults or presentation DTOs.
- Public binding returns `client`, `queryClient`, stable generated `orpc`, `assertCurrent`, and idempotent `retire`. A WeakMap reuses one active binding for an endpoint/QueryClient; retiring bindings cannot be replaced until retirement settles. Its endpoint-only public prefix is not an authenticated scope identity and is never offered to private clients. Retirement cancels/removes only that generated public key prefix.
- `assembly/public-integration.ts`: `createPublicIntegrationCatalogAssembly(resources: IntegrationManagementResources)` selects the already accepted management `getKinds` procedure. It neither exposes `byIds` nor any protected procedure. Construction still requires genuine resource ownership and valid source BackendContext at the eventual handler; no fake callbacks/resources/context are supplied. Existing public-settings admission accepts exactly two settings leaves and cannot silently be reused/widened for this catalog.
- `browser-contracts/public-integration.ts`: type-only `PublicIntegrationCatalogClient` with its leaf indexed from the actual accepted full assembly. Optional manifest export is requested above; frontend does not depend on that pending export.

## Actual consumer joins, without peer edits

Owner01/public view may instantiate a public binding once with its existing QueryClient and the **actually mounted** prefix, render `usePublicIntegrationKinds(binding)`, and dispose via `await binding.retire()`. Loaders use the same `binding.orpc.integration.getKinds.queryOptions({ input: undefined, retry: false })`; exact cache access is `.getKinds.queryKey({ input: undefined })`, and procedure invalidation is `.getKinds.key()`. A catalog response is public data, not service readiness or proof of private authentication. `/rpc` is not assumed to implement it.

Owners19/20 consume the eventual genuine acquired `scope` (provider or explicit prop), not the narrower public binding. Future source-consumer changes must atomically remove their competing manual keys; none is changed here:

1. Widget settings: `scope.orpc.widget.options.getWidgetOptionSettings.queryOptions({ input: undefined, enabled: opened, retry: false })`; cache access `.queryKey({ input: undefined })`, invalidation `.key()`. Keep the actual nested `data.server.board` and source option/default reducer. This leaf still requires a current widget request lease; its public-looking input is not admission.
2. Template: `.customWidget.readTemplate.queryOptions({ input: { id }, enabled: isAdmin, retry: false })`; patch through `.customWidget.templatePatch.mutationOptions()` and `mutateAsync(input)`. Exact cache write uses `.readTemplate.queryKey({ input: { id } })` with merged raw read data including `name`. Preserve expected revision, line edits, lock, diagnostic/conflict behavior, and imperative `client.customWidget.validateTemplate({ templateLines })` rather than caching edited templates.
3. Secrets: `.widget.secrets.getConfiguredKinds.queryOptions({ input: validItemAndGrant ? { itemId } : skipToken, enabled: validItemAndGrant, retry: false })`; real output is `string[]`. Use `.setSecret.mutationOptions()` / `.deleteSecret.mutationOptions()` with existing single-flight `mutateAsync` controls. Exact cache key is `.getConfiguredKinds.queryKey({ input: { itemId } })`; release invalidation is `.widget.releases.getLatest.key()`. Secret values remain mutation variables, never keys/metadata/hydration.

Capture scope/item before awaits, assert current before cache effects and callbacks, and unmount retired consumers before publishing a new scope. A stale/retired mutation may already have committed: do not claim rollback, retry it, or announce definitive failure; reconcile through fresh authorized state. Router owns navigation/preload cancellation; Query owns its request cancellation. Root SSR stays positively public-success-only, excludes mutations, and uses the same QueryClient. No public prefix or metadata authorizes private HTML.

The assembly has no `app`, `board`, `user`, `group`, `docker`, `kubernetes`, `assistant`, media, or Workshop namespace; owners cannot use this client to migrate those families by inventing methods. Existing Integration `create/update` live in operations and are present in the full assembly, while management pending-path arrays are not extra procedures. Q16/Q18/J5 principal/request joins and actual widget/custom-widget leases remain held; no private provider or routes should be mounted from this return alone.

## Source reuse and validation

- Original algorithm reuse: accepted `assembly/index.ts` → type-only full browser client; accepted `routers/integration.ts:70–87` → genuine public factory selection; accepted `query/scope.ts` → actual beta.43 generated utility/lifecycle implementation. These accepted files were not edited, replaced, or re-extracted.
- Installed evidence: frontend manifest already declares client/server/Query adapter beta.43, React Query 5.101.2, React 19.2.7. API declares server beta.43. Read actual fetch adapter `RPCLinkOptions`, `StandardUrl`, `createORPCClient`, generated `RouterUtils`, query/mutation options, and installed fetch runtime cancellation forwarding. No Context7 quota retry or installation.
- Focused lint on immutable copied ten owned files using clean `env -i`, isolated HOME, explicit Node 24.18.0, copied oxlint 1.73.0 and repository rules: **0 warnings, 0 errors**.
- Transport-only typecheck on the immutable copied `client/rpc-link.ts` and installed external declarations, clean environment, TypeScript 7.0.2, `--noEmit --incremental false --strict --skipLibCheck --target ES2023 --lib ES2023,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --types react`: **passed after the StandardUrl correction**.
- Whole binding/API typecheck remains **not certified**: its true router-derived client contract recursively reaches actively edited resource/source dependencies. No synthetic contract stub, peer-source snapshot/race, broad typecheck, native invocation, build, browser proof, or runtime success is substituted. Owner01 must check the complete frozen closure and eventual declarations/mount before integration.

No subprocess remains active. Freeze these owned sources for the coordinator's immutable integration snapshot; later peer consumer or root composition work is not part of this lane.

## Reopened02 — review P2 correction

Exact reopened write inventory, recorded before the source correction: only `apps/nitro/src/client/rpc-link.ts` and this existing handoff. All other02 source files, peer modules, scopes, providers, and assembly contracts remain frozen.

Review `ses_ed4a15765ffepYQwRDRYQYK77Q` identified that validating a resolved URL but fetching the original relative request allows document `<base href>` to choose a different destination. The correction resolves once against the captured origin, validates that same URL, and passes its absolute `href` to native fetch. Keep the installed beta43 slash-path `StandardUrl` for `RPCLink.url`, POST, complete adapter `RequestInit` spread, same-origin credentials, redirect rejection, and endpoint credentials/query/fragment guards unchanged. The review already isolates the mechanism; no additional hypothesis exploration, new test files, browser execution, or private authority work is required or claimed.

Focused correction validation artifacts are allocated only beneath the existing disposable external closure at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-lane02-20261011/p2-recheck/`: `rpc-link.ts`, empty `home/`, `lint.stdout.log`, `lint.stderr.log`, `types.stdout.log`, `types.stderr.log`, `validation.json`, and `source.sha256`. No other source enters the lint/typecheck target.

### Correction validation — frozen return

- Verified installed beta43 `FetchLinkTransportOptions.fetch(url: string, init: RequestInit, options, path): Promise<Response>` and slash-path `RPCLinkCodecOptions.url: StandardUrl`. The real fetch adapter assembles body, headers, method, signal, redirect, and optional duplex before calling this override. The correction spreads its actual `init` unchanged except the existing credentials/redirect policy; only the fetch destination changes.
- Confirmed the isolated copied fetch declarations/runtime, standard adapter declarations, and core `StandardUrl` declarations are byte-identical to current installed evidence. The one-file source snapshot remains byte-identical to the reopened source after both checks.
- Clean `env -i` launcher; child environment contains only isolated HOME and explicit Node24.18.0 PATH. No env files, source symlinks, emits, incremental caches, application execution, tests, or mutable peers.
- **Lint passed:** copied oxlint1.73.0, repository lint config, only `p2-recheck/rpc-link.ts`; exit0, 0warnings/0errors. Full unfiltered stdout/stderr: `p2-recheck/lint.stdout.log` and `p2-recheck/lint.stderr.log`.
- **Types passed:** copied TypeScript7.0.2, only `p2-recheck/rpc-link.ts` plus actual copied installed external declarations; same strict no-emit/no-incremental flags recorded above; exit0 and empty raw stdout/stderr. Logs: `p2-recheck/types.stdout.log` and `p2-recheck/types.stderr.log`.
- Exact invocations, environment, exits, evidence match, and source hash are retained in `p2-recheck/validation.json`; `p2-recheck/source.sha256` records the updated source SHA-256: `d0335c1cd7722d75c6ac35b5f08cfab2344b0953ae708550da1c76aa565a64db`.

Reopened write lease is returned frozen for independent rereview. Only the two enumerated repository files changed in this correction; no other02 source, adapter policy, private scope/authority, provider, contract, assembly, mount, or peer module changed. No process remains active. This scoped static evidence does not claim integrated/browser/runtime certification.
