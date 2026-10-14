# PLAYABLE-WAVE32 lane03 — navigation bridge

## Reopened03 P2 correction scope

Before edits, the only reopened repository writes are `apps/nitro/src/navigation/source-bridge.tsx`, `apps/nitro/src/navigation/source-search.ts`, and this handoff. `source-routes.ts`, `index.ts`, `intent.ts`, `owner.ts`, `query-loader.ts`, and `scope.ts` remain frozen. This correction addresses refresh error settlement, malformed destination inputs, actual management catchall/literal path interpolation, and query-pair leading-question-mark parsing. Earlier validation below is historical; fresh isolated evidence and hashes will be recorded for rereview.

## Enumerated writes before implementation

- `apps/nitro/src/navigation/source-routes.ts` — original Next page-to-TanStack path inventory, independent of active route registration.
- `apps/nitro/src/navigation/source-search.ts` — original URLSearchParams-compatible duplicate/string search serialization for lane01.
- `apps/nitro/src/navigation/source-bridge.tsx` — concrete shared UI NavigationProvider/Link and Next-style navigation hook binding.
- `apps/nitro/src/navigation/index.ts` — additive exports only.
- `.scratch/nitro-full-migration/implementation/playable-03.md` — this handoff and validation outcomes.

Existing `intent.ts`, `owner.ts`, `query-loader.ts`, `scope.ts`, and their accepted semantics remain unchanged. No router, route tree, Query client, manifest, lock, feature screen, shared UI body, backend, or tRPC adapter writes. No active peer implementation is treated as accepted.

## Source and dependency evidence

Read `PLAYABLE-WAVE32.md` including Oracle amendments and `STACK-ADAPTER-APIS.md`. Original destinations come from `apps/nextjs/src/app/[locale]/**/page.tsx`. Original `packages/translation/src/routing.ts` specifies `localePrefix.mode = "never"`; no locale path prefix is invented. Accepted shared `@homarr/ui/navigation` exposes string href/replace/scroll/prefetch and pathname/search.

Current app declarations include React 19.2.7, Router 1.168.8, Query 5.101.2, `@homarr/ui`, and `@homarr/common`. Installed Router `src/link.tsx`, Core `src/router.ts`, and public declarations were inspected for native Link, href navigation, preloadRoute, history, invalidate and search parser/serializer. Context7 quota is exhausted; no retry or package installation is performed.

## Concrete implementation and frozen exports

The four enumerated source files are ready for consumer integration. Existing accepted helper bodies are unchanged. No new declaration is required.

| Export                                                | Contract and use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SourceNavigationProvider`                            | `PropsWithChildren`; mount once inside the existing Router and the existing QueryClientProvider, around original shared UI. It provides the actual accepted `@homarr/ui/navigation` context rather than a second navigation context.                                                                                                                                                                                                                                                                                   |
| `SourceLink`                                          | Exact accepted `NavigationLinkProps`: required string `href`, native React anchor props/events/ref/children, optional `replace`, `scroll`, `prefetch`. Existing Mantine `component={Link}` consumers retain their original shared Link body. Internal rendering uses actual TanStack `Link`; external and download links remain native anchors. Unsafe source-policy URLs have no href.                                                                                                                                |
| `useSourceRouter`                                     | Next-style `push(href, {scroll?})`, `replace(href, {scroll?})`, `back()`, `forward()`, `prefetch(href)`, `refresh()`. Push/replace return the actual native navigation promise. History delegates to the existing Router history. Prefetch returns actual `preloadRoute` output; it rejects external targets, not fake success.                                                                                                                                                                                        |
| `useSourceLocation`                                   | Live `{pathname, search, hash}` from Router `location.publicHref`; search/hash retain URL syntax. No current pathname/search is captured permanently in a navigation action.                                                                                                                                                                                                                                                                                                                                           |
| `useSourcePathname`, `useSourceSearchParams`          | Minimal hook replacements for original source imports. SearchParams is a detached native URLSearchParams view; callers may keep their original `get/getAll/has/toString` and copy-before-edit code. It does not write navigation by itself.                                                                                                                                                                                                                                                                            |
| `resolveSourceDestination(href, currentHref, origin)` | Discriminated `internal` / `external` / `blocked` result. Internal includes `href`, `pathname`, native `to`, decoded `params`, parsed `search`, hash without `#`. Same-origin absolute, query-only, hash-only, dot/bare relative and protocol-relative URLs resolve against the real current URL. Reuses accepted `getSafeAppHref` safety policy.                                                                                                                                                                      |
| `sourceRoutePaths`                                    | Frozen exact original page-pattern → TanStack path-pattern map; **61 original pages, 61 unique public destinations**, mechanically compared with the original file inventory. No `/media`, `/onboarding`, `/profile`, or other replacement destination is invented.                                                                                                                                                                                                                                                    |
| `sourceSearchSerialization`                           | Frozen native Router options `{parseSearch, stringifySearch}`. Strings remain strings, duplicate keys remain repeated arrays/URL pairs rather than JSON arrays, and unchanged/interleaved pairs retain their original encoding/order. A symbol-held raw snapshot survives native search validation/spread/structural-sharing without becoming a query key or serialized string field. No process cache or client is created. Unsupported object search values throw rather than silently inventing a transport format. |

Exported types: `SourceDestination`, `SourceNavigationOptions`, `SourceNavigationRouter`, `SourceRoutePattern`, `SourceRouterPath`. Existing `InternalLink`, `internalLinkOptions`, `useInternalNavigate`, owner, finite Query loader and navigation intent exports remain available and unchanged.

### Original route mappings

Full authoritative mapping is executable in `source-routes.ts`. Static routes are identity mappings; original `[name]`, `[id]`, `[userId]`, `[containerId]`, `[kind]`, `[token]` become the corresponding `$name`, `$id`, `$userId`, `$containerId`, `$kind`, `$token`; the original management catchall maps to `/manage/$`. Original route groups disappear from public paths, exactly as in Next. Actual destination resolution honors static-segment precedence before dynamic segments, so `/manage/users/groups/general` remains group id `general`, not user id `groups`.

Families: `/`, `/boards`, `/boards/$name[/settings]`, `/auth/login`, `/auth/invite/$id`, `/init`, `/widgets/$kind`, `/reference/api`, `/custom-widget-configuration/$token`; `/manage` and its original apps, assistant, boards, custom-widgets, integrations, **medias**, search-engines, settings, about, workshop, tools and users/group subroutes. Raw board editor `layout`, `edit`, `returnTo`, settings `tab`, list `page/search`, integration `kind`, user/group `create`, login callbacks and arbitrary unrelated query pairs are not renamed, dropped, or converted into replacement destinations.

### Lane01 join, without competing root edits

1. Spread `sourceSearchSerialization` and the already accepted `navigationRouterDefaults` into the actual Router options; retain its existing context, QueryClient, SSR callbacks and hydration policy. Set the actual request origin for SSR and retain matching browser origin. Route validation must respect original scalar/duplicate semantics and retain unknown query pairs; do not enable strict query stripping or default-inserting search middleware that changes original URLs.
2. Mount `SourceNavigationProvider` inside existing Router/Query providers around original UI. It fails visibly if its Router does not use the supplied serialization. No substitute Router or QueryClient is supplied here.
3. Shared `packages/ui/src/components/{link,search-input,table-pagination}.tsx` and accepted presentation Link slots then use the real bridge without screen edits. Source owners can replace `next/navigation` imports with `useSourceRouter as useRouter`, `useSourcePathname as usePathname`, `useSourceSearchParams as useSearchParams`; string-href Link consumers can use `SourceLink` directly. Keep source-specific mutation/revalidation authority with their existing owners.
4. Register only reviewed/frozen original routes from `sourceRoutePaths`. The mapping is not a registration or a claim that held routes are mounted. Native typed route consumers can continue using `InternalLink`/`internalLinkOptions`/`useInternalNavigate` after registration; the string-href bridge exists specifically for accepted original UI contracts.

### Navigation, refresh and policy semantics

- Internal links delegate modifier/middle-click/new-tab/keyboard/event-prevention/ref handling, route preloading and blockers to native Link. No global click listener, raw-anchor internal router, alternate history or manual Query prefetch cache is installed. `scroll:false` disables both reset-scroll and hash scrolling; replace remains replace, not push. `prefetch:false` disables preload, `true` uses native viewport preload, unset/null uses native intent preload.
- Actual dynamic params are supplied separately from route templates; literal dollar signs and percent-encoded board names do not become accidental template variables. No route destination is renamed to a new product screen.
- Refresh attempts Query invalidation/active refetches (`throwOnError:true`, `cancelRefetch:false`), then always attempts `router.invalidate({sync:true})` after that attempt settles, including Query rejection or context mismatch. Single failures retain their original rejection value; dual failures reject an `AggregateError` containing the Query/context failure followed by the Router failure. It creates no client, key namespace, fake response or no-op refresh. This is frontend data revalidation, not server mutation authority or a mutation-commit receipt; native Router loader errors retain native error-boundary behavior.
- External clicks preserve accepted safe custom schemes through native anchors. Imperative external navigation uses native reloadDocument navigation and respects Router protocol admission; an unadmitted protocol throws instead of returning an apparent success. No protocol allowlist or external target policy is widened here.
- Blocked targets and prefetch results are not fabricated navigation success. Native navigation/preload completion does not prove mutation persistence, authentication or authorization.

## Focused immutable validation

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-03-navigation-dfhikgqk`.

Only the new navigation files plus unchanged `scope.ts`/`query-loader.ts`, accepted UI navigation leaf, accepted common URL leaf, and installed third-party dependency closure were copied. All dependency contents were dereferenced copies, not source/dependency symlinks or watches. No mutable feature, root-router, generated-route or private producer closure was consumed. Config/output exists only in the disposable snapshot; no emitted/cache/protected application output or listener was produced. Commands used `env -i PATH=/usr/bin:/bin`, explicit Node **24.18.0** / Bun **1.4.2**, and Bun `--no-env-file`.

- Final TypeScript **7.0.2** `--noEmit -p tsconfig.json`: **PASS** on new bridge/search/inventory and frozen finite-query/scope leaves plus their copied real declaration closure. Initial missing compiler platform binary was corrected by copying the already installed `@typescript/typescript-darwin-arm64`, not installing anything.
- Final oxlint **1.73.0** using copied repository config on all four changed navigation source files: **PASS, 0 warnings/0 errors**. An earlier wider leaf lint reported the existing unchanged `scope.ts` no-shadow warning; that accepted helper was not edited. Initial new anchor content errors were corrected before the final pass.
- Disposable inline probes of actual copied implementation: **PASS** for string/duplicate/interleaved/raw-encoding search roundtrip, changed-key preservation, JSON-looking strings, safe `__proto__` input, encoded dynamic board params, static group-route precedence, relative/same-origin/protocol-relative/external resolution and blocked dangerous schemes. No new test files.
- Native installed Router memory-history probe: **PASS** for actual preload/navigation with `$special` encoded board name, repeated/interleaved query pairs, hash, and subsequent query/hash replace retaining the history index. This used a disposable synthetic route tree only; no application router source or runtime was changed.
- Mechanical original inventory comparison: **PASS**, 61 original pages exactly equal 61 map keys; every param/catchall conversion matches its original pattern and no extra target exists.

### Exact remaining validation/mounting boundaries

The additive barrel's unchanged owner/intent reexports import the application Router/generated tree; integrated barrel/root typing cannot honestly be validated against active lane01 edits. The new implementation and native API declarations are independently typechecked; owner/intent bodies remain unchanged. Final registered-route types, source-specific search validators, React/browser mounting, SSR hydration, actual viewport/hover preload timing, scroll/focus, modifier events, dirty blockers, provider lifetime and refresh against actual approved oRPC consumers belong to the frozen lane01 integrated closure. No browser, live service, Docker/build, credentials, protected ports, Git, child agent or new test file was used. This is concrete frozen navigation implementation, not production or all-routes-playable proof.

## Frozen source hashes

| File                | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `source-bridge.tsx` | `7c894045176ca779c26a4cf7e3427e1be804ea6caa8b3225ca765a150d3963b9` |
| `source-routes.ts`  | `748f95c7bcbf52a610a43ac8a1e571d56a5dfdfe01887c1b4511ec664c2e4cce` |
| `source-search.ts`  | `5cb580c3f5f5400b10e37d28f6c7bdaadaf231f7b1fef2f6e2baac6e9cd77f08` |
| `index.ts`          | `54a7fc01a4545ac23f7684925602facc3c6ac76a01eb4ade1db80c5353ee8b36` |

## Reopened03 P2 correction — ready for independent rereview

Only the two reopened navigation bodies and this handoff changed. Existing public exports/props are unchanged; the route map, barrel, accepted helpers, manifests and root consumers remain frozen. No new route cache, Router, QueryClient, RPC client, schema or runtime abstraction was added to production code.

### Four concrete repairs

1. **Refresh settlement:** Query/context failure no longer skips Router invalidation. Both attempts are separately caught, the Router attempt always runs after the Query attempt settles, a single failure is rethrown unchanged (including an `undefined` rejection), and dual failures preserve both objects in order inside `AggregateError`. Wrong QueryClient context still avoids invalidating the wrong cache, but cannot skip Router revalidation or return fake success.
2. **Malformed destinations:** The Router origin/current-URL base is constructed outside input handling. Malformed href URL construction and malformed internal percent decoding return `blocked`; invalid Router origin/current-URL configuration and existing serialization/provider guards still throw. `/boards/%`, invalid UTF-8 escapes, `//`, and invalid protocol-relative hosts therefore cannot crash SourceLink rendering just because of their href input.
3. **Catchall/literal interpolation:** Exact/static/named original routes retain priority. The original `/manage/[...not-found]` mapping is then resolved as native `/manage/$` with a separately decoded `_splat`, rather than skipped. Unknown paths outside that original catchall retain their literal path through percent-escaped dollar characters in `to`, preventing native template interpolation/inherited params from changing them to `undefined`. Literal dollars may appear as equivalent `%24` in native hrefs; no substitute screen, route or fallback destination is invented.
4. **Search raw pairs:** Each raw pair is parsed using `new URLSearchParams(\`?${part}\`)`. The synthetic leading marker is consumed instead of a literal pair-key-leading question mark. Repeated `?b`and encoded`%3Fb` keys now roundtrip/update/delete correctly while retaining original unrelated pair encoding/order. The original raw pairs are still emitted unchanged when their values are unchanged.

### Actual installed dependency resolution

Read-only importer resolution from `apps/nitro/package.json` confirms React Router **1.168.8** resolves **nested Router Core 1.168.7** at `node_modules/@tanstack/react-router/node_modules/@tanstack/router-core`, matching its exact declared dependency. Hoisted Core **1.168.5** is not that importer’s implementation. The fresh isolated closure explicitly copies the nested 1.168.7 package and its nested `cookie-es` dependency, byte-checking its actual `src/{path,utils,router}.ts` and public Router declarations. Both native `interpolatePath` branches, `_splat` handling, reserved-dollar percent encoding, and `buildLocation` ordering were inspected in that resolved version. Query **5.101.2**, React/DOM **19.2.7**, TypeScript **7.0.2**, oxlint **1.73.0** remain installed/declared. No installation or package change.

### Fresh immutable evidence

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-03-p2-rpo29tom`.

Repaired bodies and frozen local leaves were copied byte-identically; copied third-party dependencies, including the importer-resolved nested Core, contain no symlinks. Checks ran with `env -i PATH=/usr/bin:/bin`, Node **24.18.0**, Bun **1.4.2** `--no-env-file`, no emitted application files/cache/watch/listener and no active peer-source type graph.

- **Lint:** `node node_modules/oxlint/bin/oxlint -c .oxlintrc.json src/navigation/source-bridge.tsx src/navigation/source-search.ts` — exit **0**, **0 errors/0 warnings**.
- **Types:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` — exit **0**. Snapshot config includes repaired bridge/search, frozen route inventory and unchanged scope/finite-query helper leaves; no mutable root/generated-tree closure.
- **Focused edge probes:** exit **0**, no new test files. Actual copied functions plus actual SourceLink/useSourceRouter hooks were exercised using isolated React static markup and callback-only synthetic context fixtures. Checks cover malformed href blocked markup versus thrown configuration errors; raw and encoded leading-question-mark keys with duplicates/update/delete; all **61 original paths in both resolved Core interpolation branches (122 checks)**; separately supplied management `_splat`; unmatched dollar/braced-dollar literal paths; static group-route precedence; refresh success, Query failure, Router failure, both error identities/order, undefined rejection, and context mismatch with/without Router failure. Router invalidation was observed in every refresh case. No QueryClient/RPC client, live query/data provider, browser/native UI, application process, loader/navigation execution or private join was created or activated.
- **Inventory:** fresh read-only comparison still proves **61 original pages = 61 frozen mapping keys**, with no omitted/invented destination or altered bracket/catchall conversion.
- **Freeze checks:** route inventory/barrel hashes still match the prior return; unchanged `scope.ts`, `query-loader.ts`, `intent.ts`, `owner.ts` retain the same read-before/read-after hashes. Current repaired source bytes equal the checked copies.

Raw tool stdout/stderr is retained in the snapshot; successful TypeScript raw output is empty. `validation-results.json` records exit codes, version resolution and source/log hashes.

| Raw log             | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `lint.raw.log`      | `a544e55b3a62e9a51ba1b0b1507438c2d2b0d583a363ae54200f00223bfad71b` |
| `types.raw.log`     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `edges.raw.log`     | `f9ea309b3e38135a7748d89aee894833798e2eeac7beaf7a791637eacab45393` |
| `inventory.raw.log` | `a38c2e9a56d290d05d0a176b74d3ed5f60d13a805047614adc3fed799f3451bb` |

Integrated application/browser/native/runtime/private acceptance remains held exactly as before. No child agent, Git, new tests, browser, build, protected output/port, credential or private composition work. This correction is returned for independent rereview, not self-acceptance.
