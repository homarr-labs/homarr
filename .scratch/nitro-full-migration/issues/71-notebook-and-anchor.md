# 71: Notebook and Anchor

**What to build:** Preserve browser rich Notebook HTML and selected upstream Anchor notes through saved options, authorized edits and recoverable drafts.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All six options and converted Notebook HTML/Tiptap extension content round-trip; selected Anchor note, toolbar/title/update-time choices and drafts survive reload, with editors loaded only on the approved client boundary.
- [ ] Notebook content updates enforce board-modify/item membership and the specifically approved read-only-checkbox write policy server-side; undefined/inert previews cannot write a saved note.
- [ ] Anchor lookup/read/update enforce one compatible integration, use-before-secret, interact for writes and upstream owner/editor authority; ordinary failures retain drafts, forbidden access clears protected data and triggers authorized recheck.
- [ ] Actual note/input keys isolate pending/save/retry/invalidation; focus/navigation preserves intended drafts and disposes listeners. Future focused content conversion, denied write/revocation and failed-save recovery evidence uses disposable notes at scoped target gates, not a fixture-only completion claim.

## Coverage

`notebook` (3): `showToolbar`, `allowReadOnlyCheck`, `content`; `anchorNote` (3): `noteId`, `showTitle`, `showUpdatedAt`. Primary `anchorNote` input; consumes `text`, `switch`. Primary leaves `widget.notebook.updateContent`, `widget.anchorNotes.listNotes/getNote/updateNote`. Integration family `anchor`, `mock`, single selection. #55 retains native Anchor provider/auth/Stats ownership, not transferred here.

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md) and [notes evidence](../drafts/widgets.md#widget-notes--browser-only-notebook-and-authorized-anchor-editing); persisted types/refinements/placement, stale-versus-forbidden recovery, request-local hydration and browser/server separation remain required.

## Required contracts

Initially unaccepted: #55 Anchor note/result/auth/upstream-edit port; #40 trusted execution; #04 saved/preview/use/interact policy; #67 exact query/error/host; #68 option service/editor; #27/#28 draft/focus/save effects; #05/#07/#08 locale/time/errors; #02/#112 content conversion; #120 DTO/error contributions. Real provider/identity/content/save joins are acceptance evidence, not completed-provider start blockers.

## Decision holds

Q11/Q12 content repository/conversion; Q13 draft save/leave behavior; Q15 affected session reset. Notebook read-only checkbox and preview authority require explicit policy; initial editor SSR/pending and freshness/demo behavior remain held on their paths.

## Ownership

#71 owns local browser editors/drafts, selector and widget read/write orchestration. #55 owns native Anchor, #68 common option persistence, #29 placement. Physical schema/conversion primitives and central assembly stay with #02/#112 and COMPOSITION; allocate local files exclusively before dispatch.
