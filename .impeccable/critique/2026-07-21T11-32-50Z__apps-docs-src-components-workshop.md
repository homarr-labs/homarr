---
target: Workshop store in the docs
total_score: 20
p0_count: 1
p1_count: 3
timestamp: 2026-07-21T11-32-50Z
slug: apps-docs-src-components-workshop
---

# Workshop Store Critique

## Design Health Score

| #         | Heuristic                           |     Score | Key issue                                                                                                                                                        |
| --------- | ----------------------------------- | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status         |       1/4 | Fetch failure can show beside an empty-store message, so the system communicates two incompatible states.                                                        |
| 2         | Match between system and real world |       3/4 | Widget, CSS, voting, revisions, and comments use familiar language.                                                                                              |
| 3         | User control and freedom            |       2/4 | Filters are reversible, but the crashed route and failed fetch state offer no useful recovery.                                                                   |
| 4         | Consistency and standards           |       2/4 | The submission editor uses CodeMirror, while revision editing falls back to a textarea; several tiny custom controls do not follow the shared button vocabulary. |
| 5         | Error prevention                    |       2/4 | Submission validation exists, but disabled progression does not explain what is missing and destructive actions use a brief inline confirmation.                 |
| 6         | Recognition rather than recall      |       3/4 | Labels, type choices, and the submission stepper are understandable without documentation.                                                                       |
| 7         | Flexibility and efficiency          |       2/4 | Search covers titles only, signed-out users can select Yours, and installation is reduced to ambiguous Copy and Download actions.                                |
| 8         | Aesthetic and minimalist design     |       3/4 | The restrained visual system is clean, but the browse toolbar and card action rows become dense.                                                                 |
| 9         | Help users recover from errors      |       0/4 | The production route crashes with React error 130; the fetch error has no retry action or useful context.                                                        |
| 10        | Help and documentation              |       2/4 | The editor explains its fields, but the store does not teach the full inspect, trust, download, and install journey.                                             |
| **Total** |                                     | **20/40** | **Needs work before release**                                                                                                                                    |

## Anti-Patterns Verdict

The surface does not look like obvious AI-generated decoration. Its visual restraint, familiar controls, and practical editor are credible product UI. The weakness is product behavior rather than styling: contradictory states, tiny action controls, an overloaded responsive toolbar, and a primary installation journey that is not explicit.

The deterministic Impeccable scan returned zero findings for `apps/docs/src/components/workshop`. This is useful but incomplete. The detector did not catch runtime failures, semantic state conflicts, touch-target sizing, or responsive grouping. Browser evidence found a full route crash, React error 130, and an earlier state that rendered both `Something went wrong.` and `No submissions yet`.

No visual overlay was injected because the available browser evaluation surface is read-only. Screenshots, DOM snapshots, console logs, and source inspection were used instead.

## Overall Impression

The submission modal is now one of the stronger parts of the Workshop. The store around it is not release-ready. The single biggest opportunity is to make discovery and installation a dependable, explicit path: load reliably, show one truthful state, help users evaluate a submission, and give them one obvious next action.

## What Is Working

1. The visual system is restrained and consistent with the Homarr documentation. Typography, color, radii, and spacing do not compete with the content.
2. The submission flow chunks a complex task into Type, Details, and Media. The shared JSON/CSS editor, drag-and-drop import, metadata autofill, and capped media previews reduce creator effort.
3. The detail design exposes revision, author, reports, changelog, source content, and comments. This supports inspection rather than treating community code as a blind install.

## Priority Issues

### P0: The Workshop route crashes in the production docs build

**Why it matters:** No visual polish matters if the store becomes a Docusaurus error page. A fresh independent tab consistently reached `This page crashed` with React error 130. The console attributed the thrown error to the Kapa widget bundle.

**Fix:** Isolate or disable the Kapa script on Workshop routes, prevent third-party widget failures from reaching the Docusaurus route boundary, and add a route-level Workshop boundary that preserves navigation and retry. Reproduce against the built Docker docs image, not only the development server.

**Suggested command:** `$impeccable harden`

### P1: Failure and empty states contradict each other

**Why it matters:** Showing `Something went wrong.` followed by `No submissions yet` makes users believe the store is both broken and empty. The generic message gives no cause and no recovery.

**Fix:** Make loading, failure, empty, and results mutually exclusive. The failure state should say that listings could not be loaded, preserve the current filters, and provide `Try loading again`. Do not render filters or an empty store as authoritative data after the initial request fails.

**Suggested command:** `$impeccable harden`

### P1: Mobile discovery controls are too dense and do not form a responsive hierarchy

**Why it matters:** The toolbar's inner row contains four type choices, sorting, and outdated visibility without wrapping. Most controls are 24 to 28 pixels tall. At narrow widths this is difficult to scan, easy to clip, and below a comfortable touch target.

**Fix:** Put a full-width search first on mobile, keep All, Widgets, and CSS as the primary segmented choice, move sorting and outdated visibility into a compact secondary row or popover, and hide Yours when signed out or make it a sign-in affordance. Use at least 40 to 44 pixel touch targets. Add `aria-pressed` or proper tab semantics to the type filter.

**Suggested command:** `$impeccable adapt`

### P1: The store does not make the install journey obvious

**Why it matters:** A first-time user sees Copy and Download without knowing which is recommended, what will be copied, how to inspect safety, or where the file goes in Homarr. This weakens the store's main purpose.

**Fix:** Make the detail page the decision surface. Use one primary action named for its result, such as `Download widget JSON` or `Copy CSS`, with a short `Install in Homarr` explanation linked to the correct in-app flow. Cards should prioritize title, preview, compatibility, score, and `View details`; secondary utilities should not compete with evaluation.

**Suggested command:** `$impeccable clarify`

### P2: Card and moderation actions are too small and too numerous

**Why it matters:** Vote, copy, download, comment, delete, and report controls compete in a compact footer. Low-contrast icon buttons are hard to discover and hard to use by touch. CSS columns also create a top-to-bottom visual reading order that can differ from the expected row order.

**Fix:** Use a regular responsive grid, remove hover scaling, keep one or two visible card actions, and move owner/moderation actions to a menu. Keep voting visible but increase its target size. Correct the report copy: reports and reporter identities are moderation data, not public social proof.

**Suggested command:** `$impeccable distill`

## Persona Red Flags

### Jordan, first-time self-hoster

Jordan opens Workshop to install a widget. The route can crash before any listing appears. In the partial failure state, Jordan sees both an error and an empty store. If listings load, Copy and Download do not explain the Homarr destination or recommended path. Jordan is likely to leave before installing anything.

### Alex, experienced Homarr administrator

Alex can understand the JSON and appreciates the source viewer, but title-only search and limited filtering make a larger catalog inefficient. Compatibility and required secret information are not prominent at browse time. Tiny moderation and owner controls slow repeated management tasks.

### Morgan, mobile user

Morgan encounters a toolbar with more controls than fit comfortably in one decision group, 24 to 28 pixel targets, and a signed-out Yours filter that leads to an unhelpful no-results state. Submission cards add another dense row of small actions.

## Minor Observations

- Future submission steps are focusable buttons even when clicking them does nothing. Disable them or render non-interactive progress markers.
- The report textarea relies on placeholder text and needs a persistent accessible label.
- The revision editor should reuse the same JSON/CSS CodeMirror component as creation.
- Search should include title, description, and author at minimum.
- The timed inline `Confirm?` deletion pattern is easy to miss and weak for keyboard and touch users.
- The detail-page changelog uses an uppercase tracked label, which is unnecessary in this otherwise restrained interface.
- Loading comments should use the same skeleton vocabulary as listings rather than centered status text.

## Questions to Consider

1. Is Workshop primarily a catalog for discovery, or a technical exchange for copying source? The primary card and detail actions should commit to one answer.
2. Should users evaluate compatibility and required secrets before opening a listing, or only on the detail page?
3. Does Workshop need every moderation and ownership action visible inline, or should those actions live behind a menu?
