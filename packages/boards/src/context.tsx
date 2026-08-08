"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSettings } from "@homarr/settings";

import { updateBoardName } from "./updater";

const BoardContext = createContext<{
  board: RouterOutputs["board"]["getBoardByName"];
} | null>(null);

export const BoardProvider = ({
  children,
  initialBoard,
}: PropsWithChildren<{
  initialBoard: RouterOutputs["board"]["getBoardByName"];
}>) => {
  const { data } = clientApi.board.getBoardByName.useQuery({ name: initialBoard.name }, { initialData: initialBoard });

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

export const getDesktopLayout = (board: RouterOutputs["board"]["getBoardByName"]) => {
  const layout = board.layouts
    .toSorted(
      (layoutA, layoutB) => layoutB.breakpoint - layoutA.breakpoint || layoutB.columnCount - layoutA.columnCount,
    )
    .at(0);

  if (!layout) {
    throw new Error("Board must have a layout");
  }

  return layout;
};

export const getCurrentLayout = (
  board: RouterOutputs["board"]["getBoardByName"],
  enableAutomaticMobileLayout: boolean,
  viewportWidth?: number,
) => {
  if (enableAutomaticMobileLayout || viewportWidth === undefined) {
    return getDesktopLayout(board).id;
  }

  const sortedLayouts = board.layouts.toSorted((layoutA, layoutB) => layoutB.breakpoint - layoutA.breakpoint);
  const layout = sortedLayouts.find((candidate) => candidate.breakpoint <= viewportWidth) ?? sortedLayouts.at(-1);

  if (!layout) {
    throw new Error("Board must have a layout");
  }

  return layout.id;
};

export const useCurrentLayout = () => {
  const board = useRequiredBoard();
  const { enableAutomaticMobileLayout } = useSettings();
  const [currentLayout, setCurrentLayout] = useState(() =>
    getCurrentLayout(
      board,
      enableAutomaticMobileLayout,
      !enableAutomaticMobileLayout && typeof window !== "undefined" ? window.innerWidth : undefined,
    ),
  );

  const updateCurrentLayout = useCallback(() => {
    setCurrentLayout(getCurrentLayout(board, enableAutomaticMobileLayout, window.innerWidth));
  }, [board, enableAutomaticMobileLayout]);

  useEffect(() => {
    updateCurrentLayout();

    if (enableAutomaticMobileLayout) return;

    window.addEventListener("resize", updateCurrentLayout);

    return () => {
      window.removeEventListener("resize", updateCurrentLayout);
    };
  }, [enableAutomaticMobileLayout, updateCurrentLayout]);

  return currentLayout;
};

export const getBoardLayouts = (board: RouterOutputs["board"]["getBoardByName"]) =>
  board.layouts.map((layout) => layout.id);

export const useLayouts = () => {
  const board = useRequiredBoard();

  return getBoardLayouts(board);
};
