# 51: Media playback, releases and Plex images

**What to build:** Configure/test three independent media servers and consume complete playback/recent releases with accurate links and safe opaque private Plex images.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `jellyfin,emby,plex`, projected sessions with showOnlyPlaying=false, native checks and H eligibility. Jellyfin U/P or K uses native/HTTP token resolution, user-scoped SDK/Axios injection and full session/release methods. Emby K X-Emby-Token has independent public-user/latest fetches despite shared mapping. Plex K X-Plex-Token retains XML playback, JSON recent movies/episodes, deep links, machine/section identity, grouping and per-release dispatcher finally-close. Exact native/auth/projection evidence: original INTEGRATION-012 and research §§2.2–2.3/5.

## Required contracts

Accept #40 execution/snapshot/trusted Axios/operation/result, #114 opaque private-image handle, #41 forms and #79/#80 playback/releases options/consumer interfaces. #04 supplies current native query policy. Narrow accepted revisions gate start; real identity/secrets/storage/SDK runtime/images and each target configure/test/playback/release join are release requirements, not all-provider dependencies.

## Decision holds

Q11/Q12 apply to concrete persistence/conversion; Q15 only applicable session continuity. Selected SDK/runtime/server versions, credential/session/image restart lifetime and native URL/trust policy remain qualified. No live session/media access is implied by publication; approved minimum scopes and image evidence are needed later.

## Ownership

Own three clients, shared Jellyfin/Emby mapping, Jellyfin SDK injection and native playback/release compositions. Consume #40's common Axios bridge and #114's image storage/delivery; do not edit those, reusable #41 forms or #79/#80 widgets concurrently. COMPOSITION mounts local descriptors and owns manifests/exports.

- [ ] Each kind completes configure/test/masked edit/mode/remove/delete and authorized playback/release/Stats UI demonstration, preserving all native/H modes and Jellyfin's user scope.
- [ ] Independent fixtures retain IPv4/IPv6/session/artist/movie/episode mappings, showOnlyPlaying, Emby public-user/latest calls, Plex XML/JSON/grouping/deep links/IDs and exact sessions projection; inherited mapping is not independent provider acceptance.
- [ ] Plex private images return opaque authorized handles through #114, never source headers or credential URLs. Preserve subpaths/external links and config/trust/revision invalidation under the accepted image lifetime.
- [ ] Native allowed-kind/query checks precede decrypt; media playback/release composition retains differing TTL/stale/options/Date/error meanings. Focused abort/deadline/empty/partial/schema/auth/error fixtures prove redaction, stale fencing and owned per-release dispatcher close.
- [ ] Demonstrate all three actual target consumers/images independently. Later explicitly approved live evidence covers actual sessions/releases, Jellyfin modes and Plex opaque image fetch per deployed version/topology; unknown support remains unverified, with no automatic all-88 matrix or copied private media requirement.
