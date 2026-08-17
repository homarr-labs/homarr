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
