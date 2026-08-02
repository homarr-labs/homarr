"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

export type GridEditorRuntimeStatus = "idle" | "loading" | "ready" | "error";

const GridEditorRuntimeContext = createContext<GridEditorRuntimeStatus>("idle");

export const GridEditorRuntimeProvider = ({
  children,
  status,
}: PropsWithChildren<{ status: GridEditorRuntimeStatus }>) => (
  <GridEditorRuntimeContext.Provider value={status}>{children}</GridEditorRuntimeContext.Provider>
);

export const useGridEditorRuntimeStatus = () => useContext(GridEditorRuntimeContext);
