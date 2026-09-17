# Beszel

- Board: `widget-ui-audit-beszel`; authenticated demo capture at 1080p, 2k, and MacBook Pro.
- Coverage: 4 widget kinds × 10 sizes × 3 viewports, 123 PNGs including board shots; zero recorded overlaps.
- Runtime state: all 40 widgets mounted and ready at every viewport, with no error or loading markers after the 20-second desktop settle pass.
- Representative crops: `screenshots/beszel/desktop-1080p/*__01__beszelsystemtable__1x1.png` and `screenshots/beszel/desktop-1080p/*__40__beszelsystemstats__5x5.png`.

The populated 1x1 system table keeps status dots and percentages visible, but the `System`/`CPU` headings and host names ellipsize aggressively. The settled 5x5 system-stats crop renders CPU, memory, disk, I/O, bandwidth, and Docker charts with readable titles and traces; several axis labels remain tight at the chart edges, and the large card leaves unused space beneath the four chart rows.
