import type { WidgetComponentProps } from "../../definition";

type SizeProps = Pick<
  WidgetComponentProps<"thingport-libraryStats">,
  "width" | "height" | "displayScale" | "displayMode"
>;

/**
 * The widget's size as the viewer sees it. The board zooms its whole canvas, so `width` and `height` are logical
 * pixels; size breakpoints compare against what is on screen, as the Paperless-ngx and UPS widgets do. The advanced
 * view is drawn unscaled.
 */
export function getRenderedSize({ width, height, displayScale = 1, displayMode = "compact" }: SizeProps) {
  const scale = displayMode === "compact" && Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  return { width: width * scale, height: height * scale, scale };
}
