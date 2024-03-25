"use client";

import type { MouseEvent, PropsWithChildren } from "react";
import React, { createContext, useCallback } from "react";
import { useClickOutside, useElementSize, useMergedRef } from "@mantine/hooks";
import combineClasses from "clsx";
import { useAtom, useAtomValue } from "jotai";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { SectionKind, WidgetKind } from "@homarr/definitions";
import type { BoxProps } from "@homarr/ui";
import { Box, Card, LoadingOverlay } from "@homarr/ui";

import { editModeAtom } from "~/components/board/editMode";
import { BoardItem } from "~/components/board/sections/content";
import { GridStack } from "~/components/board/sections/gridstack/gridstack";
import type { UseGridstackRefs } from "~/components/board/sections/gridstack/use-gridstack";
import {
  selectedItemAtom,
  useGridstack,
} from "~/components/board/sections/gridstack/use-gridstack";
import classes from "~/components/board/sections/item.module.css";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { useIsBoardReady, useRequiredBoard } from "./_context";
import type { Section } from "./_types";

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

  const rootSection = board.sections.find((section) => section.kind === "root");

  if (!rootSection) {
    throw new Error("Root section not found");
  }

  return (
    <Box h="100%" pos="relative">
      <BoardBackgroundVideo />
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h="calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-padding) - var(--app-shell-footer-offset, 0px) - var(--app-shell-padding))"
      />
      <GridStack
        h="100%"
        style={{ visibility: isReady ? "visible" : "hidden" }}
        section={rootSection}
      >
        <SectionContent />
      </GridStack>
    </Box>
  );
};

const ItemContent = ({ item }: { item: Section["items"][number] }) => {
  const board = useRequiredBoard();
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  return (
    <Card
      ref={ref}
      className={combineClasses(classes.itemCard, "grid-stack-item-content")}
      withBorder
      styles={{
        root: {
          "--opacity": board.opacity / 100,
        },
      }}
      p={width >= 96 ? undefined : "xs"}
    >
      <BoardItem item={item} width={width + 32} height={height + 32} />
    </Card>
  );
};
