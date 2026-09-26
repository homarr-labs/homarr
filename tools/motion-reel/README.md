# Homarr motion reel

The Homarr 2.0 motion reel: the original feature reel, then everything new in v2. It renders two cuts:

- `homarr-motion-reel.mp4`: the full reel (about 61 s).
- `homarr-motion-reel-v2.mp4`: the v2 part only, from the rotating 3D logo (about 44 s).

Every frame is a pure function of reel time, so any frame can be rendered on its own:
`window.renderFrame(t)` in `reel.js` lays out DOM, SVG, canvas and a three.js layer for reel time `t`. Headless
Chromium screenshots each frame and ffmpeg averages sub-frames into real motion blur. The music and sound effects are
synthesised in Python, so there are no audio assets.

Reel time is a dense 20-bar choreography at 128 BPM. `make_warp.py` maps output time to reel time so each shot slows
down once its content is on screen and every cut lands on a beat. Change pacing there, not in `reel.js`.

## Requirements

Run `pnpm install` at the repository root first; the scripts use its Playwright, esbuild and `@tabler/icons`. You also
need Python 3 with `numpy` and `scipy`, `ffmpeg`, `npm` and network access for the first setup.

## Render

Run everything from this directory.

```sh
python3 setup.py      # fonts, icons and the three.js bundle into assets/
python3 make_warp.py  # warp-a (original reel), warp-b (v2), warp-global and warp-v2cut
python3 score.py global && python3 score.py v2cut
WARP=warp-a.json OUT=chunks-a WORKERS=4 node render.mjs
WARP=warp-b.json OUT=chunks-b WORKERS=4 node render.mjs
./assemble.sh
```

Rendering is CPU-bound and takes about 30 minutes with eight workers. Chunks are resumable: stop the renderer at any
time and run it again. Delete a chunk directory after changing `reel.js` or the warp.

Use `node preview.mjs <reel seconds...>` to screenshot single frames into `preview/` while you work. Scene start times
are listed in the scene headers in `reel.js`.

## Files

| File           | Purpose                                                               |
| -------------- | --------------------------------------------------------------------- |
| `reel.js`      | All scenes, transitions and overlays                                  |
| `index.html`   | Stage, fonts and blur filters                                         |
| `three/`       | 3D logo and wordmark rigs from the 3D logo lab, bundled by `setup.py` |
| `make_warp.py` | Shot lengths in beats and per-shot speed ramps                        |
| `synth.py`     | Drum, bass, pad, bell and effect synthesis                            |
| `score.py`     | Music arrangement and effects placed on reel events through the warp  |
| `render.mjs`   | Parallel Playwright renderer with motion blur                         |
| `assemble.sh`  | Joins chunks, adds the soundtrack and the v2 cut's black pre-roll     |
