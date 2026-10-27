# Smart container — native Homarr prototype

Issue: [#7393](https://github.com/homarr-labs/homarr/issues/7393). Research: [adaptive-containers.md](../../../../../../../docs/research/adaptive-containers.md).

Run from this checkout, with the project's dependencies and pinned runtime installed:

```sh
mise exec -- bun run prototype:adaptive-containers
```

Open the [prototype board](http://localhost:7394/boards/adaptive-containers-prototype).

This uses Homarr's existing board route, header, theme, responsive layouts, real grid/container renderer, and registry-loaded widgets. One smart container combines two pages:

- **Watching:** Currently playing.
- **Services:** Downloads and Requests share the available space.

Automatic selection chooses Watching while playback is active, otherwise Services. Children within the selected page share a maximum of six rows: a busy widget grows while its idle sibling shrinks. The real Stats, Clock, and App widgets remain outside this container.

Try the activity buttons in the bottom panel with automatic selection enabled:

| Click | Selected page | What moves |
| --- | --- | --- |
| **Watching** | Watching; four sessions | Currently playing fills six rows. |
| **Downloads take over** | Services; six downloads, zero requests | Downloads gets five rows; Requests contracts to one. |
| **Requests take over** | Services; zero downloads, five pending requests | Downloads contracts to one row; Requests gets five. |
| **Both busy** | Services; four downloads and four requests | Each widget gets three rows. |
| **All quiet** | Services; no activity | Each widget contracts to one row; the container shrinks to two rows and the neighboring section moves up. |

Use the container's **Watching/Services** buttons or arrows to page manually. Your page holds through activity changes until **Resume** or **Resume auto**.

Open **Edit container** for the native Mantine preview drawer. **Reclaim unused space** is on by default; switch it off to keep the six-row outer footprint. Apply adopts the preview settings; Cancel retains newer activity while discarding settings changes. **Edit board layout** reveals all saved children together: Currently playing at three rows, Downloads at two, Requests at one. Activity never writes those saved placements.

The drawer's **Playing**, **Downloads**, and **Requests** inputs change record counts directly. Try one download, then six: its native content and height grow together. Quiet widgets use a compact named summary while their native query bodies remain mounted.

The launcher creates a dedicated scratch database under `/tmp/homarr-native-adaptive-prototype/`, seeds this public board, starts a local Redis on port 6397, and starts Homarr on port 7394. It does not use another instance's data. Stop the launcher with Ctrl+C. `PROTOTYPE_DATA_DIR`, `PROTOTYPE_PORT`, `PROTOTYPE_REDIS_PORT`, and `PROTOTYPE_PUBLIC_URL` can override those local defaults. The scratch database is intentionally named `PROTOTYPE-wipe-me.sqlite`; the fixture board is reset by each launch.

Only this development board receives fixture transport for native Currently playing, Downloads, Requests, and Stats queries. Other procedures use Homarr's real API and scratch database. Activity, selection, and settings stay in memory and reset on reload. Hidden item bodies stay mounted.

This is throwaway code on `feat/prototype-adaptive-containers`. Page selection and bounded sizing use explicit fixture counts, not generic DOM measurement or a production relevance algorithm. Fixed membership, mock transport, and display projections do not establish real upstream behavior, authorization, freshness, persistence, or nested/side-lane support. No tests or broad build suites were run for this prototype. No production design has been selected.

The standalone HTML was rejected because it did not show Homarr. The later separate A/B/C variants also missed the clarified combined behavior. Both are superseded by this single smart container.
