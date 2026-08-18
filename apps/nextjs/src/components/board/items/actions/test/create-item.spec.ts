import { afterEach, describe, expect, test, vi } from "vitest";

import * as boardContext from "@homarr/boards/context";

import { createItemCallback } from "../create-item";
import * as emptyPositionModule from "../empty-position";
import { BoardMockBuilder } from "./mocks/board-mock";
import { ContainerSectionMockBuilder } from "./mocks/container-section-mock";
import { ItemMockBuilder } from "./mocks/item-mock";
import { LayoutMockBuilder } from "./mocks/layout-mock";

describe("item actions create-item", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("clips oversized widgets to each layout's column count", () => {
    const board = new BoardMockBuilder()
      .addLayout({ id: "mobile", name: "Mobile", role: "mobile", columnCount: 3, breakpoint: 0 })
      .addEmptySection({ id: "section" })
      .build();
    const baseLayout = board.layouts.find((layout) => layout.role === "base");

    const result = createItemCallback({ kind: "mediaMissing" })(board);

    const createdItem = result.items.at(0);
    expect(createdItem?.layouts.find((layout) => layout.layoutId === "mobile")?.width).toBe(3);
    expect(createdItem?.layouts.find((layout) => layout.layoutId === baseLayout?.id)?.width).toBe(4);
  });

  test("should add it to first section", () => {
    // Arrange
    const itemKind = "clock";
    const emptyPosition = { xOffset: 5, yOffset: 5 };
    const firstSectionId = "2";
    const layoutId = "1";

    const layout = new LayoutMockBuilder({ id: layoutId, columnCount: 4 }).build();
    const board = new BoardMockBuilder()
      .addLayout(layout)
      .addLayout()
      .addEmptySection({ id: "1", yOffset: 2 })
      .addEmptySection({ id: firstSectionId, yOffset: 0 })
      .addEmptySection({ id: "3", yOffset: 1 })
      .build();

    const emptyPositionSpy = vi.spyOn(emptyPositionModule, "getFirstEmptyPosition");
    emptyPositionSpy.mockReturnValue(emptyPosition);
    const layoutsSpy = vi.spyOn(boardContext, "getBoardLayouts");
    layoutsSpy.mockReturnValue([layoutId]);

    // Act
    const result = createItemCallback({
      kind: itemKind,
    })(board);

    // Assert
    const item = result.items.at(0);
    expect(item).toEqual(
      expect.objectContaining({
        kind: itemKind,
        layouts: [
          {
            layoutId,
            height: 1,
            width: 1,
            ...emptyPosition,
            sectionId: firstSectionId,
          },
        ],
      }),
    );
    expect(emptyPositionSpy).toHaveBeenCalledWith([], layout.columnCount, undefined, { height: 1, width: 1 });
  });
  test("should correctly pass containers and items to getFirstEmptyPosition", () => {
    // Arrange
    const itemKind = "clock";
    const emptyPosition = { xOffset: 5, yOffset: 5 };
    const firstSectionId = "2";
    const layoutId = "1";
    const itemAndSectionPosition = { height: 2, width: 3, yOffset: 2, xOffset: 1 };

    const layout = new LayoutMockBuilder({ id: layoutId, columnCount: 4 }).build();
    const containerInFirstSection = new ContainerSectionMockBuilder({ id: "4" })
      .addLayout({ ...itemAndSectionPosition, layoutId, parentSectionId: firstSectionId })
      .build();
    const itemInFirstSection = new ItemMockBuilder({ id: "12" })
      .addLayout({ ...itemAndSectionPosition, layoutId, sectionId: firstSectionId })
      .build();
    const otherContainer = new ContainerSectionMockBuilder({ id: "5" }).addLayout({ layoutId }).build();
    const otherItem = new ItemMockBuilder({ id: "13" }).addLayout({ layoutId }).build();
    const board = new BoardMockBuilder()
      .addLayout(layout)
      .addEmptySection({ id: "1", yOffset: 2 })
      .addEmptySection({ id: firstSectionId, yOffset: 0 })
      .addEmptySection({ id: "3", yOffset: 1 })
      .addSection(containerInFirstSection)
      .addSection(otherContainer)
      .addItem(itemInFirstSection)
      .addItem(otherItem)
      .build();

    const spy = vi.spyOn(emptyPositionModule, "getFirstEmptyPosition");
    spy.mockReturnValue(emptyPosition);
    const layoutsSpy = vi.spyOn(boardContext, "getBoardLayouts");
    layoutsSpy.mockReturnValue([layoutId]);

    // Act
    const result = createItemCallback({
      kind: itemKind,
    })(board);

    // Assert
    expect(result.items.length).toBe(3);
    const createdItem = result.items.find(
      (candidate) => candidate.id !== itemInFirstSection.id && candidate.id !== otherItem.id,
    );
    expect(createdItem).toEqual(
      expect.objectContaining({
        kind: itemKind,
        layouts: [{ ...emptyPosition, height: 1, width: 1, sectionId: firstSectionId, layoutId }],
      }),
    );
    expect(spy).toHaveBeenCalledWith(
      [expect.objectContaining(itemAndSectionPosition), expect.objectContaining(itemAndSectionPosition)],
      layout.columnCount,
      undefined,
      { height: 1, width: 1 },
    );
  });

  test("should fit a wide widget to every board layout", () => {
    const layoutId = "compact-layout";
    const layout = new LayoutMockBuilder({ id: layoutId, columnCount: 4 }).build();
    const board = new BoardMockBuilder().addLayout(layout).addEmptySection({ id: "section" }).build();
    const layoutsSpy = vi.spyOn(boardContext, "getBoardLayouts");
    layoutsSpy.mockReturnValue([layoutId]);
    const emptyPositionSpy = vi.spyOn(emptyPositionModule, "getFirstEmptyPosition");
    emptyPositionSpy.mockReturnValue({ xOffset: 0, yOffset: 0 });

    const result = createItemCallback({ kind: "assistant" })(board);

    expect(result.items.at(0)?.layouts.at(0)).toEqual(
      expect.objectContaining({ width: layout.columnCount, height: 4 }),
    );
    expect(emptyPositionSpy).toHaveBeenCalledWith([], layout.columnCount, undefined, {
      width: layout.columnCount,
      height: 4,
    });
  });

  test("places a new item directly in the requested container", () => {
    const board = new BoardMockBuilder()
      .addEmptySection({ id: "canvas" })
      .addSection(
        new ContainerSectionMockBuilder({ id: "media" })
          .addLayout({ layoutId: "layout", parentSectionId: "canvas", width: 4, height: 3 })
          .build(),
      )
      .build();
    const layout = board.layouts.at(0);
    if (!layout) throw new Error("Expected a board layout");
    layout.id = "layout";

    const result = createItemCallback({ id: "calendar", kind: "mediaMissing", targetSectionId: "media" })(board);

    expect(result.items.find((item) => item.id === "calendar")?.layouts).toEqual([
      expect.objectContaining({ layoutId: "layout", sectionId: "media", width: 4 }),
    ]);
  });

  test("omits layouts where the requested container has no layout entry", () => {
    const board = new BoardMockBuilder()
      .addLayout({ id: "mobile", name: "Mobile", role: "mobile", columnCount: 3, breakpoint: 0 })
      .addEmptySection({ id: "canvas" })
      .addSection(
        new ContainerSectionMockBuilder({ id: "media" })
          .addLayout({ layoutId: "base", parentSectionId: "canvas", width: 4, height: 3 })
          .build(),
      )
      .build();
    const baseLayout = board.layouts.find((layout) => layout.role === "base");
    if (!baseLayout) throw new Error("Expected a base layout");
    baseLayout.id = "base";

    const result = createItemCallback({ id: "calendar", kind: "clock", targetSectionId: "media" })(board);

    expect(result.items.find((item) => item.id === "calendar")?.layouts).toEqual([
      expect.objectContaining({ layoutId: "base", sectionId: "media" }),
    ]);
  });

  test("sizes a new item for its requested rail and omits layouts where that rail is hidden", () => {
    const board = new BoardMockBuilder()
      .addLayout({ id: "mobile", name: "Mobile", role: "mobile", columnCount: 3, breakpoint: 0 })
      .addEmptySection({ id: "canvas" })
      .addEmptySection({ id: "left-rail", xOffset: -1 })
      .build();
    const baseLayout = board.layouts.find((layout) => layout.role === "base");
    if (!baseLayout) throw new Error("Expected a base layout");
    baseLayout.leftGutterColumnCount = 2;

    const result = createItemCallback({ id: "missing", kind: "mediaMissing", targetSectionId: "left-rail" })(board);

    expect(result.items.find((item) => item.id === "missing")?.layouts).toEqual([
      expect.objectContaining({ layoutId: baseLayout.id, sectionId: "left-rail", width: 2 }),
    ]);
  });

  test("falls back to the main canvas instead of creating a ghost item for a disabled rail", () => {
    const board = new BoardMockBuilder()
      .addEmptySection({ id: "canvas" })
      .addEmptySection({ id: "left-rail", xOffset: -1 })
      .build();

    const result = createItemCallback({ id: "clock", kind: "clock", targetSectionId: "left-rail" })(board);

    expect(result.items.find((item) => item.id === "clock")?.layouts).toEqual([
      expect.objectContaining({ sectionId: "canvas" }),
    ]);
  });

  test("falls back to the main canvas when a requested destination no longer exists", () => {
    const board = new BoardMockBuilder().addEmptySection({ id: "canvas" }).build();
    const layout = board.layouts.at(0);
    if (!layout) throw new Error("Expected a board layout");
    layout.id = "layout";

    const result = createItemCallback({ id: "clock", kind: "clock", targetSectionId: "removed" })(board);

    expect(result.items.find((item) => item.id === "clock")?.layouts).toEqual([
      expect.objectContaining({ layoutId: "layout", sectionId: "canvas" }),
    ]);
  });

  test("commits configured advanced options in the creation transaction", () => {
    const board = new BoardMockBuilder().addEmptySection({ id: "canvas" }).build();
    const advancedOptions = { title: "Kitchen", customCssClasses: ["compact"], borderColor: "#abc" };

    const result = createItemCallback({ id: "clock", kind: "clock", advancedOptions })(board);

    expect(result.items.find((item) => item.id === "clock")?.advancedOptions).toEqual(advancedOptions);
  });

  test("clamps wide defaults and places below a full automatic canvas", () => {
    const board = new BoardMockBuilder().addEmptySection({ id: "canvas", yOffset: 0 }).build();
    const layout = board.layouts[0];
    if (!layout) throw new Error("Expected a board layout");
    layout.id = "layout";
    layout.columnCount = 1;
    board.items.push(
      new ItemMockBuilder({ id: "existing" })
        .addLayout({ layoutId: layout.id, sectionId: "canvas", width: 1, height: 1 })
        .build(),
    );

    const result = createItemCallback({ id: "created", kind: "mediaMissing" })(board);
    const created = result.items.find((item) => item.id === "created");

    expect(created?.layouts).toEqual([
      expect.objectContaining({
        layoutId: layout.id,
        sectionId: "canvas",
        width: 1,
        height: 3,
        xOffset: 0,
        yOffset: 1,
      }),
    ]);
  });
});
