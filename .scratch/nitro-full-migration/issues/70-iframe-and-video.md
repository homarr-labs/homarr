# 70: Iframe and video

**What to build:** Save bounded external embeds and browser video feeds with explicit opt-in permissions, sizing, edit preview and a single recoverable player lifecycle.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 13 options validate, convert, save and reload against the correct board/item/kind; malformed URLs/converted values receive repair feedback and failed writes preserve options rather than silently losing content.
- [ ] Iframe sandbox/Permissions Policy implements fullscreen, scrolling, payment, autoplay, microphone, camera, geolocation and modals exactly under the approved embed policy; SSR and inert edit previews cannot relax capability limits.
- [ ] One Video.js lifecycle handles feed replacement, mute/autoplay/controls and resize/focus; hide/unmount disposes players/observers without duplicate playback or unwanted state reset.
- [ ] Deterministic browser-only pending, rejected-load retry and permission/network/player failures are recoverable without invented polling/widget RPC; record future focused saved-option, sandbox/edit and feed-replacement/disposal evidence on disposable feeds at agreed scoped gates.

## Coverage

`iframe` (9): `embedUrl`, `allowFullScreen`, `allowScrolling`, `allowPayment`, `allowAutoPlay`, `allowMicrophone`, `allowCamera`, `allowGeolocation`, `allowModals`; `video` (4): `feedUrl`, `hasAutoPlay`, `isMuted`, `hasControls`. Inputs consumed `text`, `switch` (#68/#67 behavioral owners). No widget read/action procedure or ordinary integration attachment.

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md) and [embed evidence](../drafts/widgets.md#widget-embeds--policy-safe-iframe-and-single-lifecycle-video-cards). Preserve persisted types/nullish defaults, preview authority, client/server isolation and lifecycle-focused deferred verification.

## Required contracts

Initially unaccepted: #67 browser-only lazy host/error lifecycle; #68 option validation/save/editor; #27 geometry/edit/focus; #04 board-modify and undefined-ID preview policy; #08 error feedback; #24 document embed policy/CSP contribution and #113 media delivery only if used. Required contract revisions precede dispatch; real saved embed/player acceptance is a later join, not an integration-catalog barrier.

## Decision holds

Q11/Q12 concrete saved-option conversion and Q13 timing where consumed; embed URL/sandbox/Permissions Policy and explicit browser-only SSR presentation. No unresolved auth-library, Redis or routing choice is fabricated.

## Ownership

#70 owns embed/player options/rendering/disposal; shared editor/options remain #68, placement #29, document emission COMPOSITION/#24. No dependency/manifest/root edits outside COMPOSITION; allocate exclusive local files before dispatch.
