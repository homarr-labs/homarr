"use client";

import { useCallback } from "react";
import { MutationObserver, useQueryClient } from "@tanstack/react-query";
import { getMutationKey, getQueryKey } from "@trpc/react-query";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { useRequiredBoard } from "./context";

type Board = RouterOutputs["board"]["getHomeBoard"];
type BoardIdentity = Pick<Board, "id" | "name">;
type UpdateCallback = (previous: Board) => Board;

const useBoardUpdater = ({ id, name }: BoardIdentity) => {
  const utils = clientApi.useUtils();
  const queryClient = useQueryClient();
  const { queryHash } = queryClient.defaultQueryOptions({
    queryKey: getQueryKey(clientApi.board.getBoardByName, { name }, "query"),
  });
  const query = queryClient.getQueryCache().get<Board>(queryHash);

  // Retained actions belong to this query instance, even after leaving its Board.
  // Removing it on rename/delete expires those actions without following a new name.
  const isTargetAvailable = useCallback(
    () =>
      query !== undefined &&
      queryClient.getQueryCache().get(query.queryHash) === query &&
      query.state.data?.id === id &&
      query.state.data.name === name,
    [id, name, query, queryClient],
  );

  const updateBoard = useCallback(
    (updater: UpdateCallback) => {
      if (!isTargetAvailable()) return undefined;

      let didUpdate = false;
      utils.board.getBoardByName.setData({ name }, (previous) => {
        if (!previous || previous.id !== id || previous.name !== name) return undefined;
        const updatedBoard = updater(previous);
        if (updatedBoard.id !== id || updatedBoard.name !== name) return undefined;
        didUpdate = true;
        return updatedBoard;
      });

      // Read the stored snapshot: structural sharing can replace the updater's object.
      return didUpdate ? utils.board.getBoardByName.getData({ name }) : undefined;
    },
    [id, isTargetAvailable, name, utils],
  );

  return { updateBoard, isTargetAvailable, query };
};

export const useUpdateBoard = () => {
  const board = useRequiredBoard();
  const { updateBoard } = useBoardUpdater(board);

  return {
    updateBoard,
  };
};

export const useExpireBoardActions = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (boardId: string) => {
      const cachedBoards = queryClient.getQueriesData<Board>({
        queryKey: getQueryKey(clientApi.board.getBoardByName),
      });
      for (const [queryKey, board] of cachedBoards) {
        if (board?.id === boardId) queryClient.removeQueries({ queryKey, exact: true });
      }
    },
    [queryClient],
  );
};

interface PersistBoardOptions {
  onError?: (error: unknown) => void;
}

export const usePersistBoard = ({ id, name }: BoardIdentity) => {
  const utils = clientApi.useUtils();
  const queryClient = useQueryClient();
  const { updateBoard, isTargetAvailable, query } = useBoardUpdater({ id, name });

  const updateAndPersistBoard = useCallback(
    (updater: UpdateCallback, options?: PersistBoardOptions) => {
      const persistedBoard = updateBoard(updater);
      if (!persistedBoard) return undefined;
      // Equivalent newer writes can keep the same object, so also track its revision.
      const dataUpdateCount = query?.state.dataUpdateCount;

      // Freeze each save's scope rather than retaining a hook observer whose
      // options could switch to another Board before a delayed action runs.
      const mutation = new MutationObserver(queryClient, {
        mutationKey: getMutationKey(clientApi.board.saveBoard),
        scope: { id: `board-save:${id}` },
        mutationFn: (snapshot: Board) =>
          isTargetAvailable() ? utils.client.board.saveBoard.mutate(snapshot) : Promise.resolve(),
      });

      void mutation
        .mutate(persistedBoard)
        .catch((error: unknown) => {
          if (
            isTargetAvailable() &&
            query?.state.data === persistedBoard &&
            query.state.dataUpdateCount === dataUpdateCount
          ) {
            void utils.board.getBoardByName.invalidate({ name });
          }
          options?.onError?.(error);
        })
        .finally(() => mutation.reset());

      return persistedBoard;
    },
    [id, isTargetAvailable, name, query, queryClient, updateBoard, utils],
  );

  return { updateAndPersistBoard };
};
