"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

export type GridEditorRuntimeStatus = "idle" | "loading" | "ready" | "error";

export interface GridResizePreview {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const GridEditorRuntimeContext = createContext<GridEditorRuntimeStatus>("idle");
const GridResizePreviewContext = createContext<GridResizePreview | null>(null);

export const GridEditorRuntimeProvider = ({
  children,
  status,
}: PropsWithChildren<{ status: GridEditorRuntimeStatus }>) => (
  <GridEditorRuntimeContext.Provider value={status}>{children}</GridEditorRuntimeContext.Provider>
);

export const useGridEditorRuntimeStatus = () => useContext(GridEditorRuntimeContext);

export const GridResizePreviewProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: GridResizePreview | null }>) => (
  <GridResizePreviewContext.Provider value={value}>{children}</GridResizePreviewContext.Provider>
);

export const useGridResizePreview = (entryId: string) => {
  const preview = useContext(GridResizePreviewContext);
  return preview?.id === entryId ? preview : null;
};
