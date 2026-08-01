"use client";

import { useCallback } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

type Board = RouterOutputs["board"]["getHomeBoard"];
type UpdateCallback = (previous: Board) => Board;

let boardName: string | null = null;

export const updateBoardName = (name: string | null) => {
  boardName = name;
};

export const getBoardSaveScopeId = (boardId: string) => `board-save:${boardId}`;

export const shouldRefetchAfterSaveError = <T>(currentBoard: T | undefined, failedBoard: T) =>
  currentBoard === failedBoard;

export const useUpdateBoard = () => {
  const utils = clientApi.useUtils();

  const updateBoard = useCallback(
    (updaterWithoutUndefined: UpdateCallback) => {
      if (!boardName) {
        throw new Error("Board name is not set");
      }
      let updatedBoard: Board | undefined;
      utils.board.getBoardByName.setData({ name: boardName }, (previous) => {
        if (!previous) return previous;
        updatedBoard = updaterWithoutUndefined(previous);
        return updatedBoard;
      });
      return updatedBoard;
    },
    [utils],
  );

  return {
    updateBoard,
  };
};

interface PersistBoardOptions {
  onError?: (error: unknown) => void;
}

export const usePersistBoard = ({ id, name }: Pick<Board, "id" | "name">) => {
  const utils = clientApi.useUtils();
  const { updateBoard } = useUpdateBoard();
  const { mutateAsync: saveBoardAsync } = clientApi.board.saveBoard.useMutation({
    scope: { id: getBoardSaveScopeId(id) },
  });

  const updateAndPersistBoard = useCallback(
    (updater: UpdateCallback, options?: PersistBoardOptions) => {
      const updatedBoard = updateBoard(updater);
      if (!updatedBoard) return undefined;
      const persistedBoard = utils.board.getBoardByName.getData({ name });
      if (!persistedBoard) return undefined;

      void saveBoardAsync(persistedBoard).catch((error: unknown) => {
        const currentBoard = utils.board.getBoardByName.getData({ name });
        if (shouldRefetchAfterSaveError(currentBoard, persistedBoard)) {
          void utils.board.getBoardByName.invalidate({ name });
        }
        options?.onError?.(error);
      });

      return persistedBoard;
    },
    [name, saveBoardAsync, updateBoard, utils],
  );

  return { updateAndPersistBoard };
};
