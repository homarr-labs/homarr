# Fixed dashboard geometry

The board uses fixed logical units:

- one grid track has a `212 × 212` logical-pixel footprint;
- cards are inset by `10` visual pixels on every side, matching the legacy GridStack gutter;
- multi-cell items occupy complete track footprints (`2 × 1` is `424 × 212` before the card inset);
- the canvas is zoomed once with one uniform scale derived from its available width.

Grid footprints keep the same logical dimensions at every viewport. Widget cards
use a scale-compensated inset so their painted size and content measurements
match the legacy responsive grid. The visual canvas always fits the available
width, every root lane keeps at least one viewport of height, and edit-mode
previews extend it downward as needed.

The read-only renderer should:

1. convert persisted `xOffset/yOffset/width/height` values to `x/y/w/h`;
2. apply collapsed container heights and call `getCollapsedDisplayLayout`;
3. render DOM children in `sortGridPlacementsForReadingOrder` order;
4. position children with `getLogicalItemStyle`;
5. wrap them with `getScaledCanvasStyles` and the read-only semantic helpers.

Edit mode can use any interaction library, but its final coordinates should be
normalized through this core. `placeGridItem` is the deterministic
keyboard/numeric fallback: the active item is pinned while collisions move out
of the way and all other items compact vertically. Pointer coordinates from a
scaled editor can be converted with `toLogicalCanvasPoint`.
