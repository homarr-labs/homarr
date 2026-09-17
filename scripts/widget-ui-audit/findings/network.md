# Network controls capture findings

The network family was captured from `widget-ui-audit-network` on the local public audit route with `capture.mjs`. The raw fragment is `tools/widget-ui-report/public/manifest-network.json` and the PNGs are under `tools/widget-ui-report/public/screenshots/network/`.

## Coverage

- 4 widget kinds: `dnsHoleSummary`, `dnsHoleControls`, `networkControllerSummary`, and `networkControllerStatus`.
- 10 requested sizes per kind, across all 3 target viewports.
- Each viewport reported 40 mounted widget elements, 40 ready elements, 0 error elements, and no placement overlaps.
- 123 PNGs were emitted: 120 widget crops plus 3 board captures.
- The 1x1 crops are 157x157 pixels and the 5x5 crops are 786x786 pixels at the 1080p viewport, matching the measured grid scale.

## Visual spot checks

The corrected CDP crops preserve the actual transformed widget surface. The 1x1 DNS summary crop renders four compact metric tiles with readable values and labels at the smallest requested size. The 5x5 network-controller summary crop shows its four centered green connection status rows on the expanded dark card. The full network board shows DNS metrics, controller status lists, and mock integration controls fitting across the 12-column layout without visible placement collisions. Some labels are necessarily truncated at 1x1, so the small permutations need a typography/readability review even though their content is present.
