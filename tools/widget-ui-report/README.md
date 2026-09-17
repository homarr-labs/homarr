# Widget UI report

The gallery links to one page per widget (`#/widget/<id>`). Each page contains all ten sizes across three screen profiles, with screen filtering and size shortcuts. “Confirm & next” saves the current capture and scrolls to the next unconfirmed capture. Checkboxes let you undo confirmations.

Historical confirmations are stored under `homarr-widget-review-v1` in localStorage, separately for each widget, size, and screen. Use the same browser and origin (including port) to retain progress. Clearing browser storage removes confirmations. Gallery filters show pending or completed widgets.

When `public/comparison.json` exists, the gallery compares matching captures from its `before` and `after` manifest objects. The comparison file may include the output of `compare-runs.mjs` in `comparisons`; each entry supplies the matched widget, size, viewport, `comparable`, `changed`, and capture hashes. The report uses those fields as recorded evidence and does not infer visual quality from a changed hash. Capture paths in both manifests are relative to `public/` (for example, `runs/before/...`).

Comparison detail pages support Before, After, and Side by side views. Each after-run capture has an `improved`, `acceptable`, or `needs-work` outcome and an optional note. Outcomes are stored under `homarr-widget-review-v2` as `{ runId: { "widget/size/viewport": { outcome, note, beforeHash, afterHash, updatedAt } } }`; the hashes invalidate an assessment if a run is recaptured under the same id. A new after run starts with an unreviewed assessment while v1 confirmations remain historical. For pairs marked `comparable: false` or with failed capture evidence, only `needs-work` can be selected.

Comparison mode adds Changed widgets, Failed captures, Unreviewed, and Needs work filters. If no comparison file is present, the report keeps the single-manifest gallery and v1 confirmation behavior.

The archived original audit is available with `?audit=original` (for example, `http://localhost:4174/?audit=original#/widget/notebook`). This route loads `public/runs/original/manifest.json`, prefixes its capture paths with `runs/original/`, skips comparison loading, and marks the view as a historical unmatched baseline. Existing v1 confirmations are matched against both the prefixed path and the original raw manifest path.

To run an already built report without installing dependencies, run `python3 -m http.server 4174 --directory dist` here and open `http://localhost:4174`.

This is a static, manifest-driven React report for the widget permutation screenshots. It intentionally does not invent placeholder captures: cards without a matching file are shown as missing evidence.

Run it from this directory with `pnpm --ignore-workspace install`, then `pnpm dev`. The production bundle is written to `dist/` with `pnpm build`. Put the generated assets in `public/screenshots/` and the manifest in `public/manifest.json`.

## Manifest contract

The report accepts this shape. Additional fields are ignored, so capture agents can add notes or errors without coordinating a schema change.

```json
{
  "generatedAt": "2026-09-13T12:00:00Z",
  "gridColumns": 12,
  "viewports": [{ "id": "desktop-1080p", "label": "1080p desktop", "width": 1920, "height": 1080 }],
  "sizes": ["1x1", "1x2", "2x1", "2x2", "2x3", "3x2", "3x3", "5x3", "3x5", "5x5"],
  "boards": [
    {
      "id": "system-family",
      "name": "System family",
      "description": "Resource and service widgets",
      "role": "Infrastructure",
      "screenshots": {
        "desktop-1080p": "screenshots/boards/system-family/desktop-1080p.png",
        "desktop-1440p": {
          "path": "screenshots/boards/system-family/desktop-1440p.png",
          "status": "ok",
          "state": "ready"
        }
      },
      "widgets": ["systemResources", "systemDisks"]
    }
  ],
  "widgets": [
    {
      "id": "systemResources",
      "name": "System resources",
      "family": "Infrastructure",
      "description": "CPU, memory and system pressure",
      "role": "Metrics",
      "screenshots": {
        "1x1": {
          "desktop-1080p": "screenshots/widgets/systemResources/1x1/desktop-1080p.png"
        }
      }
    }
  ],
  "errors": []
}
```

Each widget `screenshots[size][viewportId]` value can be a string path, or `{ "path": "...", "status": "ok", "state": "ready" }`. `status` describes file evidence (`ok`, `missing`, or `error`); `state` is optional UI/render state and is kept separate in the report. Missing values are reported as gaps. Board captures use `screenshots[viewportId]` (with the same object form); the legacy singular `screenshot` field is also accepted.

From an installed Homarr checkout, use the repository's Vite binary (this tool is intentionally outside the workspace package globs):

```sh
cd tools/widget-ui-report
../../node_modules/.bin/vite --host 127.0.0.1 --port 4174 --strictPort
```

The current audit app is available at `http://127.0.0.1:4174` while that server runs. Generated screenshots and manifests are kept locally and ignored by Git. From the repository root, assemble and verify all family fragments with:

```sh
node scripts/widget-ui-audit/assemble-report.mjs
node scripts/widget-ui-audit/verify-report.mjs
```

The independent verifier checks all 60 registered types, ten sizes, and three viewports against real PNG files. The verifier also checks viewport/DPR dimensions, duplicate paths, uniform blank images, dashboard overlaps, and recorded readiness. File completeness remains separate from visual approval.

For the built report, serve `dist/` with any static web server. The final local handoff uses:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory tools/widget-ui-report/dist
```

The generated `verification.json` records the independently checked 1,800 widget images and 69 board images (39 family views and 30 isolated Assistant views). It verifies file/geometry coverage, not that every UI layout is issue-free.

To refresh the downloadable site after building, run `python3 scripts/widget-ui-audit/package-report.py` from the repository root. The archive includes the original audit, matched before/after runs, comparison metadata, and React source; intermediate capture attempts stay local.

A failed family-board context remains visible in Capture diagnostics and the Failed captures filter even when an independently captured widget crop is ready. Assistant comparisons use isolated single-instance boards.
