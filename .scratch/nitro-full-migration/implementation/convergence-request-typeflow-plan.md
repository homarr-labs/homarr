# Request-handler: exact bounded type-flow plan

## Disposition

**PLAN ONLY.** This lane writes only this new report. Product changes require coordinator approval and an editor lease. No compilation, lint, tests, imports/evaluation, hashes, SQL/native/engine operations, network calls, private configuration/data reads, dependency changes or nested agents were performed. One read-only `git status --short` command was run during orientation; it made no product changes. Source and installed declarations/manifests were otherwise inspected with read/search tools. Context7 was not called or retried.

The fresh supplied record is `TEMP/nitro-convergence-post-types-95fr3hcq/records/packages-request-handler.stdout`, with TEMP `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`. It contains exactly three diagnostics: factories.ts:114 and releases.ts:462/:478. This report does not reinterpret older captures as fresh evidence.

## Actual factory seam: there is no decoded input here

`nitro-bindings/factories.ts:106–115` receives `RequestOptions<TData, TInput>`, spreads those options, and overrides `requestAsync` in a call whose generic arguments are omitted. `lib/widget-request-runtime.ts:25–47` already declares the same two parameters and explicitly calls `createRequestHandler<TData, TInput>`. `lib/request-handler.ts:277` captures the caller's actual `TInput`; :354 passes that same object into `startRequestWithDeadline`; :179 passes it to `options.requestAsync`. No deserialization or cache-key-to-input conversion occurs on this path.

The contextual callback at :113 loses the enclosing generic association and becomes `Record<string, unknown>`. This is inference loss, not evidence that an unknown decoded record is a valid arbitrary `TInput`. The existing integration wrapper at factories.ts:77 already uses explicit generic arguments for precisely this association.

**Exact lease A: `packages/request-handler/src/nitro-bindings/factories.ts`, one statement change only:**

```diff
-      widgetRuntime.createWidgetRequestHandler({
+      widgetRuntime.createWidgetRequestHandler<TData, TInput>({
```

Keep the options spread, callback, HTTP scope, tracking and signal expressions unchanged. This contextually types the callback parameter as the actual outer `TInput` and preserves `TData` through `runAsync<T>` (`resources.ts:19`) and `track<T>` (`factories.ts:61`). No casts, new decoder, callback adapter, weaker global signature or fabricated type token is needed. Do not change the plain/integration factories or any producer signature.

### Existing parsed inputs and outputs

The registered producer boundary is already concretely typed, rather than a generic deserializer contract:

- Stock: `api/src/nitro/routers/widgets.ts:974–985` parses a nonempty stock and the registered range/interval enums, then constructs the exact stock request object. The producer at `public-requests.ts:43` receives its three strings; its response parser at :48 yields either the error object or chart object, discriminated with `"error" in data` before chart access. The returned price-history object is still inferred from that actual parsed data.
- Minecraft: widgets.ts:1618–1623 parses domain/boolean and constructs that exact request. `public-requests.ts:28–34/:68` returns the actual parsed `online: false | true` response union, not a casted common record.
- RSS: widgets.ts:1427–1443 retains the 100-URL cap, description bounds/default, external-connection guard and feed-access restriction, then constructs `{ url, count, descriptionMaxLength }`. The existing extraction/enclosure handling and its pre-existing response assertion are not this lease.
- Weather/air quality: widgets.ts:88 supplies bounded coordinates; the two registered routes use that parser. `weather.ts:75` has the actual coordinate input and `Promise<Weather>`; `air-quality.ts:197–222` parses the upstream output before normalizing and checks the result with `satisfies AirQuality`. Do not replace these with a generic input/output record.
- `nitro-bindings/index.ts:35` checks the assembled requests against `WidgetRequestPrimitives`. Preserve this check, the concrete primitive contracts and all registered procedure descriptors/capabilities.

`shared-cache-runtime.ts` hashes serialized input but reads cached **response data**, not input. Its existing envelope predicate checks dates/retention and does not validate arbitrary `TData`; its pre-existing response assertion at :136 cannot establish an input decoder. `board-query-snapshot.ts:67–80` likewise returns a structurally inspected query descriptor, not a validated arbitrary `TInput`. Neither seam is involved in the reported :114 diagnostic. Do not borrow either predicate to assert generic input validity, remove cache checks, or create a new decoder framework. If a subsequent fresh diagnostic identifies an actual decoded-input consumer, it needs its own closed registered-schema/parsed-output lease; this two-file plan does not approve a generic assertion there.

## Docker Hub: exact path typing and actual security limits

`releases.ts:59` has the existing `buildUrl(baseUrl: string, path: \`/${string}\`)`signature. Both ternary branches at :454–456 start with known Docker Hub API endpoint prefixes and encode the interpolated owner/name. Their unannotated conditional result widens to`string`, causing both fresh diagnostics. There is no existing exported `Path` validator in this seam; the real path contract is this template-literal parameter.

**Exact lease B: `packages/request-handler/src/nitro-bindings/releases.ts` only.** Add this local, nonexported type adjacent to the existing URL helpers:

```ts
type DockerHubRepositoryPath =
  | `/v2/namespaces/${string}/repositories/${string}`
  | `/v2/repositories/library/${string}`;
```

Annotate the existing declaration, preserving its branches byte-for-byte:

```ts
const relativeUrl: DockerHubRepositoryPath = parsed.owner
  ? `/v2/namespaces/${encodeURIComponent(parsed.owner)}/repositories/${encodeURIComponent(parsed.name)}`
  : `/v2/repositories/library/${encodeURIComponent(parsed.name)}`;
```

This is contextual checking of actual fixed-prefix construction, not an assertion of an arbitrary string. The existing tags suffix now begins with `/`; the existing details call accepts the same path. Keep `buildUrl` and the details signature strict and unchanged. Do not widen either to `string`, introduce a fallback path, or cast either call.

### Required validated-origin/path addition, if the requested safety condition is part of acceptance

The type-only annotation is **not** runtime origin validation. The existing normalizer (`definitions/src/release-provider.ts:68–77`, called at releases.ts:755) trims and strips Docker image registry/tag/digest syntax; it does not validate endpoint safety. `parseOwnerName` ignores components after the second. `encodeURIComponent` leaves `.` and `..` unchanged, so URL parsing can resolve a dot component outside the intended repository endpoint. These facts must not be advertised as existing validation.

The smallest local safety cut is inside `getDockerHubReleaseAsync`, with no API/schema/factory or transport changes. Continue receiving the identifier already processed by **the exact existing** `normalizeReleaseProviderIdentifier`; do not reimplement that normalizer. Replace the existing `if (!parsed)` guard with:

```ts
if (
  !parsed ||
  !parsed.name ||
  identifier !==
    (parsed.owner ? `${parsed.owner}/${parsed.name}` : parsed.name) ||
  [parsed.owner, parsed.name].some(
    (segment) => segment === "." || segment === "..",
  )
)
  return {
    success: false,
    error: {
      code: "invalidIdentifier",
      message: `Cannot parse "${identifier}"`,
    },
  };
```

Immediately after the typed `relativeUrl` declaration, before headers or any fetch, insert:

```ts
const base = new URL(baseUrl);
const repositoryUrl = new URL(buildUrl(baseUrl, relativeUrl));
if (
  (base.protocol !== "https:" && base.protocol !== "http:") ||
  base.username !== "" ||
  base.password !== "" ||
  base.search !== "" ||
  base.hash !== "" ||
  repositoryUrl.origin !== base.origin ||
  repositoryUrl.pathname !==
    `${base.pathname.replace(/\/$/, "")}${relativeUrl}` ||
  repositoryUrl.search !== "" ||
  repositoryUrl.hash !== ""
)
  return {
    success: false,
    error: {
      code: "unexpected",
      message: "Invalid Docker Hub API base or repository path",
    },
  };
```

The check validates the URL produced by the original constructor against the actual configured origin and full expected endpoint pathname; it is not a source-record predicate claiming a decoded target type. Rejection is explicit, not `undefined`, a default origin or skipped parsing. The original `removeTrailingSlash` remains in the provider dispatch. No request URL is rebuilt differently: accepted names/base URLs still use the original constructor, query string and details suffix at the original call sites. Empty/dot/incompletely parsed identifiers and ambiguous/credentialed/non-HTTP bases are rejected before dispatch. This is deliberate malformed-input tightening and needs approval, not a claim of byte-for-byte behavior on those rejected inputs.

The actual registered input at widgets.ts:1665–1676 permits `providerUrl: z.string().url().optional()`, and :1723 prefers a saved provider URL. Thus the existing product supports custom API origins, not only literal `https://hub.docker.com`. Do not silently hard-code Docker Hub's hostname, reset the configured base, drop tokens, or add a proxy choice. The proposed local check guarantees that **repository segments cannot replace the configured origin or escape its endpoint path**. It does not authorize a new hostname allowlist or certify the saved URL's trustworthiness.

Also, the HTTP fetch path currently forwards ordinary fetch options and does not set a Docker-Hub-specific redirect policy (`nitro-bindings/http.ts:170–194`). Therefore **no-follow/no-cross-origin HTTP redirect guarantees are unavailable under the no-network-behavior-change constraint**. If acceptance requires literal Docker Hub-only origin or enforcement against upstream redirects, keep that requirement blocked for a separately approved origin/redirect policy; do not claim these annotations/local URL checks supply it. No transport/core/auth/config file is leased here.

## Invariants and lease boundaries

Two product files maximum. The pure compiler fix consists of one generic call association plus one local path type/declaration; the optional approved strict-construction cut stays in the same Docker Hub function. No new capability or producer is registered; acceptance is source definition/type correctness, not activation.

Leave cache namespaces/versions/keys, TTL/stale rules, locks/fences/generations, response-envelope checks and snapshot query caps unchanged. Preserve request timeout/concurrency/settlement budgets, cancellation propagation, ownership, pending tracking, producer response parsers, statistics creation/shutdown, HTTP body cancellation/dispatcher destruction/late physical settlement and quarantine rules. Preserve page range `0..5`, `page_size=100`, details-on-match timing, bearer headers, provider retries and all other release providers. No requests, retry/lazy-fetch strategy, defaults/proxies, libraries, tests or comments are added. Malformed-input rejection, if approved, is the only runtime change.

Dependencies were inspected in the nearest request-handler manifest: Zod, Octokit, Undici and SuperJSON are already declared. This delta adds no library usage. Installed TypeScript is 7.0.2 and oxlint 1.73.0; their executable entries were read, not run. No Context7 call is needed for these existing source-level generic and built-in URL operations.

## Editor release and focused validation after freeze

1. Coordinator chooses whether approval covers only the exact compiler delta or also the explicitly scoped malformed-input safety guard. Never merge an unreviewed origin/redirect policy into this lease. Editor captures approved before-images, applies only approved deltas to A/B, returns the exact diff and freezes. Other writers remain editor-only; invite/core/Auth/schema/config/assets remain frozen and readable.
2. Independently review actual after-source against this plan, including the callback's `TInput`/`TData` association and unchanged registered descriptors/caps. Source equivalence does not inherit older byte-associated results.
3. Coordinator runs one unchanged **request-handler program** compiler-only check, with fresh output/exit receipt and source association, from `packages/request-handler`:

```text
/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run <checkout>/node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false -p <checkout>/packages/request-handler/tsconfig.json
```

4. Coordinator runs installed lint from the original repository policy cwd, only on these two actual leased files:

```text
/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run <checkout>/node_modules/oxlint/bin/oxlint <checkout>/packages/request-handler/src/nitro-bindings/factories.ts <checkout>/packages/request-handler/src/nitro-bindings/releases.ts
```

Both checks require exit 0 and no introduced diagnostics. Expected removal: the :114 generic-input error and both :462/:478 path errors, without output/handler widening. These are expectations, **not executed results**. Preserve unrelated diagnostics as real blockers; do not prune compiler roots, rewrite config, add ambient shims/suppressions, change skipLibCheck, or invoke broad Turbo/build/test/E2E/Docker/native suites. The current inherited skipLibCheck setting is not changed by this plan and is not new evidence of declaration validation. No new tests are authorized.

5. Green focused checks establish static closure only. Retain original query/cache/physical-settlement evidence under its original source identity, and separately associate these new bytes and checks. No publication, enrollment, origin-policy, runtime activation or migration-wide PASS follows from this report.
