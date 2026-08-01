import { afterEach, describe, expect, test, vi } from "vitest";

import * as boardContext from "@homarr/boards/context";

import type { ContainerSection } from "~/app/[locale]/boards/_types";
import * as emptyPositionModule from "~/components/board/items/actions/empty-position";
import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { ItemMockBuilder } from "~/components/board/items/actions/test/mocks/item-mock";
import { addContainerCallback } from "./add-container";
import { removeContainerCallback } from "./remove-container";

describe("container actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates a container in the first main root for every responsive layout", () => {
    const board = new BoardMockBuilder().addEmptySection({ id: "root", yOffset: 0 }).build();
    const layout = board.layouts[0];
    if (!layout) throw new Error("Expected a board layout");
    layout.id = "layout";
    layout.columnCount = 2;
    vi.spyOn(boardContext, "getBoardLayouts").mockReturnValue([layout.id]);
    vi.spyOn(emptyPositionModule, "getFirstEmptyPosition").mockReturnValue({ xOffset: 0, yOffset: 4 });

    const result = addContainerCallback()(board);
    const created = result.sections.find((section) => section.kind === "container");

    expect(created).toMatchObject({
      kind: "container",
      collapsed: false,
      options: {
        showLabel: true,
        collapsible: false,
        showOpenAll: false,
      },
      layouts: [
        {
          layoutId: "layout",
          parentSectionId: "root",
          xOffset: 0,
          yOffset: 4,
          width: 2,
          height: 3,
        },
      ],
    });
  });

  test("removes a container and flattens its direct children into the parent", () => {
    const removed = new ContainerSectionMockBuilder({ id: "removed" })
      .addLayout({ layoutId: "layout", parentSectionId: "root", xOffset: 3, yOffset: 4, width: 6, height: 5 })
      .build();
    const child = new ContainerSectionMockBuilder({ id: "child" })
      .addLayout({ layoutId: "layout", parentSectionId: removed.id, xOffset: 1, yOffset: 2, width: 2, height: 2 })
      .build();
    const nestedItem = new ItemMockBuilder({ id: "nested-item" })
      .addLayout({ layoutId: "layout", sectionId: removed.id, xOffset: 2, yOffset: 1, width: 1, height: 1 })
      .build();
    const board = new BoardMockBuilder().addSection(removed).addSection(child).addItem(nestedItem).build();

    const result = removeContainerCallback({ id: removed.id })(board);
    const flattenedChild = result.sections.find(
      (section): section is ContainerSection => section.kind === "container" && section.id === child.id,
    );

    expect(result.sections.some((section) => section.id === removed.id)).toBe(false);
    expect(flattenedChild?.layouts[0]).toMatchObject({
      parentSectionId: "root",
      xOffset: 4,
      yOffset: 6,
    });
    expect(result.items.find((item) => item.id === nestedItem.id)?.layouts[0]).toMatchObject({
      sectionId: "root",
      xOffset: 5,
      yOffset: 5,
    });
  });

  test("normalizes and resolves collisions while flattening malformed child geometry", () => {
    const removed = new ContainerSectionMockBuilder({ id: "removed" })
      .addLayout({ layoutId: "layout", parentSectionId: "root", xOffset: 2, yOffset: 0, width: 2, height: 2 })
      .build();
    const existing = new ItemMockBuilder({ id: "existing" })
      .addLayout({ layoutId: "layout", sectionId: "root", xOffset: 0, yOffset: 0, width: 2, height: 1 })
      .build();
    const childA = new ItemMockBuilder({ id: "a" })
      .addLayout({ layoutId: "layout", sectionId: removed.id, xOffset: 1, yOffset: 0, width: 2, height: 1 })
      .build();
    const childB = new ItemMockBuilder({ id: "b" })
      .addLayout({ layoutId: "layout", sectionId: removed.id, xOffset: 0, yOffset: 0, width: 2, height: 1 })
      .build();
    const board = new BoardMockBuilder()
      .addEmptySection({ id: "root" })
      .addSection(removed)
      .addItems([existing, childA, childB])
      .build();
    const layout = board.layouts[0];
    if (!layout) throw new Error("Expected a board layout");
    layout.id = "layout";
    layout.columnCount = 4;

    const result = removeContainerCallback({ id: removed.id })(board);
    const layouts = Object.fromEntries(
      result.items.map((item) => {
        const itemLayout = item.layouts[0];
        if (!itemLayout) throw new Error("Expected an item layout");
        return [item.id, itemLayout];
      }),
    );

    expect(layouts.existing).toMatchObject({ xOffset: 0, yOffset: 0, width: 2, height: 1 });
    expect(layouts.a).toMatchObject({ sectionId: "root", xOffset: 2, yOffset: 0, width: 2, height: 1 });
    expect(layouts.b).toMatchObject({ sectionId: "root", xOffset: 2, yOffset: 1, width: 2, height: 1 });
  });
});
