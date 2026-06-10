"use client";

import { Stack } from "@mantine/core";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";

const EditModeBoard = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Stack h="100%">
      {fullWidthSortedSections.map((section) =>
        section.kind === "empty" ? (
          <BoardEmptySection key={`${currentLayoutId}-${section.id}`} section={section} />
        ) : (
          <BoardCategorySection key={`${currentLayoutId}-${section.id}`} section={section} />
        ),
      )}
    </Stack>
  );
};

export default EditModeBoard;
