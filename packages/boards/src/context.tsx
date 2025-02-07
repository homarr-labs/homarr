"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { updateBoardName } from "./updater";

const BoardContext = createContext<{
  board: RouterOutputs["board"]["getHomeBoard"];
} | null>(null);

export const BoardProvider = ({
  children,
  initialBoard,
}: PropsWithChildren<{
  initialBoard: RouterOutputs["board"]["getBoardByName"];
}>) => {
  const { data } = clientApi.board.getBoardByName.useQuery(
    { name: initialBoard.name },
    {
      initialData: initialBoard,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  // Update the board name so it can be used within updateBoard method
  updateBoardName(initialBoard.name);

  const pathname = usePathname();
  const utils = clientApi.useUtils();

  // Invalidate the board when the pathname changes
  // This allows to refetch the board when it might have changed - e.g. if someone else added an item
  useEffect(() => {
    return () => {
      void utils.board.getBoardByName.invalidate({ name: initialBoard.name });
    };
  }, [pathname, utils, initialBoard.name]);

  return (
    <BoardContext.Provider
      value={{
        board: data,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useRequiredBoard = () => {
  const optionalBoard = useOptionalBoard();

  if (!optionalBoard) {
    throw new Error("Board is required");
  }

  return optionalBoard;
};

export const useOptionalBoard = () => {
  const context = useContext(BoardContext);

  return context?.board ?? null;
};
