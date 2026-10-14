# Locale/culture pure-request source preparation

## Outcome

**Unmounted candidate source ports prepared for coordinator review, not #06/#07 completion.** Only new `packages/translation/src/runtime/**` and this report were authored. The accepted standalone v1 catalog/translator implementation is reused; no catalog map, translation engine, client provider, UI hook, user repository, route registry or auth policy was replaced.

DESIGN, CONTRACTS, NEXT-WAVE, #06/#07 and `research_notes/Homarr full Nitro migration/localization-ui.md` were consumed. Q11–15 remain resolved; existing source semantics supersede the older ticket questions wherever defined. Locale is still guest-capable and is not an authenticated user column. Q16/session-engine selection is untouched. Frozen auth helpers/policy/Core evidence were not edited or executed.

No `.env`, real app data/backup, credentials, browser, live provider, network, listener 3100 or container was accessed. No installation, staging, commit, branch/worktree or nested agent was used. Changes made by other owners, including COMPOSITION's translation manifest/standalone exports, were preserved.

## Actual source ledger

| Candidate                                                                                                                                                                   | Read-only source                                                                                                                        | Preserved semantics / adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveRequestLocale`                                                                                                                                                      | `apps/nextjs/src/proxy.ts`; installed next-intl `middleware/resolveLocale.js`, `middleware/utils.js`; translation `languages.ts`        | Supported explicit legacy-prefix **segment** wins, then exact supported `homarr.locale`, then configured default, then `en`. Explicit segment matching is case-insensitive as the installed prefix matcher is; cookie/configuration keys stay case-sensitive. The instance-default read is skipped when a supported cookie exists, exactly as the proxy does. Otherwise it is read even with explicit input. Configuration-read errors propagate rather than inventing an English success. No Accept-Language input is accepted: the source proxy explicitly blanks that header.                                                                                          |
| Locale identities/direction                                                                                                                                                 | `translation/src/config.ts`                                                                                                             | Reuse `getIntlLocale` and `isLocaleRTL`, not a copied alias or metadata map. Catalog and message-engine identity remain the raw supported key. Intl aliases remain `cn→zh-CN`, `cr→en`, `zh→zh-TW`; `no` and `de-CH` stay unchanged for Intl. Only source-marked Hebrew is RTL.                                                                                                                                                                                                                                                                                                                                                                                           |
| `createLocaleCookieEffect`, `syncLocalePreference`                                                                                                                          | `translation/src/routing.ts`; installed next-intl `routing/config.js`, `middleware/syncCookie.js`                                       | Guest `homarr.locale`, 31,536,000-second maxAge, SameSite Lax, configured base path or `/`. An existing mismatched cookie is updated; an absent cookie is written only when selection differs from the configured/English default. Default-only visits do **not** gain an unconditional cookie, matching source negotiation with the header cleared. No secure/domain/HttpOnly decision was invented. Effect delivery is structural and request-owned, not a global cookie jar or browser mount.                                                                                                                                                                          |
| `loadLocaleResources`                                                                                                                                                       | `translation/src/config.ts` and existing MRT JSON/resources                                                                             | Call the actual source Day.js and MRT import functions; no duplicate resource registry. Day.js locale identity comes from the loaded resource's `name`: `cn→zh-cn`, `cr→en-gb`, `zh→zh-tw`, `no→nb`, `de-CH→de-ch`. Every other mapping remains source-owned. Static locale modules register resources, not the selected global locale. Source custom `ca/lt/lv/sl` JSON loaders are retained; normalize their module `default` export to the actual localization object. Copy/freeze the table's string data without altering labels or blank translations.                                                                                                              |
| `loadRequestCulture`                                                                                                                                                        | Accepted standalone `loadRequestI18n` in `standalone/server.ts` and `catalogs.ts`                                                       | Load real selected+English fallback messages through the accepted loader alongside source culture resources. Retain all 36 readonly catalogs, raw engine locale, ICU/namespace/rich/error behavior and optional formats/error handlers. Capture selection before awaiting, copy an optional supplied `now` Date, and retain optional supplied timeZone. No default clock/zone or alternative engine is created.                                                                                                                                                                                                                                                           |
| `createCultureResourceStore`                                                                                                                                                | Source global DayJsLoader in `translation/src/dayjs.ts`; MRT per-locale loading in `ui/src/hooks/use-translated-mantine-react-table.ts` | Replace only resource lifecycle: owner-created store, `idle/loading/ready/failed`, monotonic revisions, stale completion results, explicit invalidation and explicit caller-driven retry. Default loader is the real `loadRequestCulture`; an exact typed loader port permits controlled import-failure evidence. No timers, global selected locale, provider mutation, navigation, query invalidation or success callback is hidden inside the store.                                                                                                                                                                                                                    |
| `formatLocalizedDate/Time/DateTime/CompactNumber`                                                                                                                           | Actual `widgets/src/common/locale.ts` algorithms; common leaf `common/src/date.ts::toValidDate`                                         | Adapt source widget formatting, reuse common validity conversion rather than copy it. Invalid dates return `?` (or supplied fallback); exact `YYYY-MM-DD` is parsed as UTC midnight and uses UTC when no **value-option** zone was supplied. An explicit zone still overrides that for date-only inputs, as source allows. Timestamps use the supplied option zone, otherwise the environment; no guessed zone. Preserve hour numeric, minute two-digit, optional seconds false by default, optional hour12, medium/short dateTime and native compact notation. Invalid Intl options/zones still throw. This does not impose `?` on widgets whose source fallback is `—`. |
| `resolveCulturePreferences`                                                                                                                                                 | `settings/src/creator.ts`; public `validation/src/user.ts` values                                                                       | User firstDayOfWeek is one of 0–6, guest/default is Monday `1`; user byteUnitSystem is binary/decimal, guest/default is the existing `defaultByteUnitSystem` (`decimal`). No preference is inferred from locale. Accept caller-supplied value projection, not a DB/API implementation or new persistence schema.                                                                                                                                                                                                                                                                                                                                                          |
| `createCultureFormatter` byte methods; exported `formatSiNumber`, `formatBytes`, `formatBytesPair`, `formatByteRate`, `formatBitRate`, `metricToImperial`, `formatDuration` | Actual pure common leaves `common/src/number.ts`, `common/src/date.ts`; `settings/src/byte-format.ts`                                   | Reuse—not copy—the existing algorithms. SI numbers retain powers/suffixes/toFixed behavior; decimal/binary bytes retain base 1000/1024, one-decimal promotion/rounding, shared pair units, nonfinite/nonpositive sanitization and `/s`; bit rate stays decimal SI with bounded/truncated requested fractional digits and omitted trailing zeros. Metric conversion remains divisor 1.609344; duration remains source floor/minute/hour layout. Capture preferences per formatter, not a settings/global locale lookup.                                                                                                                                                    |
| `dayjs`, `timeAgo`, `fromNow`, `toNow`                                                                                                                                      | Source Day.js consumers and `common/src/hooks.ts`; clock `world-clock.ts::dayjs(now).tz(city.timeZone)`                                 | Create instances with the source loaded locale **name**, never call global locale selection. `timeAgo` retains `dayjs(now).to(timestamp)` orientation. Other relative methods replace ambient fromNow/toNow clock reads with explicit `CultureClock.now()`. Optional `dayjs(value, timeZone)` applies `.tz` to that instance; otherwise preserve source environment behavior. Snapshot timeZone governs the accepted ICU formatter, while native date/Day.js value methods take their own explicit widget/value zones; no new snapshot-to-widget override is invented.                                                                                                    |
| `observeTimeAgo`, `getIntegrationConnectionState`                                                                                                                           | `common/src/hooks.ts::useTimeAgo/useIntegrationConnected`                                                                               | Adapt actual value/refresh algorithms to injected scheduler/publish/clock ports: immediate value, 1000ms default interval, recomputation using current explicit clock, and cleanup. Connection state retains absolute millisecond difference, `<30000` default boundary and `timeout-abs(diff)` delay. This is a value projection, not a fake backend reachability check. No React hook/browser lifecycle is mounted.                                                                                                                                                                                                                                                     |

## Typed candidate joins

Public candidate entrypoint: `packages/translation/src/runtime/index.ts`.

- `LocaleRequestResources`: parsed preference store `get("homarr.locale"): string | undefined` and `readDefaultLocale(): Promise<string>`. The real settings/persistence owners supply the read; this worker writes no SQL or duplicate user repository.
- `resolveRequestLocale(resources, explicitLocale?)`: explicit input is a **decoded, already-extracted legacy path segment**, not an arbitrary encoded pathname or a new header/query negotiation policy. The source installed middleware performs `decodeURI`/pathname sanitation before prefix matching; host routing must retain that preprocessing, malformed-path handling and source proxy API/static/asset/onboarding/login exclusions. This resolver intentionally does not double-decode cookie/segment values, normalize cookie case or trim unsupported data. Synthetic `%66r` supplied directly as a store/segment value therefore remains unsupported; that is not a claim that a source URL `/%66r` fails after routing decoding.
- `ResolvedLocale`: catalog key, separate Intl locale, direction, source, default and observed cookie. No current user identity/auth/session field.
- `LocaleCookieEffect`: typed cookie name/value and maxAge/Lax/path options. The host must map it to accepted `RequestContext.effect`/its cookie serialization, preserving append/multiple Set-Cookie behavior and response failure handling. `createLocaleCookieEffect` prepares a guest preference write; `syncLocalePreference` implements source request synchronization. Neither authorizes a settings endpoint or selects browser persistence/commit order.
- `CultureSnapshotOptions`: the accepted request-I18n options minus locale; an options object is required, **now/timeZone remain optional**. When supplied they are explicit. Absent values remain absent; no server/client hydration guarantee is inferred. The host decides serialization/restoration, output-affecting cache identity and any still-unaccepted time basis.
- `LocaleResources`: source-derived Day.js locale name and readonly table localization. Resource maps/plugins are static; per-request selection/translator/store/clock is not shared. `RequestCulture` contains those plus the accepted request translator/snapshot and captured locale identity.
- `CultureLoadState`/`CultureLoadResult`: discriminated owner-local lifecycle. Stale loads cannot overwrite current ready/failed/idle state; errors are exposed as `unknown`; retry requires another explicit `load`. A custom loader is a precise resource-loading port, not an approved frontend locale switch callback.
- `CulturePreferences`: exact source week/byte values. A caller can adapt the identity worker's existing preference API values, but this module does not persist changes or authorize them. Locale persistence remains separate from those user preferences.
- `CultureClock.now()` and `RelativeRefreshScheduler<Handle>` are explicit value/timer ports; `observeTimeAgo` uses the real formatter's `timeAgo` and a publish sink. Browser ownership/unmount and changing the observed timestamp require the frontend host to dispose/recreate the observation. The candidate fences callbacks after disposal and clears once.

## Necessary bounded behavior changes

1. **Required concurrency repair:** source module-global selected Day.js locale and global promise/loading/previousLocale are not reproduced. Resources register statically; instances select their locale; owner-local generation state replaces swallowed import failures. This changes loader-failure visibility and prevents late resource completion from reverting a newer selection. It does not define navigation or draft-loss behavior.
2. **Transport/module-shape repair:** custom MRT JSON imports are unwrapped from `default`; existing actual labels, including blanks, are unchanged. No English MRT fallback or replacement table library is introduced.
3. **Required clock/lifecycle adaptation:** ambient relative clock and browser timers become explicit ports. A disposed observation cannot publish from an already-delivered callback. Intl environment defaults remain source behavior when the caller omits a value zone; no default UTC/local policy was invented for timestamps.
4. Selection/preference/optional-now data is captured per load/formatter; table data is copied/frozen. The accepted message loader still owns immutable catalogs. No attempt was made to redesign mutable host formats, browser hooks or Day.js third-party plugins; composition must not import source global locale mutators into the request graph.

## Files and exact validation

All nine new source/check files are in `packages/translation/src/runtime/`:

- `locale.ts`
- `resources.ts`
- `date.ts`
- `culture.ts`
- `relative-refresh.ts`
- `index.ts`
- `runtime.test.ts`
- `bunfig.check.toml`
- `tsconfig.check.json`

Installed/declared resources verified before use: Day.js **1.11.21**, deepmerge **4.3.1**, `mantine-react-table` alias → `mantine-react-table-open` **9.0.3**, accepted standalone use-intl **4.13.1**. Existing common/definitions dependencies are reused. Tool versions: Bun **1.4.2**, TypeScript **7.0.2**, oxlint **1.73.0**. Source/installed README and exact Day.js relative/UTC/timezone declaration/implementation and Next-intl routing/prefix/cookie implementation were inspected. Context7 quota exhaustion was already recorded; no quota/network fallback or installation was attempted. Node tooling runtime was **24.16.0**, below repository target >=24.18.0; application-runtime acceptance is not claimed.

From `packages/translation/src/runtime/`:

```sh
bun test --no-env-file --no-install --config ./bunfig.check.toml ./runtime.test.ts
```

**3 focused critical-flow tests passed, 0 failed**, using real readonly catalog/resource imports:

- Precedence, case-sensitive cookie vs case-insensitive decoded explicit segment, unsupported values, configuration error propagation, source-default no-write and guest Lax/base-path/root cookie effects.
- Cold concurrent actual `fr/he/cn/cr/no/de-CH/ca/zh` catalogs/Day.js/MRT resources; actual French save text and preserved Crowdin markers; all special Day.js aliases and separate Intl identities; Hebrew direction metadata; custom JSON normalization; instance locale/zones without changing selected global locale; concurrent stale completion, explicit invalidation, and one injected import failure followed by explicit caller retry through the real loader. That injected failure is synthetic—not a claim that a real resource currently fails. Empty options leave now/timeZone absent.
- Invalid-date fallback, UTC date-only versus explicitly zoned day, timestamp hour12/seconds, source decimal/binary/pair/bit rounding, independent week preference, current-clock relative refresh, one-time cleanup and post-disposal publish fence, connection timeout equality boundary.

From repository root:

```sh
node node_modules/typescript/bin/tsc --project packages/translation/src/runtime/tsconfig.check.json
node node_modules/oxlint/bin/oxlint packages/translation/src/runtime
```

Scoped typecheck **exit 0**; scoped lint **exit 0, no warnings**. No full-repository suite/typecheck, browser or exhaustive locale/unit matrix ran. Typecheck follows the reused readonly source dependencies, with strict/noUncheckedIndexedAccess, skipLibCheck and no emit/cache output. All Bun executions used `--no-env-file`, `--no-install` and the explicit owned config.

Initial fixture expectation incorrectly assumed French save was `Enregistrer`; the actual source catalog is `Sauvegarder`, and the fixture was corrected without changing catalogs. Initial MRT union narrowing and one function-scoping lint warning were corrected in owned files. These were validation fixes, not claimed test-first security evidence or altered resource fallback.

Read-only in-memory esbuild graph inspection (`write:false`, no output files) of the runtime entrypoint found **212 inputs**, all **36** actual catalog files, reused accepted standalone loader and the common date/number leaves, and **zero** legacy Next/Next-intl/auth/db/core/common-barrel/global-DayJsLoader inputs. This verifies the inspected source graph, not a production browser build or payload/performance guarantee. Source locale configuration/languages/catalogs/MRT resources/old DayJsLoader/mapping/root index/common leaves had no tracked diff. COMPOSITION changed the translation manifest/standalone declarations concurrently; this worker did not edit or discard that work.

## COMPOSITION needs and stop lines

COMPOSITION has now declared the accepted package export; its manifest is frozen and was not edited by this owner:

```json
{
  "./runtime": "./src/runtime/index.ts"
}
```

No new installed library is needed. The accepted standalone exports/use-intl dependency now appear in the concurrently updated translation manifest and remain untouched here.

**Pure common-leaf export join completed mechanically:** accepted domain manifest v2 declares `@homarr/common/number → ./src/number.ts` and `@homarr/common/date → ./src/date.ts`. This owner replaced exactly four relative cross-package declarations in `culture.ts`/`date.ts`/`index.ts` with those public ports, avoiding the common root barrel that also executes Stopwatch's English locale update and React hooks. No common source, manifest or helper was duplicated/edited. The date leaf still statically registers isBetween; its ambient-clock `isDateWithin` helper is not invoked. Detailed cleanup evidence follows.

Remaining host joins: parsed request cookie/decoded supported-prefix/configured default; source route exclusion and canonical navigation behavior; accepted cookie-effect encoding/commit handling; preference authorization/API/real persistence; correct HTML lang/dir and Mantine direction/context bootstrap; optional snapshot clock/zone hydration/cache agreement; table Query preload/reload; frontend resource/provider commit; navigation/query/hash/history/cross-tab and dirty editor/modal/form semantics; Crowdin script delivery; all actual widget consumers. No fake browser switching callback was mounted and no undocumented reload/draft-loss condition was selected.

These ports do **not** prove full browser switching, RTL/layout parity, all 36 table translations, global app/widget format consistency, real authenticated preference persistence, SQLite backup restoration or #06/#07 completion. They preserve the bounded actual source behaviors and expose the remaining joins without selecting auth/JWT/a session engine.

## Accepted public-port mechanical cleanup and renewed freeze

Behavior review `ses_ed8b2860fffeLhovFib2AtrFEs` and standards review passed before this cleanup. Domain manifest v2 review `ses_ed8ae7ec6ffe8NmVoNYNnNePfk` accepted the public declarations and unchanged leaf bytes. This step changes only the following four module specifiers, plus this report; runtime behavior, signatures, names, formats, defaults, clocks and resources are unchanged. No tests were added or edited. **Freeze these three producer files again for narrow read-only review and coordinator-curated commit; no public host mounting is performed here.**

| File / exact declaration                                                                             | Old module edge              | New module edge         |
| ---------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------- |
| `packages/translation/src/runtime/index.ts:31`, value reexport `formatDuration`                      | `../../../common/src/date`   | `@homarr/common/date`   |
| `packages/translation/src/runtime/date.ts:1`, value import `toValidDate`                             | `../../../common/src/date`   | `@homarr/common/date`   |
| `packages/translation/src/runtime/culture.ts:7–15`, existing seven value imports                     | `../../../common/src/number` | `@homarr/common/number` |
| `packages/translation/src/runtime/culture.ts:16`, type import `ByteUnitSystem, FormatBitRateOptions` | `../../../common/src/number` | `@homarr/common/number` |

SHA-256 source hashes before → after:

```text
packages/translation/src/runtime/index.ts
7085d4565e6a6ee599790b7ee5f34b1fbf30d4425abb1eb54c72a6792d74cfb4
72332512fedc477666ea36e2d42c79472795db555ffe362a6a15e2013ee7b909

packages/translation/src/runtime/date.ts
a775588a7f8f24a7226b21b8cc2acf473f15786fa533191652418083220ea6fc
f35ef1df5fcad942a710da3ede810da0a53fda7404eb1fd8bca7d242b24af480

packages/translation/src/runtime/culture.ts
fd87b5c55950d12d5da64d02c7cad40c4900df110616f53bca0bece618b9ae6b
78d12bc183f3af07f5dcc5637bc9ddd9b65f4c36bd3ac95bde07aecfa178387e
```

Reversing only the approved specifier substitutions in memory reproduces each recorded pre-edit hash exactly, proving no additional producer-byte change. Public resolver targets are the same physical source files as the old relative edges, and both leaf hashes also match `git show HEAD:<path>`:

```text
@homarr/common/date → packages/common/src/date.ts
f320ceba5b2a2ca99d785ca4fdff0df5f1b601a91970472180c85598662f3471

@homarr/common/number → packages/common/src/number.ts
5410ff2375b6bf7ac106322646b46979a3d133f5215e11f947e265e7943e595d
```

Unchanged third-party resource adapter and existing test hashes:

```text
packages/translation/src/runtime/resources.ts
65db92c434b632c427a951defe641b5bc7f8a327d873c97cc41a67f478e7836f

packages/translation/src/runtime/runtime.test.ts
e2c2eb9eee8f2ca9ddbb57ed1e154d214dacfa12fd47fa754d98b7a833c3482b
```

Scoped checks rerun:

```sh
# Working directory: packages/translation/src/runtime
bun test --no-env-file --no-install --config ./bunfig.check.toml ./runtime.test.ts

# Working directory: repository root
node node_modules/typescript/bin/tsc --project packages/translation/src/runtime/tsconfig.check.json
node node_modules/oxlint/bin/oxlint packages/translation/src/runtime/index.ts packages/translation/src/runtime/date.ts packages/translation/src/runtime/culture.ts
node node_modules/oxfmt/bin/oxfmt --check packages/translation/src/runtime/index.ts packages/translation/src/runtime/date.ts packages/translation/src/runtime/culture.ts
```

Results: **existing three culture checks passed / zero failures; typecheck exit 0; three-file lint exit 0 without warnings; three-file formatting check exit 0**. Third-party compatibility scope is unchanged: the existing cold/concurrent real Day.js/MRT/catalog flow, aliases/custom JSON, and controlled resource-failure/stale-load checks ran unchanged. No new version, dependency, table map, provider or full-locale compatibility claim was introduced.

Actual esbuild public-entrypoint browser resolution used `entryPoints:["@homarr/translation/runtime"]`, `platform:"browser"`, `format:"esm"`, `bundle:true`, `metafile:true`, `write:false`. Its metadata resolves all three emitted value edges to the exact Common targets above; the fourth type-only edge is erased at runtime and validated by scoped TypeScript resolution. The public translation path resolves to `packages/translation/src/runtime/index.ts`. The browser graph has **211 inputs, all 36 actual catalogs, zero legacy Next/Next-intl/auth/db/core/env/common-root/global-DayJsLoader inputs**. Its input count is browser-specific, not a change to the previous 212-input Node graph.

A second in-memory browser build used an esbuild `onLoad` hook to reverse only these four specifiers to their old relative paths. Browser output bytes were **identical** to the public-import build; output SHA-256 is `2443dd1937c1443c17c14f0e243bd664252889314063fb66887ec914542ab478`. Neither build wrote a bundle, metadata, config or generated fixture file. This is resolution/output equivalence evidence, not browser execution, hydration or host integration proof.

Manifests/lock/dependencies, standalone/catalog/config/client source and frozen auth remain untouched by this owner. The disclosed Common date plugin-registration side effect is unchanged; no ambient `isDateWithin` invocation was added. Q16 and all browser SSR/RTL/draft/preference/persistence joins remain pending; #06/#07 are not closed.
