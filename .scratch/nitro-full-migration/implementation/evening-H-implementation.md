# Evening H — six-path implementation freeze

Implemented the approved main public-host enrollment, versioned explicit startup config and one awaited Nitro/Bun transport lifetime. Source-only freeze: no lint/typecheck/build/runtime result is claimed. Public SSR/provider reconstruction is U's separate tranche; authenticated resources remain unmounted and 91/334 unchanged.

## Exact frozen product paths

1. `apps/backend/src/server/compose.ts` — calls existing `createPublicHostRuntime` with captured configuration, actual startup signal, preserved supported culture options, prepared renderer and bounded request-ID-only failure reporting. Removed constant-success standalone foundation composition; the prepared assembly supplies genuine readiness/health/RPC.
2. `apps/backend/src/server/host.ts` — exports the exact agreed renderer type and existing Fetch name; prepublishes initialization/close promises, retains failed initialization without retry, awaits actual constructor/application readiness, fences new work before startup abort and awaits same-owner cleanup. Postconstruction readiness failure preserves primary and cleanup errors.
3. `apps/backend/src/server/startup-configuration.ts` — new sole cached explicit-argument config loader; version 1 strict schemas, initial loopback/empty-base-path/fresh-only scope and private canonical file/path validation before DB allocation. Failed config loads remain failed. File close failure preserves a preceding read/validation error.
4. `apps/backend/server/entry.ts` — new replacement transport entry; uses actual public Nitro APIs and existing declared `srvx/bun` `serve`, one manual bind, no competing built-in signals, reuse-port or proxy trust. Signal callbacks fence transport and resolve a shutdown request only; the entry's async owning flow awaits host disposal, transport close and actual Nitro hooks with all outcomes retained. Binding is explicitly not announced as DB readiness.
5. `apps/backend/server/lifecycle.ts` — actual awaited close hook only; removed detached signal pre-drain/ambient CI/TEST condition.
6. `apps/backend/server/plugins/lifecycle.ts` — same host's actual close function, not a separately composed application.

No Nitro/Vite/manifest/lock/runtime/native/assembly/provider/test/peer product file was written. New paths were checked absent before adding. Installed `srvx` metadata is 1.0.5 and backend already declares it; no dependency change/install was performed.

## Frozen H/U export handshake

Public module remains `@homarr/backend/host`:

```ts
export type PreparedApplicationRenderer = Parameters<
  typeof createPublicHostRuntime
>[0]["render"];
export function fetchApplication(
  request: Request,
  render: PreparedApplicationRenderer,
): Promise<Response>;
export function closeApplication(): Promise<void>;
```

U imports the alias type and supplies its real `(context, prepared) => Promise<Response>` renderer to the existing Fetch export. The first renderer is retained by the sole initialization; later Fetch calls do not recompose. Entry and lifecycle plugin both import `closeApplication` through that exact public package specifier, matching SSR's host import. Coordinator/D must preserve one physical host module across SSR and Nitro bundles; source specifier equality is not compiled singleton proof.

The config loader is `loadStartupConfiguration(): Promise<StartupConfiguration>` from `apps/backend/src/server/startup-configuration.ts`. Entry and host consume that same loader; no public manifest/export addition is required. Compose's inputs are captured `StartupConfiguration`, actual startup `AbortSignal` and the constructor-derived renderer. No DTO copy, unsafe cast, `any`, raw database handle or alternate owner is introduced.

## Version 1 config contract — coordinator boot instructions

Exactly one argument of the form `--homarr-host-config=<normalized absolute JSON file path>` is mandatory. No environment/file discovery or fallback. Initial approved JSON shape:

```json
{
  "version": 1,
  "listener": { "hostname": "127.0.0.1", "port": 3217 },
  "host": {
    "baseUrl": "http://127.0.0.1:3217",
    "basePath": "",
    "persistence": {
      "engine": "sqlite",
      "mode": "fresh",
      "path": "/ABSOLUTE/OWNED/RUN/data/main.sqlite",
      "migrationsFolder": "/ABSOLUTE/OWNED/RUN/assets/sqlite"
    },
    "localeMutationBodyLimit": 4096
  },
  "culture": {}
}
```

Replace `/ABSOLUTE/OWNED/RUN` with a newly owned actual canonical directory under the approved temporary root. Reserve/check an unused port before execution; 3217 is a proposal, not a verified reservation. Loader rejects ports 3100/3200. Listener must be literal loopback, port 1–65535 and exactly aligned with the canonical HTTP origin. Nonempty base paths, HTTPS/external origins and existing-mode databases are deliberately rejected by this initial source scope, not silently downgraded.

Config file and its parent, and database parent, must be owned by the current process UID, private (no group/other permission bits), canonical and nonsymlinked. Config must be a regular file at most 1 MiB and is opened with `O_NOFOLLOW`. This initial POSIX-private-path contract fails closed if UID ownership cannot be checked. Fresh database path must not already exist, equal the config file or overlap migration assets; migrations directory must already exist canonically, outside the data parent. Use separate private `RUN/data` and `RUN/assets/sqlite` parents and package genuine migrations/journal/metadata; H creates no directories/assets/config/data.

All object schemas are strict; unknown options fail rather than disappear. `culture` is required, accepts optional valid `timeZone` and optional named `formats`, and invents no UTC/default timezone. Missing options stay missing. The existing constructor overrides only `now` with its single captured request instant; config does not accept `now` or JSON representations of callbacks.

Supported version-1 format groups: `dateTime`, `number`, `list`, `displayName`. Each contains named strict option objects and is deeply frozen through the schemas. Date/time accepts year/month/day/hour/minute/second/weekday/era/hour12/timeZoneName/timeZone/localeMatcher/formatMatcher/dateStyle/timeStyle/hourCycle/dayPeriod. Number accepts localeMatcher/style/currency/currencyDisplay/currencySign/unit/unitDisplay/useGrouping/minimumIntegerDigits/minimumFractionDigits/maximumFractionDigits/minimumSignificantDigits/maximumSignificantDigits/notation/compactDisplay/signDisplay/numberingSystem. List accepts localeMatcher/style/type. Display name accepts localeMatcher/style/type/fallback/languageDisplay and requires type. Unsupported fields are rejected; no structural assertion pretends to support the complete Intl option surface. Combination-level Intl errors remain genuine producer errors, not success fallbacks.

Use coordinator-selected replacement `apps/backend/server/entry.ts`, not the default Bun transport entry as an additional listener. Do not use default app scripts targeting `.output`/3200. Coordinator/D owns disposable output/assets/build config; start only its fresh generated entry with the explicit argument, `--no-env-file` and clean allowlisted environment. No runtime command was executed here.

## Lifecycle and preserved policy

Config validates before entry creates Nitro app/transport or host allocates DB. Nitro SSR is still lazy: first real Fetch starts the prepared constructor; every admitted Fetch awaits that retained initialization plus real application readiness. A bound socket is not SQL success. Constructor failure remains rejected, with no native/foundation/path retry.

Closing is published before abort/cleanup; later Fetch receives 503. Initialization already in progress settles first. Constructor itself owns its prepublication cleanup; host owns postconstructor readiness cleanup. Dispose is not awaited inside request/native admission. Entry's shutdown awaits all host/transport/hook outcomes, deduplicates identical rejection objects and throws an ordered aggregate retaining the primary cause; signals do not pretend EventEmitter awaits them. Imported physical SQL/body/transport completion remains a validation hold, not proved by promise wiring.

The original same-owner native factory, guarded settings/culture/setup producers and exact two-leaf public RPC registry are unchanged. No anonymous protected route/mutation, private issuer/resource/provider, fake hooks/cache/grants or second owner is mounted. No default production cutover or real data/restore is authorized.

## Receipt and next gate

Only the six leased product paths plus this directly absence-checked new handoff were patched. Ordinary source/declaration reads only; no commands/compiler/lint/build/install/runtime/native/SQL/data/.env/secrets/Git/children. No comments, casts, `any` or tests were added. Coordinator must run required focused lint and both target typechecks after peer freeze, then independently validate disposable build/module identity, real SSR/readiness/cookies/RPC and cancellation/shutdown races. Historical backend 0 / Nitro 7 and 91/334 are unchanged, not today's results.
