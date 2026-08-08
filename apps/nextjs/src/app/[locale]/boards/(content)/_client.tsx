"use client";

import { Box, Paper, Stack, Text } from "@mantine/core";

import { useCurrentLayout, useLayoutOverride, useRequiredBoard } from "@homarr/boards/context";

import { getRepresentativeLayoutWidth } from "../_layout-utils";
import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardBackgroundVideo } from "~/components/layout/background";

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const layoutOverrideId = useLayoutOverride();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  const content = (
    <Box h="100%" pos="relative" data-homarr-dev-benchmark-board>
      <BoardBackgroundVideo />
      <Stack h="100%">
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

  if (!layoutOverrideId) return content;

  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  if (!currentLayout) return content;

  const representativeWidth = getRepresentativeLayoutWidth(currentLayout, board.layouts);
  return (
    <Stack align="center" gap="xs" p="md" mih="100%">
      <Text size="xs" c="dimmed" fw={500}>
        {currentLayout.name} · {representativeWidth}px
      </Text>
      <Paper
        withBorder
        shadow="sm"
        radius="md"
        w={`min(${representativeWidth}px, calc(100vw - 2rem))`}
        mih="calc(100dvh - 8rem)"
        style={{ overflow: "hidden" }}
      >
        {content}
      </Paper>
    </Stack>
  );
};
