"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { projectSmartContainerState } from "./smart-container-layout";
import type { useSmartContainerRuntime } from "./use-smart-container-runtime";

type Projection = ReturnType<typeof projectSmartContainerState>;
interface SmartContainerContextValue {
  sectionId: string;
  projection: Projection;
  now: number;
  savedRows: number;
  runtime: ReturnType<typeof useSmartContainerRuntime>;
  focusedItemId: string | null;
  compactQuiet: boolean;
  expandedItemId: string | null;
  toggleCompactWidget: (itemId: string) => void;
}

const SmartContainerContext = createContext<SmartContainerContextValue | null>(null);
export const SmartContainerProjectionProvider = SmartContainerContext.Provider;
export const useSmartContainerProjection = () => useContext(SmartContainerContext);

const emptyRows: ReadonlyMap<string, number> = new Map();
interface LayoutContextValue {
  rows: ReadonlyMap<string, number>;
  setRows: (sectionId: string, rows: number | null) => void;
}
const emptyLayout: LayoutContextValue = { rows: emptyRows, setRows: () => undefined };
const LayoutContext = createContext<LayoutContextValue>(emptyLayout);

/** Display heights belong to the current view, never the board's saved geometry. */
export const SmartContainerLayoutProvider = ({ children }: PropsWithChildren) => {
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
  return <LayoutContext value={value}>{children}</LayoutContext>;
};

export const useSmartContainerLayout = () => useContext(LayoutContext);

const PreviewContext = createContext<
  { containerId: string; stateId?: string; onSelectState?: (id: string) => void } | undefined
>(undefined);
export const SmartContainerPreviewStateProvider = PreviewContext.Provider;
export const useSmartContainerPreviewState = () => useContext(PreviewContext);
