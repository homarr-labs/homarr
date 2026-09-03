# Homarr v2 release media archaeology

Audit date: 2026-09-03. This is a read-only inventory: no media file was saved to disk, no account was used, and nothing was posted.

## Executive answer

- The best publicly accessible first-party set is the eight-image gallery in the official [Homarr v2 public beta issue #6600](https://github.com/homarr-labs/homarr/issues/6600). All eight stable URLs still render and resolve to static PNGs.
- The gallery was authored by Homarr member `ajnart`, created on 2026-08-15, and [last edited at 2026-08-15 10:17:21 UTC](https://github.com/homarr-labs/homarr/issues/6600). It was not refreshed after later v2 UI work.
- The features are still part of v2, but the exact pixels are not release-current. Most images should be treated as storyboards and recaptured. The onboarding image is the only useful public fallback for a surface absent from the demo, but it is also clearly at risk of drift.
- The supplied Discord message cannot be inspected without authentication. No public Discord attachment URL, author, caption, or license could be recovered. Do not cite it as verified media yet.
- The v2 roll-up PR and its seven stack PRs contain no human-authored attached screenshots or videos in their bodies, issue comments, reviews, or inline review comments. The useful PR-side media are committed documentation assets, listed below.

## Supplied Discord message

Source: <https://discord.com/channels/972958686051962910/974370615752531988/1537928363786641428>

| Check | Result |
| --- | --- |
| Message date | `2026-08-14T20:58:15.254Z`, derived from the Discord snowflake ID |
| Logged-out browser | Redirects to the generic Discord login screen; the rendered DOM does not contain the message ID |
| Embedded media | No `cdn.discordapp.com` or `media.discordapp.net` resource was exposed |
| Unauthenticated message API | `401` |
| Discord oEmbed | `404` |
| Public search | No indexed copy of the message ID or permalink found |
| Direct public asset URLs | **None recoverable** |
| Provenance / license | **Unknown**: the permalink alone does not establish the poster, ownership, or reuse terms |
| Currentness | **Unverifiable** without viewing the message |

The message predates issue #6600 by about thirteen hours, so overlap is plausible, but there is no evidence that its attachments are the same files. A human with Discord access should use **Copy Media Link** / **Copy Link** and record the poster, caption, upload time, file type, dimensions, and any reuse permission. Re-uploading approved files into this repository would give the release post stable, reviewable provenance.

## Official GitHub issue gallery

Common provenance: uploaded in the body of [issue #6600](https://github.com/homarr-labs/homarr/issues/6600) by `ajnart` in the official `homarr-labs/homarr` repository. Browser inspection confirmed the dimensions below. Use the stable `github.com/user-attachments/assets/...` links, never the expiring signed `private-user-images` redirects.

| Feature / intended use | Direct public asset | Pixels | Currentness on 2026-09-03 |
| --- | --- | ---: | --- |
| Dashboard overview / hero candidate | [PNG](https://github.com/user-attachments/assets/d2a52fcd-18c1-4a7b-aa9b-2f64c78e12e2) | 4096 x 2490 | **Stale pixels.** The demo dashboard was redesigned in [#6663](https://github.com/homarr-labs/homarr/pull/6663) and expanded in [#6696](https://github.com/homarr-labs/homarr/pull/6696). Recapture the current demo. |
| Custom Widgets v2 | [PNG](https://github.com/user-attachments/assets/54a922b4-9c73-44d1-83cf-5360f2ec5e60) | 2084 x 1602 | **Stale pixels.** The workbench changed in [#6689](https://github.com/homarr-labs/homarr/pull/6689), authoring was hardened in [#6700](https://github.com/homarr-labs/homarr/pull/6700), and MCP/widget authoring was optimized in [#6743](https://github.com/homarr-labs/homarr/pull/6743). |
| Community Workshop | [PNG](https://github.com/user-attachments/assets/9e205a56-e537-4636-ab5f-99b5b8a0ab70) | 3452 x 2276 | **Feature-current; pixel-currentness unproven.** Workshop and submission behavior changed after capture, including [#6752](https://github.com/homarr-labs/homarr/pull/6752). Use only after a visual comparison with the current Workshop. |
| Onboarding / setup studio | [PNG](https://github.com/user-attachments/assets/a6727a27-57d3-4d51-8abc-4b579f9d6ab8) | 3190 x 1674 | **Best public fallback, but stale pixels.** Account-step behavior changed in [#6641](https://github.com/homarr-labs/homarr/pull/6641), setup discovery changed in [#6625](https://github.com/homarr-labs/homarr/pull/6625), the backdrop/wordmark changed in [#6687](https://github.com/homarr-labs/homarr/pull/6687), and generated widget sizing changed in [#6739](https://github.com/homarr-labs/homarr/pull/6739). Prefer a local fresh-install capture. |
| Homarr Assistant | [PNG](https://github.com/user-attachments/assets/fa0112a7-7838-42eb-8b3b-050ba25aaa6b) | 3388 x 1888 | **Stale pixels.** Conversation UX changed in [#6636](https://github.com/homarr-labs/homarr/pull/6636), persistence/history changed in [#6705](https://github.com/homarr-labs/homarr/pull/6705), and MCP/widget authoring changed in [#6743](https://github.com/homarr-labs/homarr/pull/6743). |
| Reworked drag and drop | [PNG](https://github.com/user-attachments/assets/ad56ec34-61c7-469e-bad3-8e0588b7ca26) | 2702 x 1564 | **Concept-current; stale interaction state.** Draft/scroll handling, edit stability, responsive roles, and layering changed in [#6637](https://github.com/homarr-labs/homarr/pull/6637), [#6650](https://github.com/homarr-labs/homarr/pull/6650), [#6734](https://github.com/homarr-labs/homarr/pull/6734), and [#6741](https://github.com/homarr-labs/homarr/pull/6741). Replace with a short fresh GIF/video. |
| Advanced widget mode | [PNG](https://github.com/user-attachments/assets/18b77141-12f8-4856-9341-28be71746a21) | 1490 x 1156 | **Stale pixels.** Compact surfaces, scaling, and advanced widget layouts changed in [#6710](https://github.com/homarr-labs/homarr/pull/6710), [#6737](https://github.com/homarr-labs/homarr/pull/6737), [#6741](https://github.com/homarr-labs/homarr/pull/6741), and [#6756](https://github.com/homarr-labs/homarr/pull/6756). |
| Automatic mobile layout | [PNG](https://github.com/user-attachments/assets/a70002eb-18c5-4e51-86ec-c1961e67cd00) | 3344 x 1900 | **Concept-current; stale pixels.** Mobile header/menu behavior and responsive roles changed in [#6715](https://github.com/homarr-labs/homarr/pull/6715), [#6730](https://github.com/homarr-labs/homarr/pull/6730), and [#6734](https://github.com/homarr-labs/homarr/pull/6734). Recapture at a real mobile viewport. |

### Licensing caveat for issue attachments

The issue body does not state a standalone media license. Being uploaded by a Homarr maintainer in the official repository is strong first-party provenance, but it is not the same as being committed under the repository's [Apache-2.0 license](https://github.com/homarr-labs/homarr/blob/ac62e5bfd6731651b75345b8bb6a07882fad8daa/LICENSE). For Homarr's own release channels these are the lowest-risk external assets available; retain the issue source and author attribution. Screenshots also contain third-party service icons and marks, whose rights are not granted by Homarr's license.

## PR scan

The stack declared by [roll-up PR #6545](https://github.com/homarr-labs/homarr/pull/6545) is [#6356](https://github.com/homarr-labs/homarr/pull/6356), [#6503](https://github.com/homarr-labs/homarr/pull/6503), [#6502](https://github.com/homarr-labs/homarr/pull/6502), [#6450](https://github.com/homarr-labs/homarr/pull/6450), [#6482](https://github.com/homarr-labs/homarr/pull/6482), [#6555](https://github.com/homarr-labs/homarr/pull/6555), [#6569](https://github.com/homarr-labs/homarr/pull/6569), then #6545.

Searches covered each PR body, issue comments, review bodies, and inline review comments. No human-authored release screenshot, GIF, WebM, or MP4 was attached. The only unrelated matches were a CodeRabbit badge and review text quoting pre-existing documentation image paths. The onboarding PR [#6569](https://github.com/homarr-labs/homarr/pull/6569) provides authoritative feature context, but no media.

The user-uploaded images in issue #6600 comments should **not** be used as release media:

- [Comment 5304199491](https://github.com/homarr-labs/homarr/issues/6600#issuecomment-5304199491) and [comment 5306325493](https://github.com/homarr-labs/homarr/issues/6600#issuecomment-5306325493) are third-party defect reports showing unreadable Beszel scaling and an incorrect update indicator. The scaling report was followed by [#6616](https://github.com/homarr-labs/homarr/pull/6616).
- [Comment 5464437231](https://github.com/homarr-labs/homarr/issues/6600#issuecomment-5464437231) is a third-party complaint that a compact mode was not compact. It is negative product evidence, not promotional material.
- Their ownership/reuse terms are unstated, and the depicted defects are not current release claims.

## Committed documentation media: stable but mostly pre-final

The live `release/v2` branch resolved to `ac62e5bfd6731651b75345b8bb6a07882fad8daa` on 2026-09-03 (commit date 2026-09-01). The following are immutable public URLs and, because the files are committed in the repository, have substantially clearer Apache-2.0 provenance. They remain subject to third-party trademark/content caveats.

### Useful as temporary layout references

- Responsive board: [desktop PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/getting-started/img/onboarding-board-desktop-current.png), [mobile PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/getting-started/img/onboarding-board-mobile-current.png), and [add-content PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/getting-started/img/onboarding-add-content-menu-current.png).
- Board editing/layouts: [edit-mode PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/boards/img/board-edit-mode.png) and [layout-settings PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/boards/img/layout-settings.png).
- Custom Widgets: [desktop workbench PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/custom-widgets/img/workbench.png), [mobile workbench PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/custom-widgets/img/workbench-mobile.png), and [validation PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/custom-widgets/img/workbench-validation.png).
- Assistant: [configuration PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/img/assistant-config.png) and [widget PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/img/assistant-widget.png).
- Advanced widgets: [Calendar PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/widgets/calendar/img/advanced-view.png), [Downloads PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/widgets/downloads/img/advanced-view.png), [media-server PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/widgets/media-server/img/advanced-view.png), and [Weather PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/widgets/weather/img/advanced-view.png).

Most of that set was added by [docs PR #6564](https://github.com/homarr-labs/homarr/pull/6564) on 2026-08-12 and predates the later UI PRs listed above. It is stable and attributable, but not sufficient proof of final visual fidelity.

### Do not mislabel these older assets

- [Homepage drag-and-drop MP4](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/src/components/pages/home/drag-and-drop/showcase-dark.mp4): migrated into this repository on 2026-06-11 and predates the v2 dnd-kit rework. Do not use it as a v2 interaction demo.
- [MCP instructions PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/management/api/img/mcp-instructions.png): last changed on 2026-06-12 and predates the v2 Assistant/MCP stack. Do not present it as the final v2 MCP UI.
- [Legacy onboarding admin-step PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/getting-started/img/onboarding-from-scratch-step-admin-user.png): migrated on 2026-06-11, before the setup-studio rebuild. Do not use it for the v2 onboarding claim.
- [Board custom-CSS PNG](https://raw.githubusercontent.com/homarr-labs/homarr/ac62e5bfd6731651b75345b8bb6a07882fad8daa/apps/docs/docs/advanced/styling/img/custom-css-setting.png): this is board-level Custom CSS and predates [global server Custom CSS #6753](https://github.com/homarr-labs/homarr/pull/6753). Do not caption it as the new instance-wide feature.

## Recommended release capture order

1. Capture onboarding locally from a clean database; show automatic discovery and first-board generation. Use the issue PNG only if local capture fails, and label it beta-era.
2. Recapture the current demo dashboard, Custom Widget workbench, Assistant, advanced widget mode, and mobile layout.
3. Record short fresh clips for drag/drop, multi-select movement, board switching, Command menu, and widget advanced-mode transitions; static issue PNGs cannot prove interaction quality.
4. Capture Workshop separately from its current public preview, after confirming whether community content/logos are safe to redistribute.
5. Move final approved captures into the repository so the blog uses immutable, licensed paths rather than Discord CDN or expiring GitHub redirect URLs.
