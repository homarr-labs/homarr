/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "vitest";

import type { DynamicSection, Item, Section } from "~/app/[locale]/boards/_types";
import { removeCategoryCallback } from "../remove-category";

describe("Remove Category", () => {
  test.each([
    [3, [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 5, 6], [3, 4], 2],
    [5, [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4], [5, 6], 4],
    [1, [0, 1, 2, 3, 4, 5, 6], [0, 3, 4, 5, 6], [1, 2], 0],
    [3, [0, 3, 6, 7, 8], [0, 7, 8], [3, 6], 0],
  ])(
    "should remove category",
    (removeId, initialYOffsets, expectedYOffsets, expectedRemovals, expectedLocationOfItems) => {
      const sections = createSections(initialYOffsets);

      const input = removeId.toString();

      const result = removeCategoryCallback({ id: input })({ sections } as never);

      expect(result.sections.map((section) => parseInt(section.id, 10))).toEqual(expectedYOffsets);
      expectedRemovals.forEach((expectedRemoval) => {
        expect(result.sections.find((section) => section.id === expectedRemoval.toString())).toBeUndefined();
      });
      const aboveSection = result.sections.find((section) => section.id === expectedLocationOfItems.toString());
      expect(aboveSection?.items.map((item) => parseInt(item.id, 10))).toEqual(
        expect.arrayContaining(expectedRemovals),
      );
    },
  );

  test("should correctly move items to above empty section", () => {
    const initialYOffsets = [0, 1, 2, 3, 4, 5, 6];
    const sections: Section[] = createSections(initialYOffsets);
    const aboveSection = sections.find((section) => section.yOffset === 2)!;
    aboveSection.items = [
      createItem({ id: "above-1" }),
      createItem({ id: "above-2", yOffset: 3, xOffset: 2, height: 2 }),
    ];
    const removedCategory = sections.find((section) => section.yOffset === 3)!;
    removedCategory.items = [
      createItem({ id: "category-1" }),
      createItem({ id: "category-2", yOffset: 2, xOffset: 4, width: 4 }),
    ];
    const removedEmptySection = sections.find((section) => section.yOffset === 4)!;
    removedEmptySection.items = [
      createItem({ id: "below-1", xOffset: 5 }),
      createItem({ id: "below-2", yOffset: 1, xOffset: 1, height: 2 }),
    ];
    sections.push(
      createDynamicSection({
        id: "7",
        parentSectionId: "3",
        yOffset: 7,
        height: 3,
        items: [createItem({ id: "dynamic-1" })],
      }),
    );

    const input = "3";

    const result = removeCategoryCallback({ id: input })({ sections } as never);

    expect(result.sections.map((section) => parseInt(section.id, 10))).toEqual([0, 1, 2, 5, 6, 7]);
    const aboveSectionResult = result.sections.find((section) => section.id === "2")!;
    expect(aboveSectionResult.items).toEqual(
      expect.arrayContaining([
        createItem({ id: "above-1" }),
        createItem({ id: "above-2", yOffset: 3, xOffset: 2, height: 2 }),
        createItem({ id: "category-1", yOffset: 5 }),
        createItem({ id: "category-2", yOffset: 7, xOffset: 4, width: 4 }),
        createItem({ id: "below-1", yOffset: 15, xOffset: 5 }),
        createItem({ id: "below-2", yOffset: 16, xOffset: 1, height: 2 }),
      ]),
    );
    const dynamicSection = result.sections.find((section): section is DynamicSection => section.id === "7")!;
    expect(dynamicSection.yOffset).toBe(12);
    expect(dynamicSection.parentSectionId).toBe("2");
  });
});

const createItem = (item: Partial<{ id: string; width: number; height: number; yOffset: number; xOffset: number }>) => {
  return {
    id: item.id ?? "0",
    kind: "app",
    options: {},
    advancedOptions: {
      customCssClasses: [],
    },
    height: item.height ?? 1,
    width: item.width ?? 1,
    yOffset: item.yOffset ?? 0,
    xOffset: item.xOffset ?? 0,
    integrationIds: [],
  } satisfies Item;
};

const createDynamicSection = (
  section: Partial<
    Pick<DynamicSection, "id" | "height" | "width" | "yOffset" | "xOffset" | "parentSectionId" | "items">
  >,
) => {
  return {
    id: section.id ?? "0",
    kind: "dynamic",
    height: section.height ?? 1,
    width: section.width ?? 1,
    yOffset: section.yOffset ?? 0,
    xOffset: section.xOffset ?? 0,
    parentSectionId: section.parentSectionId ?? "0",
    items: section.items ?? [],
  } satisfies DynamicSection;
};

const createSections = (initialYOffsets: number[]) => {
  return initialYOffsets.map((yOffset, index) => ({
    id: yOffset.toString(),
    kind: index % 2 === 0 ? "empty" : "category",
    name: "Category",
    yOffset,
    xOffset: 0,
    items: [createItem({ id: yOffset.toString() })],
  })) satisfies Section[];
};
