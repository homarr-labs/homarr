# 07: Request-safe culture, dates and relative time

**What to build:** Dates, numbers, units, calendar/table labels and relative time use an explicit clock/zone/locale on SSR and navigation, preserving user/widget culture choices without global locale leakage or hydration drift.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Separate catalog/Intl/message-engine identities and preserve or deliberately convert Intl aliases `cn→zh-CN`, `cr→en`, `zh→zh-TW` and Day.js aliases `cn→zh-cn`, `zh→zh-tw`, `cr→en-gb`, `no→nb`, `de-CH→de-ch`.
- [ ] Preserve invalid-date `?`, date-only UTC day versus timestamp, explicit/widget zone/hour12/seconds, compact numbers and SI/binary/decimal byte/bit rounding; week start and units remain user/widget preferences, not inferred from language.
- [ ] Load/register all mapped Day.js and installed MRT-fork resources, including custom `ca/lt/lv/sl` JSON; per-instance/request locale and revision-owned loading reject stale completion and expose failure/retry without global selected-locale state or endless suspension.
- [ ] Serialize/restore the accepted locale/zone/now/culture/catalog revision identically for server/client and applicable render-cache variants; relative refresh follows consumer mount/cleanup rather than freezing time in a global translator.
- [ ] Real date/table/relative-time consumers demonstrate English/Hebrew/Chinese isolation, DST/date-only boundaries, refreshed labels and localized controls in future focused evidence; recorded Assistant/backup/preview/certificate environment-format differences receive explicit dispositions, not a false claim of universal current localization.

## Coverage

**I18N-03**: formatter/clock snapshot, native date/compact-number/unit helpers, relative-refresh adapter, Day.js resources and MRT locale loaders/hook. Releases formatter/now, calendar/date/widget units and admin/extended environment-format calls remain their feature owners' consumers. Evidence: [core I18N-03/formatting ledger](../drafts/core.md), [localization §1 formatting rows](../../../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md).

## Required contracts

#01 request/render snapshot and cache-variant input; #05 translation facade/catalog metadata; #06 selected locale/direction revision; #16/#17 user/instance culture values; selected calendar/Releases/table consumers provide exact formatting inputs and lifecycle callbacks. Review only used interfaces, not a whole locale-area completion.

## Decision holds

First-paint timezone/now/freshness, message-engine normalization, visible environment-format corrections and resource-load fallback require explicit acceptance. Current global Day.js races are not approval to reproduce them; retained units/week start and standalone use-intl are settled.

## Ownership

Exclusive formatting/resource/relative adapter owner, not route-control (#22), root/provider installation, or every feature formatter caller. COMPOSITION owns central dependencies/exports; dispatch requires accepted consumed revisions and exclusive allocation. Publication provides no formatting verification.
