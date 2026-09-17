# Library capture findings

The library family was captured from `widget-ui-audit-library` with authenticated demo data and full-board document-coordinate crops. The raw fragment is `tools/widget-ui-report/public/manifest-library.json`; PNGs are under `tools/widget-ui-report/public/screenshots/library/`.

## Coverage

- 5 widget kinds, 10 requested sizes, and all 3 target viewports.
- Each viewport reported 50 mounted widgets, 50 ready widgets, 0 capture-time errors, and no placement overlaps.
- 153 PNGs were emitted: 150 widget crops and 3 board captures.

## Visual spot checks

The 1x1 Immich server-stats crop keeps the Users and Photos metrics visible in a compact dark card. At 5x5 it expands to five aligned metrics with values for users, photos, videos, and storage. The 5x5 Immich album carousel uses the full card for a legible Paris image with date and pagination, while the 5x5 Bazarr crop shows the four issue counters and a tall empty center region from the fixture layout. These are content-bearing crops; the smallest sizes should still receive a readability review for truncation and spacing.
