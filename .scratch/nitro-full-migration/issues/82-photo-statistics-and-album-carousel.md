# 82: Photo statistics and album carousel

**What to build:** Select authorized albums/all photos, persist carousel/count settings and display safe photos/metadata with stable focus, rotation and recoverable empty/error states.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All eight options validate/convert/save/reload; album/all-photo selection, counts/storage units, interval/randomization/metadata handle deleted albums and one compatible integration with real authorized selectors.
- [ ] Server stats versus album list/preview/full queries retain exact integration/album/randomization keys and independent result sizes; random order is coherent without oversized duplicate hydration or a fabricated static album list.
- [ ] Previous/next/slideshow/runtime status and supported advanced focus retain selected photo/timer state through resize/focus; hide/unmount/reopen cleans listeners/timers without duplicate rotation.
- [ ] Opaque full/preview image delivery, partial/empty/error/no-root-poll/manual recovery and forbidden/session clearing use server-only credentials and approved client/hydration boundaries. Future focused private-image/album removal, interval/lifecycle and option conversion evidence runs at scoped target gates.

## Coverage

`immich-serverStats` (4): `showUsers`, `showPhotos`, `showVideos`, `showStorage`; `immich-albumCarousel` (4): `albumId`, `rotationIntervalSeconds`, `showPhotoInfo`, `randomizePhotos`. Inputs consumed `switch`, `number`, `integrationSelect` (primitive primary #91; album behavior here). Primary `widget.immich.getServerStats/getAlbums/getAlbum/getAlbumPreview`. Families `immich`, `mock`, one integration per placement. #62 retains per-call SDK/auth/native Stats/image result ownership. Exact [Immich evidence](../drafts/widgets.md#widget-immich--saved-photo-statistics-and-a-focus-stable-album-carousel).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); membership/kind/declared validation, use-before-secret and undefined-preview authority apply.

## Required contracts

Initially unaccepted: #62 album/stats/asset native DTO; #40 execution; #114 opaque images; #91 integrationSelect primitive only, not Beszel live completion; #67 host/query/runtime actions; #68 options; #04 view/use/preview; #03 cache; #07 units; #120 result/key contribution. Real SDK/image/persisted carousel acceptance is a later join, not all providers finished.

## Decision holds

Q11/Q12 options/conversion, Q13 selection saves; selective SSR/preview/full payload and freshness/demo behavior remain open. Q15 applies to session clearing; no native SDK result is certified by fixtures.

## Ownership

#82 owns album selector consumer, two widgets and carousel lifecycle; #91 shared primitive, #62 SDK, #114 image handles, #68 options/#29 placement. COMPOSITION owns shared installation; exclusive local files must be recorded before dispatch.
