"use client";

import { useCallback, useRef } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { Box, LoadingOverlay, Stack } from "@homarr/ui";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { useIsBoardReady, useRequiredBoard } from "./_context";

let boardName: string | null = null;

export const updateBoardName = (name: string | null) => {
  boardName = name;
};

type UpdateCallback = (
  prev: RouterOutputs["board"]["default"],
) => RouterOutputs["board"]["default"];

export const useUpdateBoard = () => {
  const utils = clientApi.useUtils();

  const updateBoard = useCallback(
    (updaterWithoutUndefined: UpdateCallback) => {
      if (!boardName) {
        throw new Error("Board name is not set");
      }
      utils.board.byName.setData({ name: boardName }, (previous) =>
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

  const sortedSections = board.sections.sort((a, b) => a.position - b.position);

  const ref = useRef<HTMLDivElement>(null);

  return (
    <Box h="100%" pos="relative">
      <BoardBackgroundVideo />
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h="calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-padding) - var(--app-shell-footer-offset, 0px) - var(--app-shell-padding))"
      />
      <Stack
        ref={ref}
        h="100%"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      >
        {sortedSections.map((section) =>
          section.kind === "empty" ? (
            <BoardEmptySection
              key={section.id}
              section={section}
              mainRef={ref}
            />
          ) : (
            <BoardCategorySection
              key={section.id}
              section={section}
              mainRef={ref}
            />
          ),
        )}
      </Stack>
    </Box>
  );
};
