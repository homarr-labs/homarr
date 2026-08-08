import { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import type { itemLayouts, sectionLayouts, sections } from "@homarr/db/schema";
import type { OldmarrConfig } from "@homarr/old-schema";

import { mapLegacyCategoryContainer, mapMainRootSection } from "../mappers/map-section";

interface PreparedSectionBlock {
  id: string;
  legacyId: string;
  position: number;
  type: "container" | "root-content";
}

interface PreparedSections {
  blocks: PreparedSectionBlock[];
  byLegacyId: Map<string, { id: string }>;
  mainRootId: string;
  sections: InferInsertModel<typeof sections>[];
}

interface PreparedItemWithLayouts {
  layouts: InferInsertModel<typeof itemLayouts>[];
}

export const prepareSections = (
  boardId: string,
  { categories, wrappers }: Pick<OldmarrConfig, "categories" | "wrappers">,
): PreparedSections => {
  const mainRoot = mapMainRootSection(boardId);
  const containers = categories.map((category) => ({
    category,
    section: mapLegacyCategoryContainer(boardId, category),
  }));
  const rootContent = wrappers.map((wrapper) => ({ wrapper, id: createId() }));

  return {
    mainRootId: mainRoot.id,
    sections: [mainRoot, ...containers.map(({ section }) => section)],
    byLegacyId: new Map([
      ...containers.map(({ category, section }) => [category.id, { id: section.id }] as const),
      ...rootContent.map(({ wrapper, id }) => [wrapper.id, { id }] as const),
    ]),
    blocks: [
      ...containers.map(({ category, section }) => ({
        id: section.id,
        legacyId: category.id,
        position: category.position,
        type: "container" as const,
      })),
      ...rootContent.map(({ wrapper, id }) => ({
        id,
        legacyId: wrapper.id,
        position: wrapper.position,
        type: "root-content" as const,
      })),
    ].toSorted(
      (first, second) =>
        first.position - second.position ||
        (first.type === second.type
          ? first.legacyId.localeCompare(second.legacyId)
          : first.type === "container"
            ? -1
            : 1),
    ),
  };
};

/**
 * Old Homarr stored each top-level block in its own coordinate space. The
 * current model has one main root and places labelled containers inside it.
 * This compacts those blocks in their legacy order without changing the
 * coordinates of content inside a container.
 */
export const placePreparedSections = (
  preparedSections: PreparedSections,
  preparedItems: PreparedItemWithLayouts[],
  preparedLayouts: { id: string; columnCount: number }[],
): InferInsertModel<typeof sectionLayouts>[] => {
  const result: InferInsertModel<typeof sectionLayouts>[] = [];

  for (const layout of preparedLayouts) {
    let nextRow = 0;

    for (const block of preparedSections.blocks) {
      const content = preparedItems.flatMap((item) =>
        item.layouts.filter((itemLayout) => itemLayout.layoutId === layout.id && itemLayout.sectionId === block.id),
      );
      const contentHeight = Math.max(0, ...content.map((itemLayout) => itemLayout.yOffset + itemLayout.height));

      if (block.type === "container") {
        const height = Math.max(1, contentHeight);
        result.push({
          sectionId: block.id,
          layoutId: layout.id,
          parentSectionId: preparedSections.mainRootId,
          xOffset: 0,
          yOffset: nextRow,
          width: layout.columnCount,
          height,
        });
        nextRow += height;
        continue;
      }

      for (const itemLayout of content) {
        itemLayout.sectionId = preparedSections.mainRootId;
        itemLayout.yOffset += nextRow;
      }
      nextRow += contentHeight;
    }
  }

  return result;
};
