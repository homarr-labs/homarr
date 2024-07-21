import { useMemo } from "react";

import { BoardItemContent } from "../items/item-content";
import { BoardDynamicSection } from "./dynamic-section";
import { GridStackItem } from "./gridstack/gridstack-item";
import { useSectionContext } from "./section-context";

export const SectionContent = () => {
  const { section, innerSections, refs } = useSectionContext();
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
        >
          {item.type === "item" ? <BoardItemContent item={item} /> : <BoardDynamicSection section={item} />}
        </GridStackItem>
      ))}
    </>
  );
};
