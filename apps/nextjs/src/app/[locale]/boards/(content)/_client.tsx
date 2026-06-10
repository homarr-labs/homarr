"use client";

import dynamic from "next/dynamic";
import { Box } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";

import { StaticBoardGrid } from "~/components/board/sections/static-grid";
import { BoardBackgroundVideo } from "~/components/layout/background";

const EditModeBoard = dynamic(() => import("./_edit-board"), { ssr: false });

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();

  return (
    <Box h="100%" pos="relative">
      <BoardBackgroundVideo />
      {isEditMode ? <EditModeBoard /> : <StaticBoardGrid board={board} />}
    </Box>
  );
};
