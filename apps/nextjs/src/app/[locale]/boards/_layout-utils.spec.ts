import { describe, expect, test } from "vitest";

import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";
import { ItemMockBuilder } from "~/components/board/items/actions/test/mocks/item-mock";
import { getRepresentativeLayoutWidth, projectBoardLayout } from "./_layout-utils";

const mobile = {
  id: "mobile",
  name: "Mobile",
  columnCount: 3,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 0,
  role: "mobile" as const,
};
const custom = {
  id: "tablet",
  name: "Tablet",
  columnCount: 6,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 480,
  role: "custom" as const,
};
const base = {
  id: "base",
  name: "Base",
  columnCount: 12,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 768,
  role: "base" as const,
};

describe("layout representative widths", () => {
  test("uses a phone width, activation midpoint, and desktop minimum", () => {
    const layouts = [mobile, custom, base];
    expect(getRepresentativeLayoutWidth(mobile, layouts)).toBe(390);
    expect(getRepresentativeLayoutWidth(custom, layouts)).toBe(624);
    expect(getRepresentativeLayoutWidth(base, layouts)).toBe(1280);
  });
});

describe("projectBoardLayout", () => {
  test("returns exact saved positions without recursively re-projecting the active layout", () => {
    const rootSection = new EmptySectionMockBuilder({ id: "root" }).build();
    const container = new ContainerSectionMockBuilder({ id: "container" })
      .addLayout({ layoutId: mobile.id, parentSectionId: rootSection.id, width: 3, height: 2 })
      .build();
    const board = new BoardMockBuilder().addLayout(mobile).addSections([rootSection, container]).build();

    expect(projectBoardLayout(board, mobile, mobile)).toEqual([
      expect.objectContaining({ id: container.id, sectionId: rootSection.id, width: 3, height: 2 }),
    ]);
  });

  test("uses production ordering and sizing for items and containers", () => {
    const rootSection = new EmptySectionMockBuilder({ id: "root" }).build();
    const container = new ContainerSectionMockBuilder({ id: "container" })
      .addLayout({ layoutId: base.id, parentSectionId: rootSection.id, width: 6, height: 3, xOffset: 6, yOffset: 0 })
      .build();
    const rootItem = new ItemMockBuilder({ id: "root-item", kind: "clock" })
      .addLayout({ layoutId: base.id, sectionId: rootSection.id, width: 5, height: 2, xOffset: 0, yOffset: 0 })
      .build();
    const nestedItem = new ItemMockBuilder({ id: "nested-item", kind: "clock" })
      .addLayout({ layoutId: base.id, sectionId: container.id, width: 4, height: 1, xOffset: 0, yOffset: 0 })
      .build();
    const board = new BoardMockBuilder()
      .addLayout(mobile)
      .addSections([rootSection, container])
      .addItems([rootItem, nestedItem])
      .build();

    const projected = projectBoardLayout(board, base, mobile);

    expect(projected.find((element) => element.id === rootItem.id)).toMatchObject({
      type: "item",
      width: 3,
      height: 2,
      xOffset: 0,
      yOffset: 0,
      sectionId: rootSection.id,
    });
    expect(projected.find((element) => element.id === container.id)).toMatchObject({
      type: "section",
      width: 3,
      xOffset: 0,
      yOffset: 2,
      sectionId: rootSection.id,
    });
    expect(projected.find((element) => element.id === nestedItem.id)).toMatchObject({
      type: "item",
      width: 3,
      sectionId: container.id,
    });
  });

  test("ignores missing saved positions and supports empty boards", () => {
    const rootSection = new EmptySectionMockBuilder({ id: "root" }).build();
    const itemWithoutBasePosition = new ItemMockBuilder({ id: "missing", kind: "clock" }).build();
    const board = new BoardMockBuilder()
      .addLayout(mobile)
      .addSection(rootSection)
      .addItem(itemWithoutBasePosition)
      .build();

    expect(projectBoardLayout(board, base, mobile)).toEqual([]);
  });
});
