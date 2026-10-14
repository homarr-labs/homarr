# Stats wrapper candidate: unmounted handoff

## Boundary and status

Prepared only in `packages/integrations/src/stats/stats-integration.ts`, `stats/index.ts`, new `stats/-runtime/**`, and this handoff. Accepted integration-runtime v2 and base files remain read-only. No provider, definition, Stats schema, legacy registry, driver, cache/backing, export, manifest, dependency, lockfile, application mount, or public route was changed by this lane. This is a candidate for independent review and coordinator acceptance, not whole #40, all-89 compatibility, or full Homarr/SQLite-restore acceptance.

## Actual wrapper behavior

- `StatsIntegration` retains its two-argument constructor and existing public method signatures. There is no replacement integration class or provider catalogue.
- `getStatsAsync(signal = AbortSignal.timeout(30_000), testing?)` calls accepted `createStatsFetchContext`. Declared authentication is resolved after lease acquisition/admission; compiled adapter providers still own their own authentication. Header and query precedence, prefix paths, native parsers, values, and units remain source-owned.
- `getHttpAuthenticationAsync()` retains declared-before-adapter routing and async-before-sync adapter routing. Async adapter authentication retains its 15-second cap, now combined with the execution lifetime. The provider method keeps its original receiver. Synchronous adapter authentication still uses existing secret helpers with the runtime abort gate.
- Private `withContextAsync` combines the caller/default signal with accepted ALS `resources.context.signal`. With explicit `IntegrationTestingInput`, it reuses that lease without reacquiring/releasing it. Otherwise it requires accepted ALS resources and calls `withIntegrationTestingAsync`. Missing resources fail closed; no old ambient Core Fetch/Axios fallback remains in the wrapper.
- With ALS resources, the operation re-enters injected `transport.runAsync` after lease acquisition, carrying the same configuration/trust identities and combined signal. Cancellation is checked before context/authentication creation. Producer admission and request checks remain the transport producer's responsibility; this is not a new authorization/trust implementation.
- Accepted context sanitization and the frozen base decorator's `normalizeSanitizedIntegrationTransportError` preserve known safe request/status/JSON-parse categories. Injected `resources.errorHandlers` remain the normalization seam for provider validation failures.
- `testingAsync` still runs the native provider through `getStatsAsync`, returns `{ success: true }` on success, and leaves native connection classification to the accepted testing service.
- `stats/index.ts` retains synchronous metadata lookup, actual `statsProviders` and `existingStatsProviders`, native-first routing and existing SDK fallback. It combines the execution signal with the caller signal. Only the existing legacy guard was extracted to `-runtime/legacy-guard.ts` for its approved settlement regression: one module-owned guard, duplicate-ID refusal, maximum 128 physical calls, and removal only in `finally` after real operation settlement. Abort does not free a slot; no caller-level race was added to this guard.

## Preservation map

| Source                                 | Preservation / evidence                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stats/providers.ts`                   | Untouched authoritative 30-provider registry: autobrr, caddy, changedetection, fileflows, gatus, healthchecks, homebox, jellystat, karakeep, komga, linkwarden, maintainerr, mealie, miniflux, netdata, netalertx, frigate, scrutiny, plantit, prometheus, romm, spoolman, stash, syncthingRelay, tandoor, trilium, tubearchivist, unmanic, xteve, yourSpotify. Registry tracer checks the actual count, not a copy. |
| `stats/providers/**`, `stats/types.ts` | Untouched compiled endpoints, authentication, parsing, metric metadata, units and pagination. No invented Stats schema.                                                                                                                                                                                                                                                                                              |
| `stats/existing.ts`                    | Untouched legacy adapters, metadata, picks and SDK/factory calls. Its old ambient HTTP import remains a mounting blocker.                                                                                                                                                                                                                                                                                            |
| `base/creator.ts` / `factory.ts`       | Untouched default lazy factory/re-export. Static count remains 89 entries / 89 unique keys. Native tracers use the real Miniflux entry, not an injected constructor or callback stand-in.                                                                                                                                                                                                                            |
| `base/**`, `runtime/**`                | Accepted v2 contracts, resources, ALS, lifetime/result fencing, testing leases and diagnostic bridge consumed without edits.                                                                                                                                                                                                                                                                                         |

## Native tracer evidence

`stats/-runtime/native-tracer.ts` runs directly under Bun 1.4.2 with an empty inherited environment except explicit PATH/NO_COLOR. It uses the real definitions package barrel, real `base/creator.ts`, unchanged `minifluxStatsProvider`, and actual `StatsIntegration`. There are no module mocks, definitions replacements, factory doubles, production trust-factory imports, network requests or session/backing implementations in this tracer.

Its explicitly synthetic policy requires the correct integration ID and authority, resolves only fixture credentials, and checks configuration `config-1` / trust `trust-1`. Injected transport checks those identities/currentness and the execution signal. Sessions throw if used. Fetch returns synthetic JSON only. Native query, native connectivity testing and native HTTP-authentication consumption succeed:

```json
{
  "factory": "base/creator.ts",
  "wrapper": "StatsIntegration",
  "values": { "read": 9, "unread": 4 },
  "calls": 2,
  "leases": { "secretReads": 3, "acquired": 2, "released": 2 }
}
```

Both requests target `https://miniflux.invalid/prefix/v1/feeds/counters`, carry the saved synthetic `X-Auth-Token`, and disable redirects. Query returns native count units without conversion; testing reuses one acquired lease instead of nesting another. HTTP authentication returns the adapter's saved header without a transport request.

Node/Vitest's unmocked native/security tracers use the actual pure definitions integration leaf via an alias, not fake auth metadata. `registry.spec.ts` alone quarantines the read-only legacy `existing.ts` import with a throwing Core HTTP module double; it never dispatches a legacy SDK. That check proves actual metadata/native Stats dispatch, not unmocked legacy mounting or Mock execution.

## Focused checks

Final validation: direct Bun native tracer passed; 15 approved new focused checks passed; two selected existing Frigate checks passed (21 skipped); scoped lint reported zero warnings/errors; owned-entrypoint typecheck, format check and scoped diff check passed.

```sh
env -i PATH="$PATH" NO_COLOR=1 bun --no-env-file run packages/integrations/src/stats/-runtime/native-tracer.ts
env -i PATH="$PATH" NO_COLOR=1 node node_modules/vitest/vitest.mjs run --config packages/integrations/src/stats/-runtime/vitest.config.ts packages/integrations/src/stats/-runtime
env -i PATH="$PATH" NO_COLOR=1 node node_modules/vitest/vitest.mjs run --config packages/integrations/src/stats/-runtime/vitest.config.ts packages/integrations/src/stats/frigate-auth.spec.ts -t 'uses the injected trusted transport|requires saved credentials'
bun --no-env-file run node_modules/typescript/bin/tsc --noEmit -p packages/integrations/src/stats/-runtime/typecheck.tsconfig.json
bun --no-env-file run node_modules/oxlint/bin/oxlint packages/integrations/src/stats/stats-integration.ts packages/integrations/src/stats/index.ts packages/integrations/src/stats/-runtime
bun --no-env-file run node_modules/oxfmt/bin/oxfmt --check packages/integrations/src/stats/stats-integration.ts packages/integrations/src/stats/index.ts packages/integrations/src/stats/-runtime .scratch/nitro-full-migration/implementation/stats-wrapper.md
git diff --check -- packages/integrations/src/stats .scratch/nitro-full-migration/implementation/stats-wrapper.md
```

Approved new regressions cover actual native Miniflux consumption; safe public parse/authorization/status/DNS/unknown diagnostics; retained native certificate code without fetching a certificate; injected validation normalization; authority-before-decrypt; abort/stale lease-entry fencing; physical owned/shared lease settlement and runtime drain; the exact 128-slot legacy guard; Frigate HTTPS-before-secret and bodyless login/profile/stats order; 15s async-auth and default 30s Stats caps; actual Caddy Axios routing; actual Linkwarden paginated envelope precedence/cursor encoding; and declared header/query collision precedence. The collision witness is an explicitly test-only request seam, not a new provider capability. No full-provider matrix ran.

The existing Frigate suite's two selected tests pass. Its other 21 cases were not run: most still assume the removed ambient Fetch and need their owner's injected-runtime migration. Their absence is not all-Frigate acceptance.

Runner findings: direct Bun/Vitest previously failed; Node/Vitest runs these focused checks with `envDir: false`. The direct Bun native tracer initially stopped before Fetch because Bun's built-in `undici` shim lacks `MockAgent.disableNetConnect`. The fixture now imports the installed `undici/index.js`, matching the existing Core direct-package import convention. The direct unmocked Bun tracer passes; this is not a claim about every SDK's Bun compatibility.

## Dependency and normalization joins

- Actual manifest recheck: COMPOSITION has now declared `axios: catalog:` in integrations and accepted `./runtime` there. Installed Axios is 1.20.0. This lane imports Axios only for the isolated synthetic adapter fixture; the production wrapper only consumes an injected Axios instance. No installation or manifest edit was performed here.
- Installed SuperJSON is 2.2.6; Core/DB already declare it, integrations does not. This wrapper does not add a direct SuperJSON import or dependency. The production session resource owner must still supply source-compatible serialization/Date preservation, encrypted durable backing, TTL, keyed identity and restart continuity. Fixture session methods deliberately throw; no session persistence proof is claimed.
- The owned-entrypoint compiler proof uses installed `bun-types` 1.3.10 with Bun 1.4.2 and the existing installed UniFi types alias. It is scoped source-compilation evidence, not settled shared Bun declarations or runtime/provider compatibility. COMPOSITION owns the shared declaration/version join; no broad package compiler run was repeated here.
- The pure existing `common/src/errors/parse/parse-error.ts` leaf is reused in the injected synthetic validation handler. Existing Common Json/Zod/HTTP handler classes are not pure leaves: their bases import/create the ambient logger. Existing IntegrationParse/Http handler adapters import the old Common server barrel. Do not import those constructors into standalone production as if this lane proved them safe. The normalizer owner must inject equivalent accepted default handlers through `resources.errorHandlers`, with safe diagnostics/logging, before mounting. Existing native error classes and frozen v2 diagnostic allowlist were not replaced.
- Context7 was checked and returned its monthly quota error. Axios adapter syntax and types were verified against the installed 1.20.0 README/declarations, and MockAgent against installed Undici docs. No installer, paid API or fallback live provider request was used.

## Remaining acceptance gates

1. Independent review/coordinator acceptance of this candidate and the transport-scope re-entry after lease acquisition. No application mounting happened here.
2. Accepted production policy/auth/decryption and currentness adapters; transport/trust producer admission for actual network calls, certificate/hostname reads, testing leases and disposal. Only explicit synthetic transport was exercised; no unaccepted producer was imported as demonstrated production.
3. Remove/adapt `stats/existing.ts`'s read-only ambient Core HTTP import and migrate SDK clients to the accepted runtime. The physical guard is preserved, but actual SDK cancellation/settlement and standalone initialization are not demonstrated.
4. Real Mock execution remains unproved. Static source tracing shows `mock/data/media-request.ts` imports the broad `../../types` source barrel, which re-exports `wud/wud-types.ts`; that imports `@homarr/common/server`. The old barrel includes environment-backed encryption and logger-backed Common handlers. It was not initialized here, bypassed with fake Mock, or described as completed Mock compatibility. Registry Mock metadata evidence is not Mock runtime evidence.
5. Source-preserving 1:1 Homarr capability acceptance and the mandatory copied current SQLite backup restore remain coordinator/DB/runtime acceptance gates. No current database, backup, appdata, credentials, environment file, legacy runtime listener, browser, container, provider/SDK network request or paid call was touched.

All changes remain uncommitted. Freeze this unmounted candidate after the listed checks, pending independent review; do not broaden ownership or infer completion of other lanes.
