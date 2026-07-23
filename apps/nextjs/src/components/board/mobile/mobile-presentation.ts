import type { WidgetKind } from "@homarr/definitions";
import type { WidgetMobilePresentation } from "@homarr/widgets";

export const resolveMobileItemPresentation = (
  item: { kind: WidgetKind; height: number },
  mobile: WidgetMobilePresentation | undefined,
) => ({
  width: mobile?.width ?? (item.kind === "app" ? 1 : 2),
  height: mobile?.height ?? (item.kind === "app" ? 1 : Math.max(1, Math.min(item.height, 3))),
  displayMode: mobile?.supportsCompactSummary ? ("mobileSummary" as const) : ("default" as const),
  supportsDetails: mobile?.supportsDetailView ?? item.kind !== "app",
  eager: mobile?.eager ?? (item.kind === "app" || item.kind === "bookmarks"),
});
