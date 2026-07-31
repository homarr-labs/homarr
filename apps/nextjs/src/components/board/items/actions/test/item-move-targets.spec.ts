import { describe, expect, test } from "vitest";

import { getMoveTargets } from "../../item-move-modal";
import { BoardMockBuilder } from "./mocks/board-mock";
import { DynamicSectionMockBuilder } from "./mocks/dynamic-section-mock";
import { EmptySectionMockBuilder } from "./mocks/empty-section-mock";
import { ItemMockBuilder } from "./mocks/item-mock";

describe("item move targets", () => {
  test("offers the canvas, enabled gutters, and nested sections", () => {
    const board = new BoardMockBuilder().build();
    const layout = board.layouts[0];
    if (!layout) throw new Error("Expected the board mock to contain a layout");
    layout.id = "layout";
    layout.columnCount = 6;
    layout.leftGutterColumnCount = 1;
    layout.rightGutterColumnCount = 1;

    board.sections.push(
      new EmptySectionMockBuilder({ id: "canvas", xOffset: 0 }).build(),
      new EmptySectionMockBuilder({ id: "left-gutter", xOffset: -1 }).build(),
      new EmptySectionMockBuilder({ id: "right-gutter", xOffset: 1 }).build(),
      new DynamicSectionMockBuilder({
        id: "dynamic",
        options: {
          title: "",
          customCssClasses: [],
          borderColor: "",
          showLabel: true,
          collapsible: false,
          showOpenAll: false,
        },
      })
        .addLayout({
          layoutId: layout.id,
          parentSectionId: "canvas",
          width: 2,
          height: 2,
        })
        .build(),
    );

    const targets = getMoveTargets(
      board,
      layout.id,
      {
        id: "weather",
        type: "item",
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 1,
      },
      {
        canvas: "Dashboard canvas",
        dynamicSection: "New section",
        leftRail: "Left dashboard rail",
        rightRail: "Right dashboard rail",
        numbered: (name, index) => `${name}, destination ${index}`,
        located: (name, location, index) => `${name}, ${location}, destination ${index}`,
      },
    );

    expect(targets.map((target) => target.label)).toEqual([
      "Dashboard canvas, destination 1",
      "Left dashboard rail, destination 2",
      "Right dashboard rail, destination 3",
      "New section, destination 4",
    ]);
    expect(new Set(targets.map((target) => target.label))).toHaveLength(targets.length);
  });

  test("does not offer canvases that are narrower than a nested section's contents", () => {
    const board = new BoardMockBuilder().build();
    const layout = board.layouts[0];
    if (!layout) throw new Error("Expected the board mock to contain a layout");
    layout.id = "layout";
    layout.columnCount = 5;
    layout.leftGutterColumnCount = 2;

    const section = new DynamicSectionMockBuilder({ id: "source" })
      .addLayout({
        layoutId: layout.id,
        parentSectionId: "canvas",
        width: 4,
        height: 2,
      })
      .build();
    board.sections.push(
      new EmptySectionMockBuilder({ id: "canvas" }).build(),
      new EmptySectionMockBuilder({ id: "left-gutter", xOffset: -1 }).build(),
      section,
    );
    board.items.push(
      new ItemMockBuilder({ id: "nested" })
        .addLayout({
          layoutId: layout.id,
          sectionId: section.id,
          xOffset: 2,
          width: 2,
        })
        .build(),
    );

    const sourceLayout = section.layouts[0];
    if (!sourceLayout) throw new Error("Expected the source section to contain a layout");
    const targets = getMoveTargets(
      board,
      layout.id,
      { ...sourceLayout, id: section.id, type: "section" },
      {
        canvas: "Canvas",
        dynamicSection: "Section",
        leftRail: "Left",
        rightRail: "Right",
        numbered: (name, index) => `${name} ${index}`,
        located: (name, location, index) => `${name} ${location} ${index}`,
      },
    );

    expect(targets).toEqual([]);
  });
});
