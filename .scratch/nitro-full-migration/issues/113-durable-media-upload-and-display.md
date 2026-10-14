# 113 — Durable media upload and display

## What to build
Deliver authorized multipart upload/list/search/page/delete/select and actual binary display, retaining durable bytes/metadata/selected references and transactional local-icon cleanup.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary MEDIA-01. media.getPaginated, uploadMedia, deleteMedia (3), H19 media binary GET; own media management page and upload/media selectors consumed by branding/background/app/icon forms. Formats PNG/JPEG/WebP/GIF/SVG; 32 MiB upload; medias bytes/name/type/size/creator plus icons local mapping and selected references. Own-default listing, opt-in media-view-all, media-upload and creator-or-media-full-all deletion. Source binary accessibility is independent of authenticated listing; SVG sanitization/ETag/304/sandbox CSP/nosniff/private-no-cache capabilities remain explicit.

## Required contracts
Initially unaccepted: #02 binary/local-icon transaction/reference/errors; #04 current upload/view/delete and deliberate anonymous binary policy; #115 local-media icon query/removal interface; #01 untouched multipart File/body and native binary/abort descriptors; #120 typed errors; #24 safe image consumer; #05–08/#22 selector/navigation. Accept contracts without requiring whole media/icon/board peers.

## Decision holds
Explicit anonymous/public-board/branding read policy and approved corrections; sanitizer/jsdom/native runtime evidence. Q11/Q12 bytes/reference conversion, detailed locale/list behavior and selected binary cache policy where unknown. Do not silently require login for existing public images or assume all anonymous reads approved.

## Ownership
Own media service/multipart/binary descriptors, management/upload/select UI and local-icon atomic deletion contribution; #115 owns repository sync/picker domain, #02 physical schema and COMPOSITION native resources/central mounts. Real shipping multipart/binary and public-board/branding consumers are production joins; #125 is final convergence.

## Acceptance criteria
- [ ] Actual multipart client validates every format and 32 MiB bound, preserves exact non-SVG bytes/metadata and persists upload/list/search/page outcomes; denied upload/all-user view/delete yields typed safe errors with no mutation.
- [ ] Creator-or-full deletion atomically removes matching local icon references; old uploaded bytes/selected references explicitly convert and resolve after restart without depending on an obsolete URL.
- [ ] Deliberately approved binary access supports public-board/branding consumers; SVG is sanitized before hash/serve, ETag conditional requests return correct 304 and selected CSP/nosniff/cache behavior survives real native response delivery.
- [ ] Selectors preserve include-all/search/page/page-size and correct principal invalidation, without leaking restricted management lists; focused future malformed SVG, upload bounds, denied all-user/delete and conditional-read regressions exercise real clients and durable storage.
