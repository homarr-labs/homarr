# Tools and integrations

## Capture completeness

- Board: `widget-ui-audit-tools` at `http://localhost:3001/boards/widget-ui-audit-tools`.
- Authenticated demo capture covers ten sizes each for `app`, `customApi`, `llamacpp`, `wud`, and `traefik` on the 12-column layout (50 widgets per viewport).
- `desktop-1080p`, `desktop-1440p`, and `macbook-pro` each captured 50/50 ready widgets, with 0 widget errors and 0 layout overlaps. The manifest contains 153 PNGs: 50 widget crops plus one full-board image for each viewport.
- The MacBook viewport is configured at DPR 2; its 1x1 crop is 246x246 and the captured larger crops preserve their intended card geometry.

## UI observations

- The 1x1 app card clearly presents the `Homarr Docs` label and icon. The 5x5 Traefik card expands into a healthy integration summary with version, router and entry-point totals, protocol breakdowns, and `WEB`, `WEBSecure`, and `METRICS` tags while retaining a large empty lower area.
- Llama.cpp shows throughput and model/request metrics at larger sizes. What's Up Docker exposes update and monitored-container counts. These cards keep their primary metrics visible across the size set.

## Data limitations

- App, Llama.cpp, What's Up Docker, and Traefik values are seeded demo/integration fixtures and do not establish reachability or correctness against those external services. The custom API permutations display `Custom widget unavailable / Remove from board` in this environment because the custom widget definition/workshop source was unavailable; those screenshots document the fallback state rather than a successful custom API render.
