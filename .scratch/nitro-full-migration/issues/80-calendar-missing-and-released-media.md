# 80: Calendar, missing and released media

**What to build:** Save calendar/release filters, navigate dates and missing/queued pages, and display source-qualified media lists with authorized links/artwork.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 11 options convert/save/reload; actual month/year/type/unmonitored and page/filter keys respect past/future restrictions, page-size validation and calendar's optional-integration empty state.
- [ ] Approved initial-month/timezone/hydration policy preserves iCal/Nextcloud/Home Assistant event meanings and organizer source distinctions; Lidarr/Readarr are not granted unsupported missing-media methods.
- [ ] Missing/queued totals/detail/paging and poster/layout/type/source/description-tooltip controls work with meaningful partial/empty/error and supported advanced presentation; safe images/links retain source identity.
- [ ] Missing 60s backend cache, releases 300s/stale fallback and no-root-poll/manual recovery remain input-scoped; date/page changes cancel correctly, forbidden/session clears data and chart/client splits avoid duplicate hydration. Future focused date boundaries, optional selection, content conversion and same-kind page/query evidence runs at scoped target gates.

## Coverage

`calendar` (4): `releaseType`, `filterPastMonths`, `filterFutureMonths`, `showUnmonitored`; `mediaMissing` (3): `showMissing`, `showQueued`, `pageSize`; `mediaReleases` (4): `layout`, `showDescriptionTooltip`, `showType`, `showSource`. Inputs consumed `multiSelect`, `number`, `switch`, `select`. Primary `widget.calendar.findAllEvents`, `widget.mediaOrganizer.getData`, `widget.mediaRelease.getMediaReleases`. Calendar `sonarr`, `radarr`, `lidarr`, `readarr`, `homeAssistant`, `nextcloud`, `ical`, `mock` (optional); missing `sonarr`, `radarr`, `bindery`, `mock`; releases `emby`, `jellyfin`, `plex`, `mock`. Exact [media discovery evidence](../drafts/widgets.md#widget-media-discovery--calendar-missing-media-and-recent-releases).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); saved-board/item/kind/types, integration compatibility and current read/preview authority apply.

## Required contracts

Initially unaccepted: #49 organizer/calendar, #54 iCal/Nextcloud, #56 Home Assistant calendar, #51 release DTOs; #40 execution; #04 use/preview; #67 query/host/error; #68 options; #03 cache; #07 zone/calendar labels; #114 images; #120 contribution keys/inputs. Real source/calendar/date/saved-list joins are later evidence, not completed-provider barriers.

## Decision holds

Q11/Q12 option/content conversion, Q13 affected saves; clock/timezone month basis, selective SSR and cache freshness/demo override. Q15 applies to session transitions; confirmed locale engine/UI/runtime decisions are not reopened.

## Ownership

#80 owns three renderers/date/page state and widget read orchestration; named providers retain native calendars/media. #68 options/#29 placement, #07 shared time and COMPOSITION central installation are not shared-edit licenses. Exclusive local allocation precedes dispatch.
