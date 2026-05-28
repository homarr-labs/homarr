"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext } from "react";

const BoardReadyContext = createContext<{
  markAsReady: (id: string) => void;
} | null>(null);

export const BoardReadyProvider = ({ children }: PropsWithChildren) => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const markAsReady = useCallback((_id: string) => {}, []);

  return (
    <BoardReadyContext.Provider
      value={{
        markAsReady,
      }}
    >
      {children}
    </BoardReadyContext.Provider>
  );
};

export const useMarkSectionAsReady = () => {
  const context = useContext(BoardReadyContext);

  if (!context) {
    throw new Error("BoardReadyProvider is required");
  }

  return context.markAsReady;
};
