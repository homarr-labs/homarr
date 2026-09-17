# Responsive widget review

## Evidence

The original audit remains archived separately. The matched baseline uses the repaired local Custom Widget definition and isolated idle Assistant boards. Both matched runs use a 12-column board, ten widget sizes, and Chromium at 1920×1080, 2560×1440, and 1512×982 at DPR 2.

Run IDs, Git revision, dirty source fingerprint, fixture revision, capture outcomes, and image hashes are recorded in the manifests. Dynamic values and timestamps can differ between runs; pixel differences alone are not improvements.

## Changes

- Notebook: reserve space for document statistics and errors, allow the content area to shrink and scroll, constrain embedded images on compact surfaces, and reduce default heading density while retaining explicitly authored styling.
- Docker: prioritize configured identity/status columns before secondary metrics on narrow cards. Footer metrics use actual rendered width. Existing detail access remains the route to omitted columns.
- Notifications: reduce compact padding and line counts; keep full title/body text available on hover.
- Network summary: fit all four essential health states on narrow cards, remove list indentation, and move secondary values out of the smallest layouts while retaining hover access.
- Firewall: smaller rings and tighter header spacing keep CPU and memory percentages visible together.
- Umami: omit secondary statistics and axis labels when height or width is insufficient, leaving more space for the chart.
- UPS: use actual compact dimensions and arrange device cards into columns on wide surfaces.
- Beszel: use actual grid dimensions and complete compact CPU/memory rows, keep secondary metrics in existing details, account for gaps in grid height, allow large charts to use more space, and reserve axis gutters based on display scale. Compact charts omit secondary time labels without reducing essential text size.
- Media transcoding: show loading while the initial query is pending instead of presenting a false empty state.

## Intentionally unchanged

Large stock and Umami charts already fill their usable area. Coolify and Traefik show all available fixture entries; empty lower space is appropriate for their sparse data. Bazarr's large surface retains its existing four-stat layout. These cases are not counted as fixes.

The old calendar toast did not reproduce in the fresh baseline. Media transcoding's fresh loaded baseline is consistent across sizes. These observations do not establish live integration correctness.

## Verification

Both matched runs contain all 1,800 canonical widget captures and 69 board images: 39 family views plus 30 isolated Assistant views. PNG integrity, dimensions/DPR, duplicate paths, blank-image checks, and dashboard overlap checks found no file or geometry issues.

The final after run is `589cfec1-5cc0-493b-a3b2-2c2ba86d8bbf`; the before run is `db11d6ba-f253-4049-b5e8-6d12e9ea98f3`. All final fragments share the same source fingerprint and fixture revision. See each run's `verification.json` for the machine result.

**Readiness is not fully passing:** 1,770 widget comparisons are ready, while 30 Releases captures remain failed. Three media-pipeline board views are therefore diagnostic. The verifier exits nonzero for these failures; image completeness is not used to override them. All 30 isolated Assistant captures are ready.

Manual review covered all thirty permutations of each of the ten changed widgets (300 pairs). No remaining layout defect was found in those changed-widget comparisons after the Beszel grid refinement. Notebook, compact metrics and chart gutters show improvements; larger already-correct layouts and loaded media-transcoding surfaces remain acceptable unchanged cases. New user assessments remain unreviewed.

| Reviewed widget | Pairs inspected |
| --- | ---: |
| Notebook | 30 |
| Docker | 30 |
| Notifications | 30 |
| Network summary | 30 |
| Firewall | 30 |
| Umami | 30 |
| UPS | 30 |
| Beszel grid | 30 |
| Beszel charts | 30 |
| Media transcoding | 30 |

Focused existing layout/display checks and widget/database type checks passed. The report production build passed. Focused lint completed with nonblocking style/accessibility warnings, including a preference for a native element instead of the metric group role. No unrelated suites or full Homarr production build were run.

Interaction checks exercised Notebook editing and scrolling, Docker details and table scrolling, UPS device scrolling, firewall expansion and scrolling, notifications scrolling, media-transcoding Statistics/Workers, Beszel chart scrolling, and scrolling the compact Beszel grid to the last device and opening its details dialog. Notebook changes made for the interaction check were not saved into the fixtures.

## Limitations and open evidence

- **Open / Needs work before visual approval — Releases (30 captures):** the live GitHub provider returned HTTP 403 with its 60 anonymous requests exhausted. Provider throttling outlasted the bounded capture window. The reported reset was 2026-09-17 17:12:59 UTC. No credential or canned response was substituted. Recapture this family after provider availability returns; until then, its images stay failed and excluded from successful comparisons.
- An earlier Home/MacBook family capture exposed Assistant's single-active-instance restriction. It did not recur in the final run. The earlier failed board image and its original run provenance remain linked under retained diagnostics; it is not counted as a matched success. Canonical Assistant comparisons use isolated idle boards, and no provider messages were sent.
- Demo fixtures establish layout behavior, not live integration correctness.
- MacBook coverage is Chromium at the specified viewport and DPR, not native Safari.
- Dynamic values, ordering and timestamps differ. Image hashes detect changes, not quality.
- Some lower-board crops contain the Next.js development indicator. It is part of the capture environment, not a widget control.
- Original audit images are preserved as historical evidence and are not substituted for the fresh matched baseline.
