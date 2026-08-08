import { useMemo } from "react";

import type { RouterOutputs } from "@homarr/api";

import type { ContainerSectionItem, SectionItem } from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { WidgetHoverOverlay } from "../items/widget-hover-overlay";
import { BoardContainerSection } from "./container-section";
import { FixedGridItem } from "./grid/fixed-grid-item";
import { useSectionContext } from "./section-context";
import { useSectionItems } from "./use-section-items";

export const SectionContent = () => {
  const { innerSections, integrations, items } = useSectionContext();

  /** Keep portal content order deterministic across static and edit renderers. */
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
  item: ContainerSectionItem | SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const SectionContentItem = ({ item, integrations }: ItemProps) => {
  const minWidth = useMinSize(item, "x");
  const minHeight = useMinSize(item, "y");
  return (
    <FixedGridItem key={item.id} item={item} minWidth={minWidth} minHeight={minHeight}>
      {item.type === "item" && item.kind !== "app" && <WidgetHoverOverlay item={item} integrations={integrations} />}
      {item.type === "item" ? <BoardItemContent item={item} /> : <BoardContainerSection section={item} />}
    </FixedGridItem>
  );
};

/**
 * Calculates a container's minimum width or height from its direct content.
 */
export const useMinSize = (item: ContainerSectionItem | SectionItem, direction: "x" | "y") => {
  const { items, innerSections } = useSectionItems(item.id);
  if (item.type === "item") return undefined;

  const size = direction === "x" ? "width" : "height";
  return Math.max(
    1,
    ...items.map((childItem) => childItem[`${direction}Offset`] + childItem[size]),
    ...innerSections.map((childSection) => childSection[`${direction}Offset`] + childSection[size]),
  );
};
