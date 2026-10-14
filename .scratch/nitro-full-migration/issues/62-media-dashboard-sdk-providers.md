# 62: Media/dashboard SDK providers

**What to build:** Configure/test and consume complete media/dashboard results from four providers with per-call SDK credential isolation and safe opaque private images.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Retain INTEGRATION-023 as its own provider unit. Primary kinds all have native checks/H eligibility/projected Stats.

| Kind | Auth, native surface and exact projection |
| --- | --- |
| `immich` | K X-API-Key, per-call baseURL/headers/fetch; server/user totals, albums/list/full/randomized previews/assets/pagination/empty albums/thumbhash/media; userCount,photoCount,videoCount,totalLibraryUsageInBytes (bytes) |
| `tracearr` | K bearer; health, Stats/streams(serverId), violations/history(pageSize), full dashboard/null/private image paths; activeStreams,totalUsers,totalSessions,recentViolations |
| `audiobookshelf` | K bearer; libraries/per-library Stats/listening time/active sessions/dashboard/partial-empty libraries; libraryCount,totalAudiobooks,totalPodcasts,activeSessions,totalListeningTimeSeconds (seconds) |
| `navidrome` | U/P Subsonic query u,p,v,c,f; artist/album/song dashboard/current sessions, singleton/array/specific empty-library error; artistCount,albumCount,songCount |

Other units are counts; libraries remain native, not scalar projection. Exact evidence: original INTEGRATION-023/research §§2.2–2.3/5.

## Required contracts

Accept #40 snapshot/query/native/SDK/trust/image/result/operation, #114 opaque images, #41 forms, #82 Immich and #79 playback/audio consumer interfaces plus #04 policy. Only narrow consumed revisions gate dispatch; real secrets/identity/storage/SDK runtime/images and every managed native UI join remain acceptance obligations, not completed-widget start blockers.

## Decision holds

Selected Immich SDK/server pairing, other runtime versions, user scope and source-only callable capability dispositions require evidence/acceptance. Q11/Q12 apply to concrete persistence/conversion, Q15 applicable sessions; image/cache restart lifetime and native URL/trust changes remain qualified. Live access/media/image scope requires later explicit approval.

## Ownership

Own four clients/native compositions and the single Immich SDK injection bridge. #114 image storage/delivery, #79/#82 saved widget queries/presentation, #41 forms, #40 common transport and COMPOSITION assembly/manifests remain exclusive. No global SDK auth defaults or simultaneous widget/provider file edits.

- [ ] All four kinds complete configure/test/masked edit/mode/remove/delete and authorized native/Stats UI demonstration with exact H/native auth and complete fields, not just count success.
- [ ] Immich per-call credentials/fetch remain isolated; independent fixtures preserve paging/randomized/empty albums/assets/thumbhash/URLs and user/server totals. Tracearr preserves serverId/pageSize filters, every read/dashboard/null field, and Audiobookshelf preserves per-library versus audiobook/podcast/session/listening meanings.
- [ ] Navidrome preserves Subsonic query fields, singleton/array normalization, specific tolerated empty-library error, failed application envelopes and current sessions; query secrets and raw causes are redacted throughout.
- [ ] Immich/Tracearr private images use opaque authorized #114 handles, never raw authenticated URLs. Focused policy-before-decrypt/denial/abort/deadline/config/trust/delete fixtures prove source scope, resource cleanup, image invalidation and stale fencing.
- [ ] Demonstrate actual albums/assets/previews, filtered streams/dashboard, libraries/sessions and now-playing UI independently. Later explicitly approved scoped live SDK/server/filter/empty-library/image evidence leaves unknown compatibility unverified and requires no automatic all-provider matrix or copied private media.
