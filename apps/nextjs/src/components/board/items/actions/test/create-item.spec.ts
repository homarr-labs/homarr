import { describe, expect, test, vi } from "vitest";

import type { Board } from "~/app/[locale]/boards/_types";
import { createItemCallback } from "../create-item";
import * as emptyPosition from "../empty-position";
import { createDynamicSection, createEmptySection, createItem } from "./shared";

describe("item actions create-item", () => {
  test("should add it to first section", () => {
    const spy = vi.spyOn(emptyPosition, "getFirstEmptyPosition");
    spy.mockReturnValue({ xOffset: 5, yOffset: 5 });
    const input = {
      sections: [createEmptySection("1", 2), createEmptySection("2", 0), createEmptySection("3", 1)],
      columnCount: 4,
    } satisfies Pick<Board, "sections" | "columnCount">;

    const result = createItemCallback({
      kind: "clock",
    })(input as unknown as Board);

    const firstSection = result.sections.find((section) => section.id === "2");
    const item = firstSection?.items.at(0);
    expect(item).toEqual(expect.objectContaining({ kind: "clock", xOffset: 5, yOffset: 5 }));
    expect(spy).toHaveBeenCalledWith([], input.columnCount);
  });
  test("should correctly pass dynamic section and items to getFirstEmptyPosition", () => {
    const spy = vi.spyOn(emptyPosition, "getFirstEmptyPosition");
    spy.mockReturnValue({ xOffset: 5, yOffset: 5 });
    const firstSection = createEmptySection("2", 0);
    const expectedItem = createItem({ id: "12", xOffset: 1, yOffset: 2, width: 3, height: 2 });
    firstSection.items.push(expectedItem);
    const dynamicSectionInFirst = createDynamicSection({
      id: "4",
      parentSectionId: "2",
      yOffset: 0,
      xOffset: 0,
      width: 2,
      height: 2,
    });

    const input = {
      sections: [
        createEmptySection("1", 2),
        firstSection,
        createEmptySection("3", 1),
        dynamicSectionInFirst,
        createDynamicSection({ id: "5", parentSectionId: "3", yOffset: 1 }),
      ],
      columnCount: 4,
    } satisfies Pick<Board, "sections" | "columnCount">;

    const result = createItemCallback({
      kind: "clock",
    })(input as unknown as Board);

    const firstSectionResult = result.sections.find((section) => section.id === "2");
    const item = firstSectionResult?.items.find((item) => item.id !== "12");
    expect(item).toEqual(expect.objectContaining({ kind: "clock", xOffset: 5, yOffset: 5 }));
    expect(spy).toHaveBeenCalledWith([expectedItem, dynamicSectionInFirst], input.columnCount);
  });
});
