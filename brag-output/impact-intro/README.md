# Impact — Let's talk about Homarr v2

Seven-second animated intro followed by the existing 61-second upgrade film. Final delivery: 68 seconds, 1920×1080, 60 fps, 4,080 frames.

The headline enters line by line, with a spring entrance for “Homarr v2” and a small subsequent shift. Two staggered columns of real feature captures scroll in opposite directions on the right. Cards preview Custom Widgets v2, containers, advanced widget views, onboarding, the new drag-and-drop system, Assistant tools, header configuration and a custom widget on a dashboard. Container imagery is cropped around actual grouped content; header and Assistant controls use contained previews to preserve their labels.

Three horizontal rows travel in alternating directions. All 55 integrations and their existing local icons come from `../composition/assets/integrations.json`, checked against `packages/definitions/src/integration.ts`; Mock is excluded. The marquee presents the supported integration catalog, not a claim that all integrations are new in v2. The final icon positions hold briefly before the exit wipe.

The original deterministic 120 BPM intro sting adds an accelerating rise and nine TIKS accents, then joins the existing soundtrack at the first Custom Widgets chapter. Intro sound generation is in `soundtrack.py`. Audio is measured, not subjectively auditioned.

`../build-impact-intro.py` creates the opener composition and updated chapter page. `finish.py` joins the rendered intro to the existing film and verifies dimensions, duration, frame rate and frame count. Old cuts are preserved. The remaining capture provenance and limitations are documented in `../impact-upgrade/README.md` and the review page's capture notes.

Final composition check: no lint, runtime, layout or motion errors; 195/195 contrast checks passed. Twelve informational occlusion findings concern offscreen masonry text behind the clipped marquee region. The actual masonry window ends above the marquee and is visually checked.

Review: http://100.111.30.70:3019/impact-intro/

Browser verification: all 55 integrations were fully within the frame during the intro; no missing images or page errors. Intro and handoff playback decoded 552 frames with zero dropped frames, sound enabled, and the Containers chapter seek landed correctly. Evidence: `verification.json`, `intro-browser.png`, `handoff-browser.png`. Final encoded audio: −16.95 LUFS integrated, −2.37 dBFS true peak.

Delivered to Obsidian (100.105.184.54) through Taildrop as `homarr-v2-impact-intro-60fps.mp4`. Receiver accepted all 25,972,661 bytes with HTTP 200. Transfer evidence is stored in `taildrop.log` and `taildrop-response-headers.txt`.
