import type { WidgetKind } from "@homarr/definitions";
import type { WidgetContextMenuAction, WidgetMobilePresentation } from "@homarr/widgets";

export const resolveMobileItemPresentation = (
  item: { kind: WidgetKind; height: number },
  mobile: WidgetMobilePresentation | undefined,
) => ({
  width: mobile?.width ?? (item.kind === "app" ? 1 : 2),
  height: mobile?.height ?? (item.kind === "app" ? 1 : Math.max(1, Math.min(item.height, 3))),
  displayMode: mobile?.supportsCompactSummary ? ("mobileSummary" as const) : ("default" as const),
  supportsDetails: mobile?.supportsDetailView === true,
  eager: mobile?.eager ?? (item.kind === "app" || item.kind === "bookmarks"),
  unmountWhenOffscreen: mobile?.eager === true ? false : (mobile?.unmountWhenOffscreen ?? false),
});

export const shouldRenderMobileWidgetActions = ({
  supportsDetails,
  supportsRefresh,
  visibleContextActionCount,
}: {
  supportsDetails: boolean;
  supportsRefresh: boolean;
  visibleContextActionCount: number;
}) => supportsDetails || supportsRefresh || visibleContextActionCount > 0;

export const isMobileContextActionVisible = (action: WidgetContextMenuAction) =>
  action.mobileVisible === true && !action.hidden;
