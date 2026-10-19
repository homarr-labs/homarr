"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createQueryHydrationSnapshot } from "./query-hydration";
import { useQueryClient } from "@tanstack/react-query";

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
  prepareQuerySnapshot: () => void;
  createQueryClient: () => ReturnType<ReturnType<typeof createQueryHydrationSnapshot>["createClient"]> | undefined;
  subscribe: (listener: () => void) => () => void;
  getIsRestoring: () => boolean;
  getInitialIsRestoring: () => boolean;
  register: (id: string) => () => void;
  settle: (id: string) => void;
  seal: (host: object) => () => void;
  whenRestored: () => Promise<BoardRestorationResult>;
}

const restored = Promise.resolve<BoardRestorationResult>("restored");
const noop = () => undefined;
const BoardRestorationContext = createContext<BoardRestoration>({
  prepareQuerySnapshot: noop,
  createQueryClient: () => undefined,
  subscribe: () => noop,
  getIsRestoring: () => false,
  getInitialIsRestoring: () => false,
  register: () => noop,
  settle: noop,
  seal: () => noop,
  whenRestored: () => restored,
});

export const PreparedBoardRestorationProvider = ({ prepared, children }: PropsWithChildren<{ prepared: boolean }>) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [restoration] = useState(() => {
    let phase: "pending" | "committing" | BoardRestorationResult = "restored";
    if (prepared) phase = "pending";
    let resumed = !prepared;
    let querySnapshot: ReturnType<typeof createQueryHydrationSnapshot> | undefined;
    let restoring = prepared;
    const listeners = new Set<() => void>();
    const finishRestoring = () => {
      restoring = false;
      for (const listener of listeners) listener();
    };
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
      if (update) {
        finishRestoring();
        queueMicrotask(() => {
          resumed = true;
        });
      }
    };
    const check = () => {
      if (phase !== "pending" || !host || pending.size !== 0) return;
      phase = "committing";
      finishRestoring();
      // Layout effects have now attached every initial visible Widget. Complete
      // after this commit without waiting on unrelated offscreen transitions.
      queueMicrotask(() => {
        if (phase !== "committing") return;
        resumed = true;
        phase = "restored";
        pending.clear();
        settled.clear();
        resolveRestored("restored");
      });
    };
    const prepareQuerySnapshot = () => {
      if (!prepared || phase === "cancelled") return undefined;
      querySnapshot ??= createQueryHydrationSnapshot(queryClient);
      return querySnapshot;
    };
    return {
      prepareQuerySnapshot: () => {
        prepareQuerySnapshot();
      },
      createQueryClient: () => prepareQuerySnapshot()?.createClient(),
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      getIsRestoring: () => restoring,
      getInitialIsRestoring: () => prepared,
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
            if (providerGeneration !== token) return;
            cancel(false);
            querySnapshot?.dispose();
          });
      },
      navigate: (path: string | null) => {
        if (initialPath !== undefined && initialPath !== path) cancel();
        initialPath = path;
      },
    };
  });
  useEffect(() => restoration.mount(), [restoration]);
  useEffect(() => restoration.navigate(pathname), [pathname, restoration]);
  return <BoardRestorationContext.Provider value={restoration}>{children}</BoardRestorationContext.Provider>;
};

// Keep lifecycle registration independent of refresh state: changing a Context
// value would wake every dehydrated Suspense boundary, including offscreen Widgets.
export const useBoardRestorationLifecycle = () => useContext(BoardRestorationContext);

export const useBoardRestoration = () => {
  const restoration = useBoardRestorationLifecycle();
  const isRestoring = useSyncExternalStore(
    restoration.subscribe,
    restoration.getIsRestoring,
    restoration.getInitialIsRestoring,
  );
  return { ...restoration, isRestoring };
};

export const useWhenBoardRestored = () => {
  const { whenRestored } = useBoardRestorationLifecycle();
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

export const useBoardRestoredAction = (action: () => unknown | Promise<unknown>) => {
  const whenRestored = useWhenBoardRestored();
  const pendingRef = useRef(false);
  const [isPending, setPending] = useState(false);
  const run = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      if ((await whenRestored()) === "restored") await action();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [action, whenRestored]);
  return { run, isPending };
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
