"use client";

import type { PropsWithChildren } from "react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { boardViewportWidthCookieName, getLayoutIdForViewportWidth } from "./layout-selection";
import { updateBoardName } from "./updater";

type Board = RouterOutputs["board"]["getBoardByName"];

interface BoardContextValue {
  board: Board;
  layoutOverrideId: string | null;
  currentLayout: string;
  initialViewportWidth: number;
}

const BoardContext = createContext<BoardContextValue | null>(null);

type BoardRestorationResult = "restored" | "cancelled";

interface BoardRestoration {
  isRestoring: boolean;
  register: (id: string) => () => void;
  settle: (id: string) => void;
  seal: (host: object) => () => void;
  whenRestored: () => Promise<BoardRestorationResult>;
}

const restored = Promise.resolve<BoardRestorationResult>("restored");
const noop = () => undefined;
const BoardRestorationContext = createContext<BoardRestoration>({
  isRestoring: false,
  register: () => noop,
  settle: noop,
  seal: () => noop,
  whenRestored: () => restored,
});

export const PreparedBoardRestorationProvider = ({ prepared, children }: PropsWithChildren<{ prepared: boolean }>) => {
  const pathname = usePathname();
  const [isRestoring, setIsRestoring] = useState(prepared);
  const [restoration] = useState(() => {
    let phase: "pending" | "committing" | BoardRestorationResult = "restored";
    if (prepared) phase = "pending";
    let resumed = !prepared;
    const pending = new Map<string, object>();
    const settled = new Set<string>();
    let host: object | undefined;
    let hostGeneration: object;
    let providerGeneration: object;
    let initialPath: string | null | undefined;
    let resolveRestored: (result: BoardRestorationResult) => void = noop;
    const completion = new Promise<BoardRestorationResult>((resolve) => {
      resolveRestored = resolve;
    });
    if (!prepared) resolveRestored("restored");
    const cancel = (update = true) => {
      if (phase === "restored" || phase === "cancelled") return;
      phase = "cancelled";
      pending.clear();
      settled.clear();
      resolveRestored("cancelled");
      if (update) startTransition(() => setIsRestoring(false));
    };
    const check = () => {
      if (phase !== "pending" || !host || pending.size !== 0) return;
      phase = "committing";
      startTransition(() => setIsRestoring(false));
    };
    return {
      whenRestored: () => {
        if (resumed) return restored;
        return completion;
      },
      register: (id: string) => {
        if (phase !== "pending" || settled.has(id)) return noop;
        const token = {};
        pending.set(id, token);
        return () =>
          queueMicrotask(() => {
            if (pending.get(id) !== token) return;
            pending.delete(id);
            settled.add(id);
            check();
          });
      },
      settle: (id: string) => {
        if (phase !== "pending") return;
        settled.add(id);
        pending.delete(id);
        check();
      },
      seal: (owner: object) => {
        if (host && host !== owner) cancel();
        if (phase !== "pending" && phase !== "committing") return noop;
        host = owner;
        const token = {};
        hostGeneration = token;
        check();
        return () =>
          queueMicrotask(() => {
            if (hostGeneration === token) cancel();
          });
      },
      mount: () => {
        const token = {};
        providerGeneration = token;
        return () =>
          queueMicrotask(() => {
            if (providerGeneration === token) cancel(false);
          });
      },
      commit: () => {
        if (phase === "cancelled") resumed = true;
        if (phase !== "committing") return;
        resumed = true;
        phase = "restored";
        pending.clear();
        settled.clear();
        resolveRestored("restored");
      },
      navigate: (path: string | null) => {
        if (initialPath !== undefined && initialPath !== path) cancel();
        initialPath = path;
      },
    };
  });
  useEffect(() => restoration.mount(), [restoration]);
  useEffect(() => restoration.navigate(pathname), [pathname, restoration]);
  useEffect(() => {
    if (!isRestoring) restoration.commit();
  }, [isRestoring, restoration]);
  const value = useMemo(() => ({ ...restoration, isRestoring }), [isRestoring, restoration]);
  return <BoardRestorationContext.Provider value={value}>{children}</BoardRestorationContext.Provider>;
};

export const useBoardRestoration = () => useContext(BoardRestorationContext);

export const useWhenBoardRestored = () => {
  const { whenRestored } = useBoardRestoration();
  const [lifetime] = useState(() => {
    let resolveCancelled: (result: BoardRestorationResult) => void = noop;
    const cancellation = new Promise<BoardRestorationResult>((resolve) => {
      resolveCancelled = resolve;
    });
    return { token: {}, cancelled: false, cancellation, resolveCancelled };
  });
  useEffect(() => {
    const token = {};
    lifetime.token = token;
    return () =>
      queueMicrotask(() => {
        if (lifetime.token !== token) return;
        lifetime.cancelled = true;
        lifetime.resolveCancelled("cancelled");
      });
  }, [lifetime]);
  return useCallback(async () => {
    const result = await Promise.race([whenRestored(), lifetime.cancellation]);
    if (lifetime.cancelled) return "cancelled";
    return result;
  }, [lifetime, whenRestored]);
};

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

export const BoardPreviewProvider = ({ children, board }: PropsWithChildren<{ board: Board }>) => {
  const currentLayout = board.layouts[0]?.id ?? "";

  return (
    <BoardContext.Provider
      value={{
        board,
        layoutOverrideId: null,
        currentLayout,
        initialViewportWidth: 0,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const BoardProvider = ({
  children,
  initialBoard,
  initialLayoutId,
  initialViewportWidth,
  layoutOverrideId = null,
}: PropsWithChildren<{
  initialBoard: RouterOutputs["board"]["getBoardByName"];
  initialLayoutId: string;
  initialViewportWidth: number;
  layoutOverrideId?: string | null;
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
    () => getCurrentLayout(data, layoutOverrideId),
    () => layoutOverrideId ?? initialLayoutId,
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
        layoutOverrideId,
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

export const useLayoutOverride = () => useContext(BoardContext)?.layoutOverrideId ?? null;

export const getCurrentLayout = (
  board: RouterOutputs["board"]["getBoardByName"],
  layoutOverrideId: string | null = null,
) => {
  const layouts = board.layouts;
  if (layoutOverrideId && layouts.some((layout) => layout.id === layoutOverrideId)) return layoutOverrideId;

  const viewportWidth = typeof window === "undefined" ? 0 : getViewportWidth();
  return getLayoutIdForViewportWidth(layouts, viewportWidth);
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
