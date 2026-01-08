import type { Modify } from "@homarr/common/types";
import type { InferInsertModel } from "@homarr/db";
import type { itemLayouts, sectionLayouts } from "@homarr/db/schema";

import type { getFullBoardWithWhereAsync } from "./full-board-query";
import { generateResponsiveGridFor } from "./grid-algorithm";

type DynamicSectionLayout = Modify<InferInsertModel<typeof sectionLayouts>, { parentSectionId: string }>;

export const getUpdatedBoardLayout = (
  board: Awaited<ReturnType<typeof getFullBoardWithWhereAsync>>,
  options: {
    previous: {
      layoutId: string;
      columnCount: number;
    };
    current: {
      layoutId: string;
      columnCount: number;
    };
  },
) => {
  const itemSectionLayoutsCollection: InferInsertModel<typeof itemLayouts>[] = [];
  const sectionLayoutsCollection: DynamicSectionLayout[] = [];

  const elements = getElementsForLayout(board, options.previous.layoutId);
  const rootSections = board.sections.filter((section) => section.kind !== "dynamic");

  for (const rootSection of rootSections) {
    const result = generateResponsiveGridFor({
      items: elements,
      previousWidth: options.previous.columnCount,
      width: options.current.columnCount,
      sectionId: rootSection.id,
    });

    itemSectionLayoutsCollection.push(
      ...board.items
        .map((item): InferInsertModel<typeof itemLayouts> | null => {
          const currentElement = result.items.find((element) => element.type === "item" && element.id === item.id);

          if (!currentElement) {
            return null;
          }

          return {
            itemId: item.id,
            layoutId: options.current.layoutId,
            sectionId: currentElement.sectionId,
            height: currentElement.height,
            width: currentElement.width,
            xOffset: currentElement.xOffset,
            yOffset: currentElement.yOffset,
          };
        })
        .filter((item) => item !== null),
    );

    sectionLayoutsCollection.push(
      ...board.sections
        .filter((section) => section.kind === "dynamic")
        .map((section): DynamicSectionLayout | null => {
          const currentElement = result.items.find(
            (element) => element.type === "section" && element.id === section.id,
          );

          if (!currentElement) {
            return null;
          }

          return {
            layoutId: options.current.layoutId,
            sectionId: section.id,
            parentSectionId: currentElement.sectionId,
            height: currentElement.height,
            width: currentElement.width,
            xOffset: currentElement.xOffset,
            yOffset: currentElement.yOffset,
          };
        })
        .filter((section) => section !== null),
    );
  }

  return {
    itemSectionLayouts: itemSectionLayoutsCollection,
    sectionLayouts: sectionLayoutsCollection,
  };
};

const getElementsForLayout = (board: Awaited<ReturnType<typeof getFullBoardWithWhereAsync>>, layoutId: string) => {
  const sectionElements = board.sections
    .filter((section) => section.kind === "dynamic")
    .map((section) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const clonedLayout = section.layouts.find((sectionLayout) => sectionLayout.layoutId === layoutId)!;

      return {
        id: section.id,
        type: "section" as const,
        height: clonedLayout.height,
        width: clonedLayout.width,
        xOffset: clonedLayout.xOffset,
        yOffset: clonedLayout.yOffset,
        sectionId: clonedLayout.parentSectionId,
      };
    });

  const itemElements = board.items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clonedLayout = item.layouts.find((itemLayout) => itemLayout.layoutId === layoutId)!;

    return {
      id: item.id,
      type: "item" as const,
      height: clonedLayout.height,
      width: clonedLayout.width,
      xOffset: clonedLayout.xOffset,
      yOffset: clonedLayout.yOffset,
      sectionId: clonedLayout.sectionId,
    };
  });

  return [...itemElements, ...sectionElements];
};

export const applyAutoLayoutToBoard = (
  board: Awaited<ReturnType<typeof getFullBoardWithWhereAsync>>,
): Awaited<ReturnType<typeof getFullBoardWithWhereAsync>> => {
  if (board.layoutMode === "custom") return board;

  const baseLayout = board.layouts.find((layout) => layout.id === board.baseLayoutId) ?? null;
  if (!baseLayout) return board;

  const updatedLayoutMap = new Map<string, ReturnType<typeof getUpdatedBoardLayout>>();
  for (const layout of board.layouts) {
    if (layout.id === baseLayout.id) continue;

    updatedLayoutMap.set(
      layout.id,
      getUpdatedBoardLayout(board, {
        previous: {
          layoutId: baseLayout.id,
          columnCount: baseLayout.columnCount,
        },
        current: {
          layoutId: layout.id,
          columnCount: layout.columnCount,
        },
      }),
    );
  }

  return {
    ...board,
    items: board.items.map((item) => ({
      ...item,
      layouts: item.layouts.map(
        (layoutSection) =>
          updatedLayoutMap
            .get(layoutSection.layoutId)
            ?.itemSectionLayouts.find(
              (updatedLayoutSection) =>
                updatedLayoutSection.itemId === item.id && updatedLayoutSection.layoutId === layoutSection.layoutId,
            ) ?? layoutSection,
      ),
    })),
    sections: board.sections.map((section) =>
      "layouts" in section
        ? {
            ...section,
            layouts: section.layouts.map(
              (sectionLayout) =>
                updatedLayoutMap
                  .get(sectionLayout.layoutId)
                  ?.sectionLayouts.find(
                    (updatedSectionLayout) =>
                      updatedSectionLayout.sectionId === section.id &&
                      updatedSectionLayout.layoutId === sectionLayout.layoutId,
                  ) ?? sectionLayout,
            ),
          }
        : section,
    ),
  };
};
