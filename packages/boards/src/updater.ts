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
  const { mutateAsync: saveBoardAsync } = clientApi.board.saveBoard.useMutation({
    scope: { id: `board-save:${id}` },
  });

  const updateAndPersistBoard = useCallback(
    (updater: UpdateCallback, options?: PersistBoardOptions) => {
      let persistedBoard: Board | undefined;
      utils.board.getBoardByName.setData({ name }, (previous) => {
        if (!previous || previous.id !== id) return previous;
        persistedBoard = updater(previous);
        return persistedBoard;
      });
      if (!persistedBoard) return undefined;

      void saveBoardAsync(persistedBoard).catch((error: unknown) => {
        const currentBoard = utils.board.getBoardByName.getData({ name });
        if (currentBoard === persistedBoard) {
          void utils.board.getBoardByName.invalidate({ name });
        }
        options?.onError?.(error);
      });

      return persistedBoard;
    },
    [id, name, saveBoardAsync, utils],
  );

  return { updateAndPersistBoard };
};
