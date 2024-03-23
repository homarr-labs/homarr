/* eslint-disable react/no-unknown-property */
"use client";

import type { RefObject } from "react";
import { useCallback, useRef } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { Box, Card, LoadingOverlay } from "@homarr/ui";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { useGridstack } from "~/components/board/sections/gridstack/use-gridstack";
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

  const sortedSections = board.sections.sort(
    (sectionA, sectionB) => sectionA.position - sectionB.position,
  );

  const ref = useRef<HTMLDivElement>(null);
  const { refs } = useGridstack({
    section: {
      id: "outer",
      kind: "outer" as unknown as "empty",
      position: 0,
      items: board.sections.map((x) => ({ id: x.id })), // TODO: maybe add items to outer section?
    },
    mainRef: ref,
  });

  return (
    <Box h="100%" pos="relative" ref={ref}>
      <BoardBackgroundVideo />
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h="calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-padding) - var(--app-shell-footer-offset, 0px) - var(--app-shell-padding))"
      />
      <Box
        h="100%"
        style={{ visibility: isReady ? "visible" : "hidden" }}
        data-outer
        data-section-id="outer"
        className="grid-stack grid-stack-outer"
        ref={refs.wrapper}
      >
        {sortedSections.map((section) => (
          <div
            className="grid-stack-item"
            key={section.id}
            data-id={section.id}
            gs-x={0}
            gs-y={0}
            gs-w={4}
            gs-h={4}
            gs-min-w={1}
            gs-min-h={1}
            ref={refs.items.current[section.id] as RefObject<HTMLDivElement>}
          >
            <Card withBorder className="grid-stack-item-content" p={-1}>
              {section.kind === "empty" ? (
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
              )}
            </Card>
          </div>
        ))}
      </Box>
    </Box>
  );
};
