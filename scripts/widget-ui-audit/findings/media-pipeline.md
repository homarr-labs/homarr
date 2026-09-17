# Media pipeline capture findings

The media pipeline family was captured from `widget-ui-audit-media-pipeline` with authenticated demo data and the native viewport capture and full-board crop pipeline. The raw fragment is `tools/widget-ui-report/public/manifest-media-pipeline.json`; PNGs are under `tools/widget-ui-report/public/screenshots/media-pipeline/`.

## Coverage

- 5 widget kinds, 10 requested sizes, and all 3 target viewports.
- Each viewport reported 50 mounted widgets, 50 ready widgets, 0 capture-time errors, and no placement overlaps.
- 153 PNGs were emitted: 150 widget crops and 3 board captures.

## Visual spot checks

The 1x1 media-transcoding crop shows “No integration data available” in the captured state. At 5x5 it expands into five labelled donut metrics with the Workers/Queue/Statistics tabs retained at the bottom. The 5x5 media-missing crop shows five populated release cards under Missing (5/5) and the Queued (4/4) tab, while the 5x5 indexer-manager crop shows the complete ten-row mock indexer list and the Test all action. Large surfaces preserve content and explicit empty/loading states; small surfaces need a readability pass for density.
