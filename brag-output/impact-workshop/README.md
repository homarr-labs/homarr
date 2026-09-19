# Impact — Workshop / Go Funk

120-second, 1920 × 1080, 60 fps revision. Earlier cuts are preserved.

- The user-supplied Go Funk by Infraction replaces the synthesized background score. 99 timed TIKS accents remain. Music fades out over the final four seconds.
- The integration title is “32 new integrations.” The subtitle frames them as building blocks for dashboards and Custom Widgets. The three final highlights now start 0.75 seconds apart instead of 2.25 seconds apart; the chapter is ten seconds.
- Assistant is presented as a super-fast, free way to create a Custom Widget, “On us.” BYOK, 50 free requests per day, request-unit/tool-loop accounting and provider privacy qualifications remain visible.
- Air Quality, Countdown and Timer share equal cards. Real Timer start/pause/reset footage is shown at 490 × 258 pixels, matching the other previews instead of filling half the screen.
- The exact user-supplied Statistics screenshot has a dedicated six-second scene. Its service names and values are preserved.
- The 13-second finale says “See you on the Workshop.” It includes the user's Top 5 submissions / exclusive Homarr merch / donations / stay tuned message. Repeated confetti bursts cover the full frame. No logo halo is present.

The real editor, Cmd-click multi-select, containers, fixed sidebar, advanced-view Shift gesture, onboarding, customized header and board-switcher demonstrations remain. Intro starts fully visible; the marquee remains 70 pixels per second.

Source provenance: previous cut `../impact-create/README.md` and original capture notes `../impact-ultimate/README.md`. PR #6863 preview is pinned to commit `0d78bac75f8b7b888b0146d48fee719963fd5fe2`; concepts remain explicitly labeled. The merch statement and Statistics image were supplied by the user. Workshop uses the release-blog catalog image. Assistant captures show actual controls and an unsent draft, not a simulated completed generation.

Build: `../build-impact-workshop.py`, `check-scenes.py`, `render-scenes.py`, `mix-music.py`, `finish.py`. Browser verification: `verify.cjs`.

Review: http://100.111.30.70:3019/impact-workshop/

All five changed scene checks passed. Final encoded playback and delivery evidence are recorded below after assembly.

Final verification: 120 seconds, 7,200 frames, 1920 × 1080 at 60 fps. Browser playback covered eight chapters with zero dropped frames across 1,918 observed frames, no page errors and no missing integration icons. Timer presentation is 490 × 258; the supplied Statistics image loads at its original 3262-pixel width. Encoded audio measures −17.31 LUFS integrated and −2.41 dBTP. The poster is the actual first frame. Changed encoded frames were visually inspected. Audio checks are technical; no subjective listening claim is made.

Taildrop: Obsidian (100.105.184.54) accepted all 46,440,969 bytes with HTTP 200 as `homarr-v2-workshop-go-funk-60fps.mp4`.
