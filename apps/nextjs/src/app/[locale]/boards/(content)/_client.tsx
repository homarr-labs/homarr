"use client";

import { Box, Stack } from "@mantine/core";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import { WidgetContextMenuProvider } from "~/components/board/items/widget-context-menu-provider";
import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardBackgroundVideo } from "~/components/layout/background";

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Box h="100%" pos="relative" data-homarr-dev-benchmark-board>
      <BoardBackgroundVideo />
      <WidgetContextMenuProvider>
        <Stack h="100%">
          {fullWidthSortedSections.map((section) =>
            section.kind === "empty" ? (
              <BoardEmptySection key={`${currentLayoutId}-${section.id}`} section={section} />
            ) : (
              <BoardCategorySection key={`${currentLayoutId}-${section.id}`} section={section} />
            ),
          )}
        </Stack>
      </WidgetContextMenuProvider>
    </Box>
  );
};
