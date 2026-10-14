# 79: Playback, libraries and Tracearr

**What to build:** Save and consume currently playing media, audio libraries and Tracearr activity with complete provider-specific fields, links/options and safe artwork.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 16 options validate/convert/save/reload; playing filter/artwork/progress/bitrate/location, audio library/media/listening/compact controls and Tracearr streams/stats/activity/violations render supported compact/advanced detail.
- [ ] Advanced audio stream reads occur only for supporting providers; Navidrome/Audiobookshelf shapes/units/absent metrics and multi-source partial/empty/errors stay distinct without unsupported calls or invented zeros.
- [ ] Current use-before-secret, compatible/required selection and one AudioStats integration are server checks; private artwork uses authorized opaque delivery, and credential-bearing links/DTOs never enter browser caches.
- [ ] Media/Tracearr 10s plus effective audio refresh, exact integration/filter keys and shared stream reuse survive focus and approved hydration/client boundaries; ordinary stale data remains useful while forbidden/session changes clear it and polling disposes. Future focused provider-shape, private-image, conversion and query/lifecycle evidence runs at scoped target gates.

## Coverage

`mediaServer` (3): `showOnlyPlaying`, `showBitrate`, `showLocation`; `audioStats` (9): `showArtists`, `showAlbums`, `showSongs`, `showLibraryCount`, `showAudiobooks`, `showPodcasts`, `showListeningTime`, `showActiveSessions`, `compactMode`; `tracearr` (4): `showStreams`, `showStats`, `showRecentActivity`, `showViolations`. Input consumed `switch`. Primary `widget.mediaServer.getCurrentStreams`, `widget.audioStats.getStats`, `widget.tracearr.getDashboard`. Media families `jellyfin`, `emby`, `plex`, `navidrome`, `mock`; audio `navidrome`, `audiobookshelf`, `mock` (one); activity `tracearr`, `mock`. Native SDK/auth/result ownership stays #51/#62 (conditional draft distribution not adopted). Exact [playback/audio evidence](../drafts/widgets.md#widget-playback-audio--playback-audio-libraries-and-tracearr-activity).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); membership/type/refinement/defaults and current preview authority apply.

## Required contracts

Initially unaccepted: #51 playing/image DTOs; #62 audio/activity/native capability; #40 execution; #114 opaque images; #04 view/use/preview policy; #67 query/error/focus host; #68 options; #03 bounded refresh; #07 units/time; #120 contribution. Later real provider/private-image/saved-widget acceptance is separate from contract readiness and never waits for all 89 providers.

## Decision holds

Q11/Q12 stored conversion and Q13 affected saves; SSR/selective hydration, advanced-stream capability and freshness/demo behavior require explicit dispositions; Q15 affects session clearing only.

## Ownership

#79 owns these three widget reads/renderers/advanced consumers; #51/#62 own protocols/SDKs/results, #114 image handles. #68 options/#29 placement and COMPOSITION central registration remain sole owners; record exclusive local files before dispatch.
