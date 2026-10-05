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
  if (item.type === "section") return <ContainerSectionContentItem item={item} />;

  return (
    <FixedGridItem item={item}>
      {item.kind !== "app" && <WidgetHoverOverlay item={item} integrations={integrations} />}
      <BoardItemContent item={item} />
    </FixedGridItem>
  );
};

const ContainerSectionContentItem = ({ item }: { item: ContainerSectionItem }) => {
  const { minWidth, minHeight } = useMinSize(item);
  return (
    <FixedGridItem item={item} minWidth={minWidth} minHeight={minHeight}>
      <BoardContainerSection section={item} />
    </FixedGridItem>
  );
};

/**
 * Calculates a container's minimum width or height from its direct content.
 */
export const useMinSize = (item: ContainerSectionItem) => {
  const { items, innerSections } = useSectionItems(item.id);
  return {
    minWidth: Math.max(
      1,
      ...items.map((child) => child.xOffset + child.width),
      ...innerSections.map((child) => child.xOffset + child.width),
    ),
    minHeight: Math.max(
      1,
      ...items.map((child) => child.yOffset + child.height),
      ...innerSections.map((child) => child.yOffset + child.height),
    ),
  };
};
