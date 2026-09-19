# Impact — the ultimate update

107 seconds, 1920×1080 at 60 fps. Review: http://100.111.30.70:3019/impact-ultimate/

Workshop now leads the feature sequence, followed by Custom Widgets v2 and three labeled concepts. Existing editor, container, sidebar, advanced widget, new widget, onboarding and board-switcher footage is retained. New chapters cover Statistics, all 32 integration additions, the free Homarr provider, and a genuinely customized header. The finale uses the requested wordmark and 640 deterministic confetti particles distributed across the frame and launched from both sides.

## Sources

- Release narrative: `apps/docs/blog/2026/09-03-homarr-2.0/index.mdx`.
- Workshop sharing/installing: `apps/docs/docs/workshop/index.mdx`.
- Free provider: `apps/docs/docs/workshop/homarr-provider.mdx`. The film says 50 request units per UTC day; tool loops can use several units and a shared service limit applies. The “Because I’m nice” quote was requested by Ajnart for this cut.
- Statistics and 32 adapters: https://github.com/homarr-labs/homarr/pull/6863 at `0d78bac75f8b7b888b0146d48fee719963fd5fe2`, open when checked. Both chapters are labeled PR preview. Registry-derived names/icon URLs are in `new-integrations.json`.
- Statistics captures: real local PR instance at port 3138, using local service fixture data. Captures show cards and compact rows, not production telemetry.
- Header: configured through the real application's header preferences, with board link, board switcher, search, Docker, theme, settings, edit and account controls. Original preferences were restored in `finally` and independently compared against the saved original afterward. Assistant is disabled in this instance and is not shown as an available header control.
- Workshop: authentic catalog screenshot bundled in the release blog; the public Workshop URL was unavailable. It is not a fresh live public catalog capture.
- Energy, print queue and release radar cards are explicitly labeled illustrative concepts. The Pokédex is an actual local Custom Widget capture.
- Logo: exact user-provided https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg.
- Sound: synthesized score plus 91 TIKS 0.3.0 (MIT) accents. Measured score: −17.07 LUFS integrated, −2.48 dBTP. This is technical audio validation, not a listening review on the recipient's device.

## Reproduction and evidence

- `../build-impact-ultimate.py`: scene and review-page generation.
- `capture-live.cjs`, `capture-details.cjs`, `capture-header.cjs`: real UI captures.
- `check-scenes.py`, `*-check.log`: sampled layout checks.
- `render-scenes.py`: independent scene renders with HyperFrames 0.8.46.
- `soundtrack.py`, `mix-sound.py`, `sound-cues.json`: audio generation and cue schedule.
- `finish.py`: assembly with preserved footage and final media assertions.
- `verify.cjs`, `verification.json`: Tailscale review-page playback and chapter checks.
- `impact-metadata.json`: encoded duration, frame count, dimensions and audio/video streams.

Previous cuts remain untouched except their review pages link to this version.

## Final verification and delivery

- All eight scene layout checks passed.
- Encoded output: 107 seconds, 6,420 frames, 1920×1080, 60 fps; 31,112,703 bytes.
- Tailscale browser playback: Intro, Statistics, customized header and ending chapters played with zero dropped frames across 746 observed frames, audio unmuted, no page errors.
- All 32 integration icons loaded. Intro is fully visible at time zero; marquee speed remains 70 px/s.
- Delivered to online peer `obsidian` (`100.105.184.54`) as `homarr-v2-impact-ultimate-60fps.mp4`. Native Taildrop endpoint returned HTTP 200 and accepted all 31,112,703 bytes. Delivery evidence is in `taildrop.log` and response files.
