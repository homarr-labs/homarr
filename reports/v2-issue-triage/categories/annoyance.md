# Annoyances

3 issues. See [complete report](../REPORT.md) and [methodology](../README.md).

### #6811 — bug: Annoying scroll bar

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6811) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** The supplied Chrome crop confirms visible vertical and horizontal scrollbars in the header/banner area, but it does not identify their owning element; release/v2 still permits horizontal scrolling inside header zones, so banner removal alone cannot establish resolution.

**Conversation (2 comments read):** The complete body and both comments were read. The report is a low-impact Chrome-only observation from Homarr 1.77 with a screenshot, and says the bars remain after dismissing the version banner. The maintainer says the announcement banner will be removed in a later release and also notes only Firefox was tested. The saved crop visibly contains a vertical bar at the right and a horizontal bar along the bottom, but image evidence cannot determine whether the page or a header descendant owns either scroller. Current release/v2 CSS hides overflow on the outer header while desktop and mobile zones still set overflow-x:auto. No browser runtime check was performed, so source inspection cannot determine whether the exact bars persist after the banner is gone.

**V2 evidence:**

- reports/v2-issue-triage/source/6811.json:10-88 — complete issue body was read; it describes the Chrome screenshot, banner-dismissed observation, version, and low impact.
- reports/v2-issue-triage/source/6811.json:88-182 — both comments were read; they discuss removing the announcement banner and limited Firefox testing.
- reports/v2-issue-triage/source/attachments/6811-1.png — saved crop visibly shows a vertical scrollbar at the right and a horizontal scrollbar along the bottom of the cropped area, without establishing the DOM owner.
- apps/nextjs/src/components/layout/header/configurable-header.module.css:1-3,24-38 — the outer header hides overflow, while desktop zones allow horizontal overflow with overflow-x:auto. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L1)
- apps/nextjs/src/components/layout/header/configurable-header.module.css:91-99; apps/nextjs/src/components/layout/header/configurable-header.tsx:110-146 — mobile zones also allow horizontal overflow and the component renders the desktop/mobile header zones. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L91), [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L110)

**Remaining / follow-up:** Reproduce on the verified release/v2 revision in Chrome, inspect the owning scroll container and dimensions, and compare with the historical V1 screenshot. The V1 beta banner is not a V2 runtime fixture. If overflow remains, identify its cause before considering a fix.

### #6643 — feat: Allow reordering boards in the board switcher

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6643) · **Annoyances** · **Not addressed** · Confidence: **high**

**Request:** V2 improves finding boards with a searchable switcher but still has no persisted board position, drag-and-drop reorder, or explicit sorting control.

**Conversation (2 comments read):** The requester needs stable, user-controlled order for many boards and describes the loss of settings when recreating boards. A maintainer proposed replacing the switcher with a keyboard-accessible searchable overlay; the requester replied that this changes navigation but does not solve ordering. The merged #6660 switcher improvement relates to discovery only and did not implement reorder.

**V2 evidence:**

- apps/nextjs/src/components/board/board-switcher.tsx:69-74 + the switcher deliberately moves the active board to the end of its local display sequence rather than exposing persisted board order. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L69)
- packages/api/src/router/board.ts:385-434 + board overview query has no board orderBy/position field; only nested layout/section ordering is requested. — [source L385](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L385)
- reports/v2-issue-triage/source/linked-prs/6660.json:triage_merge_commit_is_ancestor_of_v2 + true; merged PR metadata describes searchable board previews and does not claim reorder support.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:75-85 + V2's transactional layout moves do not establish a board-level ordering field or switcher reorder interaction. — [source L75](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L75)

**Remaining / follow-up:** Add a persisted board position/order field and a settings or switcher drag-and-drop/sort control, then use that order consistently in the primary UI and board switcher.

### #962 — bug: item and dynamic section menus overlap

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/962) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces dynamic sections with containers, but that replacement does not establish that nested item/container menu handles no longer overlap. The original screenshots show handle placement, not simply an obsolete dropdown implementation.

**Conversation (0 comments read):** The issue has two screenshots and no comments. They show nested dynamic-section menu handles overlapping; one also shows an item count badge near the overlap. The timeline references unmerged PR #1184. Both historical images were downloaded and inspected, but neither is a V2 runtime capture.

**V2 evidence:**

- reports/v2-issue-triage/source/962.json:1 — the complete issue body and empty full_comments array were read; the request is the screenshot-described old menu overlap.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-81 — v2 documents the rebuilt board editor and says Containers replace Groups and dynamic sections. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)
- packages/db/migrations/custom/0004_unify_sections_and_gutters.ts:72-75,97-108 — the v2 custom migration converts legacy categories and dynamic sections into durable container records. — [source L72](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/custom/0004_unify_sections_and_gutters.ts#L72)
- packages/validation/src/shared.ts:81-102 — legacy dynamic-section input is transformed into the current container schema, keeping old board data on the new model. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L81)
- apps/nextjs/src/components/board/sections/grid/grid-editor.tsx:155-179 — the current editor coordinates root and nested container grids through one drag-and-drop provider. — [source L155](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/grid-editor.tsx#L155)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:15-26,35-71 — current container actions are rendered through the container menu used by the replacement surface. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L15)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:24,42-45 — menu offset distinguishes root from nested containers but does not itself prove spacing at every nesting depth. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L24)

**Remaining / follow-up:** Recreate the deeply nested arrangement from both historical screenshots on a migrated V2 board and inspect each menu handle in edit mode. The same user-visible failure can persist across a rewrite; do not require a new issue solely because the model changed.

