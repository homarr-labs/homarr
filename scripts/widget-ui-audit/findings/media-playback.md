# Media playback

- Board: `widget-ui-audit-media-playback`; authenticated demo capture at 1080p, 2k, and MacBook Pro.
- Coverage: 4 widget kinds × 10 sizes × 3 viewports, 123 PNGs including board shots; zero recorded overlaps and no error markers.
- Runtime state: all 40 widgets mounted and ready at every viewport with no loading indicators recorded.
- Representative crops: `screenshots/media-playback/desktop-1080p/*__01__audiostats__1x1.png` and `screenshots/media-playback/macbook-pro/*__40__stockprice__5x5.png`.

The 1x1 audio-stats card keeps the three blue totals readable in a narrow centered stack, with the search icon and labels compressed around them. The 5x5 stock-price crop renders the AAPL heading, price change, company name, green area chart, period label, and closing value without clipping, but most of the upper half remains unused before the chart begins.
