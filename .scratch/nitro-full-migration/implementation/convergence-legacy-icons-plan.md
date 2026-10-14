# Legacy icon compatibility: bounded source plan

## Outcome and scope

Propose an **app-first, one-file patch** in `packages/api/src/router/app.ts`. A genuine legacy lookup is expressible with existing typed Drizzle selection and tables; an `IconReadScope` adapter is unnecessary. Separately propose callback-local provider composition in `packages/cron-jobs/src/jobs/icons-updater.ts`, conditional on explicit source-limit selection and body-cleanup review. Do not manufacture native authority to make its factory callable.

This task preserves the default Next/tRPC application. The older `implementation/icon-consumer-prerequisites.md` recommendation to retire historical callers is not the disposition requested here. Native Icons contracts, readers, services, API contributions and job bodies remain unchanged. Compatibility source is not native admission, through-COMMIT authority, application boot or procedure acceptance.

Only this new report was written. Checked-in source and recorded progress were read; no commands, hashes, checks, compilation, evaluation, network, SQL, Engine/container, environment/configuration values, data/secrets, nested agents or product-source writes occurred. The destination was absent immediately before creation.

## Current baseline, not a new result

`.slim/deepwork/nitro-full-migration.md:23–35` records the original 37-workspace baseline: 18 exits zero, 19 exits one, 49 distinct diagnostics. The newer seven-scope visibility result has UI/custom-widgets/backend/Nitro green, Core failing only proxy callback inference, DB failing existing schema parity assertions, and Boards reaching stale icon/updater/Docker-modal callers. Bun/CSS visibility and the earlier DB iterator diagnostic are already resolved. Do not rerun or repair them from the old baseline. This plan claims no fresh green result or reduction in 91/334 remaining acceptance work.

## Actual public boundaries

| Existing source/public entry                                        | Capability and compatibility consequence                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/icons/index.ts:1–13`; `package.json:14–18`                | Root exports fetchers, typed resources, SQL readers, synchronization service, parsers and concrete repository classes. `/local` exports the pure local mapping helpers; `/native-read` publishes the native reader separately. No legacy entrypoint is currently published.                                      |
| `src/auto-icon-searcher.ts:4–21`                                    | `getIconForName(scope, name)` is async. Its actual SQL uses `%name%` LIKE, an inner repository join, exact local-media URL existence and `LIMIT 1`, with no ordering. It validates all stored fields and propagates SQL errors. A Drizzle database is not this scope.                                            |
| `src/resources.ts:1–36`                                             | Fetch resources require external policy, current authority, trusted HTTP, clock/deadline, three positive finite limits and error reporting. Local resources require real media reads and authority/error callbacks. Read resources require an actual dialect and SQL execution.                                  |
| `src/icons-fetcher.ts:8–88`                                         | `fetchIconsAsync(resources, local, signal?)` requires two resources. `createIconFetcher` constructs five existing remote repository classes plus `LocalIconRepository`; it settles siblings before propagating rejection. The metadata array is already public and authoritative.                                |
| `src/repositories/{github,jsdelivr}.icon-repository.ts`             | Public parsers accept unknown JSON, the existing metadata and limits. Their classes extend the resource-owning `IconRepository`; they cannot be constructed with just a DB/logger/fetch callback.                                                                                                                |
| `src/repositories/icon-repository.ts:45–139`                        | The class owns policy/currentness gates, a 10-second deadline through body consumption, HTTP/rate-limit metadata, bounded strict UTF-8 parsing and reader/body cleanup. Source unavailability is a failed group, not an empty success.                                                                           |
| `src/repositories/local.icon-repository.ts:6–40`; `/local`          | `mapMediaToIcon` uses original content bytes for MD5, unchanged name/size and `/api/user-medias/<id>`. Local failure is unavailable; it does not authorize clearing local icons.                                                                                                                                 |
| `src/service.ts:8–37`; `src/sql.ts`                                 | `createIconSynchronizationService` additionally needs actual read admission, selected-reference codec/bounds and required atomic apply. SQL readers cover media, repositories/icons and direct/serialized selected references. They do not expose a Drizzle legacy adapter.                                      |
| `src/native-read.ts:396–586`                                        | Native source requires a `PersistenceRuntime`, lifetime, explicit limits and captured bounded operations. It enforces fixed read groups and native/domain settlement. It is not a conversion constructor for `ctx.db`.                                                                                           |
| `packages/api/src/nitro/routers/-icons/native-read-resources.ts`    | Existing thin adapter still requires a genuine native source, operation capture and currentness. Do not call it with a copied legacy context.                                                                                                                                                                    |
| `packages/db/{index.ts,driver.ts,schema/index.ts,queries/index.ts}` | Full Drizzle selects/operators are public. Current `Database` is SQLite-typed; the PostgreSQL type and both concrete schemas are separately public. Existing query exports contain no automatic-icon lookup. `getSchemaForDatabase` already contains an internal cast; it is not permission to add another cast. |
| `packages/db/runtime-app.ts`                                        | Public contracts only. Its private statement file performs credential-checked app insertion, not icon lookup, and must not be deep-imported.                                                                                                                                                                     |

## First patch: the real legacy app caller

Exact future write lease: **`packages/api/src/router/app.ts` only**. No icons manifest, public entrypoint, DB driver/schema, tRPC context or native router edit is needed.

Replace the stale root `getIconForName` import and `.sync()` call at lines 223–237 with a local typed selection using public `@homarr/db` operators and `@homarr/db/schema` tables. Add only the required existing operators/types/table imports and the already public `/local` constants/helper if used. The relevant query shape is:

```ts
const [icon] = await ctx.db
  .select({ url: icons.url })
  .from(icons)
  .innerJoin(iconRepositories, eq(iconRepositories.id, icons.iconRepositoryId))
  .where(
    and(
      like(icons.name, `%${app.name}%`),
      or(
        ne(iconRepositories.slug, LOCAL_ICON_REPOSITORY_SLUG),
        exists(
          ctx.db
            .select({ id: medias.id })
            .from(medias)
            .where(
              eq(icons.url, sql`${createLocalImageUrl("")} || ${medias.id}`),
            ),
        ),
      ),
    ),
  )
  .limit(1);
```

This is an ordinary parameterized Drizzle select, not a raw statement executor, inferred dialect, fake scope or SQL cast. The projection needs only the URL consumed by this caller. Predicate semantics match the shared lookup, including rejecting missing local media and retaining LIKE wildcard behavior. No sorting, case normalization, extension preference or whole-catalog JavaScript matching is added. Do not use the native Apps helper: it currently lacks the local-media condition.

Build `InferInsertModel<typeof apps>[]` in input order with an awaited loop, generating the ID in the same position as the old map. Perform the query **only when `app.iconUrl` is nullish**; supplied URLs bypass all icon/repository/media reads. Then retain `icon?.url ?? defaultIcon`, the exact existing default URL, name/description/href fields, omitted bulk ping field and single later bulk insertion. Input already has `.min(1)` and nullable, nonempty supplied icon URLs (`packages/validation/src/app.ts:31–33`); do not modify validation or invent empty-input behavior.

A sequential awaited loop is the smallest safe replacement for this caller. It keeps ordinary ID/input order and does not introduce concurrent sibling reads that could outlive a rejected `Promise.all`. Repeated names may still perform repeated lookups, as before; neither this nor the existing unordered `LIMIT 1` establishes a new race or duplicate-query defect requiring a cache, sort or transaction redesign. SQL failure rejects before insertion; only a genuinely missing match uses the default.

Keep `permissionRequiredProcedure.requiresPermission("app-create")`, demo mutation protection, authentication, schema/output and metadata unchanged. `trpc.ts:150–192` performs the actual legacy authentication/permission gate before the mutation. It does **not** supply fresh credential authority after awaits or native write fencing. `db/index.ts:35–51` now requires configured tracked admission; no Next/API source binding was found by targeted reference search. The lookup patch cannot claim to construct that owner or repair broader default application startup. Do not add a callback boolean as its replacement.

Both database engines support the shown LIKE/join/EXISTS/concatenation semantics; `await` must remain, not `.sync()`. Keep the actual legacy database types intact: do not narrow a Node/PostgreSQL/SQLite union to satisfy this code. Current public `Database`/schema facade is SQLite-first, and `createDbMapping` defaults to SQLite; that is an existing owner-level compatibility limitation, not something this one-file icon patch proves fixed. If a released caller actually carries the PostgreSQL union, select its already-public concrete schema and use genuine existing engine narrowing with separately typed branches; never cast PostgreSQL to SQLite or guess a dialect from ambient configuration. Both-driver assignability is a later check requirement, not a claim from this read-only plan.

## Cron: genuine legacy transport exists, but do not fake native resources

The exact caller is `packages/cron-jobs/src/jobs/icons-updater.ts:14–22`. Keep its `NO_EXTERNAL_CONNECTION` early return **before logging, provider construction, trust/media reads or requests**, its registry name, weekly schedule and start behavior. `expectedMaximumDurationInMillis` is only a warning threshold: `cron-jobs-core/src/creator.ts:34–60` accepts a zero-argument callback and issues no signal, deadline or current authority.

Actual legacy HTTP construction is available without Core edits:

1. Read `db.query.trustedCertificateHostnames` with exactly hostname/thumbprint/certificate columns. These are the real fields in the public `TrustedCertificateHostname` contract. Do not use the native hostname store constructor: it requires a real `PersistenceRuntime`.
2. Public `@homarr/core/infrastructure/http` exports `createCustomCheckServerIdentity`, `createCertificateAgentAsync` and `fetchWithTrustedCertificatesAsync`. Build the identity function from those real rows, then pass it as the explicit `checkServerIdentity` override to `createCertificateAgentAsync`.
3. Its CA default still invokes the real public certificate-file reader, preserving built-in/custom roots and existing folder policy. `UndiciHttpAgent` preserves the legacy DNS initializer, logger and `EnvHttpProxyAgent` behavior. Do not bypass it with global fetch, Axios defaults or invented proxy strings.
4. Pass the actual agent as `dispatcher` to `fetchWithTrustedCertificatesAsync`. This prevents the default agent path from invoking `getTrustedCertificateHostnamesAsync()` without a store: that getter currently throws at `certificates/hostnames/index.ts:8–12`. Calling the fetch helper alone is therefore **not** a working resource bridge.
5. Own the agent inside the actual callback, consume/cancel and settle all admitted bodies before closing it, and retain original failures if cleanup also fails. Never publish a module-global agent or close a borrowed native transport.

Passing that transport to `createIconFetcher` still leaves `assertCurrentAuthorityAsync`, deadline ownership, limits and local authority unrepresented. The old callback has no such issuer. A no-op assertion or callback-local `active` flag does not meet the native contract. Therefore **do not backport the native factory/service into this callback by pretending those resources exist**.

Smallest genuine legacy alternative, if approved: compose the already-public `iconRepositorySources`, `parseGitHubIconIndex`, `parseJsdelivrIconIndex`, `IconSourceHttpError`, `RepositoryIconGroup` and `/local` mapping **inside this existing cron file**, using the real legacy DB/HTTP/logger. The local helper must be called by the existing callback; no standalone unmounted wrapper or new public entrypoint is needed. This is explicitly legacy provider composition, not native service admission. It must:

- Use all five metadata records unchanged, including Papirus slug/index discrepancy, SimpleIcons master/blob template, licenses and existing slash substitution. No URL/branch/provider replacement, retry or fallback fetch.
- Preserve HTTP status and GitHub rate-limit/reset/retry headers through `IconSourceHttpError`; invalid/truncated indexes remain failed groups. Diagnostics remain server-owned and must not expose URLs, credentials or raw causes in RPC output.
- Read real local media id/name/content/size, pass original bytes to `mapMediaToIcon`, and return the exact local slug. A failed read is a failed local group, not an authoritative empty feed. Do not convert identity to a checksum URL or select a surviving media alias.
- Settle all five requests and the local read with `Promise.allSettled` before returning/rethrowing. Maintain a real 10-second per-index abort timer through body consumption, clear it in `finally`, and cancel/release readers on failure. A timer ending at response headers is insufficient.
- Explicitly retain successful empty feeds versus unavailable sources, and guard all-source failure before database replacement reads/deletes with the existing fixed safe failure message. The current legacy `or(...[])` deletion predicate can be undefined when no source succeeded, allowing an unfiltered delete; this is a real source-visible failure, not a hypothetical race.
- Preserve failed-source rows: only successful groups contribute replacement/deletion predicates. Keep all six slugs in the returned list so transient failures do not become absent repositories. Retain the existing transaction driver split and checksum persistence behavior unless a separately reviewed preservation repair is allocated.

`@homarr/common/server` has a genuine structural `readBoundedJsonResponseAsync` that accepts an Undici-like response without a full Web `Response` cast. It is not equivalent to the native repository reader: it lacks abort/reader-finalization handling and strict UTF-8 decoding, and its early rejection can leave a body unconsumed. Reusing it requires callback-owned cancellation/cleanup; otherwise a narrowly local body reader must be reviewed. The existing `withTimeoutAsync` callback is Response-constrained and clears its timer when that callback returns; it is not an `IconSourceClock` constructor. No existing helper supplies the entire requested lifecycle for free.

### Cron stop lines and exact conditional lease

Future product lease is **`packages/cron-jobs/src/jobs/icons-updater.ts` only**, including any called local helper. Current manifests already declare `@homarr/icons`, `@homarr/db`, `@homarr/core`, `@homarr/common`; no direct undeclared `undici`, Axios or other import is required. Clock/abort primitives are platform facilities. No dependency, manifest, lock, singleton or Core publication is needed for the explicit legacy-agent construction above.

However, there are **no production limit values in the inspected icon source/config resource**: `maximumIndexBytes`, `maximumFiles` and `maximumPathLength` are required inputs, not exported defaults. Before this conditional patch, the coordinator must approve exact callback-local finite limits or identify a genuine existing configured source. Do not copy fixture values, derive tautological bounds from response size, use infinity or invent configuration/environment keys. Legacy body ownership and cancellation must also be reviewed against the actual helper chosen. These are concrete prerequisites, not grounds for erasing the call or returning an empty list.

This limited legacy replacement does not adopt the native selected-URL/atomic synchronization algorithm. Native `synchronizeIconsAsync`/`planIconSynchronization` and their transient-failure/selected-reference/local-identity safeguards remain frozen. If the requested compatibility patch must additionally give the legacy writer those newer guarantees, it needs real typed reads of every reference location and transaction-time catalog/reference/media validation in both driver branches; replacing the legacy loop with `createIconSynchronizationService` is not an assignment-only fix. `readSelectedIconUrlsAsync` currently requires `IconReadScope`; the old checksum loop and Jobs SQL adapter are not valid `IconAtomicApplyResources`. Do not relabel them.

## Allocation and remaining proof

Release the **one-file app patch first** after independent plan review. Keep the cron call visibly unresolved until its conditional provider/lifecycle/limits plan is accepted; do not hide it with compiler exclusions or a fake implementation. No broad Node owner factory, new entrypoint or unmounted wrapper is justified by these two callers.

Exclude the active invite three-file enrollment, AddWidget editor, Auth critical-writer getter, DB schema-test normalization and Core proxy-inference lanes. Do not touch any native icon source, API native admission, native job body, DB/Core owner, default startup, compiler configuration, tests or documentation outside this report. A later released author should run only the approved focused lint/typechecks after sources freeze; this read-only report ran none and requests no tests, build, network or native execution.

## Cron refinement: complete one-file proposal for independent review

This append supersedes the unresolved numeric-policy and reader-selection alternatives in the preceding Cron section without rewriting that historical proposal. The coordinator reports the app patch independently SOURCE ACCEPTED and fresh API diagnostics remaining only at Cron/Docker; this report performs no new validation. **No Cron product writer is released.** The sole prospective product path remains `packages/cron-jobs/src/jobs/icons-updater.ts`; this append is the only write in this refinement.

### Exact cut and explicitly new policy

Remove only the stale `fetchIconsAsync` import/call, add existing public parser/metadata/local-mapping and Core HTTP type references, add one non-exported called `fetchLegacyIconGroupsAsync` helper in this same file, insert the all-source-failure guard before the existing catalog read, and guard the existing icon-delete statements against an undefined deletion predicate. Keep the job declaration, NO_EXTERNAL_CONNECTION return, logger/Stopwatch, reconciliation loop, checksum matching, batch division, both actual transaction branches and final success log otherwise unchanged. There are no helper files, exports, dependencies, env keys, source comments, tests or native factory changes.

| Proposed callback-local policy |                   Exact value | Scope/provenance                                                                                                                                              |
| ------------------------------ | ----------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maximumIndexBytes`            | `16 * 1024 * 1024` = 16777216 | Each decoded HTTP index body, including unannounced/chunked bodies; not a media-file size cap.                                                                |
| `maximumFiles`                 |                      `200000` | Complete GitHub tree or jsDelivr files array, before filtering image extensions.                                                                              |
| `maximumPathLength`            |                        `1024` | Existing parser input limit; additionally enforce at most 1024 UTF-8 bytes for each remote path before invoking the parser.                                   |
| Per-index deadline             |          `10000` milliseconds | Original request start through complete body, fatal UTF-8 decode, JSON parse, path preflight and provider parse; never refreshed at headers or between reads. |

These are **new coordinator-selected legacy policy proposals for review**, not existing configuration, fixture defaults, measured feed requirements or proof that every current provider fits. Validate the three numeric limits as positive safe integers; do not derive them from the response or use infinity. Reviewers may change a value on concrete source-supported need, but no external feed acquisition is authorized here. File/path/byte/deadline violations reject the entire affected source: no prefix, partial icon list or successful empty replacement is published.

The public provider parsers check JavaScript string length, not UTF-8 byte length. Therefore the 1024-byte interpretation needs the stated additional preflight: require the correct root array, enforce its 200000-entry bound, narrow each entry/path from unknown, and use `TextEncoder().encode(path).byteLength`. GitHub uses `entry.path`, jsDelivr uses `entry.name`. Reject any invalid or excessive path before the public parser returns a group. Keep its existing path safety, checksum/hash validation and case-sensitive `.png`/`.svg`/`.jpeg` rules. Do not modify a pure parser or substitute an unsafe cast to inspect JSON.

### Installed declaration/source coordinates and types

The inspected installed manifest is `node_modules/undici/package.json:1–3`, version **7.29.1**; Node declarations are `node_modules/@types/node/package.json:1–3`, **24.13.3**. These are read-only version/source-coordinate pins, not SHA pins, compiler-resolution results or runtime observations. No hash/check command ran.

| Coordinate                                                                   | Actual relevant contract                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Undici `types/fetch.d.ts:12–17,30–32,93–100,142–157,215–224`                 | Fetch returns Undici `Response`; body is Node `ReadableStream                                                                                                                                                                                                                                                                                    | null`; headers supply `get(): string | null`; options accept actual `dispatcher`and AbortSignal; response exposes`ok/status/headers`. |
| Node `stream/web.d.ts:97–110,174–179,202–204`                                | Default `getReader()` locks the body; `read()` is asynchronous with done/value results; `cancel()` and `closed` are promises; `releaseLock()` is synchronous. Stream defaults in these declarations contain `any`; lift received chunk values to **unknown** and require `Uint8Array`, rather than adding authored `any` or a Web-Response cast. |
| Undici `types/env-http-proxy-agent.d.ts:7–20`; `types/dispatcher.d.ts:38–45` | Env proxy agent inherits Dispatcher; public promise `close()` waits for queued requests, and promise `destroy()` aborts pending requests and waits for socket closure under its supported contract. Use the no-callback overload.                                                                                                                |
| Core `http/request.ts:23–46,75–105`; `http/index.ts`                         | Public agent/fetch constructors accept the concrete agent as dispatcher; do not pass the helper's header-scoped `timeout` option as the body deadline.                                                                                                                                                                                           |

Type shapes to use locally, without directly importing undeclared Undici:

```ts
type LegacyIconHttp = typeof import("@homarr/core/infrastructure/http");
type LegacyIconAgent = Awaited<
  ReturnType<LegacyIconHttp["createCertificateAgentAsync"]>
>;
type LegacyIconResponse = Awaited<
  ReturnType<LegacyIconHttp["fetchWithTrustedCertificatesAsync"]>
>;
type LegacyIconSource = (typeof iconRepositorySources)[number];
type LegacyIconOperationOutcome =
  | {
      kind: "completed";
      group: RepositoryIconGroup;
      cleanupErrors: readonly unknown[];
    }
  | { kind: "failed"; error: unknown; cleanupErrors: readonly unknown[] };
```

The helper signature is `fetchLegacyIconGroupsAsync(): Promise<RepositoryIconGroup[]>`. Its nested per-source async callback owns reader/timer state; no separate reader framework or exported function is needed. A narrow local reader state can structurally expose `closed: Promise<void>`, `read(): Promise<{ done: boolean; value?: unknown }>`, `cancel(): Promise<void>` and `releaseLock(): void`. Use the actual default reader obtained from the actual response, not a fabricated reader resource.

### Real legacy setup and read set

Keep `if (env.NO_EXTERNAL_CONNECTION) return` as the first callback operation. Call the local helper only afterwards. **Dynamically import the public Core HTTP entrypoint inside that helper**, not as a new top-level value import: `http/http-agent.ts` imports `dns/init.ts`, whose opt-in initializer mutates the existing DNS cache. This ordering avoids starting newly reached legacy DNS/trust/agent work before the external-disable return. The type-only import expression above does not initialize it.

1. Read the actual legacy `db.query.trustedCertificateHostnames.findMany` with exactly `hostname`, `thumbprint`, `certificate` columns. Construct `createCustomCheckServerIdentity(rows)` and pass it as the explicit override to `createCertificateAgentAsync({ checkServerIdentity })`.
2. Let that existing constructor read current built-in/custom CA material through its existing certificate-file helper and retain existing TLS cache, EnvHttpProxyAgent proxy behavior and legacy DNS initialization. No proxy value, CA file or environment value is read by this report or copied into new configuration. The explicit identity override avoids the no-store hostname getter; the explicit fetch dispatcher avoids constructing a second default agent.
3. The helper owns exactly the returned callback-local agent. After construction, schedule five source operations plus one local operation as promises retained in one `Promise.allSettled` array, in metadata order with local last. Start local DB work via `Promise.resolve().then(...)` so synchronous access failure cannot bypass the shared settlement barrier.
4. Local work is exactly the real `db.query.medias.findMany` projection `id/name/content/size`, followed by `mapMediaToIcon` on original bytes. Keep the exact local slug and URL identity, MD5, name and size. Failure of any read/mapping rejects this entire local source; never return a successful prefix or empty list on failure. A genuinely empty table is a successful empty local group.

Do not apply the remote 16 MiB index cap to a local uploaded image: `packages/validation/src/media.ts:24–32` already permits a 32 MiB image. The unchanged legacy local query materializes table bytes; this proposal does not claim a new SQL-native/preallocation byte bound, a complete-table memory budget or native interruptibility. Its read set and number of issued top-level tasks are bounded; local binary materialization is an explicit retained legacy limitation, not proof supplied by the remote caps. A requirement to physically bound those SQL bytes would need a separately reviewed genuine read producer, not an invented limit/filtered authoritative catalog here.

Pre-replacement read set: hostname grant rows, existing CA/file-store reads inside Core, five allowlisted metadata index requests, and the four-column local-media query. No selected-reference read, native admission, catalog replacement read or SQL write occurs in this phase. Existing legacy DB admission/currentness is neither manufactured nor fixed. Capture any **existing** Core HTTP scoped parent signal with `getHttpRequestSignal()`; if present, honor it before setup and after all settlement/teardown. It is an existing cancellation signal, not a credential or authority assertion.

### Per-source body/deadline algorithm

Implement these operations inside each of the five nested async source callbacks, all called by the real helper:

1. Capture `performance.now()` once for the original deadline and arm a real AbortController timer for 10000 ms before issuing fetch. Compose its signal with the existing parent signal if one is present. A local deadline check uses the captured monotonic boundary, aborts on expiry, then checks the actual signal. It is not an injected native clock or active-owner boolean.
2. Await exactly one `fetchWithTrustedCertificatesAsync(source.repositoryIndexingUrl, { dispatcher: agent, signal })`. Retain the response even when later checks fail. Check original deadline/signal after the await; a late response is not success.
3. On non-OK response, construct the existing `IconSourceHttpError` with actual status and actual `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after` header values, including genuine nulls. Do not invent a headerless HTTP error or perform an error-body fallback request. Retain this primary failure while cleanup runs.
4. For OK responses, accept absent Content-Length; otherwise require a digits-only nonnegative safe integer no greater than 16777216. Reject malformed/oversized declarations before reading; still own and cancel that unconsumed body. Missing body is source-unavailable, not an empty feed.
5. Obtain the default body reader. Immediately observe `reader.closed` rejection into retained state, and install the abort handler. The handler starts one coalesced `reader.cancel()` promise; attach a rejection observer immediately, but keep and later await the **original** cancellation promise so errors are not swallowed. If already aborted, run that handler immediately.
6. Await one `reader.read()` at a time. Check the original deadline/signal before and after every await; validate each non-done value from unknown as Uint8Array. Reject if the next chunk exceeds remaining byte budget **before retaining it**. Never truncate or parse a prefix. Keep only admitted chunks and their bounded total, then concatenate once into an exact-sized Uint8Array.
7. Use `new TextDecoder("utf-8", { fatal: true })`, then `JSON.parse` assigned to unknown. Check original deadline/signal between decode, JSON parse, UTF-8 path preflight and the existing provider parser, and after parser return. Synchronous parsing cannot be preempted by an event-loop timer; a post-stage monotonic check rejects an overrun before publishing the group. This is not a hard CPU-exit guarantee.
8. Select `parseGitHubIconIndex` or `parseJsdelivrIconIndex` from the metadata kind and pass the unchanged metadata plus the exact proposed limits. Preserve all five records: dashboard-icons/selfhst main trees; SimpleIcons master tree and `{1}` CDN template; Papirus metadata slug versus `papirus_icons` index/blob spelling; homelab-svg-assets main; existing licenses, extensions and slash substitution. No copied provider list, URL/branch correction, retry, redirect override or resubmission.
9. In cleanup, cancel the reader through that same coalesced promise and await its settlement plus `reader.closed` settlement before releasing the lock. If no reader was acquired, await `response.body.cancel()` instead. Attempt lock release even when cancellation rejects, and retain both failures separately. Expected stream rejection caused by the already captured request/abort failure is not relabeled as successful completion. Clear the timer and remove the abort listener only in the cleanup finalization path, after admitted reader work settles.
10. Hold the provisional parser group until that cleanup completes. Ordinary fetch/HTTP/index/timeout errors become `{ success: false, icons: [], slug, failure: "source-unavailable" }` after cleanup, with private source diagnostics. A cleanup failure is a job-level fatal outcome, not an ordinary failed feed that permits SQL replacement. Never let a `finally` throw erase the captured primary failure; construct the outcome first and aggregate later.

Do **not** use `readBoundedJsonResponseAsync` for this operation: its actual source has neither fatal UTF-8 decoding nor complete reader-finalization/abort ownership. Do not clear a `withTimeoutAsync` timer at response headers and pretend it covers parsing. Body failures retain no partial catalog result. HTTP diagnostics use `IconSourceHttpError.metadata` and known slug; generic source diagnostics use fixed messages. Neither group DTOs nor RPC/status output gains raw network causes, request URLs, byte content or credentials.

### Shared settlement, teardown and primary/cleanup ownership

The helper retains each outcome, primary source failure and cleanup failure until all six issued task promises settle. `Promise.allSettled` is mandatory, including on a fatal reader error or local DB error; no rejected sibling is detached and no rejection races a successful return. Only after this barrier may the owned agent be torn down.

**Choose one awaited public `agent.destroy()` call as the normal final teardown**, including after successful body consumption. There are no remaining legitimate payload operations at this point; destroy closes the callback-owned connections rather than retaining an idle pool. This is simpler than a close-then-destroy recovery sequence and still uses the real dispatcher lifecycle. Capture synchronous throws or promise rejection as teardown faults; do not start another agent or repeat destroy. There is no new module-global transport and no borrowed native owner to dispose.

Then classify, without an unsafe throw in `finally`:

- Any reader cancellation/release/transport teardown fault or unexpected task rejection prevents all catalog reads/writes. Throw retained primary plus cleanup failures as an AggregateError with a fixed safe message; do not erase the first failure, report job success or continue with the remaining feeds.
- Otherwise honor the existing parent signal after teardown, then return **all six** success/unavailable groups, preserving source identity and order.
- The caller throws `Error("Icon synchronization failed: no icon source succeeded")` if no group succeeded, **before** `db.query.iconRepositories.findMany`. The legacy job wrapper will record an error rather than success. Successful empty feeds still count as success.
- Setup failure before agent acquisition issues no requests and no SQL replacement. Construction failure after partial internal allocation supplies no usable public agent handle; do not invent proof that the constructor cleaned all internals.

Resource-close oracle: returning groups authorizes the caller to proceed only after every fetch/body/parser/local task is terminal, cancellation/closed promises are settled, locks released, timers/listeners cleared and the actual owned agent's public teardown promise fulfilled. Rejected cleanup never authorizes SQL. A pending cleanup/teardown promise keeps the helper pending and SQL unissued; there is **no** Promise.race timeout that abandons it or manufactures physical closure.

Installed implementation qualification is concrete, not hidden: `undici/lib/dispatcher/env-http-proxy-agent.js:49–62` combines internal close/destroy operations with Promise.all; `dispatcher-base.js:97–101,146–149` assumes those operations do not error and does not attach an internal rejection-to-callback path. Therefore the public supported ordinary lifecycle can be awaited, but these methods cannot prove finite completion for every internal cleanup fault. `closed`/`destroyed` flags are set before completion and must not be used as physical closure receipts. This plan is finite in issued resource counts/input budgets and deadline admission, **not** an all-fault hard-stop/native containment guarantee. Requiring that stronger guarantee is a genuine external lifecycle HOLD; no one-file shim can truthfully supply it.

### Caller pseudocode and unchanged SQL semantics

```text
callback:
  if NO_EXTERNAL_CONNECTION: return
  retain existing logging and Stopwatch
  groups = await fetchLegacyIconGroupsAsync()
  if no group.success: throw fixed all-source-failure Error
  retain existing fetched-count logging
  read actual catalog with icons
  run existing checksum/repository reconciliation
  build deletion predicates only from successful-group entries
  execute existing SQLite/PostgreSQL transaction branches
  emit existing post-transaction success logging

fetchLegacyIconGroupsAsync:
  acquire actual legacy HTTP module, trust rows, explicit certificate agent
  retain five per-source operations plus actual local operation
  outcomes = await Promise.allSettled(all six)
  retain any primary and cleanup failures
  await one owned agent.destroy(), retaining its failure
  reject if task/reader/transport cleanup is incomplete or failed
  honor any existing parent cancellation
  return all six genuine groups
```

Existing `if (!repositoryIconGroup.success) continue` remains. Only successful groups populate `skippedChecksums`, new repositories and new icon inserts. Return every failed source slug instead of filtering failures out; thus the existing dead-repository check cannot mistake a transient failed provider for an absent provider. Existing unknown/removed repository behavior is unchanged. A successful empty source intentionally yields its existing scoped deletion predicate; a failed empty source yields none.

Both transaction branches must skip the icon deletion statement when `deadIconsFilter === undefined`; never execute `.where(undefined)`. All-source failure is already rejected before catalog reads, but this local guard makes the dangerous unfiltered-delete behavior impossible without altering valid predicates. Keep PostgreSQL async transaction and rowCount accounting; keep SQLite's synchronous callback, `.run()` and changes accounting. No awaited work enters the SQLite callback. Preserve existing checksum matches' IDs/names/URLs, insertion values, group order and 5000-icon chunking. Do not "fix" same-checksum local alias behavior, perform selected-reference traversal, mutate app/media selections or relabel this loop as the native atomic synchronization adapter.

Post-success read/write set stays exactly the legacy iconRepository/icon catalog read and existing icon/repository deletes/inserts. No schema, codec, selected-reference table, native runtime/authority or wider writer is added. The SQL driver split is reused, not guessed; existing legacy type/admission limitations remain independent. Native expected-catalog/reference/media revalidation through COMMIT and selected-URL/local-alias guarantees remain held and unchanged.

### Independent review and later check expectations

This is now a concrete one-file legacy plan for review, not an implementation release or a new PASS. Review should accept or identify a concrete correction to the proposed caps, byte-path preflight, dynamic import placement, primary/cleanup outcome protocol, supported public destroy barrier and unchanged SQL semantics. The retained local materialization and all-fault teardown limitations must remain explicit; neither is permission to fabricate native ownership or silently widen this lease.

After a separately released author freezes that one file, coordinator-owned focused lint/typechecks should establish: actual Core return-type/reader assignability without Undici/Web casts or undeclared imports; positive literal policy and path-byte gate; NO_EXTERNAL_CONNECTION before helper/DNS/trust work; exactly five unchanged metadata inputs plus local; all six outcomes and one awaited transport disposal; original timer coverage and actual reader cleanup; HTTP metadata retention; all-source-failure before catalog read; guarded icon deletes; unchanged driver transaction/checksum body. No unit tests, new test cases, source comments, build, provider request, native SQL or runtime teardown experiment is requested by this report.

No commands, hashes, checks, compilation, evaluation, tests, network, Engine/native SQL, private configuration/data or nested agents ran in this refinement. Only relevant checked-in source, explicitly requested installed declarations/implementation and this report were used. API source/acceptance evidence, old before images, native controls/data/evidence and disjoint Native/Media/Widget writer paths were not changed. The earlier interrupted patch call produced no completed append; this append is the actual delivered handoff.
