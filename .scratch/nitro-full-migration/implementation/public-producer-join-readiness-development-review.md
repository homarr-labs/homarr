# Public producer join readiness — bounded ordinary source review

**Outcome: server-settings public-root forwarding and supported-language source exports are closed; the prepared public RPC already delivers genuine effect/disposal hooks, request signal and admission currentness. No local missing-hook repair is justified by these bodies. The smallest real producer binding remains held on the permitted cookie API acquisition, declared backend dependencies and exact culture clock/options/export reconciliation.** This stage made no product or dependency changes and mounted no host.

## Exact coverage and acquisition limits

Authority: `.scratch/nitro-full-migration/PUBLIC-PRODUCER-JOIN-READINESS-PLAN.md`, read 1–27 EOF. Installed cookie metadata was read before any attempted cookie API acquisition.

| Authorized body                                             | Complete returned interval / EOF |
| ----------------------------------------------------------- | -------------------------------- |
| `packages/server-settings/index.ts`                         | 1–1 / 1                          |
| `packages/translation/src/languages.ts`                     | 1–46 / 46                        |
| `packages/translation/src/standalone/types.ts`              | 1–31 / 31                        |
| `apps/backend/src/server/runtime-composition/contracts.ts`  | 1–161 / 161                      |
| `apps/backend/src/server/runtime-composition/public-rpc.ts` | 1–204 / 204                      |
| `apps/backend/src/server/runtime-composition/runtime.ts`    | 1–154 / 154                      |

Six dedicated sequential body reads / 597 lines, each requested from line 1 with limit 2000. All reached EOF without missing, ambiguous, clipped or ceiling-limited body text. Additional authorized complete metadata: `node_modules/cookie/package.json` 1–57, `packages/translation/package.json` 1–50, `apps/backend/package.json` 1–30, `packages/api/package.json` 1–124, `packages/server-settings/package.json` 1–32, root `package.json` 1–422. Metadata totals 715 lines. Also read prior authorized `implementation/public-api-producer-development-review.md` 1–59 EOF. Including plan/report: fourteen reads / 1398 returned lines; no physical identity/hash/conservation claim.

**Cookie API acquisition is incomplete, not its metadata read:** its manifest declares no public type entry, so no inferred `.d.ts`, implementation, type fallback or resolver was followed. Other authorized body reads remain complete. The interrupted report tool call supplied no patch content and returned no success; the exact destination was checked absent again before this sole report write.

A12 facts below are explicitly retained from its report, not fresh API implementation reads. The culture worker's B4 facts are planning context only; its OUT-OF-ALLOCATION extra five backend reads remain preserved deviations, not retroactively compliant acquisition. No B report was read or fabricated. This review did not repeat those extra bodies or follow catalogs, locale options implementations, Auth/DB/Core/schema/native SDK/date/dayjs/cookie implementation imports.

## Public export and source-factory facts

### Server-settings and API

`packages/server-settings/package.json` 14–16 maps the public root to `./index.ts`; the actual root body is `export * from "./src"`. Joined to A12's authorized `packages/server-settings/src/index.ts` review, this closes the previously missing lexical root forwarding for that implementation's named exports. It does not authorize a private deep import or module evaluation; no root/export amendment is needed for the retained named settings producers.

API metadata declares public subpaths for `@homarr/api/nitro`, `/nitro/contribution`, `/nitro/routers/server-settings`, `/nitro/resources/setup-read`, `/nitro/helpers/settings` (11, 13, 39, 46–47). A12 confirms genuine `createSettingsStore`/`settingsCodec`, `createServerSettingsProcedures`, `defineBackendContribution`, `createSetupBackedContext`/`createSetupReadResources` and source metadata exports. Use these existing public entries; no `-settings-setup` or `-setup-read` internal deep import is needed. The native source metadata entry/export is retained reviewed context, not a new body acquisition.

### Languages and culture options

Translation metadata maps `@homarr/translation/languages` directly to the authorized `src/languages.ts` (24). That body actually exports the supported-language tuple, derived `SupportedLanguage` and source fallback locale `en` (5–46). These are genuine source configuration values, not guessed runtime language resources.

Metadata also declares `/runtime` → `src/runtime/index.ts` and `/standalone` → `src/standalone/index.ts` (17, 21). Their implementations were not followed in this tranche. The culture factory names required locally are exact in contracts 128–149: supported languages, locale resolution, loading request culture, culture preferences, formatter, locale-preference sync and locale-cookie effect. A package export map proves the entry path, not that every required function/type is reexported there or matches the prepared host signature. B4 planning does not substitute for that compliant export/behavior reconciliation.

Authorized `standalone/types.ts` 21–28 declares `TranslationSnapshot` from `IntlConfig` locale/now/timeZone/formats plus messages, and `RequestI18nOptions` removing messages/locale while adding error handlers and optional locale. Its `use-intl`, English catalog and language type imports were not followed. No catalog, timezone default, date parser or runtime-now behavior is inferred from this type declaration. The file itself is not a separately declared public export path; use a confirmed existing public reexport, not a new private `/standalone/types` import.

## Actual public request hook transport: no noop required

`PublicBackendInput` has real request/signal and `effect`/`onDispose` hooks (contracts 71–80). `BackendAdmission` separately carries actual database/schema, signal and `assertCurrent` (82–87). There is no input permission/epoch allocation.

`public-rpc.ts` 111–151 establishes POST-only anonymous SQLite admission, rejects physical schema mismatch and creates callback-local currentness checking request abort, active callback and owner currentness. It supplies `createSetupBackedContext` with:

- The exact request and request signal (134–135).
- Anonymous principal, no device type, configured base URL and disabled demo (136–139), only for the two accepted public reads.
- `effect`: assert admission currentness, then forward to the actual request's effect collector (140–143).
- `onDispose`: assert admission currentness, then forward registration to the actual request's disposer collector (144–147).
- Separate admitted database/schema, that same signal and that genuine currentness function (149), plus actual supplied setup resources (150).

The local constructor therefore receives all those hook resources. Currentness is in the admission argument, not on `PublicBackendInput`; a real app-owned bridge must use `admission.assertCurrent` wherever the native API request/setup contract needs it, never invent an optional/default assertion. The A12 report confirms genuine setup-backed effect/disposal fencing; its exact object/argument mapping was not freshly reread here. These bodies establish **no missing local contracts/public-RPC effect/onDispose forwarding** and justify no repair that replaces real hooks with noops or treats freezing as authority.

Backend context validation retains admitted DB/request/signal identity and anonymous/frozen shape checks (152–168); response materialization remains inside admission with currentness and callback revocation (170–200). Structural freezing/callability alone does not prove authentication, permissions, hooks' source implementation or native settlement. Neither request effect delivery nor disposal completion was executed.

## Exact minimal real settings/backend resource selection

Prepared runtime 99–103 creates the existing native owner once, awaits readiness and captures actual schema through its guarded admission. It then calls backend resources with that schema (104–107); SQL settings rejects a different admitted schema before supplying resources (112–115). RPC receives the same captured schema and original context factory/metadata/setup resources (125–135). Construction failures dispose outside settled admission and preserve original/cleanup failures (146–152). No caller-supplied fake schema or second connection is needed.

The smallest producer wiring, retaining A12's actual resource contracts, is:

1. Settings: existing `createSettingsStore` and `settingsCodec`, genuine `schema.serverSettings`, and real public `eq`/`and` operators. Use the existing store's declared fulfilled-read/default/codec behavior, not hardcoded success/default settings or fake cache.
2. Source procedures: existing `createServerSettingsProcedures` with genuine settings resources plus its required `schema.boards`/`inArray` resources even though only public queries are selected. No placeholder boards resource or invented narrower factory contract.
3. Select only `getCulture` and `getBranding`. Local registry 8/40–47 creates exactly `{ serverSettings: { getCulture, getBranding } }`; validation 51–81 requires exact paths, public/query/guarded-demo source metadata and an explicit complete registry. Do not mount the original six-leaf namespace, admin reads/mutations, a source-metadata stub, anonymous protected procedures or tRPC fallback.
4. Context: the genuine public `createSetupBackedContext`/setup-read resources with actual admission db/schema/signal/currentness, real `eq` and ordinary clock, preserving delivered request hooks. Map its reviewed native constructor contract; do not build frozen substitute setup booleans/current-step callbacks. A12's setup read/claim logic remains the producer.

Public operator availability through `@homarr/db` is retained A12/previous source evidence; DB/Core/schema bodies were not reread. Resource member names above name actual required resources, not a freshly checked literal constructor object shape. Native callbacks must retain exact admitted DB ownership and genuine generated query keys.

## Cookie facts and precise hold

Installed `node_modules/cookie/package.json` is version **2.0.1** (3), matching root catalog `cookie: 2.0.1` (root 150). Root also lists the distinct `cookies: 0.9.1` package (151); it is not an interchangeable API/type fallback.

Installed cookie metadata declares `type: module` and `exports: "./dist/index.js"` (20–21), with no `types`, `typings`, typed export condition or `typesVersions` declaration anywhere in its complete manifest. Thus the authorized “only declared public type entry” branch has no actual target. No `dist/index.d.ts` guess, JS implementation or alternate package types were acquired. Metadata establishes neither exported function names nor call signatures: **do not claim installed `parse`/`serialize` match local `CookieCodec`.** In particular contracts 151–154 requires header parsing and three-argument descriptor serialization; any real API adaptation must preserve actual header/value/options semantics rather than cast an incompatible function to this interface.

Minimum next gate is a separately approved authoritative cookie-2.0.1 public API/type acquisition route or explicit public documentation lookup. No install or replacement library is implied. No Exa/web lookup was needed to establish this manifest-level hold and none was performed; Context7 was not called. Any documentation route must reconcile exact installed exports/signatures before writing the codec adapter.

## Clock/options coherence and policy

An ordinary clock can use the existing JavaScript builtin `Date.now`; request `now` options can use an actual `Date`, as permitted by contracts 122–126 and the authorized snapshot type. Neither is a durable attached-main epoch, credential generation, permission lease or native authority. Setup claim-time sampling is retained A12 behavior, not through-COMMIT expiry validation.

The prepared interface separately supplies `now(): number` and `snapshotOptions(context): Options` (runtime 77–83). Retained compliant B5 public-culture facts show a captured formatter clock followed by a separately supplied options snapshot. This split does not supply the captured instant to the snapshot callback. Two independent wall-clock samples are real time, but **not proof of one shared request instant**; a global mutable last-clock value or constant construction timestamp would be a wrong substitute.

Before claiming coherent exact request-now binding, choose/review one actual source policy: feed the already captured request instant into the options snapshot, or derive both formatter clock and i18n `now` from one request-local capture in the real culture preparation. That minimal future edge is the already-known `apps/backend/src/server/runtime-composition/public-culture.ts` options/clock preparation, with any matching `runtime.ts` callback type change; it is outside these six new body reads and was not reacquired or edited. Do not guess translation's default-now behavior or create a date/cookie framework.

Timezone remains an explicit user-facing policy choice: configured application timezone versus a documented host-default policy. No current environment/user timezone was read, no UTC default was invented, and language fallback does not decide timezone. Formats/error-handler policy also needs the existing public options export/signature reconciliation, not private options/catalog imports.

## Smallest honest app-owned binding allocation — proposal, not released

The known app-owned selection seam is `apps/backend/src/server/runtime-composition/runtime.ts`, where the accepted constructor already accepts the real producer inputs. A separately reviewed small binding there can select existing public API/settings/culture/cookie producers and invoke that same constructor, retaining supplied trusted configuration/startupSignal/render/reporting and explicit culture policy. No new filename, listener, transport, framework or persistence owner is invented; production `compose.ts` and locale-origin policy stay untouched.

Backend metadata 14–23 already directly declares `@homarr/api`, `@homarr/db`, contracts and ORPC. It does **not** declare `@homarr/translation` or `cookie`. An app-owned binding that imports those requires separately allocated direct declarations (`@homarr/translation` workspace version and existing `cookie` catalog entry) and installation/lock decisions if needed; this read stage authorizes none. `@homarr/server-settings` is needed directly only if backend directly imports it; using the existing API store/router producers does not itself require adding that direct import. No new library or API export amendment is justified by the current evidence.

**Precise release holds:** reconcile installed cookie public API without fallback; confirm the required culture factories/options type through their existing public entries using compliant evidence; settle coherent request clock/timezone policy; independently approve app-owned binding/dependency scope and exact native setup constructor mapping. Local public-RPC effect/disposal hooks are already forwarded, so there is no demonstrated hook fix to allocate. Root settings forwarding and supported-language exports need no more source widening.

## Unchanged acceptance/safety

User-provided latest prepared-owner source acceptance/backend types 0 and Nitro 7 errors are retained context, not new compiler results. Production remains foundation-only; no actual factory binding, authenticated principal/session, durable epoch/adoption, through-COMMIT authority/nonretryable ambiguous-COMMIT behavior, native close/drain, private host/issuer, restore/restart or formal179/FILE-DATA acceptance follows. Procedure acceptance remains 91/334. Preserve real response effects, disposer ownership, session/key retention, generated query keys and actual icon results; no anonymous mutation widening or fabricated authority.

Exact report destination was collision-checked absent before the sole report write. No product/dependency edits, commands/stat/hash/resolver/install/module evaluation, compiler/lint/tests/build, runtime/native/SQL/data/environment/secrets/capture/Git/browser/delegation or external documentation calls occurred. B4 out-of-allocation history is not rewritten. Homarr remains ordinarily self-hosted on any user server with no mandatory Cloudflare/tunnel; local Darwin work remains PAUSED. Independent review precedes any binding implementation.
