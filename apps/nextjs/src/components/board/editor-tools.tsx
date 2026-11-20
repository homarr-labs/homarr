"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useCurrentLayout } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { WidgetError } from "@homarr/widgets/errors";

import type * as EditorHost from "./in-place-editor/host";
import { addInPlaceActions, getAddInPlaceState } from "./in-place-editor/store";
import type * as EditorMenus from "./items/item-menu";

type BoardEditorTools = typeof EditorMenus & typeof EditorHost;

let toolsPromise: Promise<BoardEditorTools> | undefined;
let loadedTools: BoardEditorTools | undefined;

export const loadBoardEditorToolsAsync = () => {
  toolsPromise ??= Promise.all([import("./items/item-menu"), import("./in-place-editor/host")])
    .then(([menus, host]) => {
      loadedTools = { ...menus, ...host };
      return loadedTools;
    })
    .catch((error: unknown) => {
      toolsPromise = undefined;
      throw error;
    });
  return toolsPromise;
};

const BoardEditorToolsContext = createContext<BoardEditorTools | null>(null);

export const useBoardEditorTools = () => useContext(BoardEditorToolsContext);

export const BoardEditorToolsProvider = ({ children }: PropsWithChildren) => {
  const [isEditMode] = useEditMode();
  const [tools, setTools] = useState<BoardEditorTools | null>(null);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const [retry, setRetry] = useState(0);

  if (isEditMode && !tools && loadedTools) setTools(loadedTools);

  useEffect(() => {
    if (!isEditMode || tools) return;
    let cancelled = false;
    void loadBoardEditorToolsAsync().then(
      (module) => {
        if (!cancelled) setTools(module);
      },
      (error: unknown) => {
        if (!cancelled) setFailure({ error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isEditMode, retry, tools]);

  return (
    <BoardEditorToolsContext.Provider value={tools}>
      {isEditMode && !tools && failure && (
        <WidgetError
          error={failure.error}
          resetErrorBoundary={() => {
            setFailure(null);
            setRetry((previous) => previous + 1);
          }}
        />
      )}
      {children}
    </BoardEditorToolsContext.Provider>
  );
};

export const BoardInPlaceEditorHost = () => {
  const [isEditMode] = useEditMode();
  const layoutId = useCurrentLayout();
  const InPlaceEditorHost = useBoardEditorTools()?.InPlaceEditorHost;
  const wasEditMode = useRef(isEditMode);
  const previousLayoutId = useRef(layoutId);
  const lifecycleRef = useRef(0);

  useLayoutEffect(() => {
    if (previousLayoutId.current !== layoutId) addInPlaceActions.cancel();
    previousLayoutId.current = layoutId;
  }, [layoutId]);

  useEffect(() => {
    const lifecycle = lifecycleRef;
    const generation = ++lifecycle.current;
    return () => {
      const leavingSession = getAddInPlaceState().session;
      queueMicrotask(() => {
        if (lifecycle.current === generation && getAddInPlaceState().session === leavingSession) {
          addInPlaceActions.cancel();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (wasEditMode.current && !isEditMode) addInPlaceActions.cancel();
    wasEditMode.current = isEditMode;
  }, [isEditMode]);

  return InPlaceEditorHost ? <InPlaceEditorHost /> : null;
};
