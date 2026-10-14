# Main runtime public consumers — phase B5 source development review

**Outcome: the public consumers implement real admission, settings projection, request culture and two-query RPC boundaries. They do not select the concrete injected consumer/context factories or enroll the native owner into production. Same-native-owner adaptation has an identified source seam, but a complete production allocation is not implementation-ready until the actual resource producers are identified.** No product code was changed.

## Exact coverage

Authority: renewed phase B5 approval and `.scratch/nitro-full-migration/SQLITE-FAILURE-PRESERVATION-AND-HOST-JOIN.md`, read 1–31 EOF. Each authorized source was read sequentially from line 1 with limit 2000:

| Exact source                                                     | Returned interval / EOF |
| ---------------------------------------------------------------- | ----------------------- |
| `apps/backend/src/server/runtime-composition/index.ts`           | 1–36 / 36               |
| `apps/backend/src/server/runtime-composition/public-settings.ts` | 1–78 / 78               |
| `apps/backend/src/server/runtime-composition/public-culture.ts`  | 1–240 / 240             |
| `apps/backend/src/server/runtime-composition/public-rpc.ts`      | 1–204 / 204             |
| `apps/backend/src/server/runtime-composition/join-slots.ts`      | 1–147 / 147             |

Five complete source reads / 705 lines; including the plan, six reads / 736 lines. No missing, ambiguous, clipped or ceiling-limited section. Prior seven-backend-file/report facts are reused from this conversation, without rereading those bodies or reports. No DB/Core/SQLite catch or peer-owned source was read. Exact destination collision check returned absent immediately before this sole report write. No commands/stat/hash/copy, import following/evaluation, Node/compiler/lint/tests/build/install, runtime/native/capture/SQL/data/environment/secrets/browser/Git/delegation or external documentation calls occurred.

## Concrete consumer implementation versus missing concrete factory selection

### SQL settings

`public-settings.ts` 4–55 implements `createPublicSqlSettings`, not the injected settings store. Each request memoizes a projection under a local Symbol, checks owner currentness/abort and SQLite engine, then enters the supplied runtime's `runAsync`. **The admitted schema itself** is supplied to `settingsResources`, and its result is supplied to `createSettingsStore` (19–20). Each store read checks currentness and abort before dispatch and in finally afterward (21–30). Genuine keys are `culture`, `appearance`, `board`, `search`, `user`, `branding` (31–36); returned values are projected/frozen, with branding cloned. There is no fabricated settings fallback or fake global cache.

The concrete `createSettingsStore`, schema-to-resources producer and its codec/operators remain injected functions. `join-slots.ts` 30–33 expressly retains the hold for “actual createSettingsStore/settingsCodec/schema/operators injection.” No source path for those implementations is imported or selected in these five files.

Its real `RequestServices` implementation is intentionally limited: `resolvePrincipal` always returns anonymous after checking abort (58–62), `resolveSetup` uses the supplied same-owner proxy onboarding reader and maps only `finish` to ready (63–70), and `authorize` always denies, with 401/403 selected by principal kind (71–74). This is neither an authenticated session resolver nor a permission snapshot. It must not be converted into unconditional authorization to obtain a production join.

### Public culture and locale HTTP contribution

`public-culture.ts` 12–37 classifies only GET/HEAD public document paths, respects configured base path, excludes service/static paths and derives an explicit supported locale/routing path. `createPublicCultureResources` 39–128 memoizes request preparation, rejects non-document and authenticated render requests, captures a finite clock and caller culture options, parses request cookies, resolves locale using the supplied proxy default-locale reader, reads SQL settings, loads culture and creates preferences/formatter. Anonymous preferences are explicitly obtained through `resolveCulturePreferences(null)` (89), not a fabricated authenticated user.

Actual injected operations are `supportedLanguages`, `resolveRequestLocale`, `loadRequestCulture`, `resolveCulturePreferences`, `createCultureFormatter`, `syncLocalePreference`, `createLocaleCookieEffect`; plus `cookies.parse/serialize`, `snapshotOptions` and `now`. No concrete translation/cookie implementation is imported here. Cookie color scheme overrides only supported values; otherwise the actual SQL appearance preference is used and validated (93–100). `cultureSeed.nowEpoch` is a captured Date timestamp for reconstruction (120–125), **not an attached-main durable target epoch**.

The actual locale contribution is `/api/preferences/locale`, public POST only (130–179), and writes a response cookie rather than SQL. It requires an explicitly reviewed loopback host (138–140), exact request Origin and non-cross-site fetch metadata, JSON content type, anonymous principal, bounded body and one supported locale property. The body implementation observes abort, byte limits and cancellation/release (190–240). Successful 204 follows a real serialized cookie effect; it is not a reusable success stub. The loopback restriction is a concrete production applicability hold for non-loopback self-hosting; removing it requires reviewed origin policy, not this source-only allocation. It does not mandate any deployment provider or tunnel.

### Public RPC and backend context

`public-rpc.ts` 8 and 26–82 construct/validate exactly `serverSettings.getCulture` and `serverSettings.getBranding`. Concrete `createServerSettingsProcedures(resources)`, `defineBackendContribution` and `getSourceProcedureMeta` remain injected. The implementation demands exact leaf membership, eager complete registration, source path identity, public access, query kind and guarded demo policy. There is no authenticated/App/Icon/mutation registry here, and no permission to expand these leaves.

`createAdmittedPublicRpc` 84–204 produces a POST-only contribution and rejects non-anonymous principals. It runs handler/context/response materialization inside supplied SQLite admission, requires admitted schema identity equal to the configured source schema (121–123), and gives the injected `createSetupBackedContext` the admitted database/schema/signal plus a callback-local currentness guard (124–151). The resulting context must retain exact DB/request/signal/base URL, anonymous principal, no device type or demo capability, frozen context/principal/demo/setup and genuine callable setup readers (152–168).

This validates structural identity and policy; it does not implement `setup.isClaimOnlyAccessAllowed`, `setup.currentStep` or the injected context factory. Function presence/frozen objects cannot prove the readers' authority or SQL behavior. The RPC response body is consumed inside admission before a copied Response is returned; serialization cancellation failures preserve both errors, and callback activity is revoked in finally (170–200). This is concrete source sequencing, not proof of imported handler/DB/native physical settlement or authority through COMMIT.

## Existing public surface and explicit holds

`index.ts` 1–36 exports generic persistence/public-host construction and consumer functions. It does **not** export or select `createNativeMainPersistenceResourcesAsync`. A barrel's availability is not concrete producer selection or production enrollment.

`join-slots.ts` 23–143 is a static list of prepared/unjoined declarations, not execution or registration. It explicitly retains public factory injection/proof holds and marks authenticated-principal, compatible writers, integration clients, widget primitives, state/history/jobs SQL, copied catalog, render hydration and production listener unjoined. `requireRuntimeJoin` always throws, including for prepared slots (145–147); slot presence is not acceptance.

Retained prior seven-file facts: `runtime.ts` constructs a generic persistence helper; `native-main-persistence.ts` separately constructs and retains a concrete runtime/proxy with guarded readiness/admission/disposal. The native result has no exposed host runtime/schema/check-readiness bundle and its guarded proxy exposes only reads, not `closeAsync`. `assembly.ts` already enrolls a supplied persistence contribution and SQL-backed readiness into a prepared application, but `compose.ts` still enrolls only foundation health. Imported application/listener drain/mounting bodies were never acquired.

## Smallest honest next allocation / missing producer scope

### Owner adaptation: identified, bounded source seam; no production cutover yet

The known spine remains `apps/backend/src/server/runtime-composition/native-main-persistence.ts` → `apps/backend/src/server/runtime-composition/runtime.ts` → `apps/backend/src/server/compose.ts`, with the existing consumer/assembly contracts as constraints. A later owner-only allocation can make the prepared public host consume one already-owned native resource bundle instead of constructing a second helper. It must preserve guarded `runAsync`, actual same-owner schema/readiness/phase, initialization and coalesced disposal; caller-supplied schema cannot replace physical schema identity. The proxy reads used by settings/culture do not require a callable close method, so any adaptation must retain real owner lifecycle or narrow read-only consumer contracts rather than fabricate a no-op `closeAsync`. Do not expose an unguarded retained database or create another DB/pool/framework.

This mechanical seam is source-backed, but these five files do not furnish the concrete producer arguments needed for an honest production `createPublicHostRuntime` call. Therefore **do not allocate mounting in `compose.ts` as complete until the following real producers are identified and reviewed**:

| Concrete missing producer scope     | Source-backed requirement / selection point                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings resources/store            | `public-settings.ts` 7–8, 19–25: real `createSettingsStore`, `settingsResources(schema)`, settings codec and SQL operators; slot hold 32                                  |
| Culture/cookie resources            | `public-culture.ts` 48–54, 78–108, 175–176: the named real culture factories, cookie codec, explicit clock/options; slot hold 37                                          |
| Accepted two-leaf source procedures | `public-rpc.ts` 30–38, 40–47, 64–80: actual `createServerSettingsProcedures`, `defineBackendContribution`, `getSourceProcedureMeta` and real resources                    |
| Setup-backed context                | `public-rpc.ts` 95–101, 132–168: actual `createSetupBackedContext`, setup resources and real claim/current-step readers; slot hold 42                                     |
| Render/hydration and listener       | `join-slots.ts` 125–141: real prepared-render reconstruction/providers and same-listener entry/lifecycle/pre-drain enrollment; prior `compose.ts` remains foundation-only |
| Non-loopback locale applicability   | `public-culture.ts` 138–146: reviewed explicit origin policy before claiming the current loopback-only POST works on an arbitrary self-host origin                        |

### Principal/session and target epoch: no actual producer path disclosed

**No concrete session/principal/permission or durable target-epoch producer path appears in these five files' imports or exports.** Their imports name only ORPC, contracts and the already-reviewed local configuration/contracts surfaces. Therefore naming an implementation filename would invent a path; no automatic import follow or guessed path is proposed.

The exact source-backed missing roles are: accepted credential/session engine, current permission snapshot and revocation/origin policy (`join-slots.ts` 45–52); explicit shared epoch initialization owner, state-owner captured epoch, epoch/header lock order and same-listener retirement (`87–113`). These strings identify required producers, not source filenames. The prior report's `packages/db/runtime.ts` native session-mutation entrypoint is retained context only; it is not evidence of a request-session resolver, authenticated principal factory or durable epoch producer and was not reread.

The smallest honest next **source acquisition** is thus coordinator identification/allocation of the existing implementations of the concrete symbols and roles above, supplying their actual paths before any read. There is no implementation-ready full public production mount, authenticated extension or target-epoch join from this tranche alone. Anonymous read admission, process lifetime, captured culture clock and static join declarations must not substitute for those missing producers.

## Unchanged safety and acceptance

Only ordinary source behavior is claimed. No canonical FILE/DATA, native physical completion/lifetime, private-host/issuer, authority through COMMIT, restore/restart or production-cutover acceptance follows. Keep ambiguous dispatched COMMIT nonretryable, real logging/error preservation, web password-change session/key retention and CLI session-only deletion, genuine generated query keys and actual icon results; no fake settings/cache/permissions/callback resources or anonymous RPC mutations. Peer SQLite catch work is disjoint and neither inspected nor assessed here.

Prior ordinary backend 0 / Nitro 7 errors and Integration acknowledgment source review remain retained, not rerun or teardown proof. Procedure acceptance remains 91/334. Portable any-server self-hosting/no mandatory Cloudflare or tunnel remains the goal; local Darwin tooling stays PAUSED. No genuine external library fact was needed, so no Exa/web search or Context7 was used. Product source remains frozen, with only this collision-checked report written.
