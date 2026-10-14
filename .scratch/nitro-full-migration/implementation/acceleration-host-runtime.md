# Acceleration host runtime — frozen unmounted source

2026-10-11. Own writes are only NEW `apps/nitro/src/server/runtime-composition/*.ts` and this handoff. `ACCELERATION-WAVE.md`, `PUBLIC-HOST-JOIN.md`, the actual foundation application/compose/host/contracts, persistence runtime/seed/proxy, native context/contribution/procedure/settings/setup-read and translation factories were read. No entrypoint, existing host/compose/application, renderer, routes/tree, shared API, manifests/lock, peer implementation or lifecycle source was changed.

## Delivered source, not executable readiness

`createPublicHostRuntime` is the explicit factory assembly. Its required options supply configuration, the actual physical SQLite schema, accepted persistence factories, source settings/procedure/context factories, source culture/cookie factories, an explicit clock/options callback, a prepared-input renderer and error reporter. It constructs one persistence lifetime and gives that same runtime to settings and RPC. Physical schema identity is checked inside settings and RPC admissions. No workspace deep imports, ambient database/configuration, tRPC transport, fake SQL rows, fixture renderer, fallback resource/controller, no-op authorizer or fake authenticated principal exists.

| Module                                   | Implemented responsibility                                                                                                                                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configuration.ts`                       | Capture/freeze explicit HTTP(S) trusted origin, base path, absolute SQLite and migration paths, mode and guest body limit; reject missing/invalid paths and implicit resources                                                                                                          |
| `persistence.ts`                         | Actual factory sequence `openAsync → migrateSchemaAsync → migrateContentAsync → checkReadinessAsync`; fresh-only real source seed callback with mock/demo disabled; admitted users/onboarding checks; once-only initialization and close                                                |
| `public-settings.ts`                     | Actual source `createSettingsStore` reads inside `runAsync`, before/after request fences, six-key explicit public projection, request-owned memoization, real proxy setup read, anonymous-only public services and private denial                                                       |
| `public-culture.ts`                      | Document-only locale selection/loading/formatting through source factories, source anonymous preferences, explicit captured clock, preserved optional standalone now/timeZone/formats, SQL/guest light/dark/auto preference, source cookie effects and bounded same-origin guest commit |
| `public-rpc.ts`                          | Source factory subset/descriptor validation, native oRPC Fetch adapter, exact two public leaves, actual setup-backed immutable context and whole-Fetch-plus-body serialization within one tracked admission                                                                             |
| `assembly.ts`                            | Persistence-first contribution ordering, readiness-backed foundation health, same-listener foundation pass before native RPC, explicit public renderer, reserved-path 404s, foundation request/body/disposal drain, DB-last close and truthful cleanup failure                          |
| `contracts.ts`, `runtime.ts`, `index.ts` | Typed structural factory inputs and the single composed public-host construction/export surface                                                                                                                                                                                         |
| `join-slots.ts`                          | Explicit prepared versus unjoined resource requirements; missing joins throw rather than grant authority or return placeholder success                                                                                                                                                  |

Fresh mode uses the **actual complete source seed**, not a mini database. The source runtime owns exclusive fresh-file creation and physical/content migrations. SQL facts reject a seeded user or any fresh onboarding state other than `start`. Existing mode is explicit and never receives the seed callback; it is not selected or exercised by this delivery. The coordinator must create/verify an exclusively owned private parent and package the genuine migration SQL/journal directory. No file is created, opened, seeded or deleted during source preparation.

Settings serialize only the public board/search/user/branding fields plus culture and appearance preferences. All six source reads are fully awaited inside admission; no database/store/query builder is placed in the returned projection. SQL failure propagates rather than turning into a healthy setup/default projection. The setup service uses the source proxy reader and maps only `finish` to ready; all other source/default/legacy states require setup. Request readiness and completed onboarding remain distinct.

The renderer is mandatory and receives a server-only prepared object. That object contains real culture/i18n/formatter resources and **must not itself be JSON serialized**. Later rendering must project the public fields into the separately reviewed versioned bootstrap and reconstruct the identical client providers/resources. This module neither changes the existing fixture renderer nor supplies substitute en/light/ltr render defaults.

## Exact native RPC admission

The registry calls the actual `createServerSettingsProcedures`, selects only `getCulture` and `getBranding`, and calls the actual `defineBackendContribution`. The independent host guard walks the resulting explicit router and requires exactly `serverSettings.getCulture` and `serverSettings.getBranding`, path/descriptor equality, public/query/guarded policy and no lazy/duplicate leaves. Existing metadata is preserved. No aggregate backend, REST, MCP, private or mutation route is registered.

`createAdmittedPublicRpc` uses the installed native `RPCHandler` directly with POST-only handling. Method rejection precedes context/SQL admission. For a POST, the runtime's **actual `runAsync` brackets schema validation, actual `createSetupBackedContext`, the entire awaited `RPCHandler.handle`, and complete response-body materialization**. Status, statusText and headers are retained. Unknown/private native paths return 404. Foundation `/rpc/health` runs first and unmatched requests pass to this contribution on the same application Fetch listener.

The source setup context builder receives the same admitted DB/schema/signal, a currentness primitive revoked in `finally`, genuine request effect/disposal delegates, trusted explicit baseUrl, source-optional undefined device type and disabled demo configuration. Context, anonymous principal, demo and setup resources must be immutable; mandatory real setup callback functions must exist. The context is not returned from the admission. There is no context-only acquisition callback that returns an expired DB. Buffered responses cannot execute SQL during subsequent body consumption; an improperly retained context/setup callback is fenced and remains subject to the source DB scope revocation/settlement. This is source ownership, **not executed lifetime proof**.

## Culture and guest mutation boundary

Locale resolution, all supported language aliases, catalog/Intl/Day.js distinctions, resource loading, anonymous preference fallbacks and cookie persistence intent remain in the actual translation factories. Document classification excludes non-GET/HEAD, native API/RPC/auth/stream/binary/assets, dotted/static and Vite/Next paths. It never reads or replaces a document/RPC/multipart body and never uses Accept-Language or forwarding headers as locale/trust input. Internal supported prefixes produce a routing pathname for the later renderer; no existing route tree or public URL is rewritten.

The prepared clock is supplied explicitly, captured once and passed to the actual formatter. Standalone `now` is cloned only if supplied; absent now/timeZone/formats remain absent in the culture seed. `auto` is retained and unsupported appearance values fail rather than render with a default. Guest POST uses the configured base path, exact configured loopback Origin, cross-site rejection, bounded JSON, exact source-supported locale and the actual source cookie effect serialized by the real cookie codec. It performs no SQL write or authenticated preference mutation. Non-loopback production mutation policy remains unjoined, not implicitly chosen.

## Lifetime and readiness

The foundation owns request cancellation, response-body cancellation/consumption, request disposers and active-request drain. Reverse contribution disposal then closes the source proxy reader before the main runtime. Initialization settlement is awaited even after failure/cancellation; no close is attempted while opening/migrating. Source SQL already dispatched is not claimed cancelled or rolled back by the request signal. No initialization/reseed/ambiguous SQL retry exists.

The returned application rejects new Fetch work through the foundation's disposal fence. Close is idempotent. The host captures foundation-reported shutdown errors, still attempts DB retirement, and rejects close with collected failures instead of claiming successful closed state. A closed state also requires the actual persistence runtime to reach `closed`. Health runs real readiness SQL; `application.ready()` rechecks it after initialization. A quarantined/nonready runtime cannot yield a ready host phase. The existing accepted Bun signal lifecycle plugin is unchanged and still needs the coordinator's explicit same-listener host closure adapter; programmatic-listener pre-drain and another deployment preset are not claimed.

## Exact later joins, none consumed

- **Authenticated principal:** Q16, accepted credential/session engine, real current permission snapshot, revocation and mutation-origin policy. The current host intentionally resolves genuine anonymous requests only and denies protected authority; a supplied authenticated public-context result is rejected.
- **Compatible native writers:** current authority through native COMMIT, shared enabled-writer lock protocol, bounded dispatch and ambiguity preservation.
- **Integration clients:** frozen/reviewed `packages/integrations/src/nitro-bindings/`, actual secret codec, current-authority leases, accepted trust retirement/Q17, Q18 grants. Later `IntegrationManagementResources` needs its real snapshot acquire/release, native client acquire/release, cache invalidation and diagnostics; none is replaced with a permissive callback here.
- **Widget primitives:** frozen/reviewed `packages/request-handler/src/nitro-bindings/`, actual `WidgetRequestPrimitives`, source grants/Q18 and owned state/history. The named handlers/invalidation primitives are not mapped to demo result controllers.
- **State/history/jobs:** frozen/reviewed native SQL operations; state alone initializes epoch, history/jobs receive that captured epoch, preserve native lock order and settle owned producer/subscriber/transaction work. No active implementation was imported or evaluated.
- **Copied catalog/restore:** P2 freeze/review, exact old49/new50 copied admission and separately accepted restore maintenance/supervision/recovery. No active P2 graph was consumed, hashed or rebaselined.
- **Public render/hydration:** actual prepared render contract, public providers, source theme/auto behavior, navigation and identical bootstrap/client reconstruction.
- **Production listener:** coordinator-only entry/mount/lifecycle join after source/graph review and final validation. No resource host is created by a module-level singleton and no listener is started here.

## Central curated declaration requirements

The actual `apps/nitro/package.json` currently declares oRPC and the existing app libraries, but **none of the Homarr workspace consumers or cookie/Drizzle**. This implementation therefore imports only declared oRPC, Node primitives and local accepted foundation contracts/application; producer factories are explicit typed injection slots. Coordinator must pass the actual frozen factories, not use structural compatibility as permission to substitute a fake implementation. Strict assignments against those exact producer types remain part of final validation, not a performed check.

The later narrow injection adapter needs direct app declarations for `@homarr/api`, `@homarr/db`, `@homarr/translation`, `@homarr/definitions`, `@homarr/server-settings`, plus `drizzle-orm` and `cookie` using existing workspace/catalog pins. Public renderer/provider consumers additionally own `@homarr/settings` and `@homarr/ui` when selected. No dependency or lock entry was added here; reconcile the curated delta with the then-current coordinator HEAD/lock after all peer returns.

| Injection             | Public source requirement                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main lifetime         | Existing `@homarr/db/runtime` → `createPersistenceRuntime`; `@homarr/db/migrations/seed` → `seedDataAsync`; `@homarr/db/proxy-reader` → `createProxySettingsReader`                           |
| Physical schema       | Existing `@homarr/db/schema` named `sqliteSchema`, not the ambient convenience table proxy or database barrel                                                                                 |
| Settings              | Existing `@homarr/api/nitro/helpers/settings` → actual `createSettingsStore` and `settingsCodec`; same physical serverSettings table and real Drizzle eq/and                                  |
| Two public procedures | Existing `@homarr/api/nitro/routers/server-settings` → `createServerSettingsProcedures` with the same schema tables and actual inArray                                                        |
| Registry              | Existing `@homarr/api/nitro/contribution` → `defineBackendContribution`                                                                                                                       |
| Descriptor guard      | **Missing public leaf:** coordinator-curated `@homarr/api/nitro/procedure` → existing `./src/nitro/procedure.ts`, for actual `getSourceProcedureMeta`; no wildcard or aggregate router import |
| Context               | Existing `@homarr/api/nitro/resources/setup-read` → actual `createSetupBackedContext`; setup resources use actual eq and an explicit clock                                                    |
| Culture               | Existing `@homarr/translation/runtime` factories and `/languages` supportedLanguages; actual Definitions colorSchemeCookieKey; real cookie parse/serialize                                    |

No proposed auth/provider/binding/SQL-state exports are added speculatively. Selected server runtime **and type** graphs, including source seed/custom migrations/schema/collection and procedure metadata edges, still require exact capture and review. Persistence's reviewed behavior, existing browser graph acceptance and erased type imports do not establish this host's graph closure. Both-driver references, transitive tracked-facade migration cycles and Bun declarations must remain visible; no alias, externalization, unsafe shim, assertion or diagnostic suppression is a substitute.

## Validation deliberately deferred

No tests, lint/typecheck, builds, installs, formatting command, runtime SQL, environment-key reads, current data, provider calls, listeners, browser, containers, Git operation or nested agent was used. Shell operations only read SHA256 of owned new source files. Context7's documentation lookup returned its monthly-quota error; installed oRPC `2.0.0-beta.43` Fetch adapter/declarations were read instead. Its awaited native Fetch conversion was inspected; complete buffering is additionally owned by this adapter. No quota workaround or dependency change was attempted.

**Ready for source review:** ten new modules and this handoff. **Not ready for mounting/execution:** central injection/declarations, exact graph acceptance, strict producer assignments, actual owned disposable SQL initialization/public-Fetch/serialization/abort/drain proof, and public render/hydration/listener joins. Coordinator performs final lint/typecheck and approved focused validation only after all owners return/freeze. Q16/Q17/Q18 and broader product/restore/provider parity stay held.

## Frozen owned source SHA256

Paths below are relative to `apps/nitro/src/server/runtime-composition/`. These hashes describe owned source only, not producer or import-graph acceptance.

| File                 | SHA256                                                             |
| -------------------- | ------------------------------------------------------------------ |
| `assembly.ts`        | `b5d5f0ce1898b95a89949d1b4f0ad53655f2173f76ffcf74573326003690ae6f` |
| `configuration.ts`   | `87e8ea5b0d8efa499114c2ce27a2fabeb97fcb6952838c8d4411a2818300adc0` |
| `contracts.ts`       | `b02594eec9b4e86db30b8211598a9c544287cd196944e6c38539f85a7c72fa36` |
| `index.ts`           | `33312801f3b75aeaa598a03ec06cada7ab0dd45544b4ed7f6e09e25f95594323` |
| `join-slots.ts`      | `b168bcb9ade09a8e2a1722524b63ece447bee63299a7fa385abcfefc72a4a8bc` |
| `persistence.ts`     | `22337a4e301f39502667317c02c7c05558bc965ceb2915961f8c4779c2ace9e3` |
| `public-culture.ts`  | `6ce3a67182799fd8af83935c6323577647661e5100e77c3376bce2133dc1449f` |
| `public-rpc.ts`      | `c6c0293a8a009c7a03dbd7744d97527143f5b34f7f1d2acb0f6a2f031abaa875` |
| `public-settings.ts` | `cccef930f9ad58e4886aca493ebebb4bc1f20c6b621fce6b789279f47a1ef1c1` |
| `runtime.ts`         | `da5456534734d83ed2e8a8ddabbf9048820aa18556626c18f3630292f0a6e375` |
