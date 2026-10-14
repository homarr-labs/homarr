# 69: Clock, countdown and timer

**What to build:** Configure/save world clocks, weather/date displays, recurring countdowns and Timer/Pomodoro sessions with coherent reload, focus and notification lifecycles.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 27 options round-trip through valid saved placements; event IDs/UTC/zones/yearly recurrence, unique world-city presets, bounded durations and auto-start choices validate without replacing false/zero/empty values or losing converted values.
- [ ] Clock placeholder/timezone fallback, date/custom formats, second ticks, advanced city view and weather units/icons/day-night colors follow the approved clock/hydration policy; optional weather queries are scoped to their coordinates, not unrelated clocks.
- [ ] Countdown progress/seconds and yearly occurrences preserve version-2 browser alert preferences and occurrence deduplication, including timezone boundaries; browser alerts do not become a fabricated server cron.
- [ ] Timer version-3 runtime/history uses board/item-specific storage identities; Pomodoro/sound/notification/auto-start, storage failure and cross-tab behavior retain state on resize/focus and dispose ticks/listeners on unmount without duplicate alerts.
- [ ] Record future focused saved-option conversion, recurrence/time-boundary and reload/cross-tab lifecycle evidence at agreed target gates; revoked preview/saved access cannot reuse weather data or write another placement, and client storage/notification code stays out of server execution.

## Coverage

Primary kinds/options: `clock` (16): `customTitleToggle`, `customTitle`, `is24HourFormat`, `useCustomTimezone`, `timezone`, `showDate`, `dateFormat`, `customTimeFormat`, `showWeather`, `weatherLocation`, `isWeatherFormatFahrenheit`, `animateWeatherIcon`, `colorWeatherByDayNight`, `dayWeatherColor`, `nightWeatherColor`, `worldClockCities`; `countdown` (3): `events`, `showProgress`, `showSeconds`; `timer` (8): `mode`, `timerMinutes`, `focusMinutes`, `shortBreakMinutes`, `longBreakMinutes`, `sessionsBeforeLongBreak`, `autoStartBreaks`, `autoStartFocus`. Primary inputs `dateTimeEventList`, `timezoneList`, `number`; consumes `text`, `switch`, `select`, `location`. Local time/storage/alerts plus #72-owned `widget.weather.atLocation`.

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) and [DESIGN](../DESIGN.md); exact [time family evidence](../drafts/widgets.md#widget-time--clocks-recurring-countdowns-and-durable-timer-sessions). All defaults/refinements/persisted placement checks, preview policy, stale/forbidden recovery, client splits and scoped future checks apply where relevant.

## Required contracts

Initially unaccepted: #67 host/query identity; #68 options/editor; #27 stable item/focus identity; #04 saved/preview policy; #07 clock/zone/units; #08 browser notification facade; #72 weather/location DTO and refresh. #02/#112 supply durable conversion primitives, #28 ordered effects if applicable. Accept these revisions separately; clock-weather and real save/reload are later joins, not every provider's completion.

## Decision holds

Q11/Q12 concrete option persistence/conversion, Q13 save timing where used; explicit locale/timezone/clock basis, deterministic clock SSR and refresh/demo freshness policy. No server timer/polling architecture is implied; other Q11–Q15 holds remain scoped to affected contracts.

## Ownership

#69 owns three local renderers/state/storage/input behaviors. #72 owns weather/location execution; #07/#08 own shared time/notification services, #68 editor/options and #29 placement. COMPOSITION alone installs shared roots/registrations/manifests; local exclusivity precedes dispatch.
