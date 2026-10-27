# Adaptive containers — native Homarr prototype

Issue: [#7393](https://github.com/homarr-labs/homarr/issues/7393). Research: [adaptive-containers.md](../../../../../../../docs/research/adaptive-containers.md).

Run from this checkout, with the project's dependencies and pinned runtime installed:

```sh
mise exec -- bun run prototype:adaptive-containers
```

Open `http://localhost:7394/boards/adaptive-containers-prototype?variant=A`.

This is Homarr's existing board route, header, theme, responsive layouts, real container/grid renderer, and registry-loaded Currently playing, Stats, Clock, and App widgets. The prototype changes how the actual items are displayed. It does not recreate widget markup.

The floating bottom switcher and left/right arrows select three shareable alternatives:

- `?variant=A` — Hide idle: remove confirmed-inactive media display rows and compact the real Stats item inside the saved container footprint.
- `?variant=B` — Smart stack: one real widget at a time, with native paging and explicit automatic-selection resume.
- `?variant=C` — Fit content: bounded media height, the configured Stats item below, and optional shrinking/reflow through the actual grid renderer.

Use **Activity** to switch the fixture between playing, paused, empty, unavailable, partial, or stale responses and to advance the simulated clock. Use **Edit container** for a native Mantine live-preview drawer with Apply, Cancel, and a toggle for Homarr's real board editing mode. The drawer has no overlay so the board remains visible while adjusting settings.

The launcher creates a dedicated scratch database under `/tmp/homarr-native-adaptive-prototype/`, seeds this public board, starts a local Redis on port 6397, and starts Homarr on port 7394. It does not use another instance's data. Stop the launcher with Ctrl+C. `PROTOTYPE_DATA_DIR`, `PROTOTYPE_PORT`, `PROTOTYPE_REDIS_PORT`, and `PROTOTYPE_PUBLIC_URL` can override those local defaults. The scratch database is intentionally named `PROTOTYPE-wipe-me.sqlite`; the fixture board is reset by each launch.

Only this development board receives a route-scoped fixture transport. It feeds real typed Currently playing and Stats query responses into the normal query client; other procedures use Homarr's real API and scratch database. Mock session activity, settings preview, and selection stay in memory; refreshing the page resets them, while `variant` stays in the URL. Hidden item bodies stay mounted, and board editing reveals saved placements.

This is throwaway code retained on `feat/prototype-adaptive-containers`, not a production implementation. Fit sizing uses explicit session-count hints, not arbitrary DOM measurement. Mock error responses exercise the native per-source error indication; they do not establish real upstream failure behavior, permission correctness, or terminal ErrorBoundary recovery. No production design has been selected.

The earlier standalone HTML simulation was rejected because it did not show Homarr. It has been removed from this branch's current version; its historical capture remains in commit `45fe28b4c`.
