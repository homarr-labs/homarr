# Observability

- Board: `widget-ui-audit-observability`; authenticated demo capture at 1080p, 2k, and MacBook Pro.
- Coverage: 5 widget kinds × 10 sizes × 3 viewports, 153 PNGs including board shots; zero recorded overlaps and no error markers.
- Runtime state: all 50 widgets mounted and ready at every viewport with no loading indicators recorded.
- Representative crops: `screenshots/observability/desktop-1440p/*__01__notifications__1x1.png` and `screenshots/observability/desktop-1440p/*__50__umami__5x5.png`.

The 1x1 notification card preserves a notification title, body, age, and icon, but the next card is clipped at the bottom edge. The 5x5 Umami chart has clear headline metrics and three populated bars, while the chart leaves substantial unused vertical space; text remains present but the small sizes need a readability pass for truncation.
