import { describe, expect, test } from "vitest";

import { BoardMockBuilder } from "../items/actions/test/mocks/board-mock";
import { DynamicSectionMockBuilder } from "../items/actions/test/mocks/dynamic-section-mock";
import { ItemMockBuilder } from "../items/actions/test/mocks/item-mock";
import { LayoutMockBuilder } from "../items/actions/test/mocks/layout-mock";
import {
  getEstimatedGridWidth,
  getFallbackDimensions,
  getFullWidthSortedSections,
  getStaticGridElements,
  getStaticGridLayouts,
  getStaticGridRowCount,
  getStaticLayoutSelectionCss,
} from "./static-grid-layout";

describe("static grid layout", () => {
  test("sorts layouts and creates breakpoint CSS in mobile-first order", () => {
    const mobile = new LayoutMockBuilder({ id: "mobile", breakpoint: 0, columnCount: 4 }).build();
    const tablet = new LayoutMockBuilder({ id: "tablet", breakpoint: 768, columnCount: 8 }).build();
    const desktop = new LayoutMockBuilder({ id: "desktop", breakpoint: 1024, columnCount: 12 }).build();

    const sortedLayouts = getStaticGridLayouts([desktop, mobile, tablet]);
    const css = getStaticLayoutSelectionCss("board-1", sortedLayouts);

    expect(sortedLayouts.map((layout) => layout.id)).toEqual(["mobile", "tablet", "desktop"]);
    expect(css).toContain('[data-static-layout="mobile"] { display: block; }');
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain('[data-static-layout="tablet"] { display: block; }');
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain('[data-static-layout="desktop"] { display: block; }');
  });

  test("selects and sorts layout-specific section elements", () => {
    const rootSectionId = "root";
    const mobileLayoutId = "mobile";
    const desktopLayoutId = "desktop";
    const mobile = new LayoutMockBuilder({ id: mobileLayoutId, breakpoint: 0, columnCount: 4 }).build();
    const desktop = new LayoutMockBuilder({ id: desktopLayoutId, breakpoint: 1024, columnCount: 12 }).build();
    const item = new ItemMockBuilder({ id: "item" })
      .addLayout({ layoutId: mobileLayoutId, sectionId: rootSectionId, xOffset: 2, yOffset: 1, width: 1, height: 1 })
      .addLayout({ layoutId: desktopLayoutId, sectionId: rootSectionId, xOffset: 0, yOffset: 1, width: 4, height: 2 })
      .build();
    const dynamicSection = new DynamicSectionMockBuilder({ id: "dynamic" })
      .addLayout({
        layoutId: mobileLayoutId,
        parentSectionId: rootSectionId,
        xOffset: 0,
        yOffset: 0,
        width: 2,
        height: 2,
      })
      .addLayout({
        layoutId: desktopLayoutId,
        parentSectionId: rootSectionId,
        xOffset: 4,
        yOffset: 1,
        width: 4,
        height: 2,
      })
      .build();
    const board = new BoardMockBuilder()
      .addEmptySection({ id: rootSectionId, yOffset: 2 })
      .addEmptySection({ id: "first", yOffset: 0 })
      .addSection(dynamicSection)
      .addItem(item)
      .build();
    board.layouts = [desktop, mobile];

    const mobileElements = getStaticGridElements(board, rootSectionId, mobileLayoutId);
    const desktopElements = getStaticGridElements(board, rootSectionId, desktopLayoutId);
    const fullWidthSections = getFullWidthSortedSections(board);

    expect(mobileElements.map((element) => element.id)).toEqual(["dynamic", "item"]);
    expect(desktopElements.map((element) => ({ id: element.id, width: element.width }))).toEqual([
      { id: "item", width: 4 },
      { id: "dynamic", width: 4 },
    ]);
    expect(getStaticGridRowCount(mobileElements)).toBe(2);
    expect(fullWidthSections.map((section) => section.id)).toEqual(["first", rootSectionId]);
  });

  test("estimates grid and item dimensions per layout range", () => {
    const mobile = new LayoutMockBuilder({ id: "mobile", breakpoint: 0, columnCount: 4 }).build();
    const tablet = new LayoutMockBuilder({ id: "tablet", breakpoint: 768, columnCount: 8 }).build();
    const desktop = new LayoutMockBuilder({ id: "desktop", breakpoint: 1024, columnCount: 12 }).build();

    expect(getEstimatedGridWidth(mobile, tablet)).toBe(384);
    expect(getEstimatedGridWidth(tablet, desktop)).toBe(896);
    expect(getEstimatedGridWidth(desktop)).toBe(1280);
    expect(getFallbackDimensions({ width: 2, height: 3 }, 400, 4)).toEqual({ width: 180, height: 280 });
  });
});
