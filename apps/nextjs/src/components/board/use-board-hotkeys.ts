"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { hotkeys } from "@homarr/definitions";
import { useHotkeys } from "@mantine/hooks";

export const useBoardHotkeys = () => {
  const router = useRouter();
  const currentBoard = useRequiredBoard();
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery();

  const navigateToBoard = useCallback(
    (boardName: string) => {
      if (boardName !== currentBoard.name) {
        router.push(`/boards/${boardName}`);
      }
    },
    [router, currentBoard.name],
  );

  const currentIndex = boards.findIndex((board) => board.id === currentBoard.id);

  useHotkeys([
    [hotkeys.nextBoard, () => navigateToNextBoard(boards, currentIndex, navigateToBoard)],
    [hotkeys.previousBoard, () => navigateToPreviousBoard(boards, currentIndex, navigateToBoard)],
    [hotkeys.switchBoard1, () => navigateToBoardByIndex(boards, 0, navigateToBoard)],
    [hotkeys.switchBoard2, () => navigateToBoardByIndex(boards, 1, navigateToBoard)],
    [hotkeys.switchBoard3, () => navigateToBoardByIndex(boards, 2, navigateToBoard)],
    [hotkeys.switchBoard4, () => navigateToBoardByIndex(boards, 3, navigateToBoard)],
    [hotkeys.switchBoard5, () => navigateToBoardByIndex(boards, 4, navigateToBoard)],
    [hotkeys.switchBoard6, () => navigateToBoardByIndex(boards, 5, navigateToBoard)],
    [hotkeys.switchBoard7, () => navigateToBoardByIndex(boards, 6, navigateToBoard)],
    [hotkeys.switchBoard8, () => navigateToBoardByIndex(boards, 7, navigateToBoard)],
    [hotkeys.switchBoard9, () => navigateToBoardByIndex(boards, 8, navigateToBoard)],
  ]);
};

const navigateToNextBoard = (boards: { name: string }[], currentIndex: number, navigate: (name: string) => void) => {
  if (boards.length === 0) return;
  const nextIndex = (currentIndex + 1) % boards.length;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  navigate(boards[nextIndex]!.name);
};

const navigateToPreviousBoard = (
  boards: { name: string }[],
  currentIndex: number,
  navigate: (name: string) => void,
) => {
  if (boards.length === 0) return;
  const previousIndex = (currentIndex - 1 + boards.length) % boards.length;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  navigate(boards[previousIndex]!.name);
};

const navigateToBoardByIndex = (boards: { name: string }[], index: number, navigate: (name: string) => void) => {
  if (index < boards.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    navigate(boards[index]!.name);
  }
};
