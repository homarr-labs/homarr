# Localization source-preserving preparation

2026-10-10. Prepared, validated and **unmounted**. This consumes the approved twelve-lane allocation and updated 1:1 preservation direction in `DESIGN.md`/`EXECUTION.md`; it does not complete #05/#06/#07 or satisfy #01's native predecessor. Q11–Q15 are resolved, not blockers for this preparation.

## Owned changes

- `packages/translation/src/client/index.ts`: preserves existing `useI18n`, `useI18nMessages`, `useCurrentLocale`, `useCurrentIntlLocale`, `useChangeLocale` names and types through real standalone hooks; no legacy Next hook reexports. Adds provider/formatter/now/timezone exports and provider/snapshot types for composition.
- `packages/translation/src/standalone/catalogs.ts`: static lazy import map for all 36 unchanged catalog files, supported-key validation, existing recursive blank removal and English→selected deepmerge; results are deeply frozen. No mutable current locale, translator cache, global request context, catalog repair or ICU preprocessing.
- `packages/translation/src/standalone/types.ts`: `use-intl.AppConfig` augmentation from actual English JSON and existing supported locales; actual-object key/namespace/function/callback types and explicit snapshot/error/options types. Type-only library/JSON imports keep this helper/type entry free of React/Next runtime imports.
- `packages/translation/src/standalone/server.ts`: explicit translator/formatter/request factories and explicit async catalog loading; no Next server/config/request imports, cookie access, database/env initialization or implicit request resolution.
- `packages/translation/src/standalone/client.tsx`: standalone provider and hooks, reusing the existing `getIntlLocale` mapping. Only `IntlProvider` stores locale/messages/formatting state. A narrow separate context holds the injected change-locale callback only; it is not another snapshot, SSR host context or current-locale store.
- `packages/translation/src/standalone/index.ts`: subsystem-local core/server/catalog/type exports. It deliberately does not aggregate the React client entry.
- `packages/translation/src/standalone/i18n.spec.tsx`: two narrowly approved real-catalog rich/plural and concurrent explicit request/provider regressions, introduced red→green. No speculative test matrix or broad suite.
- `packages/translation/src/standalone/compatibility-check.ts`: source-facade checks for conditional error behavior, unchanged malformed source, fallback/whitespace/Crowdin, all 36 loads and explicit-fixture formatting.
- `packages/translation/src/standalone/compatibility-types.ts`: compile assertions for known/unknown actual-object keys/namespaces and existing root/scoped client/legacy function-type compatibility.
- `packages/translation/src/standalone/{tsconfig.json,vitest.config.mts}`: isolated no-emit typecheck and Node-only two-test config. Vite `envDir:false`, disabled results cache and native config loading avoid `.env` loading/root setups/temporary root config output. Any configured Vite cache remains inside the owned standalone directory.

No other translation source, catalogs, package manifests, declared package exports, lockfile, app source, shared provider registrations, migration indexes or rosters were written. No staging/commits/installs/worktrees/branches/nested agents, browser/container/listener operations, `.env`/real data or paid calls. Previous scratch spike evidence remains read-only.

## Exact candidate contracts and exports

```ts
type TranslationSnapshot = {
  readonly locale: SupportedLanguage;
  readonly messages: TranslationObject;
  readonly now?: Date;
  readonly timeZone?: string;
  readonly formats?: Formats | null;
};

type I18nErrorHandlers = {
  onError?: (error: IntlError) => void;
  getMessageFallback?: (info: {
    error: IntlError;
    key: string;
    namespace?: string;
  }) => string;
};

type LocaleChange = (locale: SupportedLanguage) => void | Promise<void>;
```

Actual declarations use public `IntlConfig` types, not independently redefined substitutes. The snapshot is an explicit caller-owned input, not a new serialization/cache/bootstrap protocol. Dates/formats supplied to `createRequestI18n` remain the caller's objects; catalog-loader outputs are immutable. The host must accept ownership and hydration serialization before registration.

### Core/catalog/server entry

- `loadMessages(locale: SupportedLanguage): Promise<TranslationObject>`; `isLocaleSupported(locale: string)` type guard.
- `createI18n<Namespace>(snapshot, namespace?, handlers?)`: root/scoped standalone translator, including `rich`, `markup`, `raw`, `has`. No adapter injects interpolation values, strips methods or sanitizes catalog text.
- `createI18nFormatter(snapshot, handlers?)`: independent standalone formatter; `formats:null` means absent formats, matching library initialization. No timezone/clock/locale default is introduced.
- `createRequestI18n(snapshot, handlers?)` returns `{snapshot, getI18n(namespace?), getI18nMessages(), getFormatter()}`. Each translator/formatter factory uses the engine's independent default caches; no module-global request object exists.
- `loadRequestI18n(options)` accepts explicit `{locale?: string, now?, timeZone?, formats?, onError?, getMessageFallback?}`, preserves existing unsupported/absent catalog fallback to `en`, loads messages and returns the same request interface. This is catalog validity fallback, not URL/cookie/session precedence.
- Exports `TranslationObject`, `TranslationKeys`, `TranslationNamespace`, `TranslationFunction`, `ScopedTranslationFunction`, `stringOrTranslation`, `TranslationSnapshot`, `RequestI18nOptions`, `I18nErrorHandlers`, `translateIfNecessary`.

### React entry and existing `/client`

- `I18nProvider({snapshot, children, onChangeLocale?, onError?, getMessageFallback?})` wraps the real standalone `IntlProvider`. Error callbacks are explicit nonserialized props.
- Existing `useI18n`, `useI18nMessages`, `useCurrentLocale`, `useCurrentIntlLocale`, `useChangeLocale` remain callable with existing signatures. Root/scoped `useI18n` generics and actual English keys remain typed; compile assertions include the unchanged legacy `src/type.ts` aliases.
- Adds raw standalone `IntlProvider`, `useFormatter`, `useNow`, `useTimeZone`, and `I18nProviderProps`, `LocaleChange`, `TranslationSnapshot` types.
- `useChangeLocale()` retains `{changeLocale(newLocale), isPending}`, same-locale no-op and React transition semantics. A different locale requires the explicitly injected callback; absent host wiring raises `Locale switching requires an explicit host adapter` rather than becoming a silent no-op or inventing routing/cookie behavior. Async callbacks may participate in React's pending transition. The host owns actual routing/resource persistence/draft coordination.

## Preserved source semantics

- All 36 catalog identities are statically enumerated and compile-checked against existing `SupportedLanguage`: `ca, cn, cr, cs, da, de, de-CH, en-gb, en, el, es, et, fi, fr, he, hr, hu, it, ja, ko, lt, lv, nl, no, pl, pt, pt-br, ro, ru, sk, sl, sv, tr, zh, uk, vi`.
- Existing blank removal, selected nonblank whitespace, English interpolation/plural fallback, nonblank extra keys and Crowdin strings are unchanged. The prior read-only inventory remains 165485 raw leaves, 5360 English-key blank fallbacks, 141 nonblank whitespace leaves and 140 retained nonblank extras; existing removal of 105 blank extra leaves with no English counterpart is preserved, not reclassified as a new policy.
- All 28 pre-existing ICU parse problems remain untouched. Conditional compatibility checks confirm a real French `<unk>` source remains raw in messages and explicit `{}` reports `INVALID_MESSAGE`/key fallback; no automatic English fallback or source rewrite is added.
- Exact pinned engine behavior is retained: omitted interpolation values return the raw ICU string in production but error/key fallback in development; explicit `{}` forces parsing/error handling in both. Missing-key/`has` and helper-callback behavior also pass through.
- Existing `getIntlLocale` is reused, not copied: raw catalog/message-engine/provider locale remains the stored identity; `useCurrentIntlLocale` retains cn→zh-CN, cr→en, zh→zh-TW. Standalone `useFormatter` retains the raw provider locale semantics of the existing next-intl formatter. No normalized message-engine locale is chosen.
- Direction metadata is untouched. No document/Mantine direction defaults, human locale negotiation, cookie defaults, URL prefixes, clock freshness, timezone, draft-switch or Crowdin script behavior is added. Approved atomic-draft behavior belongs to the host/domain owners, not this facade.
- `now`/`timeZone` are optional because the source request config did not define them; no UTC default is added. All executed regression/formatting cases explicitly provide UTC and fixed time. COMPOSITION must preserve the existing render/time basis in its accepted snapshot rather than treat fixtures as product defaults.

## Dependency and export handoff — COMPOSITION only

Verified installed **use-intl 4.13.1**, **next-intl 4.13.1**, React/React DOM **19.2.7**, deepmerge **4.3.1**, Vitest **4.1.10**, TypeScript **7.0.2** before coding. React/React DOM/deepmerge and root test tooling were already declared; use-intl is presently transitive through next-intl (`^4.13.1`). COMPOSITION must add explicit direct **use-intl@4.13.1** to the translation package/catalog/lock. No install or manifest change was attempted by this lane.

Suggested exact package export declarations for review (not yet written):

| Package subpath         | Source                         |
| ----------------------- | ------------------------------ |
| `./standalone`          | `./src/standalone/index.ts`    |
| `./standalone/client`   | `./src/standalone/client.tsx`  |
| `./standalone/server`   | `./src/standalone/server.ts`   |
| `./standalone/catalogs` | `./src/standalone/catalogs.ts` |
| `./standalone/types`    | `./src/standalone/types.ts`    |

The existing `./client` declaration already points at its modified facade. Root `/server`, `/request`, `/middleware`, `/dayjs`, old individual client hook files and root `TranslationKeys` mapping remain outside this allocation: the target must use accepted standalone entrypoints, not assume those legacy paths were ported. COMPOSITION must repoint/declare accepted roots and correctly export the new actual-object `TranslationKeys`; the old mapping's import-function-derived type has not been edited. No new subpath is claimed available until declared/accepted.

Host provider placement, same snapshot server/browser delivery, one-time locale adapter registration and feature/server call migrations require accepted COMPOSITION contracts. This preparation does not mount a host, register routes or supply a second SSR/bootstrap implementation.

## Checks and evidence

Current primary [standalone/core](https://next-intl.dev/docs/environments/core-library) and [TypeScript augmentation](https://next-intl.dev/docs/workflows/typescript) documentation was read alongside exact installed public declarations/source (`use-intl/dist/types/{core,react}`, development factories/provider and production/development `format-message` implementations). The known exhausted Context7 quota was not queried again. Vitest cache/env behavior was checked against installed Vitest/Vite types; source config disables env loading explicitly. No newer unverified SDK API is used.

Pinned Node executable is `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`; `--version` returned **v24.18.0**. Commands from repository root:

```sh
/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node node_modules/vitest/vitest.mjs run --config packages/translation/src/standalone/vitest.config.mts --configLoader native
/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node node_modules/typescript/bin/tsc --project packages/translation/src/standalone/tsconfig.json --noEmit
./node_modules/.bin/oxlint packages/translation/src/standalone packages/translation/src/client/index.ts
bun --no-env-file run packages/translation/src/standalone/compatibility-check.ts
bun --no-env-file --conditions=development packages/translation/src/standalone/compatibility-check.ts --development-contract
```

- The first real rich/plural regression failed on the missing server facade, then passed after its implementation. The second failed on the missing standalone provider, then passed after client/provider preparation. A preliminary TSX runner-config failure was corrected by the local `react-jsx` tsconfig; it was not a product regression.
- Final focused Node acceptance: **1 test file / 2 tests passed**; real English rich links and exact zero/one/other strings; overlapping English/Hebrew translator calls before/after a barrier and separate provider HTML through the preserved client facade. No global locale or Next host is involved.
- Scoped typecheck and lint: exit **0**, including the existing root/scoped function-type compatibility assertions. No full package/repo typecheck or broad suite ran.
- Both conditional compatibility commands: exit **0**, **36** catalog loads, preserved malformed entry, explicit UTC fixture and `sourceFacadeChecks: passed`. Production reports `{count, number} characters`; development reports `customWidget.editor.status.characters` for omitted arguments. French formatting literals, fallback English plural, whitespace and Crowdin markers pass.
- A separate read-only pinned-Node SHA256 comparison against every unit in the previous spike's `results-production.json` passed: **all 36 catalog hashes unchanged**. No old evidence was regenerated or overwritten.
- Bun is **1.4.2** and its Node compatibility identifier is not the pinned Node runtime. Conditional-export checks are Bun evidence; the focused Vitest/typecheck commands above are actual pinned-Node acceptance. Every Bun command in this preparation includes `--no-env-file`.

## Remaining acceptance

Unmounted code is not 1:1 whole-application completion. Browser production catalog chunk inclusion, bundle graph exclusions, real public-route SSR/hydration, error callback serialization/placement, request/cache snapshot lifetime, locale navigation/cookie/default handling, pending/error/retry/resource-switch ordering, draft preservation, RTL/document direction, MRT/Day.js, clock/date-only/culture behavior and Crowdin DOM/script behavior remain for the assigned owners and integrated acceptance. Static catalog imports make bundle inclusion inspectable but do not replace a production browser build/hydration check.

No missing predecessor or unverified integration is marked complete, and no failed old translation is hidden behind a newly invented policy.
