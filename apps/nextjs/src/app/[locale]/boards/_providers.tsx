"use client";

import type { PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";

import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { getRequestedLayoutId } from "@homarr/boards/layout-selection";
import { boardTabSearchParam, BoardTabsProvider } from "@homarr/boards/tabs";

import type { Board } from "./_types";

interface Props {
  initialBoard: Board;
  initialLayoutId: string;
  initialViewportWidth: number;
  canModify: boolean;
}

export const BoardProviders = ({
  children,
  initialBoard,
  initialLayoutId,
  initialViewportWidth,
  canModify,
}: PropsWithChildren<Props>) => {
  const searchParams = useSearchParams();
  const layoutOverrideId = canModify
    ? getRequestedLayoutId(initialBoard.layouts, searchParams.get("layout"), searchParams.get("edit"))
    : null;

  return (
    <EditModeProvider initialOpen={layoutOverrideId !== null}>
      <BoardProvider
        initialBoard={initialBoard}
        initialLayoutId={initialLayoutId}
        initialViewportWidth={initialViewportWidth}
        layoutOverrideId={layoutOverrideId}
      >
        <BoardTabsProvider initialTabKey={searchParams.get(boardTabSearchParam)}>{children}</BoardTabsProvider>
      </BoardProvider>
    </EditModeProvider>
  );
};
