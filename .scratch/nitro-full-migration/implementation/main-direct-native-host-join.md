# Direct native owner → prepared public host — implementation freeze

**Outcome: the released five-file source change is implemented and frozen for independent review. The prepared async host constructs exactly one existing native owner, captures its actual schema through guarded ready admission, and uses that same owner's guarded runtime/proxy/lifecycle for public consumers. No production listener or factory producers are mounted.** No compiler/lint/runtime acceptance is claimed.

## Exact write/read scope

Only these five product paths were patched:

| Exact path under `apps/backend/src/server/runtime-composition/` | Before complete EOF | Frozen complete EOF | Change                                                                                                     |
| --------------------------------------------------------------- | ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `native-main-persistence.ts`                                    | 1–377               | 1–394               | Add frozen narrow guarded runtime facet                                                                    |
| `runtime.ts`                                                    | 1–143               | 1–154               | Async internally owned concrete native host construction; actual schema; outside-admission cleanup         |
| `assembly.ts`                                                   | 1–215               | 1–225               | Used-capability `Pick`, ready-owner guard, readiness abort checks and prepublished coalesced host disposal |
| `public-settings.ts`                                            | 1–78                | 1–78                | Type-only `Pick<ProxySettingsReader, "getOnboardingStepAsync">` at line 6                                  |
| `public-culture.ts`                                             | 1–240               | 1–240               | Type-only `Pick<ProxySettingsReader, "getDefaultLocaleAsync">` at line 51                                  |

Each before/frozen source read was sequential from line 1 with limit 2000; all reached EOF with no missing/ambiguous/clipped/ceiling-limited section. Before source 1053 lines; frozen source 1091 lines. Also read authorized `apps/backend/package.json` 1–30 EOF: existing dependencies include DB/contracts/ORPC, and `./host` exports the separate foundation host at `./src/server/host.ts`. No dependency/export/manifest change was made. Eleven reads / 2174 total returned lines in this implementation phase; retained contracts/caller reports/approved plan facts were reused without other body acquisition.

No contracts, barrel, compose, manifest, entry, renderer, tests, DB/Core/Auth/native SDK or peer files were patched or followed. One attempted formatting-only patch failed verification because its expected single-line type was absent; it changed nothing. The complete frozen assembly read shows the intended type already multiline. No command-based formatting or verification was invoked.

## Frozen interface and actual owner binding

### Native result — lines 352–375

The existing native result gains `runtime`, a frozen object with only:

- Read-only `engine` and `phase` getters from the actual retained runtime, rejecting absence. No invented ready/closed phase.
- The exact existing native guarded `runAsync` function (293–299).
- `checkReadinessAsync`, calling the actual retained runtime's SQL-readiness method inside existing `registerOperation` (362–366). It registers before invocation, tracks outcome and retains the existing post-success currentness check/sanitized rejection behavior.

No raw runtime/database/client, open/schema/content migration, maintenance or native-close method is exposed. Existing native `ready`/`assertCurrent`/`dispose`, lifetime, initialization and operation tracking, guarded proxy readers, failure policy and seed/configuration selection remain unchanged. In particular native disposal still publishes its shared closing task before abort/cleanup (181–203), and drains observed initialization/operations before actual helper close (154–179). No transfer claim, borrowed owner mode, whole-owner proxy-close alias, dummy close or second runtime is added.

### Prepared constructor — runtime lines 22–25, 46–95

`createPublicHostRuntime` is now async. It takes explicit `startupSignal: AbortSignal`; no caller schema or `MainPersistenceFactories` option remains. Its database/schema types are derived from the actual native factory's guarded operation signature, without casts or `any`. Settings/backend resource factories receive that actual schema type, setup context receives the actual native admission type, and prepared render typing still uses the existing SQL projection/culture contracts.

Actual supplied settings store/resources, backend source procedures/contribution/metadata/setup resources/context, culture factories/cookies/options/clock, render and error reporter remain required. No default resources, fake SQL/permissions/cache/settings, copied schema singleton, auth principal or wider anonymous registry is invented. The existing public two-query registry and admitted RPC implementation were not modified or followed.

### Assembly — lines 23–29, 42–52

The persistence runtime input is exactly `Pick<MainPersistenceRuntime<Database, Schema>, "engine" | "phase" | "runAsync" | "checkReadinessAsync">`. Assembly requires a SQLite runtime in actual `ready` phase plus its real lifecycle contribution, and immediately calls owner `assertCurrent`. There is no configured generic construction mode because the reconciled source caller check found only the updated runtime constructor's assembly call. Host phase still starts configured because the prepared application has not yet started; this is distinct from the already-initialized persistence owner's phase.

Real guarded SQL readiness remains in assembly 69–84, health handlers and application-ready paths. Its persistence contribution checks its supplied readiness signal before and after native ready (130–140), then runs actual SQL readiness. Existing public route shapes, health/RPC response handling, locale policy, document classification/rendering and error reporting remain intact.

## Exact construction, settlement and cleanup order

1. `runtime.ts` 97–98 captures/validates host configuration and rejects an already-aborted explicit startup signal before owner creation.
2. Line 99 calls `createNativeMainPersistenceResourcesAsync(configuration.persistence)` exactly once. The generic helper construction/import in this file is removed. Native still internally constructs its existing one retained helper/runtime/proxy; failed native construction retains its preexisting internal cleanup behavior.
3. After owner creation, all work is inside the owning try/catch. Lines 101–102 recheck startup abort and await that owner's real readiness (opening/migrations/fresh initialization/readiness checks remain native-owned).
4. Line 103 awaits the same owner's guarded `runAsync((_database, schema) => schema)`. Only actual schema metadata is returned; the admitted database is neither used nor retained by host construction. **This operation fully settles before any consumer factory is invoked or construction disposal is awaited.** Its imported physical settlement remains a source/native hold, not execution proof.
5. Lines 104–135 construct the registry/settings/culture/RPC from that captured schema and same guarded runtime/proxy/owner currentness. Settings resource construction checks each admitted schema against the captured one (112–115). RPC receives that same actual schema (128), preserving its existing equality/currentness and two-leaf public policy checks. Registry factory exceptions occur outside tracked admission and therefore retain their original error instead of being sanitized as an operation failure.
6. Line 136 rechecks native currentness before assembly/return. Assembly validates ready-owner currentness again. No production `fetchApplication`/compose/entrypoint is edited or activated.
7. Lines 146–152 catch any post-creation failure and await the actual same-owner `dispose` outside admission. Cleanup success rethrows the original received error unchanged. Cleanup failure throws ordered `AggregateError([error, cleanupError], ..., { cause: error })`. No error logging, detach, retry or swallowed cleanup failure was introduced. If native readiness already started closing, its coalesced disposal is reused, not retried.

The actual consumer factory arguments depend on genuine schema, so they cannot be invoked/fully validated before owner readiness without faking resources. Earlier configuration/signal validation is done before creation; the owning catch covers the remaining construction. Existing operation errors remain sanitized by the native API; the catch preserves the error it receives, not a fabricated underlying native result.

## Host disposal prepublication — assembly lines 193–210

Host disposal returns its existing shared promise when already started. Otherwise it creates `Promise.withResolvers<void>()`, assigns `disposal = shutdown.promise`, marks draining and observes rejection **before** invoking the async delegated disposal body. Reentry therefore sees the published same promise. The body awaits imported application disposal, checks collected shutdown errors and actual retained runtime phase `closed`, then marks closed; failure marks close-failed and rejects the published task. This reuses the native deferred-task pattern, not a new lifecycle framework. Native owner cleanup remains its original coalesced abort/drain/helper close; no direct proxy/native close is exposed or called by host consumers.

Imported application's complete request/lifecycle drain behavior was not read or executed. Prepublication and source-level close checks are not native lifetime, shutdown, physical completion or successful-COMMIT proof.

## Type-only consumers and preserved behavior

`public-settings.ts` changes only its proxy input type to the one used onboarding read. Its runtime body, request memoization, genuine settings keys/projection, anonymous principal, setup resolution and denying authorization are unchanged.

`public-culture.ts` changes only its proxy input type to the one used default-locale read. Its classification, capture/preparation, cookies, finite clock handling, color-scheme preference, bounded locale body handling and loopback-only origin policy are unchanged. It does not gain a close callback. No comments, tests, new dependencies, casts/type assertions, `any`, fake success transport, defaults or mutation widening were added.

## Review risks, validation holds and next gate

- The constructor's async return, explicit startup signal and removal of injected schema/persistence factories are intentional scoped API changes. Reconciled ordinary/non-fixture caller evidence found no consuming caller requiring old semantics; global/external/fixture compatibility is not asserted. The current manifest host export still targets the distinct unchanged foundation host.
- Assembly now accepts only a ready supplied owner. Any newly identified configured/generic caller or missing source capability must stop further work rather than widen scope.
- `startupSignal` participates in the native first-readiness lifetime and remains a trusted construction-lifetime input, not permission, session revision, actual durable epoch or optional authority. Later assembly readiness signals do not replace that stored lifetime.
- Current owner drain waits observed work and can remain unbounded. Imported scope/driver/native completion, shutdown reentry and readiness/failure races need independent review and separately authorized validation; no scenario was executed here.
- Supplied consumer factories must be real and have reviewed resource/lifetime contracts. Same-owner cleanup does not fabricate retirement for independently allocating consumers. No actual production settings/culture/procedure/metadata/setup/render/listener producers were selected by this change.
- Existing authentication/principal/session, durable attached-main epoch/adoption, compatible native writers, security-before-logging/current authority through nonretryable ambiguous COMMIT, private issuer/host, restore/restart and formal179/FILE-DATA/native gates remain unproved. Procedure acceptance remains 91/334.
- Existing ordinary backend 0 / Nitro 7 errors and Integration acknowledgment source review are retained historical context, not freshly rerun compiler or teardown results.

**Freeze gate:** exact five product paths above are ready for independent source review and coordinator-owned fresh focused lint/backend/Nitro checks with full logs/numeric status, only after separate validation release. No source changes beyond those paths are allocated by this handoff.

No commands, stat/hash/copy/Node/evaluation, compiler/lint/tests/build/install, native/capture/runtime/SQL/data/environment/secret/Git/browser/delegation or Context7 calls were made. Exact report destination collision check returned absent immediately before this sole optional report patch. No canonical identity, actual runtime or acceptance claim follows from the returned source text. Homarr remains self-hostable on ordinary user servers, without mandatory Cloudflare/tunnel; the unchanged loopback locale hold and paused Darwin work remain separate.
