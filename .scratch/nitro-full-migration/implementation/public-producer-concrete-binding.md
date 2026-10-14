# Concrete public producers — B implementation freeze

**Outcome: the exclusive four-file B source binding is implemented and frozen for independent review. The existing sole async prepared host now selects real public API, Translation and cookie producers. It still creates one native owner, captures the actual schema through guarded admission, and disposes outside settled admission on construction failure. Production composition remains untouched/unmounted.** No compiler, lint or runtime result is claimed.

## Exact changed paths and scope receipt

Only these product paths were patched:

1. `apps/backend/src/server/runtime-composition/runtime.ts`.
2. `apps/backend/src/server/runtime-composition/public-culture.ts`.
3. `apps/backend/package.json`.
4. `bun.lock` — only the two additions in the `apps/backend` dependency record.

The dependency declarations/lock fields were patched successfully **before** code imported the newly declared packages. No contracts, API export, native owner, assembly, public RPC, store, router, manifest script/export, production compose/barrel/entry/render, origin-policy or test file was changed.

The updated approved plan reached 1–36 EOF. Completed A729+132 source/declaration reads, docs and reviews were reused, not rerun. The coordinator-supplied bounded interfaces closed the earlier literal key gap: SettingsResources has top-level serverSettings/operators/codec; the router extends it with top-level boards/inArray.

Post-edit reads were only changed-source/metadata receipts:

| File                        | Returned interval    | Classification                                             |
| --------------------------- | -------------------- | ---------------------------------------------------------- |
| `runtime.ts`                | 1–150 EOF, limit2000 | New frozen implementation, not repeated old A body         |
| `public-culture.ts`         | 50–78, limit29       | Exact changed signature/call region; not whole-file EOF    |
| `apps/backend/package.json` | 1–32 EOF, limit2000  | New dependency metadata                                    |
| `bun.lock`                  | 38–59, limit22       | Complete backend workspace record only; not whole-lock EOF |

The slice tools' continuation notices describe remaining file text, not missing lines inside those requested regions. No continuation was followed. No old cookie/Translation/API/setup/native/Auth/DB/Core source body or old readiness report was reacquired. The new handoff destination was directly checked FileNotFound immediately before this sole optional report write.

## Frozen public imports and literal resource binding

Runtime 1–18 imports actual public entries:

- `parseCookie` / `stringifySetCookie` from installed/declaration-reviewed `cookie`.
- `getSourceMeta` from `@homarr/api/nitro`.
- `defineBackendContribution` from `@homarr/api/nitro/contribution`.
- `createSettingsStore` / `settingsCodec` from `@homarr/api/nitro/helpers/settings`.
- `createSetupBackedContext` from `@homarr/api/nitro/resources/setup-read`.
- `createServerSettingsProcedures` from `@homarr/api/nitro/routers/server-settings`.
- Real `and` / `eq` / `inArray` from `@homarr/db`.
- `supportedLanguages` from `@homarr/translation/languages` and the genuine locale/load/preferences/formatter/sync/cookie-effect functions from `@homarr/translation/runtime`.

No private producer/type path, new package or alternate transport is imported. Actual database/schema types remain derived from the existing native guarded operation; settings resources and culture options are inferred through public function `Parameters` (27–32). Render preparation uses actual public function return inference and the existing SQL projection/preparation contracts (53–60), without DTO copies, casts or `any`.

After real owner readiness and actual-schema capture, runtime 76–80 builds exactly:

```ts
{
  serverSettings: schema.serverSettings,
  operators: { eq, and },
  codec: settingsCodec,
}
```

Registry resources add the real `boards: schema.boards` and top-level `inArray` (82). The original server-settings factory, native contribution validator and native source metadata getter are supplied directly (83–85). The existing unchanged `createPublicBackendRegistry` selects only `getCulture` and `getBranding`, preserving exact serverSettings source identities/query/public/guarded-demo policy. Protected/admin/mutation leaves returned by that original factory remain unmounted; no broad anonymous namespace is created.

SQL settings use the real store factory, same guarded runtime/proxy and captured resource object; each admitted schema is still checked against actual captured schema before returning resources (87–96). Existing source store/default/codec/query-error semantics are not replaced with constants or successful fallback values.

## Frozen constructor signature, ownership and request bridge

`createPublicHostRuntime` remains the **existing single async constructor**, now with these required caller inputs (62–68):

- `configuration: PublicHostConfiguration`.
- `startupSignal: AbortSignal`.
- `cultureOptions(context: RequestContext): CultureOptions`, inferred from the public `loadRequestCulture` options parameter.
- `render(context, prepared: PreparedPublicHost): Promise<Response>`.
- `reportError(error: unknown, requestId: string): void`.

Now-resolved settings/backend/culture factory and cookie-codec injection requirements are removed. No factory-mode union, wrapper constructor, external/borrowed owner, transfer registry, default authority or new rendering/reporting policy is added.

Ownership order remains at 69–75: validate captured configuration/startup abort, create the native owner once, await its real readiness, then await guarded admission returning only actual schema metadata. The admitted database is not retained by producer construction. Real resource/factory selection follows after that operation settles, preserving original consumer-factory errors rather than disposing inside a tracked callback.

RPC construction (121–131) receives the same owner runtime/schema/currentness, actual setup resources `{ operators: { eq }, now: Date.now }`, and the actual `createSetupBackedContext` directly. No argument/key adapter is necessary: unchanged local public RPC supplies native-compatible `{ database, schema, signal, assertCurrent }` admission and the actual PublicBackendInput request/signal/effect/onDispose. The source setup constructor itself maps admitted database to its backend `db`, checks signal identity and fences its real setup reads/effect/disposal forwarding. No fake assertion, no-op hook, copied/frozen authority context or new principal is supplied.

Owner currentness is checked before returning the unchanged prepared assembly (132–141). Failure cleanup (142–148) remains outside settled admission: await same-owner coalesced disposal, rethrow original error unchanged on success, or ordered `AggregateError([error, cleanupError], ..., { cause: error })` on cleanup failure. No retry, raw logging, separate proxy close or second pool was added. Native/assembly lifecycle implementations were not edited or executed.

## One request clock and real cookie serialization

`public-culture.ts` has exactly two changes:

- Line53: `snapshotOptions(context: RequestContext, capturedNow: number): Options`.
- Line70: call it with the already-captured finite `capturedClock`.

Its single clock capture/finite check, Date validity/cloning, request memoization, real SQL/default-locale reads, formatter, recorded seed, locale effects, classification/render preparation and loopback-origin/body policy remain otherwise unchanged.

Concrete runtime culture binding uses `now: Date.now`, and the callback returns `{ ...options.cultureOptions(context), now: new Date(capturedNow) }` (112–115). The formatter still uses that same captured instant. Only request-now is intentionally forced after caller options; timezone/formats/error handlers and remaining supported options are preserved. No UTC/host-environment default, mutable global timestamp, stale construction clock, date framework or durable epoch is invented. Setup claim reads use their separately genuine ordinary Date.now clock, not a new expiry/COMMIT policy.

Cookie binding (107–110) uses real `parseCookie` and `stringifySetCookie({ ...attributes, name, value })`. Attribute spreading precedes captured identity, preserving header/descriptor semantics even if extra runtime attributes contain name/value. There are no legacy API aliases, custom parser or fake numeric/string formatting. Existing `CookieCodec` already allows missing values, so contracts remains unchanged. The color-scheme cookie key remains its existing required source literal.

## Only two existing dependency declarations and lock fields

`apps/backend/package.json` adds only:

```json
"@homarr/translation": "workspace:^0.1.0",
"cookie": "catalog:"
```

The matching lock dependency fields are at backend workspace lines48/50. Root catalog/installed cookie2.0.1 and the existing Translation workspace/cookie resolved records are retained A metadata; no version/resolution/integrity record was changed. The backend host export, scripts, other dependency/devDependency fields, root metadata and other workspace records were not edited. No install, package manager resolution, lock regeneration or security override ran.

## Freeze, preserved deviations and validation limits

- This source-only freeze needs independent review, then coordinator-owned fresh focused lint/backend/Nitro checks with complete logs/numeric statuses after separate release. No compiler, lint, test, build, runtime, native or shutdown scenario was run by this writer.
- Supplied latest prepared-owner/backend types0 and Nitro7 errors remain prior context, not results for this new binding. Actual public function/type compatibility still requires those fresh checks; no casts or weakening hide a mismatch. A newly discovered out-of-scope caller/capability requirement must stop the writer rather than expand scope.
- Completed A's three next-workspace header metadata lines, duplicate interrupted metadata observations and B4's extra-five backend-read deviation remain preserved, not retrospectively compliant. This B lock read ends exactly at the backend record and acquires no next-workspace header.
- Coordinator states the earlier A readiness-report write was unconfirmed and its read returned FileNotFound. That interruption is retained; this phase did not inspect, overwrite, recreate or retry that old report. This new handoff is separate.
- Production remains the distinct unchanged foundation host. No listener mounting, locale-origin widening, private rendering, authenticated principal/session, durable epoch/adoption, compatible native writers, through-COMMIT authority/nonretryable ambiguous-COMMIT clearance, native close/drain/lifetime, private host/issuer, restore/restart or formal179/FILE-DATA/91-of334 acceptance is claimed.
- Preserve genuine generated query keys, source errors/defaults, actual effects/disposer ownership, session/key retention and real icon results. No fake cache/settings/permissions/epoch, anonymous protected leaves, tRPC tunnel, framework, DB pool, new library, source comments/casts/tests or `any` were introduced.

No command/compiler/lint/test/build/install, module evaluation/resolver, runtime/native/SQL/data/environment/secrets/capture/stat/hash/Git/browser/delegation or Context7 call occurred. Only the four released product paths and this separately collision-checked new handoff were written. Self-hosting remains ordinary user servers with no mandatory Cloudflare/tunnel; local Darwin work remains PAUSED.
