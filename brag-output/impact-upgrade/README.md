# Impact — the upgrade

61-second, 1080p60 release cut. The narrative identifies additions in Homarr 2.0 rather than presenting existing dashboard actions as new features.

- **New drag-and-drop system**: separate real move/resize and Cmd-click multi-select sequences. Removed the simultaneous overview/zoom duplication. The move/resize shot moves one tile down one row, then resizes that same tile from 1×1 to 2×2.
- **Multi-select**: real Command modifier events select two app tiles. The real Move menu places both inside Media services. The captured editor does not implement dragging several selected tiles together, so the film does not simulate it.
- **Containers**: “Goodbye dynamic zones & groups, hello containers!” with containers in bold. A real container holds a clock and the selected Sonarr/Radarr app tiles. The container moves with its contents, collapses, and reopens.
- Remaining feature headings describe the additions: fixed sidebars, advanced widget views, Assistant, onboarding studio, header configuration, and board switcher. Every feature is framed under “HOMARR 2.0 · WHAT’S NEW”.

The dedicated `layout-lab` board exists only in the isolated capture instance at 127.0.0.1:7589. No application source changes, primary-instance edits, or synthetic UI states. Native X11 capture at 3200×2000 / 60 fps with a 2× browser device scale factor. Capture scripts, input events, before/after grid coordinates, and settled states are in `../capture-evidence/record-layout-upgrade.cjs`, `native-input.py`, and `layout-*-events.json`. The editor hint is allowed to dismiss naturally before recording. Normal browser clicks operate the bulk Move menu; drag, resize, modifier selection, and container motion use native pointer/keyboard events.

Earlier limitations remain: header configuration uses a release screenshot because the isolated image predates that UI; Assistant displays a real unsent draft and controls, without fabricated execution; Custom Widgets shows a real widget during a local editing session; integration data is seeded demo data. Previous video versions remain available.

Composition checks passed: zero runtime/layout/motion errors and 23/23 contrast checks. One timeline-density advisory remains, with informational off-canvas positions during the existing Assistant entrance. Focused proof frames cover moving, resizing, selection, the populated container, collapsing, reopening, and the confetti ending. The new mix contains 60 TIKS accents.

Capture verification confirms exact 60 fps frame counts for all three new clips (270, 330, and 360 frames), two selected items after Cmd-click, and both apps sharing the clock’s destination section after the bulk move. Final-settled evidence is stored in `capture-verification.json`.

Final output verified: 61 seconds, 1920×1080, 60 fps, 3,660 frames, 21,940,000 bytes. The encoded audio measures −16.98 LUFS integrated and −2.41 dBFS true peak. Browser playback of the multi-select and container chapters reported zero dropped frames and no browser errors; see `playback-verification.json`.

Review: http://100.111.30.70:3019/impact-upgrade/

Delivered through Taildrop to Obsidian (100.105.184.54) as `homarr-v2-impact-upgrade-60fps.mp4`. Receiver returned HTTP 200 after receiving all 21,940,000 bytes; response and transfer log are saved alongside the video.
