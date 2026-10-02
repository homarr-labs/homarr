import type { CSSProperties } from "react";
import type { Icon123, IconProps } from "@tabler/icons-react";

export * from "./src";

export type TablerIcon = typeof Icon123;

export type TablerIconProps = IconProps;

/**
 * Icon sizes tied to Mantine's font-size scale instead of raw pixel
 * numbers, so icons stay legible under the board's CSS zoom scaling.
 * Pass as the `style` prop (not `size`) - tabler icons convert `size` into
 * raw SVG width/height attributes, and CSS `var()` isn't guaranteed to
 * resolve there (Firefox especially). `style` is real CSS, so it does.
 */
export const iconSizes = {
  xs: { width: "var(--mantine-font-size-xs)", height: "var(--mantine-font-size-xs)", flexShrink: 0 },
  sm: { width: "var(--mantine-font-size-sm)", height: "var(--mantine-font-size-sm)", flexShrink: 0 },
  md: { width: "var(--mantine-font-size-md)", height: "var(--mantine-font-size-md)", flexShrink: 0 },
  lg: { width: "var(--mantine-font-size-lg)", height: "var(--mantine-font-size-lg)", flexShrink: 0 },
  xl: { width: "var(--mantine-font-size-xl)", height: "var(--mantine-font-size-xl)", flexShrink: 0 },
} as const satisfies Record<string, CSSProperties>;

/**
 * For icon/element sizes that don't fit one of `iconSizes`' fixed tokens (e.g. a deliberately
 * oversized icon). Same reasoning as `iconSizes`: pass as `style`, not a raw `size` number - a
 * bare pixel value never re-scales when the board's zoom level changes, so it renders at a
 * fraction of its intended size on any board that isn't at 100% zoom (which is most boards with
 * more than a couple of widgets).
 */
export const zoomCompensatedSize = (px: number): CSSProperties => ({
  width: `calc(${px}px * var(--board-canvas-ui-scale, 1))`,
  height: `calc(${px}px * var(--board-canvas-ui-scale, 1))`,
  flexShrink: 0,
});
