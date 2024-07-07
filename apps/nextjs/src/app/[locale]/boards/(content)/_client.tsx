"use client";

import { useCallback, useEffect, useRef } from "react";
import { Box, LoadingOverlay, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { DDGridStack } from "@homarr/gridstack";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { useIsBoardReady, useRequiredBoard } from "./_context";

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

const dd = new DDGridStack();

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const isReady = useIsBoardReady();
  const { updateBoard } = useUpdateBoard();

  const sortedSections = board.sections.sort((sectionA, sectionB) => sectionA.position - sectionB.position);

  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxRef.current) return;
    dd.droppable(boxRef.current, {
      accept: () => true,
    })
      .on(boxRef.current, "dropover", (event, el, helper) => {
        console.log("dropover", event, el, helper);
      })
      .on(boxRef.current, "dropout", (event, el, helper) => {
        console.log("dropout", event, el, helper);
      })
      .on(boxRef.current, "drop", (event, el, helper) => {
        console.log("drop", event, el, helper);
        const itemId = el.getAttribute("data-id");
        if (!itemId) return;

        // Same as removeItem
        updateBoard((previous) => {
          return {
            ...previous,
            // Filter removed item out of items array
            sections: previous.sections.map((section) => ({
              ...section,
              items: section.items.filter((item) => item.id !== itemId),
            })),
          };
        });
      });
  }, []);

  return (
    <Box h="100%" pos="relative">
      <BoardBackgroundVideo />
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h={fullHeightWithoutHeaderAndFooter}
      />
      <Stack ref={ref} h="100%" style={{ visibility: isReady ? "visible" : "hidden" }}>
        <Box ref={boxRef} w="100%" h={80} bg="red"></Box>
        {sortedSections.map((section) =>
          section.kind === "empty" ? (
            <BoardEmptySection key={section.id} section={section} mainRef={ref} />
          ) : (
            <BoardCategorySection key={section.id} section={section} mainRef={ref} />
          ),
        )}
      </Stack>
    </Box>
  );
};
