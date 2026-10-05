import { describe, expect, test } from "vitest";

import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";
import { wouldCreateSectionCycle } from "./section-actions";

describe("wouldCreateSectionCycle", () => {
  test("rejects moving a container into itself or one of its descendants", () => {
    const layoutId = "layout";
    const rootSection = new EmptySectionMockBuilder({ id: "root" }).build();
    const parentSection = new ContainerSectionMockBuilder({ id: "parent" })
      .addLayout({ layoutId, parentSectionId: rootSection.id })
      .build();
    const childSection = new ContainerSectionMockBuilder({ id: "child" })
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
