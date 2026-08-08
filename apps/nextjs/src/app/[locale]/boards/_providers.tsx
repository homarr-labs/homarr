"use client";

import type { PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useMediaQuery } from "@mantine/hooks";

import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";

import type { Board } from "./_types";

interface Props {
  initialBoard: Board;
  canModify: boolean;
}

export const BoardProviders = ({ children, initialBoard, canModify }: PropsWithChildren<Props>) => {
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 64em)");
  const requestedLayoutId = searchParams.get("layout");
  const isRequestedLayoutValid = initialBoard.layouts.some((layout) => layout.id === requestedLayoutId);
  const isLayoutEditRequest = canModify && searchParams.get("edit") === "true" && isRequestedLayoutValid;
  const layoutOverrideId = isLayoutEditRequest && isDesktop ? requestedLayoutId : null;

  return (
    <BoardProvider initialBoard={initialBoard} layoutOverrideId={layoutOverrideId}>
      <EditModeProvider initialOpen={isLayoutEditRequest}>{children}</EditModeProvider>
    </BoardProvider>
  );
};
