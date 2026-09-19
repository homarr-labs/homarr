# Impact — 87 integrations / faster editor demos

Revision of `../impact-workshop/`, preserving previous exports.

- Intro says 87 integrations: 55 existing catalog entries plus the 32 additions in the pinned PR #6863 preview manifest. Marquee speed stays 70 px/s.
- Removed the Assistant social-experiment sentence. BYOK, free usage and privacy copy remain.
- The drag/drop and Cmd-click chapters consume their original ten seconds of footage in 6⅔ seconds at 1.5×. Their chapter starts are 46 and 49 seconds; Containers begins at 52⅔ seconds. Later chapters shift earlier by 3⅓ seconds.
- Go Funk stays at normal speed. All 99 TIKS cues are remapped to the new timing. Final music fade and full-length merch outro are preserved.

Target: 116⅔ seconds, 1920 × 1080, 60 fps, 7,000 frames.

Build: `../build-impact-paced.py`, `check-scenes.py`, `render-scenes.py`, `mix-music.py`, `finish.py`. Validation: `verify.cjs`, logs, snapshots and metadata.

Sources and capture limitations remain documented in `../impact-workshop/README.md`. No product or blog edits were needed for this revision.

Review: http://100.111.30.70:3019/impact-paced/

Verification: both modified scene checks passed; encoded 7,000 frames at 60 fps. Browser playback covered 10 chapters with 17 dropped frames out of 2532 observed and no page errors. Encoded demo frames at 48s and 51s match the previous cut at 49s and 53.5s respectively (SSIM > 0.998), confirming 1.5× timing. Encoded audio: −17.34 LUFS integrated, −3.25 dBTP.

Taildrop: Obsidian (100.105.184.54) accepted all 44,842,911 bytes with HTTP 200 as `homarr-v2-87-integrations-faster-demos-60fps.mp4`.

A follow-up uninterrupted playback of both accelerated demos recorded zero dropped frames across 586 observed browser frames; the initial multi-seek run recorded 17/2,532.
