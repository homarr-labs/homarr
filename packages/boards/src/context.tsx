"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { boardViewportWidthCookieName, getLayoutIdForViewportWidth } from "./layout-selection";
import { updateBoardName } from "./updater";

const BoardContext = createContext<{
  board: RouterOutputs["board"]["getBoardByName"];
  currentLayout: string;
  initialViewportWidth: number;
} | null>(null);

const subscribeToViewport = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  let animationFrame = 0;
  const handleResize = () => {
    if (animationFrame !== 0) return;
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      persistViewportWidth(getViewportWidth());
      onStoreChange();
    });
  };
  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
    window.cancelAnimationFrame(animationFrame);
  };
};

export const BoardProvider = ({
  children,
  initialBoard,
  initialLayoutId,
  initialViewportWidth,
}: PropsWithChildren<{
  initialBoard: RouterOutputs["board"]["getBoardByName"];
  initialLayoutId: string;
  initialViewportWidth: number;
}>) => {
  const { data } = clientApi.board.getBoardByName.useQuery(
    { name: initialBoard.name },
    {
      initialData: initialBoard,
      // The route already fetched this board, so keep it fresh long enough to
      // avoid an immediate duplicate request while still surfacing remote edits
      // when a user later returns to the board.
      staleTime: 30_000,
    },
  );
  const currentLayout = useSyncExternalStore(
    subscribeToViewport,
    () => getCurrentLayout(data),
    () => initialLayoutId,
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

  useEffect(() => {
    persistViewportWidth(getViewportWidth());
  }, []);
  return (
    <BoardContext.Provider
      value={{
        board: data,
        currentLayout,
        initialViewportWidth,
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

export const getCurrentLayout = (board: RouterOutputs["board"]["getBoardByName"]) => {
  const viewportWidth = typeof window === "undefined" ? 0 : getViewportWidth();
  return getLayoutIdForViewportWidth(board.layouts, viewportWidth);
};

export const useCurrentLayout = () => {
  const context = useContext(BoardContext);

  if (!context) {
    throw new Error("Board is required");
  }

  return context.currentLayout;
};

export const useInitialViewportWidth = () => {
  const context = useContext(BoardContext);

  if (!context) {
    throw new Error("Board is required");
  }

  return context.initialViewportWidth;
};

export const getBoardLayouts = (board: RouterOutputs["board"]["getBoardByName"]) =>
  board.layouts.map((layout) => layout.id);

export const useLayouts = () => {
  const board = useRequiredBoard();

  return getBoardLayouts(board);
};

const persistViewportWidth = (viewportWidth: number) => {
  document.cookie = `${boardViewportWidthCookieName}=${Math.round(viewportWidth)}; Path=/; Max-Age=31536000; SameSite=Lax`;
};

const getViewportWidth = () => document.documentElement.clientWidth || window.innerWidth;
