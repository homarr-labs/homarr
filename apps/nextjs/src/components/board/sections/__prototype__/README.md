# Adaptive containers — throwaway behavior prototype

Implementation issue: [#7393](https://github.com/homarr-labs/homarr/issues/7393).
Primary-source research: [adaptive-containers.md](../../../../../../../docs/research/adaptive-containers.md).

Open `adaptive-containers.html` directly in a browser. Nothing to install, no server, no credentials. All scripts and styles are inline. State lives in memory and resets when the file reloads; the clock advances only when you press a control.

**Question:** Can a container hide confirmed-idle Currently playing items without hiding faults, losing control, or rewriting saved layout?

The page compares three behaviors:

- **Hide idle:** the bounded first phase. Supported inactive items disappear and the remaining items move up inside the fixed container footprint.
- **Smart stack:** an experiment in selecting one configured item by explicit relevance, with manual browsing and a hold until automatic selection is resumed.
- **Fit content:** an experiment in bounded item height, existing session details versus a compact card, a configured 9×1 Stats item, and optional container shrinking.

The inactivity grace (10 seconds), freshness ceiling (30 seconds), and selection policy are proposed defaults for discussion. They are not a reproduction of Apple's ranking algorithm. Paused sessions count as current activity. Stats uses mock **Playback sessions**, an existing Jellyfin metric.

Use the guided walkthroughs or change probe results freely. Edit container previews local settings; Apply keeps them in this demo's draft and Cancel restores the opening settings. Board editing reveals saved placements. The state report exposes every item, including invisible ones.

This file deliberately simulates a single full-width arrangement. It does not run Homarr's real queries, permissions, cache, grid, saving, breakpoint selection, nested containers, or drag/resize behavior. A narrower browser previews responsive controls; it does not validate Homarr's Mobile layout. Saving, observing hidden data, and real layout projection still require production implementation and verification.

No design winner has been selected by the maintainer. The prototype and research stay on `feat/prototype-adaptive-containers`; they are not intended to merge as production code. GPT-6.1 Sol agents at extra-high reasoning contributed source research, the pure model, the interactive shell, and independent scenario review.

Manual Chromium review covered the six scenario families, real focus retention during incoming observations, actual Apply/Cancel/Resume controls, and 1440px/390px page widths. The inlined scripts passed a syntax check. No tests were added or run. Detailed evidence and unresolved production checks are recorded in the research note.
