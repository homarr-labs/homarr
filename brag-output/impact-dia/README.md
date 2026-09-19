# Impact — Dia reveal intro

The opening adapts [Magic UI's Dia Text Reveal](https://magicui.design/docs/components/dia-text-reveal) into the seek-safe HyperFrames timeline.

- The Homarr logo finishes at 0.8s, followed by a 0.3s hold.
- The title uses clipped GPU-transformed layers instead of per-frame gradient regeneration.
- The horizontal gradient sweep runs from 1.1–3.2s, followed by another 0.3s hold.
- The lockup and integration backdrop clear from 3.5–4.0s.
- The main “Homarr v2” title uses `#FA5352` and 12 deterministic animated sparkles.
- The film remains 112.667s.

Delivery: `impact.mp4` — 1920×1080, 60fps, 6760 frames.

Validation:

- HyperFrames check passes across the opening states.
- `node verify.cjs` confirms the sweep, logo, transition, and encoded playback.
- Encoded playback reported zero dropped frames.
