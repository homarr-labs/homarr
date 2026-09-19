# Delivery validation

## Final artifact

- `brag.mp4`: 80.000 seconds, 1920×1080, 30fps, 2,400 video frames, H.264 video and AAC stereo audio; 14,684,766 bytes.
- SHA-256: `aa85f852ef6feabb14d7b532fa6a06e5f1ebef6f05b26c74018fd794cc092b64`.
- `brag.jpg`: populated dashboard at 1.6 seconds, selected after visual inspection and baked into frame zero. Extracted frame zero was inspected; comparison with the poster measured 42.96 dB PSNR after video compression.
- Audio is present and non-silent: mean -27.1 dB, peak -7.7 dB. Four-second ending fade preserved.
- The final encoded file was opened at `http://localhost:3018/player.html?v=3`. Browser reported duration 80, 1920×1080 dimensions, active playback and no media error. Native chapter controls also exercised.

## Rendering and iteration

The user approved rendering and further iteration. The initial MP4 was rendered, opened in the browser and reviewed. Subsequent passes enlarged the real workbench/Workshop views, added widget-specific controls and ticking values, and included real branding and permission screens. An encoded-frame review caught the first integration icons starting in the fade zone; the final pass moved their starting position down. The corrected SABnzbd, NZBGet and Deluge opening was verified in both a composition snapshot and the final MP4.

- Full enhanced-composition check: zero errors, zero runtime warnings, 25 sampled times, 78/78 sampled text checks passed contrast. Two transient image-entry crops were informational.
- Focused final marquee check: zero errors or layout issues across six sampled times; 109/109 sampled text checks passed contrast.
- Two static advisory warnings remain: repeated source images in separate scenes and ten sequential scenes on one track. Reviewed frames show the intended visibility.
- Final render used BeginFrame capture with software GPU, six workers; no screenshot fallback.
- Encoded frames covering integrations, board movement, sidebars, widgets, Assistant, Workshop, onboarding, branding, permissions and the closing card were reviewed. Calendar movement and the resize illustration were additionally checked at their action and settled poses.
- First render retained in `review-v1/`; final review captures are in `final-review/`. Logs and intermediate review artifacts are ignored by Git.

## Source and scope

- New branch `feat/v2-brag-demo` based on fetched `origin/release/v2` at `7b2e76ae47ee925a585723c1ae5748fe1bcac825`.
- Brag and its Hyperframes domain skills installed globally under `~/.agents/skills/`.
- All 55 non-Mock integration icons are present locally; the source inventory and composition include all 60 widget kinds.
- Full prompt, storyboard, composition brief, editable source, share caption, video, poster and browser player are present.
- Mobile arrangement, widget previews, resize tile and Assistant exchange are editorial illustrations. The drag footage and product screenshots come from the release article. No live Assistant actions were executed.
- No Homarr application code changed; no application unit tests, Docker build or e2e suite run. These checks validate the film, not the application.
