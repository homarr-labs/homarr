import type { inferDefinitionType } from "./_definition";
import { createDefinition } from "./_definition";

export const backgroundImageAttachments = createDefinition(["fixed", "scroll"], { defaultValue: "fixed" });
export const backgroundImageRepeats = createDefinition(["repeat", "repeat-x", "repeat-y", "no-repeat"], {
  defaultValue: "no-repeat",
});
export const backgroundImageSizes = createDefinition(["cover", "contain"], {
  defaultValue: "cover",
});
export const layoutRoles = createDefinition(["mobile", "base", "custom"], { defaultValue: "custom" });

export type BackgroundImageAttachment = inferDefinitionType<typeof backgroundImageAttachments>;
export type BackgroundImageRepeat = inferDefinitionType<typeof backgroundImageRepeats>;
export type BackgroundImageSize = inferDefinitionType<typeof backgroundImageSizes>;
export type LayoutRole = inferDefinitionType<typeof layoutRoles>;

const MAX_LAYOUT_BREAKPOINT = 32767;
const compareBoardLayouts = (
  layoutA: { id: string; breakpoint: number; columnCount: number },
  layoutB: { id: string; breakpoint: number; columnCount: number },
) =>
  layoutA.breakpoint - layoutB.breakpoint ||
  layoutA.columnCount - layoutB.columnCount ||
  layoutA.id.localeCompare(layoutB.id);

export const normalizeBoardLayoutRoles = <
  TLayout extends { id: string; breakpoint: number; columnCount: number; role?: LayoutRole },
>(
  sourceLayouts: TLayout[],
): Array<TLayout & { role: LayoutRole }> => {
  const mobileLayouts = sourceLayouts.filter((layout) => layout.role === "mobile");
  const baseLayouts = sourceLayouts.filter((layout) => layout.role === "base");
  const mobileLayout = mobileLayouts.length === 1 ? mobileLayouts[0] : undefined;
  const baseLayout = baseLayouts.length === 1 ? baseLayouts[0] : undefined;
  const orderedLayouts =
    mobileLayout && baseLayout
      ? [
          mobileLayout,
          ...sourceLayouts.filter((layout) => layout.role === "custom").toSorted(compareBoardLayouts),
          baseLayout,
        ]
      : sourceLayouts.toSorted(compareBoardLayouts);

  let previousBreakpoint = -1;
  return orderedLayouts.map((layout, index) => {
    const remainingLayouts = orderedLayouts.length - index - 1;
    const breakpoint =
      index === 0
        ? 0
        : Math.min(MAX_LAYOUT_BREAKPOINT - remainingLayouts, Math.max(previousBreakpoint + 1, layout.breakpoint));
    const role: LayoutRole = index === 0 ? "mobile" : index === orderedLayouts.length - 1 ? "base" : "custom";
    previousBreakpoint = breakpoint;
    return { ...layout, breakpoint, role };
  });
};
