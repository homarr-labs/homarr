import type { WidgetKind } from "@homarr/definitions";
import type { WidgetContextMenuAction, WidgetMobilePresentation } from "@homarr/widgets";

export const resolveMobileItemPresentation = (
  item: { kind: WidgetKind; height: number },
  mobile: WidgetMobilePresentation | undefined,
) => {
  const supportsCompactSummary = mobile?.supportsCompactSummary === true;
  const supportsDetails = mobile?.supportsDetailView === true;
  const usesGenericSummary = supportsDetails && !supportsCompactSummary;
  const eager = mobile?.eager ?? (item.kind === "app" || item.kind === "bookmarks");

  return {
    width: mobile?.width ?? (item.kind === "app" ? 1 : 2),
    height: mobile?.height ?? (item.kind === "app" || usesGenericSummary ? 1 : Math.max(1, Math.min(item.height, 3))),
    displayMode: supportsCompactSummary || usesGenericSummary ? ("mobileSummary" as const) : ("default" as const),
    supportsDetails,
    usesGenericSummary,
    eager,
    unmountWhenOffscreen: eager ? false : (mobile?.unmountWhenOffscreen ?? false),
  };
};

export const shouldRenderMobileWidgetActions = ({
  supportsDetails,
  supportsRefresh,
  visibleContextActionCount,
}: {
  supportsDetails: boolean;
  supportsRefresh: boolean;
  visibleContextActionCount: number;
}) => supportsDetails || supportsRefresh || visibleContextActionCount > 0;

interface ShouldKeepMobileWidgetActionsMountedInput {
  isNearViewport: boolean;
  actionsOpened: boolean;
  detailsOpened: boolean;
  isOpeningDetails: boolean;
  isCompletingAction: boolean;
  actionTriggerHasFocus: boolean;
}

export const shouldKeepMobileWidgetActionsMounted = ({
  isNearViewport,
  actionsOpened,
  detailsOpened,
  isOpeningDetails,
  isCompletingAction,
  actionTriggerHasFocus,
}: ShouldKeepMobileWidgetActionsMountedInput) =>
  isNearViewport || actionsOpened || detailsOpened || isOpeningDetails || isCompletingAction || actionTriggerHasFocus;

export const isMobileContextActionVisible = (action: WidgetContextMenuAction) =>
  action.mobileVisible === true && !action.hidden;
