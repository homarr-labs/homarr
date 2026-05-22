"use client";

import { Box, LoadingOverlay, Stack } from "@mantine/core";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { useIsBoardReady } from "./_ready-context";

const EditModeBoard = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const isReady = useIsBoardReady();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  return (
    <Box h="100%" pos="relative">
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h={fullHeightWithoutHeaderAndFooter}
      />
      <Stack h="100%" style={{ visibility: isReady ? "visible" : "hidden" }}>
        {fullWidthSortedSections.map((section) =>
          section.kind === "empty" ? (
            <BoardEmptySection key={`${currentLayoutId}-${section.id}`} section={section} />
          ) : (
            <BoardCategorySection key={`${currentLayoutId}-${section.id}`} section={section} />
          ),
        )}
      </Stack>
    </Box>
  );
};

export default EditModeBoard;
