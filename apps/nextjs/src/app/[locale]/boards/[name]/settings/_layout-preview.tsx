"use client";

import { Badge, Box, Group, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { BoardPreviewLayout } from "@homarr/boards/layout-preview";
import { getRepresentativeLayoutWidth } from "@homarr/boards/layout-preview";
import { useI18n } from "@homarr/translation/client";
import { BoardLayoutThumbnail, maxBoardLayoutThumbnailRows } from "~/components/board/board-layout-thumbnail";

import type { Board } from "../../_types";
import classes from "./_layout-preview.module.css";

interface Props {
  board: Board;
  layout: BoardPreviewLayout;
  layouts: BoardPreviewLayout[];
  sourceLayout: BoardPreviewLayout;
  apps: RouterOutputs["app"]["byIds"];
}

export const LayoutPreview = ({ board, layout, layouts, sourceLayout, apps }: Props) => {
  const tBoard = useI18n("board");
  const representativeWidth = getRepresentativeLayoutWidth(layout, layouts);
  const largestRepresentativeWidth = Math.max(
    ...layouts.map((candidate) => getRepresentativeLayoutWidth(candidate, layouts)),
  );
  const previewWidth = `${(representativeWidth / largestRepresentativeWidth) * 100}%`;
  const appsById = new Map(apps.map((app) => [app.id, app]));
  const preview = {
    ...board,
    items: board.items.map((item) => {
      if (item.kind !== "app" || typeof item.options.appId !== "string") return item;
      return { ...item, iconUrl: appsById.get(item.options.appId)?.iconUrl };
    }),
  };

  return (
    <Stack gap={6} align="center" w="100%">
      <Group gap="xs" justify="center">
        <Badge variant="light" color={layout.role === "mobile" ? "teal" : layout.role === "base" ? "blue" : "gray"}>
          {representativeWidth}px
        </Badge>
        <Text size="xs">
          {layout.columnCount} {tBoard("setting.section.layout.preview.columns")}
        </Text>
      </Group>
      <Box w={{ base: "100%", md: `max(${previewWidth}, 14rem)` }} maw="100%" className={classes.canvas}>
        <BoardLayoutThumbnail
          preview={preview}
          layout={layout}
          sourceLayout={sourceLayout}
          label={tBoard("setting.section.layout.title")}
          previewRowLimit={maxBoardLayoutThumbnailRows}
        />
      </Box>
    </Stack>
  );
};
