import { describe, expect, test } from "vitest";

import { CategorySectionMockBuilder } from "../items/actions/test/mocks/category-section-mock";
import { BoardMockBuilder } from "../items/actions/test/mocks/board-mock";
import { DynamicSectionMockBuilder } from "../items/actions/test/mocks/dynamic-section-mock";
import { EmptySectionMockBuilder } from "../items/actions/test/mocks/empty-section-mock";
import { ItemMockBuilder } from "../items/actions/test/mocks/item-mock";
import { createMobileBoardItems, getMobileRootSection } from "./mobile-layout";

describe("createMobileBoardItems", () => {
  test("selects the first root section in visual order", () => {
    const board = new BoardMockBuilder().build();
    board.sections.push(
      new EmptySectionMockBuilder({ id: "stored-first", xOffset: 0, yOffset: 1 }).build(),
      new EmptySectionMockBuilder({ id: "visually-first", xOffset: 1, yOffset: 0 }).build(),
      new EmptySectionMockBuilder({ id: "visually-second", xOffset: 2, yOffset: 0 }).build(),
    );

    expect(getMobileRootSection(board).id).toBe("visually-first");
  });

  test("flattens categories and dynamic sections in visual order", () => {
    const board = new BoardMockBuilder().build();
    const desktopLayoutId = board.layouts.at(0)?.id;
    if (!desktopLayoutId) throw new Error("Expected a desktop layout");
    const rootSection = new EmptySectionMockBuilder({ id: "root", yOffset: 0 }).build();
    const category = new CategorySectionMockBuilder({ id: "category", yOffset: 1, collapsed: true }).build();
    const dynamicSection = new DynamicSectionMockBuilder({ id: "dynamic" })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: rootSection.id, xOffset: 0, yOffset: 1 })
      .build();
    const nestedDynamicSection = new DynamicSectionMockBuilder({ id: "nested-dynamic" })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: dynamicSection.id, xOffset: 0, yOffset: 1 })
      .build();

    board.sections.push(rootSection, category, dynamicSection, nestedDynamicSection);
    board.items.push(
      new ItemMockBuilder({ id: "second" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: rootSection.id, xOffset: 1, yOffset: 0 })
        .build(),
      new ItemMockBuilder({ id: "first" })
        .addLayout({
          layoutId: desktopLayoutId,
          sectionId: rootSection.id,
          xOffset: 0,
          yOffset: 0,
          width: 8,
          height: 6,
        })
        .build(),
      new ItemMockBuilder({ id: "inside-dynamic" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: dynamicSection.id })
        .build(),
      new ItemMockBuilder({ id: "inside-nested-dynamic" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: nestedDynamicSection.id })
        .build(),
      new ItemMockBuilder({ id: "inside-collapsed-category" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: category.id })
        .build(),
    );

    const result = createMobileBoardItems(board, desktopLayoutId);

    expect(result.map((item) => item.id)).toEqual([
      "first",
      "second",
      "inside-dynamic",
      "inside-nested-dynamic",
      "inside-collapsed-category",
    ]);
    expect(result[0]).toMatchObject({ width: 2, height: 3, xOffset: 0, yOffset: 0 });
  });

  test("uses the desktop layout and keeps orphaned items", () => {
    const board = new BoardMockBuilder().build();
    const legacyLayoutId = board.layouts.at(0)?.id;
    if (!legacyLayoutId) throw new Error("Expected a legacy layout");
    const desktopLayoutId = "desktop";
    board.layouts.push({ id: desktopLayoutId, name: "Large", columnCount: 16, breakpoint: 1200 });
    board.sections.push(new EmptySectionMockBuilder({ id: "root" }).build());
    board.items.push(
      new ItemMockBuilder({ id: "first" })
        .addLayout({ layoutId: legacyLayoutId, sectionId: "root", yOffset: 2 })
        .addLayout({ layoutId: desktopLayoutId, sectionId: "missing-section", yOffset: 0, width: 0, height: 0 })
        .build(),
      new ItemMockBuilder({ id: "second" })
        .addLayout({ layoutId: legacyLayoutId, sectionId: "root", yOffset: 0 })
        .addLayout({ layoutId: desktopLayoutId, sectionId: "root", yOffset: 1 })
        .build(),
    );

    const result = createMobileBoardItems(board, desktopLayoutId);

    expect(result.map((item) => item.id)).toEqual(["second", "first"]);
    expect(result[1]).toMatchObject({ width: 1, height: 1 });
  });
});
