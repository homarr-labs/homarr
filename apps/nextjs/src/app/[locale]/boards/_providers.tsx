"use client";

import type { PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";

import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";

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
  const requestedLayoutId = searchParams.get("layout");
  const isRequestedLayoutValid = initialBoard.layouts.some((layout) => layout.id === requestedLayoutId);
  const isLayoutEditRequest = canModify && searchParams.get("edit") === "true" && isRequestedLayoutValid;
  const layoutOverrideId = isLayoutEditRequest ? requestedLayoutId : null;

  return (
    <BoardStateProviders
      {...{ children, initialBoard, initialLayoutId, initialViewportWidth, canModify }}
      layoutOverrideId={layoutOverrideId}
    />
  );
};

export const PreparedBoardProviders = (props: PropsWithChildren<Props>) => (
  <BoardStateProviders {...props} layoutOverrideId={null} />
);

const BoardStateProviders = ({
  children,
  initialBoard,
  initialLayoutId,
  initialViewportWidth,
  layoutOverrideId,
}: PropsWithChildren<Props & { layoutOverrideId: string | null }>) => {
  return (
    <BoardProvider
      initialBoard={initialBoard}
      initialLayoutId={initialLayoutId}
      initialViewportWidth={initialViewportWidth}
      layoutOverrideId={layoutOverrideId}
    >
      <EditModeProvider initialOpen={layoutOverrideId !== null}>{children}</EditModeProvider>
    </BoardProvider>
  );
};
