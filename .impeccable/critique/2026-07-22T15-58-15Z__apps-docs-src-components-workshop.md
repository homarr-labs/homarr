---
target: Homarr Workshop docs UI
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-07-22T15-58-15Z
slug: apps-docs-src-components-workshop
---

## Design Health Score

| #         | Heuristic                       |     Score | Key Issue                                                                                                                                     |
| --------- | ------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     |         3 | Strong loading, retry, stale-data, pending, and copy states; successful report/edit actions still end silently.                               |
| 2         | Match System / Real World       |         3 | Core Workshop language is clear, but `networkScope`, query/action, and schema terminology assumes technical fluency.                          |
| 3         | User Control and Freedom        |         3 | Back, cancel, clear filters, vote toggling, and destructive confirmations are present; destructive actions have no undo.                      |
| 4         | Consistency and Standards       |         3 | Shared primitives are coherent, though Docusaurus chrome and the denser app-store vocabulary still feel slightly stitched together.           |
| 5         | Error Prevention                |         2 | Validation and confirmations are good, but install safety and credential context appears after download/copy actions on small screens.        |
| 6         | Recognition Rather Than Recall  |         3 | Author, revision, source, filters, and capabilities are visible; installation still asks users to remember a separate Homarr navigation path. |
| 7         | Flexibility and Efficiency      |         2 | Search, filters, sort, drag-and-drop, autofill, and comment shortcuts help; the install handoff remains manual.                               |
| 8         | Aesthetic and Minimalist Design |         2 | Hierarchy is clear, but repeated panels, badges, uppercase metadata labels, and overlapping install actions add noise.                        |
| 9         | Error Recognition and Recovery  |         3 | Errors are plain-language and usually preserve work; the global action error can be detached from the failed control.                         |
| 10        | Help and Documentation          |         3 | The installation guide and source explanation are useful; security terminology lacks inline definitions.                                      |
| **Total** |                                 | **27/40** | **Acceptable, significant improvements needed**                                                                                               |

## Anti-Patterns Verdict

**LLM assessment:** Moderate AI-assisted feel, not outright slop. Domain-specific copy, extensive state coverage, and transparent source/capability information make the feature credible. The generic card grid, repeated rounded panels, icon tiles, uppercase tracked labels, and decorative changelog stripe still expose a component-recipe grammar. It looks competent but not fully edited into a distinctive Homarr store.

**Deterministic scan:** `detect.mjs --json apps/docs/src/components/workshop` exited 0 with exact output `[]`: zero findings, zero triggered rules, and no false positives. The scan found none of Impeccable's deterministic anti-patterns.

**Visual overlays:** No reliable user-visible overlay is available. The independent detector agent had no browser backend. The parent fallback opened a fresh browser tab and visually inspected the listing, but the browser API did not expose a mutable evaluation method for the required preflight, so injection and `[Human]` visibility were correctly skipped. Browser/source evidence was used instead.

## Overall Impression

The Workshop is already substantially better than a generic gallery: it communicates authorship, source code, API capabilities, secrets, revision history, reports, and discussion. The biggest opportunity is to turn that information into a deliberate trust sequence. Today the interface lets the user act first and understand safety later, especially on mobile.

## What's Working

- **State coverage is unusually strong.** Listing failures, stale data, loading skeletons, empty results, filter recovery, comment errors, pending actions, and destructive confirmations have explicit UI.
- **Pre-install transparency is excellent.** API hosts, methods, configurable options, network scope, and credential requirements are visible instead of hidden behind a download.
- **The new primitive layer is coherent.** Search, filters, menus, switches, dialogs, and code presentation share one restrained interaction vocabulary across light and dark themes.

## Priority Issues

### [P1] Safety context arrives after the install action on mobile

**Why it matters:** Download and copy actions appear in the header, while source capabilities, credential requirements, and installation guidance live in an aside that drops below the long source and discussion sections under the desktop breakpoint. A first-time mobile user can commit before understanding what the widget contacts or what secrets it needs.

**Fix:** Put a compact “Before you install” summary immediately below the header on small screens: API hosts, network scopes, credential count, and action/query counts. Keep the full sticky details panel on desktop.

**Suggested command:** `$impeccable layout`

### [P1] Primary button and own-comment contrast misses AA

**Why it matters:** The requested theme's primary red with white foreground is about 3.4:1, below 4.5:1 for small text. The same pairing affects primary buttons and the author's comment bubbles.

**Fix:** Darken the primary red or use a dark foreground in light mode, then verify default buttons and comment bubbles in both themes.

**Suggested command:** `$impeccable colorize`

### [P2] The listing's server-rendered fallback is blank

**Why it matters:** Before hydration, the listing renders an empty block instead of preserving the page's hierarchy and indicating progress. This creates a visible dead zone on slower self-hosted deployments.

**Fix:** Render the listing heading, toolbar silhouette, and shared skeleton cards as the `BrowserOnly` fallback, matching the detail page's loading treatment.

**Suggested command:** `$impeccable harden`

### [P2] Download, copy, source, and install compete for the same task

**Why it matters:** “Download widget,” “Copy JSON,” a full source viewer, and a separate installation panel all appear as parallel paths. Users must infer the recommended workflow.

**Fix:** Make “Download widget JSON” the single primary header action. Keep copy beside the source viewer and place the next import step directly beside or immediately after download.

**Suggested command:** `$impeccable clarify`

### [P2] Repeated metadata scaffolding creates visual noise

**Why it matters:** Card shells, badges, icon tiles, uppercase tracked labels, and the changelog stripe make the detail page feel assembled from recipes and slow scanning.

**Fix:** Flatten the widget details into a compact definition list, reserve badges for status, and remove the decorative changelog stripe.

**Suggested command:** `$impeccable distill`

## Persona Red Flags

**Jordan, first-timer:** “Network scope,” queries, actions, options, and the manifest schema appear without inline explanation. Download versus copy has no stated recommendation. On mobile, credential and installation context arrives after source and discussion.

**Sam, accessibility-dependent user:** Primary controls and author comment bubbles miss small-text contrast. Copy, optimistic votes, filter result changes, and successful report/edit completion do not expose explicit live-region behavior. Gallery controls and dots are below comfortable touch-target sizes.

**Casey, distracted mobile user:** The most important safety panel falls to the bottom, while primary actions stay at the top. Long source and discussion content separate the decision from its explanation. The submit type selector remains dense at narrow widths.

## Minor Observations

- The internal installation guide uses an external-link icon.
- The final publication action says “Submit” rather than “Publish submission.”
- Dark-theme tokens are declared in two blocks, increasing drift risk.
- Screenshot dots rely on opacity alone and lack `aria-current`.
- Successful report and edit actions deserve a small confirmation instead of silent dismissal.

## Questions to Consider

- If source review is important enough to say “Review exactly what will be installed,” why can users download before seeing the capability and credential summary?
- Is Workshop primarily a code catalog or a safety-conscious app store? The current action hierarchy tries to be both.
- Should the successful end state be a downloaded file, or a confident handoff into Homarr with the next step already visible?
