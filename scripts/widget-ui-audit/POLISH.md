# Widget polish verification

## Evidence sets

- `tools/widget-ui-report/public/runs/original`: preserved historical audit; not a matched baseline.
- `tools/widget-ui-report/public/runs/before`: fresh baseline after fixture repairs, before widget edits.
- `tools/widget-ui-report/public/runs/after`: final screenshots after responsive fixes.

Run captures with the repository Node version (`mise exec --`) and the isolated demo database. Use `scripts/widget-ui-audit/run-all.mjs <origin> <output-directory>` to capture the thirteen family boards and ten isolated Assistant boards. Each run records source, dirty source fingerprint, fixture revision, and a unique run ID. Do not mix source changes into an in-progress run.

After both runs, execute `scripts/widget-ui-audit/compare-runs.mjs`. It writes `public/comparison.json` and hashes each image pair. Changed pixels alone do not prove improvement: clocks, public feeds, and timestamps can differ.

## Capture acceptance

Capture readiness polls for up to thirty seconds after lazy-content warming. It checks the expected item count, fonts, images, loading/error indicators, known unavailable states, visible notifications, and stable geometry. Diagnostic screenshots are retained. Failed captures cannot be marked as improved or acceptable in the comparison gallery.

The ten isolated Assistant captures replace the corresponding family-board crops in the matrix. The family-board images still document the single-active-instance restriction. These idle Assistant surfaces do not validate provider responses.

## Review checklist

- All ten sizes and three screen profiles exist for every widget.
- Every changed widget's thirty pairs have been visually inspected.
- Essential metrics and controls remain legible at small sizes.
- No footer/content overlap or clipped chart axes.
- Hidden secondary content remains reachable via existing detail views or scrolling.
- Large cards use useful rows/charts/device columns without stretching sparse content artificially.
- Notebook editing, scrolling, details views, and review persistence work.
- Unresolved captures and “Needs work” reviews remain open.

## Current verification status

Implementation and the complete fresh capture are finished. All 300 changed-widget pairs were inspected. The matrix has 1,800 widget images and 69 board images; 1,770 widget comparisons are ready and 30 Releases captures remain failed because GitHub returned an anonymous API rate limit. See REVIEW.md and the run verification files. User reviews start unreviewed; no capture was automatically approved.
