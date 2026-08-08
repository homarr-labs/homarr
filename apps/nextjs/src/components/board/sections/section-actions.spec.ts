import { describe, expect, test } from "vitest";

import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { DynamicSectionMockBuilder } from "~/components/board/items/actions/test/mocks/dynamic-section-mock";
import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";
import { wouldCreateSectionCycle } from "./section-actions";

describe("wouldCreateSectionCycle", () => {
  test("rejects moving a dynamic section into itself or one of its descendants", () => {
    const layoutId = "layout";
    const rootSection = new EmptySectionMockBuilder({ id: "root" }).build();
    const parentSection = new DynamicSectionMockBuilder({ id: "parent" })
      .addLayout({ layoutId, parentSectionId: rootSection.id })
      .build();
    const childSection = new DynamicSectionMockBuilder({ id: "child" })
      .addLayout({ layoutId, parentSectionId: parentSection.id })
      .build();
    const board = new BoardMockBuilder().addSections([rootSection, parentSection, childSection]).build();

    expect(
      wouldCreateSectionCycle(board, {
        innerSectionId: parentSection.id,
        sectionId: parentSection.id,
        layoutId,
      }),
    ).toBe(true);
    expect(
      wouldCreateSectionCycle(board, {
        innerSectionId: parentSection.id,
        sectionId: childSection.id,
        layoutId,
      }),
    ).toBe(true);
    expect(
      wouldCreateSectionCycle(board, {
        innerSectionId: childSection.id,
        sectionId: rootSection.id,
        layoutId,
      }),
    ).toBe(false);
  });
});
