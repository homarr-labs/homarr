import type { CSSProperties } from "react";

/**
 * Style for a row in a widget that renders a list it does not bound.
 *
 * Widgets like these map over everything an integration returns and put it all in the DOM, while the
 * tile shows a handful of rows. Measured on a real board: the media-releases widget rendered 80 cards
 * into a 539 px tile whose content was 7,206 px tall — 73 of them entirely off-screen, each still
 * costing layout, paint, raster, and an image fetch and decode. Decoded bitmaps are far larger in
 * memory than the files they come from, which is what makes this expensive rather than merely untidy.
 *
 * Applying it there measured, over three repeats per side:
 *   image requests   135 -> 55  (-59%)
 *   layout objects  8346 -> 5117 (-41%)
 *
 * `content-visibility: auto` lets the browser skip all of that for a row that is scrolled out of
 * view. Nothing leaves the DOM, so scrolling, keyboard navigation and in-page search behave exactly
 * as before — this is not virtualisation.
 *
 * `contain-intrinsic-size` supplies a placeholder height for skipped rows. Without it the scrollbar
 * jumps as rows enter and leave, because a skipped row would otherwise measure zero. Pass the
 * approximate row height; being wrong only affects scrollbar smoothness, not correctness.
 *
 * Only worth applying to a list whose length is driven by remote data. On a list that always fits its
 * tile the containment costs a little and saves nothing, and on non-list content — charts, editors,
 * anything that measures itself — skipping layout can be actively wrong.
 */
export const offscreenRowStyle = (approximateRowHeight: number): CSSProperties => ({
  contentVisibility: "auto",
  containIntrinsicSize: `auto ${approximateRowHeight}px`,
});
