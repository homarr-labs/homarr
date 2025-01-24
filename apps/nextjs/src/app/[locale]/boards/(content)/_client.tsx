"use client";

import { useCallback, useRef } from "react";
import { Box, LoadingOverlay, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { useIsBoardReady, useRequiredBoard } from "./_context";
import { WidgetOptionSettingsProvider } from "./_widget-option-settings-context";

let boardName: string | null = null;

export const updateBoardName = (name: string | null) => {
  boardName = name;
};

type UpdateCallback = (prev: RouterOutputs["board"]["getHomeBoard"]) => RouterOutputs["board"]["getHomeBoard"];

export const useUpdateBoard = () => {
  const utils = clientApi.useUtils();

  const updateBoard = useCallback(
    (updaterWithoutUndefined: UpdateCallback) => {
      if (!boardName) {
        throw new Error("Board name is not set");
      }
      utils.board.getBoardByName.setData({ name: boardName }, (previous) =>
        previous ? updaterWithoutUndefined(previous) : previous,
      );
    },
    [utils],
  );

  return {
    updateBoard,
  };
};

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const isReady = useIsBoardReady();

  const fullWidthSortedSections = board.sections
    .filter((section) => section.kind === "empty" || section.kind === "category")
    .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

  const ref = useRef<HTMLDivElement>(null);

  return (
    <WidgetOptionSettingsProvider>
      <Box h="100%" pos="relative">
        <BoardBackgroundVideo />
        <LoadingOverlay
          visible={!isReady}
          transitionProps={{ duration: 500 }}
          loaderProps={{ size: "lg" }}
          h={fullHeightWithoutHeaderAndFooter}
        />
        <Stack ref={ref} h="100%" style={{ visibility: isReady ? "visible" : "hidden" }}>
          {fullWidthSortedSections.map((section) =>
            section.kind === "empty" ? (
              <BoardEmptySection key={section.id} section={section} />
            ) : (
              <BoardCategorySection key={section.id} section={section} />
            ),
          )}
        </Stack>
      </Box>
    </WidgetOptionSettingsProvider>
  );
};
