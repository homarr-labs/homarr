# Impact — faster opening, calmer outro

- Opening cover holds through 2.5s and fades out by 3.5s.
- Outro reveals for 1.15s before one simultaneous left/right confetti cannon.
- Top confetti emits for 1.4s, then every particle exits the frame.
- Outro sound uses one stereo cannon hit with no repeated pops.

Delivery: `impact.mp4` — 1920×1080, 60fps, 6760 frames, 112.667s.

Validation:

- `python3 check-scenes.py`
- `node verify.cjs`
- `ffprobe` confirms 60fps and 6760 frames.
- Encoded playback: zero dropped frames during the review check.
- Audio: -17.3 LUFS integrated, -3.0 dBFS true peak.
