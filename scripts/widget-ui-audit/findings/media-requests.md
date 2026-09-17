# Media requests capture findings

The media requests family was captured from `widget-ui-audit-media-requests`. The raw fragment is `tools/widget-ui-report/public/manifest-media-requests.json`; PNGs are under `tools/widget-ui-report/public/screenshots/media-requests/`.

## Coverage

- 5 widget kinds, 10 requested sizes, and all 3 target viewports.
- Each viewport reported 50 mounted widgets, 50 ready widgets, 0 capture-time errors, and no placement overlaps.
- 153 PNGs were emitted: 150 widget crops and 3 board captures.

## Visual spot checks

The corrected 1x1 calendar crop contains the complete compact month grid and navigation controls, with dense labels at the smallest size. The 5x5 calendar expands across the card and remains populated; a transient red issue toast is visible at the top edge. The 5x5 request-list crop shows ten media-request rows with poster art, year/status badges, and user approval state. The 5x5 media-server crop shows six active streams with user, device, title, and Direct Play status columns. The board capture confirms the family is present in the 12-column layout with no placement collisions; the visible toast and small-size density merit UI review.
