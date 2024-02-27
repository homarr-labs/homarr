"use client";

import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

const BoardContext = createContext<{
  board: RouterOutputs["board"]["default"];
  isReady: boolean;
  markAsReady: (id: string) => void;
} | null>(null);

export const BoardProvider = ({
  children,
  initialBoard,
}: PropsWithChildren<{ initialBoard: RouterOutputs["board"]["default"] }>) => {
  const [readySections, setReadySections] = useState<string[]>([]);
  const { data } = clientApi.board.default.useQuery(undefined, {
    initialData: initialBoard,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setReadySections((previous) =>
      previous.filter((id) =>
        data.sections.some((section) => section.id === id),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.sections.length, setReadySections]);

  const markAsReady = useCallback((id: string) => {
    setReadySections((previous) =>
      previous.includes(id) ? previous : [...previous, id],
    );
  }, []);

  return (
    <BoardContext.Provider
      value={{
        board: data,
        isReady: data.sections.length === readySections.length,
        markAsReady,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useMarkSectionAsReady = () => {
  const context = useContext(BoardContext);

  if (!context) {
    throw new Error("Board is required");
  }

  return context.markAsReady;
};

export const useIsBoardReady = () => {
  const context = useContext(BoardContext);

  if (!context) {
    throw new Error("Board is required");
  }

  return context.isReady;
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
