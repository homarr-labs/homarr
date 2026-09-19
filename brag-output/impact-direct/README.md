# Homarr v2 — Feature overview

Revision of `../impact-paced/`. 112⅔ seconds, 1920 × 1080, 60 fps. Previous exports remain available.

Changes:
- Opening: all 87 integrations (55 existing + 32 additions) scroll in two vertical marquees: the left moves up and the right moves down. The two halves open horizontally from the center over 2.2 seconds, from 4.8s to 7s, revealing the title and masonry previews. The intro lasts nine seconds; no bottom marquee remains. “87 integrations · your existing services, connected” sits at y=1015. “Missing a widget? Make it yours.” is removed.
- Community Workshop replaces “Missing a widget?” and describes publishing, installing, updating, voting, comments and reports.
- Both Custom Widget phases are titled “Custom Widgets v2.” The first describes JSX, API requests, actions and typed settings. The second identifies illustrative API-backed concepts without claiming they are installed widgets.
- Pokédex: CSS clips the existing, authentic 1570 × 610 dashboard capture to its left widget (approximately x=11, y=21, width=580, height=459). This fills a 760 × 602 panel; the image has no invented UI or rewritten content. The intro's dashboard card also focuses on the same widget.
- Assistant and header slides name the feature and its capabilities directly. Statistics and integration descriptions are concrete. BYOK/free allowance/privacy details remain; no social-experiment claim.
- Outro is seven seconds instead of thirteen. Short copy retains the Workshop invitation, top-five/year-end merch, donation thanks and “Stay tuned.” Confetti remains across the frame.
- 1.5× drag/drop and Cmd-click demos are retained. Go Funk is normal speed; TIKS cues follow the shorter outro, with two new swooshes for the opening transition.

Copy evidence:
- `apps/docs/blog/2026/09-03-homarr-2.0/index.mdx`: “Custom Widgets v2 and Workshop,” “Build almost any widget,” “Share widgets and Custom CSS,” “Homarr Assistant,” “Customizable header,” and widget sections.
- The 32 additions and Statistics are separately identified as PR #6863 preview, pinned to `0d78bac75f8b7b888b0146d48fee719963fd5fe2`; they are not presented as claims extracted from the blog. 55 existing + 32 additions = 87 total.
- The specific top-five/year-end prize announcement is the user's supplied commitment; the blog's swag paragraph is less specific. The 50-request allowance is documented in the provider guide and qualified as request units in the slide.

Build: `../build-impact-direct.py`, `check-scenes.py`, `render-scenes.py`, `mix-music.py`, `finish.py`. All eight scene checks passed. The intro's deliberate overlay/occlusion is annotated explicitly; snapshots confirm the title is covered during the marquee, then revealed. Browser geometry checks confirm all 87 integrations pass fully through the viewport before the split opens.

Review: http://100.111.30.70:3019/impact-direct/

No application or blog edits were required. Capture provenance remains in `../impact-workshop/README.md`.

Final verification: 112⅔ seconds, 6,760 frames, 1920 × 1080 at 60 fps. All eight modified scene checks passed. Browser playback and seeking covered 9 chapters, with no page errors; 1 dropped browser frame among 2445 observed. All 87 unique integrations become fully visible before the reveal. Left and right move −354 and +354 pixels vertically across the sampled three seconds; both curtains clear the screen. Encoded audio: −17.32 LUFS integrated and −2.56 dBTP. Encoded frames and transition snapshots were visually inspected.

Taildrop: Obsidian (100.105.184.54) accepted 38,085,771 bytes with HTTP 200 as `homarr-v2-community-workshop-vertical-reveal-60fps.mp4`.
