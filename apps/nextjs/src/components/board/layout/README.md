# Fixed dashboard geometry

The board uses fixed logical units:

- one `1 × 1` item is exactly `200 × 200` logical pixels;
- the gap is always `24` logical pixels, giving a `224` pixel track pitch;
- multi-cell items include the gaps between their cells (`2 × 1` is `424 × 200`);
- the canvas is zoomed once with one uniform scale derived from its available width.

Items keep the same logical dimensions at every viewport. The viewport reserves
the painted size while the inner canvas remains at its logical dimensions, so a
widget's `clientWidth`, `clientHeight`, and `ResizeObserver` measurements stay
stable. The visual canvas always fits the available width, the main root keeps
at least one viewport of height, and edit-mode previews extend it downward as
needed.

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
