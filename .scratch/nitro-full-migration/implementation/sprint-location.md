# Location source port — frozen draft

## Source inventory and implementation

`location.searchCity` is the complete leaf inventory of `packages/api/src/router/location.ts`. Its native oRPC handler is prepared in `createLocationProcedures`; the same identity remains binding-held and unmounted. No production registration or capability completion is claimed.

The input retains the unbounded, untrimmed `query` string with no default. The city output retains numeric `id`, `latitude`, `longitude`, string `name`, and optional `country`, `country_code`, `population`. Both source output alternatives, object stripping, the `Invalid response` refinement, and generation-time-only transformation to empty results are unchanged. An identity `z.unknown()` pipeline feeds the original output schema so real Undici JSON stays `unknown` without a cast or pre-handler parsing; malformed provider output remains output validation, not input validation.

The source public query/demo descriptor is preserved; no authentication or additional permission gate is invented. There is no source OpenAPI/MCP projection, locale parameter, weather operation, SQL query, result cache, TTL, or pagination to port. The external-connection policy short-circuits before URL creation, timeout creation, or transport use and returns exactly `{ results: [] }`.

The handler preserves the fixed Open-Meteo geocoding URL and sole `name` query parameter, without normalizing input, checking response status, adding retries, changing provider defaults, or substituting cached/example data. Fetch/JSON failures propagate to existing source-procedure error handling. The actual source `withTimeoutAsync` is reused: its default is 10000 ms, with its timer cleared when fetch resolves/rejects, before JSON body parsing. The timeout is not extended over body parsing. The explicit backend request signal, optional oRPC call signal, and request-disposal abort are composed with the timeout signal; body cancellation remains the real fetch response's responsibility.

## Binding-held resources

`location.searchCity` requires the genuine server-owned `NO_EXTERNAL_CONNECTION` value and a bound trusted-certificate fetch primitive returning a real Undici `Response`. No ambient env/Core HTTP initialization is imported. No plain global-fetch fallback exists. The primitive must retain actual root trust, hostname trust, proxy/DNS configuration, transport cancellation, native JSON/error behavior, and owned runtime disposal. The existing Core HTTP resource runtime is only a candidate: host assembly, authoritative trust-store binding, exported resource access, and mounting remain outside this lane. The legacy hostname reader itself requires an explicit store; this port does not silently repair or bypass it.

## Read-only source/signature comparison

Compared the legacy location router and its tRPC base against current `BackendContext`, `sourceProcedure`, the source port map, and source error handling. Read the called timeout, trusted-fetch/agent/TLS/request-signal helpers, root certificate file reader, hostname reader, and candidate HTTP resource runtime/ownership source. Verified API dependency declarations and installed `@orpc/server` 2.0.0-beta.43 handler/output/optional-signal signatures, Zod 4.4.3 pipe signatures, and Undici 7.29.1 real-response `json(): Promise<unknown>` signature. No libraries were added.

No lint, typecheck, build, tests, formatting, installs, network/provider/SQL calls, environment or credential reads, Git actions, listeners, browser, or container operations were performed. Runtime/source-equivalence validation remains deferred to the coordinator. Ports 3100/3200 were untouched.

## Exclusive files

- `packages/api/src/nitro/routers/location.ts`
- `packages/api/src/nitro/routers/-locations/resources.ts`
- `packages/api/src/nitro/routers/-locations/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-location.md`
