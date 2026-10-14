# 05: Standalone translation engine and catalogs

**What to build:** Server and browser consumers render all preserved catalogs through the selected standalone use-intl facade, with typed namespaces, English fallback, ICU plurals/interpolation and safe rich React content, without Next request context.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 36 catalog identities and every key survive, including Crowdin markers and seven non-English `board.snapshot.*` extras; recursively remove blank leaves then merge English→selected while retaining nonblank whitespace and extra keys.
- [ ] Root/scoped translators, messages, interpolation/plurals/numbers, `rich` callbacks, `has`/breadcrumb fallback and `stringOrTranslation` work through server-explicit and browser facades; exported raw/markup/messages capabilities have deliberate dispositions, not silent removal.
- [ ] Derive namespace/key/breadcrumb types from actual messages rather than import functions; pure catalog metadata/schema imports do not pull React/server/Next entrypoints into consumers, and no nonexistent ICU argument generator is assumed.
- [ ] Immutable catalog/build caches stay separate from request-owned translator/formatter instances; catalog, Intl and message-engine locale identities are distinct and the root/browser receive the same accepted snapshot.
- [ ] A real localized public route and representative app-create/docs/status/invite/Assistant rich links demonstrate server/browser output; future focused all-catalog parser checks distinguish existing malformed translations from migration regressions without unsafe HTML or naive substitutions.

## Coverage

**I18N-01**: `ca, cn, cr, cs, da, de, de-CH, en-gb, en, el, es, et, fi, fr, he, hr, hu, it, ja, ko, lt, lv, nl, no, pl, pt, pt-br, ro, ru, sk, sl, sv, tr, zh, uk, vi`; root/client/server/languages/request catalog/type/helper families, `getI18n`/`useI18n`, message helpers, supported-language metadata and chosen direct dependency request. Evidence: [core I18N-01](../drafts/core.md), [localization §1/import ledger](../../../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md).

## Required contracts

#01 safe locale/bootstrap/provider placement; #06 catalog selection metadata; #07 explicit formatter/clock snapshot; representative feature rich callback/structured-error consumers supply their narrow call shapes. COMPOSITION reviews/installs direct use-intl dependency and export contributions; no whole-feature completion needed for the facade.

## Decision holds

Malformed-catalog reporting/fallback and translator message-engine normalization versus stored aliases need disposition. use-intl and catalog retention are settled. Optional compilation, generators and partitioning are not prerequisites; publication does not validate the selected pinned runtime.

## Ownership

Exclusive translation catalog/import manifest/types/facade owner; #06 selection/switch, #07 formatting resource lifecycle and #08 validation/overlays remain separate. #24 owns Crowdin activation/assets. No root/manifest/lock edits outside COMPOSITION; dispatch needs accepted used revisions and allocation.
