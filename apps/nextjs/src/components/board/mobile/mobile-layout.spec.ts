import { describe, expect, test } from "vitest";

import { CategorySectionMockBuilder } from "../items/actions/test/mocks/category-section-mock";
import { BoardMockBuilder } from "../items/actions/test/mocks/board-mock";
import { DynamicSectionMockBuilder } from "../items/actions/test/mocks/dynamic-section-mock";
import { EmptySectionMockBuilder } from "../items/actions/test/mocks/empty-section-mock";
import { ItemMockBuilder } from "../items/actions/test/mocks/item-mock";
import {
  createMobileBoardElements,
  createMobileBoardItems,
  getMobileRootSection,
  getMobileSectionAnchorId,
} from "./mobile-layout";

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

  test("emits named category and dynamic section headings in visual order", () => {
    const board = new BoardMockBuilder().build();
    const desktopLayoutId = board.layouts.at(0)?.id;
    if (!desktopLayoutId) throw new Error("Expected a desktop layout");

    const category = new CategorySectionMockBuilder({ id: "category", name: "  Services  ", yOffset: 0 }).build();
    const dynamicSection = new DynamicSectionMockBuilder({
      id: "dynamic",
      options: { title: "Monitoring", borderColor: "", customCssClasses: [] },
    })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: category.id, xOffset: 1, yOffset: 0 })
      .build();
    const nestedDynamicSection = new DynamicSectionMockBuilder({
      id: "nested-dynamic",
      options: { title: "Details", borderColor: "", customCssClasses: [] },
    })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: dynamicSection.id, xOffset: 0, yOffset: 1 })
      .build();

    board.sections.push(category, dynamicSection, nestedDynamicSection);
    board.items.push(
      new ItemMockBuilder({ id: "before-dynamic" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: category.id, xOffset: 0, yOffset: 0 })
        .build(),
      new ItemMockBuilder({ id: "inside-dynamic" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: dynamicSection.id, xOffset: 0, yOffset: 0 })
        .build(),
      new ItemMockBuilder({ id: "inside-nested" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: nestedDynamicSection.id })
        .build(),
    );

    const result = createMobileBoardElements(board, desktopLayoutId);

    expect(
      result.map((element) => (element.type === "sectionHeading" ? `heading:${element.title}` : `item:${element.id}`)),
    ).toEqual([
      "heading:Services",
      "item:before-dynamic",
      "heading:Monitoring",
      "item:inside-dynamic",
      "heading:Details",
      "item:inside-nested",
    ]);
    expect(result[0]).toMatchObject({
      type: "sectionHeading",
      sectionId: category.id,
      anchorId: getMobileSectionAnchorId(category.id),
      headingLevel: 2,
    });
    expect(result[2]).toMatchObject({ type: "sectionHeading", headingLevel: 3 });
    expect(result[4]).toMatchObject({ type: "sectionHeading", headingLevel: 4 });
  });

  test("omits headings for empty and unnamed sections while preserving their items", () => {
    const board = new BoardMockBuilder().build();
    const desktopLayoutId = board.layouts.at(0)?.id;
    if (!desktopLayoutId) throw new Error("Expected a desktop layout");

    const emptyNamedCategory = new CategorySectionMockBuilder({
      id: "empty-category",
      name: "Empty",
      yOffset: 0,
    }).build();
    const unnamedCategory = new CategorySectionMockBuilder({ id: "unnamed-category", name: "  ", yOffset: 1 }).build();
    const unnamedDynamicSection = new DynamicSectionMockBuilder({ id: "unnamed-dynamic" })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: unnamedCategory.id })
      .build();

    board.sections.push(emptyNamedCategory, unnamedCategory, unnamedDynamicSection);
    board.items.push(
      new ItemMockBuilder({ id: "inside-unnamed" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: unnamedDynamicSection.id })
        .build(),
      new ItemMockBuilder({ id: "orphan" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: "missing-section" })
        .build(),
    );

    const result = createMobileBoardElements(board, desktopLayoutId);

    expect(result.map((element) => element.type)).toEqual(["item", "item"]);
    expect(result.map((element) => element.id)).toEqual(["inside-unnamed", "orphan"]);
  });

  test("does not skip heading levels when unnamed sections are flattened", () => {
    const board = new BoardMockBuilder().build();
    const desktopLayoutId = board.layouts.at(0)?.id;
    if (!desktopLayoutId) throw new Error("Expected a desktop layout");

    const unnamedCategory = new CategorySectionMockBuilder({ id: "category", name: " " }).build();
    const namedDynamicSection = new DynamicSectionMockBuilder({
      id: "dynamic",
      options: { title: "Services", borderColor: "", customCssClasses: [] },
    })
      .addLayout({ layoutId: desktopLayoutId, parentSectionId: unnamedCategory.id })
      .build();

    board.sections.push(unnamedCategory, namedDynamicSection);
    board.items.push(
      new ItemMockBuilder({ id: "item" })
        .addLayout({ layoutId: desktopLayoutId, sectionId: namedDynamicSection.id })
        .build(),
    );

    expect(createMobileBoardElements(board, desktopLayoutId)[0]).toMatchObject({
      type: "sectionHeading",
      title: "Services",
      headingLevel: 2,
    });
  });
});
