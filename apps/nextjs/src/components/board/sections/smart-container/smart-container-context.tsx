"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { WidgetActivityProvider } from "@homarr/widgets/activity";
import { useRequiredBoard } from "@homarr/boards/context";

import type { projectSmartContainerState } from "./smart-container-layout";
import type { useSmartContainerRuntime } from "./use-smart-container-runtime";

type Projection = ReturnType<typeof projectSmartContainerState>;
interface SmartContainerContextValue {
  sectionId: string;
  projection: Projection;
  now: number;
  runtime: ReturnType<typeof useSmartContainerRuntime>;
  focusedItemId: string | null;
}

const SmartContainerContext = createContext<SmartContainerContextValue | null>(null);
export const SmartContainerProjectionProvider = SmartContainerContext.Provider;
export const useSmartContainerProjection = () => useContext(SmartContainerContext);

const emptyRows: ReadonlyMap<string, number> = new Map();
const LayoutContext = createContext<{
  rows: ReadonlyMap<string, number>;
  setRows: (sectionId: string, rows: number | null) => void;
} | null>(null);

/** Display heights belong to the current view, never the board's saved geometry. */
export const SmartContainerLayoutProvider = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const watchedItemIds = useMemo(() => {
    const sections = new Set(
      board.sections
        .filter((section) => section.kind === "container" && section.options.smart?.enabled)
        .map((section) => section.id),
    );
    return new Set(
      board.items
        .filter((item) => item.layouts.some((layout) => sections.has(layout.sectionId)))
        .map((item) => item.id),
    );
  }, [board.sections, board.items]);
  const [rows, updateRows] = useState<ReadonlyMap<string, number>>(emptyRows);
  const setRows = useCallback((sectionId: string, rowCount: number | null) => {
    updateRows((previous) => {
      if (rowCount === null && !previous.has(sectionId)) return previous;
      if (rowCount !== null && previous.get(sectionId) === rowCount) return previous;
      const next = new Map(previous);
      if (rowCount === null) next.delete(sectionId);
      else next.set(sectionId, rowCount);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ rows, setRows }), [rows, setRows]);
  return (
    <WidgetActivityProvider watchedItemIds={watchedItemIds}>
      <LayoutContext value={value}>{children}</LayoutContext>
    </WidgetActivityProvider>
  );
};

export const useSmartContainerLayout = () => useContext(LayoutContext);
export const useSmartContainerDisplayRows = () => useSmartContainerLayout()?.rows ?? emptyRows;

const PreviewContext = createContext<{ stateId: string; onSelectState?: (id: string) => void } | undefined>(undefined);
export const SmartContainerPreviewStateProvider = PreviewContext.Provider;
export const useSmartContainerPreviewState = () => useContext(PreviewContext);
