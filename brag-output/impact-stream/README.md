# Homarr v2 — finite integration streams

Revision of `../impact-fade/`. Same 112⅔-second duration, 1920 × 1080, 60 fps.

- Eight finite columns alternate up and down, with distinct initial offsets. Each contains its share of all 87 integrations and one duplicate edge tile so initially cropped items get a complete appearance. There are 95 tiles total; no looping or tile fade. A clean full-frame backdrop sits behind the marquee for three seconds, then fades from 3–4s while the cards remain opaque. The last tiles leave between 5.9s and 6.6s.
- Intro now reads “Announcing Homarr v2”. The player poster shows the revealed intro.
- Community Workshop subtitle: “Finally a way to share your custom CSS with the community.” This capability is documented under “Share widgets and Custom CSS” in the release blog. Custom Widgets v2 keeps its JSX/API description; CSS sharing belongs to Workshop.
- Footage after 16 seconds is assembled from the stable direct export plus the fade revision’s Timer and ending scene renders. The Go Funk + TIKS mix comes from the fade revision, retaining the fixed Timer entrance and seven-second merch giveaway outro.

Review: http://100.111.30.70:3019/impact-stream/

Build: `../build-impact-stream.py`, `check-scenes.py`, `render-scenes.py`, `finish.py`. Checks: `verify.cjs`, check logs, source screenshots, encoded posters. Earlier capture provenance: `../impact-fade/README.md` and `../impact-direct/README.md`.

Source checks passed for both changed scenes. Browser verification confirms all 87 unique integrations become fully visible, eight distinct offsets, alternating motion, and every card stays fully opaque. The backdrop is solid through 3s, reaches 0.5 opacity at 3.5s, and is gone at 4s. Every column is fully outside the canvas by 6.7s. No missing images or browser errors. The repeated edge tiles produce an expected duplicate-image discovery warning.

Final export verified: 6,760 frames, 60 fps, 1920 × 1080, 112.667 seconds. Encoded opening frames confirm the full backdrop, halfway fade, and fully revealed intro. Browser playback/seek checks passed across four chapters with audio enabled, no page errors, and 0 dropped frames among 1,139 observed.

Taildrop delivered the timed-backdrop revision to Obsidian (100.105.184.54) as `homarr-v2-marquee-bg-fade-60fps.mp4`: HTTP 200, 38,164,478 bytes uploaded.
