import { useMemo } from "react";

import { BoardItemContent } from "../items/item-content";
import { BoardDynamicSection } from "./dynamic-section";
import { GridStackItem } from "./gridstack/gridstack-item";
import { useSectionContext } from "./section-context";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import type { DynamicSection } from "~/app/[locale]/boards/_types";

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
          innerRef={refs.items.current[item.id] as React.RefObject<HTMLDivElement>}
          width={item.width}
          height={item.height}
          xOffset={item.xOffset}
          yOffset={item.yOffset}
          kind={item.kind}
          id={item.id}
          type={item.type}
          minWidth={item.type === 'section' ? Math.max(...item.items.map(item => item.xOffset + item.width), ...board.sections.filter((section): section is DynamicSection => section.kind === 'dynamic' && section.parentSectionId === item.id).map(item => item.xOffset + item.width), 1) : undefined}
          minHeight={item.type === 'section' ? Math.max(...item.items.map(item => item.yOffset  + item.height), ...board.sections.filter((section): section is DynamicSection => section.kind === 'dynamic' && section.parentSectionId === item.id).map(item => item.yOffset + item.height), 1) : undefined}
        >
          {item.type === "item" ? <BoardItemContent item={item} /> : <BoardDynamicSection section={item} />}
        </GridStackItem>
      ))}
    </>
  );
};
