"use client";

import type { PropsWithChildren } from "react";
import { IsRestoringProvider } from "@tanstack/react-query";

import { PreparedBoardRestorationProvider, useBoardRestoration } from "@homarr/boards/context";
import { useInitialRenderTime } from "@homarr/common";

export const BoardReadyProvider = ({ children }: PropsWithChildren) => {
  const prepared = useInitialRenderTime() !== undefined;
  return (
    <PreparedBoardRestorationProvider prepared={prepared}>
      <BoardQueryRestoration>{children}</BoardQueryRestoration>
    </PreparedBoardRestorationProvider>
  );
};

const BoardQueryRestoration = ({ children }: PropsWithChildren) => {
  const { isRestoring } = useBoardRestoration();
  return <IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>;
};
