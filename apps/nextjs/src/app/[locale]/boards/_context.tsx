"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

const BoardContext = createContext<{
  board: RouterOutputs["board"]["default"];
} | null>(null);

export const BoardProvider = ({
  children,
  initialBoard,
}: PropsWithChildren<{ initialBoard: RouterOutputs["board"]["default"] }>) => {
  const { data } = clientApi.board.default.useQuery(undefined, {
    initialData: initialBoard,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <BoardContext.Provider value={{ board: data }}>
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

  return context?.board;
};
