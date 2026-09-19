# Homarr 2.0 release film

Created with the globally installed [Brag skill](https://github.com/latent-spaces/brag) and Hyperframes 0.8.46. Branch: `feat/v2-brag-demo`, based on fetched `origin/release/v2` at `7b2e76ae47ee925a585723c1ae5748fe1bcac825`.

- `prompt.md`: full reusable creative prompt.
- `brag-plan.md`: 80-second storyboard and claim boundaries.
- `composition-brief.md`: implementation and delivery brief.
- `source-inventory.json`: all 55 non-Mock integrations and 60 widget kinds from this base.
- `composition/index.html`: editable, seekable 1920×1080 composition with local assets.
- `share-copy.txt`: short release caption.
- `check.log`, `snapshot.log`: validation evidence; generated snapshots are in `composition/snapshots/`.

## Preview and render

From `brag-output/composition`:

```sh
npm run check -- --samples 25 --snapshots
npx --yes hyperframes@0.8.46 preview --background --port 3017
# After preview approval:
npm run render -- --quality delivery --fps 30 --output ../brag.mp4
```

For the complete delivery sequence after approval, run `python3 brag-output/deliver.py` from the repository root. It encodes the MP4, selects the settled dashboard at 1.6 seconds as the poster, bakes it into frame zero, and checks resolution, duration, frame count and the presence of audio before replacing the video. Review the resulting `brag.jpg` and `frame-zero.png` before delivery. This sequence has been run successfully for the initial render and subsequent improved versions.

`python3 brag-output/build-composition.py` regenerates HTML from the source inventory and local assets. It reads English widget labels from this Homarr checkout and the globally installed Brag click asset. Product screenshots are copied directly from the release article. Integration logos are copied from the exact URLs in the source registry. `assets/integrations.json` preserves those URLs and their local paths.

## Source coverage

| Release subject | Film treatment |
|---|---|
| General Homarr demo | Populated real board; apps, data and controls |
| Integrations | All 55 non-Mock registry entries in the onboarding-style tilted marquee |
| Widgets | All 60 source kinds in moving rows; six illustrated everyday widgets |
| Drag/drop and Containers | Real article drag recording; resize illustration and Container copy |
| Sidebars and responsive layouts | Highlighted real application rail; illustrative Mobile arrangement |
| Assistant | Real screenshot plus an explicitly illustrative permission/approval sequence |
| Custom Widgets v2 | Real workbench; Beta label; describe/write → preview → share |
| Workshop | Real catalog; widgets and Custom CSS; credentials stay on the instance |
| Onboarding | Real setup studio and six-stage progression |
| Docker/Podman | Real assisted discovery; multi-host copy |
| Header and board switcher | Real source screenshots; shortcut labels |
| Branding and permissions | Real instance-branding and permission-matrix screens; same permission rules for Assistant and MCP |
| MCP | External assistant access callout |
| Database support | Readable SQLite/PostgreSQL and MySQL conversion close |

The release article also covers technical details better left to its written guide: encrypted Custom Widget sources, fixed-origin request limits, legacy JSX migration archives, OAuth/API-key MCP authentication, ZDR provider policy, LDAP/OIDC behavior, request deduplication, parallel startup, Workshop's Docusaurus/PocketBase deployment, and Hostinger deployment. These are not represented as individually demonstrated features in this film. Read `apps/docs/blog/2026/09-03-homarr-2.0/index.mdx` for the complete release and upgrade instructions.

## Asset notes

The film uses actual Homarr release visuals and the original logo. Mobile arrangement, widget previews, resize tile and Assistant conversation are editorial illustrations; they are not browser recordings or evidence of executed live actions. The Calendar movement is the actual release GIF, converted to MP4 with a two-second final-frame hold.

Music is “Happy Beats / Business Moves vol. 12” by ende.app, bundled with Brag; `composition/assets/MUSIC-LICENSE.md` preserves Brag's supplied provenance and its unresolved license-verification note. No public publishing action has been performed. The music is trimmed to 80 seconds with a four-second fade; local frequency-band data drives the red accent. No narration is generated.

## Delivery status

The user approved rendering and continued iteration. `brag.mp4` is the improved final version: 80 seconds, 1920×1080, 30fps, H.264 with AAC audio. `brag.jpg` is the selected populated-dashboard poster, baked into frame zero. `player.html` provides native playback, chapter buttons and an MP4 download link. The first render is retained locally in `review-v1/` for comparison. See `validation.md` for checks and limitations.
