import { useMemo } from "react";

import type { RouterOutputs } from "@homarr/api";

import type { DynamicSectionItem, SectionItem } from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { WidgetHoverOverlay } from "../items/widget-hover-overlay";
import { BoardDynamicSection } from "./dynamic-section";
import { FixedGridItem } from "./grid/fixed-grid-item";
import { useSectionContext } from "./section-context";
import { useSectionItems } from "./use-section-items";

export const SectionContent = () => {
  const { innerSections, integrations, items } = useSectionContext();

  /**
   * IMPORTANT: THE ORDER OF THE BELOW ITEMS HAS TO MATCH THE ORDER OF
   * THE ITEMS RENDERED WITH GRIDSTACK, OTHERWISE THE ITEMS WILL BE MIXED UP
   * @see https://github.com/homarr-labs/homarr/pull/1770
   */
  const sortedItems = useMemo(() => {
    return [...items, ...innerSections].toSorted((itemA, itemB) => {
      if (itemA.yOffset === itemB.yOffset) {
        return itemA.xOffset - itemB.xOffset;
      }

      return itemA.yOffset - itemB.yOffset;
    });
  }, [items, innerSections]);

  return (
    <>
      {sortedItems.map((item) => (
        <SectionContentItem key={item.id} item={item} integrations={integrations} />
      ))}
    </>
  );
};

interface ItemProps {
  item: DynamicSectionItem | SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const SectionContentItem = ({ item, integrations }: ItemProps) => {
  const minWidth = useMinSize(item, "x");
  const minHeight = useMinSize(item, "y");
  return (
    <FixedGridItem key={item.id} item={item} minWidth={minWidth} minHeight={minHeight}>
      {item.type === "item" && item.kind !== "app" && <WidgetHoverOverlay item={item} integrations={integrations} />}
      {item.type === "item" ? <BoardItemContent item={item} /> : <BoardDynamicSection section={item} />}
    </FixedGridItem>
  );
};

/**
 * Calculates the min width / height of a section by taking the maximum of
 * the sum of the offset and size of all items and dynamic sections inside.
 * @param direction either "x" or "y"
 * @param items items of the section
 * @param sections sections of the board to look for dynamic sections
 * @param parentSectionId the id of the section we want to calculate the min size for
 * @returns the min size
 */
export const useMinSize = (item: DynamicSectionItem | SectionItem, direction: "x" | "y") => {
  const { items, innerSections } = useSectionItems(item.id);
  if (item.type === "item") return undefined;

  const size = direction === "x" ? "width" : "height";
  return Math.max(
    1,
    ...items.map((childItem) => childItem[`${direction}Offset`] + childItem[size]),
    ...innerSections.map((childSection) => childSection[`${direction}Offset`] + childSection[size]),
  );
};
