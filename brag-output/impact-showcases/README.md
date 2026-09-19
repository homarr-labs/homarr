# Impact — focused showcases

53 seconds, 1920×1080, 60 fps. Extends the approved 43-second cut with eight seconds for actual sidebar configuration and scrolling, plus six seconds for keyboard board switching.

- Outgoing Custom Widget and Assistant context panels now fade completely to zero. Removed translucent background screenshots from onboarding, header configuration, and the ending.
- Sidebar: a real settings recording enables Right sidebar and selects a one-column width; a separate uninterrupted board recording scrolls 630 CSS pixels while the Sonarr launcher remains at exactly x=1467.75, y=86.984375. All app launchers stay fixed. The isolated demo's existing enabled layout is retained; the temporary settings demonstration is not saved over its item positions.
- Board switcher: real Shift+C input, two board previews, typing `def`, Enter, then the populated Default board. The close-up uses the same continuous video as the full-board destination. No synthetic result or screenshot substitution.
- Settings and switcher sources are recorded at 3200×2000 / 60 fps with a 2× browser device scale factor, so enlarged UI text remains readable. Sidebar scrolling is 1600×1000 / 60 fps. Native X11 capture, real browser inputs, no GIF conversion or frame interpolation.
- Existing drag/resize, advanced widget, Custom Widget, and Assistant treatments are retained. Confetti and the original score remain, retimed to 53 seconds with 54 TIKS accents.

Source recordings, browser automation, input timestamps, and exact fixed-sidebar coordinates are in `../capture-evidence/record-showcases*.cjs`, `*-source.mp4`, and `*-events.json`. Derived crops live in `../composition/assets/showcases/`. The cut is reproducible with `../build-impact-showcases.py`; source media processing is a separate preparation step.

Existing limitations: Header studio is a cropped release screenshot because the isolated demo image predates that feature. Assistant shows a real unsent draft and real controls, without fabricating generated output or tool execution. The Custom Widget capture is a live widget in a local board editing session. Demo integrations use seeded mock data.

Validation: composition check passed with zero runtime/layout/motion errors and 27/27 contrast checks. One timeline-density advisory and two informational entrance-overlap findings remain. The script `check-handoffs.cjs` directly seeks the earlier context panels and verifies opacity zero; the obsolete onboarding/header/ending background images are absent.

Final encode verified: 3180 frames, 53 seconds, 1920×1080 / 60 fps, AAC stereo. Encoded audio measured −17.02 LUFS integrated and −2.83 dBFS true peak. Audio was measured, not subjectively auditioned.

Delivered through native Taildrop to obsidian (100.105.184.54) as `homarr-v2-impact-showcases-60fps.mp4`. HTTP 200 acknowledged 21,895,805 bytes. Review: http://100.111.30.70:3019/impact-showcases/ .

Tailscale playback: no browser errors; sidebar segment 0 dropped / 221 frames, combined sidebar and switcher review 1 dropped / 549 frames. Screenshots are taken with playback paused to avoid screenshot-induced stalls.
