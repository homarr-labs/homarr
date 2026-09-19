# Impact — Missing a widget?

107-second, 1920×1080, 60 fps revision focused on service data and Custom Widgets.

Flow: intro → find a widget on Workshop → 32 integrations and service data → create a Custom Widget → three concepts → Assistant/BYOK/free usage → existing editor and widget demonstrations → onboarding/header/switcher → ending.

Changes:
- Removed the Statistics chapter, “Your metrics. Your layout”, “ultimate update” claims and “because I'm nice”.
- Integrations now have 12 seconds instead of eight. Staggered arrivals take longer, cards gently float, Spoolman/Homebox/Mealie receive sequential highlights, and the service → data → Custom Widget diagram draws in gradually.
- Widget concepts now use those same three services: filament stock, inventory and meal planning. They are labeled concepts, not functioning widgets or live service results. The workbench and dashboard Pokédex remain actual captures.
- Assistant explains BYOK and a free Homarr-provider social experiment. The headline says 50 free requests per day; the visible qualification explains 50 request units per UTC day, tool-loop accounting and shared limits. The requested “We're not reviewing or reselling your slop, don't worry” copy is scoped to the Homarr provider. A separate line distinguishes external provider data policies.
- Finale retains full-frame confetti and the supplied wordmark; no halo/ring is present.
- TIKS cues and the synthesized score are retimed to the new sequence. The requested Go Funk track is still unavailable after yt-dlp's YouTube and Audiomack attempts; this cut does not contain that track.

Sources: existing verified local captures and release-blog Workshop catalog image; see `../impact-ultimate/README.md`. Integration identities are pinned to PR #6863 commit `0d78bac75f8b7b888b0146d48fee719963fd5fe2` and remain labeled PR preview. BYOK and allowance details are from `apps/docs/docs/management/assistant.mdx` and `apps/docs/docs/workshop/homarr-provider.mdx`. The social-experiment framing and slop wording were supplied by the user.

No product, public deployment or blog changes were made for this revision. Earlier cuts are retained.

Build: `../build-impact-create.py`, `render-scenes.py`, `soundtrack.py`, `mix-sound.py`, `finish.py`. Focused validation: `check-scenes.py`, `verify.cjs`, associated JSON/logs and snapshots.

Review: http://100.111.30.70:3019/impact-create/

Final verification: all six revised scene checks passed; encoded 107 seconds / 6,420 frames / 1920×1080 at 60 fps. Browser playback covered six chapters with zero dropped frames across 1,350 observed frames, no page errors and no missing integration icons. Removed copy and halo elements were checked in each revised source scene. Encoded audio measures −17.06 LUFS integrated and −2.34 dBTP.

Taildrop: Obsidian (100.105.184.54) accepted all 31,095,481 bytes with HTTP 200 as `homarr-v2-missing-a-widget-60fps.mp4`.
