import type { MouseEvent } from "react";

export interface CustomWidgetSourceLocation {
  index: number;
  line: number;
  column: number;
  fragment?: string;
}

export function inspectCustomWidgetSource(
  event: MouseEvent,
  onInspect?: (location: CustomWidgetSourceLocation) => void,
) {
  event.preventDefault();
  event.stopPropagation();
  // Preview themes use a shadow root, so the React target can be retargeted to its host.
  const target = event.nativeEvent
    .composedPath()
    .slice(0, 128)
    .find((entry) => entry instanceof Element && entry.hasAttribute("data-cw-source"));
  if (!(target instanceof Element)) return;
  const source = target.getAttribute("data-cw-source");
  if (!source || source.length > 512) return;
  try {
    const value = JSON.parse(source) as CustomWidgetSourceLocation;
    if (
      Number.isSafeInteger(value.index) &&
      value.index >= 0 &&
      Number.isSafeInteger(value.line) &&
      Number.isSafeInteger(value.column)
    )
      onInspect?.(value);
  } catch {
    /* Ignore elements without interpreter-issued source information. */
  }
}
