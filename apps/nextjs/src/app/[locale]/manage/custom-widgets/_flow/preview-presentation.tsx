"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const PreviewPresentation = createContext<"canvas" | "form">("form");

export function WorkbenchPreviewPresentationProvider({
  mode,
  children,
}: {
  mode: "canvas" | "form";
  children: ReactNode;
}) {
  return <PreviewPresentation.Provider value={mode}>{children}</PreviewPresentation.Provider>;
}

export const useWorkbenchPreviewPresentation = () => useContext(PreviewPresentation);
