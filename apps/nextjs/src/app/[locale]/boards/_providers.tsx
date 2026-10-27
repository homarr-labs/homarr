"use client";

import type { PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";

import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";

import { AdaptiveContainerPrototypeHost } from "~/components/board/sections/__prototype__/prototype-host";

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
  let content = children;
  if (process.env.NODE_ENV === "development" && initialBoard.name === "adaptive-containers-prototype") {
    content = <AdaptiveContainerPrototypeHost>{children}</AdaptiveContainerPrototypeHost>;
  }

  return (
    <BoardProvider
      initialBoard={initialBoard}
      initialLayoutId={initialLayoutId}
      initialViewportWidth={initialViewportWidth}
      layoutOverrideId={layoutOverrideId}
    >
      <EditModeProvider initialOpen={isLayoutEditRequest}>{content}</EditModeProvider>
    </BoardProvider>
  );
};
