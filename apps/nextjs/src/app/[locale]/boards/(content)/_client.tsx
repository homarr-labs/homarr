"use client";

import { Box, Stack } from "@mantine/core";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import { MobileBoard } from "~/components/board/mobile/mobile-board";
import { MobileBoardPreview } from "~/components/board/mobile/mobile-preview";
import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { useIsMobileBoard } from "~/components/board/use-mobile-board";
import { BoardBackgroundVideo } from "~/components/layout/background";

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const isMobile = useIsMobileBoard();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Box h="100%" pos="relative" data-homarr-dev-benchmark-board>
      <BoardBackgroundVideo />
      {isMobile ? (
        <MobileBoard />
      ) : (
        <Stack h="100%">
          {fullWidthSortedSections.map((section) =>
            section.kind === "empty" ? (
              <BoardEmptySection key={`${currentLayoutId}-${section.id}`} section={section} />
            ) : (
              <BoardCategorySection key={`${currentLayoutId}-${section.id}`} section={section} />
            ),
          )}
        </Stack>
      )}
      <MobileBoardPreview />
    </Box>
  );
};
