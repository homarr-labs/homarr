# Content

## Capture completeness

- Board: `widget-ui-audit-content` at `http://localhost:3001/boards/widget-ui-audit-content`.
- Authenticated demo capture covers ten sizes each for `rssFeed`, `bookmarks`, `iframe`, `video`, and `notebook` on the 12-column layout (50 widgets per viewport).
- `desktop-1080p`, `desktop-1440p`, and `macbook-pro` each captured 50/50 ready widgets, with 0 widget errors and 0 layout overlaps. The manifest contains 153 PNGs: 50 widget crops plus one full-board image for each viewport.
- The MacBook viewport is configured at DPR 2; its 1x1 crop is 246x246 and the captured larger crops preserve their intended card geometry.

## UI observations

- The 1x1 RSS card truncates the article title (`SecretGate – Hardene...`) while retaining the relative age (`6 hours ago` in the fresh frame). The 1x1 notebook is severely constrained: its logo shrinks to a mark, the heading wraps and clips, and the word-count footer overlaps the content. At 5x5 the notebook renders its logo, heading, body copy, and link with substantial unused vertical space.
- The RSS feed and bookmarks have useful content at small sizes. The iframe now renders the deterministic local dashboard background SVG: at 1x1 it is mostly a narrow dark center band between white areas, while 5x5 exposes the full blue wave background. The video widget keeps a visible `Play Video` affordance.

## Data limitations

- RSS content is public feed data and can change or fail independently of the UI. Bookmarks, video source, and notebook text are fixture values. The iframe uses a local static SVG fixture, so these crops validate layout and scaling rather than remote iframe availability.
