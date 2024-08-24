import { useMemo } from "react";

import type { DynamicSection, Item, Section } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import { BoardItemContent } from "../items/item-content";
import { BoardDynamicSection } from "./dynamic-section";
import { GridStackItem } from "./gridstack/gridstack-item";
import { useSectionContext } from "./section-context";

export const SectionContent = () => {
  const { section, innerSections, refs } = useSectionContext();
  const board = useRequiredBoard();
  const sortedItems = useMemo(() => {
    return [
      ...section.items.map((item) => ({ ...item, type: "item" as const })),
      ...innerSections.map((section) => ({ ...section, type: "section" as const })),
    ].sort((itemA, itemB) => {
      if (itemA.yOffset === itemB.yOffset) {
        return itemA.xOffset - itemB.xOffset;
      }

      return itemA.yOffset - itemB.xOffset;
    });
  }, [section.items, innerSections]);

  return (
    <>
      {sortedItems.map((item) => (
        <GridStackItem
          key={item.id}
          innerRef={refs.items.current[item.id]}
          width={item.width}
          height={item.height}
          xOffset={item.xOffset}
          yOffset={item.yOffset}
          kind={item.kind}
          id={item.id}
          type={item.type}
          minWidth={item.type === "section" ? getMinSize("x", item.items, board.sections, item.id) : undefined}
          minHeight={item.type === "section" ? getMinSize("y", item.items, board.sections, item.id) : undefined}
        >
          {item.type === "item" ? <BoardItemContent item={item} /> : <BoardDynamicSection section={item} />}
        </GridStackItem>
      ))}
    </>
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
const getMinSize = (direction: "x" | "y", items: Item[], sections: Section[], parentSectionId: string) => {
  const size = direction === "x" ? "width" : "height";
  return Math.max(
    ...items.map((item) => item[`${direction}Offset`] + item[size]),
    ...sections
      .filter(
        (section): section is DynamicSection =>
          section.kind === "dynamic" && section.parentSectionId === parentSectionId,
      )
      .map((item) => item[`${direction}Offset`] + item[size]),
    1, // Minimum size
  );
};
