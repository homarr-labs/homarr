# Homarr brand art

Share and banner images for Homarr (GitHub social preview, README, Discord), in the look of the v2 motion reel in
`tools/v2-showreel`. Each concept is a function in `concepts.html` that lays out real captures of the demo board around
the reel's 3D lobster. The picked renders live in `docs/img/brand/`.

| #         | Concept                                | Shipped as                                  |
| --------- | -------------------------------------- | ------------------------------------------- |
| 1         | The wall                               | `docs/img/brand/homarr-wall*`               |
| 6         | Constellation                          | `docs/img/brand/homarr-constellation*`      |
| 7         | Built from widgets                     | `docs/img/brand/homarr-built-from-widgets*` |
| 2–5, 8–10 | Earlier directions, kept for iteration | —                                           |

## Render

Needs Google Chrome (override with `CHROME=/path/to/chrome`).

```sh
bun install
node render.mjs            # every concept → out/concept-N.png, 1280×640 at 2×
node render.mjs 1 6        # only some
node render.mjs sheet      # out/concepts-overview.png from the latest renders
W=1920 H=1080 node render.mjs 1   # another canvas size
```

Export a pick to the docs folder: `cwebp -q 90 out/concept-1.png -o ../../docs/img/brand/homarr-wall.webp` for the 2× image,
and `SCALE=1 node render.mjs 1` for the 1280×640 PNG that GitHub's social preview accepts (under 1 MB).

## Inputs

- `shots/` — captures of the demo board's `default` board: full views, and every widget on its own in `shots/widgets/`
  (`NN-kind-WxH.webp`). `assets/board-rects.json` holds each widget's rect in `board-1080.webp`, for the exploded view.
- `assets/lobster-front.webp` — the reel's 3D logo, straight on:
  `PATCH='{"x":0,"y":0,"scale":1.1,"dust":0,"sparks":-1,"rx":0,"ry":0,"rz":0,"antennaAmp":0,"waveL":0,"waveR":0,"antennaLift":0}' node render.mjs lobster outro@3`
  in `tools/v2-showreel`. Update `LOB` in `concepts.html` with the mark's bounding box when it changes.
- `assets/icons`, `assets/integrations-all.json` and `assets/homarr.svg` link to the reel's assets; `assets/blog` links
  to the Homarr 2.0 blog post screenshots.

After replacing captures, run `./gen-sizes.sh` so crops know each image's natural size.
