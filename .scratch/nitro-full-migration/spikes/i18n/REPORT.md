# Standalone use-intl compatibility spike

2026-10-10. This is the independent Phase A investigation authorized in `EXECUTION.md`, not implementation or completion of #05/#06/#07 and not #01 acceptance.

## Outcome

Installed standalone `use-intl@4.13.1` loads the preserved nested catalogs, creates explicit translators/formatters, and renders React hooks through `IntlProvider` without any Next server/request/config imports. Both production and development probes pass their explicit assertions. **28 existing source strings fail ICU parsing; they are reported, not rewritten or silently English-fallbacked.** Browser hydration, Vite catalog inclusion and actual application routes are not verified.

Only this directory was written. No package/app/catalog/manifests/lockfile/roster/index changes, installs, staging, commits, new worktrees, nested agents, browser/container operations, `.env` reads, real appdata or paid calls. Other workers' concurrent changes are not this lane's work.

## Exact dependencies and primary evidence

- `packages/translation/package.json` directly declares `next-intl` via the root catalog at **4.13.1**, but does not declare `use-intl`. Installed `node_modules/next-intl/package.json` declares `use-intl: ^4.13.1`; resolved `node_modules/use-intl/package.json` is **4.13.1**, git head `976ca1f83a6e06b5646865b87c4fb461cbf84374`.
- Verified installed React/React DOM **19.2.7**, `intl-messageformat` **11.1.1**, its `@formatjs/icu-messageformat-parser` **3.5.0**, deepmerge **4.3.1**, TypeScript **7.0.2**, oxlint **1.73.0**, Bun **1.4.2**. `process.version` inside Bun is its Node-compatibility identifier **v26.3.0**, not a claim that a Node v26 executable ran. The separate dependency-resolution shell used Node **v24.16.0**.
- Before coding, read the workspace manifests/exports and verified dependency resolution from the translation workspace. Export-restricted `require.resolve('next-intl/package.json')` failed; resolving its entry then walking to the installed manifest established presence/version instead. No install was needed for the disposable probe.
- Fresh Context7 resolution returned `Monthly quota reached`. Used current official [standalone core library](https://next-intl.dev/docs/environments/core-library), [translations](https://next-intl.dev/docs/usage/translations), [configuration/error handling](https://next-intl.dev/docs/usage/configuration), and exact installed source rather than unverified memory.
- Installed API evidence: `node_modules/use-intl/dist/types/core/{index,createTranslator,createFormatter,MessageKeys}.d.ts`; `dist/types/react/IntlProvider.d.ts`; `dist/esm/development/{core,react}.js`; `dist/esm/development/initializeConfig-CUsOI8u2.js`; production/development `dist/esm/*/format-message/index.js`; `node_modules/intl-messageformat/src/core.d.ts`; parser `types.d.ts`.
- Core public exports are `createTranslator`, `createFormatter`, message/key/namespace types. Translator supports root/scoped invocation, `rich`, `markup`, `raw`, `has`. React public exports include `IntlProvider`, `useTranslations`, `useMessages`, `useLocale`, `useFormatter`, `useNow`, `useTimeZone`. Provider requires explicit locale and accepts messages/timeZone/now/formats/onError/getMessageFallback; it does not acquire Next request configuration. Core factories allocate their own caches by default; this probe never passes private shared-cache overrides.

## Files and reproducible checks

All commands run from the repository root, with only existing binaries:

```sh
./node_modules/.bin/tsc --project .scratch/nitro-full-migration/spikes/i18n/tsconfig.json --noEmit
./node_modules/.bin/oxlint --no-ignore .scratch/nitro-full-migration/spikes/i18n/catalogs.ts .scratch/nitro-full-migration/spikes/i18n/type-contract.ts .scratch/nitro-full-migration/spikes/i18n/probe.tsx
bun run .scratch/nitro-full-migration/spikes/i18n/probe.tsx
bun --conditions=development .scratch/nitro-full-migration/spikes/i18n/probe.tsx --development-contract
```

- `catalogs.ts`: filesystem-only discovery/validated immutable nested loading; recursive blank removal; installed deepmerge English→selected. Imports only the existing dependency-free `languages.ts`, not the translation barrel or Next request module. This loader is a spike, not a browser import manifest.
- `type-contract.ts`: candidate root/scoped function types and `string | ((t) => string)` derived from the actual English JSON object and public `use-intl/core` types. Compile assertions accept known keys/namespaces and exclude unknown ones. No global module augmentation was introduced.
- `probe.tsx`: actual standalone calls, complete read-only parser inventory, dynamic-message/rich rendering sweep, error and plural/formatting probes, concurrent explicit request closures. Dynamic discovery calls intentionally use reflective invocation; the main translator's English-shape assertion is supported by the exhaustive English-key/value fallback verification, not by an ICU argument generator.
- `tsconfig.json`: nonincremental no-emit typecheck scoped to the harness and its minimal imported data/types.
- `results-production.json` / `results-development.json`: generated full per-locale units, raw source SHA256 hashes, exact malformed keys/source strings, runtime error outcomes, rendered rich HTML, formatting outputs and isolated request outputs. Engine entry paths confirm the intended conditional export was selected.

Final scoped typecheck and lint exit **0**; both probe commands exit **0** with `catalogs: 36`, `rawLeaves: 165485`, `failures: 28`, `catalogHashesUnchanged: true`. No broad tests/repository typecheck were run. Earlier scratch iterations caught and fixed incorrect relative paths/type inference and an initially overstrict production error expectation; these were not application changes.

## Actual full-catalog units

Exact discovery equals the existing supported-language list: `ca, cn, cr, cs, da, de, de-CH, en-gb, en, el, es, et, fi, fr, he, hr, hu, it, ja, ko, lt, lv, nl, no, pl, pt, pt-br, ro, ru, sk, sl, sv, tr, zh, uk, vi`.

- English: **4590** raw string leaves; each other catalog: **4597**. Total **165485**, with no nonstring leaf admitted. Every raw leaf is submitted to the installed ICU parser, including blanks and Crowdin markers; **165457** parse successfully.
- **5465** blank source leaves; **5360** English-key blanks fall back to the exact English string. For every English key in every catalog, effective output equals the nonblank selected string verbatim or English; every nonblank selected leaf remains equal. **141** nonblank leading/trailing-whitespace leaves retain whitespace.
- Every non-English raw catalog has the same **seven** additional `board.snapshot.*` keys: **245** extra raw leaves. **140** are nonblank and survive merging. **105** are blank with no English equivalent and are omitted by the existing blank-removal algorithm. Effective merged total is **165380**. This is a real distinction between conserving the raw catalog and claiming every raw key exists in effective messages; it must not be concealed or repaired automatically.
- `cr` remains fully loaded with its opaque Crowdin source strings; no translation-ID rewrite or live script activation occurred. Its content does not contain the ordinary rich/plural constructs, so a zero rich/plural count for that catalog is not a failed load.
- All parsable effective dynamic leaves receive AST-derived fixture values: **14729** calls, no formatting errors; **317** actual rich entries rendered using React DOM. Effective inventory has **1731** plural-bearing and **497** number-bearing messages. This exercises one selected branch per dynamic sweep entry, not every branch or production caller's argument shape.
- Source SHA256 hashes of all 36 catalogs are compared again after execution and are unchanged. Full individual units and failure records are in both JSON artifacts.

## Existing malformed strings and exact error behavior

There are **28** parser findings across **18** locales:

| Finding                                                                                                                                                      | Raw units |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------: |
| `customWidget.workbench.builder.pathDescription`: unescaped `{option:name}` / `{param:name}`; `MALFORMED_ARGUMENT` in ca, cn, de-CH, et, hu, lt, sk, sl      |         8 |
| Unclosed `<unk>` in `tips.multiSelectApps` and `item.selection.pasteShortcut` (cs, de, fr, it, pl, ro, ru, sv), plus three Japanese air-quality/weather keys |        19 |
| Korean `board.setting.section.layout.edit.action` with malformed braces; `EXPECT_ARGUMENT_CLOSING_BRACE`                                                     |         1 |

Each is independently invoked with `{}` to force the use-intl parser. Both builds call the request-owned `onError` with `INVALID_MESSAGE` and return its full key by default. The source strings are nonblank, so existing English merge does **not** replace them. A future malformed-message fallback policy remains a hold.

Important observed dev/prod distinction, confirmed in pinned source:

- `t('plain')` for `Hello {name}` returns the raw `Hello {name}` without error in production. Development compiles it and reports `FORMATTING_ERROR`, returning `sample.plain`.
- `t('plain', {})` reports `FORMATTING_ERROR` and returns `sample.plain` in both. All 28 malformed messages likewise pass through raw with no values in production but report `INVALID_MESSAGE` in development; passing `{}` reports the error in both.
- Missing key/namespace calls report `MISSING_MESSAGE` and return `namespace.key`; `has` returns false without reporting. A custom `getMessageFallback` receives key/namespace/error and returns the exact fixture `MISSING_MESSAGE:sample.missing`.
- Plain `t()` supplied React-rich callbacks reports `INVALID_MESSAGE`; `rich` is required. `markup` supports string-returning callbacks; `raw` returns the stored string. Neither raw/markup result is inserted as unsafe HTML by this probe. This does not approve arbitrary catalog-provided URLs or raw HTML.

## Real rendering, plural and locale/format semantics

- English real app-create, group docs, integration status URL, certificate docs, invite bold warning and Assistant reset time messages are rendered as actual React nodes using `renderToStaticMarkup`, not inspected as expected strings. Links are fixture-owned; empty catalog tags receive replacement children. Injected `<unavailable>` reason is escaped, invitation bold survives, reset emits a `<time>` element. Full HTML is recorded.
- A controlled nested/empty rich fixture confirms nested callbacks and escaping `<script>` input. This demonstrates safe React text escaping, not a sanitizer or URL-policy service.
- Cardinal category fixtures for en/ru/pl/he use counts `0, 1, 2, 3, 5, 11, 21, 22, 101, 1.5` and assert equality to `Intl.PluralRules`; explicit `=0` and `=1`, numeric-string coercion, apostrophes and quoted braces are checked. Literal fixture typing correctly rejects string counts for generated numeric arguments; the legacy runtime coercion is probed explicitly through reflective calls.
- Actual `init.studio.board.columnCount` messages for en/fr/ru/pl/he are exercised at zero/one/two/5/11/21/22/fraction and numeric-string `"2"`, compared with the same installed ICU engine. Their wording remains the source wording; e.g. Russian source yields `2 столбцов`. This is compatibility evidence, not approval of linguistic quality or proof that a catalog defines all desired plural categories.
- Actual ICU-number `customWidget.editor.status.characters` agrees with the installed ICU engine. Standalone `createFormatter` number/date/relative-time agrees with native locale-specific Intl for en/fr/ru/pl/he. `12345.67` yields `12,345.67` in en, `12 345,67` in fr and `12 345,67` in ru/pl.
- **Every time/relative probe explicitly supplies fixture UTC and fixture now `2026-10-10T12:00:00.000Z`.** Date fixture is `2026-03-29T00:30:00.000Z`. These fixtures choose neither a product timezone default nor a freshness/DST policy.

## Concurrent request-local evidence

Two async English/Hebrew closures independently load selected immutable messages and create translator/formatter instances before an explicit both-ready barrier. Each makes twelve interleaved calls after awaiting the barrier; before/after remains `2 columns` for en and `2 עמודות` for he. No global current locale, ambient Next request context, mutable Day.js/Zod configuration or shared translator/formatter cache is introduced.

Each closure also renders a separate `IntlProvider` tree with explicit messages/locale/UTC/now. Hooks check locale/messages/timezone/now and render root/scoped rich/plural/number/date/relative outputs with no intl errors. The provider HTML retains its own locale and fixture snapshot. These are overlapping async translator requests with synchronous React static renders, **not** proof of interleaved streaming SSR, browser hydration, client switching or shared HTML-cache behavior.

## Read-only consumer/type findings

- `packages/translation/src/request.ts` owns the current recursive blank filtering and deepmerge; root barrel exports config/type/mapping helpers, `/client` aliases `useTranslations`/`useMessages`, `/server` aliases Next awaitable translations/messages. Public exports also include `/languages`, `/middleware`, `/request`, `/dayjs`. They must have explicit target dispositions, not acquire fake Next server shims.
- `src/type.ts` derives `TranslationObject` from actual English JSON but gets namespace/function types from next-intl/client. `src/mapping.ts` computes `TranslationKeys` from the import **function**, not its resolved object. `type-contract.ts` demonstrates public use-intl key/namespace types derived from `typeof english` and reusable root/scoped function/callback candidates. Current JSON strings remain widened strings; strict generated ICU-argument inference is not an existing contract.
- `apps/nextjs/src/components/navigation/dynamic-breadcrumb.tsx:120–137` uses the flawed `TranslationKeys` plus `t.has` before falling back to raw/dynamic labels. `packages/validation/src/form/i18n.ts:3–15` depends on root/scoped translator types. These are specific adapter consumers, not invitations to port validation/global Zod behavior here.
- `packages/widgets/src/_inputs/widget-app-input.tsx:60` provides the app `here` rich callback; group reserved alert, integration connection/certificate components, invite and `apps/nextjs/src/components/assistant/assistant-runtime-controls.tsx:329` own rich callbacks. `apps/nextjs/src/app/api/assistant/chat/route.ts:464–467` explicitly requests a supported locale and `assistant.unavailable` scoped server translator. No consumer was edited.
- `packages/widgets/src/releases/component.tsx:29` bypasses the facade for next-intl formatter/now hooks. `src/config.ts:441–450` separately maps cn→zh-CN, cr→en, zh→zh-TW and owns direction metadata. Current translation request uses raw catalog identities; this probe likewise does not silently normalize message-engine locale or choose direction policy.

## Minimal #05 contribution requirements

1. **COMPOSITION alone** must declare explicit direct `use-intl@4.13.1` in the translation owner, using an agreed root catalog/pin and lock change. Transitive hoisting is sufficient only for this disposable investigation. React/React DOM/deepmerge are already declared there; ICU parser/messageformat remain engine internals unless a retained validator is deliberately given direct dependencies.
2. One translation owner supplies dependency-light locale metadata/schema/types and immutable `loadMessages(catalogLocale)` preserving the observed merge. Browser packaging needs an enumerated static import map or verified Vite glob covering all 36 exact files; this filesystem probe does not prove variable imports bundle.
3. The server facade must accept a **request-owned explicit snapshot** and optional typed namespace rather than impersonating Next awaitable request APIs. Keep catalog identity, message-engine locale and formatter Intl locale separate; provide explicit accepted timezone/now/formats and consistent error/fallback callbacks. Catalog/build caching may hold immutable data, not a mutable current locale or per-request translators/formatters.
4. The React facade can retain `useI18n`, `useI18nMessages` and expose standalone provider/formatter/now hooks; its catalog-locale hook must not conflate normalized engine locale with the persisted catalog key. Preserve or explicitly retire `raw`, `markup`, messages and helper callback APIs. Public types can come from the demonstrated actual-JSON/public-core candidate; fix breadcrumb keys from the actual object. No unnecessary ICU declaration generator is required.
5. COMPOSITION owns provider/export/route registrations and reviews the accepted #01 public bootstrap contract. #06 owns selection/switch/cookie/draft/direction coordination; #07 owns formatting/clock/resource lifecycle; feature owners own rich callbacks and structured error calls. A contribution must identify its exact snapshot/types/loader/export revision before integration. This spike is independent of #01 readiness and does not satisfy its predecessor edge.

## Unverified cases and policy holds

No URL/cookie/session precedence, browser detection, draft-preserving switch, timezone default, clock freshness, direction/RTL or Crowdin DOM/script policy is invented. Message-engine normalization for cn/zh/cr and malformed-message reporting/fallback remain explicit holds. The 105 blank extra leaves expose a catalog-conservation/effective-key distinction needing a deliberate contract.

The sweep does not exhaust all ICU branches, translated rich caller argument schemas, plural offsets/ordinal/select semantics, arbitrary raw/markup objects, browser hydration, Vite production graph, missing-provider recovery, reordered asynchronous resources, locale switching/draft retention, RTL layouts, Day.js/MRT lifecycle, Zod isolation, cached SSR identity, relative-time ticking, date-only/DST/culture preferences or live Crowdin functionality. None of those is claimed complete or blocked solely on this spike.
