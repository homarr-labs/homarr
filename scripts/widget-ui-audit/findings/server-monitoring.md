# Server monitoring

- Board: `widget-ui-audit-server-monitoring`; authenticated demo capture at 1080p, 2k, and MacBook Pro.
- Coverage: 5 widget kinds × 10 sizes × 3 viewports, 153 PNGs including board shots; zero recorded overlaps.
- Runtime state: all 50 widgets mounted and ready at each viewport. Eight 1080p placements still showed loading indicators; no widget error markers were recorded.
- Representative crops: `screenshots/server-monitoring/desktop-1080p/*__01__dockercontainers__1x1.png` and `screenshots/server-monitoring/desktop-1080p/*__12__dockercontainers__5x5.png`.

The 1x1 Docker table is dense: column headings and long values truncate, and the red `3 Issues` pill consumes the upper-left corner. At 5x5 the table exposes all twelve containers, status badges, CPU/memory values, and totals, while leaving a large unused lower area; the larger Coolify and resource cards show the same tendency toward empty space after their primary metrics.
